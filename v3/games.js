export const W = 900;
export const H = 540;

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const approach = (current, target, distance) => current + clamp(target - current, -distance, distance);
const length = (x, y) => Math.hypot(x, y);
const mod = (value, period) => (value % period + period) % period;
const clock = (time) => time.toFixed(2) + " s";

function record(key, value, improves) {
  try {
    const saved = localStorage.getItem("neon-arcade-v3-" + key);
    const best = saved === null ? null : Number(saved);
    if (value !== undefined && (best === null || improves(value, best))) {
      localStorage.setItem("neon-arcade-v3-" + key, String(value));
      return value;
    }
    return best;
  } catch {
    return value ?? null;
  }
}

function field(ctx, ink = "#24243c") {
  ctx.fillStyle = "#0c0f20";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 30; x < W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 30; y < H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
}

function dot(ctx, x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}

function text(ctx, value, x, y, color, size) {
  ctx.font = "800 " + size + "px system-ui";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function pong() {
  const starts = [["Einsteiger", "easy"], ["Normal", "normal"], ["Profi", "hard"], ["Demo", "demo"]];
  let mode, player, cpu, ball, left, right, serve, slow, wide, shield, cooldown, pointerY, trail;
  const blue = "#73dfff", lime = "#ceff70";
  function reset(option) {
    mode = option;
    player = cpu = H / 2;
    left = right = slow = wide = shield = 0;
    cooldown = { slow: 0, wide: 0, shield: 0 };
    pointerY = null;
    launch(1);
  }
  function launch(dir) {
    ball = { x: W / 2, y: H / 2, vx: dir * 350, vy: (Math.random() - .5) * 230 };
    serve = .65;
    trail = [];
  }
  function bounce(y, x, half, direction, previousX) {
    if (direction * ball.vx >= 0 || direction * (previousX - x) <= 0 ||
      direction * (ball.x - x) > 0 || Math.abs(ball.y - y) > half + 8) return;
    const speed = Math.min(660, length(ball.vx, ball.vy) + 26);
    const angle = clamp((ball.y - y) / half, -1, 1) * .85;
    ball.x = x;
    ball.vx = direction * Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
  }
  return {
    name: "Neon Pong",
    intro: "Erreiche fünf Punkte. Spiele selbst oder sieh der KI zu.",
    help: "↑ / ↓ oder W / S · Maus oder Finger auf dem Feld · Q Zeitlupe · E breite Kelle · R Schild · Esc Pause",
    starts,
    controls: { up: "↑", down: "↓", slow: "Zeitlupe", wide: "Breite Kelle", shield: "Schild" },
    bindings: { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", KeyQ: "slow", KeyE: "wide", KeyR: "shield" },
    reset,
    point(_x, y) { if (mode !== "demo") pointerY = y; },
    step(dt, input) {
      for (const key of Object.keys(cooldown)) cooldown[key] = Math.max(0, cooldown[key] - dt);
      slow = Math.max(0, slow - dt);
      wide = Math.max(0, wide - dt);
      shield = Math.max(0, shield - dt);
      if (mode !== "demo") {
        if (input.has("slow") && !cooldown.slow) { slow = 2.5; cooldown.slow = 8; }
        if (input.has("wide") && !cooldown.wide) { wide = 5; cooldown.wide = 12; }
        if (input.has("shield") && !cooldown.shield) { shield = 5; cooldown.shield = 15; }
      }
      const half = wide > 0 ? 93 : mode === "easy" ? 72 : 56;
      const move = Number(input.has("down")) - Number(input.has("up"));
      if (mode === "demo") player = approach(player, ball.y, 330 * dt);
      else if (move) { player += move * 465 * dt; pointerY = null; }
      else if (pointerY !== null) player = pointerY;
      player = clamp(player, half, H - half);
      const error = Math.sin((ball.x + ball.y) * .015) * (mode === "hard" ? 12 : 38);
      cpu = clamp(approach(cpu, ball.y + error, (mode === "hard" ? 390 : mode === "easy" ? 205 : 295) * dt), 48, H - 48);
      if (serve > 0) { serve -= dt; return; }
      trail.push([ball.x, ball.y]);
      if (trail.length > 14) trail.shift();
      const previousX = ball.x;
      const pace = slow > 0 ? .52 : 1;
      ball.x += ball.vx * dt * pace;
      ball.y += ball.vy * dt * pace;
      if (ball.y < 8 || ball.y > H - 8) {
        ball.y = clamp(ball.y, 8, H - 8);
        ball.vy *= -1;
      }
      bounce(player, 51, half, 1, previousX);
      bounce(cpu, W - 51, 48, -1, previousX);
      if (ball.x < 8 && shield > 0) {
        shield = 0;
        ball.x = 8;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x >= -8 && ball.x <= W + 8) return;
      const playerScored = ball.x > W;
      if (playerScored) left += 1;
      else right += 1;
      if (left === 5 || right === 5) {
        return { title: mode === "demo" ? "Demo beendet" : left === 5 ? "Du gewinnst!" : "KI gewinnt", copy: left + " : " + right };
      }
      launch(playerScored ? -1 : 1);
    },
    status() {
      const charge = (key) => cooldown[key] > 0 ? Math.ceil(cooldown[key]) + "s" : "bereit";
      return mode === "demo" ? "DEMO · " + left + " : " + right :
        left + " : " + right + "  ·  Q " + charge("slow") + "  ·  E " + charge("wide") + "  ·  R " + charge("shield");
    },
    draw(ctx) {
      field(ctx);
      ctx.setLineDash([6, 12]);
      ctx.strokeStyle = "#a9a6ca66";
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
      ctx.setLineDash([]);
      const half = wide > 0 ? 93 : mode === "easy" ? 72 : 56;
      ctx.fillStyle = lime; ctx.fillRect(29, player - half, 14, half * 2);
      ctx.fillStyle = blue; ctx.fillRect(W - 43, cpu - 48, 14, 96);
      if (shield > 0) { ctx.fillStyle = "#ff86bd"; ctx.fillRect(5, 0, 3, H); }
      for (const [index, [x, y]] of trail.entries()) {
        dot(ctx, x, y, 2 + index / 5, "rgba(180, 231, 255, " + index / 55 + ")");
      }
      dot(ctx, ball.x, ball.y, 8, slow > 0 ? "#ffc77c" : "#f6f3ff");
      text(ctx, left, W / 2 - 62, 79, lime, 58);
      text(ctx, right, W / 2 + 62, 79, blue, 58);
      if (serve > 0) text(ctx, "BEREIT", W / 2, H / 2 + 56, "#b5b5cb", 22);
    },
  };
}

function drift() {
  const cx = W / 2, cy = H / 2, rx = 292, ry = 166;
  const orange = "#ffad70";
  let car, elapsed, progress, lastAngle, best, offroad, trail, sample, assisted;
  function reset(mode) {
    assisted = mode !== "pro";
    car = { x: cx + rx, y: cy, vx: 0, vy: 0, heading: Math.PI / 2 };
    elapsed = progress = lastAngle = sample = 0;
    offroad = false;
    trail = [];
    best = record(assisted ? "drift-assist" : "drift-pro");
  }
  function ellipse(ctx, xRadius, yRadius, color, fill) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, xRadius, yRadius, 0, 0, TAU);
    if (fill) { ctx.fillStyle = color; ctx.fill(); }
    else { ctx.strokeStyle = color; ctx.stroke(); }
  }
  return {
    name: "Neon Drift",
    intro: "Drei Runden. Mit Fahrhilfe reicht Gas zum Einstieg; im Profimodus lenkst du selbst.",
    help: "↑ / W Gas · ↓ / S Bremse · ← → / A D lenken · Leertaste Drift · Esc Pause",
    starts: [["Mit Fahrhilfe", "assist"], ["Profi", "pro"]],
    controls: { left: "←", right: "→", gas: "Gas", brake: "Bremse", drift: "Drift" },
    bindings: { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "gas", KeyW: "gas", ArrowDown: "brake", KeyS: "brake", Space: "drift" },
    reset,
    step(dt, input) {
      const gas = input.has("gas"), brake = input.has("brake"), slide = input.has("drift");
      if (!elapsed && !gas) return;
      elapsed += dt;
      const speed = length(car.vx, car.vy);
      const steer = Number(input.has("right")) - Number(input.has("left"));
      const normalizedAngle = Math.atan2((car.y - cy) / ry, (car.x - cx) / rx);
      const lookahead = normalizedAngle + .23;
      const guide = Math.atan2(cy + ry * Math.sin(lookahead) - car.y, cx + rx * Math.cos(lookahead) - car.x);
      const error = mod(guide - car.heading + Math.PI, TAU) - Math.PI;
      const turn = !steer && assisted ? clamp(error * 2.3, -1, 1) : steer;
      car.heading += turn * (slide ? 3.7 : 2.65) * Math.min(1, speed / 75) * dt;
      const traction = 1 - Math.exp(-(slide ? 1.65 : 6.6) * dt);
      const forwardX = Math.cos(car.heading), forwardY = Math.sin(car.heading);
      const forwardSpeed = car.vx * forwardX + car.vy * forwardY;
      car.vx += (forwardX * forwardSpeed - car.vx) * traction;
      car.vy += (forwardY * forwardSpeed - car.vy) * traction;
      const engine = gas ? 365 : 0;
      const drag = Math.exp(-(brake ? 4 : offroad ? 3.5 : slide ? .62 : .46) * dt);
      car.vx = (car.vx + forwardX * engine * dt) * drag;
      car.vy = (car.vy + forwardY * engine * dt) * drag;
      const limit = offroad ? 130 : assisted && !steer ? 225 : 415;
      const cap = Math.min(1, limit / Math.max(1, length(car.vx, car.vy)));
      car.vx *= cap; car.vy *= cap;
      car.x = clamp(car.x + car.vx * dt, 14, W - 14);
      car.y = clamp(car.y + car.vy * dt, 14, H - 14);
      const dx = car.x - cx, dy = car.y - cy;
      const angle = Math.atan2(dy / ry, dx / rx);
      const delta = mod(angle - lastAngle + Math.PI, TAU) - Math.PI;
      offroad = length(dx / (rx + 57), dy / (ry + 57)) > 1 ||
        length(dx / (rx - 57), dy / (ry - 57)) < 1;
      // Crossing the infield or leaving the track cannot skip a sector.
      if (!offroad && Math.abs(delta) < .22) {
        const next = progress + delta;
        const expected = mod(next - angle + Math.PI, TAU) - Math.PI;
        if (Math.abs(expected) < .27) progress = next;
      }
      lastAngle = angle;
      sample += dt;
      if (sample > .035) {
        sample = 0;
        if (speed > 60) trail.push([car.x, car.y, slide]);
        if (trail.length > 26) trail.shift();
      }
      if (progress < TAU * 3) return;
      best = record(assisted ? "drift-assist" : "drift-pro", elapsed, (a, b) => a < b);
      return { title: "Ziel erreicht", copy: "Zeit " + clock(elapsed) + " · Bestzeit " + clock(best) };
    },
    status() {
      return "RUNDE " + clamp(1 + Math.floor(progress / TAU), 1, 3) + "/3 · " + clock(elapsed) +
        " · " + (offroad ? "NEBEN DER STRECKE" : "BESTZEIT " + (best === null ? "–" : clock(best)));
    },
    draw(ctx) {
      field(ctx, "#242033");
      ellipse(ctx, rx + 58, ry + 58, "#383348", true);
      ellipse(ctx, rx - 58, ry - 58, "#131627", true);
      ctx.lineWidth = 4;
      ellipse(ctx, rx + 58, ry + 58, "#ffad70", false);
      ellipse(ctx, rx - 58, ry - 58, "#9b594a", false);
      ctx.lineWidth = 2;
      ctx.setLineDash([11, 14]);
      ellipse(ctx, rx, ry, "#e8a79577", false);
      ctx.setLineDash([]);
      for (let row = 0; row < 2; row += 1) {
        for (let column = 0; column < 12; column += 1) {
          ctx.fillStyle = (row + column) % 2 ? "#17162a" : "#f6f3ff";
          ctx.fillRect(cx + rx - 60 + column * 10, cy - 8 + row * 8, 10, 8);
        }
      }
      text(ctx, "NEON DRIFT", cx, cy - 6, "#ffad70", 36);
      text(ctx, "3 RUNDEN  /  ZEITRENNEN", cx, cy + 28, "#b5b5cb", 18);
      trail.forEach(([x, y, slide], i) => {
        ctx.globalAlpha = (i + 1) / trail.length * .55;
        dot(ctx, x, y, slide ? 5 : 3, slide ? orange : "#fff2cf");
      });
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.heading);
      ctx.fillStyle = orange; ctx.fillRect(-15, -9, 30, 18);
      ctx.fillStyle = "#311d33"; ctx.fillRect(-4, -7, 11, 14);
      ctx.fillStyle = "#fff2cf"; ctx.fillRect(12, -8, 4, 5); ctx.fillRect(12, 3, 4, 5);
      ctx.restore();
    },
  };
}

