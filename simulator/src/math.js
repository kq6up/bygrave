const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function assertOpenFirstQuadrant(angleDeg) {
  if (!Number.isFinite(angleDeg) || angleDeg <= 0 || angleDeg >= 90) {
    throw new RangeError("Angle must be finite and strictly between 0° and 90° on this branch.");
  }
}

export function cotangentCoordinate(angleDeg) {
  assertOpenFirstQuadrant(angleDeg);
  return Math.log10(1 / Math.tan(angleDeg * DEG));
}

export function cosineCoordinate(angleDeg) {
  assertOpenFirstQuadrant(angleDeg);
  return Math.log10(Math.cos(angleDeg * DEG));
}

export function angleFromCotangentCoordinate(logCot) {
  if (!Number.isFinite(logCot)) throw new RangeError("Coordinate must be finite.");
  const angle = Math.atan(10 ** (-logCot)) * RAD;
  if (angle <= 0 || angle >= 90) throw new RangeError("Coordinate lies outside the supported open branch.");
  return angle;
}

export function angleFromCosineCoordinate(logCos) {
  if (!Number.isFinite(logCos)) throw new RangeError("Coordinate must be finite.");
  const cosine = 10 ** logCos;
  if (!(cosine > 0 && cosine < 1)) throw new RangeError("Coordinate lies outside the supported open branch.");
  return Math.acos(cosine) * RAD;
}

export function normalizeDegrees(angleDeg) {
  return ((angleDeg % 360) + 360) % 360;
}

/** Convert the ordinary first-quadrant Bygrave A to true azimuth clockwise from north. */
export function bygraveAzimuthFromOrdinary(latitudeDeg, Adeg, hourAngleDeg) {
  if (![latitudeDeg, Adeg, hourAngleDeg].every(Number.isFinite) || latitudeDeg === 0 || Adeg <= 0 || Adeg >= 90 || hourAngleDeg === 0 || Math.abs(hourAngleDeg) >= 90) {
    throw new RangeError("Azimuth conversion requires a nonzero latitude, 0° < A < 90°, and 0° < |LHA| < 90°.");
  }
  if (latitudeDeg > 0) return normalizeDegrees(hourAngleDeg > 0 ? 180 + Adeg : 180 - Adeg);
  return normalizeDegrees(hourAngleDeg > 0 ? 360 - Adeg : Adeg);
}

/**
 * Independent spherical-trigonometry reference.
 * Latitude and declination are north-positive; hour angle is positive westward.
 * Returns altitude and true azimuth clockwise from north.
 */
export function referenceSight(latitudeDeg, declinationDeg, hourAngleDeg) {
  if (![latitudeDeg, declinationDeg, hourAngleDeg].every(Number.isFinite)) {
    throw new RangeError("Sight inputs must be finite.");
  }
  if (Math.abs(latitudeDeg) > 90 || Math.abs(declinationDeg) > 90) {
    throw new RangeError("Latitude and declination must be within ±90°.");
  }

  const phi = latitudeDeg * DEG;
  const delta = declinationDeg * DEG;
  const hourAngle = hourAngleDeg * DEG;
  const sinAltitude = Math.sin(phi) * Math.sin(delta)
    + Math.cos(phi) * Math.cos(delta) * Math.cos(hourAngle);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude))) * RAD;

  // Local tangent-plane components for a west-positive hour angle.
  const east = -Math.cos(delta) * Math.sin(hourAngle);
  const north = Math.cos(phi) * Math.sin(delta)
    - Math.sin(phi) * Math.cos(delta) * Math.cos(hourAngle);
  const azimuth = normalizeDegrees(Math.atan2(east, north) * RAD);
  return { altitude, azimuth, azimuthConvention: "true azimuth clockwise from north" };
}

/**
 * Three ordinary Bygrave operations, expressed as logarithmic scale readings.
 * Supported branch: nonzero LAT/DEC, 0 < |LHA| < 90°, and 0 < Y < 90°.
 * A is the historical acute intermediate, not true azimuth.
 */
export function reduceBygraveOrdinary(latitudeDeg, declinationDeg, hourAngleDeg) {
  if (![latitudeDeg, declinationDeg, hourAngleDeg].every(Number.isFinite)) {
    throw new RangeError("Sight inputs must be finite.");
  }
  if (Math.abs(latitudeDeg) > 90 || Math.abs(declinationDeg) > 90) {
    throw new RangeError("Latitude and declination must be within ±90°.");
  }
  const lat = Math.abs(latitudeDeg);
  const dec = Math.abs(declinationDeg);
  const hour = Math.abs(hourAngleDeg);
  if (lat === 0 || dec === 0 || hour <= 0 || hour >= 90) {
    throw new RangeError("This Bygrave scale sequence currently supports nonzero LAT/DEC and 0° < |LHA| < 90°.");
  }

  // Step 1: cot(y) = cot(DEC) × cos(H), evaluated as addition of scale coordinates.
  const yCoord = cotangentCoordinate(dec) + cosineCoordinate(hour);
  const y = angleFromCotangentCoordinate(yCoord);

  // Step 2: combine y with co-latitude according to the names of LAT and DEC.
  const coLatitude = 90 - lat;
  const sameName = latitudeDeg * declinationDeg > 0;
  const Y = sameName ? coLatitude + y : coLatitude - y;
  if (!(Y > 0 && Y < 90)) {
    throw new RangeError("This sight puts Y outside the supported first-quadrant Bygrave scale branch.");
  }

  // Step 3: cot(A) = cot(H) × cos(Y) / cos(y), again using scale coordinates.
  const aCoord = cotangentCoordinate(hour) + cosineCoordinate(Y) - cosineCoordinate(y);
  const A = angleFromCotangentCoordinate(aCoord);

  // Step 4: cot(h) = cot(Y) / cos(A).
  const altitudeCoord = cotangentCoordinate(Y) - cosineCoordinate(A);
  const altitude = angleFromCotangentCoordinate(altitudeCoord);
  const reference = referenceSight(latitudeDeg, declinationDeg, hourAngleDeg);
  const trueAzimuth = bygraveAzimuthFromOrdinary(latitudeDeg, A, hourAngleDeg);
  return { coLatitude, y, Y, A, altitude, trueAzimuth, referenceAzimuth: reference.azimuth };
}
