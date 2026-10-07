export const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

export type VietnamParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  date: string;
  monthKey: string;
  stamp: string;
  label: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function vietnamFromDate(date: Date): VietnamParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  if (bag.hour === "24") bag.hour = "00";
  const dateText = `${bag.year}-${bag.month}-${bag.day}`;
  const clock = `${bag.hour}:${bag.minute}:${bag.second}`;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    second: Number(bag.second),
    date: dateText,
    monthKey: `${bag.year}-${bag.month}`,
    stamp: `${dateText}T${clock}`,
    label: `${bag.day}/${bag.month}/${bag.year} ${clock}`,
  };
}

export function vietnamNow() {
  return vietnamFromDate(new Date());
}

/** Gateway clocks are stored from UTC `toISOString()` without a zone suffix. */
export function vietnamFromStored(at: string | null | undefined): VietnamParts | null {
  if (!at) return null;
  const match = at.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const date = new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  ));
  if (Number.isNaN(date.getTime())) return null;
  return vietnamFromDate(date);
}

export function formatStoredVietnam(value: string | null | undefined) {
  return vietnamFromStored(value)?.label ?? null;
}

export function formatCivilDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (year && month && day) return `${day}/${month}/${year}`;
  return iso;
}

export function vietnamNowLabel() {
  return vietnamNow().label;
}

export function vietnamTodayLabel() {
  return formatCivilDate(vietnamNow().date);
}

/** Treat a `datetime-local` value as Vietnam civil time and return a UTC ISO string. */
export function vietnamInputToUtcIso(value: string) {
  const match = value.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) return null;
  const utc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  ) - VIETNAM_OFFSET_MS;
  return new Date(utc).toISOString();
}

export function vietnamInputValue(date: Date) {
  const parts = vietnamFromDate(date);
  return `${parts.date}T${pad(parts.hour)}:${pad(parts.minute)}`;
}
