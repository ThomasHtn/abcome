# Mascot assets

Lapinou is one animated SVG per state, never drawn in a template.

| File | Shows |
|---|---|
| `idle.svg` | Sways and blinks |
| `hiding.svg` | Paws over the eyes, while a password is typed |
| `jump.svg` | One jump (0.75 s), on tap and celebration |

## Rules

- Animation as CSS `@keyframes` inside the file, wrapped in `@media (prefers-reduced-motion: no-preference)`. No JavaScript, no external reference.
- Hex colors from `src/styles/tokens/colors.css` (an `<img>` SVG cannot read CSS variables).
- Same `viewBox` everywhere (`0 -30 120 150`), the top 30 units leave room for the jump.
- Animated groups use `transform-box: fill-box`.

## Use

Change the `src` of the `<img>` to change state. `jump.svg` plays once: to replay it, recreate the `<img>`, then go back to `idle.svg` after 750 ms.
