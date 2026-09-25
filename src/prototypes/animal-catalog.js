/** Lab-only roster: these animals are not added to rebirth until their maps exist. */
export const ANIMALS = [
  { id: 'worm', name: 'ไส้เดือน', group: 'ใต้ดิน', speed: .45, width: 52, ability: 'มุดดิน', duration: 2.4, description: 'ยืด–หดตัวเพื่อคลาน · ทดลองมุดดินแล้วโผล่ขึ้น พร้อมรอยทางใต้ดิน' },
  { id: 'ant', name: 'มด', group: 'ใต้ดิน', speed: .85, width: 40, ability: 'ขนเมล็ด', duration: 2.4, description: 'เดินด้วยขาหกขา · ทดลองท่าขนเมล็ดและความเร็วที่ลดลงเมื่อแบกของ' },
  { id: 'frog', name: 'กบ', group: 'ริมน้ำ', speed: .7, width: 43, ability: 'กระโดด', duration: .9, description: 'ทดลองกระโดดสูงและเงาบนพื้น · กดทิศทางระหว่างกระโดดเพื่อเคลื่อนที่' },
  { id: 'snake', name: 'งู', group: 'ป่า', speed: .85, width: 66, ability: 'ลอดช่อง', duration: 1.8, description: 'เลื้อยสลับส่วนโค้ง · ทดลองท่าเหยียดตัวต่ำสำหรับลอดช่อง' },
  { id: 'rabbit', name: 'กระต่าย', group: 'ป่า', speed: 1.15, width: 49, ability: 'กระโดดไกล', duration: 1, description: 'เดินสลับท่าขา · เคลื่อนที่เร็วขึ้นระหว่างกระโดดเพื่อไปได้ไกล' },
  { id: 'elephant', name: 'ช้าง', group: 'ป่า', speed: .65, width: 100, ability: 'ยกงวง', duration: 1.8, description: 'เดินช้าและมีน้ำหนัก · ทดลองยกงวง เตรียมต่อยอดเป็นการย้ายสิ่งกีดขวาง' },
  { id: 'tiger', name: 'เสือ', group: 'ป่า', speed: 1.15, width: 85, ability: 'ย่องเงียบ', duration: 2.8, description: 'ทดลองลดตัวและเดินช้าลงเมื่อย่อง · ยังไม่มีระบบตรวจจับของศัตรูในห้องนี้' },
  { id: 'beetle', name: 'ด้วง', group: 'ป่า', speed: .85, width: 46, ability: 'ผลักวัตถุ', duration: 1.5, description: 'ตัวหนักสำหรับขนาดตัว · ทดลองผลักของไปตามร่องด้วยแรงและทิศ' },
  { id: 'firefly', name: 'หิ่งห้อย', group: 'ป่า', speed: 1.15, width: 34, ability: 'ส่งแสงเป็นจังหวะ', duration: 1.1, description: 'บินช้า ๆ พร้อมแสงที่กะพริบ · ทดลองส่งสัญญาณเป็นจังหวะให้ฝูงตอบ' },
  { id: 'spider', name: 'แมงมุม', group: 'ป่า', speed: 1.0, width: 42, ability: 'ขึงใย', duration: 1.6, description: 'ขึงใยเชื่อมจุดยึด · ทดลองสร้างทางให้ตัวเล็กข้าม โดยไม่ปิดทางใคร' },
  { id: 'boar', name: 'หมูป่า', group: 'ป่า', speed: .95, width: 78, ability: 'ดุนดิน', duration: 1.3, description: 'ดุนดินแรง ๆ หาราก · สังเกตชีวิตใต้พื้นก่อนจะทำลายมัน' },
  { id: 'snail', name: 'หอยทาก', group: 'ป่า', speed: .45, width: 46, ability: 'รอให้พื้นชื้น', duration: 2.2, description: 'คลานช้า ๆ และรอเมื่อพื้นแห้ง · ทดลองจังหวะของตัวเอง' },
  { id: 'buffalo', name: 'ควาย', group: 'ป่า', speed: .7, width: 104, ability: 'ลุยและลาก', duration: 1.6, description: 'เดินหนัก ๆ ลุยโคลนได้เต็มฝีเท้า · ทดลองท่าลากของข้ามเหว' },
  { id: 'cat', name: 'แมว', group: 'ป่า', speed: 1.25, width: 56, ability: 'ทรงตัวบนกำแพง', duration: 1.3, description: 'เดินบนสันกำแพง · ทดลองท่าปีนและความอยากรู้อย่างมีมารยาท' },
  { id: 'bee', name: 'ผึ้ง', group: 'อากาศ', speed: 1.2, width: 40, ability: 'ผสมเกสร', duration: .8, description: 'บินต่อดอกเป็นทอด ๆ · ทดลองท่าบินและงานเล็กที่ส่งผลต่อทั้งทุ่ง' },
  { id: 'otter', name: 'นาก', group: 'ริมน้ำ', speed: 1.05, width: 62, ability: 'ว่ายและจับของลอย', duration: 1.2, description: 'ว่ายตามสายน้ำ · ทดลองท่าจับของที่ลอยมาและจังหวะน้ำขึ้นน้ำลง' },
  { id: 'crab', name: 'ปู', group: 'ริมน้ำ', speed: .9, width: 52, ability: 'เดินด้านข้าง', duration: 1.6, description: 'เดินด้านข้างและหลบใต้หิน · ทดลองท่าหลบและจังหวะน้ำขึ้นน้ำลง' },
  { id: 'squirrel', name: 'กระรอก', group: 'ป่า', speed: 1.15, width: 48, ability: 'ปีนและกระจายเมล็ด', duration: 1.1, description: 'ปีนขึ้นต้นไม้ · ทดลองท่าปีนแล้วเลือกว่าจะสะสมหรือกระจายเมล็ด' },
  { id: 'bat', name: 'ค้างคาว', group: 'อากาศ', speed: 1, width: 58, ability: 'อ่านสัญญาณสะท้อน', duration: 1.2, description: 'บินในความมืด · ทดลองกด F ส่งคลื่นเสียงแล้วดูว่าอะไรปรากฏขึ้น' },
  { id: 'gecko', name: 'จิ้งจก', group: 'ป่า', speed: .9, width: 44, ability: 'เกาะผนัง', duration: 1.4, description: 'แปะตัวกับผนังได้ · ทดลองไต่กำแพงและลอดรอยแตกจากมุมใหม่' },
  { id: 'owl', name: 'นกฮูก', group: 'อากาศ', speed: 1, width: 75, ability: 'บินสำรวจ', duration: 2.8, description: 'ทดลองกางปีกและยกตัวเหนือเงาบนพื้น · ยังไม่มีระบบมองกลางคืน' },
];

export function animalMotion(animal, phase, moving, remaining) {
  const active = remaining > 0;
  const progress = active ? Math.max(0, Math.min(1, 1 - remaining / animal.duration)) : 0;
  const arc = active ? Math.sin(progress * Math.PI) : 0;
  let lift = 0, alpha = 1, speed = 1;
  if (active) {
    if (animal.id === 'frog') { lift = arc * 30; speed = 1.5; }
    if (animal.id === 'rabbit') { lift = arc * 20; speed = 1.8; }
    if (animal.id === 'owl') { lift = arc * 28; speed = 1.2; }
    if (animal.id === 'worm') { alpha = 1 - arc * .8; speed = .65; }
    if (animal.id === 'ant') speed = .65;
    if (animal.id === 'tiger') speed = .42;
  }
  return { column: active ? 3 : moving ? 1 + Math.floor(phase) % 2 : 0, lift, alpha, speed, active };
}
