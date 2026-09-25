# ວັດຕະ (Vatta) — ປ່າສຽງເອີ້ນ

A contemplative 2D game prototype — Thai · ລາວ · English. Development uses Vite; production is a static build.

The first visit opens in Lao (`lo`). A player's saved Thai or English selection remains in effect on later visits.

## Run and verify

```bash
npm ci                 # install the pinned build tool
npm run dev            # http://127.0.0.1:5173
npm test               # fast feedback (23 suites)
npm run test:full      # every suite, including seeded world checks
npm run build:check    # production build plus asset validation
npm run preview        # preview dist/ locally
```

See [architecture](./docs/architecture.md), [testing](./docs/testing.md), and [performance](./docs/performance.md) for the project layers, the reason tests used to be slow, and measured improvements. [PWA support](./docs/pwa.md) covers installation and offline play. Deployment instructions are in [deploy/site.md](./deploy/site.md).

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
