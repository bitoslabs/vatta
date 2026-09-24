# สถาปัตยกรรม / Architecture

> วัฏฏะ (Vatta) — ป่าเสียงเรียก · 2D contemplative game (ES modules, ไม่มี build step)
>
> ชื่อเกมเดิม "วิมุตติ" เปลี่ยนเป็น "วัฏฏะ / ວັດຕະ / Vatta" · รุ่น แหล่งโค้ด และผู้สร้าง ดู [about.md](./about.md)

## 1. หลักการ

- **SRP**: หนึ่งโมดูล หนึ่งหน้าที่ — `systems/` จัดการกลไก, `render/` วาด, `ui/` แตะ DOM, `game/` ประสานฉาก
- **Decoupled**: โมดูลคุยกันผ่าน `core/events.js` + `core/state.js` ไม่เรียกข้ามกันตรง ๆ
- **Data-driven**: บท (chapter) ภูมิ (realm) และกรรม (karma) เป็นข้อมูลใน `content/` ไม่ใช่โค้ด
- **i18n ครบทุกสตริง**: ไม่มีข้อความฝังในตรรกะ ใช้ `t()`, `tList()`, `tDialogue()` + `data-i18n` ใน HTML
- **ไม่พึ่ง build tool**: เปิดผ่าน static server เท่านั้น (ES modules ต้องเป็น HTTP)

## 2. โครงสร้าง

