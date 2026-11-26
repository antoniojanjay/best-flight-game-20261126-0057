// Heads-up display: altitude, speed, heading, gauges, mission banner and menus.
import { COLORS, clamp, formatHeading } from './config.js';
import { missionObjective, nextRing } from './flight.js';
import { projectPoint } from './render.js';

export function speedKnots(plane) {
  return Math.round(plane.speed * 1.94);
}

export function altitudeFeet(plane) {
  return Math.round(Math.max(0, plane.y - 2) * 3.28);
}

export function drawPanel(ctx, x, y, w, h) {
  ctx.fillStyle = COLORS.panel;
  ctx.strokeStyle = 'rgba(234,246,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
}

export function drawGauge(ctx, x, y, radius, label, valueText, fraction, color) {
  ctx.fillStyle = '#0d1b28';
  ctx.strokeStyle = 'rgba(234,246,255,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, radius - 6, Math.PI * 0.75, Math.PI * 0.75 + clamp(fraction, 0, 1) * Math.PI * 1.5);
  ctx.stroke();
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold ' + Math.max(12, radius * 0.42) + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(valueText, x, y + 4);
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText(label, x, y + radius * 0.58);
}

export function drawCompass(ctx, width, plane) {
  const cx = width / 2;
  drawPanel(ctx, cx - 170, 14, 340, 46);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HDG ' + formatHeading(plane.heading), cx, 44);
  ctx.fillStyle = COLORS.accent;
  ctx.beginPath();
  ctx.moveTo(cx, 62);
  ctx.lineTo(cx - 7, 52);
  ctx.lineTo(cx + 7, 52);
  ctx.closePath();
  ctx.fill();
}

export function drawHud(ctx, state, width, height, camera) {
  const plane = state.plane;
  drawCompass(ctx, width, plane);
  drawPanel(ctx, 16, 16, 168, 92);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALTITUDE', 30, 38);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText(altitudeFeet(plane) + ' ft', 30, 70);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = plane.verticalSpeed < -4 ? COLORS.danger : COLORS.hudDim;
  ctx.fillText('VS ' + Math.round(plane.verticalSpeed * 196) + ' fpm', 30, 92);

  drawPanel(ctx, width - 184, 16, 168, 92);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('AIRSPEED', width - 170, 38);
  ctx.fillStyle = speedKnots(plane) < 48 && plane.airborne ? COLORS.danger : COLORS.hud;
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText(speedKnots(plane) + ' kt', width - 170, 70);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText(plane.airborne ? 'AIRBORNE' : 'ON GROUND', width - 170, 92);

  drawPanel(ctx, 16, height - 118, 230, 102);
  drawBar(ctx, 30, height - 92, 200, 'THROTTLE', plane.throttle, COLORS.accent);
  drawBar(ctx, 30, height - 62, 200, 'FUEL', plane.fuel / 100, plane.fuel < 22 ? COLORS.danger : COLORS.good);
  drawBar(ctx, 30, height - 32, 200, 'DAMAGE', plane.damage / 100, COLORS.danger);

  drawPanel(ctx, width - 246, height - 118, 230, 102);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('SCORE', width - 232, height - 92);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(String(state.score), width - 232, height - 64);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  const done = state.world.rings.filter((ring) => ring.passed).length;
  ctx.fillText('Rings ' + done + '/' + state.world.rings.length + '   Time ' + state.elapsed.toFixed(0) + 's', width - 232, height - 36);

  if (state.viewMode === 'chase') drawAttitude(ctx, width / 2, height - 74, plane);
  drawMissionBanner(ctx, state, width);
  drawNextRingMarker(ctx, state, width, height, camera);
  if (state.viewMode === 'cockpit') drawCockpitGauges(ctx, state, width, height);
  if (state.paused) drawCenterMessage(ctx, width, height, 'Paused', 'Press P to resume. R restarts, C changes view.');
  if (plane.crashed) drawCenterMessage(ctx, width, height, 'Flight ended', plane.crashReason + ' Press R to fly again.');
  if (plane.landed) drawCenterMessage(ctx, width, height, 'Landed', 'Sortie complete. Score ' + state.score + '. Press R to fly again.');
}

export function drawBar(ctx, x, y, w, label, fraction, color) {
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 4);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, 10, 5);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(2, w * clamp(fraction, 0, 1)), 10, 5);
  ctx.fill();
}

