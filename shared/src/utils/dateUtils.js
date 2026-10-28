/**
 * Asia/Dubai Timezone Utilities (UTC+4, No DST)
 */

export const DUBAI_TIMEZONE = 'Asia/Dubai';
export const DUBAI_OFFSET_HOURS = 4;
export const DUBAI_OFFSET_MS = DUBAI_OFFSET_HOURS * 60 * 60 * 1000;

/**
 * Format a Date or ISO string into YYYY-MM-DD in Asia/Dubai
 */
export function toDubaiDateString(dateOrIso) {
  if (!dateOrIso) return null;
  const d = new Date(dateOrIso);
  if (isNaN(d.getTime())) return null;
  
  // Shift by +4 hours to get local Dubai date components
  const dubaiTime = new Date(d.getTime() + DUBAI_OFFSET_MS);
  const year = dubaiTime.getUTCFullYear();
  const month = String(dubaiTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dubaiTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get UTC Date objects for the start (00:00:00.000) and end (23:59:59.999) of a given Dubai calendar date
 * @param {string|Date} dateStr - e.g. "2026-10-15" or Date
 */
export function getDubaiDayBounds(dateStr) {
  const dateKey = typeof dateStr === 'string' && dateStr.length >= 10
    ? dateStr.slice(0, 10)
    : toDubaiDateString(dateStr);

  const [y, m, d] = dateKey.split('-').map(Number);
  // 00:00:00 in Dubai is previous day 20:00:00 UTC
  const startUtc = new Date(Date.UTC(y, m - 1, d, 0 - DUBAI_OFFSET_HOURS, 0, 0, 0));
  // 23:59:59.999 in Dubai is current day 19:59:59.999 UTC
  const endUtc = new Date(Date.UTC(y, m - 1, d, 23 - DUBAI_OFFSET_HOURS, 59, 59, 999));
  return { startUtc, endUtc, dateStr: dateKey };
}

/**
 * Get time in HH:mm:ss in Asia/Dubai
 */
export function toDubaiTimeString(dateOrIso) {
  if (!dateOrIso) return null;
  const d = new Date(dateOrIso);
  if (isNaN(d.getTime())) return null;
  const dubaiTime = new Date(d.getTime() + DUBAI_OFFSET_MS);
  const hours = String(dubaiTime.getUTCHours()).padStart(2, '0');
  const mins = String(dubaiTime.getUTCMinutes()).padStart(2, '0');
  const secs = String(dubaiTime.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${mins}:${secs}`;
}

/**
 * Convert time string "HH:mm" or "HH:mm:ss" to total minutes from midnight
 */
export function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return parts[0] * 60 + (parts[1] || 0);
}

/**
 * Check if a shift crosses midnight (e.g. 22:00 to 06:00)
 */
export function isOvernightShift(startTime, endTime) {
  const startMin = timeStringToMinutes(startTime);
  const endMin = timeStringToMinutes(endTime);
  return endMin <= startMin;
}

/**
 * Calculate worked duration in hours between checkIn and checkOut
 */
export function calculateWorkedHours(checkIn, checkOut, breakMinutes = 60) {
  if (!checkIn || !checkOut) return { workedHours: 0, breakDeducted: 0, netHours: 0 };
  const inMs = new Date(checkIn).getTime();
  const outMs = new Date(checkOut).getTime();
  if (outMs <= inMs) return { workedHours: 0, breakDeducted: 0, netHours: 0 };

  const totalMin = Math.round((outMs - inMs) / (1000 * 60));
  const workedHours = Number((totalMin / 60).toFixed(2));

  // Deduct break only if worked > 4 hours
  const breakDeducted = workedHours > 4.0 ? Number((breakMinutes / 60).toFixed(2)) : 0;
  const netHours = Math.max(0, Number((workedHours - breakDeducted).toFixed(2)));

  return { workedHours, breakDeducted, netHours };
}

/**
 * Split overtime into normal and night hours (night window default: 22:00 to 04:00)
 * @param {Date} checkOutTime 
 * @param {Date} shiftEndTime
 * @param {string} nightStartStr - e.g. "22:00:00"
 * @param {string} nightEndStr - e.g. "04:00:00"
 */
export function splitOvertimeHours(checkOutTime, shiftEndTime, nightStartStr = '22:00:00', nightEndStr = '04:00:00') {
  const outD = new Date(checkOutTime);
  const shiftEndD = new Date(shiftEndTime);

  if (outD <= shiftEndD) {
    return { normalHours: 0, nightHours: 0, totalHours: 0 };
  }

  let normalMinutes = 0;
  let nightMinutes = 0;

  // Step in 1-minute increments from shiftEndD to outD
  let cur = new Date(shiftEndD.getTime() + 60000);
  while (cur <= outD) {
    const timeStr = toDubaiTimeString(cur);
    const curMin = timeStringToMinutes(timeStr);
    const nightStartMin = timeStringToMinutes(nightStartStr);
    const nightEndMin = timeStringToMinutes(nightEndStr);

    // Night condition: between 22:00 and 04:00 (curMin >= 22*60 or curMin < 4*60)
    const isNight = nightStartMin > nightEndMin
      ? (curMin >= nightStartMin || curMin < nightEndMin)
      : (curMin >= nightStartMin && curMin < nightEndMin);

    if (isNight) {
      nightMinutes++;
    } else {
      normalMinutes++;
    }
    cur = new Date(cur.getTime() + 60000);
  }

  const normalHours = Number((normalMinutes / 60).toFixed(2));
  const nightHours = Number((nightMinutes / 60).toFixed(2));
  const totalHours = Number(((normalMinutes + nightMinutes) / 60).toFixed(2));

  return { normalHours, nightHours, totalHours };
}