```
index.html                 markup + data-i18n (ไม่มี logic)
package.json               type:module + scripts
assets/{fonts,audio,images,icons}/
src/
├── main.js                composition root: import → bootstrap → loop
├── core/                  รากฐานที่ไม่ผูกกับฉาก
│   ├── constants.js       MODE, WORLD, TEMPLE, SALA, PLAYER, GHOST, FEAR, INTERACT
│   ├── app-meta.js        ชื่อเกม · รุ่น · GitHub · ผู้สร้าง (แหล่งเดียวของแท็บ About)
│   ├── math.js            clamp, lerp, dist, distSeg, distToPoly
│   ├── rng.js             mulberry32 (world generation คงที่ทุก reload)
│   ├── events.js          pub/sub + EVENTS (สัญญาระหว่างโมดูล)
│   └── state.js           mutable state ข้ามฉาก (mode, chapter, fear, story, stats)
├── content/               "ข้อมูลคำสอน" ล้วน ๆ
│   ├── karma-actions.js   11 กรรม + กุศล/อกุศล + มูล 6
│   ├── factors.js         มรรค 8 + เงื่อนไขเปิด + ผล
│   ├── forms.js           ร่างที่เล่นได้ (มนุษย์/กวาง/ปลา) + ความสามารถ
│   ├── precepts.js        ศีล 5 + การกระทำที่ทำให้ขาด
│   ├── worksheets.js      ใบงาน 6 หัวข้อ × 3 คำถาม (ห้องเรียน)
│   ├── encounters.js      ข้อมูล beings ข้างทาง §6 (ตำแหน่ง/คำถาม/เจตนา)
│   ├── biomes.js          ผิวแผนที่ 6 แบบ (สี/น้ำ/ม่าน/ความมืด)
│   └── realms.js          ภูมิ 31 (ไตรภูมิ)
├── systems/               กลไกที่ใช้ซ้ำได้
│   ├── viewport.js        canvas, DPR, resize, light buffer
│   ├── input.js           keyboard snapshot + isMindful()
│   ├── audio.js           Web Audio สังเคราะห์ (no assets)
│   ├── i18n.js            t/tList/tDialogue + locale switch + data-i18n
│   ├── effects.js         floaters / sparks / screen notes
│   ├── karma.js           บัญชีบุญ–บาป + กุศล–อกุศล + อนุสัย
│   ├── karma-memory.js    กรรมในอดีต → "ความจำ" ที่โลกตอบสนอง
│   ├── path.js            มรรค 8 — เปิดตามการปฏิบัติ + รวมผลต่อการรับรู้
│   ├── forms.js           ร่างปัจจุบัน, ความเร็ว/การมองเห็น, แม่น้ำที่ปลาออกไม่ได้
│   ├── worldgen.js        seed ต่อชาติ/บท, ประกอบโลก, ความสามารถรวมผลต่อโลก, ผลตรวจเส้นทาง, removeFeature (ธง `liftable` = สิ่งที่ยกได้)
│   ├── world-effects.js   รหัสผลต่อโลกถาวร (root-watered … night-watched) แยกจากสิ่งกีดขวางสุ่ม
│   ├── vision.js          รัศมีการมองเห็นที่เดียวของเกม — ชั้นความมืดและ gameplay ใช้ค่าเดียวกัน
│   ├── fonts.js           สแตกฟอนต์แคนวาสต่อภาษา (lo → Kom + ขยาย ×1.12) ให้ตรงกับ CSS ผ่าน `canvasFont(size, weight)`
│   ├── echo.js            การสะท้อนเสียง (ค้างคาว): `canEcho` · `emitPulse` (F) · `perceivesPoint` — ในถ้ำมืด ตาใช้ไม่ได้เลย
│   ├── tide.js            น้ำขึ้นน้ำลง: จังหวะของโลก (อ่าน/ตั้งเฟสได้) · ให้ `crossCauseway` ผ่าน `worldAbilities`
│   ├── terrain.js         ปากเรื่องความเร็วของพื้นดิน: โคลนชะลอทุกอย่าง ยกเว้นร่างที่ `wade`
│   ├── moisture.js        ความชื้นของพื้นดินเป็นจังหวะของโลก (0..1) · ให้ `dampGround` ผ่าน `worldAbilities`
│   ├── light.js           แสงของสวนเป็นจังหวะที่เร็วที่สุด (~9 วิ) · ให้ `lightLit` ผ่าน `worldAbilities`
│   ├── drift.js           วัตถุที่ลอยตามสายน้ำ (นาก): วนกลับเสมอ · น้ำขึ้นน้ำลงกำหนดแค่ความเร็ว
│   ├── rest.js            "ที่ปลอดภัยที่โลกได้มา" ทุกแบบ (รังกระต่าย/รังนก/โพรง/ลานที่เปิดประตู/ร่มต้นกล้า) รวมเป็นกฎเดียว
│   ├── goals.js           เป้าหมายชีวิตตาม `lifeGoal` ของร่าง (water/burrow/nest/spawn/link/storm/watch/grove/range จบชีวิต · land/seed/inlet/spring/warren/shelter/lost/roost/track/hollow ชี้ทาง) + LIFE_COMPLETE
│   ├── biome.js           เลือกไบโอมจากร่าง/ภูมิ/อนุสัย (รวม under-root ของไส้เดือน) · `content/biomes.js` ประกาศ `sites` = จุดแผนที่ถาวรของภพ
│   ├── life-route.js      เลือกร่างถัดไปตามบท + กรองด้วย maps/rebirth
│   ├── life.js            วงจรชีวิต — เริ่ม/สรุปชาติ/เกิดใหม่ด้วยร่างใหม่
│   ├── precepts.js        ศีล 5 — สถานะตามการกระทำ (ไม่ตัดสิน)
│   ├── greetings.js       เลือกบททักทายของธรรมบาลจากความจำ
│   ├── save.js            บันทึก/โหลด 3 ช่อง + ชื่อรอบ (autosave + เล่นต่อ + สรุปช่อง)
│   ├── teacher.js         โหมดครู — เปิด/ปิด, จุดสำคัญ, guided tour
│   ├── projector.js       โหมดฉายภาพ — ตัวอักษร/ป้ายใหญ่ (implies โหมดครู)
│   └── rebirth.js         resolveRebirth(karma) → ภูมิปลายทาง
├── world/                 ข้อมูลโลก + พื้นผิว
│   ├── world-data.js      PATH + ROUTES (ถนนของแต่ละภพ), FALSE_A/B, GATES, FOOT/footprintsAlong, TREES, RIVER, BURROW, NEST, MARSH, CREVICE, FIELD, OWL, GROVE, TRAIL, ENCLOSURE
│   ├── rooms.js           ประกอบสิ่งกีดขวางตาม seed ข้างถนนของภพ + `isOnRoute` + จุดถาวรตาม `biome.sites` + ตัวตรวจเส้นทาง (BFS) + validateBurrowExit / validateNestRoute / validateFrogRoute / validateSnakeRoute / validateRabbitRoute / validateElephantRoute / validateGeckoRoute
│   └── textures.js        ground/grain patterns
├── entities/              สิ่งมีชีวิต
│   ├── player.js          movement, collision, safe zone
│   ├── ghost.js           ผี: `ghost` (ตัวหลัก) + `ghosts` (collection), addGhost/updateGhosts
│   └── ghost-status.js    HUNT | FADE
├── render/                canvas ล้วน
│   ├── world-renderer.js  ฉากโลก
│   ├── sprites.js         ต้นไม้/ผี/ไอเทม/NPC/วัด/ศาลา/ป้ายผู้เล่น
│   ├── forms-sprites.js   silhouette ผู้เล่น 10 ร่าง + แสงที่อก + flourish
│   ├── lighting.js        ชั้นความมืด + punch light
│   └── memory-renderer.js ฉากความทรงจำ
├── ui/                    DOM ล้วน
│   ├── dom.js             $, $$
│   ├── feedback.js        fade, toast (+ flashFade)
│   ├── dialogue.js        say/advance/reset
│   ├── choices.js         choose/pick/reset
│   ├── hud.js             fear/anger meter + สติ + บุญ–บาป
│   ├── title-screen.js    เริ่มบท + เลือกบท
│   ├── about.js           เติมแท็บ About จาก core/app-meta.js
│   ├── end-screen.js      สรุปบท + คติภูมิ (rebirth)
│   ├── codex.js           ธรรมะโคเด็กซ์: กรรม + ภูมิ 31
│   ├── rebirth-interlude.js  การ์ดจุติ–ปฏิสนธิเมื่อตาย
│   ├── path-notice.js     แจ้งเตือนเมื่อมรรคข้อใหม่เปิด
│   ├── teacher-panel.js   แผงคำบรรยายโหมดครู
│   ├── save-slots.js      แถวเลือกช่องบันทึกบนหน้า Title
│   ├── life-summary.js    การ์ดจบชีวิต + ปุ่มเกิดใหม่
│   ├── mirror-court.js    ลานกระจก — สรุปรอยเท้าทุกชาติ + ปล่อยร่าง
│   ├── journey-recap.js   หน้าสรุปการเดินทาง (กรรม–มรรค–ศีล–ภูมิ)
│   ├── worksheets.js      หน้าฉายใบงานสำหรับห้องเรียน
│   ├── language-switcher.js
│   └── touch.js           joystick + ปุ่มสัมผัส
├── game/                  การประสานฉาก
│   ├── chapters.js        ทะเบียนบท + loadChapter/updateChapter (+ autosave)
│   ├── story.js           router → story-chapterN
│   ├── story-chapter1.js  ป่าเสียงเรียก (ความกลัว)
│   ├── story-chapter2.js  ไฟในใจ (ความโกรธ)
│   ├── meditation.js      มินิเกมลมหายใจ
│   ├── memory.js          ฉากความทรงจำ + คำถาม
│   ├── release.js         ลำดับปลดปล่อย
│   ├── echoes.js          เหตุการณ์กรรมย้อนหลังตามตำแหน่งบนทาง
│   ├── npc.js             ธรรมบาล — ยืนกลางทาง ทักทายตามสิ่งที่ทำ
│   ├── world-memory.js    สะพาน/ทางน้ำที่จำข้ามชาติ
│   ├── burrow.js          บทไส้เดือน — ถึงเมล็ดแล้วบันทึกผลต่อโลก root-watered
│   ├── ant.js             บทมด — ธุระเมล็ดสองขั้น + ทางเลือกที่เมล็ด + seed-carried
│   ├── frog.js            บทกบ — ทางน้ำในวงโคลน + คำถามเปิด/ปล่อย + water-opened
│   ├── snake.js           บทงู — ตาน้ำในวงหิน + คำถามขยาย/เก็บช่อง + water-linked
│   ├── rabbit.js          บทกระต่าย — ธุระเชื่อมรัง (ไม่จับเวลา) + คำถามเรื่องที่หลบ + nest-sheltered
│   ├── owl.js             บทนกฮูก — ความมืดเป็นประตู + พาสัตว์หลงกลับรัง + night-watched
│   ├── elephant.js        บทช้าง — ยกไม้โดยไม่ทำรังพัง + ways-joined + รังที่รอดเป็นที่กำบัง
│   ├── tiger.js           บทเสือ — รอยเท้าตามลำดับ + เลือกหลบ/เข้าหา + trust-built
│   ├── gecko.js           บทจิ้งจก — ไต่กำแพง + เปิดประตูจากด้านในให้ทุกตัว + gate-opened
│   ├── bat.js             บทค้างคาว — ถ้ำมืดที่ต้องส่งเสียงหาทาง + สอนลูกให้ส่งเสียงเอง + echo-shared
│   ├── squirrel.js        บทกระรอก — ปีนเก็บเมล็ด 3 ยอด + เลือกที่โพรงระหว่างกระจาย/สะสม + seeds-scattered
│   ├── crab.js            บทปู — ข้ามทางน้ำตามจังหวะน้ำขึ้นลง + เก็บทางน้ำให้ตื้น + channel-kept + HUD อ่านน้ำ
│   ├── otter.js           บทนาก — คว้าของลอย 3 ชิ้น + เลือกที่โพรงระหว่างปล่อย/กอง + river-tended (+ snags ข้ามชาติ)
│   ├── bee.js             บทผึ้ง — สายดอกไม้ที่ต้องต่อเป็นทอด (reach) + แบ่ง/เก็บเกสร + forest-pollinated
│   ├── cat.js             บทแมว — ขึ้นกำแพงข้างบ้าน 3 หลังแล้วมองจากข้างบน + สรุปสามคำตอบเป็น hearths-respected
│   ├── buffalo.js         บทควาย — ลุยโคลน + ลากไม้ทำสะพานข้ามเหวที่ยืนอยู่ในทุกชาติ + ford-bridged
│   ├── snail.js           บทหอยทาก — ข้ามสันดินแห้งได้เฉพาะเมื่อพื้นชื้น + ทิ้งรอยชื้น (damp-trail) + HUD อ่านพื้น
│   ├── boar.js            บทหมูป่า — ดุนดินเปิดวงแหวน + กิน 3 จาก 4 ราก (มีรังใต้ 1) + perception ก่อนทำลาย (soil-turned)
│   ├── asura-city.js      ห้องชุดภพนครอสุร — ประตูหัก (drop) + คำถามที่ก้อนหิน (สะพานร่วม = span-built) + ศาลาที่พักที่ 7
│   ├── garden.js          ห้องชุดภพสวนแสง — ประตูเงาที่เปิดตามแสง (shadow) + ปล่อยแปลงดอกไม้ (seeds-released)
│   ├── market.js          ห้องชุดภพตลาด — ประตูแคบที่ผ่านได้ด้วยมือว่าง + ม่านที่เปิดตามของที่ถือ (hands-emptied)
│   ├── npc-encounters.js  beings ข้างทาง §6 (เปรต/นางฟ้า/มาร/นาค/ครุฑ/ผู้เฝ้าธาร)
│   ├── story-chapter8.js  กระจกแห่งกรรม — เงาตามอนุสัย (ภาค 2)
│   ├── story-chapter9.js  อนุสัยที่เหลือ — ผีเดินตามรอยเดิม (replay)
│   ├── story-chapter10.js เงาที่โตขึ้น — โตตามการทำซ้ำ หดเมื่อรู้ทัน
│   ├── story-chapter11.js ผีคู่ — สองอนุสัยพร้อมกัน (ghosts collection)
│   ├── story-chapter12.js ผีที่แบ่งตัว — กดแล้วเพิ่ม ถอยห่างแล้วจาง
│   ├── story-chapter13.js เงาทั้งมวล — บทส่งท้ายภาคสอง (รวมทุกกลไก)
│   ├── story-chapter14.js กงล้อและทางออก — ทางพ้นที่ gated ด้วยมรรค+ศีล+กรรม
│   ├── world-update.js    อัปเดตโลกต่อเฟรม (fear, ghost, story, camera)
│   ├── camera.js          กล้อง + shake
│   └── loop.js            requestAnimationFrame เดียว
├── locales/
│   ├── index.js           registry + default
│   ├── th.js lo.js en.js  UI strings + lists + dialogue (merge content)
│   ├── karma.th.js …       คำสอนกรรม ต่อภาษา
│   └── realms.th.js …      ภูมิ 31 ต่อภาษา
└── styles/
    ├── main.css           @import partials
    ├── fonts.css          @font-face + local() fallbacks (offline fonts)
    ├── projector.css      โหมดฉายภาพ (ตัวอักษร/ป้ายใหญ่)
    ├── print.css          ใบงานพิมพ์ได้ (@media print)
    └── base/effects/hud/dialogue/meditation/memory/screens/codex/touch.css
```

