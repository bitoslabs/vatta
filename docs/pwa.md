# PWA: ติดตั้งและเล่นแบบออฟไลน์

เกมและ Character Lab ใช้ web app manifest เดียวกันที่ `public/manifest.webmanifest` พร้อมไอคอน 192/512 พิกเซลจากโลโก้เดิม เมื่อเผยแพร่ผ่าน HTTPS ผู้เล่นสามารถติดตั้งเกมจากเมนูติดตั้งของเบราว์เซอร์ได้ หน้าเริ่มต้นคือเกม (`./`) และหน้าต่าง standalone ไม่มีแถบเบราว์เซอร์

ชื่อที่แสดงตอนติดตั้งเป็นภาษาลาว `ວັດຕະ`; เกมเปิดครั้งแรกด้วย locale `lo` และยังเคารพภาษาที่ผู้เล่นเดิมบันทึกไว้

`npm run build` ให้ Vite สร้างไฟล์ใน `dist/` แล้ว `scripts/generate-sw.mjs` สร้าง `dist/sw.js` จากไฟล์ที่ออกจริงทั้งหมด รวม HTML สองหน้า, JS/CSS ที่มี hash, manifest และไอคอน จึงไม่ต้องรักษารายชื่อ asset ด้วยมือ service worker เก็บไฟล์เหล่านี้เมื่อ install สำเร็จ การเข้าเกมครั้งแรกต้องออนไลน์และรอให้ worker ติดตั้งเสร็จ หลังจากนั้นเปิดหน้าเกมหรือ Character Lab และใช้ไฟล์ที่เก็บไว้ขณะออฟไลน์ได้ คำขอ HTML ใช้เครือข่ายก่อนเพื่อรับรุ่นล่าสุด แล้วใช้ไฟล์เดิมเมื่อไม่มีเน็ต; JS/CSS/รูปที่เก็บไว้ใช้จาก cache ก่อน

ไฟล์ฟอนต์ที่โหลดจาก `fonts.googleapis.com` และ `fonts.mts.la` อยู่นอก origin จึงไม่ถูกเก็บโดย worker ถ้าออฟไลน์ก่อนเคยโหลดฟอนต์ เบราว์เซอร์จะใช้ fallback ใน CSS และตัวเกมยังทำงานได้ เกมไม่ได้ซิงก์เซฟข้ามอุปกรณ์; เซฟในเบราว์เซอร์เดิมยังใช้กลไกเดิม

## ตรวจสอบ

```bash
npm run build:check
npm run deploy:check
npm run preview
```

เปิด `http://127.0.0.1:4173/` ในเบราว์เซอร์ (`localhost`/loopback เป็น secure context สำหรับการทดสอบ) รอหน้าโหลดและ worker ติดตั้ง เปิด DevTools → Application → Service Workers แล้วตรวจว่า `sw.js` active และ manifest แสดงไอคอน จากนั้นใช้ DevTools → Network → Offline แล้วรีโหลด `/` และ `/character-lab.html` ทั้งสองหน้าควรเปิดได้ ปิด Offline และรีโหลดเพื่อตรวจอัปเดตตามปกติ `npm run dev` ไม่ลงทะเบียน worker เพื่อไม่ให้ cache เก่ารบกวนงานพัฒนา

บนโดเมนจริงต้องใช้ HTTPS และให้ `sw.js`/`manifest.webmanifest` ส่ง `Cache-Control: no-cache` เพื่อให้เบราว์เซอร์ตรวจรุ่นใหม่ทุกครั้ง ไฟล์ `assets/` ที่มี hash สามารถ cache แบบ immutable ได้ worker ใหม่รอให้แท็บที่ใช้ worker เก่าปิดก่อนค่อย activate เพื่อไม่ตัดไฟล์ของแท็บที่ยังเล่นอยู่ หากต้องล้างข้อมูลทดสอบ ใช้ DevTools → Application → Storage → Clear site data (การทำเช่นนี้จะลบเซฟในเบราว์เซอร์นั้นด้วย)
