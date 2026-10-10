import {
  angleFromCosineCoordinate,
  angleFromCotangentCoordinate,
  bygraveAzimuthFromOrdinary,
  cosineCoordinate,
  cotangentCoordinate,
  referenceSight,
} from "./math.js";
import { POINTER_L, POINTER_S, xFromLog, logFromX } from "./coordinates.js";
import { formatAngle } from "./angles.js";

const svg = document.querySelector("#instrument");
const ns = "http://www.w3.org/2000/svg";
const state = { inner: 0, middle: 0, cursor: 0 };
let tubeView;
let displayMode = "3d";
let procedurePhase = 0;
let procedureReadings = {};
const slider = {
  inner: document.querySelector("#innerSlider"),
  middle: document.querySelector("#middleSlider"),
  cursor: document.querySelector("#cursorSlider"),
};
const numberInput = {
  inner: document.querySelector("#innerNumber"),
  middle: document.querySelector("#middleNumber"),
  cursor: document.querySelector("#cursorNumber"),
};

function el(name, attrs = {}, text = "") {
  const node = document.createElementNS(ns, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
}
function drawScale(groupId, fn, label, y, offset, className) {
  const group = document.querySelector(groupId);
  group.replaceChildren();
  group.append(el("rect", { x: 108, y: y - 31, width: 824, height: 70, rx: 9, class: `scale-band ${className}`, "data-part": className === "middle-band" ? "middle" : "inner" }));
  group.append(el("line", { x1: 110, x2: 930, y1: y, y2: y, class: "track" }));
  if (fn === cosineCoordinate) {
    const zeroX = xFromLog(0, offset);
    if (zeroX >= 112 && zeroX <= 928) {
      group.append(el("line", { x1: zeroX, x2: zeroX, y1: y, y2: y + 19, class: "tick major" }));
      group.append(el("text", { x: zeroX, y: y + 34, class: "tick-label" }, "0°"));
    }
  }
  for (let angle = 1; angle <= 89; angle += 1) {
    const x = xFromLog(fn(angle), offset);
    if (x < 112 || x > 928) continue;
    const major = angle % 5 === 0;
    group.append(el("line", { x1: x, x2: x, y1: y, y2: y + (major ? 19 : 9), class: major ? "tick major" : "tick" }));
    if (major) group.append(el("text", { x, y: y + 34, class: "tick-label" }, `${angle}°`));
  }
}
function updateCursor() {
  const group = document.querySelector("#cursor");
  group.replaceChildren();
  const l = POINTER_L + state.cursor;
  const s = POINTER_S + state.cursor;
  for (const [x, mark] of [[l, "L"], [s, "S"]]) {
    group.append(el("line", { x1: x, x2: x, y1: 54, y2: 319, class: "cursor-line", "data-part": "cursor" }));
    group.append(el("path", { d: `M${x - 7} 53 L${x + 7} 53 L${x} 64 Z`, class: "cursor-cap", "data-part": "cursor" }));
    group.append(el("text", { x, y: 42, class: "cursor-label", "data-part": "cursor" }, mark));
  }
  group.append(el("line", { x1: l, x2: s, y1: 75, y2: 75, stroke: "#ce6742", "stroke-width": 2, "data-part": "cursor" }));
}
function readAngle(fn, inverse, pointer, offset) {
  try {
    const logValue = logFromX(pointer, offset);
    if (fn === cosineCoordinate && Math.abs(logValue) < 1e-9) return formatAngle(0);
    return formatAngle(inverse(logValue));
  } catch {
    return "outside visible branch";
  }
}
function angleAt(scale, pointer, offset) {
  const logValue = logFromX(pointer, offset);
  if (scale === "cosine" && Math.abs(logValue) < 1e-9) return 0;
  try {
    return scale === "cotangent"
      ? angleFromCotangentCoordinate(logValue)
      : angleFromCosineCoordinate(logValue);
  } catch {
    return undefined;
  }
}
function alignScaleAtPointer(scale, angle, pointer) {
  const coordinate = scale === "cotangent" ? cotangentCoordinate(angle) : cosineCoordinate(angle);
  return pointer - xFromLog(coordinate);
}
function renderTubeGuide() {
  const latitude = Number(document.querySelector("#lat").value);
  const hourAngle = Number(document.querySelector("#hour").value);
  const activeStep = procedurePhase === 2 ? 3 : procedurePhase === 3 ? 4
    : Number.isFinite(procedureReadings.y) ? 2 : 1;
  for (const row of document.querySelectorAll("[data-guide-step]")) {
    row.dataset.active = String(procedurePhase !== 0 && Number(row.dataset.guideStep) === activeStep);
  }
  const rule = latitude > 0 ? (hourAngle > 0 ? "180° + A" : "180° − A")
    : (hourAngle > 0 ? "360° − A" : "A");
  document.querySelector("#guideZnRule").textContent = latitude !== 0 && hourAngle !== 0
    && Number.isFinite(latitude) && Number.isFinite(hourAngle)
    ? `${latitude > 0 ? "North" : "South"} LAT · body ${hourAngle > 0 ? "west" : "east"}: Zn = ${rule} (supported branch).`
    : "LAT/body: N/W → 180° + A · N/E → 180° − A · S/W → 360° − A · S/E → A (supported branch).";
  const warning = document.querySelector("#branchWarning");
  document.querySelector("#guideWarning").hidden = warning.hidden;
  document.querySelector("#guideWarning").textContent = warning.textContent;
}
function invalidateAcceptedY() {
  if (procedurePhase !== 1 || procedureReadings.y === undefined) return;
  procedureReadings = {};
  for (const id of ["coLatReadout", "YReadout", "AReadout", "bygraveAzimuth", "hReadout"]) document.querySelector(`#${id}`).textContent = "—";
  document.querySelector("#acceptY").disabled = false;
  document.querySelector("#setupA").disabled = true;
  document.querySelector("#reductionStatus").textContent = "The alignment changed. Fine-tune S on the cosine scale to H, then use the new lowercase y to recalculate uppercase Y.";
}
function movePart(part, value) {
  const next = Math.max(-650, Math.min(650, value));
  if (Math.abs(next - state[part]) > 1e-10) invalidateAcceptedY();
  state[part] = next;
  render();
}
function currentTarget() {
  if (procedurePhase === 1) return { angle: Math.abs(Number(document.querySelector("#hour").value)), name: "Step 1 target: H" };
  if (procedurePhase === 2) return { angle: procedureReadings.Y, name: "Step 3 target: uppercase Y" };
  if (procedurePhase === 3) return { angle: 0, name: "Step 4 target: zero on the cosine scale" };
  return undefined;
}
function setCursorAngle(angle) {
  const message = document.querySelector("#angleMessage");
  if (!Number.isFinite(angle) || angle < 0 || angle >= 90) {
    message.textContent = "Enter a cosine-scale angle from 0° up to, but below, 90°.";
    return false;
  }
  const coordinate = angle === 0 ? 0 : cosineCoordinate(angle);
  const position = xFromLog(coordinate, state.middle) - POINTER_S;
  if (position < -650 || position > 650) {
    message.textContent = "That angle is beyond the cursor's travel at this middle-scale offset. Move the middle scale to bring it into range.";
    return false;
  }
  message.textContent = "";
  movePart("cursor", position);
  return true;
}
function renderReadings() {
  const l = POINTER_L + state.cursor;
  const s = POINTER_S + state.cursor;
  document.querySelector("#readCotL").textContent = readAngle(cotangentCoordinate, angleFromCotangentCoordinate, l, state.inner);
  document.querySelector("#readCosS").textContent = readAngle(cosineCoordinate, angleFromCosineCoordinate, s, state.middle);
  document.querySelector("#innerAngleValue").textContent = document.querySelector("#readCotL").textContent;
  document.querySelector("#middleAngleValue").textContent = document.querySelector("#readCosS").textContent;
  const cosineAngle = angleAt("cosine", s, state.middle);
  const angleInput = document.querySelector("#cursorAngle");
  if (document.activeElement !== angleInput) angleInput.value = cosineAngle === undefined ? "" : cosineAngle.toFixed(3);
  const target = currentTarget();
  document.querySelector("#angleTarget").textContent = target ? `${target.name} = ${formatAngle(target.angle)}. Align S, then read the result at L on the cotangent scale.` : "Set up step 1 to see its target.";
  document.querySelector("#alignTarget").disabled = !target;
  const purposes = {
    0: ["Set up step 1 to read lowercase y here.", "Set up step 1, then move this reading to H (your hour angle)."],
    1: ["When S matches H on the cosine scale, this cotangent reading is lowercase y, your first intermediate angle.", `Target: H = ${formatAngle(Math.abs(Number(document.querySelector("#hour").value)))}. Move the cursor until this cosine reading matches H.`],
    2: ["When S matches uppercase Y on the cosine scale, this cotangent reading is A, the Bygrave azimuth angle.", `Target: uppercase Y = ${formatAngle(procedureReadings.Y)}. Move the cursor until this cosine reading matches Y.`],
    3: ["When S reaches zero on the cosine scale, this cotangent reading is h, the calculated altitude.", "Target: 0°. Enter 0 in the S angle field or use the target-alignment button to finish."],
  };
  const [cotMeaning, cosMeaning] = purposes[procedurePhase];
  document.querySelector("#readCotMeaning").textContent = cotMeaning;
  document.querySelector("#readCosMeaning").textContent = cosMeaning;
  if (procedurePhase === 1) {
    const y = angleAt("cotangent", l, state.inner);
    document.querySelector("#yReadout").textContent = formatAngle(y);
  } else if (procedurePhase === 2) {
    const azimuthStep = angleAt("cotangent", l, state.inner);
    document.querySelector("#AReadout").textContent = formatAngle(azimuthStep);
  } else if (procedurePhase === 3) {
    const altitude = angleAt("cotangent", l, state.inner);
    document.querySelector("#hReadout").textContent = cosineAngle !== 0 ? "—" : formatAngle(altitude);
    if (altitude !== undefined && cosineAngle === 0) {
      const [lat, dec, hour] = ["lat", "dec", "hour"].map((id) => Number(document.querySelector(`#${id}`).value));
      const referenceAltitude = referenceSight(lat, dec, hour).altitude;
      const residual = (altitude - referenceAltitude) * 60;
      document.querySelector("#altResidual").textContent = `Independent altitude check residual: ${(Math.round(residual * 10) / 10).toFixed(1)}′`;
    } else {
      document.querySelector("#altResidual").textContent = "Move S to the zero stop to show the check residual.";
    }
  }
  renderTubeGuide();
}
function updateReference() {
  if (["lat", "dec", "hour"].some(id => document.getElementById(id).value === "")) {
    document.querySelector("#altitude").textContent = "—";
    document.querySelector("#azimuth").textContent = "—";
    return;
  }
  const input = ["lat", "dec", "hour"].map((id) => Number(document.querySelector(`#${id}`).value));
  try {
    const result = referenceSight(...input);
    document.querySelector("#altitude").textContent = formatAngle(result.altitude);
    document.querySelector("#azimuth").textContent = formatAngle(result.azimuth, { bearing: true });
  } catch {
    document.querySelector("#altitude").textContent = "check inputs";
    document.querySelector("#azimuth").textContent = "check inputs";
  }
}
function beginManualReduction() {
  const input = ["lat", "dec", "hour"].map((id) => Number(document.querySelector(`#${id}`).value));
  const [latitude, declination, hourAngle] = input;
  const hour = Math.abs(hourAngle);
  document.querySelector("#branchWarning").hidden = true;
  if (hour < 90 && 90 - hour <= 1 / 3) {
    document.querySelector("#branchWarning").hidden = false;
    document.querySelector("#branchWarning").textContent = "LHA is within 20′ of 90°. The handoff flags a possible ~30′ assumed-position longitude adjustment here; this prototype does not apply that correction, so it stopped this reduction.";
    return;
  }
  if (![latitude, declination, hourAngle].every(Number.isFinite)
      || Math.abs(latitude) >= 90 || Math.abs(declination) <= 0 || Math.abs(declination) >= 90
      || Math.abs(latitude) <= 0 || hour <= 0 || hour >= 90) {
    document.querySelector("#reductionStatus").textContent = "This guided sequence currently needs nonzero LAT and DEC and an hour angle strictly between 0° and 90°. Other branches need additional Bygrave sign rules.";
    return;
  }
  procedurePhase = 1;
  procedureReadings = {};
  document.querySelector("#altResidual").textContent = "—";
  state.inner = alignScaleAtPointer("cotangent", Math.abs(declination), POINTER_L);
  // The cosine scale's zero is its log-coordinate origin.
  state.middle = POINTER_S - xFromLog(0);
  state.cursor = 0;
  document.querySelector("#tubeDragPart").value = "cursor";
  document.querySelector("#targetH").textContent = `${formatAngle(hour)} ${hourAngle >= 0 ? "W" : "E"}`;
  for (const id of ["yReadout", "coLatReadout", "YReadout", "AReadout", "bygraveAzimuth", "hReadout"]) document.querySelector(`#${id}`).textContent = "—";
  document.querySelector("#acceptY").disabled = false;
  document.querySelector("#setupA").disabled = true;
  document.querySelector("#acceptA").disabled = true;
  render();
  document.querySelector("#reductionStatus").textContent = `Step 1: DEC is at L on the inner cotangent scale. S starts at 0° on the middle cosine scale. Move the cursor until the cosine reading at S matches H = ${formatAngle(hour)}. Then read lowercase y at L on the cotangent scale.`;
}
function acceptY() {
  if (procedurePhase !== 1) return;
  const hourAngle = Math.abs(Number(document.querySelector("#hour").value));
  const actualHour = angleAt("cosine", POINTER_S + state.cursor, state.middle);
  if (actualHour === undefined || Math.abs(actualHour - hourAngle) > 0.02) {
    document.querySelector("#reductionStatus").textContent = "Step 1: move the cursor until S on the middle cosine scale matches H (within 1.2′). Then use lowercase y from L on the inner cotangent scale.";
    return;
  }
  const y = angleAt("cotangent", POINTER_L + state.cursor, state.inner);
  if (y === undefined) {
    document.querySelector("#reductionStatus").textContent = "The L pointer is outside the supported cotangent graduations.";
    return;
  }
  const latitude = Number(document.querySelector("#lat").value);
  const declination = Number(document.querySelector("#dec").value);
  const coLatitude = 90 - Math.abs(latitude);
  const sameName = latitude * declination > 0;
  const Y = sameName ? coLatitude + y : coLatitude - y;
  document.querySelector("#yReadout").textContent = formatAngle(y);
  document.querySelector("#coLatReadout").textContent = formatAngle(coLatitude);
  procedureReadings = { y, coLatitude, Y };
  if (!(Y > 0 && Y < 90)) {
    document.querySelector("#YReadout").textContent = formatAngle(Y);
    document.querySelector("#reductionStatus").textContent = `This sight gives Y = ${formatAngle(Y)}, outside this prototype's supported 0°–90° scale branch. The later readings need supplementary-angle rules.`;
    return;
  }
  document.querySelector("#YReadout").textContent = formatAngle(Y);
  document.querySelector("#acceptY").disabled = true;
  document.querySelector("#setupA").disabled = false;
  document.querySelector("#reductionStatus").textContent = `Step 2: lowercase y = ${formatAngle(y)} was read at L on the cotangent scale. Co-latitude is ${formatAngle(coLatitude)}; LAT and DEC are ${sameName ? "both N or both S, so add y" : "one N and one S, so subtract y"}. Uppercase Y = ${formatAngle(Y)}. Y is calculated by arithmetic; this step needs no new scale reading.`;
  renderReadings();
  tubeView?.update(state);
}
function setupAzimuthStep() {
  if (procedurePhase !== 1 || !(procedureReadings.Y > 0 && procedureReadings.Y < 90)) return;
  const hour = Math.abs(Number(document.querySelector("#hour").value));
  const y = procedureReadings.y;
  state.inner = alignScaleAtPointer("cotangent", hour, POINTER_L);
  state.middle = alignScaleAtPointer("cosine", y, POINTER_S);
  state.cursor = 0;
  procedurePhase = 2;
  document.querySelector("#tubeDragPart").value = "cursor";
  document.querySelector("#setupA").disabled = true;
  document.querySelector("#acceptA").disabled = false;
  document.querySelector("#reductionStatus").textContent = `Step 3: H is set at L on the cotangent scale; lowercase y is set at S on the cosine scale. Move the cursor until S on the cosine scale reads uppercase Y = ${document.querySelector("#YReadout").textContent}. Read A at L on the cotangent scale.`;
  render();
}
function acceptA() {
  if (procedurePhase !== 2) return;
  const targetY = procedureReadings.Y;
  const actualY = angleAt("cosine", POINTER_S + state.cursor, state.middle);
  if (actualY === undefined || Math.abs(actualY - targetY) > 0.02) {
    document.querySelector("#reductionStatus").textContent = "Step 3: move the cursor until S on the middle cosine scale matches uppercase Y (within 1.2′). Then use A from L on the inner cotangent scale.";
    return;
  }
  const A = angleAt("cotangent", POINTER_L + state.cursor, state.inner);
  if (A === undefined) {
    document.querySelector("#reductionStatus").textContent = "The L pointer is outside the supported cotangent graduations.";
    return;
  }
  procedureReadings.A = A;
  document.querySelector("#AReadout").textContent = formatAngle(A);
  const latitude = Number(document.querySelector("#lat").value);
  const hourAngle = Number(document.querySelector("#hour").value);
  const trueAzimuth = bygraveAzimuthFromOrdinary(latitude, A, hourAngle);
  document.querySelector("#bygraveAzimuth").textContent = formatAngle(trueAzimuth, { bearing: true });
  if (A >= 85 && A <= 90) {
    document.querySelector("#branchWarning").hidden = false;
    document.querySelector("#branchWarning").textContent = "Bygrave A is in the 85°–95° zone. The handoff flags cases that may need repeating with latitude and declination exchanged; this prototype shows the ordinary branch only.";
  }
  document.querySelector("#acceptA").disabled = true;
  document.querySelector("#setupA").disabled = true;
  document.querySelector("#reductionStatus").textContent = `Read Bygrave A = ${formatAngle(A)} at L. The ordinary-branch conversion gives true azimuth ${formatAngle(trueAzimuth, { bearing: true })} clockwise from north. Now set Y at L and A at S.`;
  setupAltitudeStep();
}
function setupAltitudeStep() {
  if (procedurePhase !== 2 || !Number.isFinite(procedureReadings.A)) return;
  const Y = procedureReadings.Y;
  const A = procedureReadings.A;
  const cosA = xFromLog(cosineCoordinate(A));
  const zero = xFromLog(0);
  const start = cosA - zero;
  state.inner = POINTER_L + start - xFromLog(cotangentCoordinate(Y));
  state.middle = POINTER_S - zero;
  state.cursor = start;
  procedurePhase = 3;
  document.querySelector("#tubeDragPart").value = "cursor";
  document.querySelector("#reductionStatus").textContent = "Step 4: uppercase Y is at L on the cotangent scale; A is at S on the cosine scale. Set cursor position to 0 so S reads zero on the cosine scale. Read h, the final calculated altitude, at L on the cotangent scale.";
  render();
}
function resetProcedureForInputChange() {
  procedurePhase = 0;
  procedureReadings = {};
  document.querySelector("#branchWarning").hidden = true;
  for (const id of ["yReadout", "coLatReadout", "YReadout", "AReadout", "bygraveAzimuth", "hReadout"]) document.querySelector(`#${id}`).textContent = "—";
  document.querySelector("#altResidual").textContent = "—";
  document.querySelector("#acceptY").disabled = true;
  document.querySelector("#setupA").disabled = true;
  document.querySelector("#acceptA").disabled = true;
  document.querySelector("#acceptA").textContent = "Use A to set up the altitude calculation";
  document.querySelector("#reductionStatus").textContent = "Inputs changed. Set up step 1 to begin a fresh reduction.";
  document.querySelector("#angleMessage").textContent = "";
  renderReadings();
}
function render() {
  drawScale("#innerTicks", cotangentCoordinate, "cotangent", 105, state.inner, "inner-band");
  drawScale("#middleTicks", cosineCoordinate, "cosine", 256, state.middle, "middle-band");
  updateCursor();
  for (const part of ["inner", "middle", "cursor"]) {
    slider[part].value = String(state[part]);
    // Keep a partially typed number intact while the SVG/readings repaint.
    if (document.activeElement !== numberInput[part]) {
      numberInput[part].value = Number(state[part]).toFixed(4);
    }
    document.querySelector(`#${part}Value`).textContent = `${Number(state[part]).toFixed(4)} px`;
  }
  renderReadings();
  tubeView?.update(state);
}
for (const part of ["inner", "middle", "cursor"]) {
  slider[part].addEventListener("input", () => { movePart(part, Number(slider[part].value)); });
  numberInput[part].addEventListener("input", () => {
    const value = Number(numberInput[part].value);
    if (numberInput[part].value !== "" && Number.isFinite(value)) movePart(part, value);
  });
  numberInput[part].addEventListener("change", render);
}
for (const group of document.querySelectorAll("[data-part-control]")) {
  const part = group.dataset.partControl;
  for (const amount of [-1, -0.1, -0.01, 0.01, 0.1, 1]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.nudge = String(amount);
    button.dataset.nudgePart = part;
    button.textContent = `${amount < 0 ? "−" : "+"}${Math.abs(amount)}`;
    button.addEventListener("click", () => {
      movePart(part, Number((state[part] + amount).toFixed(4)));
      numberInput[part].value = state[part].toFixed(4);
    });
    group.append(button);
  }
  const unit = document.createElement("span");
  unit.textContent = "px";
  group.append(unit);
}
document.querySelector("#cursorAngle").addEventListener("input", (event) => {
  if (event.target.value !== "") setCursorAngle(Number(event.target.value));
});
document.querySelector("#cursorAngle").addEventListener("blur", renderReadings);
document.querySelector("#alignTarget").addEventListener("click", () => {
  const target = currentTarget();
  if (target && setCursorAngle(target.angle)) document.querySelector("#cursorAngle").value = target.angle.toFixed(3);
});
for (const button of document.querySelectorAll("[data-angle-nudge]")) {
  button.addEventListener("click", () => {
    const actual = angleAt("cosine", POINTER_S + state.cursor, state.middle);
    if (actual === undefined) {
      document.querySelector("#angleMessage").textContent = "The current S reading is outside the cosine branch. Enter an angle or align to this step's target first.";
      return;
    }
    const next = Number((actual + Number(button.dataset.angleNudge)).toFixed(6));
    if (setCursorAngle(next)) document.querySelector("#cursorAngle").value = next.toFixed(3);
  });
}
document.querySelector("#reset").addEventListener("click", () => { state.inner = 0; state.middle = 0; state.cursor = 0; resetProcedureForInputChange(); render(); });
document.querySelector("#runReduction").addEventListener("click", beginManualReduction);
document.querySelector("#acceptY").addEventListener("click", acceptY);
document.querySelector("#setupA").addEventListener("click", setupAzimuthStep);
document.querySelector("#acceptA").addEventListener("click", acceptA);
// Keep the compact flow and accepted Zn synchronized with the detailed steps.
new MutationObserver(renderTubeGuide).observe(document.querySelector(".reduction"), {
  subtree: true, childList: true, characterData: true, attributes: true,
  attributeFilter: ["hidden"],
});
for (const id of ["lat", "dec", "hour"]) {
  document.querySelector(`#${id}`).addEventListener("input", updateReference);
  document.querySelector(`#${id}`).addEventListener("input", resetProcedureForInputChange);
}

let drag = null;
svg.addEventListener("pointerdown", (event) => {
  const part = event.target.closest("[data-part]")?.getAttribute("data-part");
  if (!part) return;
  drag = { part, startX: event.clientX, startValue: state[part], precision: event.shiftKey ? 0.1 : 1 };
  svg.setPointerCapture(event.pointerId);
});
svg.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const rect = svg.getBoundingClientRect();
  const pxPerClient = 1000 / rect.width;
  movePart(drag.part, drag.startValue + (event.clientX - drag.startX) * pxPerClient * drag.precision);
});
svg.addEventListener("pointerup", () => { drag = null; });