## 3. Scene machine

`state.mode` ∈ `TITLE · WORLD · MEDITATION · MEMORY · END`

```
TITLE ──startChapter──▶ WORLD ──near sala──▶ MEDITATION ──▶ MEMORY ──▶ WORLD(dawn) ──▶ END
                          │                                                             ▲
                          └──────────────────── chapter 2 ─────────────────────────────┘
```

`game/loop.js` เป็นผู้ขับเดียว:

```js
WORLD|TITLE → updateWorld(dt) + renderWorld()
MEDITATION  → updateMeditation(dt)
MEMORY      → renderMemoryScene(dt)
```

## 4. Event contract (`core/events.js`)

| Event | Payload | ผู้ส่ง → ผู้รับ |
|---|---|---|
| `key:space-down/up` | — | input → meditation |
| `action:act` | — | input/touch → story router |
| `action:dismiss` | — | input → meditation |
| `dialogue:advance` | — | input → dialogue |
| `choice:picked` | index | input → choices |
| `audio:mute-toggle` | — | input → audio |
| `locale:changed` | code | i18n → hud/screens/codex |
| `karma:changed` | actionId | karma → interested UI |
| `ghost:pacified` | `'mind'`\|`'sala'` | ghost → chapter story (บันทึกกรรม) |
| `karma:changed` | actionId | karma → path (ประเมินมรรค 8 ใหม่) |
| `samsara:rebirth` | realmId | samsara → UI |
| `path:unlocked` | factorId | path → path-notice |
| `teacher:key` | — | input → teacher (T) |
| `teacher:toggle` | boolean | teacher → panel/title |
| `teacher:tour` | { index, total, done } | teacher → panel |
| `projector:key` | — | input → projector (P) |
| `projector:toggle` | boolean | projector → panel/title |
| `form:changed` | formId | forms → interested UI |
| `life:complete` | goal kind | goals → life-summary |
| `precept:broken` | preceptId | precepts → path-notice |

