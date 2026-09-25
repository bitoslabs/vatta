# Production site

https://vatta.bitos.space

nginx root: `/var/www/vatta.bitos.space`

## Build and verify locally

```bash
npm ci
npm run test:full
npm run build:check
npm run deploy:check
npm run deploy:list
```

อัปโหลด **เนื้อหาภายใน `dist/`** ไม่อัปโหลด `src/`, `tests/` หรือ `node_modules/` ตรง ๆ `dist/index.html` และ `dist/character-lab.html` เป็นหน้าเว็บ; `dist/assets/` มี JS/CSS/ไอคอนที่ build อ้างอิง ตัวตรวจ build ปฏิเสธไฟล์ขาด, HTML ยังชี้ source, source map หลุด และ build ที่เก่ากว่า source

`deploy/deploy.sh` เป็นตัวอย่างคำสั่ง deploy ผ่าน SSH ไปยังเครื่องที่กำหนดในไฟล์ ใช้ build และ gate เดียวกันก่อนบีบอัดไฟล์ **อย่ารันโดยไม่ได้ตั้งใจอัปโหลดจริง** สคริปต์เก็บ hashed asset เดิมไว้ชั่วคราวเพื่อให้แท็บที่เปิดอยู่โหลด chunk เดิมได้หลังเปลี่ยน HTML; งานลบ asset รุ่นเก่าควรทำแยกในช่วงบำรุงรักษา

`deploy/vatta.bitos.space.conf` ส่ง HTML ด้วย `Cache-Control: no-cache` และ `/assets/` ซึ่งมีชื่อ hash ด้วย `immutable` เพื่อให้ผู้ใช้ได้หน้าใหม่และใช้แคชไฟล์เดิมได้ ตรวจ `nginx -t` ก่อน reload ทุกครั้ง