render();
updateReference();

function setDisplayMode(mode) {
  displayMode = mode;
  document.querySelector("#tubeViewport").hidden = mode !== "3d";
  document.querySelector("#tubeTools").hidden = mode !== "3d";
  svg.toggleAttribute("hidden", mode !== "flat");
  for (const [id, value] of [["view3d", "3d"], ["viewFlat", "flat"]]) {
    document.querySelector(`#${id}`).setAttribute("aria-pressed", String(mode === value));
  }
  tubeView?.setVisible(mode === "3d");
}
document.querySelector("#view3d").addEventListener("click", () => setDisplayMode("3d"));
document.querySelector("#viewFlat").addEventListener("click", () => setDisplayMode("flat"));
import("./view3d.js").then(({ createTubeView }) => {
  tubeView = createTubeView(document.querySelector("#tubeViewport"), { onMove: movePart, getState: () => ({ ...state }) });
  tubeView.update(state);
  tubeView.setVisible(displayMode === "3d");
  document.body.dataset.threeReady = "true";
}).catch(error => {
  setDisplayMode("flat");
  document.querySelector("#view3d").disabled = true;
  document.querySelector("#displayNote").textContent = "3D could not start in this browser. The flat display and all reduction controls remain available.";
  document.body.dataset.threeReady = "false";
  console.warn("3D display unavailable:", error.message);
});
