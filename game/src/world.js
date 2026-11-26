// World layout: runway, target rings, fields and landmarks around Amber Coast.
import { WORLD } from './config.js';

export function makeSeededRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function nextRandom() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function buildWorld(seed) {
  const rand = makeSeededRandom(seed);
  const rings = [];
  const ringSpots = [
    { x: 120, y: 150, z: 1150 },
    { x: 520, y: 210, z: 1850 },
    { x: 250, y: 260, z: 2650 },
    { x: -420, y: 220, z: 3150 },
    { x: -620, y: 170, z: 2250 },
    { x: -260, y: 140, z: 1250 },
  ];
  for (let i = 0; i < WORLD.ringCount; i++) {
    const spot = ringSpots[i % ringSpots.length];
    rings.push({
      id: i + 1,
      x: spot.x + (rand() - 0.5) * 40,
      y: spot.y,
      z: spot.z,
      radius: WORLD.ringRadius,
      passed: false,
    });
  }
  const landmarks = [];
  for (let i = 0; i < 46; i++) {
    landmarks.push({
      x: (rand() - 0.5) * 3600,
      z: rand() * 4200 - 400,
      kind: i % 5 === 0 ? 'tower' : i % 3 === 0 ? 'barn' : 'tree',
      scale: 0.7 + rand() * 0.9,
    });
  }
  landmarks.push({ x: 780, z: 900, kind: 'lighthouse', scale: 1.6 });
  landmarks.push({ x: -900, z: 2400, kind: 'tower', scale: 1.4 });
  return {
    rings,
    landmarks,
    runway: { x: 0, z: 0, length: WORLD.runwayLength, width: WORLD.runwayWidth },
  };
}

export function groundHeightAt(x, z) {
  const hill = Math.max(0, Math.sin(x * 0.0016) * Math.cos(z * 0.0012)) * 26;
  const ridge = Math.max(0, Math.sin((x + z) * 0.0009)) * 14;
  const nearRunway = Math.abs(x) < 180 && z > -700 && z < 1100 ? 0 : 1;
  return (hill + ridge) * nearRunway;
}

export function fieldColorAt(x, z) {
  const cellX = Math.floor(x / 420);
  const cellZ = Math.floor(z / 420);
  const hash = Math.abs((cellX * 73856093) ^ (cellZ * 19349663)) % 3;
  if (x > 1150) return 'sea';
  if (x > 980) return 'sand';
  if (hash === 0) return 'fieldA';
  if (hash === 1) return 'fieldB';
  return 'fieldC';
}

export function distanceToRunwayCenter(x, z) {
  return Math.abs(x);
}

export function isOverRunway(x, z) {
  return Math.abs(x) <= WORLD.runwayWidth / 2 + 6 && z >= -WORLD.runwayLength / 2 && z <= WORLD.runwayLength / 2;
}
