#!/usr/bin/env bash
# Restore everything this project needs on a fresh cloud container, then prove it
# works with a one-second render. Safe to re-run: every step checks first and
# installs only what is missing.
#
# Usage: pipeline/bootstrap.sh            install what is missing, then smoke test
#        pipeline/bootstrap.sh --check    report only; install nothing, render nothing
#
# What it restores: FFmpeg, Poppler, ImageMagick, Python 3 + Pillow, Chrome's
# runtime libraries, the npm dependencies, and the two OFL font files. What it
# cannot restore: the book PDFs, voiceover and music, which are deliberately not
# in git (see .gitignore). It lists any that are absent at the end.

set -uo pipefail
cd "$(dirname "$0")/.."

CHECK_ONLY=0
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=1
FAILED=0
ok() { printf '  ok    %s\n' "$*"; }
fixing() { printf '  fix   %s\n' "$*"; }
warn() { printf '  warn  %s\n' "$*"; }
fail() { printf '  FAIL  %s\n' "$*"; FAILED=1; }
SUDO=""
[[ $EUID -ne 0 ]] && SUDO="sudo"

APT_UPDATED=0
apt_install() {
	if [[ $CHECK_ONLY -eq 1 ]]; then fail "would install: $*"; return; fi
	if [[ $APT_UPDATED -eq 0 ]]; then $SUDO apt-get update -qq && APT_UPDATED=1; fi
	fixing "apt-get install $*"
	DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y -qq --no-install-recommends "$@" >/dev/null ||
		fail "apt-get install $* failed"
}
# Ubuntu 24.04 renamed several libraries with a t64 suffix; use it where it exists.
resolve_pkg() {
	if apt-cache show "${1}t64" >/dev/null 2>&1; then echo "${1}t64"; else echo "$1"; fi
}

echo "1. Command-line tools"
declare -A TOOL_PKG=([ffmpeg]=ffmpeg [ffprobe]=ffmpeg [pdftoppm]=poppler-utils [pdfinfo]=poppler-utils
	[pdfimages]=poppler-utils [pdftotext]=poppler-utils [identify]=imagemagick [python3]=python3)
missing_pkgs=()
for tool in ffmpeg ffprobe pdftoppm pdfinfo pdfimages pdftotext identify python3; do
	if command -v "$tool" >/dev/null; then ok "$tool"; else missing_pkgs+=("${TOOL_PKG[$tool]}"); fi
