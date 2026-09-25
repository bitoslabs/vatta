# วัฏฏะ (Vatta) — เกี่ยวกับเกม / About

## ชื่อเกม / Name

เกมเดิมชื่อ **วิมุตติ (Vimutti)** เปลี่ยนเป็น **วัฏฏะ (Vatta)** — คำบาลี *vaṭṭa* แปลว่า "วงล้อ วงกลม การหมุนวน" สื่อถึงวงล้อแห่งการเวียนว่ายตายเกิดที่เป็นแกนของเกม

ชื่อเดียวกันเขียนได้สามภาษา ใช้แทนกันตาม locale:

ค่าเริ่มต้นสำหรับผู้เล่นใหม่คือ **ລາວ (`lo`)**; หากเคยเลือกภาษาอื่น ระบบใช้ค่าที่บันทึกไว้ใน `vimutti.locale` ต่อไป

| locale | ชื่อเกม | ที่เก็บ |
|---|---|---|
| ไทย (`th`) | วัฏฏะ | `src/locales/th.js` → `title.name`, `app.title` |
| ລາວ (`lo`) | ວັດຕະ | `src/locales/lo.js` → `title.name`, `app.title` |
| English (`en`) | Vatta | `src/locales/en.js` → `title.name`, `app.title` |

ส่วนคำโปรย **ป่าเสียงเรียก / The Forest Call** ยังเป็นชื่อบท ไม่เปลี่ยน

> หมายเหตุ: คีย์ `localStorage` (`vimutti.locale`, `vimutti.save.*`, `vimutti.settings`, `vimutti.teacher`, `vimutti.projector`) คงเดิมโดยเจตนา เพื่อไม่ให้เซฟและค่าตั้งของผู้เล่นเดิมหาย

## ฟอนต์ลาว / Lao fonts

หน้า Lao (`html[lang='lo']`) ใช้ฟอนต์จาก `fonts.mts.la` แทนชุด Google Fonts:

- **หัวเรื่อง (heading / display)** — `Lao_Buhan`
  `<link rel="stylesheet" href="https://fonts.mts.la/fonts/lao-buhan/lao-buhan.css">`
- **เนื้อความ (normal / body)** — `Kom`
  `<link rel="stylesheet" href="https://fonts.mts.la/fonts/kom/kom.css">`

ลิงก์ทั้งสองอยู่ใน `index.html` และสลับสแตกฟอนต์ด้วย `html[lang='lo']` ใน `src/styles/base.css` (`--font-display` = Lao_Buhan, `--font-body` = Kom) โดย `lang` ถูกตั้งที่ `src/systems/i18n.js` ทุกครั้งที่เปลี่ยนภาษา

## รุ่น · แหล่งโค้ด · ผู้สร้าง / Version, source, maker

ข้อมูลเหล่านี้เป็นข้อมูลชุดเดียวที่ `src/core/app-meta.js` และแสดงในแท็บ **เกี่ยวกับ (About)** ของหน้าแรก (`index.html` + `src/ui/about.js`)

| รายการ | ค่า |
|---|---|
| เวอร์ชัน (version) | `1.0.0` (ตรงกับ `package.json`) |
| ซอร์สโค้ด (GitHub) | https://github.com/bitoslabs/vatta.git |
| สร้างโดย (built by) | https://bitos.space/ |

## การอัปเดตเวอร์ชัน

เมื่อออกรุ่นใหม่ ให้แก้ `version` ใน `package.json` และ `src/core/app-meta.js` พร้อมกัน (ทั้งคู่ต้องตรงกัน) แท็บ About จะอ่านค่าจาก `app-meta.js` ทันทีโดยไม่ต้องแก้ HTML
