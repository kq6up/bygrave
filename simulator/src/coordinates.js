// Shared scale coordinates for the flat view and the illustrative 3D helix.
export const AXIS = { left: 110, width: 820, min: -2, max: 2 };
export const POINTER_L = 430;
export const POINTER_S = 565;
export const HELIX = { pixelsPerTurn: 820 / 24, pitch: 4.5 };
export const TUBES = {
  inner: { radius: 27, length: 215.9, center: 0, pointer: POINTER_L, readY: 60 },
  middle: { radius: 58.997 / 2, length: 194.9, center: -43, pointer: POINTER_S, readY: -25 },
};

export function xFromLog(value, offset = 0) {
  return AXIS.left + ((value - AXIS.min) / (AXIS.max - AXIS.min)) * AXIS.width + offset;
}
export function logFromX(x, offset = 0) {
  return AXIS.min + ((x - offset - AXIS.left) / AXIS.width) * (AXIS.max - AXIS.min);
}
export function tubePose(offset, cursor) {
  const turns = (offset - cursor) / HELIX.pixelsPerTurn;
  return { rotation: turns * 2 * Math.PI, translation: -turns * HELIX.pitch };
}
export function helicalPoint(part, coordinate, offset = 0, cursor = 0) {
  const tube = TUBES[part];
  const turns = (xFromLog(coordinate) + offset - cursor - tube.pointer) / HELIX.pixelsPerTurn;
  const theta = turns * 2 * Math.PI;
  return {
    x: tube.radius * Math.sin(theta),
    y: tube.readY - HELIX.pitch * turns,
    z: tube.radius * Math.cos(theta),
    theta,
  };
}
export function logAtIndex(part, offset, cursor) {
  return logFromX(TUBES[part].pointer + cursor, offset);
}
