// Remotion CLI configuration, tuned for a headless cloud container.
// Applies to `remotion render`, `remotion still` and `remotion studio`; anything
// set here can still be overridden per command with the matching CLI flag.
//
// What Remotion already does on its own, so is not repeated here: it launches
// Chrome with --no-sandbox, --disable-setuid-sandbox and --disable-dev-shm-usage
// (the last keeps Chrome's shared memory out of a small /dev/shm, such as
// Docker's 64 MB default), and multi-process Chrome is on by default on Linux.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Config} from '@remotion/cli/config';

// Remotion normally downloads its own chrome-headless-shell, but the CDN it uses
// is not reachable from this environment. The container ships Playwright's
// headless shell instead. Order: explicit env var, newest Playwright headless
// shell, then Remotion's own download (left to Remotion when nothing is found).
const findHeadlessShell = (): string | null => {
	const fromEnv = process.env.REMOTION_BROWSER_EXECUTABLE;
	if (fromEnv) return fromEnv;
	const root = '/opt/pw-browsers';
	if (!fs.existsSync(root)) return null;
	const candidates = fs
		.readdirSync(root)
		.filter((d) => d.startsWith('chromium_headless_shell-'))
		.sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
		.map((d) => path.join(root, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell'))
		.filter((p) => fs.existsSync(p));
	return candidates[0] ?? null;
};

const browser = findHeadlessShell();
if (browser) Config.setBrowserExecutable(browser);
Config.setChromeMode('headless-shell');

// No GPU in the container: SwiftShader-backed ANGLE is the stable software path,
// the same renderer Remotion uses on Lambda.
Config.setChromiumOpenGlRenderer('swangle');

// One Chrome tab per worker, roughly 0.5-1 GB each at 1080p. Leave one vCPU for
// FFmpeg's encode and the CLI, and never run more tabs than memory can hold.
// Override with REMOTION_CONCURRENCY when benchmarking (`npx remotion benchmark`).
const memoryBoundTabs = Math.floor(os.totalmem() / 1024 ** 3 / 1.5);
const cpuBoundTabs = Math.max(1, os.cpus().length - 1);
Config.setConcurrency(
	Number(process.env.REMOTION_CONCURRENCY) || Math.max(1, Math.min(cpuBoundTabs, memoryBoundTabs)),
);

// Cut-outs and the font load can be slow on a cold container.
Config.setDelayRenderTimeoutInMilliseconds(60_000);

// assets/ is the public folder, so components use staticFile('cutouts/x.png').
// It is copied into each render bundle; that is a second or two for this project.
Config.setPublicDir('./assets');

// Delivery format: 1920 x 1080 H.264, not a 4K ProRes master (graphics only, so
// nothing is gained from 4K, and ProRes at 4K is slow to write and huge to move).
// yuv420p keeps x264 on the High profile the QA checklist asks for. JPEG frames at
// quality 95 are visually lossless for this flat, typographic look; pass
// --image-format=png for a final if any fine text shows ringing.
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setCrf(16);
Config.setX264Preset('medium');
Config.setColorSpace('bt709');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
