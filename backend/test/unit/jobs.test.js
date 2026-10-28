import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runNightlyExpiryJob } from '../../src/jobs/nightlyExpiry.js';
import { runMonthlyAccrualJob } from '../../src/jobs/accruals.js';

describe('Unit Tests: Scheduled Jobs', () => {
  it('runNightlyExpiryJob: scans employee documents and reports status', async () => {
    const result = await runNightlyExpiryJob(new Date('2026-10-28'));
    assert.ok(result.scanned >= 0);
    assert.ok(typeof result.alertsFound === 'number');
    assert.ok(Array.isArray(result.alerts));
  });

  it('runMonthlyAccrualJob: is idempotent when run multiple times in same month', async () => {
    // First run for November 2026
    const run1 = await runMonthlyAccrualJob({ targetDate: '2026-11-01' });
    assert.ok(run1.processed > 0);
    assert.ok(run1.accrued >= 0);

    // Second run for same month: must be idempotent!
    const run2 = await runMonthlyAccrualJob({ targetDate: '2026-11-01' });
    assert.equal(run2.accrued, 0, 'Second run in same month must not double-accrue');
    assert.ok(run2.skippedIdempotent >= run1.accrued, 'All previously accrued allocations must be skipped');
  });
});
