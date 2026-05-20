export const GYM_TIMEZONE = "America/Lima";

export function todayInLima(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: GYM_TIMEZONE }).format(new Date());
}

export function parseGymInstant(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T12:00:00-05:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (raw.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(raw)) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const date = new Date(`${normalized}-05:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateKeyInLima(value: unknown): string {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const instant = parseGymInstant(value);
  if (!instant) {
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match?.[1] ?? "";
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: GYM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

export function formatGymDate(value: unknown) {
  const instant = parseGymInstant(value);
  if (!instant) return String(value ?? "-") || "-";
  return instant.toLocaleDateString("es-PE", {
    timeZone: GYM_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatGymDateTime(value: unknown) {
  if (!value) return "-";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return formatGymDate(raw);
  const instant = parseGymInstant(value);
  if (!instant) return raw;
  const hasTime = /\d{2}:\d{2}/.test(raw);
  if (!hasTime && !raw.includes("T")) return formatGymDate(raw);
  return instant.toLocaleString("es-PE", {
    timeZone: GYM_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function currentMonthRangeInLima() {
  const todayKey = todayInLima();
  const [year, month] = todayKey.split("-");
  return { from: `${year}-${month}-01`, to: todayKey };
}
