// Original reflection exercises for this game, not quotations from scripture.
// [Thai, Lao, English]. Scenarios and answers are authored; only selection varies.
export const REFLECTIONS = [
  { id: 'anger-path', theme: 'kindness', question: ['มีผู้ขวางทาง คุณเริ่มโกรธ จะทำอย่างไรต่อ?', 'ມີຜູ້ຂວາງທາງ ເຈົ້າເລີ່ມໃຈຮ້າຍ ຈະເຮັດແນວໃດ?', 'Someone blocks your path. Anger rises. What could you do next?'] },
  { id: 'anger-echo', theme: 'kindness', question: ['คำพูดที่ทำให้เจ็บยังวนอยู่ในใจ คุณจะตอบสนองอย่างไร?', 'ຄຳເວົ້າທີ່ເຮັດໃຫ້ເຈັບຍັງວົນໃນໃຈ ຈະຕອບສະໜອງແນວໃດ?', 'A hurtful remark keeps returning to mind. How might you respond?'] },
  { id: 'food-share', theme: 'giving', question: ['คุณมีอาหารพอ และพบผู้หิวโหย การเลือกใดช่วยลดความยึดไว้?', 'ເຈົ້າມີອາຫານພໍ ແລະພົບຜູ້ຫິວໂຫຍ ຈະເລືອກແນວໃດ?', 'You have enough food and meet someone hungry. What might loosen your grip?'] },
  { id: 'treasure-share', theme: 'giving', question: ['คุณพบของที่มีประโยชน์เกินความจำเป็น จะใช้มันอย่างไร?', 'ເຈົ້າພົບຂອງມີປະໂຫຍດເກີນຄວາມຈຳເປັນ ຈະໃຊ້ແນວໃດ?', 'You find more useful supplies than you need. What could you do with them?'] },
  { id: 'slow-crossing', theme: 'patience', question: ['ผู้ร่วมทางเดินช้ากว่าคุณมาก จะเดินร่วมกันอย่างไร?', 'ໝູ່ຮ່ວມທາງຍ່າງຊ້າກວ່າເຈົ້າ ຈະໄປນຳກັນແນວໃດ?', 'Your companion moves much more slowly. How could you travel together?'] },
  { id: 'waiting-water', theme: 'patience', question: ['น้ำยังสูงและข้ามไม่ปลอดภัย ความรีบร้อนช่วยหรือไม่?', 'ນ້ຳຍັງສູງ ຂ້າມບໍ່ປອດໄພ ຄວາມຮີບຮ້ອນຊ່ວຍບໍ?', 'The water is too high to cross safely. Would rushing help?'] },
  { id: 'lost-light', theme: 'change', question: ['แสงที่สวยงามกำลังจางลง คุณจะอยู่กับการเปลี่ยนแปลงอย่างไร?', 'ແສງທີ່ງາມກຳລັງຈາງລົງ ຈະຢູ່ກັບການປ່ຽນແປງແນວໃດ?', 'A beautiful light is fading. How could you meet that change?'] },
  { id: 'new-body', theme: 'change', question: ['ร่างใหม่ทำสิ่งที่ร่างเก่าเคยทำไม่ได้ คุณจะเริ่มเรียนรู้อย่างไร?', 'ຮ່າງໃໝ່ເຮັດຄືຮ່າງເກົ່າບໍ່ໄດ້ ຈະເລີ່ມຮຽນຮູ້ແນວໃດ?', 'Your new body cannot do everything your old body could. How could you begin learning?'] },
  { id: 'wandering-mind', theme: 'attention', question: ['ระหว่างหยุดพัก ใจเผลอคิดไปไกล ควรฝึกต่ออย่างไร?', 'ລະຫວ່າງພັກ ໃຈຄິດໄປໄກ ຄວນຝຶກຕໍ່ແນວໃດ?', 'While resting, your mind wanders far away. How could you continue practising?'] },
  { id: 'fear-sound', theme: 'attention', question: ['ได้ยินเสียงที่ยังไม่รู้ที่มา จะสังเกตอย่างไรโดยไม่ด่วนสรุป?', 'ໄດ້ຍິນສຽງທີ່ບໍ່ຮູ້ທີ່ມາ ຈະສັງເກດແນວໃດ?', 'You hear a sound of unknown origin. How could you observe without jumping to conclusions?'] },
  { id: 'small-being', theme: 'care', question: ['สิ่งมีชีวิตเล็กกว่าคุณกำลังหลบทาง คุณจะใช้ความสามารถอย่างไร?', 'ສັດນ້ອຍກວ່າເຈົ້າກຳລັງຫຼົບທາງ ຈະໃຊ້ຄວາມສາມາດແນວໃດ?', 'A smaller creature is trying to get out of your way. How could you use your abilities?'] },
  { id: 'shared-shelter', theme: 'care', question: ['ที่พักพอมีพื้นที่ให้ผู้อื่น คุณจะทำให้เป็นที่ปลอดภัยร่วมกันอย่างไร?', 'ບ່ອນພັກມີພື້ນທີ່ໃຫ້ຜູ້ອື່ນ ຈະເຮັດໃຫ້ປອດໄພຮ່ວມກັນແນວໃດ?', 'Your shelter has room for another. How could it become safe for both of you?'] },
  { id: 'leave-trophy', theme: 'letting', question: ['การถือของที่หวงไว้ทำให้เดินต่อยาก คุณจะพิจารณาอะไร?', 'ການຖືຂອງທີ່ຫວງເຮັດໃຫ້ໄປຕໍ່ຍາກ ຈະພິຈາລະນາຫຍັງ?', 'Holding a treasured object makes it hard to continue. What might you consider?'] },
  { id: 'perfect-stillness', theme: 'letting', question: ['ความสงบครั้งก่อนผ่านไปแล้ว จะฝึกครั้งนี้โดยไม่ยึดผลเดิมอย่างไร?', 'ຄວາມສະຫງົບຄັ້ງກ່ອນຜ່ານໄປແລ້ວ ຈະຝຶກໂດຍບໍ່ຍຶດຜົນເກົ່າແນວໃດ?', 'Yesterday’s calm has passed. How could you practise without demanding the same result?'] },
];

