'use strict';

/**
 * The Five Precepts (ศีล 5) as *training*, not commandments.
 *
 * The game never grades a choice: it only records what was done. Each precept
 * is broken by a kind of intention already tracked in the kamma ledger, and the
 * world reflects it afterwards (notices, echoes, the codex, the end screen).
 */
export const PRECEPTS = Object.freeze([
  { id: 'panatipata', action: 'harm' },      // ปาณาติบาต — ไม่เบียดเบียน
  { id: 'adinnadana', action: 'steal' },     // อทินนาทาน — ไม่ถือเอาของที่ไม่ได้ให้
  { id: 'kamesu', action: 'cling' },         // กาเมสุมิจฉาจาร — ไม่ล่วงเกิน/ไม่ยึดใครเป็นของเรา
  { id: 'musavada', action: 'lie' },         // มุสาวาท — ไม่กล่าวเท็จ
  { id: 'surameraya', action: 'panic' },     // สุราเมรัย — ไม่มัวเมาจนขาดสติ
]);

export const preceptNameKey = (id) => `precept.${id}.name`;
export const preceptDescKey = (id) => `precept.${id}.desc`;
