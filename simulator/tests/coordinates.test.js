import test from "node:test";
import assert from "node:assert/strict";
import { HELIX, TUBES, helicalPoint, logAtIndex, tubePose, xFromLog } from "../src/coordinates.js";

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test("3D helical graduations and flat pointer intersections agree across settings", () => {
  for (const part of ["inner", "middle"]) for (const coordinate of [-2, -1, -0.1, 0, 0.5, 1.75]) for (const cursor of [-200, 0, 80]) {
    const offset = TUBES[part].pointer + cursor - xFromLog(coordinate);
    const point = helicalPoint(part, coordinate, offset, cursor);
    close(point.x, 0); close(point.y, TUBES[part].readY); close(point.z, TUBES[part].radius);
    close(logAtIndex(part, offset, cursor), coordinate);
  }
});

test("one helix turn preserves circumferential position and changes axial row", () => {
  for (const part of ["inner", "middle"]) {
    const a = helicalPoint(part, -0.5, 12, -24);
    const b = helicalPoint(part, -0.5, 12 + HELIX.pixelsPerTurn, -24);
    close(a.x, b.x); close(a.z, b.z); close(a.y - b.y, HELIX.pitch);
  }
});

test("cursor movement changes both tube poses by the same relative displacement", () => {
  const move = 17.125;
  const expected = tubePose(0, move);
  for (const offset of [-207.2492, 45]) {
    const before = tubePose(offset, 0), after = tubePose(offset, move);
    close(after.rotation - before.rotation, expected.rotation);
    close(after.translation - before.translation, expected.translation);
  }
});
