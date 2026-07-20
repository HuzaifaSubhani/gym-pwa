import { PROTOCOL_START_DATE } from "@/data/protocol";

/**
 * Get the YYYY-MM-DD date string for a given protocol week and day number.
 */
export function getProtocolDateString(week: number, dayNum: number): string {
  const date = new Date(PROTOCOL_START_DATE);
  date.setDate(date.getDate() + ((week - 1) * 7 + (dayNum - 1)));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get a short human-readable label like "Jul 6" from a date string.
 */
export function getShortDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Get today's date as YYYY-MM-DD string.
 */
export function getTodayDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

/**
 * Calculate total volume from a set log array, including drop sets.
 */
export function calculateVolume(logs: Array<{ weight: string; reps: string; drops?: Array<{ weight: string; reps: string }> }>): number {
  let total = 0;
  for (const log of logs) {
    const w = parseFloat(log.weight) || 0;
    const r = parseInt(log.reps) || 0;
    total += w * r;
    if (log.drops) {
      for (const drop of log.drops) {
        const dw = parseFloat(drop.weight) || 0;
        const dr = parseInt(drop.reps) || 0;
        total += dw * dr;
      }
    }
  }
  return total;
}
