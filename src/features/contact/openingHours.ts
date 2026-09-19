export type OpeningState = "open" | "closed";
export type OpeningHoursLabel = "monday" | "tueThu" | "friSat" | "sunday";

type Weekday =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

interface WeeklyHoursEntry {
  days: Weekday[];
  label: OpeningHoursLabel;
  opensAtMinutes: number | null;
  closesAtMinutes: number | null;
}

export interface PublicOpeningHours {
  label: OpeningHoursLabel;
  timeRange: string | null;
}

export interface StructuredOpeningHours {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: Weekday | Weekday[];
  opens: string;
  closes: string;
}

function atTime(hour: number, minute = 0): number {
  return hour * MINUTES_PER_HOUR + minute;
}

const MINUTES_PER_HOUR = 60;
const WEEKDAYS: Weekday[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const WEEKLY_OPENING_HOURS: WeeklyHoursEntry[] = [
  { days: ["Monday"], label: "monday", opensAtMinutes: null, closesAtMinutes: null },
  { days: ["Tuesday", "Wednesday", "Thursday"], label: "tueThu", opensAtMinutes: atTime(12), closesAtMinutes: atTime(22) },
  { days: ["Friday", "Saturday"], label: "friSat", opensAtMinutes: atTime(12), closesAtMinutes: atTime(23) },
  { days: ["Sunday"], label: "sunday", opensAtMinutes: atTime(12), closesAtMinutes: atTime(21) },
];

const berlinClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Berlin",
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function isWeekday(value: string | undefined): value is Weekday {
  return value !== undefined && WEEKDAYS.includes(value as Weekday);
}

function formatMinutes(minutes: number): string {
  const hour = Math.floor(minutes / MINUTES_PER_HOUR);
  const minute = minutes % MINUTES_PER_HOUR;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getPublicOpeningHours(): PublicOpeningHours[] {
  return WEEKLY_OPENING_HOURS.map((entry) => ({
    label: entry.label,
    timeRange:
      entry.opensAtMinutes === null || entry.closesAtMinutes === null
        ? null
        : `${formatMinutes(entry.opensAtMinutes)}–${formatMinutes(entry.closesAtMinutes)}`,
  }));
}

export function getStructuredOpeningHours(): StructuredOpeningHours[] {
  return WEEKLY_OPENING_HOURS.flatMap((entry) => {
    if (entry.opensAtMinutes === null || entry.closesAtMinutes === null) return [];
    return [{
      "@type": "OpeningHoursSpecification",
      dayOfWeek: entry.days.length === 1 ? entry.days[0] : entry.days,
      opens: formatMinutes(entry.opensAtMinutes),
      closes: formatMinutes(entry.closesAtMinutes),
    }];
  });
}

export function getOpeningState(at: Date): OpeningState {
  const parts = berlinClock.formatToParts(at);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (!isWeekday(weekday) || !Number.isInteger(hour) || !Number.isInteger(minute)) {
    return "closed";
  }

  const hours = WEEKLY_OPENING_HOURS.find((entry) => entry.days.includes(weekday));
  if (!hours || hours.opensAtMinutes === null || hours.closesAtMinutes === null) {
    return "closed";
  }
  const currentMinutes = hour * MINUTES_PER_HOUR + minute;
  return currentMinutes >= hours.opensAtMinutes && currentMinutes < hours.closesAtMinutes
    ? "open"
    : "closed";
}
