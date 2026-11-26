// Skyreach Amber Coast: shared tuning constants for the flight model and world.
export const WORLD = {
  runwayLength: 900,
  runwayWidth: 46,
  runwayHeading: 0,
  fieldSize: 5200,
  ringRadius: 34,
  ringCount: 6,
  startFuel: 100,
};

export const PLANE = {
  maxSpeed: 92,
  stallSpeed: 24,
  takeoffSpeed: 34,
  climbRate: 22,
  turnRate: 0.85,
  gravitySink: 7.5,
};

export const COLORS = {
  skyTop: '#2e6fb8',
  skyMid: '#7db6e8',
  skyLow: '#f6c98a',
  sea: '#2f7fa8',
  sand: '#e8cf9a',
  fieldA: '#6fae5a',
  fieldB: '#8fbf67',
  fieldC: '#c9b86a',
  hill: '#5b7d4f',
  runway: '#3a3f46',
  runwayEdge: '#f4f6f8',
  ring: '#ffb02e',
  ringNext: '#3dff8f',
  hud: '#eaf6ff',
  hudDim: 'rgba(234,246,255,0.72)',
  panel: 'rgba(8,18,28,0.78)',
  accent: '#ffb02e',
  danger: '#ff5a4e',
  good: '#3dff8f',
};

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function wrapAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export function headingDegrees(heading) {
  const deg = (heading * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

export function formatHeading(heading) {
  return String(Math.round(headingDegrees(heading))).padStart(3, '0') + '°';
}
