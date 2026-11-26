# Self-hosted fonts

Latin-subset `.woff2` files, all SIL Open Font License 1.1 (Inter, Space Grotesk,
JetBrains Mono, Anton, Poppins, Manrope, Spline Sans Mono, Archivo, Fraunces, IBM Plex
Mono, Press Start 2P). Loaded with `next/font/local` by `src/lib/fonts.ts` (the root
layout, the engine funnel, /streak, the watch artwork and Trail Quest) and by
`src/components/una/fonts.ts`, `src/components/trail/fonts.ts` and
`src/components/weighin/fonts.ts`. No file in `src/` imports `next/font/google`, and a
test fails if one does.

## Why not `next/font/google`

`next build` downloads every font file listed in Google's CSS and reads its
extension with `/\.(woff|woff2|...)$/.exec(url)[1]`. On 20 November 2026 App
Hosting's build got a font URL with no extension back from Google (the same
build passed locally, because the response varies by where it is asked), and
failed with `Cannot read properties of null (reading '1')` on both of these
files. On 24 November it did the same to `weighin/fonts.ts`, which had built
cleanly since October. A build must not depend on what Google happens to serve
that minute.

The rest followed on 25 November 2026, including the root layout, whose failure takes the
whole site down with it. Do not add a `next/font/google` import: a test fails on one.

## Adding or refreshing a file

Ask Google's CSS with a Chrome user agent, take the `/* latin */` block's
`.woff2` URL, and download it:

```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
curl -s -A "$UA" 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap' | grep -A8 '/\* latin \*/'
curl -s -o src/fonts/inter-latin-variable.woff2 '<the url from the block above>'
```

Variable families (Inter, Space Grotesk, JetBrains Mono, Manrope, Spline Sans
Mono) are one file covering every weight; Anton and Poppins are one file per
weight.
