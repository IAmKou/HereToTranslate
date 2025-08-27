export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/**
 * Creates a Date object in Vietnam timezone (UTC+7)
 * @returns Date object representing current time in Vietnam
 */
export function getVietnamTime(): Date {
  return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
}

/**
 * Converts a UTC date to Vietnam timezone
 * @param utcDate - UTC date string or Date object
 * @returns Date object in Vietnam timezone
 */
export function convertToVietnamTime(utcDate: string | Date): Date {
  const date = new Date(utcDate);
  return new Date(date.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
}
