import * as THREE from "../vendor/three/three.module.js";
import { angleFromCosineCoordinate, angleFromCotangentCoordinate, cosineCoordinate, cotangentCoordinate } from "./math.js";
import { HELIX, TUBES, helicalPoint, logAtIndex, tubePose } from "./coordinates.js";
import { formatAngle } from "./angles.js";

const TAU = 2 * Math.PI;
const OUTER_R = 63.953 / 2;
const OUTER_HALF = 196.85 / 2;

function scaleTexture(part, anisotropy) {
  const tube = TUBES[part];
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 3072;
  const ctx = canvas.getContext("2d");
  const ink = part === "inner" ? "#245c50" : "#394b79";
  const background = part === "inner" ? "#f5edcf" : "#e9eef9";
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const top = tube.center + tube.length / 2;
  const py = y => (top - y) / tube.length * canvas.height;
  const px = theta => (((theta / TAU) % 1 + 1) % 1) * canvas.width;
  const transform = part === "inner" ? cotangentCoordinate : cosineCoordinate;

  // A continuous, independently generated mathematical helix.
  ctx.strokeStyle = part === "inner" ? "#9cae86" : "#a5afc9";
  ctx.lineWidth = 2;
  ctx.beginPath();
  let previousX;
  for (let coordinate = -5; coordinate <= 5; coordinate += 0.002) {
    const point = helicalPoint(part, coordinate);
    const x = px(point.theta), y = py(point.y);
    if (previousX === undefined || Math.abs(x - previousX) > canvas.width / 2) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    previousX = x;
  }
  ctx.stroke();
  const tick = (angle, major, label) => {
    const point = helicalPoint(part, transform(angle));
    const x = px(point.theta), y = py(point.y);
    if (y < 0 || y > canvas.height) return;
    const length = major ? 2.1 : 0.75;
    const dy = length / tube.length * canvas.height;
    ctx.strokeStyle = ink;
    ctx.lineWidth = major ? 3 : 1.5;
    for (const wrappedX of [x - canvas.width, x, x + canvas.width]) {
      ctx.beginPath(); ctx.moveTo(wrappedX, y - dy / 2); ctx.lineTo(wrappedX, y + dy / 2); ctx.stroke();
      if (label) {
        ctx.fillStyle = ink;
        ctx.font = "600 23px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, wrappedX, y + dy / 2 + 27);
      }
    }
  };
  // Dense minor marks; labels are limited to major angles to stay readable.
  for (let tenths = 10; tenths <= 890; tenths++) {
    const angle = tenths / 10;
    const major = tenths % 50 === 0;
    tick(angle, major, major ? `${angle}°` : "");
  }
  for (const angle of [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 89.1, 89.5, 89.9, 89.95, 89.99]) tick(angle, true, formatAngle(angle));
  if (part === "middle") {
    const point = helicalPoint(part, 0);
    const x = px(point.theta), y = py(point.y);
    ctx.strokeStyle = ink; ctx.lineWidth = 4;
    for (const wrappedX of [x - canvas.width, x, x + canvas.width]) {
      ctx.beginPath(); ctx.moveTo(wrappedX, y - 14); ctx.lineTo(wrappedX, y + 14); ctx.stroke();
      ctx.font = "700 27px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = ink;
      ctx.fillText("0°", wrappedX, y + 42);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(8, anisotropy);
  return texture;
}

export function createTubeView(container, { onMove, getState }) {
  const canvas = container.querySelector("canvas");
  // Present the real WebGL frame through Canvas2D. This also keeps the frame
  // visible in native WebKit panel snapshots, which can omit GPU-backed layers.
  const gpuCanvas = document.createElement("canvas");
  const presentation = canvas.getContext("2d", { alpha: false });
  const renderer = new THREE.WebGLRenderer({ canvas: gpuCanvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xf1f5f5);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-200, 200, 90, -90, 0.1, 1200);
  camera.position.set(45, 105, 360);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x73808b, 2.6));
  const key = new THREE.DirectionalLight(0xffffff, 3.1);
  key.position.set(-100, 230, 220); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -260, right: 260, top: 160, bottom: -160, far: 700 });
  key.shadow.bias = -0.001;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb6dbe0, 1.2); fill.position.set(100, -80, -150); scene.add(fill);
  const rig = new THREE.Group();
  rig.rotation.z = -Math.PI / 2 + 0.04;
  scene.add(rig);
  const metal = new THREE.MeshStandardMaterial({ color: 0x314650, metalness: 0.35, roughness: 0.55, side: THREE.DoubleSide });
  const trim = new THREE.MeshStandardMaterial({ color: 0x72868a, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide });
  const indexMaterial = new THREE.MeshStandardMaterial({ color: 0xde6c40, roughness: 0.48, emissive: 0x4a1505, emissiveIntensity: 0.15 });
  const groups = {};
  const addMesh = (group, geometry, material, y = 0) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.y = y;
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  };
  const ring = (group, radius, y, material) => {
    const mesh = addMesh(group, new THREE.TorusGeometry(radius, 0.75, 8, 96), material, y);
    mesh.rotation.x = Math.PI / 2;
  };
  for (const part of ["inner", "middle"]) {
    const tube = TUBES[part];
    const group = new THREE.Group(); group.name = part; rig.add(group); groups[part] = group;
    const material = new THREE.MeshStandardMaterial({ map: scaleTexture(part, renderer.capabilities.getMaxAnisotropy()), roughness: 0.78, side: THREE.DoubleSide });
    addMesh(group, new THREE.CylinderGeometry(tube.radius, tube.radius, tube.length, 160, 1, true), material, tube.center);
    ring(group, tube.radius - 0.25, tube.center + tube.length / 2, trim);
    ring(group, tube.radius - 0.25, tube.center - tube.length / 2, trim);
    const gripY = part === "inner" ? tube.center + tube.length / 2 - 5 : tube.center - tube.length / 2 + 6;
    addMesh(group, new THREE.CylinderGeometry(tube.radius + 0.35, tube.radius + 0.35, 7, 96, 1, true), trim, gripY);
    for (let n = 0; n < 48; n++) {
      const theta = n / 48 * TAU;
      const rib = addMesh(group, new THREE.BoxGeometry(0.7, 6, 0.7), metal, gripY);
      rib.position.x = (tube.radius + 0.5) * Math.sin(theta); rib.position.z = (tube.radius + 0.5) * Math.cos(theta); rib.rotation.y = theta;
    }
  }

  // The outer cursor is fixed in the camera frame. Windows are enlarged for learning.
  const outer = new THREE.Group(); outer.name = "outer-fixed"; rig.add(outer);
  const shellBand = (low, high, gap = 0) => {
    addMesh(outer, new THREE.CylinderGeometry(OUTER_R, OUTER_R, high - low, 128, 1, true, gap, TAU - 2 * gap), metal, (low + high) / 2);
    if (gap) {
      for (const theta of [gap, TAU - gap]) {
        const edge = addMesh(outer, new THREE.BoxGeometry(1.25, high - low, 2), trim, (low + high) / 2);
        edge.position.x = OUTER_R * Math.sin(theta); edge.position.z = OUTER_R * Math.cos(theta); edge.rotation.y = theta;
      }
    }
  };
  shellBand(-OUTER_HALF, -55);
  shellBand(-55, 5, 1.05);
  shellBand(5, 45);
  shellBand(45, 85, 0.92);
  shellBand(85, OUTER_HALF);
  ring(outer, OUTER_R, OUTER_HALF, trim); ring(outer, OUTER_R, -OUTER_HALF, trim);
  for (const part of ["inner", "middle"]) {
    const tube = TUBES[part];
    const stem = addMesh(outer, new THREE.BoxGeometry(1.15, 1.6, OUTER_R - tube.radius + 3), indexMaterial, tube.readY + 5.5);
    stem.position.z = (OUTER_R + tube.radius) / 2 + 1.4;
    const pointer = addMesh(outer, new THREE.ConeGeometry(1.9, 5, 3), indexMaterial, tube.readY + 2.5);
    pointer.rotation.z = Math.PI; pointer.position.z = tube.radius + 0.65;
    const hairline = addMesh(outer, new THREE.BoxGeometry(0.35, 7, 0.35), indexMaterial, tube.readY - 1);
    hairline.position.z = tube.radius + 0.4;
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(850, 450), new THREE.ShadowMaterial({ opacity: 0.12 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -42; ground.receiveShadow = true; scene.add(ground);

  let latestState = { inner: 0, middle: 0, cursor: 0 }, visible = true, dragging;
  const labels = { inner: container.querySelector('[data-index="inner"]'), middle: container.querySelector('[data-index="middle"]') };
  const status = container.querySelector(".tube-status");
  const positionLabel = part => {
    const tube = TUBES[part];
    const point = new THREE.Vector3(0, tube.readY, tube.radius + 2);
    rig.localToWorld(point); point.project(camera);
    const x = (point.x + 1) / 2 * canvas.clientWidth;
    const y = (1 - point.y) / 2 * canvas.clientHeight;
    labels[part].style.left = `${x}px`; labels[part].style.top = `${y}px`;
  };
  function render() {
    if (!visible || !container.clientWidth) return;
    renderer.render(scene, camera);
    presentation.drawImage(gpuCanvas, 0, 0, canvas.width, canvas.height);
    for (const part of ["inner", "middle"]) positionLabel(part);
  }
  function resize() {
    const width = container.clientWidth, height = canvas.clientHeight || 520;
    if (!width) return;
    renderer.setSize(width, height, false);
    canvas.width = gpuCanvas.width; canvas.height = gpuCanvas.height;
    const halfHeight = width < 650 ? 150 : 90;
    const halfWidth = halfHeight * width / height;
    camera.left = -halfWidth; camera.right = halfWidth; camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix(); render();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container);
  function update(state) {
    latestState = { ...state };
    let limited = false;
    for (const part of ["inner", "middle"]) {
      const pose = tubePose(state[part], state.cursor);
      groups[part].rotation.y = pose.rotation % TAU;
      groups[part].position.y = pose.translation;
      const coordinate = logAtIndex(part, state[part], state.cursor);
      let reading;
      try { reading = part === "inner" ? angleFromCotangentCoordinate(coordinate) : Math.abs(coordinate) < 1e-9 ? 0 : angleFromCosineCoordinate(coordinate); } catch { reading = undefined; }
      labels[part].querySelector("strong").textContent = reading === undefined ? "outside branch" : formatAngle(reading);
      const localY = TUBES[part].readY - pose.translation;
      limited ||= localY < TUBES[part].center - TUBES[part].length / 2 || localY > TUBES[part].center + TUBES[part].length / 2;
    }
    status.textContent = limited ? "This setting extends beyond the illustrative tube lengths. The flat scale view remains available." : "Outer cursor fixed in view · inner and middle move relative to L/S";
    // Expose only the displayed pose for browser interaction checks.
    canvas.dataset.innerRotation = String(groups.inner.rotation.y);
    canvas.dataset.middleRotation = String(groups.middle.rotation.y);
    canvas.dataset.innerTranslation = String(groups.inner.position.y);
    canvas.dataset.middleTranslation = String(groups.middle.position.y);
    canvas.dataset.cursorOffset = String(state.cursor);
    canvas.dataset.outerRotation = "0";
    render();
  }
  canvas.addEventListener("pointerdown", event => {
    const part = document.querySelector("#tubeDragPart").value;
    dragging = { part, x: event.clientX, value: getState()[part], fine: event.shiftKey ? 0.1 : 1 };
    canvas.setPointerCapture(event.pointerId); canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", event => {
    if (!dragging) return;
    onMove(dragging.part, dragging.value + (event.clientX - dragging.x) * 0.15 * dragging.fine);
  });
  const endDrag = () => { dragging = undefined; canvas.style.cursor = "grab"; };
  canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
  for (const button of document.querySelectorAll("[data-camera]")) button.addEventListener("click", () => {
    if (button.dataset.camera === "front") camera.position.set(0, 15, 390);
    else camera.position.set(45, 105, 360);
    camera.lookAt(0, 0, 0); render();
  });
  for (const button of document.querySelectorAll("[data-zoom]")) button.addEventListener("click", () => {
    camera.zoom = Math.max(0.65, Math.min(2.5, camera.zoom + Number(button.dataset.zoom)));
    camera.updateProjectionMatrix(); render();
  });
  resize(); update(latestState);
  return { update, setVisible(value) { visible = value; if (value) { resize(); update(latestState); } } };
}
