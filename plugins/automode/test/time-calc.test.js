/**
 * TDD Tests for AutoMode time calculation logic
 *
 * 测试日出日落偏移时间的计算，包括跨天边界情况
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ========== 待测试的函数（从 preload.js 和 index.html 提取）==========
// 当前 preload.js:513 的实现：
//   ((lightMin % 1440) + 1440) % 1440 / 60  ← 有运算符优先级 bug
//   Math.floor 修复了除法，但 % 60 仍然受影响
//
// 期望行为：给定时间 HH:mm 和偏移分钟数，返回 HH:mm

function calcTimeWithOffset(hours, minutes, offset) {
  const totalMin = hours * 60 + minutes + offset;
  const wrapped = ((totalMin % 1440) + 1440) % 1440;
  return String(Math.floor(wrapped / 60)).padStart(2, '0') + ':' + String(wrapped % 60).padStart(2, '0');
}

describe('Time offset calculation', () => {

  // --- 基本场景 ---

  it('should return same time with zero offset', () => {
    assert.equal(calcTimeWithOffset(6, 0, 0), '06:00');
  });

  it('should add positive offset', () => {
    assert.equal(calcTimeWithOffset(6, 0, 15), '06:15');
  });

  it('should subtract with negative offset', () => {
    assert.equal(calcTimeWithOffset(18, 0, -10), '17:50');
  });

  it('should handle large positive offset within same day', () => {
    assert.equal(calcTimeWithOffset(6, 30, 120), '08:30');
  });

  // --- 跨午夜场景 ---

  it('should wrap to next day when offset pushes past midnight', () => {
    // 23:00 + 120min = 01:00 next day
    assert.equal(calcTimeWithOffset(23, 0, 120), '01:00');
  });

  it('should wrap to previous day when negative offset pushes before midnight', () => {
    // 01:00 - 120min = 23:00 previous day
    assert.equal(calcTimeWithOffset(1, 0, -120), '23:00');
  });

  it('should handle exactly midnight wrap (24:00 = 00:00)', () => {
    // 00:00 - 1min = 23:59
    assert.equal(calcTimeWithOffset(0, 0, -1), '23:59');
  });

  it('should handle exactly midnight forward (23:59 + 1 = 00:00)', () => {
    assert.equal(calcTimeWithOffset(23, 59, 1), '00:00');
  });

  it('should handle full day offset', () => {
    // 12:00 + 1440min (24h) = 12:00
    assert.equal(calcTimeWithOffset(12, 0, 1440), '12:00');
  });

  it('should handle more than full day offset', () => {
    // 12:00 + 1500min (25h) = 13:00
    assert.equal(calcTimeWithOffset(12, 0, 1500), '13:00');
  });

  // --- 真实日出日落场景 ---

  it('should calculate light switch time correctly (sunrise 05:47, offset -10)', () => {
    // 05:47 - 10min = 05:37
    assert.equal(calcTimeWithOffset(5, 47, -10), '05:37');
  });

  it('should calculate dark switch time correctly (sunset 18:32, offset +15)', () => {
    // 18:32 + 15min = 18:47
    assert.equal(calcTimeWithOffset(18, 32, 15), '18:47');
  });

  it('should handle extreme: sunrise 00:05 with negative offset', () => {
    // 00:05 - 30min = 23:35 (previous day)
    assert.equal(calcTimeWithOffset(0, 5, -30), '23:35');
  });

  it('should handle extreme: sunset 23:55 with positive offset', () => {
    // 23:55 + 30min = 00:25 (next day)
    assert.equal(calcTimeWithOffset(23, 55, 30), '00:25');
  });

  // --- 边界值 ---

  it('should handle offset of 0 with midnight', () => {
    assert.equal(calcTimeWithOffset(0, 0, 0), '00:00');
  });

  it('should handle max valid offset (+120 min)', () => {
    assert.equal(calcTimeWithOffset(22, 0, 120), '00:00');
  });

  it('should handle min valid offset (-120 min)', () => {
    assert.equal(calcTimeWithOffset(2, 0, -120), '00:00');
  });
});