done
if ! python3 -c 'import PIL' 2>/dev/null; then missing_pkgs+=(python3-pil); else ok "Pillow"; fi
if [[ ${#missing_pkgs[@]} -gt 0 ]]; then
	apt_install $(printf '%s\n' "${missing_pkgs[@]}" | sort -u)
fi
if command -v ffmpeg >/dev/null; then
	# Listed once into a variable: piping straight into grep -q trips pipefail.
	FILTERS=$(ffmpeg -hide_banner -filters 2>/dev/null)
	lacking=()
	for f in loudnorm ebur128 deesser afftdn acompressor alimiter sidechaincompress; do
		grep -qw "$f" <<<"$FILTERS" || lacking+=("$f")
	done
	if [[ ${#lacking[@]} -eq 0 ]]; then
		ok "ffmpeg $(ffmpeg -version | awk 'NR==1{print $3}') with loudnorm, ebur128, deesser, afftdn, acompressor, alimiter, sidechaincompress"
	else
		fail "ffmpeg lacks: ${lacking[*]}"
	fi
fi

echo "2. Node"
if command -v node >/dev/null && [[ "$(node -p 'process.versions.node.split(".")[0]')" == "22" ]]; then
	ok "node $(node -v)"
else
	fail "Node 22 is required (found: $(node -v 2>/dev/null || echo none)). Install Node 22 LTS, then re-run."
fi

echo "3. npm dependencies"
if [[ ! -d node_modules ]] || [[ package-lock.json -nt node_modules/.package-lock.json ]]; then
	if [[ $CHECK_ONLY -eq 1 ]]; then fail "node_modules missing or stale"; else
		fixing "npm ci"
		npm ci --no-audit --no-fund --loglevel=error || fail "npm ci failed"
	fi
else
	ok "node_modules up to date"
fi

echo "4. Headless Chrome"
# Same search as remotion.config.ts: env var, then Playwright's headless shell.
BROWSER="${REMOTION_BROWSER_EXECUTABLE:-}"
if [[ -z "$BROWSER" ]]; then
	BROWSER=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null |
		sort -t- -k3 -V | tail -1)
fi
if [[ -z "$BROWSER" ]]; then
	if [[ $CHECK_ONLY -eq 1 ]]; then fail "no headless shell found"; else
		fixing "no Playwright headless shell; asking Remotion to download its own"
		npx remotion browser ensure || fail "Remotion's browser download failed (its CDN may be blocked; set REMOTION_BROWSER_EXECUTABLE)"
	fi
else
	ok "browser: $BROWSER"
	# The Playwright launcher is a shell wrapper; the libraries belong to the .real binary.
	REAL="$BROWSER"
	[[ -x "$BROWSER.real" ]] && REAL="$BROWSER.real"
	if ldd "$REAL" 2>/dev/null | grep -q "not found"; then
		warn "missing libraries: $(ldd "$REAL" | awk '/not found/{print $1}' | tr '\n' ' ')"
		[[ $APT_UPDATED -eq 0 && $CHECK_ONLY -eq 0 ]] && $SUDO apt-get update -qq && APT_UPDATED=1
		libs=()
		for p in libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 libcups2 libdrm2 \
			libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxext6 libx11-6 libxcb1 libgbm1 \
			libpango-1.0-0 libcairo2 libasound2 libglib2.0-0 libexpat1 libudev1 libvulkan1 fonts-liberation ca-certificates; do
			libs+=("$(resolve_pkg "$p")")
		done
		apt_install "${libs[@]}"
	else
		ok "all Chrome libraries resolve"
	fi
	if timeout 30 "$BROWSER" --headless=old --no-sandbox --disable-gpu --dump-dom 'data:text/html,<p>ok</p>' 2>/dev/null |
		grep -q '<p>ok</p>'; then
		ok "Chrome launches headless"
	else
		fail "Chrome did not render a test page"
	fi
fi

echo "5. Shared memory and resources"
SHM=$(df -m /dev/shm 2>/dev/null | awk 'NR==2{print $2}')
if [[ -z "$SHM" ]]; then
	warn "/dev/shm not mounted; Remotion's --disable-dev-shm-usage makes Chrome use /tmp instead"
elif [[ "$SHM" -lt 512 ]]; then
	warn "/dev/shm is ${SHM} MB; fine, because Remotion passes --disable-dev-shm-usage"
else
	ok "/dev/shm ${SHM} MB"
fi
ok "$(nproc) vCPUs, $(free -g | awk '/^Mem:/{print $2}') GB RAM, $(df -h . | awk 'NR==2{print $4}') disk free"

echo "6. Fonts"
FONT_BASE=https://raw.githubusercontent.com/google/fonts/main/ofl
declare -A FONTS=(
	[SpaceGrotesk-Variable.ttf]="spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf"
	[Inter-Variable.ttf]="inter/Inter%5Bopsz,wght%5D.ttf"
	[OFL-SpaceGrotesk.txt]="spacegrotesk/OFL.txt"
	[OFL-Inter.txt]="inter/OFL.txt"
)
for name in "${!FONTS[@]}"; do
	if [[ -s "assets/fonts/$name" ]]; then ok "$name"; continue; fi
	if [[ $CHECK_ONLY -eq 1 ]]; then fail "missing assets/fonts/$name"; continue; fi
	fixing "fetching $name from google/fonts"
	curl -sSfL -o "assets/fonts/$name" "$FONT_BASE/${FONTS[$name]}" || fail "could not fetch $name"
done

echo "7. Smoke test"
if [[ $CHECK_ONLY -eq 1 ]]; then
	ok "skipped (--check)"
elif [[ $FAILED -ne 0 ]]; then
	warn "skipped: fix the failures above first"
else
	npx tsx scripts/check.ts >/dev/null && ok "facts and timings checks pass" || fail "npm run check failed"
	if npm run -s render:test >/dev/null 2>&1; then
		frames=$(ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames -of csv=p=0 out/tests/render-test.mp4)
		profile=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,profile,width,height -of csv=p=0 out/tests/render-test.mp4)
		[[ "$frames" == "25" ]] && ok "1 s render: $profile, $frames frames" || fail "render produced $frames frames, expected 25"
	else
		fail "Remotion render failed: run 'npm run render:test' to see why"
	fi
fi

echo "8. Production assets (not in git)"
for f in assets/pdf/ATHX-2027-Mens.pdf assets/pdf/ATHX-2027-Womens.pdf \
	assets/pdf/ATHX-2027-Mens-FRONT.pdf assets/pdf/ATHX-2027-Womens-FRONT.pdf; do
	[[ -f "$f" ]] && ok "$f" || warn "absent: $f"
done
vo=$(ls assets/audio/vo/*.wav 2>/dev/null | wc -l)
music=$(ls assets/audio/music/* 2>/dev/null | wc -l)
ok "voiceover WAVs: $vo, music files: $music"

echo
if [[ $FAILED -ne 0 ]]; then echo "Bootstrap: FAILED (see above)"; exit 1; fi
echo "Bootstrap: ready"
