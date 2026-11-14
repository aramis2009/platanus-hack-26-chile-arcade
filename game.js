const W = 800;
const H = 600;
const WORLD = 1800;
const TOP = 145;
const BOTTOM = 520;
const END = 130;
const C = { grass: 0x164a32, stripe: 0xffffff, lime: 0xe1ff00, gold: 0xffc857, cream: 0xfff4cf, ink: 0x092218, red: 0xf06b50, blue: 0x69b7e8, black: 0x07180f };

// Cabinet codes match the physical wiring and must remain unchanged.
const CABINET_KEYS = {
  P1_U: ['w'], P1_D: ['s'], P1_L: ['a'], P1_R: ['d'],
  P1_1: ['u'], P1_2: ['i'], P1_3: ['o'], P1_4: ['j'], P1_5: ['k'], P1_6: ['l'],
  P2_U: ['ArrowUp'], P2_D: ['ArrowDown'], P2_L: ['ArrowLeft'], P2_R: ['ArrowRight'],
  P2_1: ['r'], P2_2: ['t'], P2_3: ['y'], P2_4: ['f'], P2_5: ['g'], P2_6: ['h'],
  START1: ['Enter'], START2: ['2'],
};
const KEY_TO_ARCADE = {};
for (const [code, keys] of Object.entries(CABINET_KEYS)) for (const key of keys) KEY_TO_ARCADE[key.toLowerCase()] = code;

const config = {
  type: Phaser.AUTO, width: W, height: H, parent: 'game-root', backgroundColor: '#07180f',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: { create, update },
};
new Phaser.Game(config);

