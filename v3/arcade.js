import { games, W, H } from "./games.js";

const byId = (id) => document.getElementById(id);
const catalog = byId("catalog");
const player = byId("player");
const canvas = byId("screen");
const ctx = canvas.getContext("2d");
const readout = byId("readout");
const overlay = byId("overlay");
const choices = byId("choices");
const controls = byId("controls");
const pause = byId("pause");
const full = byId("full");
const restart = byId("restart");
const gameCards = [...catalog.querySelectorAll("[data-game]")];
const pressedCodes = new Map();
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let option, hasStarted = false, focusIndex = 0;
const deck = player;

const keys = new Set();
const pointerKeys = new Map();
let game, source, mode, frameId, previousTime;
const input = {
  has: (action) => keys.has(action) || [...pressedCodes.values()].includes(action) || [...pointerKeys.values()].includes(action),
};

function clearInput() {
  game?.release?.();
  pressedCodes.clear();
  keys.clear();
  pointerKeys.clear();
  for (const button of controls.children) button.setAttribute("aria-pressed", "false");
}

function prompt(title, copy, options) {
  clearInput();
  byId("overlay-title").textContent = title;
  byId("overlay-copy").textContent = copy;
  choices.replaceChildren();
  for (const [index, [label, callback]] of options.entries()) {
    const button = document.createElement("button");
    button.textContent = label;
    button.dataset.choice = String(index + 1);
    button.addEventListener("click", callback);
    choices.append(button);
  }
  overlay.hidden = false;
  choices.firstElementChild?.focus();
}

function start(selection) {
  option = selection;
  hasStarted = true;
  restart.disabled = false;
  clearInput();
  game.reset(option);
  play();
}

function play() {
  mode = "playing";
  overlay.hidden = true;
  pause.disabled = false;
  pause.textContent = "Pause";
  previousTime = performance.now();
  canvas.focus({ preventScroll: true });
}

function togglePause() {
  if (mode === "paused") {
    play();
  } else if (mode === "playing") {
    mode = "paused";
    pause.textContent = "Weiter";
    prompt("Pause", "Dein Spiel wartet auf dich.", [["Weiter", play], ["Spiele", closeGame]]);
  }
}

function frame(now) {
  const dt = Math.max(0, Math.min(.04, (now - previousTime) / 1000));
  previousTime = now;
  if (mode === "playing") {
    const result = game.step(dt, input);
    if (result) {
      mode = "overlay";
      pause.disabled = true;
      const options = result.options?.map(([label, select]) => [label, () => {
        select();
        play();
      }]) ?? game.starts.map(([label, option]) => [label, () => start(option)]);
      prompt(result.title, result.copy, options);
    }
  }
  game.draw(ctx);
  if (!reducedMotion.matches && mode === "playing") {
    const band = ((now / 36) % (H + 50)) - 50;
    const light = ctx.createLinearGradient(0, band, 0, band + 50);
    light.addColorStop(0, "transparent");
    light.addColorStop(.5, "#b99aff0d");
    light.addColorStop(1, "transparent");
    ctx.fillStyle = light;
    ctx.fillRect(0, band, W, 50);
  }
  const status = game.status();
  if (readout.textContent !== status) readout.textContent = status;
  frameId = requestAnimationFrame(frame);
}

function openGame(id, button) {
  game = games[id]();
  source = button;
  hasStarted = false;
  restart.disabled = true;
  mode = "overlay";
  catalog.hidden = true;
  player.hidden = false;
  byId("game-title").textContent = game.name;
  byId("instructions").textContent = game.help;
  pause.disabled = true;
  pause.textContent = "Pause";
  controls.replaceChildren();
  for (const [action, label] of Object.entries(game.controls)) {
    const control = document.createElement("button");
    control.textContent = label;
    control.dataset.action = action;
    control.setAttribute("aria-pressed", "false");
    control.addEventListener("pointerdown", (event) => {
      if (mode !== "playing") return;
      control.setPointerCapture(event.pointerId);
      pointerKeys.set(event.pointerId, action);
      control.setAttribute("aria-pressed", "true");
    });
    control.addEventListener("lostpointercapture", (event) => {
      pointerKeys.delete(event.pointerId);
      control.setAttribute("aria-pressed", String(input.has(action)));
    });
    control.addEventListener("keydown", (event) => {
      if (mode !== "playing" || !["Space", "Enter"].includes(event.code)) return;
      event.preventDefault();
      keys.add(action);
      control.setAttribute("aria-pressed", "true");
    });
    control.addEventListener("keyup", (event) => {
      if (!["Space", "Enter"].includes(event.code)) return;
      keys.delete(action);
      control.setAttribute("aria-pressed", "false");
    });
    control.addEventListener("blur", () => {
      keys.delete(action);
      control.setAttribute("aria-pressed", String(input.has(action)));
    });
    controls.append(control);
  }
  game.reset(game.starts[0][1]);
  prompt(game.name, game.intro, game.starts.map(([label, option]) => [label, () => start(option)]));
  previousTime = performance.now();
  frameId = requestAnimationFrame(frame);
  window.scrollTo(0, 0);
}

