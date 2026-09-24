# สถาปัตยกรรม / Architecture

> วิมุตติ — ป่าเสียงเรียก · 2D contemplative game (ES modules, ไม่มี build step)

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
│   ├── math.js            clamp, lerp, dist, distSeg, distToPoly
│   ├── rng.js             mulberry32 (world generation คงที่ทุก reload)
│   ├── events.js          pub/sub + EVENTS (สัญญาระหว่างโมดูล)
│   └── state.js           mutable state ข้ามฉาก (mode, chapter, fear, story, stats)
├── content/               "ข้อมูลคำสอน" ล้วน ๆ
│   ├── karma-actions.js   11 กรรม + กุศล/อกุศล + มูล 6
│   ├── factors.js         มรรค 8 + เงื่อนไขเปิด + ผล
│   ├── precepts.js        ศีล 5 + การกระทำที่ทำให้ขาด
│   ├── worksheets.js      ใบงาน 6 หัวข้อ × 3 คำถาม (ห้องเรียน)
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
│   ├── precepts.js        ศีล 5 — สถานะตามการกระทำ (ไม่ตัดสิน)
│   ├── greetings.js       เลือกบททักทายของธรรมบาลจากความจำ
│   ├── save.js            บันทึก/โหลด 3 ช่อง (autosave + เล่นต่อ + สรุปช่อง)
│   ├── teacher.js         โหมดครู — เปิด/ปิด, จุดสำคัญ, guided tour
│   ├── projector.js       โหมดฉายภาพ — ตัวอักษร/ป้ายใหญ่ (implies โหมดครู)
│   └── rebirth.js         resolveRebirth(karma) → ภูมิปลายทาง
├── world/                 ข้อมูลโลก + พื้นผิว
│   ├── world-data.js      PATH, FALSE_A/B, GATES, FOOT, TREES
│   └── textures.js        ground/grain patterns
├── entities/              สิ่งมีชีวิต
│   ├── player.js          movement, collision, safe zone
│   ├── ghost.js           ผี: `ghost` (ตัวหลัก) + `ghosts` (collection), addGhost/updateGhosts
│   └── ghost-status.js    HUNT | FADE
├── render/                canvas ล้วน
│   ├── world-renderer.js  ฉากโลก
│   ├── sprites.js         ต้นไม้/ตัวละคร/ผี/วัด/ศาลา/ป้าย
│   ├── lighting.js        ชั้นความมืด + punch light
│   └── memory-renderer.js ฉากความทรงจำ
├── ui/                    DOM ล้วน
│   ├── dom.js             $, $$
│   ├── feedback.js        fade, toast (+ flashFade)
│   ├── dialogue.js        say/advance/reset
│   ├── choices.js         choose/pick/reset
│   ├── hud.js             fear/anger meter + สติ + บุญ–บาป
│   ├── title-screen.js    เริ่มบท + เลือกบท
│   ├── end-screen.js      สรุปบท + คติภูมิ (rebirth)
│   ├── codex.js           ธรรมะโคเด็กซ์: กรรม + ภูมิ 31
│   ├── rebirth-interlude.js  การ์ดจุติ–ปฏิสนธิเมื่อตาย
│   ├── path-notice.js     แจ้งเตือนเมื่อมรรคข้อใหม่เปิด
│   ├── teacher-panel.js   แผงคำบรรยายโหมดครู
│   ├── save-slots.js      แถวเลือกช่องบันทึกบนหน้า Title
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

- `node --check src/**/*.js` — syntax
- smoke tests: โหลดทุกโมดูลด้วย DOM stub, เดินครบทุกฉาก (title/world/meditation/memory/release/chapter 2)
- i18n audit: เทียบคีย์ครบทั้ง 3 ภาษา + ตรวจ `data-i18n` ใน HTML และ `t('…')` ใน JS
