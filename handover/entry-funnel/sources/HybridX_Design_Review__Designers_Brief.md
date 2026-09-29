# HybridX Design Review & Designer's Brief

Sep 29, 2026 · @Jon lee

## Brand overview

HybridX is a high-contrast black, white and yellow brand for Hyrox and hybrid-training athletes, set in Space Grotesk and Inter. This review is based on the code in `hybridx-web-x` (fonts, Tailwind config, CSS tokens and page components), not on screenshots, so it describes what the site is built to do.

- **What the site does:** sells and funnels people toward a free 12-week Hyrox plan (£0), paperback books (from £8) and the Pro App (£5/month), plus free calculators.
- **Stated brand feel:** the project blueprint asks for a "strong, modern feel", clean and spacious layouts, and a "modern, techy" headline face.
- **Voice in the copy:** confident and evidence-led ("scientifically-backed", "Trusted by over 2,000 Athletes"), with short imperative calls to action.
- **Two brands in one:** the core site is the HybridX brand. Five campaign pages (ATHX 2027, Build a Bigger Engine, Trail, Race, Streak) each carry their own look, described below.

## Typefaces

The core site uses two families, Space Grotesk for headlines and Inter for body text. Every campaign page adds or swaps in its own faces, so the site runs on six families in total (Space Grotesk, Inter, Anton, Archivo, Poppins, JetBrains Mono).

| Family | Role | Weights loaded | Where |
| --- | --- | --- | --- |
| Space Grotesk | Headlines, buttons, prices, badges (`font-headline`) | 300, 400, 500, 700 | Whole site, plus ATHX, App, Race, Streak display type |
| Inter | Body copy, forms, UI (`font-body`, the default on `<body>`) | 400, 600, 700 | Whole site |
| Anton | Condensed all-caps display headings | 400 | Build a Bigger Engine only |
| Archivo | Labels and sub-heads, always uppercase | 600, 700, 800, 900 | Build a Bigger Engine only |
| Poppins | Display and body | 300, 400, 500, 600 | Trail and the live race watch |
| JetBrains Mono | Small technical labels | 400, 500 | Trail |

- All fonts load through `next/font/google` with `display: swap`, so text shows immediately in the fallback and swaps when the font arrives.
- Anton and Archivo are loaded in the funnel's own layout, not the root layout, so other pages don't download them. Trail's fonts are scoped the same way.
- Fallbacks are the generic `sans-serif`. There is no `system-ui` stack behind Space Grotesk or Inter on the main site, so the swap-in font is the browser default (often Arial or Helvetica).
- Outside the browser, type is different again: the emailed magnet messages use Helvetica/Arial at 26px headlines with 800 weight, and the generated training-plan PDF uses Helvetica.

## Type scale and usage

There is no formal type scale: sizes come from Tailwind's default steps, applied per component. The hero shows the working pattern, which the table below summarises.

| Role | Face and weight | Size | Notes |
| --- | --- | --- | --- |
| Hero H1 | Space Grotesk, extrabold | 36px, 48px at md, 60px at lg | `leading-tight`; key phrase set in yellow |
| Section H2 | Space Grotesk, bold | `24px, 30px at md; 30px, 36px at md on larger sections` | Most h2 elements use one of these two size pairings |
| Card title | Space Grotesk | 18px (`text-lg`) | White on dark cards |
| Price / stat figure | Space Grotesk, extrabold or bold | 24px (`text-2xl`) | `leading-none`, yellow or black |
| Lead paragraph | Inter, regular | 18px, 20px at md | Muted grey, capped at `max-w-3xl` |
| Body and card copy | Inter, regular | 14–16px | White at 70% opacity on dark |
| Caption / stat label | Inter | 12px (`text-xs`) | Muted grey |
| Button label | Inter medium by default; Space Grotesk where a page sets font-headline (the hero does) | 14px (text-sm) | Yellow fill, black text |
| Micro label | Inter | 10px and 11px | 57 uses across the site |
| Funnel display | Anton, uppercase | Set per component | Tight `leading-[0.92]`–`[0.95]` |

