export function parseWipLimitWholeNumber(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return Number.NaN;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

export function isWipLimitExceeded(limit, currentCount) {
  return limit != null && currentCount > limit;
}