function orbit() {
  const purple = "#bd9aff", blue = "#73dfff";
  const stars = Array.from({ length: 72 }, (_, i) => ({
    x: (i * 379 + 63) % W, y: (i * 197 + 43) % H, size: i % 5 ? 1 : 2,
  }));
  let ship, shots, foes, bolts, wave, remaining, spawnClock, fireClock, score, best, age;
  let spread, rate, power, autoFire;
  function reset(mode) {
    autoFire = mode !== "manual";
    ship = { x: W / 2, y: H - 75, hp: 3, invincible: 0, target: null };
    shots = []; foes = []; bolts = [];
    wave = remaining = spawnClock = fireClock = score = age = 0;
    spread = 0; rate = .24; power = 1;
    best = record("orbit");
    nextWave();
  }
  function nextWave() {
    wave += 1;
    remaining = 4 + wave * 2;
    spawnClock = .6;
    bolts.length = 0;
    shots.length = 0;
  }
  function spawn() {
    const boss = wave % 4 === 0 && remaining === 1;
    const heavy = !boss && wave > 1 && remaining % 3 === 0;
    foes.push({
      x: boss ? W / 2 : 55 + Math.random() * (W - 110), y: -32,
      hp: boss ? 16 + wave : heavy ? 3 : 1, size: boss ? 33 : heavy ? 21 : 14,
      speed: boss ? 44 : heavy ? 56 : Math.min(150, 70 + wave * 8),
      phase: Math.random() * TAU, fire: 1 + Math.random() * 2, boss, heavy,
    });
    remaining -= 1;
  }
  function hurt() {
    if (ship.invincible > 0) return;
    ship.hp -= 1;
    ship.invincible = 1.1;
  }
  function fire() {
    for (let i = -spread; i <= spread; i += 1) {
      shots.push({ x: ship.x, y: ship.y - 20, vx: i * 110 });
    }
  }
  function upgrade() {
    return {
      title: "Welle " + wave + " geschafft",
      copy: "Wähle ein Upgrade für die nächste Welle.",
      options: [
        [spread < 2 ? "Breiter Schuss" : "Mehr Schaden", () => {
          if (spread < 2) spread += 1;
          else power += 1;
          nextWave();
        }],
        [rate > .11 ? "Schnellfeuer" : "Mehr Schaden", () => {
          if (rate > .11) rate = Math.max(.11, rate - .045);
          else power += 1;
          nextWave();
        }],
        [ship.hp < 5 ? "+1 Schild" : "Mehr Schaden", () => {
          if (ship.hp < 5) ship.hp += 1;
          else power += 1;
          nextWave();
        }],
      ],
    };
  }
  return {
    name: "Orbit Siege",
    intro: "Wehre Angriffswellen ab. Wähle nach jeder Welle ein Upgrade.",
    help: "Pfeile / WASD bewegen · Leertaste feuern · Auf dem Feld ziehen, um zu steuern und zu feuern · Esc Pause",
    starts: [["Mit Autofeuer", "auto"], ["Manuell feuern", "manual"]],
    controls: { left: "←", right: "→", up: "↑", down: "↓", fire: "Feuer" },
    bindings: { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", Space: "fire" },
    reset,
    point(x, y, active) { if (active) ship.target = { x, y }; },
    release() { ship.target = null; },
    step(dt, input) {
      age += dt;
      ship.invincible = Math.max(0, ship.invincible - dt);
      const dx = Number(input.has("right")) - Number(input.has("left"));
      const dy = Number(input.has("down")) - Number(input.has("up"));
      if (dx || dy) {
        const speed = 350 * dt / length(dx, dy);
        ship.x += dx * speed; ship.y += dy * speed;
        ship.target = null;
      } else if (ship.target) {
        const tx = ship.target.x - ship.x, ty = ship.target.y - ship.y;
        const factor = Math.min(1, 540 * dt / Math.max(1, length(tx, ty)));
        ship.x += tx * factor; ship.y += ty * factor;
      }
      ship.x = clamp(ship.x, 18, W - 18);
      ship.y = clamp(ship.y, 44, H - 18);
      fireClock -= dt;
      if ((autoFire || input.has("fire") || ship.target) && fireClock <= 0) { fire(); fireClock = rate; }
      spawnClock -= dt;
      if (remaining && spawnClock <= 0) { spawn(); spawnClock = Math.max(.3, .76 - wave * .036); }
      for (const foe of foes) {
        if (!foe.boss || foe.y < 118) foe.y += foe.speed * dt;
        foe.x = clamp(foe.x + Math.sin(age * 2 + foe.phase) * (foe.boss ? 92 : 54) * dt, 30, W - 30);
        foe.fire -= dt;
        if (foe.fire <= 0 && foe.y > 22) {
          const angle = Math.atan2(ship.y - foe.y, ship.x - foe.x);
          for (const offset of foe.boss ? [-.25, 0, .25] : [0]) {
            bolts.push({ x: foe.x, y: foe.y, vx: Math.cos(angle + offset) * 208, vy: Math.sin(angle + offset) * 208 });
          }
          foe.fire = foe.boss ? .8 : 2.6;
        }
        if (length(ship.x - foe.x, ship.y - foe.y) < foe.size + 12) {
          hurt();
          if (!foe.boss) foe.hp = 0;
        } else if (foe.y > H + 30) {
          if (!autoFire) hurt();
          foe.hp = 0;
        }
      }
      for (const shot of shots) {
        shot.y -= 600 * dt;
        shot.x += shot.vx * dt;
        const hit = foes.find((foe) => foe.hp > 0 && length(foe.x - shot.x, foe.y - shot.y) < foe.size + 5);
        if (!hit) continue;
        hit.hp -= power;
        if (hit.hp <= 0) score += hit.boss ? 600 : hit.heavy ? 180 : 90;
        shot.y = -20;
      }
      for (const bolt of bolts) {
        bolt.x += bolt.vx * dt;
        bolt.y += bolt.vy * dt;
        if (length(ship.x - bolt.x, ship.y - bolt.y) < 15) {
          hurt();
          bolt.y = -30;
        }
      }
      foes = foes.filter((foe) => foe.hp > 0);
      shots = shots.filter((shot) => shot.y > -12 && shot.x > -12 && shot.x < W + 12);
      bolts = bolts.filter((bolt) => bolt.y > -12 && bolt.y < H + 12 && bolt.x > -12 && bolt.x < W + 12);
      if (ship.hp <= 0) {
        best = record("orbit", score, (a, b) => a > b);
        return { title: "Mission beendet", copy: "Punkte " + score + " · Rekord " + best + " · Welle " + wave };
      }
      if (!remaining && !foes.length) {
        best = record("orbit", score, (a, b) => a > b);
        return upgrade();
      }
    },
    status() {
      return "WELLE " + wave + " · SCHILD " + ship.hp + " · PUNKTE " + score + " · REKORD " + (best ?? "–");
    },
    draw(ctx) {
      ctx.fillStyle = "#101025"; ctx.fillRect(0, 0, W, H);
      for (const star of stars) {
        ctx.fillStyle = star.size === 1 ? "#6a6398" : "#c8b6ff";
        ctx.fillRect(star.x, (star.y + age * (26 + star.size * 17)) % H, star.size, star.size * 2);
      }
      for (const shot of shots) {
        ctx.fillStyle = blue; ctx.fillRect(shot.x - 2, shot.y - 10, 4, 15);
      }
      for (const bolt of bolts) dot(ctx, bolt.x, bolt.y, 5, "#ff779b");
      for (const foe of foes) {
        ctx.fillStyle = foe.heavy ? "#ffa65c" : "#ff779b";
        ctx.strokeStyle = "#f6c6ff";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(foe.x, foe.y + foe.size);
        ctx.lineTo(foe.x - foe.size, foe.y - foe.size * .65);
        ctx.lineTo(foe.x, foe.y - foe.size * .28);
        ctx.lineTo(foe.x + foe.size, foe.y - foe.size * .65);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        if (foe.hp > 1) text(ctx, foe.hp, foe.x, foe.y - foe.size, "#fff3ff", 14);
      }
      if (ship.invincible > 0 && Math.floor(age * 13) % 2) return;
      ctx.strokeStyle = purple; ctx.fillStyle = "#493374"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ship.x, ship.y - 24);
      ctx.lineTo(ship.x + 18, ship.y + 14);
      ctx.lineTo(ship.x, ship.y + 8);
      ctx.lineTo(ship.x - 18, ship.y + 14);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      dot(ctx, ship.x, ship.y - 2, 4, blue);
    },
  };
}



