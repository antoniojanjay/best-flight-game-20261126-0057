// Keyboard and mouse input: keys held, mouse steering and button clicks.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseX: 0.5,
    mouseY: 0.5,
    mouseDown: false,
    clicked: false,
    pressed: new Set(),
  };
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (!input.keys.has(key)) input.pressed.add(key);
    input.keys.add(key);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.key.toLowerCase());
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (event.clientX - rect.left) / Math.max(1, rect.width);
    input.mouseY = (event.clientY - rect.top) / Math.max(1, rect.height);
  });
  canvas.addEventListener('pointerdown', () => {
    input.mouseDown = true;
    input.clicked = true;
  });
  window.addEventListener('pointerup', () => {
    input.mouseDown = false;
  });
  input.consumeClick = function consumeClick() {
    const was = input.clicked;
    input.clicked = false;
    return was;
  };
  input.wasPressed = function wasPressed(key) {
    return input.pressed.has(key);
  };
  input.endFrame = function endFrame() {
    input.pressed.clear();
    input.clicked = false;
  };
  input.isDown = function isDown(...keys) {
    return keys.some((key) => input.keys.has(key));
  };
  return input;
}

export function readSteering(input) {
  let pitch = 0;
  let roll = 0;
  if (input.isDown('arrowup', 'w')) pitch -= 1;
  if (input.isDown('arrowdown', 's')) pitch += 1;
  if (input.isDown('arrowleft', 'a')) roll -= 1;
  if (input.isDown('arrowright', 'd')) roll += 1;
  if (input.mouseDown) {
    roll += (input.mouseX - 0.5) * 2.2;
    pitch += (input.mouseY - 0.5) * 2.2;
  }
  return {
    pitch: Math.max(-1, Math.min(1, pitch)),
    roll: Math.max(-1, Math.min(1, roll)),
  };
}