function closeGame() {
  cancelAnimationFrame(frameId);
  clearInput();
  if (document.fullscreenElement === deck) document.exitFullscreen().catch(() => {});
  player.hidden = true;
  catalog.hidden = false;
  source.focus();
  game = null;
}

for (const [index, button] of gameCards.entries()) {
  button.setAttribute("aria-keyshortcuts", String(index + 1));
  button.addEventListener("focus", () => { focusIndex = index; });
  button.addEventListener("click", () => openGame(button.dataset.game, button));
}
byId("back").addEventListener("click", closeGame);
pause.addEventListener("click", togglePause);
restart.addEventListener("click", () => { if (hasStarted) start(option); });
full.hidden = !document.fullscreenEnabled;
full.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await deck.requestFullscreen();
  } catch {
    full.title = "Vollbild ist auf diesem Gerät nicht verfügbar.";
  }
});
document.addEventListener("fullscreenchange", () => {
  full.setAttribute("aria-label", document.fullscreenElement ? "Vollbild verlassen" : "Vollbild");
});

window.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const digit = /^Digit[1-5]$/.test(event.code) ? Number(event.code.slice(-1)) : 0;
  if (!game) {
    if (digit && !event.repeat) {
      event.preventDefault();
      gameCards[digit - 1].click();
    } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.code)) {
      event.preventDefault();
      const direction = ["ArrowLeft", "ArrowUp"].includes(event.code) ? -1 : 1;
      const next = gameCards.includes(document.activeElement) ? focusIndex + direction : focusIndex;
      gameCards[(next + gameCards.length) % gameCards.length].focus();
    }
    return;
  }
  if (event.code === "Escape" && !event.repeat && !document.fullscreenElement) {
    event.preventDefault();
    if (mode === "playing") togglePause();
    else closeGame();
    return;
  }
  if (event.code === "KeyF" && !event.repeat && !full.hidden) {
    event.preventDefault();
    full.click();
    return;
  }
  if (event.code === "F2" && !event.repeat && hasStarted) {
    event.preventDefault();
    start(option);
    return;
  }
  if (mode !== "playing") {
    const buttons = [...choices.children];
    const index = buttons.indexOf(document.activeElement);
    if (digit && !event.repeat && buttons[digit - 1]) {
      event.preventDefault();
      buttons[digit - 1].click();
    } else if (buttons.length && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.code)) {
      event.preventDefault();
      const step = ["ArrowLeft", "ArrowUp"].includes(event.code) ? -1 : 1;
      buttons[index < 0 ? 0 : (index + step + buttons.length) % buttons.length].focus();
    }
    return;
  }
  const action = game.bindings[event.code];
  if (!action || (event.code === "Space" && event.target.closest("button, a"))) return;
  event.preventDefault();
  pressedCodes.set(event.code, action);
});
window.addEventListener("keyup", (event) => pressedCodes.delete(event.code));
window.addEventListener("blur", clearInput);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && mode === "playing" && game) togglePause();
});
canvas.addEventListener("pointermove", (event) => {
  if (mode !== "playing" || !game.point) return;
  if (event.pointerType !== "mouse" && !event.buttons) return;
  aim(event);
});
canvas.addEventListener("pointerdown", (event) => {
  if (mode !== "playing" || !game.point) return;
  canvas.setPointerCapture(event.pointerId);
  aim(event);
});

function aim(event) {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / W, rect.height / H);
  const left = rect.left + (rect.width - W * scale) / 2;
  const top = rect.top + (rect.height - H * scale) / 2;
  game.point((event.clientX - left) / scale, (event.clientY - top) / scale, Boolean(event.buttons));
}

canvas.addEventListener("lostpointercapture", () => game?.release?.());