- **Size usage:** `text-sm` (270 uses), `text-xs` (157) and `text-lg` (136) dominate, so most of the site reads as small, dense UI text with occasional large headings.
- **Weight usage:** `font-bold` 273, `font-semibold` 103, `font-medium` 94, `font-extrabold` 44, `font-normal` 4, `font-light` 1. Bold is the default emphasis everywhere.
- **Headline vs body split:** `font-headline` appears 343 times and `font-body` 258 times, so the two-face rule is followed consistently on the core site.
- **Tracking and line height:** tracking is used mainly for small uppercase labels: `tracking-wider` (55 uses), `tracking-widest` (25), `tracking-wide` (15) and arbitrary values from 0.12em to 0.2em on the funnels. Headlines rarely get tracking (`tracking-tight`, 9 uses). Line height is Tailwind's default per size or `leading-tight` on headlines; the campaign pages set 1.6 for body text in their own CSS.

## Colour and contrast

The core palette is pure black and white with one yellow, `#fadb5c`, and the yellow only works as a fill on black, not as text on white. Colours are HSL tokens in `globals.css`, with a light theme by default and a dark theme switched by class.

| Token | Light theme | Dark theme |
| --- | --- | --- |
| Background / foreground | White / black | Black / white |
| Primary (buttons) | Black | Yellow `#fadb5c` |
| Accent and focus ring | Yellow `#fadb5c` | Yellow `#fadb5c` |
| Card | White | 10% grey |
| Muted text | 30% grey | 70% grey |
| Border | 85% grey | 20% grey |
| Destructive | Red, 60% lightness | Red, 55% lightness |

Contrast ratios I computed from these values (WCAG asks for 4.5:1 for normal text, 3:1 for large text and UI):

- **Passes:** black on yellow 15.4:1; muted grey on white 8.4:1; yellow on the dark hero gradient about 13:1; white at 70% on dark cards 9.0:1.
- **Fails:** yellow text on a white background is 1.4:1. The hero H1 phrase "Peak Hyrox Performance" is set as `text-accent` on the white top section, so the most important words on the homepage are the hardest to read.
- **Borderline:** white text on the destructive red is 3.6:1, which passes only for large text.

**Campaign palettes.** Each funnel defines its own colours, none derived from the core tokens:

| Page | Palette | Notes |
| --- | --- | --- |
| ATHX 2027 | Near-black `#0a0a0a`, greys, orange `#ea580c`, purple `#7c3aed` | Purple only on the Women's Edition card. Dim grey `#5f5f5f` on black is 3.1:1, below 4.5:1 for text |
| Build a Bigger Engine | Oxblood `#5C0F1A`, crimson `#C1121F`, cream `#FBF5EF`, ink `#2A1619` | Crimson on cream 5.8:1. Muted rose `#8A7375` on cream is 4.1:1 |
| Trail | Near-black `#050507`, orchid `#ff55ff`, amber `#ffaa00` | Orchid on black 7.8:1. Dim grey `#6e747c` is 4.3:1 |
| Race / Streak (App) | Yellow with cyan and lemon, plus teal `#358d98`, lime and amber | Shared base sheet, retinted per page |

The project blueprint names the accent as `#FFDA63`, but the code uses `#fadb5c`. The two are close, but the written spec no longer matches what ships.

## Typography review findings

The type system is coherent on the core site but has one homepage legibility failure and two weight settings that silently do nothing. Findings are ordered by impact.