// First option is constructive; display order is separately seeded and saved.
export const REFLECTION_THEMES = {
  kindness: { label: ['เมตตา', 'ເມດຕາ', 'Kindness'], options: [
    ['รู้ทันความโกรธ แล้วเลือกไม่ทำร้าย', 'ຮູ້ທັນຄວາມໂກດ ແລ້ວເລືອກບໍ່ທຳຮ້າຍ', 'Notice anger, then choose not to harm'],
    ['ตอบโต้ทันที', 'ຕອບໂຕ້ທັນທີ', 'Retaliate immediately'],
    ['กดความโกรธไว้และโทษตัวเอง', 'ກົດຄວາມໂກດໄວ້ ແລະໂທດຕົນເອງ', 'Suppress anger and blame yourself']],
    feedback: ['การรู้ทันเปิดช่องให้เลือก เมตตาไม่จำเป็นต้องยอมให้ใครทำร้ายเรา', 'ການຮູ້ທັນເປີດທາງໃຫ້ເລືອກ ເມດຕາບໍ່ແມ່ນຍອມໃຫ້ຖືກທຳຮ້າຍ', 'Noticing creates room to choose. Kindness can include a firm, safe boundary.'] },
  giving: { label: ['การให้', 'ການໃຫ້', 'Generosity'], options: [
    ['แบ่งเท่าที่ทำได้โดยไม่เบียดเบียนตน', 'ແບ່ງເທົ່າທີ່ເຮັດໄດ້ ໂດຍບໍ່ເບຽດບຽນຕົນ', 'Share within your means'],
    ['เก็บทุกอย่างเพราะกลัวไม่พอ', 'ເກັບທຸກຢ່າງເພາະຢ້ານບໍ່ພໍ', 'Keep everything out of fear'],
    ['ให้เพื่อแลกคำชมเท่านั้น', 'ໃຫ້ເພື່ອຄຳຊົມເທົ່ານັ້ນ', 'Give only to receive praise']],
    feedback: ['ลองสังเกตเจตนาก่อนให้ การแบ่งปันอย่างพอดีช่วยทั้งผู้รับและผู้ให้', 'ລອງສັງເກດເຈດຕະນາກ່ອນໃຫ້ ການແບ່ງປັນພໍດີຊ່ວຍທັງສອງຝ່າຍ', 'Notice your intention. Sustainable sharing can support both the receiver and the giver.'] },
  patience: { label: ['ความอดทน', 'ຄວາມອົດທົນ', 'Patience'], options: [
    ['หยุดดูเงื่อนไข แล้วเลือกจังหวะที่ปลอดภัย', 'ຢຸດເບິ່ງເງື່ອນໄຂ ແລ້ວເລືອກຈັງຫວະປອດໄພ', 'Observe conditions and choose a safe pace'],
    ['เร่งไปโดยไม่ดูใคร', 'ຮີບໄປໂດຍບໍ່ເບິ່ງໃຜ', 'Rush ahead regardless'],
    ['กล่าวโทษทุกสิ่งที่ทำให้ช้า', 'ໂທດທຸກສິ່ງທີ່ເຮັດໃຫ້ຊ້າ', 'Blame everything that slows you down']],
    feedback: ['อดทนคือเห็นเงื่อนไขและตอบสนองอย่างเหมาะสม ไม่ใช่ฝืนอยู่ในอันตราย', 'ອົດທົນແມ່ນເຫັນເງື່ອນໄຂ ແລະຕອບສະໜອງຢ່າງເໝາະສົມ', 'Patience means responding to conditions wisely, not remaining in danger.'] },
  change: { label: ['ความไม่เที่ยง', 'ຄວາມບໍ່ທ່ຽງ', 'Change'], options: [
    ['รับรู้สิ่งที่เปลี่ยน แล้วเรียนรู้สิ่งที่ทำได้ตอนนี้', 'ຮັບຮູ້ສິ່ງທີ່ປ່ຽນ ແລ້ວຮຽນຮູ້ສິ່ງທີ່ເຮັດໄດ້ຕອນນີ້', 'Notice what changed and explore what is possible now'],
    ['บังคับให้ทุกอย่างเหมือนเดิม', 'ບັງຄັບໃຫ້ທຸກຢ່າງຄືເກົ່າ', 'Demand that everything stay the same'],
    ['เลิกสนใจทุกอย่าง', 'ເຊົາສົນໃຈທຸກຢ່າງ', 'Stop caring about everything']],
    feedback: ['การเห็นความเปลี่ยนแปลงช่วยให้ปรับตัวได้ ยังดูแลสิ่งสำคัญได้โดยไม่ต้องหยุดเวลา', 'ການເຫັນຄວາມປ່ຽນແປງຊ່ວຍໃຫ້ປັບຕົວ ແລະຍັງດູແລສິ່ງສຳຄັນໄດ້', 'Seeing change makes adaptation possible. You can still care without trying to stop time.'] },
  attention: { label: ['สติ', 'ສະຕິ', 'Attention'], options: [
    ['รู้ว่ากำลังคิด แล้วกลับมาสังเกตอย่างอ่อนโยน', 'ຮູ້ວ່າກຳລັງຄິດ ແລ້ວກັບມາສັງເກດຢ່າງອ່ອນໂຍນ', 'Notice the thought and gently return to observing'],
    ['เชื่อความคิดแรกทันที', 'ເຊື່ອຄວາມຄິດທຳອິດທັນທີ', 'Believe the first thought immediately'],
    ['ตำหนิตัวเองที่คิด', 'ຕຳໜິຕົນເອງທີ່ຄິດ', 'Scold yourself for thinking']],
    feedback: ['การรู้ว่าเผลอเป็นโอกาสฝึกใหม่ ไม่จำเป็นต้องทำให้ใจว่างตลอดเวลา', 'ການຮູ້ວ່າເຜີເປັນໂອກາດຝຶກໃໝ່ ບໍ່ຈຳເປັນຕ້ອງໃຫ້ໃຈວ່າງຕະຫຼອດ', 'Recognising distraction is another chance to practise. A permanently blank mind is not required.'] },
  care: { label: ['ไม่เบียดเบียน', 'ບໍ່ເບຽດບຽນ', 'Care'], options: [
    ['เว้นพื้นที่และช่วยเท่าที่ปลอดภัย', 'ເວັ້ນພື້ນທີ່ ແລະຊ່ວຍເທົ່າທີ່ປອດໄພ', 'Make space and help where it is safe'],
    ['ใช้กำลังยึดพื้นที่ทั้งหมด', 'ໃຊ້ກຳລັງຍຶດພື້ນທີ່ທັງໝົດ', 'Use force to claim all the space'],
    ['ไม่มองผลที่เกิดกับผู้อื่น', 'ບໍ່ເບິ່ງຜົນຕໍ່ຜູ້ອື່ນ', 'Ignore the effects on others']],
    feedback: ['ร่างแต่ละแบบมีข้อจำกัดต่างกัน ลองใช้ความสามารถเพื่อลดความลำบากร่วมกัน', 'ແຕ່ລະຮ່າງມີຂໍ້ຈຳກັດຕ່າງກັນ ລອງໃຊ້ຄວາມສາມາດເພື່ອຊ່ວຍກັນ', 'Bodies have different limitations. Try using your abilities to ease a shared difficulty.'] },
  letting: { label: ['การปล่อยวาง', 'ການປ່ອຍວາງ', 'Letting go'], options: [
    ['เห็นความอยากยึด แล้วผ่อนสิ่งที่ไม่จำเป็น', 'ເຫັນຄວາມຢາກຍຶດ ແລ້ວຜ່ອນສິ່ງບໍ່ຈຳເປັນ', 'Notice the urge to hold on and ease what is unnecessary'],
    ['พยายามควบคุมให้ได้ทุกอย่าง', 'ພະຍາຍາມຄວບຄຸມທຸກຢ່າງ', 'Try to control everything'],
    ['ทิ้งหน้าที่ทุกอย่างทันที', 'ຖິ້ມໜ້າທີ່ທຸກຢ່າງທັນທີ', 'Abandon every responsibility immediately']],
    feedback: ['ปล่อยวางคือผ่อนความยึด ไม่ใช่ละเลยหน้าที่ ลองเริ่มจากสิ่งเล็กที่ไม่จำเป็น', 'ປ່ອຍວາງແມ່ນຜ່ອນຄວາມຍຶດ ບໍ່ແມ່ນລະເລີຍໜ້າທີ່', 'Letting go eases clinging; it does not erase responsibility. Start with one unnecessary burden.'] },
};
