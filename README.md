# วัฏฏะ (Vatta) — ป่าเสียงเรียก

A contemplative 2D game prototype — walk a dark forest, keep your mind, and meet
what is actually chasing you. Thai · ລາວ · English. No build step: ES modules
served over plain HTTP.

## Run

```bash
npm start        # npx serve . -l 5173
# or
npm run serve:py # python3 -m http.server 5173
```

Open http://localhost:5173 · `npm run check` syntax-checks the entry module ·
`npm test` runs the node test suite.

## Version · source · maker

| | |
|---|---|
| Version | `1.0.0` (`package.json`, `src/core/app-meta.js`) |
| Source | https://github.com/bitoslabs/vatta.git |
| Built by | https://bitos.space/ |

The same facts are shown in-game on the title screen's **เกี่ยวกับ / About** tab.

## Naming

The game is **วัฏฏะ / ວັດຕະ / Vatta** — Pali *vaṭṭa*, the wheel of wandering on.
It was previously named วิมุตติ (Vimutti); the subtitle **ป่าเสียงเรียก (The Forest
Call)** names the first chapter and is unchanged. Storage keys (`vimutti.*`) are
kept on purpose so existing saves and settings survive the rename.

## Lao fonts

The Lao locale (`html[lang='lo']`) loads its faces from `fonts.mts.la`:

- headings — `Lao_Buhan` (`https://fonts.mts.la/fonts/lao-buhan/lao-buhan.css`)
- body — `Kom` (`https://fonts.mts.la/fonts/kom/kom.css`)

## Docs

See [`docs/`](./docs/) — start with [`docs/about.md`](./docs/about.md) for the
name, fonts, version and links, and [`docs/architecture.md`](./docs/architecture.md)
for how the code is put together.
