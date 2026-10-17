# Interface icons

`icons.svg` is a sprite of Lucide icons (`lucide-static` v1.59.0), one `<symbol>` per icon, used through `<svg app-icon name="...">`. Symbols carry no stroke, fill or colour: the icon takes the text colour. Licences in [LICENSE](LICENSE).

## Adding an icon

1. Take `icons/<name>.svg` from `npm pack lucide-static@1.59.0`.
2. Copy its shapes into `<symbol id="<name>" viewBox="0 0 24 24">`, in alphabetical order.
3. Add the name to `ICON_NAMES` in `src/app/shared/icon/icon.model.ts`.
