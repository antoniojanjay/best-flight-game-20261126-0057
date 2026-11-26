// Flight model: takeoff, cruise, ring checks, landing judgement and damage.
import { PLANE, WORLD, clamp, wrapAngle } from './config.js';
import { groundHeightAt, isOverRunway } from './world.js';

export function createAircraft() {
  return {
    x: 0,
    y: 2,
    z: -WORLD.runwayLength / 2 + 60,
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    verticalSpeed: 0,
    fuel: WORLD.startFuel,
    damage: 0,
    airborne: false,
    landed: false,
    crashed: false,
    crashReason: '',
  };
}

export function resetAircraft(plane) {
  const fresh = createAircraft();
  Object.assign(plane, fresh);
}

export function stepFlight(plane, steering, input, dt) {
  if (plane.crashed || plane.landed) return;
  if (input.isDown('shift')) plane.throttle = clamp(plane.throttle + dt * 0.55, 0, 1);
  if (input.isDown('control')) plane.throttle = clamp(plane.throttle - dt * 0.55, 0, 1);
  if (input.wasPressed('e')) plane.throttle = clamp(plane.throttle + 0.12, 0, 1);
  if (input.wasPressed('q')) plane.throttle = clamp(plane.throttle - 0.12, 0, 1);
  if (plane.fuel <= 0) plane.throttle = 0;
  plane.fuel = clamp(plane.fuel - plane.throttle * dt * 0.55, 0, WORLD.startFuel);

  const targetSpeed = plane.throttle * PLANE.maxSpeed;
  const accel = plane.airborne ? 0.55 : 0.85;
  plane.speed += (targetSpeed - plane.speed) * Math.min(1, dt * accel * 2.2);
  if (plane.airborne && plane.pitch > 0.12) plane.speed = clamp(plane.speed - plane.pitch * dt * 9, 0, PLANE.maxSpeed);
  if (plane.airborne && plane.pitch < -0.12) plane.speed = clamp(plane.speed + (-plane.pitch) * dt * 7, 0, PLANE.maxSpeed + 12);

  const authority = clamp(plane.speed / PLANE.takeoffSpeed, 0, 1.15);
  plane.roll += (steering.roll * 0.85 - plane.roll) * Math.min(1, dt * 5);
  plane.pitch += (steering.pitch * 0.42 - plane.pitch) * Math.min(1, dt * 4);
  if (plane.airborne) {
    plane.heading = wrapAngle(plane.heading + Math.sin(plane.roll) * PLANE.turnRate * authority * dt);
  } else {
    plane.heading = wrapAngle(plane.heading + steering.roll * 0.12 * dt * clamp(plane.speed / 18, 0, 1));
    plane.pitch = clamp(plane.pitch, -0.02, 0.22);
  }

  const ground = groundHeightAt(plane.x, plane.z);
  if (!plane.airborne) {
    plane.y = ground + 2;
    plane.verticalSpeed = 0;
    if (plane.speed >= PLANE.takeoffSpeed && plane.pitch > 0.06) {
      plane.airborne = true;
      plane.verticalSpeed = 4;
    }
    if (plane.z > WORLD.runwayLength / 2 + 30 && plane.speed > 18) {
      plane.crashed = true;
      plane.crashReason = 'Ran off the runway. Add throttle, then pull up gently.';
    }
  } else {
    const lift = clamp((plane.speed - PLANE.stallSpeed) / 26, 0, 1.25);
    plane.verticalSpeed = plane.pitch * PLANE.climbRate * lift - (1 - lift) * PLANE.gravitySink;
    if (plane.speed < PLANE.stallSpeed) plane.pitch = clamp(plane.pitch - dt * 0.35, -0.5, 0.42);
    plane.y += plane.verticalSpeed * dt;
    if (plane.y <= ground + 2.2 && plane.verticalSpeed < 0) {
      plane.y = ground + 2;
      judgeTouchdown(plane);
    } else if (plane.y < ground + 2) {
      plane.y = ground + 2;
    }
  }

  plane.x += Math.sin(plane.heading) * plane.speed * dt;
  plane.z += Math.cos(plane.heading) * plane.speed * dt;
  plane.x = clamp(plane.x, -2600, 2600);
  plane.z = clamp(plane.z, -900, 4600);
  plane.y = clamp(plane.y, 2, 620);
}

export function judgeTouchdown(plane) {
  const onRunway = isOverRunway(plane.x, plane.z);
  const gentle = plane.verticalSpeed > -5.5;
  const aligned = Math.abs(wrapAngle(plane.heading)) < 0.28 || Math.abs(Math.abs(wrapAngle(plane.heading)) - Math.PI) < 0.28;
  const slowEnough = plane.speed < 58;
  if (onRunway && gentle && aligned && slowEnough) {
    plane.landed = true;
    plane.airborne = false;
    plane.speed = Math.min(plane.speed, 16);
    plane.verticalSpeed = 0;
    return;
  }
  if (!onRunway && gentle && plane.speed < 44) {
    plane.damage = clamp(plane.damage + 34, 0, 100);
    if (plane.damage >= 100) {
      plane.crashed = true;
      plane.crashReason = 'Off-field landing broke the gear.';
    } else {
      plane.landed = true;
      plane.airborne = false;
      plane.crashReason = 'Rough off-field landing. The plane stopped, battered.';
    }
    return;
  }
  plane.crashed = true;
  plane.damage = 100;
  plane.crashReason = !gentle ? 'Touched down too hard.' : 'Landing was too fast or misaligned.';
}

export function checkRingPass(plane, ring, previous) {
  if (ring.passed || !plane.airborne) return false;
  const crossed = (previous.z - ring.z) * (plane.z - ring.z) <= 0 && Math.abs(plane.z - ring.z) < 90;
  if (!crossed) return false;
  const dx = plane.x - ring.x;
  const dy = plane.y - ring.y;
  return Math.sqrt(dx * dx + dy * dy) <= ring.radius;
}

export function nextRing(world) {
  return world.rings.find((ring) => !ring.passed) || null;
}

export function missionObjective(plane, world) {
  if (plane.crashed) return 'Flight ended. Press R to try again.';
  if (plane.landed) return 'Landed. Press R for another sortie.';
  if (!plane.airborne) return 'Throttle up with Shift, reach 65 kt, then pull up with Down or S.';
  const ring = nextRing(world);
  if (ring) return 'Fly through ring ' + ring.id + ' of ' + world.rings.length + '. Follow the green marker.';
  return 'All rings clear. Line up on the runway and land gently.';
}
