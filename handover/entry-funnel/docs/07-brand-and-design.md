# 07. Brand and design rules for the entry funnel

Source: the owner's design review and designer's brief (`sources/HybridX_Design_Review__Designers_Brief.md`) and the two logo files in `assets/logos/`.
The owner rejected an earlier version of this work for breaking these rules, so treat them as hard constraints.

The reference (`src/style.css`) is plain CSS. **Do not paste it into the Next.js app.** Rebuild the components with the repo's Tailwind classes and HSL tokens, and use the reference only to see spacing, sizes and behaviour.

## Palette

Yellow, black and white only. The full set the reference uses, which `test.js` and `scripts/audit-url.js` enforce for text, backgrounds and borders:

| Use | Value |
| --- | --- |
| Yellow (the one accent) | `#FADB5C` |
| Black | `#000000` |
| White | `#FFFFFF` |
| Card on black | `#1A1A1A` |
| Borders on black / on white | `#333333` / `#D9D9D9` |
| Control border | `#808080` |
| Muted text on black / on white | `#B3B3B3` / `#4D4D4D` |

- The design review notes the blueprint says `#FFDA63` while the code ships `#fadb5c`. Use `#fadb5c`.
- **Yellow is never text on white** (1.4:1). Yellow text is allowed only on black (15.4:1). On white, yellow is a fill behind black text, like a highlighter marker.
- Black text on yellow fills (buttons, chips, the "skip reason" strip): 15.4:1.
- No red, no gradients other than the faint X mark, no secondary colour. If an error state is needed use the pattern in the reference: a white "!" badge and a message, not a new colour.
- Focus: a 3px yellow outline with a 3px offset and a 3px black ring behind it, so it is visible on white, black and yellow.

## Type

| Role | Face | Weight | Size in the reference |
| --- | --- | --- | --- |
| Headlines, buttons, prices, stat figures | Space Grotesk (`font-headline`) | 500, 700 | H1 40 to 64px (34 to 40px in the phone entry); H2 32 to 48px; card titles 18 to 30px |
| Body, forms, UI | Inter (`font-body`) | 400, 500, 600, 700 | 14 to 18px |
| Labels and chips | Inter | 600, uppercase, `letter-spacing: 0.12em` | 12px |

- **Nothing under 12px.** The review found 57 uses of 10px and 11px text. Do not add more.
- **One tracking value** for uppercase labels: 0.12em. Do not use `tracking-wide`, `wider` or `widest`.
- **Never `font-extrabold`.** Space Grotesk stops at 700 in this project, so 800 silently renders as 700. Use `font-bold`.
- **Inter 500.** The review found Inter loads 400, 600 and 700 only, so `font-medium` renders as 400. The reference uses Inter 500 for buttons and options. Either add weight 500 to the `next/font/google` Inter config
  (also fixes review finding 3 across the site; ask the owner because it touches the whole site) or use 400 and 600 in the entry.
- Do not add Anton, Archivo, Poppins or JetBrains Mono. They belong to campaign pages.
- Headline highlight: the key phrase is yellow **on black**, and a yellow marker with black text **on white**. Never yellow text on a white section.

## Logo

Use the two supplied files (`hybridx-logo-full.png`, `hybridx-x-mark.jpg`). The review notes the site's logo uses `dark:invert`, which throws away any colour in it. In the entry, which is black, use the right file for the background rather than inverting.
The large faint X mark behind the entry headline is decoration (`aria-hidden`), on black only.

## Components in the entry

| Component | Rules |
| --- | --- |
| Entry section | Black background. Full-width. Top bar with a muted sentence on the left and the skip link on the right, separated from the headline by a 1px `#333333` rule |
| Skip link | Inter 600, white, underlined with a 3px yellow underline, arrow icon in yellow. At least 44px tall. Inside the first screen on a phone |
| Headline | Space Grotesk 700, white with the key phrase in yellow. It is an `h2` styled as an H1 in entry mode (docs/03) |
| Ticks | Three short lines with a yellow check. Inter, white, 16px |
| Question card | `#1A1A1A`, 1px `#333333` border, 6px yellow top border, 12px radius |
| Goal tiles | Black, 1px `#333333` border, 10px radius; yellow border on hover; Space Grotesk 700 title, muted sub-line, yellow arrow |
| Selected option | Yellow fill, black text |
| Primary button | Yellow fill, black text, 2px yellow border, 8px radius, 48px tall (56px large). Hover: white |
| Secondary button | Transparent, 1px muted border, white text; or ghost: yellow border and text on black |
| Result card | `#1A1A1A`, 6px yellow top border. Product "cover" in black with the logo, uppercase title and a label |
| Skip reason strip | Yellow band, black text; black pills with white text; underlined black "Close" |
| Feedback chips | Round pills, black with white text; selected = yellow fill and black text; 44px tall |
| Dialog | Full screen, black. White top bar (80px, 64px on a phone) with the logo, the skip and Close controls |

Spacing follows an 8px rhythm. Section padding is `clamp(48px, 5vw, 72px)` top and bottom in the page hero, 20px at the top of the entry hero. Card padding is `clamp(22px, 2.2vw, 32px)`.

## Responsive behaviour

| Width | Behaviour |
| --- | --- |
| 1440 | Two columns: headline left, question card right (max 576px) |
| 820 | One column; the card below the headline |
| 390 | One column; the entry hides its lead paragraph and the tile sub-lines and shows tiles two across, to stay near one screen. The dialog top bar keeps logo, skip and Close on one line |

Every screen must pass at all three widths with no horizontal scroll.

## Motion and accessibility

- Auto-advance after 200ms on single-choice questions, 0ms when the visitor prefers reduced motion. Otherwise no animation beyond hover and focus colour changes.
- Text contrast at least 4.5:1, UI 3:1. The palette above meets this on its intended backgrounds.
- Native `<dialog>`, focus management, `aria-pressed` on options, visible focus ring. Details in docs/02.

## Checking it

```bash
CHROMIUM_PATH=/path/to/chrome node scripts/audit-url.js http://localhost:3000/ --widths 1440,820,390
```

It fails on: text under 12px, horizontal scroll, anything poking outside the viewport, any font or weight outside Inter 400 to 700 and Space Grotesk 500 and 700,
and any text, background or border colour outside the palette. If the real site adds a token on purpose (say a hover tint), add it to `PALETTE` in the script deliberately.
It audits the closed page. Also open the dialog and audit each step by hand, or copy the approach from `test.js`, which audits every dialog state.

Screenshots of the reference at each state are in `screenshots/`.