## 5. Chapter system

เพิ่มบทใหม่ = 3 อย่าง:

1. เพิ่ม entry ใน `CHAPTERS` (`game/chapters.js`): `start`, `checkpoint`, `meterKey`, `mindHintKey`, `ghost`, `end`
2. สร้าง `game/story-chapterN.js` แล้ว `registerChapterHandler(N, { start, update })`
3. เพิ่มคีย์ใน `locales/{th,lo,en}.js`

`loadChapter(id)` reset: story flags, ghost (ตาม profile), player, camera, effects, dialogue/choices, stats, checkpoint แล้วเข้า `WORLD`

## 6. รัน & ตรวจสอบ

```bash
npm start          # หรือ npm run serve:py
# http://localhost:5173
```

- `npm test` — รันด้วย **`tests/run.mjs`** ที่ **ค้นหาไฟล์เอง** (`tests/*.test.mjs` ทุกไฟล์ = หนึ่งชุด) จึงไม่มีรายการยาวใน package.json ที่ต้องอัปเดตเมื่อเพิ่มเทสต์ · ตรวจ **syntax ของทุกโมดูลใน `src/` ก่อน** (~1 วินาที) แล้วรันแต่ละชุดในโปรเซสแยก (สถานะไม่รั่ว · ชุดที่ค้างถูกฆ่าและรายงานเป็น fail) · `npm test -- <คำค้น>` เลือกบางชุด · `--list --bail --verbose --watch --no-syntax` · `npm run check` = syntax-only · `npm run test:watch` = เฝ้า `src/` + `tests/` · `npm run test:all` รวม `*.harness.mjs` — ดู `docs/testing.md`
- roads per plane (§7): `ROUTES` ให้แต่ละภพมีถนนของตัวเอง (เริ่มประตูวัด จบศาลา) · ของประดับ/ตัวตรวจ/"อยู่บนทาง"/รอยเท้า/วัสดุถนน ล้วนอ้างถนนของภพนั้น · **`anchoredPoint(biomeId,x,y)`** พา "สิ่งที่อยู่ข้างถนนป่า" (เหยื่อล่อ · ธรรมบาล · ป้ายข้างทาง) ไปยืนบนถนนของภพนั้น (ในป่าเป็น identity) ส่วนจุดประจำภพคงที่ · **เรื่องเล่า/การสอนตามภพ**: `story-chapter2.js#angerSpawn()` · `story-chapter1.js#hasLightGateLesson()` (บทเรียนประตูแสง = ของป่า) · `systems/teacher.js#teacherLandmarks()` แยกสถานที่ที่ยืนทุกภพออกจากจุดที่ผูกกับถนน และตัดหมายเหตุประตูแสงนอกป่า (ทัวร์ 6 จุดในป่า / 5 จุดในภพอื่น) · `tests/routes.test.mjs`
- help & settings (**H**): ปุ่มทั้งหมด + เสียง + ตัวอักษรใหญ่ + ข้อมูลรอบ + ลบเซฟ (ถามยืนยัน) · `ui/confirm.js` เป็นไดอะล็อกกลางที่กันการกดพลาด และปุ่ม "เริ่มภาวนา" ใช้มันก่อนทับเซฟเดิม · บรรทัด `#runReadout` บน HUD บอกช่อง/บท/ชื่อรอบ (`ui/settings.js`, `systems/settings.js`, `ui/confirm.js`)
- `tests/helpers/dom.mjs`: DOM ขนาดเล็กที่ใช้ร่วมกันในชุดทดสอบหน้าจอ (class selector, คลิก/คีย์, `documentElement` สำหรับการตั้งค่าการแสดงผล)
- the market alley's room set (design §7, ตลาดความอยาก): `marketwall` = หินตัด · `narrowgate` = ประตูที่ผ่านได้เฉพาะเมื่อ `carryCount` เป็น 0 · `curtain` = ม่านที่เปิดเมื่อถือของถึง `needs` (1/2/3) · `gift` = ของที่แผงเสนอ → `prompt.takeOffer` (ยึดติด) / `prompt.putDown` (มีเสมอ → ทางออกมีเสมอ) · **`validateMarketRoute` พิสูจน์หกข้อ** (emptyIn · carryIn false · emptyOut · carryOut false · emptyDeep false · ladenDeep) · ผ่านประตูด้วยมือว่างหลังเคยถือ → `hands-emptied` (#21) → ชาติต่อไปไม่มีม่านแรกกั้น · HUD อ่านมือ · `tests/market.test.mjs`
- the light garden's room set (design §7, สวนแสงไม่เที่ยง): `hedge` = วงแฮดแข็งกับทุกร่าง · `shadow` = ประตูเงา ข้ามได้เฉพาะเมื่อ `lightLit` (จาก `systems/light.js` — จังหวะเร็วสุดของโลก ~9 วิ) · `beam` = ลำแสงที่ลอยอยู่เหนือเงา (วาดเฉพาะเมื่อติด) · `bloombed` = แปลงดอกไม้ที่มีอายุ (`ripe` ตาม seed, **มีสุกอย่างน้อยหนึ่งเสมอ**) → `prompt.releaseBloom` → `seeds-released` (#20) + `state.world.released` + `seedfall` · ชาติต่อมาได้ `assembleReleasedBlooms` = ดอกไม้ที่เมล็ดเดินทางไปเกิดตามถนนของภพนั้น · `validateGardenRoute` (dimWalker/litWalker/ripeBlooms) · **ห้องอยู่ข้างถนนเสมอ** · HUD อ่านแสง · `tests/garden.test.mjs`
- the asura city's room set (design §7, นครอสุร): `citywall` = หินตัดแข็งกับทุกร่าง · `drop` = ประตูหักที่ข้ามได้เฉพาะ leap/flying · `span` = หินที่ชีวิตหนึ่งวางคืนเป็นสะพานร่วม (เคลียร์ `drop` แบบเดียวกับ `plank` เคลียร์ `gully`) · `assembleAsuraRooms` + `validateAsuraRoute` (walkerBefore/walkerAfter/leaper) · **ห้องอยู่ข้างถนนเสมอ** เพื่อให้ `validateRoute` ของภพยังเดินได้ทุก seed · เกิดในภพอสุรกาย → เมืองนี้ (`systems/biome.js`) · ศาลาข้างในเป็นที่พักที่ 7 เมื่อ `span-built` (`systems/rest.js`) · `tests/asura.test.mjs`
- the feeding ground (story table, หมูป่า): `mound` = ดินแน่นที่ **แข็งกับทุกร่าง** จนกว่าชีวิตหนึ่งจะดุนเปิด (ประตูคือ *การกระทำ* ไม่ใช่ ability) · `root` = แผ่นรากที่หมูป่าฉีกกินได้ · 4 ราก มีรังใต้ 1 (เลือกตาม seed) ต้องกิน 3 → **ทางปลอดภัยมีอยู่เสมอ** · `validateBoarRoute` พิสูจน์สี่ข้อครั้งแรกของเกม: sealed · rooted · **safeWay** · **harmPossible** (มิติทางศีลธรรม) · `regrown` = รากที่กินไปงอกคืนเมื่อ `soil-turned` แต่รังที่ถูกทำลายไม่คืน · `tests/boar.test.mjs`
- the ground's dampness (story table, หอยทาก): `systems/moisture.js` เป็นจังหวะช้า ๆ ของโลก (เฟส 0..1, ครบรอบ ~22 วิ, เริ่มที่ชื้นสุด) · `dry` = พื้นแห้งที่เป็นกำแพง **สำหรับร่างเดียวในเกม** (`needsDamp`) · `worldAbilities()` รวม `dampGround` จากความชื้นหรือ `damp-trail` · `validateSnailRoute` พิสูจน์สามทาง (หอยทากแห้ง/ชื้น · ร่างอื่น) · `tests/snail.test.mjs`
- terrain that has a say on pace (story table ch.11, ควาย): `systems/terrain.js#terrainSpeed` — โคลน (`mud`) ชะลอทุกอย่างเหลือ `MUD_SPEED` ยกเว้นร่างที่ `wade` · `entities/player.js` คูณเข้าที่ความเร็ว · **การแก้รูปร่างแผนที่**: `rooms.js#assembleFord/assemblePlanks` + `plank` ที่ `blockedAt` ยกเว้น `gully` ใต้ตัว → สะพานของชาติก่อน ๆ ยืนอยู่ (`state.world.planks`, `worldgen`) · `validateBuffaloRoute` พิสูจน์ก่อน/หลังลาก · `tests/buffalo.test.mjs`
- the cat's round (reserve table, แมว): `rooms.js#assembleHomeWalls/validateCatRoute` — กำแพงข้างบ้านสามหลังเป็นประตูของแมว (`cling` + ประตูตรวจธงด้วย) · **ผลที่เป็นผลรวมของการตัดสินใจหลายครั้ง** (`hearths-respected` ต้อง "มองทั้งสามหลังและไม่คุ้ยเลย") → `systems/rest.js#inRespectedHearth` เปิดบ้านเหล่านั้นเป็นที่พัก · `tests/cat.test.mjs`
- the bee's chain (reserve table, ผึ้ง): เส้นทางแบบ **ระยะเอื้อม** — ดอกไม้เรียงเป็นสาย แต่ละดอกอยู่ใน `flightRange` ของดอกก่อน → `reachableFlower()` บังคับลำดับโดยไม่ต้องมีกำแพง · `forest-pollinated` → `rooms.js#assemblePollinatedBlooms` เพิ่ม `bloom` จริงในแผนที่ของชาติต่อ ๆ ไป (ผ่าน `worldgen` options) · แก้การหมุนร่างเกิดใหม่ใน `life-route.js` เป็น "สวมร่างที่ถูกสวมน้อยที่สุด" · `tests/bee.test.mjs`
- drifting things (reserve table, นาก): `systems/drift.js` ให้วัตถุเคลื่อนเองครั้งแรก (ลอยตาม `RIVER` ทางเดียว วนกลับ · ความเร็วขึ้นกับน้ำขึ้นน้ำลง) · `world-data.js#pointAlongRoute/routeLength` เป็นแหล่งเดียวของการ "อยู่ตรงไหนของสายน้ำ" · ผลข้ามชาติ: `state.world.snags` → `rooms.js#assembleSnags` วาง `snag` ทับช่องทางน้ำ และ `worldgen.js#worldSnags()` เก็บให้หายเมื่อ `river-tended` · `tests/otter.test.mjs`
- tide (reserve table, ปู): `systems/tide.js` เป็น **จังหวะของโลก** ครั้งแรก (เฟส 0..1 · ครบรอบ ~26 วิ · เริ่มที่น้ำกำลังลง) · `flood` = ทางน้ำที่ **น้ำลงใครก็ข้ามได้ / น้ำขึ้นเฉพาะ `swimDeep`** · `worldAbilities()` รวม `crossCauseway` จากน้ำลงหรือ `channel-kept` · `validateCrabRoute` พิสูจน์สามทาง (คนเดินน้ำลง/น้ำขึ้น · นักว่าย) · ชั้นน้ำและสายน้ำกว้างตามระดับ · `tests/crab.test.mjs`
- seed crowns (reserve table, กระรอก): ประตูใหม่ **`canopy`** (ปีนขึ้นไปถึงเมล็ด) · `reachableBetween(..., goalRadius)` ถามว่า "เข้าไปในสถานที่ได้ไหม" ไม่ใช่ "ยืนตรงจุดนั้นได้ไหม" · `seeds-scattered` → `saplingsAlong(plane)` ที่ทั้งตัววาดและ `systems/rest.js` ใช้ร่วมกัน · `tests/squirrel.test.mjs`
- echolocation (reserve table, ค้างคาว): **F ส่งคลื่นเสียง** · `systems/echo.js#perceivesPoint` ให้เห็นเมื่ออยู่ในระยะตา *และมีแสง* หรือเมื่อ **คลื่นไปถึง** — ในถ้ำ (`world-data.js#caveDarkness`) ตาใช้ไม่ได้เลย · `lighting.js` เจาะรูแสงตามคลื่นที่วิ่งออก · สอนลูกแล้วได้ `echo-shared` → `canEcho()` จริงสำหรับทุกชีวิต · `tests/bat.test.mjs`
- canvas type per locale: `systems/fonts.js#canvasFont(size, weight)` เป็นแหล่งเดียวของสแตกฟอนต์แคนวาส (lo → `'Kom'` + ขยายขนาด) · ทุกจุดวาดข้อความบนแคนวาสใช้ฟังก์ชันนี้ (ห้ามฮาร์ดโค้ดฟอนต์) · `tests/fonts.test.mjs` เทียบฟอนต์แรกกับ CSS `html[lang='lo']`
- title screen: **four views in one scrolling panel** (เล่น/บท/บันทึก/เครื่องมือ) แทนกำแพงปุ่ม · แท็บใช้คีย์บอร์ด ←→ ได้ และมี `role=tab|tabpanel` · `tests/title.test.mjs` ตรวจการสลับแท็บ เลขบท มาร์กบทของเซฟ แถวช่องบันทึก และการที่คำอธิบายเครื่องมือไม่หายเมื่อสลับป้าย (`ui/title-screen.js`, `ui/save-slots.js`, `styles/screens.css`)
- id audit: ทุก `$('#…')` ใน `src/` ต้องมี element นั้นใน `index.html` (ตรวจด้วยสคริปต์สั้น ๆ ตอนรีวิว)
- `node --check src/**/*.js` — syntax
- smoke tests: โหลดทุกโมดูลด้วย DOM stub, เดินครบทุกฉาก (title/world/meditation/memory/release/chapter 2)
- i18n audit: เทียบคีย์ครบทั้ง 3 ภาษา + ตรวจ `data-i18n` ใน HTML และ `t('…')` ใน JS