export function drawAttitude(ctx, x, y, plane) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.clip();
  ctx.rotate(-plane.roll);
  ctx.fillStyle = '#3d7fc4';
  ctx.fillRect(-60, -60 + plane.pitch * 70, 120, 60);
  ctx.fillStyle = '#7a5a35';
  ctx.fillRect(-60, plane.pitch * 70, 120, 60);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-60, plane.pitch * 70);
  ctx.lineTo(60, plane.pitch * 70);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(234,246,255,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 22, y);
  ctx.lineTo(x - 6, y);
  ctx.lineTo(x, y + 6);
  ctx.lineTo(x + 6, y);
  ctx.lineTo(x + 22, y);
  ctx.stroke();
}

export function drawMissionBanner(ctx, state, width) {
  const text = missionObjective(state.plane, state.world);
  ctx.font = 'bold 16px system-ui, sans-serif';
  const w = Math.min(width - 40, ctx.measureText(text).width + 36);
  drawPanel(ctx, (width - w) / 2, 72, w, 38);
  ctx.fillStyle = COLORS.hud;
  ctx.textAlign = 'center';
  ctx.fillText(text, width / 2, 97);
}

export function drawNextRingMarker(ctx, state, width, height, camera) {
  const ring = nextRing(state.world);
  if (!ring || !state.plane.airborne) return;
  const point = projectPoint(camera, state.plane, width, height, ring.x, ring.y, ring.z);
  const dist = Math.round(Math.hypot(ring.x - state.plane.x, ring.y - state.plane.y, ring.z - state.plane.z));
  ctx.fillStyle = COLORS.ringNext;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  if (point && point.x > 30 && point.x < width - 30 && point.y > 120 && point.y < height - 30) {
    ctx.fillText('▼ RING ' + ring.id + ' · ' + dist + ' m', point.x, Math.max(126, point.y - 92));
    return;
  }
  const bearing = Math.atan2(ring.x - state.plane.x, ring.z - state.plane.z);
  let diff = bearing - state.plane.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const arrow = diff < -0.25 ? '◀ TURN LEFT' : diff > 0.25 ? 'TURN RIGHT ▶' : '▲ STRAIGHT';
  ctx.fillText(arrow + ' · RING ' + ring.id + ' · ' + dist + ' m', width / 2, 132);
}

export function drawCockpitGauges(ctx, state, width, height) {
  const plane = state.plane;
  const y = height * 0.86;
  drawGauge(ctx, width * 0.3, y, 46, 'ALT FT', String(altitudeFeet(plane)), clamp(altitudeFeet(plane) / 1800, 0, 1), '#3dff8f');
  drawGauge(ctx, width * 0.5, y, 52, 'SPEED KT', String(speedKnots(plane)), clamp(speedKnots(plane) / 180, 0, 1), '#ffb02e');
  drawGauge(ctx, width * 0.7, y, 46, 'HEADING', formatHeading(plane.heading), (plane.heading / (Math.PI * 2)) % 1, '#7db6e8');
  ctx.fillStyle = '#3dff8f';
  ctx.beginPath();
  ctx.arc(width * 0.5, height * 0.76, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PANEL LIGHTS ON · AMBER COAST', width / 2, height * 0.79);
}

export function drawCenterMessage(ctx, width, height, title, body) {
  drawPanel(ctx, width / 2 - 300, height / 2 - 70, 600, 140);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, height / 2 - 18);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText(body, width / 2, height / 2 + 22);
}

export function drawStartScreen(ctx, width, height) {
  ctx.fillStyle = 'rgba(6,14,22,0.42)';
  ctx.fillRect(0, 0, width, height);
  drawPanel(ctx, width / 2 - 340, height / 2 - 210, 680, 420);
  ctx.fillStyle = COLORS.accent;
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AMBER COAST FLYING CLUB', width / 2, height / 2 - 158);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText('Skyreach', width / 2, height / 2 - 104);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText('Take off, thread six rings over the coast, then land.', width / 2, height / 2 - 66);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hud;
  ctx.fillText('Shift / Ctrl throttle · Arrows or WASD steer · Hold mouse to steer', width / 2, height / 2 - 22);
  ctx.fillText('C cockpit view · P pause · R restart · M mute', width / 2, height / 2 + 8);
  ctx.fillText('Watch fuel and speed. Land slow, level and on the runway.', width / 2, height / 2 + 38);
  ctx.fillStyle = COLORS.good;
  ctx.beginPath();
  ctx.roundRect(width / 2 - 130, height / 2 + 72, 260, 56, 14);
  ctx.fill();
  ctx.fillStyle = '#07240f';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('START FLIGHT', width / 2, height / 2 + 109);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Press Enter or click Start', width / 2, height / 2 + 158);
}

export function isStartButtonHit(input, width, height) {
  const x = input.mouseX * width;
  const y = input.mouseY * height;
  return x >= width / 2 - 130 && x <= width / 2 + 130 && y >= height / 2 + 72 && y <= height / 2 + 128;
}
