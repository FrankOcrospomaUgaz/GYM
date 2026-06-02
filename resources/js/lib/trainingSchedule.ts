export type TrainingDaySchedule = { start: string; end: string };
export type TrainingWeekSchedule = { selected_days: string[]; day_schedules: Record<string, TrainingDaySchedule> };
export type TrainingScheduleMode = "weekly" | "monthly" | "package";
export type TrainingBillingMode = "monthly" | "per_class" | "total";

export function computePackageTotal(
  billingMode: TrainingBillingMode,
  sessionCount: number,
  pricePerClass: string | number,
  totalAmount: string | number,
): number {
  const count = Math.max(1, sessionCount);
  if (billingMode === "per_class") {
    return Math.round(Number(pricePerClass || 0) * count * 100) / 100;
  }
  return Math.round(Number(totalAmount || 0) * 100) / 100;
}

export function emptyWeekSchedule(): TrainingWeekSchedule {
  return { selected_days: [], day_schedules: {} };
}

export function countWeeksInSubscriptionPeriod(startsOn: string, endsOn?: string): number {
  if (!startsOn) return 4;
  const start = new Date(`${startsOn}T12:00:00-05:00`);
  const end = endsOn ? new Date(`${endsOn}T12:00:00-05:00`) : new Date(start);
  if (!endsOn) {
    end.setMonth(end.getMonth() + 1);
    end.setDate(end.getDate() - 1);
  }
  const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1);
  return Math.max(1, Math.min(5, Math.ceil(diffDays / 7)));
}

export function buildDefaultWeekSchedules(weekCount: number, template?: TrainingWeekSchedule): TrainingWeekSchedule[] {
  const base = template ?? emptyWeekSchedule();
  return Array.from({ length: weekCount }, () => ({
    selected_days: [...base.selected_days],
    day_schedules: { ...base.day_schedules },
  }));
}

export function resizeWeekSchedules(current: TrainingWeekSchedule[], weekCount: number, template?: TrainingWeekSchedule): TrainingWeekSchedule[] {
  const next = current.slice(0, weekCount);
  while (next.length < weekCount) {
    const previous = next[next.length - 1] ?? template ?? emptyWeekSchedule();
    next.push({
      selected_days: [...previous.selected_days],
      day_schedules: { ...previous.day_schedules },
    });
  }
  return next;
}

export function weekIndexForSubscriptionDate(startsOn: string, dateIso: string): number {
  const start = new Date(`${startsOn}T12:00:00-05:00`);
  const date = new Date(`${dateIso}T12:00:00-05:00`);
  const diffDays = Math.max(0, Math.floor((date.getTime() - start.getTime()) / 86_400_000));
  return Math.floor(diffDays / 7);
}

export function maxSessionsPerWeek(weeks: TrainingWeekSchedule[]): number {
  return weeks.reduce((max, week) => Math.max(max, week.selected_days.length), 0) || 1;
}

export function mergeMonthlySelectedDays(weeks: TrainingWeekSchedule[]): string[] {
  const days = new Set<string>();
  weeks.forEach((week) => week.selected_days.forEach((day) => days.add(day)));
  return Array.from(days);
}

export function formatWeekSchedulesLabel(weeks: TrainingWeekSchedule[]): string {
  return weeks
    .map((week, index) => {
      const days = week.selected_days
        .map((day) => {
          const range = week.day_schedules[day];
          return range ? `${day} ${range.start}-${range.end}` : day;
        })
        .join(", ");
      return `S${index + 1}: ${days || "Sin días"}`;
    })
    .join(" · ");
}
