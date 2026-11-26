// Scene rendering: sky, terrain, runway, rings, landmarks and the aircraft.
import { COLORS, clamp } from './config.js';
import { fieldColorAt, groundHeightAt } from './world.js';

export function createCamera(plane, viewMode) {
  const forwardX = Math.sin(plane.heading);
  const forwardZ = Math.cos(plane.heading);
  if (viewMode === 'cockpit') {
    return { x: plane.x, y: plane.y + 2.2, z: plane.z, forwardX, forwardZ, rightX: forwardZ, rightZ: -forwardX };
  }
  return {
    x: plane.x - forwardX * 40,
    y: plane.y + 11,
    z: plane.z - forwardZ * 40,
    forwardX,
    forwardZ,
    rightX: forwardZ,
    rightZ: -forwardX,
  };
}

export function projectPoint(camera, plane, width, height, px, py, pz) {
  const dx = px - camera.x;
  const dy = py - camera.y;
  const dz = pz - camera.z;
  const camX = dx * camera.rightX + dz * camera.rightZ;
  const camZ = dx * camera.forwardX + dz * camera.forwardZ;
  if (camZ < 4) return null;
  const focal = width * 0.92;
  const horizonY = height * 0.52 + plane.pitch * height * 0.55;
  let sx = width / 2 + (camX / camZ) * focal;
  let sy = horizonY - (dy / camZ) * focal;
  const rollTilt = -plane.roll * 0.55;
  const cx = width / 2;
  const cy = height / 2;
  const rx = sx - cx;
  const ry = sy - cy;
  sx = cx + rx * Math.cos(rollTilt) - ry * Math.sin(rollTilt);
  sy = cy + rx * Math.sin(rollTilt) + ry * Math.cos(rollTilt);
  return { x: sx, y: sy, depth: camZ, scale: focal / camZ };
}

export function drawSky(ctx, width, height, plane) {
  const horizonY = height * 0.52 + plane.pitch * height * 0.55;
  const gradient = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizonY + 40));
  gradient.addColorStop(0, COLORS.skyTop);
  gradient.addColorStop(0.55, COLORS.skyMid);
  gradient.addColorStop(1, COLORS.skyLow);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(255,244,190,0.95)';
  ctx.beginPath();
  ctx.arc(width * 0.82, height * 0.16, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  drawCloud(ctx, width * 0.18, height * 0.15, 1);
  drawCloud(ctx, width * 0.62, height * 0.1, 0.7);
  drawCloud(ctx, width * 0.38, height * 0.24, 0.55);
  ctx.fillStyle = '#6d8f6a';
  ctx.beginPath();
  ctx.moveTo(0, horizonY + 6);
  for (let i = 0; i <= 10; i++) {
    const x = (width / 10) * i;
    const lift = Math.sin(i * 1.7 + plane.heading * 2) * 14 + 22;
    ctx.lineTo(x, horizonY - lift);
  }
  ctx.lineTo(width, horizonY + 6);
  ctx.closePath();
  ctx.fill();
}

