# Little Words frontend

Lapinou's home. The Angular app that grandparents add to their home screen, never suspecting it does not come from a store.

## Start

From the frontend folder, the first time:

```bash
npx npm@11 install
```

Then every day, with the backend running:

```bash
npm start
```

The app hops onto http://localhost:4200 and talks to the API on port 8080.

## Before committing

```bash
npm run fix
npm run test:ci
```

The first one fixes lint and formatting, the second runs the tests once with the coverage floors.

## Tests while coding

```bash
npm test
```

## Browser tests

They drive the real app from its images. Once, install the browser:

```bash
npx playwright install chromium
```

Then:

```bash
make -C .. up
npm run e2e
```

## Where code goes

```text
core/     data access, models, pure functions
shared/   reusable components, one folder each
pages/    one folder per screen
```

Imports roll downhill only: a page may use shared and core, shared may use core, core uses neither. A page never imports another page. To reach another folder, use the @core, @shared or @pages aliases. ESLint catches anyone climbing back up.

Images, icons and animations are files in public/assets, never drawn in a template.

## Translations

Every text lives in both src/i18n/fr.json and src/i18n/en.json. A spec fails if one file has a key the other lacks.

In a template:

```html
{{ 'login.tagline' | transloco }}
{{ 'home.addSearchedWord' | transloco: { query: trimmedQuery() } }}
```

In TypeScript, translate at the moment you need the text, never in a constant at the top of a file:

```ts
translate('login.tagline')
```

Plurals use isSingular(count) with two keys.

## Styles

Tailwind classes in the template, for layout only. Everything visual goes in the component's .scss, with tokens, never raw colours:

```scss
@use 'tools' as *;

.word-card__date {
  color: var(--color-text-muted);

  @include motion {
    transition: color var(--duration-press);
  }
}
```

Animations always sit inside the motion mixin, so they hold still for anyone who asked their phone to calm down.

## Banana peels

**npm install crashes**: npm 10.9 trips on jsdom. Use npx npm@11 install.

**A resource throws**: value() throws on error. Read it with resourceValue(resource, fallback).

**A text shows its key**: it was translated in a constant, before the translations loaded.
