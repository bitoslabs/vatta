/** Lab-only roster: these animals are not added to rebirth until their maps exist. */
export const ANIMALS = [
  { id: 'worm', name: 'ไส้เดือน', group: 'ใต้ดิน', speed: .45, width: 52, ability: 'มุดดิน', duration: 2.4, description: 'ยืด–หดตัวเพื่อคลาน · ทดลองมุดดินแล้วโผล่ขึ้น พร้อมรอยทางใต้ดิน' },
  { id: 'ant', name: 'มด', group: 'ใต้ดิน', speed: .85, width: 40, ability: 'ขนเมล็ด', duration: 2.4, description: 'เดินด้วยขาหกขา · ทดลองท่าขนเมล็ดและความเร็วที่ลดลงเมื่อแบกของ' },
  { id: 'frog', name: 'กบ', group: 'ริมน้ำ', speed: .7, width: 43, ability: 'กระโดด', duration: .9, description: 'ทดลองกระโดดสูงและเงาบนพื้น · กดทิศทางระหว่างกระโดดเพื่อเคลื่อนที่' },
  { id: 'snake', name: 'งู', group: 'ป่า', speed: .85, width: 66, ability: 'ลอดช่อง', duration: 1.8, description: 'เลื้อยสลับส่วนโค้ง · ทดลองท่าเหยียดตัวต่ำสำหรับลอดช่อง' },
  { id: 'rabbit', name: 'กระต่าย', group: 'ป่า', speed: 1.15, width: 49, ability: 'กระโดดไกล', duration: 1, description: 'เดินสลับท่าขา · เคลื่อนที่เร็วขึ้นระหว่างกระโดดเพื่อไปได้ไกล' },
  { id: 'elephant', name: 'ช้าง', group: 'ป่า', speed: .65, width: 100, ability: 'ยกงวง', duration: 1.8, description: 'เดินช้าและมีน้ำหนัก · ทดลองยกงวง เตรียมต่อยอดเป็นการย้ายสิ่งกีดขวาง' },
  { id: 'tiger', name: 'เสือ', group: 'ป่า', speed: 1.15, width: 85, ability: 'ย่องเงียบ', duration: 2.8, description: 'ทดลองลดตัวและเดินช้าลงเมื่อย่อง · ยังไม่มีระบบตรวจจับของศัตรูในห้องนี้' },
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