export function drawCloud(ctx, x, y, scale) {
  ctx.beginPath();
  ctx.ellipse(x, y, 58 * scale, 17 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 34 * scale, y + 4 * scale, 42 * scale, 13 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 36 * scale, y + 5 * scale, 38 * scale, 12 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawGround(ctx, camera, plane, width, height) {
  const horizonY = height * 0.52 + plane.pitch * height * 0.55;
  ctx.fillStyle = COLORS.fieldA;
  ctx.fillRect(0, horizonY, width, height - horizonY);
  const cells = [];
  const cell = 260;
  const minX = Math.floor((plane.x - 2600) / cell) * cell;
  const maxX = plane.x + 2600;
  const minZ = Math.floor((plane.z - 700) / cell) * cell;
  const maxZ = plane.z + 4200;
  for (let x = minX; x < maxX; x += cell) {
    for (let z = minZ; z < maxZ; z += cell) {
      const center = projectPoint(camera, plane, width, height, x + cell / 2, groundHeightAt(x + cell / 2, z + cell / 2), z + cell / 2);
      if (center) cells.push({ x, z, depth: center.depth });
    }
  }
  cells.sort((a, b) => b.depth - a.depth);
  for (const item of cells) {
    const corners = [
      [item.x, item.z],
      [item.x + cell, item.z],
      [item.x + cell, item.z + cell],
      [item.x, item.z + cell],
    ].map(([x, z]) => projectPoint(camera, plane, width, height, x, groundHeightAt(x, z), z));
    if (corners.some((point) => !point)) continue;
    const kind = fieldColorAt(item.x + cell / 2, item.z + cell / 2);
    ctx.fillStyle = COLORS[kind] || COLORS.fieldA;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(46,74,42,0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function drawRunway(ctx, camera, plane, width, height) {
  const halfW = 23;
  const halfL = 450;
  const corners = [
    [-halfW, -halfL],
    [halfW, -halfL],
    [halfW, halfL],
    [-halfW, halfL],
  ].map(([x, z]) => projectPoint(camera, plane, width, height, x, 0.4, z));
  if (corners.some((point) => !point)) return;
  ctx.fillStyle = COLORS.runway;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLORS.runwayEdge;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let z = -420; z <= 420; z += 70) {
    const a = projectPoint(camera, plane, width, height, 0, 0.6, z);
    const b = projectPoint(camera, plane, width, height, 0, 0.6, z + 34);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const label = projectPoint(camera, plane, width, height, 0, 1, -390);
  if (label) ctx.fillText('AMBER COAST 36', label.x, label.y);
}

export function drawRings(ctx, camera, plane, world, width, height, time) {
  const sorted = [...world.rings].sort((a, b) => {
    const da = Math.hypot(a.x - plane.x, a.z - plane.z);
    const db = Math.hypot(b.x - plane.x, b.z - plane.z);
    return db - da;
  });
  const next = world.rings.find((ring) => !ring.passed);
  for (const ring of sorted) {
    if (ring.passed) continue;
    const center = projectPoint(camera, plane, width, height, ring.x, ring.y, ring.z);
    if (!center) continue;
    const radius = ring.radius * center.scale;
    if (radius < 3 || radius > width * 1.4) continue;
    const isNext = next && ring.id === next.id;
    const pulse = isNext ? 1 + Math.sin(time * 4) * 0.05 : 1;
    ctx.strokeStyle = isNext ? COLORS.ringNext : COLORS.ring;
    ctx.lineWidth = clamp(radius * 0.14, 3, 14);
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = clamp(radius * 0.05, 1.5, 5);
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius * pulse * 0.86, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = isNext ? COLORS.ringNext : '#ffffff';
    ctx.font = 'bold ' + clamp(radius * 0.42, 11, 26) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(ring.id), center.x, center.y + 6);
  }
}

export function drawLandmarks(ctx, camera, plane, world, width, height) {
  const sorted = [...world.landmarks].sort((a, b) => {
    const da = Math.hypot(a.x - plane.x, a.z - plane.z);
    const db = Math.hypot(b.x - plane.x, b.z - plane.z);
    return db - da;
  });
  for (const mark of sorted) {
    const base = projectPoint(camera, plane, width, height, mark.x, groundHeightAt(mark.x, mark.z), mark.z);
    if (!base || base.depth > 3800) continue;
    const s = clamp(base.scale * mark.scale, 0.15, 3.2);
    if (mark.kind === 'tree') {
      ctx.fillStyle = '#6b4a2f';
      ctx.fillRect(base.x - 2 * s, base.y - 14 * s, 4 * s, 14 * s);
      ctx.fillStyle = '#2f6b35';
      ctx.beginPath();
      ctx.moveTo(base.x, base.y - 46 * s);
      ctx.lineTo(base.x - 15 * s, base.y - 12 * s);
      ctx.lineTo(base.x + 15 * s, base.y - 12 * s);
      ctx.closePath();
      ctx.fill();
    } else if (mark.kind === 'barn') {
      ctx.fillStyle = '#a34a3a';
      ctx.fillRect(base.x - 16 * s, base.y - 18 * s, 32 * s, 18 * s);
      ctx.fillStyle = '#6e2f26';
      ctx.beginPath();
      ctx.moveTo(base.x - 19 * s, base.y - 18 * s);
      ctx.lineTo(base.x, base.y - 30 * s);
      ctx.lineTo(base.x + 19 * s, base.y - 18 * s);
      ctx.closePath();
      ctx.fill();
    } else if (mark.kind === 'lighthouse') {
      ctx.fillStyle = '#f4f6f8';
      ctx.fillRect(base.x - 6 * s, base.y - 52 * s, 12 * s, 52 * s);
      ctx.fillStyle = '#d94f3d';
      ctx.fillRect(base.x - 6 * s, base.y - 42 * s, 12 * s, 9 * s);
      ctx.fillRect(base.x - 6 * s, base.y - 24 * s, 12 * s, 9 * s);
      ctx.fillStyle = '#ffe98a';
      ctx.beginPath();
      ctx.arc(base.x, base.y - 56 * s, 6 * s, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#7d8794';
      ctx.fillRect(base.x - 5 * s, base.y - 44 * s, 10 * s, 44 * s);
      ctx.fillStyle = '#ffb02e';
      ctx.beginPath();
      ctx.arc(base.x, base.y - 48 * s, 5 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawAircraftChase(ctx, width, height, plane, time) {
  const cx = width / 2;
  const cy = height * 0.66 - plane.pitch * 40;
  const wing = width * 0.19;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(plane.roll * 0.9);
  ctx.fillStyle = 'rgba(10,24,36,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 52, wing * 0.82, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  const wingGrad = ctx.createLinearGradient(-wing, 0, wing, 0);
  wingGrad.addColorStop(0, '#d94f3d');
  wingGrad.addColorStop(0.5, '#f6f1e7');
  wingGrad.addColorStop(1, '#d94f3d');
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(-wing, 10);
  ctx.lineTo(-wing * 0.28, -8);
  ctx.lineTo(wing * 0.28, -8);
  ctx.lineTo(wing, 10);
  ctx.lineTo(wing * 0.86, 24);
  ctx.lineTo(-wing * 0.86, 24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#24303c';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f6f1e7';
  ctx.beginPath();
  ctx.ellipse(0, 2, 26, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2e6fb8';
  ctx.beginPath();
  ctx.ellipse(0, -18, 16, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-5, -26, 6, 11, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d94f3d';
  ctx.beginPath();
  ctx.moveTo(0, 34);
  ctx.lineTo(-34, 56);
  ctx.lineTo(34, 56);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#24303c';
  ctx.fillRect(-3, 34, 6, 24);
  ctx.fillStyle = '#3dff8f';
  ctx.beginPath();
  ctx.arc(-wing * 0.94, 14, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff5a4e';
  ctx.beginPath();
  ctx.arc(wing * 0.94, 14, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(36,48,60,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, -52, 44, 7 + Math.sin(time * 30) * 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawCockpitFrame(ctx, width, height, plane) {
  ctx.fillStyle = 'rgba(10,18,26,0.92)';
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, height * 0.58);
  ctx.lineTo(width * 0.16, height * 0.72);
  ctx.lineTo(width * 0.84, height * 0.72);
  ctx.lineTo(width, height * 0.58);
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3d4a58';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#16222e';
  ctx.beginPath();
  ctx.moveTo(width * 0.42, height * 0.72);
  ctx.lineTo(width * 0.5, height * 0.6);
  ctx.lineTo(width * 0.58, height * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,176,46,0.9)';
  ctx.fillRect(width * 0.495, height * 0.6, width * 0.01, height * 0.05);
  void plane;
}

export function drawScene(ctx, state, width, height, time) {
  const camera = createCamera(state.plane, state.viewMode);
  drawSky(ctx, width, height, state.plane);
  drawGround(ctx, camera, state.plane, width, height);
  drawRunway(ctx, camera, state.plane, width, height);
  drawLandmarks(ctx, camera, state.plane, state.world, width, height);
  drawRings(ctx, camera, state.plane, state.world, width, height, time);
  if (state.viewMode === 'chase') drawAircraftChase(ctx, width, height, state.plane, time);
  else drawCockpitFrame(ctx, width, height, state.plane);
  return camera;
}
