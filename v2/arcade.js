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
const deck = player;

const keys = new Set();
const pointerKeys = new Map();
let game, source, mode, frameId, previousTime;
const input = {
  has: (action) => keys.has(action) || [...pointerKeys.values()].includes(action),
};

function clearInput() {
  game?.release?.();
  keys.clear();
  pointerKeys.clear();
  for (const button of controls.children) button.setAttribute("aria-pressed", "false");
}

function prompt(title, copy, options) {
  clearInput();
  byId("overlay-title").textContent = title;
  byId("overlay-copy").textContent = copy;
  choices.replaceChildren();
  for (const [label, callback] of options) {
    const button = document.createElement("button");
    button.textContent = label;
    button.addEventListener("click", callback);
    choices.append(button);
  }
  overlay.hidden = false;
  choices.firstElementChild?.focus();
}

function start(option) {
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
    prompt("Pause", "Dein Spiel wartet auf dich.", [["Weiter", play]]);
  }
}

function frame(now) {
  const dt = Math.min(.04, (now - previousTime) / 1000);
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
  const status = game.status();
  if (readout.textContent !== status) readout.textContent = status;
  frameId = requestAnimationFrame(frame);
}

function openGame(id, button) {
  game = games[id]();
  source = button;
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

for (const button of catalog.querySelectorAll("[data-game]")) {
  button.addEventListener("click", () => openGame(button.dataset.game, button));
}
byId("back").addEventListener("click", closeGame);
pause.addEventListener("click", togglePause);
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
  if (!game) return;
  if (event.code === "Escape" && !event.repeat && !document.fullscreenElement) {
    togglePause();
    return;
  }
  if (mode !== "playing" || event.target.closest("button, a")) return;
  const action = game.bindings[event.code];
  if (!action) return;
  event.preventDefault();
  keys.add(action);
});
window.addEventListener("keyup", (event) => {
  const action = game?.bindings[event.code];
  if (action) keys.delete(action);
});
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