function breaker() {
  const colors = ["#5fe7ff", "#b497ff", "#ff83ae", "#d7ff73"];
  let paddle, aim, ball, blocks, level, lives, points, best, charge, power, sparks, previousBoost;
  function dock() {
    ball = { x: paddle, y: H - 61, vx: 0, vy: 0, ready: true };
  }
  function rack() {
    const width = 74, height = 23;
    blocks = [];
    for (let row = 0; row < Math.min(7, level + 3); row += 1) {
      for (let col = 0; col < 10; col += 1) {
        if (level % 2 === 0 && (col + row) % 6 === 0) continue;
        blocks.push({
          x: 53 + col * 80, y: 64 + row * 30, w: width, h: height,
          hp: level > 1 && (row + col) % 3 === 0 ? 2 : 1, color: colors[row % colors.length],
        });
      }
    }
    dock();
  }
  function reset() {
    paddle = W / 2;
    aim = null;
    level = 1;
    lives = 3;
    points = charge = power = 0;
    best = record("breaker");
    sparks = [];
    previousBoost = false;
    rack();
  }
  function effect(x, y, color) {
    for (let i = 0; i < 10; i += 1) {
      const angle = Math.random() * TAU;
      sparks.push({ x, y, vx: Math.cos(angle) * 135, vy: Math.sin(angle) * 135, life: .36, color });
    }
  }
  function finish() {
    best = record("breaker", points, (a, b) => a > b);
    return { title: "Spiel beendet", copy: "Punkte " + points + " · Rekord " + best + " · Level " + level };
  }
  return {
    name: "Prism Break",
    intro: "Zerstöre die Blöcke. Nach acht Treffern ist Prismakraft bereit.",
    help: "← → / A D bewegen · Leertaste Ball starten · E Prismakraft · Esc Pause",
    starts: [["Spiel starten"]],
    controls: { left: "←", right: "→", launch: "Ball", boost: "Prisma" },
    bindings: { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", Space: "launch", KeyE: "boost" },
    reset,
    point(x) { aim = x; },
    step(dt, input) {
      const move = Number(input.has("right")) - Number(input.has("left"));
      if (move) { paddle += move * 640 * dt; aim = null; }
      else if (aim !== null) paddle = aim;
      paddle = clamp(paddle, 58, W - 58);
      const boost = input.has("boost");
      if (boost && !previousBoost && charge >= 8 && !ball.ready) { charge = 0; power = 3; }
      previousBoost = boost;
      power = Math.max(0, power - dt);
      for (const spark of sparks) {
        spark.life -= dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
      }
      sparks = sparks.filter((spark) => spark.life > 0);
      if (ball.ready) {
        ball.x = paddle;
        if (!input.has("launch")) return;
        ball.ready = false;
        ball.vx = Math.random() < .5 ? -165 : 165;
        ball.vy = -360;
      }
      const steps = Math.max(1, Math.ceil(dt * Math.hypot(ball.vx, ball.vy) / 5));
      for (let step = 0; step < steps; step += 1) {
        const oldX = ball.x, oldY = ball.y;
        ball.x += ball.vx * dt / steps;
        ball.y += ball.vy * dt / steps;
        if (ball.x <= 8 || ball.x >= W - 8) {
          ball.x = clamp(ball.x, 8, W - 8);
          ball.vx *= -1;
        }
        if (ball.y <= 8) { ball.y = 8; ball.vy = Math.abs(ball.vy); }
        if (ball.vy > 0 && oldY <= H - 55 && ball.y > H - 55 && Math.abs(ball.x - paddle) <= 63) {
          const angle = clamp((ball.x - paddle) / 58, -1, 1) * 1.05;
          const speed = Math.min(660, Math.hypot(ball.vx, ball.vy) + 22);
          ball.vx = Math.sin(angle) * speed;
          ball.vy = -Math.cos(angle) * speed;
          ball.y = H - 55;
        }
        const block = blocks.find((item) => ball.x + 7 > item.x && ball.x - 7 < item.x + item.w &&
          ball.y + 7 > item.y && ball.y - 7 < item.y + item.h);
        if (!block) continue;
        block.hp -= power > 0 ? 2 : 1;
        points += 10;
        charge = Math.min(8, charge + 1);
        effect(ball.x, ball.y, block.color);
        if (block.hp <= 0) blocks.splice(blocks.indexOf(block), 1);
        if (!power) {
          if (oldX <= block.x - 7 || oldX >= block.x + block.w + 7) {
            ball.x = oldX;
            ball.vx *= -1;
          } else {
            ball.y = oldY;
            ball.vy *= -1;
          }
        }
      }
      if (!blocks.length) {
        level += 1;
        power = 0;
        rack();
      } else if (ball.y > H + 12) {
        lives -= 1;
        if (!lives) return finish();
        power = 0;
        dock();
      }
    },
    status() {
      return "LEVEL " + level + " · LEBEN " + lives + " · " + points + " P · PRISMA " + (power ? "AKTIV" : charge + "/8") + " · REKORD " + (best ?? "–");
    },
    draw(ctx) {
      field(ctx, "#2b2746");
      for (const block of blocks) {
        ctx.fillStyle = block.color;
        ctx.fillRect(block.x, block.y, block.w, block.h);
        if (block.hp > 1) {
          ctx.fillStyle = "#232544";
          ctx.fillRect(block.x + 4, block.y + 4, block.w - 8, block.h - 8);
        }
      }
      for (const spark of sparks) {
        ctx.globalAlpha = spark.life / .36;
        dot(ctx, spark.x, spark.y, 3, spark.color);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#5fe7ff";
      ctx.fillRect(paddle - 58, H - 47, 116, 12);
      dot(ctx, ball.x, ball.y, power ? 11 : 8, power ? "#d7ff73" : "#fff");
      if (ball.ready) text(ctx, "LEERTASTE / BALL", W / 2, H - 112, "#e8dbff", 22);
    },
  };
}

function runner() {
  const centers = [265, 450, 635], line = H - 79;
  let lane, x, items, age, timer, points, combo, health, best, flash, oldLeft, oldRight;
  function reset() {
    lane = 1;
    x = centers[lane];
    items = [];
    age = points = combo = flash = 0;
    timer = .7;
    health = 3;
    best = record("runner");
    oldLeft = oldRight = false;
  }
  function spawn() {
    const barrier = Math.floor(Math.random() * 3);
    items.push({ lane: barrier, y: -32, hazard: true });
    const available = [0, 1, 2].filter((candidate) => candidate !== barrier);
    const safe = available[Math.floor(Math.random() * available.length)];
    if (age > 25 && Math.random() < .5) items.push({ lane: available.find((candidate) => candidate !== safe), y: -32, hazard: true });
    items.push({ lane: safe, y: -32, hazard: false });
  }
  return {
    name: "Pulse Runner",
    intro: "Wechsle die Spur. Sammle Energie für Combos und weiche Barrieren aus.",
    help: "← → / A D Spur wechseln · auf eine Spur tippen oder klicken · Esc Pause",
    starts: [["Lauf starten"]],
    controls: { left: "←", right: "→" },
    bindings: { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" },
    reset,
    point(px, _py, active) { if (active) lane = clamp(Math.round((px - centers[0]) / 185), 0, 2); },
    step(dt, input) {
      const left = input.has("left"), right = input.has("right");
      lane = clamp(lane + Number(right && !oldRight) - Number(left && !oldLeft), 0, 2);
      oldLeft = left;
      oldRight = right;
      x = approach(x, centers[lane], 2400 * dt);
      age += dt;
      flash = Math.max(0, flash - dt);
      timer -= dt;
      if (timer <= 0) {
        spawn();
        timer = Math.max(.51, 1.05 - age * .007);
      }
      const speed = Math.min(700, 290 + age * 5.2);
      for (const item of items) {
        item.y += speed * dt;
        if (item.done || item.y < line) continue;
        item.done = true;
        const hit = Math.abs(x - centers[item.lane]) < 65;
        if (hit && item.hazard) {
          health -= 1;
          combo = 0;
          flash = .22;
        } else if (hit) {
          combo += 1;
          points += 50 * Math.min(8, combo);
        } else if (!item.hazard) {
          combo = 0;
        } else {
          points += 10;
        }
      }
      items = items.filter((item) => item.y < H + 35 && (!item.done || item.hazard));
      if (health > 0) return;
      best = record("runner", points, (a, b) => a > b);
      return { title: "Lauf beendet", copy: "Punkte " + points + " · Rekord " + best + " · " + clock(age) };
    },
    status() {
      return "LEBEN " + health + " · COMBO ×" + combo + " · " + points + " P · REKORD " + (best ?? "–");
    },
    draw(ctx) {
      field(ctx, "#2b1a37");
      ctx.fillStyle = "#171327";
      ctx.fillRect(175, 0, 550, H);
      for (const center of centers) {
        ctx.fillStyle = center === centers[lane] ? "#2c2545" : "#221d37";
        ctx.fillRect(center - 82, 0, 164, H);
        ctx.fillStyle = "#674469";
        for (let y = -60 + age * 190 % 60; y < H; y += 60) ctx.fillRect(center - 86, y, 2, 32);
      }
      for (const item of items) {
        const cx = centers[item.lane];
        if (item.hazard) {
          ctx.fillStyle = "#ff779b";
          ctx.fillRect(cx - 58, item.y - 14, 116, 28);
          ctx.fillStyle = "#512343";
          ctx.fillRect(cx - 52, item.y - 8, 104, 16);
        } else {
          const radius = 10 + Math.sin(age * 8) * 2;
          dot(ctx, cx, item.y, radius + 5, "#d7ff7333");
          dot(ctx, cx, item.y, radius, "#d7ff73");
        }
      }
      ctx.fillStyle = "#d1bcff";
      ctx.beginPath();
      ctx.moveTo(x, line - 20); ctx.lineTo(x + 20, line);
      ctx.lineTo(x, line + 20); ctx.lineTo(x - 20, line);
      ctx.closePath(); ctx.fill();
      if (flash) {
        ctx.fillStyle = "rgba(255, 119, 155, " + flash + ")";
        ctx.fillRect(0, 0, W, H);
      }
    },
  };
}

export const games = { pong, drift, orbit, breaker, runner };
