import { config } from '../config/index.js';

export class QuietHoursGuard {
  /**
   * Computes current time in Indian Standard Time (IST, UTC+5:30).
   */
  public static getISTDate(date: Date = new Date()): Date {
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const istOffset = 5.5 * 60 * 60000;
    return new Date(utc + istOffset);
  }

  /**
   * Checks if a given time is within quiet hours (8:00 PM to 9:00 AM IST).
   * Health calls should only happen between 9:00 AM and 8:00 PM IST.
   */
  public static isQuietHours(date: Date = new Date()): {
    isQuiet: boolean;
    currentHourIST: number;
    nextAllowedTimeIST?: Date;
  } {
    const istDate = this.getISTDate(date);
    const hour = istDate.getHours();

    const start = config.callingLimits.quietHoursStartHourIST; // 20 (8 PM)
    const end = config.callingLimits.quietHoursEndHourIST;     // 9 (9 AM)

    const isQuiet = hour >= start || hour < end;

    if (!isQuiet) {
      return { isQuiet: false, currentHourIST: hour };
    }

    // Calculate next permissible calling slot (next 9:15 AM IST)
    const nextSlot = new Date(istDate);
    if (hour >= start) {
      // Advance to tomorrow
      nextSlot.setDate(nextSlot.getDate() + 1);
    }
    nextSlot.setHours(9, 15, 0, 0);

    return {
      isQuiet: true,
      currentHourIST: hour,
      nextAllowedTimeIST: nextSlot,
    };
  }
}

