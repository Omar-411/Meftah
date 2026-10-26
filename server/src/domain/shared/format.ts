const NBSP = " ";

/** 1250000 -> "1 250 000" (non-breaking spaces, per DESIGN.md currency format). */
export function formatAmount(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** 530000 -> "530k" */
export function formatAmountCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, "")} M`;
  return value >= 1000 ? `${Math.round(value / 1000)}k` : formatAmount(value);
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

const LONG_DATE = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const WEEKDAY_SHORT = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const MONTH_SHORT = new Intl.DateTimeFormat("fr-FR", { month: "short" });

export const formatLongDateFr = (date: Date) => capitalize(LONG_DATE.format(date));
export const formatShortDateFr = (date: Date) => SHORT_DATE.format(date);
export const formatTimeFr = (date: Date) => TIME.format(date);
export const formatWeekdayShortFr = (date: Date) => capitalize(WEEKDAY_SHORT.format(date).replace(".", ""));
export const formatMonthShortFr = (date: Date) => capitalize(MONTH_SHORT.format(date).replace(".", ""));

const RELATIVE_UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "il y a 2 heures" */
export function formatRelativeFr(date: Date, now: Date): string {
  const diff = date.getTime() - now.getTime();
  const formatter = new Intl.RelativeTimeFormat("fr", { numeric: "always" });
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) return formatter.format(Math.round(diff / ms), unit);
  }
  return "à l'instant";
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Monday-based week start. */
export function startOfWeek(date: Date): Date {
  const day = (date.getDay() + 6) % 7;
  return startOfDay(addDays(date, -day));
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** yyyy-mm-dd in local time, for URLs and <input type="date">. */
export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseDateKey(key: string | undefined): Date | null {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const date = new Date(`${key}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function whatsappLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

const TN_PHONE = /^(\+216|00216)?[\s.-]?[2-9]\d(?:[\s.-]?\d{3}){2}$/;

export function isValidTunisianPhone(phone: string): boolean {
  return TN_PHONE.test(phone.trim());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
