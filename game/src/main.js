// Skyreach Amber Coast entry point: game states, loop, scoring and shot mode.
import { createAudio } from './audio.js';
import { clamp } from './config.js';
import { checkRingPass, createAircraft, resetAircraft, stepFlight } from './flight.js';
import { drawHud, drawStartScreen, isStartButtonHit } from './hud.js';
import { createInput, readSteering } from './input.js';
import { drawScene } from './render.js';
import { buildWorld } from './world.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shotMode = params.get('shot') || '';

const state = {
  plane: createAircraft(),
  world: buildWorld(seed),
  viewMode: 'chase',
  started: false,
  paused: false,
  score: 0,
  elapsed: 0,
  frames: 0,
};

const input = createInput(canvas);
const audio = createAudio();
let lastTime = performance.now();
let shotFrames = 0;

export function resizeCanvas() {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
}

export function startFlight() {
  resetAircraft(state.plane);
  state.world = buildWorld(seed);
  state.score = 0;
  state.elapsed = 0;
  state.started = true;
  state.paused = false;
  audio.unlock();
  statusLine.textContent = 'Flight started. Throttle up to take off.';
}

export function applyShotMode() {
  if (!shotMode) return;
  state.started = true;
  state.paused = false;
  state.elapsed = 42;
  if (shotMode === 'start') {
    state.started = false;
    state.plane.x = 0;
    state.plane.y = 2;
    state.plane.z = -390;
    state.plane.heading = 0;
    state.plane.speed = 0;
    state.plane.throttle = 0;
    return;
  }
  state.plane.airborne = true;
  state.plane.throttle = 0.72;
  state.plane.speed = 62;
  state.plane.fuel = 78;
  state.plane.damage = 6;
  if (shotMode === 'cockpit') {
    state.viewMode = 'cockpit';
    state.plane.x = 40;
    state.plane.y = 148;
    state.plane.z = 760;
    state.plane.heading = 0.06;
    state.plane.pitch = 0.08;
    state.plane.roll = 0.12;
    state.score = 300;
    state.world.rings[0].passed = false;
    return;
  }
  if (shotMode === 'mission') {
    state.viewMode = 'chase';
    state.plane.x = 360;
    state.plane.y = 205;
    state.plane.z = 1500;
    state.plane.heading = 0.32;
    state.plane.pitch = 0.04;
    state.plane.roll = -0.18;
    state.score = 700;
    state.world.rings[0].passed = true;
    state.world.rings[1].passed = false;
    return;
  }
  state.viewMode = 'chase';
  state.plane.x = 18;
  state.plane.y = 132;
  state.plane.z = 720;
  state.plane.heading = 0.04;
  state.plane.pitch = 0.09;
  state.plane.roll = 0.1;
  state.score = 300;
}

export function updateGame(dt) {
  state.frames += 1;
  if (!state.started) {
    if (input.wasPressed('enter') || (input.consumeClick() && isStartButtonHit(input, canvas.width, canvas.height))) startFlight();
    return;
  }
  if (input.wasPressed('p')) state.paused = !state.paused;
  if (input.wasPressed('c') || input.wasPressed('v')) state.viewMode = state.viewMode === 'chase' ? 'cockpit' : 'chase';
  if (input.wasPressed('m')) audio.toggleMute();
  if (input.wasPressed('r')) startFlight();
  if (state.paused) return;
  const previous = { x: state.plane.x, y: state.plane.y, z: state.plane.z };
  const wasAirborne = state.plane.airborne;
  const wasEnded = state.plane.crashed || state.plane.landed;
  stepFlight(state.plane, readSteering(input), input, dt);
  if (!wasEnded && !state.plane.crashed && !state.plane.landed) state.elapsed += dt;
  for (const ring of state.world.rings) {
    if (checkRingPass(state.plane, ring, previous)) {
      ring.passed = true;
      const bonus = Math.max(80, 220 - Math.round(Math.abs(state.plane.y - ring.y)));
      state.score += bonus;
      audio.ringChime();
      statusLine.textContent = 'Ring ' + ring.id + ' cleared.';
    }
  }
  if (state.plane.landed && !wasEnded) {
    const allRings = state.world.rings.every((ring) => ring.passed);
    state.score += allRings ? 600 : 180;
    state.score += Math.round(state.plane.fuel * 2);
    audio.thud();
    statusLine.textContent = 'Landed safely.';
  }
  if (state.plane.crashed && !wasEnded) audio.thud();
  if (!wasAirborne && state.plane.airborne) statusLine.textContent = 'Airborne. Head for ring 1.';
  audio.setEngine(state.plane.throttle, state.plane.speed);
}

export function renderFrame(now) {
  const dt = clamp((now - lastTime) / 1000, 0, 0.05);
  lastTime = now;
  if (!shotMode) updateGame(dt);
  else {
    state.frames += 1;
    if (input.wasPressed('enter') && !state.started) startFlight();
  }
  const camera = drawScene(ctx, state, canvas.width, canvas.height, now / 1000);
  if (state.started) drawHud(ctx, state, canvas.width, canvas.height, camera);
  else drawStartScreen(ctx, canvas.width, canvas.height);
  input.endFrame();
  if (shotMode) {
    shotFrames += 1;
    if (shotFrames >= 6) window.__shotReady = true;
  }
  window.__skyreach = state;
  requestAnimationFrame(renderFrame);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
applyShotMode();
requestAnimationFrame(renderFrame);
