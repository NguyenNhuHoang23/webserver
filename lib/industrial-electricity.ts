/** Biểu giá điện sản xuất, Quyết định 1279/QĐ-BCT ngày 09/05/2025. Chưa gồm VAT. */
export const INDUSTRIAL_TARIFF_DECISION = "1279/QĐ-BCT ngày 09/05/2025";
/** Khung giờ sử dụng điện, Quyết định 963/QĐ-BCT năm 2026. */
export const INDUSTRIAL_SCHEDULE_DECISION = "963/QĐ-BCT năm 2026";

export const INDUSTRIAL_VOLTAGE_LEVELS = [
  { id: "kv110", label: "Từ 110 kV trở lên", normal: 1811, off: 1146, peak: 3266 },
  { id: "kv22", label: "Từ 22 đến dưới 110 kV", normal: 1833, off: 1190, peak: 3398 },
  { id: "kv6", label: "Từ 6 đến dưới 22 kV", normal: 1899, off: 1234, peak: 3508 },
  { id: "kv-under-6", label: "Dưới 6 kV", normal: 1987, off: 1300, peak: 3640 },
] as const;

export type VoltageLevelId = (typeof INDUSTRIAL_VOLTAGE_LEVELS)[number]["id"];
export type TouBand = "normal" | "off" | "peak";

export type TouPrices = Record<TouBand, number>;

export const DEFAULT_VOLTAGE_LEVEL: VoltageLevelId = "kv-under-6";

export function voltageLevelById(id: string | undefined) {
  return INDUSTRIAL_VOLTAGE_LEVELS.find((level) => level.id === id) ?? INDUSTRIAL_VOLTAGE_LEVELS[3];
}

export function formatTariffPrice(value: number) {
  return value.toLocaleString("vi-VN");
}

export function parseTariffPrice(value: unknown) {
  const text = String(value ?? "").trim().replace(/\s/g, "");
  if (!text) return 0;
  if (/^\d{1,3}(\.\d{3})+$/.test(text)) return Number(text.replace(/\./g, ""));
  if (/^\d{1,3}(,\d{3})+$/.test(text)) return Number(text.replace(/,/g, ""));
  const number = Number(text.replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

export function pricesForLevel(id: string | undefined): TouPrices {
  const level = voltageLevelById(id);
  return { normal: level.normal, off: level.off, peak: level.peak };
}

export function resolveTouPrices(
  voltageLevel: string | undefined,
  raw?: Partial<Record<TouBand, unknown>>,
): { levelId: VoltageLevelId; prices: TouPrices } {
  const level = voltageLevelById(voltageLevel);
  const official = pricesForLevel(level.id);
  const pick = (band: TouBand) => {
    const text = raw?.[band];
    if (text == null || String(text).trim() === "") return official[band];
    return parseTariffPrice(text);
  };
  return {
    levelId: level.id,
    prices: { normal: pick("normal"), off: pick("off"), peak: pick("peak") },
  };
}

/** 0 = Chủ nhật … 6 = thứ Bảy, theo ngày dương lịch Việt Nam. */
export function civilWeekday(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Khung giờ điện công nghiệp.
 * Thấp điểm 00:00–06:00 mọi ngày.
 * Cao điểm 17:30–22:30 thứ Hai–thứ Bảy.
 * Chủ nhật từ 06:00 là giờ bình thường.
 */
export function industrialBand(weekday: number, hour: number, minute: number): TouBand {
  const minutes = hour * 60 + minute;
  if (minutes < 6 * 60) return "off";
  if (weekday === 0) return "normal";
  if (minutes >= 17 * 60 + 30 && minutes < 22 * 60 + 30) return "peak";
  return "normal";
}

/** T = A_bt×G_bt + A_td×G_td + A_cd×G_cd */
export function industrialEnergyCost(kwh: TouPrices, prices: TouPrices) {
  const normal = kwh.normal * prices.normal;
  const off = kwh.off * prices.off;
  const peak = kwh.peak * prices.peak;
  return { normal, off, peak, total: normal + off + peak };
}
