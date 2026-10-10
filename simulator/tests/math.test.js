import test from "node:test";
import assert from "node:assert/strict";
import {
  angleFromCosineCoordinate,
  angleFromCotangentCoordinate,
  bygraveAzimuthFromOrdinary,
  cosineCoordinate,
  cotangentCoordinate,
  reduceBygraveOrdinary,
  referenceSight,
} from "../src/math.js";

test("cotangent and cosine scale transforms invert across the supported branch", () => {
  for (const angle of [0.1, 1, 5, 15, 34, 45, 72, 89, 89.9]) {
    assert.ok(Math.abs(angleFromCotangentCoordinate(cotangentCoordinate(angle)) - angle) < 1e-10);
    assert.ok(Math.abs(angleFromCosineCoordinate(cosineCoordinate(angle)) - angle) < 1e-9);
  }
});

test("scale transforms reject singular endpoints and unsupported inverse values", () => {
  assert.throws(() => cotangentCoordinate(0), RangeError);
  assert.throws(() => cosineCoordinate(90), RangeError);
  assert.throws(() => angleFromCosineCoordinate(0), RangeError);
  assert.throws(() => angleFromCotangentCoordinate(Infinity), RangeError);
});

test("independent altitude reference matches the handoff's three ordinary sights", () => {
  const sights = [
    [34, 15, 40, 49.303097],
    [34, -10, 65, 14.355689],
    [30, -20, 25, 34.509377],
  ];
  for (const [lat, dec, hour, expected] of sights) {
    assert.ok(Math.abs(referenceSight(lat, dec, hour).altitude - expected) < 0.000001);
  }
});

test("azimuth convention is true north-clockwise and responds to east/west hour angle", () => {
  const west = referenceSight(34, 15, 40);
  const east = referenceSight(34, 15, -40);
  assert.equal(west.azimuthConvention, "true azimuth clockwise from north");
  assert.ok(Math.abs((west.azimuth + east.azimuth) % 360) < 1e-10);
});

test("ordinary Bygrave scale operations produce y, Y, A, and altitude", () => {
  const sights = [
    { input: [34, 15, 40], y: 19.278960, Y: 75.278960, A: 72.212110, h: 49.303097 },
    { input: [34, -10, 65], y: 22.647126, Y: 33.352874, A: 67.117844, h: 14.355689 },
    { input: [30, -20, 25], y: 21.880233, Y: 38.119768, A: 28.811911, h: 34.509377 },
  ];
  for (const sight of sights) {
    const result = reduceBygraveOrdinary(...sight.input);
    assert.ok(Math.abs(result.y - sight.y) < 0.000001);
    assert.ok(Math.abs(result.Y - sight.Y) < 0.000001);
    assert.ok(Math.abs(result.A - sight.A) < 0.000001);
    assert.ok(Math.abs(result.altitude - sight.h) < 0.000001);
    assert.ok(Math.abs(result.altitude - referenceSight(...sight.input).altitude) < 0.000001);
  }
});

test("ordinary Bygrave azimuth branch conversion matches independent true azimuth", () => {
  const sights = [
    [34, 15, 40], [34, 15, -40], [-34, -15, 40], [-34, -15, -40],
    [34, -10, 65], [-34, 10, 65],
  ];
  for (const sight of sights) {
    const result = reduceBygraveOrdinary(...sight);
    const azimuth = bygraveAzimuthFromOrdinary(sight[0], result.A, sight[2]);
    const independent = referenceSight(...sight).azimuth;
    assert.ok(Math.abs(((azimuth - independent + 540) % 360) - 180) < 1e-6);
  }
});

test("Bygrave ordinary sequence labels unsupported quadrants instead of misreading them", () => {
  assert.throws(() => reduceBygraveOrdinary(34, 15, 110), /currently supports/);
});
