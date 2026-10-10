/** Display decimal-degree calculations as degrees and tenths of an arcminute. */
export function formatAngle(angle, { bearing = false } = {}) {
  if (!Number.isFinite(angle)) return "—";
  const value = bearing ? ((angle % 360) + 360) % 360 : angle;
  // Round before separating the units so 59.95 minutes carries into a degree.
  let tenths = Math.round(Math.abs(value) * 600);
  if (bearing) tenths %= 360 * 600;
  const degrees = Math.floor(tenths / 600);
  const minutes = ((tenths % 600) / 10).toFixed(1).padStart(4, "0");
  const sign = value < 0 && tenths !== 0 ? "−" : "";
  const degreeText = bearing ? String(degrees).padStart(3, "0") : String(degrees);
  return `${sign}${degreeText}° ${minutes}′`;
}
