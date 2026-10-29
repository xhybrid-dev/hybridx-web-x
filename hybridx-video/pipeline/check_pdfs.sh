#!/usr/bin/env bash
# Gate 0 PDF check: is every source PDF present, does each book have the page
# count the page index assumes (men's 158, women's 161), and is each one RGB colour?
#
# Usage: pipeline/check_pdfs.sh            (checks assets/pdf)
#        pipeline/check_pdfs.sh DIR        (checks another folder)
#
# Colour is sampled on pages that carry edition colour in the books: the cover
# page and the p6 MetCon X table. Exit status is 1 if a required book is missing
# or its page count is wrong.

set -euo pipefail
cd "$(dirname "$0")/.."
DIR="${1:-assets/pdf}"

declare -A EXPECT_PAGES=([ATHX-2027-Mens.pdf]=158 [ATHX-2027-Womens.pdf]=161)
REQUIRED=(ATHX-2027-Mens.pdf ATHX-2027-Womens.pdf ATHX-2027-Mens-FRONT.pdf ATHX-2027-Womens-FRONT.pdf)
OPTIONAL=(ATHX-2027-Mens-Volume-Progression.pdf)
status=0

check() {
	local name="$1" required="$2" f="$DIR/$1"
	if [[ ! -f "$f" ]]; then
		if [[ "$required" == yes ]]; then echo "MISSING   $name"; status=1; else echo "absent    $name (optional)"; fi
		return
	fi
	local pages size
	pages=$(pdfinfo "$f" | awk '/^Pages:/{print $2}')
	size=$(pdfinfo "$f" | awk -F': +' '/^Page size:/{print $2}')
	local expect="${EXPECT_PAGES[$name]:-}"
	local count_note=""
	if [[ -n "$expect" ]]; then
		if [[ "$pages" == "$expect" ]]; then count_note="(expected $expect: ok)"; else count_note="(expected $expect: WRONG)"; status=1; fi
	fi
	echo "found     $name: $pages pages $count_note, $size, $(du -h "$f" | cut -f1)"
	local sample=(1)
	[[ "$pages" -ge 6 ]] && sample+=(6)
	python3 -I pipeline/pdf_colour.py "$f" "${sample[@]}"
}

echo "PDF check in $DIR"
for n in "${REQUIRED[@]}"; do check "$n" yes; done
for n in "${OPTIONAL[@]}"; do check "$n" no; done

# Anything else in the folder, e.g. the -print editions the plan mentions.
shopt -s nullglob
for f in "$DIR"/*.pdf; do
	name=$(basename "$f")
	[[ " ${REQUIRED[*]} ${OPTIONAL[*]} " == *" $name "* ]] && continue
	echo "extra     $name: $(pdfinfo "$f" | awk '/^Pages:/{print $2}') pages (not used; rename if it is a colour interior)"
done

exit $status