function create() {
  const s = this;
  s.inputState = { held: {}, pressed: {} };
  const down = e => { const c = KEY_TO_ARCADE[(e.key || '').toLowerCase()]; if (c) { if (!s.inputState.held[c]) s.inputState.pressed[c] = true; s.inputState.held[c] = true; } };
  const up = e => { const c = KEY_TO_ARCADE[(e.key || '').toLowerCase()]; if (c) s.inputState.held[c] = false; };
  window.addEventListener('keydown', down); window.addEventListener('keyup', up);
  s.events.once('shutdown', () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); });
  s.phase = 'title'; s.players = [[], []]; s.possession = 0; s.scores = [0, 0]; s.turnoverUntil = 0; s.pass = null; s.twoPlayers = false; s.cpuThrowAt = 0;
  s.fieldArt = s.add.graphics(); s.fieldMarks = []; drawField(s);
  s.fieldMarks.forEach(mark => mark.setVisible(false));
  s.cameras.main.setBounds(0, 0, WORLD, H).setScroll(WORLD / 2 - W / 2, 0);
  s.hud = s.add.text(W / 2, 18, '', { fontFamily: 'monospace', fontSize: '17px', color: '#fff4cf', fontStyle: 'bold', align: 'center' }).setOrigin(.5, 0).setScrollFactor(0).setDepth(20);
  s.help = s.add.text(W / 2, H - 16, '', { fontFamily: 'monospace', fontSize: '12px', color: '#d9e8c8', align: 'center' }).setOrigin(.5, 1).setScrollFactor(0).setDepth(20);
  s.titleTag = s.add.text(W / 2, 112, 'PLATANUS PRESENTS', { fontFamily: 'monospace', fontSize: '16px', color: '#e1ff00', fontStyle: 'bold' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.title = s.add.text(W / 2, 228, 'PLATANANA\nBOWL', { fontFamily: 'monospace', fontSize: '65px', color: '#fff4cf', fontStyle: 'bold', align: 'center', stroke: '#092218', strokeThickness: 8 }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.tagline = s.add.text(W / 2, 330, 'RUN. PASS. STEAL THE BANANA.', { fontFamily: 'monospace', fontSize: '17px', color: '#bce5bd', fontStyle: 'bold' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.modeText = s.add.text(W / 2, 388, '1 PLAYER: P1 VS CPU     •     2 PLAYERS: P1 VS P2', { fontFamily: 'monospace', fontSize: '13px', color: '#fff4cf', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.prompt = s.add.text(W / 2, 476, 'PRESS START  •  ENTER', { fontFamily: 'monospace', fontSize: '20px', color: '#e1ff00', fontStyle: 'bold' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.help.setText('MOVE: WASD / ARROWS     PASS: U / R     LONG PASS: O / Y     JUKE / TACKLE: I / T');
  s.cameras.main.setFollowOffset(0, 0);
}

function update(time, delta) {
  const s = this, dt = Math.min(delta, 40);
  if (s.phase === 'title') {
    s.prompt.setAlpha(.55 + Math.sin(time / 220) * .4);
    if (s.inputState.pressed.START1 || s.inputState.pressed.START2) startMatch(s, time);
  } else if (s.phase === 'playing') {
    if (s.inputState.pressed.START1 || s.inputState.pressed.START2) { s.phase = 'paused'; s.message.setText('PAUSED\nPRESS START TO RESUME').setVisible(true); }
    else playFrame(s, time, dt);
  } else if (s.phase === 'paused') {
    if (s.inputState.pressed.START1 || s.inputState.pressed.START2) { s.phase = 'playing'; s.message.setVisible(false); }
  } else if (s.phase === 'over' && (s.inputState.pressed.START1 || s.inputState.pressed.START2)) startMatch(s, time);
  s.inputState.pressed = {};
}

function startMatch(s, time) {
  s.scores = [0, 0]; s.possession = 0; s.pass = null; s.twoPlayers = false; s.phase = 'playing'; s.turnoverUntil = time + 1700;
  s.fieldMarks.forEach(mark => mark.setVisible(true));
  s.titleTag.setVisible(false); s.title.setVisible(false); s.tagline.setVisible(false); s.modeText.setVisible(false); s.prompt.setVisible(false); s.message?.destroy();
  s.message = s.add.text(W / 2, H / 2, '', { fontFamily: 'monospace', fontSize: '30px', color: '#e1ff00', fontStyle: 'bold', align: 'center', stroke: '#092218', strokeThickness: 6 }).setOrigin(.5).setScrollFactor(0).setDepth(30);
  makeTeams(s); updateHud(s); s.cameras.main.startFollow(s.players[s.possession][0], false, .08, 0);
}

function makeTeams(s) {
  s.players.flat().forEach(p => p.root.destroy()); s.players = [[], []];
  const starts = [[360, 235, 285, 305], [660, 700, 760, 625]];
  for (let team = 0; team < 2; team++) {
    for (let i = 0; i < 4; i++) {
      const p = createPlayer(s, team, i, starts[team][i], i === 0 ? 333 : 225 + i * 58);
      s.players[team].push(p);
    }
  }
  setPossession(s, 0);
}

function createPlayer(s, team, number, x, y) {
  const color = team === 0 ? C.lime : C.red;
  const root = s.add.container(x, y).setDepth(6);
  root.add(s.add.ellipse(0, 28, 33, 8, C.black, .6));
  root.add(s.add.rectangle(0, 7, 22, 31, color).setStrokeStyle(2, C.cream));
  root.add(s.add.circle(0, -15, 12, 0xf0c49a).setStrokeStyle(2, C.cream));
  root.add(s.add.arc(0, -16, 13, 205, 335, false, C.ink).setStrokeStyle(4, team === 0 ? C.cream : C.ink));
  root.add(s.add.rectangle(-7, 29, 7, 17, C.cream)); root.add(s.add.rectangle(7, 29, 7, 17, C.cream));
  root.add(s.add.rectangle(-17, 5, 7, 21, color).setRotation(-.3)); root.add(s.add.rectangle(17, 5, 7, 21, color).setRotation(.3));
  root.add(s.add.text(0, 6, String(number + 1), { fontFamily: 'monospace', fontSize: '9px', color: team === 0 ? '#092218' : '#fff4cf', fontStyle: 'bold' }).setOrigin(.5));
  const roleLabel = s.add.text(0, -43, '', { fontFamily: 'monospace', fontSize: '9px', color: '#fff4cf', fontStyle: 'bold', stroke: '#07180f', strokeThickness: 3 }).setOrigin(.5);
  root.add(roleLabel);
  const controlLabel = s.add.text(0, -59, team === 0 ? 'P1' : 'P2', { fontFamily: 'monospace', fontSize: '12px', color: team === 0 ? '#e1ff00' : '#ff8e7a', fontStyle: 'bold', stroke: '#07180f', strokeThickness: 4 }).setOrigin(.5).setVisible(false);
  root.add(controlLabel);
  const banana = makeBanana(s, 19, -8, .45); root.add(banana); banana.setVisible(false);
  return { root, banana, roleLabel, controlLabel, team, number, position: number, x, y, jukeUntil: 0, tackleUntil: 0 };
}

function playFrame(s, time, dt) {
  if (['P2_U', 'P2_D', 'P2_L', 'P2_R', 'P2_1', 'P2_2'].some(k => held(s, k) || s.inputState.pressed[k])) s.twoPlayers = true;
  const carrier = s.players[s.possession][0], attack = s.possession === 0 ? 1 : -1;
  const human0 = s.possession === 0 ? s.players[0][0] : nearestPlayer(s.players[0], carrier);
  const human1 = s.possession === 1 ? s.players[1][0] : nearestPlayer(s.players[1], carrier);
  const controlled = s.twoPlayers ? [human0, human1] : [human0];
  const controlledSet = new Set(controlled);
  for (let team = 0; team < 2; team++) {
    const members = s.players[team];
    for (const p of members) {
      let vx = 0, vy = 0;
      p.roleLabel.setText(roleName(p.position, team === s.possession));
      p.controlLabel.setVisible(controlledSet.has(p));
      if (controlledSet.has(p)) {
        const pre = team === 0 ? 'P1_' : 'P2_';
        vx = (held(s, pre + 'R') ? 1 : 0) - (held(s, pre + 'L') ? 1 : 0);
        vy = (held(s, pre + 'D') ? 1 : 0) - (held(s, pre + 'U') ? 1 : 0);
        if (p === carrier && !s.pass && (s.inputState.pressed[pre + '1'] || s.inputState.pressed[pre + '3'])) {
          throwBanana(s, p, vx, vy, time, s.inputState.pressed[pre + '3']);
        }
        if (s.inputState.pressed[pre + '2']) {
          if (team === s.possession) p.jukeUntil = time + 320;
          else p.tackleUntil = time + 360;
        }
      } else if (p === carrier) {
        if (!s.pass) {
          const intent = cpuCarryIntent(s, p, attack, time);
          vx = intent.vx; vy = intent.vy;
          if (intent.receiver && time >= s.cpuThrowAt) {
            throwBanana(s, p, attack, Math.sign(intent.receiver.y - p.y), time, intent.longPass, intent.receiver);
            s.cpuThrowAt = time + 1450;
          }
        }
      } else if (team === s.possession) {
        const [targetX, targetY] = offenseTarget(s, p, carrier, attack, time);
        vx = Phaser.Math.Clamp((targetX - p.x) / 120, -1, 1);
        vy = Phaser.Math.Clamp((targetY - p.y) / 90, -1, 1);
      } else if (team !== s.possession) {
        const [targetX, targetY] = defenseTarget(s, p, carrier, attack, time);
        vx = Phaser.Math.Clamp((targetX - p.x) / 115, -1, 1);
        vy = Phaser.Math.Clamp((targetY - p.y) / 85, -1, 1);
      }
      const mag = Math.hypot(vx, vy) || 1;
      const dashing = time < p.jukeUntil || time < p.tackleUntil;
      const chaseGap = team !== s.possession ? Phaser.Math.Distance.Between(p.x, p.y, carrier.x, carrier.y) : 0;
      const speed = controlledSet.has(p) ? (dashing ? 325 : 238) : team === s.possession ? 178 : chaseGap > 160 ? 218 : 188;
      p.x = Phaser.Math.Clamp(p.x + vx / mag * speed * dt / 1000, 24, WORLD - 24);
      p.y = Phaser.Math.Clamp(p.y + vy / mag * speed * dt / 1000, TOP + 30, BOTTOM - 27);
      p.root.setPosition(p.x, p.y).setScale(team === s.possession ? attack : -attack, 1);
      p.banana.setVisible(p === carrier && !s.pass);
    }
  }
  if (s.pass) updatePass(s, dt, time);
  const current = s.players[s.possession][0];
  if (!s.pass && time > s.turnoverUntil) {
    for (const defender of s.players[1 - s.possession]) {
      const distance = Phaser.Math.Distance.Between(current.x, current.y, defender.x, defender.y);
      if (distance < (time < defender.tackleUntil ? 39 : 25)) {
        setPossession(s, 1 - s.possession, defender); s.turnoverUntil = time + 1400;
        s.message.setText('TURNOVER!').setAlpha(1); s.messageUntil = time + 800; break;
      }
    }
  }
  if (s.messageUntil && time > s.messageUntil) { s.message.setText(''); s.messageUntil = 0; }
  const carrierNow = s.players[s.possession][0];
  const scored = s.possession === 0 ? carrierNow.x >= WORLD - END : carrierNow.x <= END;
  if (scored) scoreTouchdown(s, time);
  updateHud(s);
}

function roleName(position, offense) {
  const offenseRoles = ['QB', 'WR', 'WR', 'RB'];
  const defenseRoles = ['LB', 'CB', 'CB', 'EDGE'];
  return (offense ? offenseRoles : defenseRoles)[position];
}

function offenseTarget(s, p, carrier, attack, time) {
  if (p.position === 1 || p.position === 2) {
    const lane = p.position === 1 ? TOP + 86 : BOTTOM - 88;
    const route = Math.sin(time / 430 + p.position * 2) * 22;
    return [Phaser.Math.Clamp(carrier.x + attack * (175 + p.position * 28), END + 42, WORLD - END - 42), lane + route];
  }
  const rusher = nearestPlayer(s.players[1 - s.possession], carrier);
  if (p.position === 3) {
    const close = Phaser.Math.Distance.Between(rusher.x, rusher.y, carrier.x, carrier.y) < 210;
    return [carrier.x + attack * (close ? 72 : 48), close ? Phaser.Math.Linear(carrier.y, rusher.y, .55) : carrier.y + 58];
  }
  return [carrier.x - attack * 42, carrier.y + 48];
}

function defenseTarget(s, p, carrier, attack, time) {
  if (p.position === 1 || p.position === 2) {
    const gap = Phaser.Math.Distance.Between(p.x, p.y, carrier.x, carrier.y);
    if (gap > 210) {
      const side = p.position === 1 ? -1 : 1;
      return [carrier.x + attack * 58, Phaser.Math.Clamp(carrier.y + side * 42, TOP + 35, BOTTOM - 35)];
    }
    const offense = s.players[s.possession];
    let receiver = offense.find(q => q.position === p.position && q !== carrier);
    if (!receiver) receiver = offense.find(q => (q.position === 1 || q.position === 2) && q !== carrier);
    if (receiver) return [receiver.x + attack * 34, receiver.y + (p.position === 1 ? 18 : -18)];
  }
  if (p.position === 3) return [carrier.x + attack * 10, carrier.y];
  return [carrier.x + attack * 46, Phaser.Math.Clamp(carrier.y + (p.y < carrier.y ? -24 : 24), TOP + 35, BOTTOM - 35)];
}

function cpuCarryIntent(s, carrier, attack, time) {
  const defenders = s.players[1 - s.possession];
  const nearest = defenders.reduce((best, p) => {
    const distance = Phaser.Math.Distance.Between(carrier.x, carrier.y, p.x, p.y);
    return distance < best.distance ? { player: p, distance } : best;
  }, { player: defenders[0], distance: Infinity });
  if (nearest.distance < 175 && time > (carrier.evadeUntil || 0)) {
    carrier.evadeSide = nearest.player.y >= carrier.y ? -1 : 1;
    carrier.evadeUntil = time + 650;
  }
  const center = (TOP + BOTTOM) / 2;
  const targetY = time < (carrier.evadeUntil || 0)
    ? Phaser.Math.Clamp(carrier.y + carrier.evadeSide * 105, TOP + 42, BOTTOM - 42)
    : carrier.y + (center - carrier.y) * .12;
  const receiver = nearest.distance < 155 ? findOpenReceiver(s, carrier, attack) : null;
  return { vx: attack, vy: Phaser.Math.Clamp((targetY - carrier.y) / 55, -1, 1), receiver, longPass: receiver ? Phaser.Math.Distance.Between(carrier.x, carrier.y, receiver.x, receiver.y) > 310 : false };
}

function findOpenReceiver(s, carrier, attack) {
  const defenders = s.players[1 - s.possession];
  let best = null, bestScore = -Infinity;
  for (const receiver of s.players[s.possession]) {
    if (receiver === carrier) continue;
    const dx = (receiver.x - carrier.x) * attack, dy = Math.abs(receiver.y - carrier.y);
    const distance = Math.hypot(dx, dy);
    if (dx < 50 || distance > 620) continue;
    const space = Math.min(...defenders.map(d => Phaser.Math.Distance.Between(receiver.x, receiver.y, d.x, d.y)));
    if (space < 85) continue;
    const score = space + Math.min(dx, 300) * .35 - distance * .18;
    if (score > bestScore) { best = receiver; bestScore = score; }
  }
  return best;
}

function throwBanana(s, p, vx, vy, time, longPass, preferredTarget) {
  const mates = s.players[s.possession].filter(m => m !== p);
  if (!mates.length) return;
  let dx = vx, dy = vy;
  if (!dx && !dy) dx = s.possession === 0 ? 1 : -1;
  const targets = mates.map(m => ({ p: m, dot: (m.x - p.x) * dx + (m.y - p.y) * dy, dist: Phaser.Math.Distance.Between(m.x, m.y, p.x, p.y) }));
  const forward = targets.filter(t => t.dot > 0);
  const options = forward.length ? forward : targets;
  options.sort(longPass ? (a, b) => b.dot - a.dot || b.dist - a.dist : (a, b) => a.dist - b.dist);
  const target = preferredTarget || options[0].p;
  const distance = Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y);
  s.pass = { from: { x: p.x, y: p.y - 8 }, target, x: p.x, y: p.y - 8, elapsed: 0, duration: Phaser.Math.Clamp(distance * (longPass ? 2.15 : 2.4), longPass ? 700 : 420, longPass ? 1500 : 850), arc: longPass ? 170 : 112, visual: makeBanana(s, p.x, p.y - 8, longPass ? .85 : .72) };
  s.pass.visual.setVisible(true).setDepth(12);
}

function updatePass(s, dt, time) {
  const f = s.pass; f.elapsed += dt;
  const t = Math.min(1, f.elapsed / f.duration), target = f.target;
  f.x = Phaser.Math.Linear(f.from.x, target.x, t); f.y = Phaser.Math.Linear(f.from.y, target.y, t) - Math.sin(t * Math.PI) * f.arc;
  f.visual.setPosition(f.x, f.y).setRotation((f.x - f.from.x) * .008);
  const defenders = s.players[1 - s.possession];
  for (const d of defenders) {
    if (Phaser.Math.Distance.Between(d.x, d.y - 10, f.x, f.y) < 25) {
      f.visual.destroy(); s.pass = null; setPossession(s, 1 - s.possession, d); s.turnoverUntil = time + 1400;
      s.message.setText('INTERCEPTED!').setAlpha(1); s.messageUntil = time + 900; return;
    }
  }
  if (t >= 1) {
    f.visual.destroy(); s.pass = null; target.x = f.x; target.y = f.y;
    target.root.setPosition(target.x, target.y);
    setPossession(s, s.possession, target); s.turnoverUntil = time + 1100;
    s.message.setText('CATCH!').setAlpha(1); s.messageUntil = time + 450;
  }
}

function setPossession(s, team, player) {
  s.possession = team;
  s.cpuThrowAt = 0;
  const group = s.players[team];
  if (player && player !== group[0]) {
    const old = group[0]; group[0] = player; group[player.number] = old; old.number = player.number; player.number = 0;
  }
  for (const p of s.players.flat()) p.banana.setVisible(false);
  group[0].banana.setVisible(!s.pass);
  if (s.cameras?.main) s.cameras.main.startFollow(group[0], false, .08, 0);
}

function nearestPlayer(players, target) { return players.slice(1).reduce((a, b) => Phaser.Math.Distance.Between(a.x, a.y, target.x, target.y) < Phaser.Math.Distance.Between(b.x, b.y, target.x, target.y) ? a : b, players[1]); }

function scoreTouchdown(s, time) {
  s.scores[s.possession]++;
  if (s.scores[s.possession] >= 3) {
    s.phase = 'over'; s.message.setText(`TOUCHDOWN!\nTEAM ${s.possession + 1} WINS\n${s.scores[0]}  -  ${s.scores[1]}\nPRESS START TO PLAY AGAIN`).setAlpha(1);
    s.cameras.main.stopFollow(); return;
  }
  const next = 1 - s.possession; s.possession = next; s.pass = null; makeTeams(s); s.turnoverUntil = time + 1500;
  s.message.setText('TOUCHDOWN!').setAlpha(1); s.messageUntil = time + 1050;
  s.cameras.main.startFollow(s.players[s.possession][0], false, .08, 0);
}

function updateHud(s) {
  const carrier = s.players[s.possession][0], dir = s.possession === 0 ? 1 : -1;
  const yards = Math.floor((dir > 0 ? WORLD - END - carrier.x : carrier.x - END) / 17);
  const mode = s.twoPlayers ? 'P1 VS P2' : 'P1 VS CPU';
  s.hud.setText(`PLATANANA BOWL     ${mode}     P1 ${s.scores[0]}  -  ${s.scores[1]} P2     ${Math.max(0, yards)} YDS TO GO`);
  if (!s.twoPlayers && s.possession === 1) s.help.setText('P1 MOVE WASD   TACKLE I     CPU RUNS / PASSES');
  else if (!s.twoPlayers) s.help.setText('P1 MOVE WASD   PASS U / LONG O   JUKE I     CPU DEFENDS');
  else if (s.possession === 0) s.help.setText('P1 MOVE WASD   PASS U / LONG O   JUKE I     P2 MOVE ARROWS   TACKLE T');
  else s.help.setText('P2 MOVE ARROWS   PASS R / LONG Y   JUKE T     P1 MOVE WASD   TACKLE I');
}

function drawField(s) {
  const g = s.fieldArt; g.clear();
  g.fillStyle(C.grass); g.fillRect(0, TOP, WORLD, BOTTOM - TOP);
  const zoneLeft = [0, WORLD - END];
  for (const x of zoneLeft) {
    g.fillStyle(0x0d3b28); g.fillRect(x, TOP, END, BOTTOM - TOP);
    for (let y = TOP + 18; y < BOTTOM - 40; y += 48) {
      g.lineStyle(14, 0x1c5639, .6);
      g.lineBetween(x + 12, y, x + END - 12, y + 32);
    }
    g.lineStyle(2, C.cream, .8); g.strokeRect(x + 5, TOP + 5, END - 10, BOTTOM - TOP - 10);
  }
  g.lineStyle(2, C.cream, .6); g.strokeRect(0, TOP, WORLD, BOTTOM - TOP);
  g.lineStyle(2, C.cream, .66);
  for (let x = END; x <= WORLD - END; x += 100) {
    g.lineBetween(x, TOP, x, BOTTOM);
    for (let y = TOP + 28; y < BOTTOM - 18; y += 52) { g.lineBetween(x - 5, y, x + 5, y); g.lineBetween(x - 5, y, x - 5, y + 8); }
  }
  g.lineStyle(3, C.lime, .7); g.lineBetween(END, TOP, END, BOTTOM); g.lineBetween(WORLD - END, TOP, WORLD - END, BOTTOM);
  for (let i = 0; i < 2; i++) {
    const x = i ? WORLD - END / 2 : END / 2, y = (TOP + BOTTOM) / 2;
    addFieldMark(s, s.add.text(x, y, 'PLATANUS HACK 26', { fontFamily: 'monospace', fontSize: '21px', color: '#e1ff00', fontStyle: 'bold', stroke: '#0d3b28', strokeThickness: 5 }).setOrigin(.5).setRotation(-Math.PI / 2).setDepth(2));
  }
  const midX = WORLD / 2, midY = (TOP + BOTTOM) / 2;
  addFieldMark(s, s.add.ellipse(midX, midY, 218, 116, C.ink, 0).setStrokeStyle(4, C.lime, .72).setDepth(1));
  addFieldMark(s, s.add.ellipse(midX, midY, 198, 98, C.ink, 0).setStrokeStyle(1, C.cream, .55).setDepth(1));
  addFieldMark(s, s.add.text(midX, midY - 13, 'HACK 26', { fontFamily: 'monospace', fontSize: '27px', color: '#e1ff00', fontStyle: 'bold', stroke: '#164a32', strokeThickness: 5 }).setOrigin(.5).setDepth(2));
  addFieldMark(s, s.add.text(midX, midY + 20, 'aramis2009', { fontFamily: 'monospace', fontSize: '13px', color: '#fff4cf', fontStyle: 'bold', stroke: '#164a32', strokeThickness: 4 }).setOrigin(.5).setDepth(2));
  g.fillStyle(0x0b2518); g.fillRect(0, BOTTOM, WORLD, H - BOTTOM);
  g.fillStyle(C.cream, .7);
  for (let x = END + 50; x < WORLD - END; x += 100) {
    const n = Math.round((x - END) / 17);
    s.add.text(x, TOP + 11, String(n), { fontFamily: 'monospace', fontSize: '11px', color: '#fff4cf' }).setOrigin(.5).setDepth(1);
    s.add.text(x, BOTTOM - 13, String(n), { fontFamily: 'monospace', fontSize: '11px', color: '#fff4cf' }).setOrigin(.5).setDepth(1);
  }
}

function addFieldMark(s, mark) { s.fieldMarks.push(mark); return mark; }

function makeBanana(s, x, y, scale) {
  const c = s.add.container(x, y).setScale(scale);
  c.add(s.add.ellipse(0, 0, 40, 17, C.gold).setRotation(-.24).setStrokeStyle(2, 0x8c5319));
  c.add(s.add.ellipse(-13, -2, 10, 14, C.lime).setRotation(-.45));
  c.add(s.add.ellipse(13, 2, 9, 13, 0xffdf77).setRotation(.45));
  c.add(s.add.rectangle(0, 0, 2, 11, 0x8c5319).setRotation(-.24));
  c.add(s.add.rectangle(-20, -2, 5, 4, 0x5e3614).setRotation(-.24)); c.add(s.add.rectangle(20, 2, 5, 4, 0x5e3614).setRotation(-.24));
  return c;
}

function held(s, key) { return s.inputState.held[key] === true; }
