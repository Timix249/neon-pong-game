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
    const saved = localStorage.getItem("neon-arcade-v2-" + key);
    const best = saved === null ? null : Number(saved);
    if (value !== undefined && (best === null || improves(value, best))) {
      localStorage.setItem("neon-arcade-v2-" + key, String(value));
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
  const starts = [["Spielen", "normal"], ["Profi", "hard"], ["Demo", "demo"]];
  let mode, player, cpu, ball, left, right, serve, slow, wide, shield, cooldown, pointerY;
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
    serve = .85;
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
      const half = wide > 0 ? 93 : 56;
      const move = Number(input.has("down")) - Number(input.has("up"));
      if (mode === "demo") player = approach(player, ball.y, 330 * dt);
      else if (move) { player += move * 465 * dt; pointerY = null; }
      else if (pointerY !== null) player = pointerY;
      player = clamp(player, half, H - half);
      const error = Math.sin((ball.x + ball.y) * .015) * (mode === "hard" ? 12 : 38);
      cpu = clamp(approach(cpu, ball.y + error, (mode === "hard" ? 390 : 295) * dt), 48, H - 48);
      if (serve > 0) { serve -= dt; return; }
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
      const half = wide > 0 ? 93 : 56;
      ctx.fillStyle = lime; ctx.fillRect(29, player - half, 14, half * 2);
      ctx.fillStyle = blue; ctx.fillRect(W - 43, cpu - 48, 14, 96);
      if (shield > 0) { ctx.fillStyle = "#ff86bd"; ctx.fillRect(5, 0, 3, H); }
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
  let car, elapsed, progress, lastAngle, best, offroad, trail, sample;
  function reset() {
    car = { x: cx + rx, y: cy, vx: 0, vy: 0, heading: Math.PI / 2 };
    elapsed = progress = lastAngle = sample = 0;
    offroad = false;
    trail = [];
    best = record("drift");
  }
  function ellipse(ctx, xRadius, yRadius, color, fill) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, xRadius, yRadius, 0, 0, TAU);
    if (fill) { ctx.fillStyle = color; ctx.fill(); }
    else { ctx.strokeStyle = color; ctx.stroke(); }
  }
  return {
    name: "Neon Drift",
    intro: "Fahre im Uhrzeigersinn drei Runden. Drifte, um eng einzulenken.",
    help: "↑ / W Gas · ↓ / S Bremse · ← → / A D lenken · Leertaste Drift · Esc Pause",
    starts: [["Rennen starten"]],
    controls: { left: "←", right: "→", gas: "Gas", brake: "Bremse", drift: "Drift" },
    bindings: { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "gas", KeyW: "gas", ArrowDown: "brake", KeyS: "brake", Space: "drift" },
    reset,
    step(dt, input) {
      const gas = input.has("gas"), brake = input.has("brake"), slide = input.has("drift");
      if (!elapsed && !gas) return;
      elapsed += dt;
      const speed = length(car.vx, car.vy);
      const steer = Number(input.has("right")) - Number(input.has("left"));
      car.heading += steer * (slide ? 3.7 : 2.65) * Math.min(1, speed / 75) * dt;
      const traction = 1 - Math.exp(-(slide ? 1.65 : 6.6) * dt);
      const forwardX = Math.cos(car.heading), forwardY = Math.sin(car.heading);
      const forwardSpeed = car.vx * forwardX + car.vy * forwardY;
      car.vx += (forwardX * forwardSpeed - car.vx) * traction;
      car.vy += (forwardY * forwardSpeed - car.vy) * traction;
      const engine = gas ? 365 : 0;
      const drag = Math.exp(-(brake ? 4 : offroad ? 3.5 : slide ? .62 : .46) * dt);
      car.vx = (car.vx + forwardX * engine * dt) * drag;
      car.vy = (car.vy + forwardY * engine * dt) * drag;
      const limit = offroad ? 130 : 415;
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
      best = record("drift", elapsed, (a, b) => a < b);
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
  let spread, rate, power;
  function reset() {
    ship = { x: W / 2, y: H - 75, hp: 3, invincible: 0, target: null };
    shots = []; foes = []; bolts = [];
    wave = remaining = spawnClock = fireClock = score = age = 0;
    spread = 0; rate = .24; power = 1;
    best = record("orbit");
    nextWave();
  }
  function nextWave() {
    wave += 1;
    remaining = 5 + wave * 2;
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
    starts: [["Mission starten"]],
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
      if ((input.has("fire") || ship.target) && fireClock <= 0) { fire(); fireClock = rate; }
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
          hurt();
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

export const games = { pong, drift, orbit };