| # | Finding | Evidence | Impact |
| --- | --- | --- | --- |
| 1 | Hero headline highlight is unreadable on white | `text-accent` yellow on white is 1.4:1 in `HeroSection.tsx` | High |
| 2 | Extra-bold headlines never render at 800 | Space Grotesk is loaded at 300/400/500/700 only; `font-extrabold` is used 44 times, including the hero H1 and stat figures, and falls back to 700 | Medium |
| 3 | Medium weight is missing from Inter | Inter loads 400/600/700; `font-medium` (500) is used 94 times, including the shared button style, and renders as 400 | Medium |
| 4 | Micro text is too small | 57 uses of `text-[10px]` and `text-[11px]`; 40 of those lines are also uppercase, mostly in the free-tools cards, calculators and the 12-week plan components | Medium |
| 5 | Some funnel greys fail on their backgrounds | ATHX dim grey 3.1:1; Trail dim grey 4.3:1; Engine muted rose 4.1:1 | Medium |
| 6 | No shared type scale | Sizes are picked per component (`text-2xl md:text-3xl` and `text-3xl md:text-4xl` both used for H2); no fluid sizing | Low |
| 7 | Six families across the property | Space Grotesk, Inter, Anton, Archivo, Poppins, JetBrains Mono; funnels do not share a heading face | Low, and partly deliberate |
| 8 | Email and PDF drop the brand fonts | Magnet emails and plan PDFs use Helvetica/Arial | Low |
| 9 | Logo is inverted in dark mode | The PNG logo uses `dark:invert`, so any colour in it is lost | Low |

**What works well**

- The headline/body split (Space Grotesk over Inter) is applied consistently on the core site: 343 and 258 uses.
- Funnel-only fonts load in the funnel's own layout, so the rest of the site pays no download cost for them.
- The campaign stylesheets state why they differ from the site (the ATHX sheet says it must look like the printed books), which makes the divergence a decision rather than drift.
- Both themes are supported, focus rings use the yellow accent, and the campaign pages honour `prefers-reduced-motion`.
- Yellow on black is 15.4:1, so the dark hero and dark-mode UI are strongly legible.

## Designer's brief

The brief is to turn an inherited, component-by-component type system into a documented one, fix the homepage headline, and decide how far the campaign pages should stray from the brand.

**Keep**

- Black, white and one yellow as the core identity.
- Space Grotesk for headlines and numbers, Inter for reading text.
- Campaign pages that look like their product (printed books, the watch, the app), provided the choice is written down.

**Change first**

1. Give the hero headline a legible highlight. Options: yellow behind the phrase as a marker with black text, or a darker gold used only for text on white. The yellow `#fadb5c` as text on white fails at 1.4:1.
2. Align loaded fonts with the weights used. Either load Inter 500 and pick a real top weight for Space Grotesk (it stops at 700, so retire `font-extrabold` in favour of `font-bold`), or remove the unused weights from the design.
3. Set a floor for text size, for example 12px, and re-set the 10px and 11px labels.
4. Raise the dim greys on ATHX, Trail and the Engine funnel to at least 4.5:1 wherever they carry readable text.

**Define**

- A named type scale (display, H1, H2, H3, lead, body, small, label) with size, weight, line height and tracking per step, replacing ad hoc Tailwind steps.
- Rules for uppercase labels: one tracking value instead of the current mix of `wide`, `wider`, `widest` and 0.12–0.2em.
- The one canonical accent hex, updating the blueprint or the CSS so they agree.
- Email and PDF type: either a web-safe pairing that echoes Space Grotesk and Inter, or a stated decision to stay on Helvetica.

**Deliverables requested**

- A one-page type specimen and scale for the core site, light and dark.
- A short campaign-page policy: what may change (palette, display face) and what must stay (logo, button shape, focus style, contrast minimums).
- Redlines for the hero, the free-tools cards and one calculator page.

**Open questions for the owner**

- Are Anton/Archivo, Poppins and JetBrains Mono meant to become sub-brand faces, or should the campaign pages move closer to the core pair?
- Is the black-and-yellow identity fixed, or open to a secondary colour for content areas?
- Which audience matters most for the redesign: first-time Hyrox entrants or experienced hybrid athletes?
- Is there a source logo file with colour, so dark mode does not depend on inverting a PNG?

**Method and limits.** This review reads the source, not rendered pages. Sizes and weights come from code counts, and contrast ratios were computed from the token values. Rendered spacing, imagery and the logo were not inspected.
