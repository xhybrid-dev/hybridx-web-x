#!/usr/bin/env bash
# Gate 0 PDF check: is every source PDF present, does each book have the page
# count the page index assumes (men's 158, women's 161), and is each one RGB colour?
#
# Usage: pipeline/check_pdfs.sh            (checks assets/pdf)
#        pipeline/check_pdfs.sh DIR        (checks another folder)
#
# Every PDF in the folder is checked, including ones under other names (such as
# the -print editions). Page counts exclude trailing blank pages, which print
# files carry as padding. Exit status is 1 if a required file is missing, a book
# has the wrong number of content pages, or a book interior is not in colour.

set -uo pipefail
cd "$(dirname "$0")/.."
DIR="${1:-assets/pdf}"

REQUIRED=(ATHX-2027-Mens.pdf ATHX-2027-Womens.pdf ATHX-2027-Mens-FRONT.pdf ATHX-2027-Womens-FRONT.pdf)
OPTIONAL=(ATHX-2027-Mens-Volume-Progression.pdf)
status=0

# Expected content pages for a book interior, from its file name; empty for covers.
expected_pages() {
	case "$1" in
	*FRONT* | *Volume-Progression*) echo "" ;;
	*Womens*) echo 161 ;;
	*Mens*) echo 158 ;;
	*) echo "" ;;
	esac
}

echo "PDF check in $DIR"
for n in "${REQUIRED[@]}"; do
	[[ -f "$DIR/$n" ]] || { echo "MISSING   $n"; status=1; }
done
for n in "${OPTIONAL[@]}"; do
	[[ -f "$DIR/$n" ]] || echo "absent    $n (optional)"
done

shopt -s nullglob
for f in "$DIR"/*.pdf; do
	name=$(basename "$f")
	role="extra"
	[[ " ${REQUIRED[*]} ${OPTIONAL[*]} " == *" $name "* ]] && role="found"
	echo "$role     $name: $(pdfinfo "$f" | awk -F': +' '/^Page size:/{print $2}'), $(du -h "$f" | cut -f1)"
	report=$(python3 -I pipeline/pdf_colour.py "$f")
	grep -v '^RESULT' <<<"$report"
	result=$(grep '^RESULT' <<<"$report")
	content=$(sed -E 's/.*content=([0-9]+).*/\1/' <<<"$result")
	verdict=$(sed -E 's/.*verdict=([a-z-]+).*/\1/' <<<"$result")

	expect=$(expected_pages "$name")
	if [[ -n "$expect" ]]; then
		if [[ "$content" == "$expect" ]]; then
			echo "  pages: $content content pages, as the page index expects"
		else
			echo "  pages: $content content pages, page index expects $expect: WRONG"
			[[ $role == found ]] && status=1
		fi
		if [[ "$verdict" != "rgb-colour" ]]; then
			echo "  NOT USABLE for cut-outs: the brief needs the colour interior ($verdict)"
			[[ $role == found ]] && status=1
		fi
	fi
	[[ $role == extra ]] && echo "  (not under a name the pipeline uses; rename to ATHX-2027-Mens.pdf or -Womens.pdf once it is the colour interior)"
done

exit $status
