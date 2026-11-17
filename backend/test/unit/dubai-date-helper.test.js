import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toDubaiDateString,
  toDubaiTimeString,
  getDubaiDayBounds,
  DUBAI_TIMEZONE,
  DUBAI_OFFSET_HOURS,
} from '@nextal/shared';

test('M1: Asia/Dubai (UTC+4) Date and Time Utilities', async (t) => {
  await t.test('1. Freezing clock at 21:30 UTC asserts 01:30 Dubai next day', () => {
    // 21:30 UTC on 2026-05-15
    const utcTimestamp = '2026-05-15T21:30:00.000Z';
    const frozenDate = new Date(utcTimestamp);

    // Naive UTC slicing yields the previous day
    const naiveUtcDate = frozenDate.toISOString().slice(0, 10);
    assert.equal(naiveUtcDate, '2026-05-15', 'Naive UTC slice gives 2026-05-15');

    // toDubaiDateString correctly rolls over to next day (UTC + 4h -> 01:30 on 2026-05-16)
    const dubaiDate = toDubaiDateString(frozenDate);
    assert.equal(dubaiDate, '2026-05-16', 'toDubaiDateString must yield 2026-05-16 (next day)');

    // toDubaiTimeString asserts 01:30:00
    const dubaiTime = toDubaiTimeString(frozenDate);
    assert.equal(dubaiTime, '01:30:00', 'toDubaiTimeString must yield 01:30:00');
  });

  await t.test('2. Year boundary crossover: 2026-12-31 21:30 UTC asserts 2027-01-01 01:30 Dubai', () => {
    const nyeUtc = new Date('2026-12-31T21:30:00.000Z');
    assert.equal(nyeUtc.toISOString().slice(0, 10), '2026-12-31');

    const dubaiDate = toDubaiDateString(nyeUtc);
    assert.equal(dubaiDate, '2027-01-01', 'Must cross year boundary to 2027-01-01');

    const dubaiTime = toDubaiTimeString(nyeUtc);
    assert.equal(dubaiTime, '01:30:00', 'Time must be 01:30:00 in Dubai');
  });

  await t.test('3. Mocking global Date.now at 21:30 UTC yields next day for new Date()', () => {
    const realNow = Date.now;
    const frozenTime = new Date('2026-08-10T21:30:00.000Z').getTime();

    try {
      Date.now = () => frozenTime;
      const currentSimulatedDate = new Date(Date.now());

      assert.equal(currentSimulatedDate.toISOString().slice(0, 10), '2026-08-10');
      assert.equal(toDubaiDateString(currentSimulatedDate), '2026-08-11');
      assert.equal(toDubaiTimeString(currentSimulatedDate), '01:30:00');
    } finally {
      Date.now = realNow;
    }
  });

  await t.test('4. getDubaiDayBounds returns correct UTC start and end bounds', () => {
    const { startUtc, endUtc, dateStr } = getDubaiDayBounds('2026-05-16');

    assert.equal(dateStr, '2026-05-16');
    // Start of day in Dubai (00:00:00 GST) is 20:00:00 UTC previous day
    assert.equal(startUtc.toISOString(), '2026-05-15T20:00:00.000Z');
    // End of day in Dubai (23:59:59.999 GST) is 19:59:59.999 UTC current day
    assert.equal(endUtc.toISOString(), '2026-05-16T19:59:59.999Z');
  });

  await t.test('5. Handles null, undefined, and invalid inputs gracefully', () => {
    assert.equal(toDubaiDateString(null), null);
    assert.equal(toDubaiDateString(undefined), null);
    assert.equal(toDubaiDateString('not-a-date'), null);
    assert.equal(toDubaiTimeString(null), null);
    assert.equal(toDubaiTimeString(undefined), null);
    assert.equal(toDubaiTimeString('invalid'), null);
  });
});
