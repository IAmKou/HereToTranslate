// Business time utilities: add business hours skipping weekends and off-hours

export interface BusinessHoursConfig {
  workdayStartHour: number; // 24h format
  workdayEndHour: number;   // 24h format
  workingDays: number[];    // 0=Sunday ... 6=Saturday. Usually [1,2,3,4,5]
}

const defaultConfig: BusinessHoursConfig = {
  workdayStartHour: 9,
  workdayEndHour: 18,
  workingDays: [1, 2, 3, 4, 5],
};

export function isWorkingDay(date: Date, cfg: BusinessHoursConfig = defaultConfig): boolean {
  return cfg.workingDays.includes(date.getDay());
}

export function setToWorkdayStart(date: Date, cfg: BusinessHoursConfig = defaultConfig): Date {
  const d = new Date(date);
  d.setHours(cfg.workdayStartHour, 0, 0, 0);
  return d;
}

export function nextWorkingStart(date: Date, cfg: BusinessHoursConfig = defaultConfig): Date {
  let d = new Date(date);
  // If weekend, move to next Monday at start
  while (!isWorkingDay(d, cfg)) {
    d.setDate(d.getDate() + 1);
    d = setToWorkdayStart(d, cfg);
  }

  const start = new Date(d);
  start.setHours(cfg.workdayStartHour, 0, 0, 0);
  const end = new Date(d);
  end.setHours(cfg.workdayEndHour, 0, 0, 0);

  if (d < start) return start;
  if (d >= end) {
    // move to next day start
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    return nextWorkingStart(setToWorkdayStart(next, cfg), cfg);
  }
  return d;
}

export function addBusinessHours(from: Date, hours: number, cfg: BusinessHoursConfig = defaultConfig): Date {
  if (!isFinite(hours) || hours <= 0) {
    return new Date(from);
  }

  let remaining = hours;
  let cursor = nextWorkingStart(from, cfg);

  while (remaining > 0) {
    const workdayEnd = new Date(cursor);
    workdayEnd.setHours(cfg.workdayEndHour, 0, 0, 0);

    const millisLeftToday = workdayEnd.getTime() - cursor.getTime();
    const hoursLeftToday = millisLeftToday / (1000 * 60 * 60);

    if (remaining <= hoursLeftToday) {
      const result = new Date(cursor);
      result.setTime(result.getTime() + remaining * 60 * 60 * 1000);
      return result;
    }

    // consume the rest of today and move to next working day start
    remaining -= hoursLeftToday;
    const nextDay = new Date(cursor);
    nextDay.setDate(nextDay.getDate() + 1);
    cursor = nextWorkingStart(setToWorkdayStart(nextDay, cfg), cfg);
  }

  return cursor;
}


