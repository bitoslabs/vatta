# สัตว์ต้นแบบชุดที่ 2

สร้างด้วย ImageGen ในตัว และใช้ใน [ห้องทดลอง](../../../character-lab.html) เท่านั้น

- [สัตว์ขนาดเล็ก](small-animals-atlas-v1.png): ไส้เดือน มด กบ งู
- [สัตว์ป่า](forest-animals-atlas-v1.png): กระต่าย ช้าง เสือ นกฮูก

ทั้งสองภาพเป็น RGBA 1254 × 1254 พิกเซล แต่ละแถวเป็นหนึ่งชนิด มีท่าพัก เคลื่อนที่สองท่า และท่าพิเศษ ภาพต้นฉบับเก็บไว้เต็มภาพ ตัววาดใช้ source windows ตามช่องว่างจริงเพื่อไม่ตัดปีกหรือยืดสัดส่วน

## สิ่งที่ทดลองได้

| ร่าง | ท่าพิเศษในห้องทดลอง |
|---|---|
| ไส้เดือน | จางลงพร้อมรอยมุดแล้วกลับขึ้นมา เคลื่อนที่ช้าลง |
| มด | ภาพแบกเมล็ด เคลื่อนที่ช้าลง |
| กบ | ยกตัวเป็นวิถีโค้งพร้อมเงา เคลื่อนที่เร็วขึ้นกลางอากาศ |
| งู | เหยียดตัวต่ำสำหรับท่าลอดช่อง |
| กระต่าย | กระโดดพร้อมเพิ่มความเร็วเคลื่อนที่ |
| ช้าง | ท่ายกงวง |
| เสือ | ลดตัวและเดินช้าลง |
| นกฮูก | กางปีกและลอยเหนือเงา |

ยังไม่มีระบบชน ขนวัตถุจริง ศัตรูตรวจจับ หรือแผนที่ใต้ดินสำหรับชุดนี้ในตัว *ภาพ* เอง — แต่ระบบใต้ดินของเกมหลักมีแล้วในรอบบทไส้เดือน (โพรงใต้ราก) ภาพยังไม่ถูกเรียกใช้ในเกมหลัก: ร่างสัตว์ใหม่วาดด้วยโค้ดจาก `src/render/animal-vectors.js` ตามแนวภาพนี้

**การเกิดใหม่**: ร่างสัตว์ใหม่ 8 ชนิดมีข้อมูลใน `content/forms.js` แล้ว โดยไส้เดือนเข้าสู่วงจรเกิดใหม่จริง (มีโพรงและเป้าหมายของตัวเอง) ส่วนที่เหลือยัง `rebirth: false` และถูกกรองด้วย `maps` ของร่าง ป้องกันเกิดเป็นร่างที่ไม่มีด่านรองรับ ขนาดในห้องทดลองเป็นขนาดแสดงตัวอย่าง ไม่ใช่มาตราส่วนสัตว์จริง ภาพเป็นด้านข้างเท่านั้น ชุดเคลื่อนไหวสองเฟรมยังต้องเพิ่มและปรับจังหวะก่อนผลิตเต็ม

## การตรวจ

ตรวจ alpha และขนาดภาพ ตรวจ JavaScript และ whitespace ตรวจตรรกะเฟรม/ความเร็ว/การกลับลงพื้นของทั้ง 8 ชนิด เปิดภาพในเบราว์เซอร์ ตรวจสลับร่างและท่าบิน ไม่พบ console error ระหว่างตรวจ

## Prompt — สัตว์ขนาดเล็ก

Use case: stylized-concept. Asset type: 2D RPG animation atlas, semi-realistic hand-painted natural animals. EXACTLY 4 columns and 4 rows, sixteen complete isolated animal poses in equal grid cells, transparent alpha background. No text, no grid lines, no scenery, no cast shadows, no accessories. Each ROW is one species in FOUR distinct poses. All face RIGHT in side view. Entire body and appendages contained within its cell with 12 percent margins. Keep identical body scale within each row and consistent feet baseline at 82 percent cell height. Natural anatomy, fine fur/skin details, readable silhouettes, soft upper-left light. This is for equal-cell slicing by a game. Make a square image. ROW 1: pink-brown segmented EARTHWORM. Columns: relaxed long S curve, extended crawling shape, contracted crawling shape, head curled downward ready to burrow. ROW 2: dark chestnut ANT, six legs and two antennae. Columns: idle standing, first walking stride, opposite walking stride, carrying a small pale seed in mandibles. ROW 3: natural green FROG, cream underside. Columns: resting crouch, forward crawling step, opposite crawling step, jumping with extended hind legs. ROW 4: olive-brown nonvenomous SNAKE. Columns: resting loose S shape, slithering S curved upward, opposite slithering S curve, low flattened narrow elongated pose sliding through a gap. Each pose occupies exactly its own cell; don't draw all poses connected.

## Prompt — สัตว์ป่า

Use case: stylized-concept. Asset type: 2D RPG animation atlas, semi-realistic hand-painted natural animals. EXACTLY 4 columns and 4 rows, sixteen complete isolated animal poses in equal grid cells, transparent alpha background. No text, no grid lines, no scenery, no cast shadows, no accessories. Each ROW is one species in FOUR distinct poses. All face RIGHT in side view. Entire body and appendages contained within its cell with 12 percent margins. Keep identical body scale within each row and consistent feet baseline at 82 percent cell height. Natural anatomy, fine fur/skin details, readable silhouettes, soft upper-left light. This is for equal-cell slicing by a game. Make a square image. ROW 1: natural brown RABBIT with cream belly and long ears. Columns: resting on four feet, first hopping stride, opposite hopping stride, airborne leap hind legs stretched. ROW 2: grey ASIAN ELEPHANT with small ears. Columns: idle, first walking stride, opposite walking stride, raised curved trunk reaching forward. ROW 3: orange TIGER with accurate dark stripes and white underside. Columns: idle, first walking stride, opposite walking stride, low stealth stalking crouch. ROW 4: brown woodland OWL with mottled feathers. Columns: standing wings folded, wingbeat extended upward, wingbeat extended downward, flying wings widely spread. Full wings fit inside each cell.

