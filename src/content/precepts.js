'use strict';

/**
 * The Five Precepts (ศีล 5) as *training*, not commandments.
 *
 * The game records actual choices. A precept with no matching story action stays
 * unbroken; ordinary attachment and fear must not be mistaken for violations of
 * the third and fifth precepts.
 */
export const PRECEPTS = Object.freeze([
  { id: 'panatipata', action: 'harm' },      // ปาณาติบาต — ไม่เบียดเบียน
  { id: 'adinnadana', action: 'steal' },     // อทินนาทาน — ไม่ถือเอาของที่ไม่ได้ให้
  { id: 'kamesu', action: 'sexualMisconduct' }, // กาเมสุมิจฉาจาร — not ordinary attachment
  { id: 'musavada', action: 'lie' },         // มุสาวาท — ไม่กล่าวเท็จ
  { id: 'surameraya', action: 'intoxicate' }, // สุราเมรัย — ไม่มัวเมาจนขาดสติ; fear is not intoxication
]);

export const preceptNameKey = (id) => `precept.${id}.name`;
export const preceptDescKey = (id) => `precept.${id}.desc`;
