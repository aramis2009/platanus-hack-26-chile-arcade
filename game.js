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
  s.stadiumArt = s.add.graphics().setDepth(-2); drawStadium(s);
  s.fieldArt = s.add.graphics(); s.fieldMarks = []; drawField(s);
  s.fieldMarks.forEach(mark => mark.setVisible(false));
  s.cameras.main.setBounds(0, 0, WORLD, H).setScroll(WORLD / 2 - W / 2, 0);
  s.hudArt = s.add.graphics().setScrollFactor(0).setDepth(19);
  drawHudPlate(s.hudArt);
  s.hudLeft = s.add.text(224, 40, 'P1', { fontFamily: 'monospace', fontSize: '12px', color: '#092218', fontStyle: 'bold' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.hudRight = s.add.text(576, 40, 'CPU', { fontFamily: 'monospace', fontSize: '12px', color: '#fff4cf', fontStyle: 'bold' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.hud = s.add.text(W / 2, 38, '', { fontFamily: 'Arial Black, sans-serif', fontSize: '27px', color: '#fff4cf', fontStyle: 'bold', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.hudStatus = s.add.text(W / 2, 60, '', { fontFamily: 'monospace', fontSize: '9px', color: '#c1d9c5', fontStyle: 'bold', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  [s.hudArt, s.hudLeft, s.hudRight, s.hud, s.hudStatus].forEach(item => item.setVisible(false));
  s.helpPlate = s.add.graphics().setScrollFactor(0).setDepth(19);
  s.helpPlate.fillStyle(C.ink, .9).fillRect(133, 548, 534, 39);
  s.helpPlate.lineStyle(1, C.lime, .45).strokeRect(133, 548, 534, 39);
  s.help = s.add.text(W / 2, 568, '', { fontFamily: 'monospace', fontSize: '11px', color: '#fff4cf', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.titleArt = s.add.graphics().setScrollFactor(0).setDepth(18);
  drawTitlePlate(s.titleArt);
  s.titleTag = s.add.text(142, 147, 'PLATANUS ARCADE  /  SANTIAGO 2026', { fontFamily: 'monospace', fontSize: '12px', color: '#e1ff00', fontStyle: 'bold' }).setOrigin(0, .5).setScrollFactor(0).setDepth(20);
  s.title = s.add.text(137, 205, 'PLATA', { fontFamily: 'Arial Black, sans-serif', fontSize: '52px', color: '#fff4cf', fontStyle: 'bold', stroke: '#092218', strokeThickness: 6 }).setOrigin(0, .5).setScrollFactor(0).setDepth(20);
  s.titleAccent = s.add.text(137, 267, 'NANA BOWL', { fontFamily: 'Arial Black, sans-serif', fontSize: '47px', color: '#e1ff00', fontStyle: 'bold', stroke: '#092218', strokeThickness: 6 }).setOrigin(0, .5).setScrollFactor(0).setDepth(20);
  s.tagline = s.add.text(142, 326, 'RUN IT. AIR IT. TAKE THE BANANA.', { fontFamily: 'monospace', fontSize: '12px', color: '#c1d9c5', fontStyle: 'bold' }).setOrigin(0, .5).setScrollFactor(0).setDepth(20);
  s.modeText = s.add.text(142, 379, 'SOLO  ·  YOU VS CPU     /     LOCAL  ·  2 PLAYERS', { fontFamily: 'monospace', fontSize: '11px', color: '#fff4cf', fontStyle: 'bold' }).setOrigin(0, .5).setScrollFactor(0).setDepth(20);
  s.prompt = s.add.text(142, 446, 'PRESS ENTER TO KICK OFF', { fontFamily: 'Arial Black, sans-serif', fontSize: '18px', color: '#e1ff00', fontStyle: 'bold' }).setOrigin(0, .5).setScrollFactor(0).setDepth(20);
  s.titleBanana = makeBanana(s, 572, 295, 2.2).setRotation(-.28).setScrollFactor(0).setDepth(20);
  s.help.setText('MOVE WASD  ·  PASS U  ·  LONG PASS O  ·  JUKE I');
  s.cameras.main.setFollowOffset(0, 0);
}

function update(time, delta) {
  const s = this, dt = Math.min(delta, 40);
  if (s.phase === 'title') {
    s.prompt.setAlpha(.68 + Math.sin(time / 300) * .25);
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
  [s.hudArt, s.hudLeft, s.hudRight, s.hud, s.hudStatus].forEach(item => item.setVisible(true));
  s.fieldMarks.forEach(mark => mark.setVisible(true));
  s.titleArt.setVisible(false); s.titleTag.setVisible(false); s.title.setVisible(false); s.titleAccent.setVisible(false); s.tagline.setVisible(false); s.modeText.setVisible(false); s.prompt.setVisible(false); s.titleBanana.setVisible(false); s.message?.destroy();
  s.message = s.add.text(W / 2, H / 2, '', { fontFamily: 'monospace', fontSize: '30px', color: '#e1ff00', fontStyle: 'bold', align: 'center', stroke: '#092218', strokeThickness: 6 }).setOrigin(.5).setScrollFactor(0).setDepth(30);
  makeTeams(s); updateHud(s); s.cameras.main.startFollow(s.players[s.possession][0], false, .05, .06);
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
  const ballRing = s.add.ellipse(0, 14, 50, 32, C.gold, .16).setStrokeStyle(2, C.gold, .9).setVisible(false); root.add(ballRing);
  root.add(s.add.ellipse(0, 31, 38, 10, C.black, .68));
  root.add(s.add.rectangle(-8, 27, 9, 17, 0x10251a)); root.add(s.add.rectangle(8, 27, 9, 17, 0x10251a));
  root.add(s.add.rectangle(-9, 34, 13, 5, C.cream)); root.add(s.add.rectangle(9, 34, 13, 5, C.cream));
  root.add(s.add.rectangle(0, 12, 30, 28, color).setStrokeStyle(2, C.cream));
  root.add(s.add.rectangle(0, 1, 38, 11, team === 0 ? 0xb6d900 : 0xc44b3b).setStrokeStyle(1, C.cream));
  root.add(s.add.rectangle(-20, 11, 9, 20, color).setRotation(-.2).setStrokeStyle(1, C.cream));
  root.add(s.add.rectangle(20, 11, 9, 20, color).setRotation(.2).setStrokeStyle(1, C.cream));
  root.add(s.add.rectangle(0, -5, 11, 7, 0xf0c49a));
  root.add(s.add.ellipse(0, -17, 30, 23, team === 0 ? 0xb7dc10 : 0xc94d3e).setStrokeStyle(2, C.cream));
  root.add(s.add.rectangle(0, -18, 4, 19, C.cream));
  root.add(s.add.rectangle(14, -14, 11, 3, C.cream)); root.add(s.add.rectangle(14, -5, 11, 3, C.cream));
  root.add(s.add.rectangle(20, -10, 3, 11, C.cream));
  root.add(s.add.text(0, 12, String(number + 1), { fontFamily: 'Arial Black, sans-serif', fontSize: '12px', color: team === 0 ? '#092218' : '#fff4cf', fontStyle: 'bold' }).setOrigin(.5));
  const roleLabel = s.add.text(0, -47, '', { fontFamily: 'monospace', fontSize: '10px', color: '#fff4cf', fontStyle: 'bold', stroke: '#07180f', strokeThickness: 4 }).setOrigin(.5);
  root.add(roleLabel);
  const controlLabel = s.add.text(0, -64, team === 0 ? 'P1' : 'P2', { fontFamily: 'monospace', fontSize: '12px', color: team === 0 ? '#e1ff00' : '#ff8e7a', fontStyle: 'bold', stroke: '#07180f', strokeThickness: 4 }).setOrigin(.5).setVisible(false);
  root.add(controlLabel);
  const banana = makeBanana(s, 22, -8, .58); root.add(banana); banana.setVisible(false);
  return { root, banana, roleLabel, controlLabel, ballRing, team, number, position: number, x, y, jukeUntil: 0, tackleUntil: 0 };
}

function playFrame(s, time, dt) {
  const p2Input = ['P2_U', 'P2_D', 'P2_L', 'P2_R', 'P2_1', 'P2_2', 'P2_3'].some(k => held(s, k) || s.inputState.pressed[k]);
  if (p2Input) s.twoPlayers = true;
  const carrier = s.players[s.possession][0], attack = s.possession === 0 ? 1 : -1;
  const human0 = s.possession === 0 ? s.players[0][0] : nearestPlayer(s.players[0], carrier);
  const human1 = s.possession === 1 ? s.players[1][0] : nearestPlayer(s.players[1], carrier);
  const controlled = s.twoPlayers && p2Input ? [human0, human1] : [human0];
  const controlledSet = new Set(controlled);
  for (let team = 0; team < 2; team++) {
    const members = s.players[team];
    for (const p of members) {
      let vx = 0, vy = 0;
      p.roleLabel.setText(roleName(p.position, team === s.possession));
      p.controlLabel.setVisible(controlledSet.has(p));
      p.ballRing.setVisible(p === carrier && !s.pass);
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
      const speed = controlledSet.has(p) ? (dashing ? 325 : 238) : team === s.possession ? (p.position === 1 || p.position === 2 ? 205 : 178) : chaseGap > 160 ? 218 : 188;
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
        playCue(s, 'TACKLED! BANANA STOLEN!', '#ff8e7a', time, 850);
        impactBurst(s, defender.x, defender.y, C.red); break;
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
    const lane = p.position === 1 ? TOP + 56 : BOTTOM - 56;
    const route = Math.sin(time / 470 + p.position * 2) * 18;
    const lead = p.position === 1 ? 225 : 285;
    return [Phaser.Math.Clamp(carrier.x + attack * lead, END + 42, WORLD - END - 42), lane + route];
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
  const receiver = nearest.distance < 225 ? findOpenReceiver(s, carrier, attack) : null;
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
  const attack = s.possession === 0 ? 1 : -1;
  const lead = target.position === 1 || target.position === 2 ? attack * (longPass ? 104 : 54) : 0;
  const targetX = Phaser.Math.Clamp(target.x + lead, END + 28, WORLD - END - 28);
  const targetY = target.y;
  const distance = Phaser.Math.Distance.Between(p.x, p.y, targetX, targetY);
  playCue(s, longPass ? 'LONG BANANA!' : 'PASS AWAY!', '#e1ff00', time, 520);
  impactBurst(s, p.x + attack * 18, p.y - 10, C.gold);
  const from = { x: p.x, y: p.y - 8 }, ballScale = longPass ? 1.08 : .92;
  s.pass = { from, target, targetX, targetY, x: p.x, y: p.y - 8, elapsed: 0, trailAt: 0, duration: Phaser.Math.Clamp(distance * (longPass ? 1.15 : .95), longPass ? 340 : 260, longPass ? 780 : 560), height: longPass ? 18 : 9, angle: Math.atan2(targetY - from.y, targetX - from.x), ballScale, longPass, shadow: s.add.ellipse(from.x, from.y + 7, 29, 10, C.black, .32).setDepth(11), visual: makeBanana(s, from.x, from.y, ballScale) };
  s.pass.visual.setVisible(true).setDepth(12);
}

function updatePass(s, dt, time) {
  const f = s.pass; f.elapsed += dt;
  const t = Math.min(1, f.elapsed / f.duration), target = f.target;
  f.x = Phaser.Math.Linear(f.from.x, f.targetX, t); f.y = Phaser.Math.Linear(f.from.y, f.targetY, t);
  const lift = Math.sin(t * Math.PI) * f.height;
  f.shadow.setPosition(f.x, f.y + 7).setScale(1 + lift * .012, .72);
  f.visual.setPosition(f.x, f.y - lift).setRotation(f.angle + Math.sin(t * Math.PI * 2) * .035).setScale(f.ballScale + lift * .002);
  if (time >= f.trailAt) {
    const fleck = s.add.ellipse(f.x, f.y - lift, f.longPass ? 12 : 8, 3, time % 2 ? C.gold : C.cream, .56).setRotation(f.angle).setDepth(11);
    s.tweens.add({ targets: fleck, x: f.x - Math.cos(f.angle) * 25, y: f.y - lift - Math.sin(f.angle) * 25, scale: .15, alpha: 0, duration: 210, onComplete: () => fleck.destroy() });
    f.trailAt = time + 48;
  }
  const defenders = s.players[1 - s.possession];
  for (const d of defenders) {
    if (Phaser.Math.Distance.Between(d.x, d.y - 10, f.x, f.y) < 25) {
      f.visual.destroy(); f.shadow.destroy(); s.pass = null; setPossession(s, 1 - s.possession, d); s.turnoverUntil = time + 1400;
      playCue(s, 'INTERCEPTED!', '#ff8e7a', time, 900); impactBurst(s, d.x, d.y, C.red); return;
    }
  }
  if (t >= 1) {
    f.visual.destroy(); f.shadow.destroy(); s.pass = null; target.x = f.x; target.y = f.y;
    target.root.setPosition(target.x, target.y);
    setPossession(s, s.possession, target); s.turnoverUntil = time + 1100;
    playCue(s, 'CAUGHT!', '#e1ff00', time, 560); impactBurst(s, target.x, target.y, C.gold);
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
  if (s.cameras?.main) s.cameras.main.startFollow(group[0], false, .05, .06);
}

function nearestPlayer(players, target) { return players.slice(1).reduce((a, b) => Phaser.Math.Distance.Between(a.x, a.y, target.x, target.y) < Phaser.Math.Distance.Between(b.x, b.y, target.x, target.y) ? a : b, players[1]); }

function scoreTouchdown(s, time) {
  s.scores[s.possession]++;
  const scorer = s.players[s.possession][0];
  s.cameras.main.flash(250, 225, 255, 0);
  s.cameras.main.shake(240, .008);
  impactBurst(s, scorer.x, scorer.y, C.lime);
  if (s.scores[s.possession] >= 3) {
    s.phase = 'over'; s.message.setText(`TOUCHDOWN!\nTEAM ${s.possession + 1} WINS\n${s.scores[0]}  -  ${s.scores[1]}\nPRESS START TO PLAY AGAIN`).setAlpha(1);
    s.cameras.main.stopFollow(); return;
  }
  const next = 1 - s.possession; s.possession = next; s.pass = null; makeTeams(s); s.turnoverUntil = time + 1500;
  s.message.setText('TOUCHDOWN!').setAlpha(1); s.messageUntil = time + 1050;
  s.cameras.main.startFollow(s.players[s.possession][0], false, .05, .06);
}

function playCue(s, text, color, time, duration, shake = 0) {
  s.message.setText(text).setColor(color).setAlpha(1);
  s.messageUntil = time + duration;
  if (shake) s.cameras.main.shake(130, shake);
}

function impactBurst(s, x, y, color) {
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4, spark = s.add.circle(x, y, 4, color, .95).setDepth(14);
    s.tweens.add({ targets: spark, x: x + Math.cos(angle) * 48, y: y + Math.sin(angle) * 48, scale: .35, alpha: 0, duration: 380, onComplete: () => spark.destroy() });
  }
}

function updateHud(s) {
  const carrier = s.players[s.possession][0], dir = s.possession === 0 ? 1 : -1;
  const yards = Math.floor((dir > 0 ? WORLD - END - carrier.x : carrier.x - END) / 17);
  const mode = s.twoPlayers ? 'P1 VS P2' : 'P1 VS CPU';
  s.hudLeft.setText('P1'); s.hudRight.setText(s.twoPlayers ? 'P2' : 'CPU');
  s.hud.setText(`${s.scores[0]}  —  ${s.scores[1]}`);
  s.hudStatus.setText(`${mode}    ·    ${Math.max(0, yards)} YDS TO GO`);
  if (!s.twoPlayers && s.possession === 1) s.help.setText('P1 MOVE WASD   TACKLE I     CPU RUNS / PASSES');
  else if (!s.twoPlayers) s.help.setText('P1 MOVE WASD   PASS U / LONG O   JUKE I     CPU DEFENDS');
  else if (s.possession === 0) s.help.setText('P1 MOVE WASD   PASS U / LONG O   JUKE I     P2 MOVE ARROWS   TACKLE T');
  else s.help.setText('P2 MOVE ARROWS   PASS R / LONG Y   JUKE T     P1 MOVE WASD   TACKLE I');
}

function drawField(s) {
  const g = s.fieldArt; g.clear();
  g.fillStyle(C.grass); g.fillRect(0, TOP, WORLD, BOTTOM - TOP);
  for (let x = END; x < WORLD - END; x += 200) {
    g.fillStyle((x / 200) % 2 ? 0x1c5739 : 0x164a32, .52);
    g.fillRect(x, TOP + 2, 100, BOTTOM - TOP - 4);
  }
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
  g.fillStyle(C.lime, .78); g.fillRect(0, BOTTOM, WORLD, 3);
  for (let x = 30; x < WORLD; x += 96) {
    g.fillStyle(x % 192 ? 0x153f2a : 0x1d5538, .9); g.fillRect(x, BOTTOM + 14, 54, 22);
    g.lineStyle(1, C.cream, .25); g.strokeRect(x, BOTTOM + 14, 54, 22);
  }
  g.fillStyle(C.cream, .7);
  for (let x = END + 50; x < WORLD - END; x += 100) {
    const n = Math.round((x - END) / 17);
    s.add.text(x, TOP + 11, String(n), { fontFamily: 'monospace', fontSize: '11px', color: '#fff4cf' }).setOrigin(.5).setDepth(1);
    s.add.text(x, BOTTOM - 13, String(n), { fontFamily: 'monospace', fontSize: '11px', color: '#fff4cf' }).setOrigin(.5).setDepth(1);
  }
}

function drawStadium(s) {
  const g = s.stadiumArt;
  g.fillStyle(C.black); g.fillRect(0, 0, WORLD, H);
  g.fillStyle(0x0c281b); g.fillRect(0, 0, WORLD, TOP);
  g.fillStyle(0x163d29); g.fillRect(0, 42, WORLD, 72);
  g.fillStyle(0x205437); g.fillRect(0, 51, WORLD, 4);
  g.fillStyle(0x0a2117); g.fillRect(0, 115, WORLD, 30);
  g.lineStyle(2, C.lime, .3); g.lineBetween(0, 116, WORLD, 116);
  for (let x = 16; x < WORLD; x += 46) {
    const row = Math.floor(x / 46) % 3;
    g.fillStyle(row === 0 ? C.lime : row === 1 ? C.red : C.cream, .75);
    g.fillCircle(x, 68 + row * 11, 2.2); g.fillCircle(x + 18, 88 - row * 4, 2);
  }
  for (let x = 40; x < WORLD; x += 240) {
    g.fillStyle(C.ink, .95); g.fillRect(x, 16, 86, 25);
    g.lineStyle(2, C.lime, .72); g.strokeRect(x, 16, 86, 25);
    g.fillStyle(C.gold, .8); g.fillCircle(x + 16, 29, 5); g.fillCircle(x + 70, 29, 5);
    g.lineStyle(1, C.cream, .55); g.lineBetween(x + 28, 29, x + 58, 29);
  }
  g.fillStyle(0x0b2518); g.fillRect(0, BOTTOM, WORLD, H - BOTTOM);
  g.fillStyle(0x123927); g.fillRect(0, BOTTOM + 7, WORLD, 5);
}

function drawHudPlate(g) {
  g.fillStyle(C.black, .88); g.fillRect(188, 10, 424, 66);
  g.fillStyle(C.lime, .94); g.fillRect(188, 10, 72, 66);
  g.fillStyle(C.red, .94); g.fillRect(540, 10, 72, 66);
  g.fillStyle(C.ink, .95); g.fillRect(260, 10, 280, 66);
  g.lineStyle(2, C.cream, .75); g.strokeRect(188, 10, 424, 66);
  g.lineStyle(1, C.lime, .55); g.lineBetween(260, 10, 260, 76); g.lineBetween(540, 10, 540, 76);
  g.lineStyle(2, C.gold, .8); g.lineBetween(376, 20, 424, 20); g.lineBetween(376, 66, 424, 66);
}

function drawTitlePlate(g) {
  g.fillStyle(C.black, .9); g.fillRect(92, 113, 616, 374);
  g.fillStyle(C.ink, .92); g.fillRect(101, 122, 598, 356);
  g.lineStyle(2, C.lime, .72); g.strokeRect(92, 113, 616, 374);
  g.lineStyle(1, C.cream, .42); g.strokeRect(101, 122, 598, 356);
  g.fillStyle(C.lime, .95); g.fillRect(92, 113, 146, 5);
  g.fillStyle(C.red, .95); g.fillRect(562, 482, 146, 5);
  g.lineStyle(2, C.lime, .48); g.strokeCircle(572, 295, 94); g.strokeCircle(572, 295, 79);
  g.lineStyle(1, C.cream, .2); g.lineBetween(505, 228, 639, 362); g.lineBetween(639, 228, 505, 362);
  g.fillStyle(C.gold, .9); g.fillCircle(671, 158, 3); g.fillCircle(654, 172, 2); g.fillCircle(682, 184, 2);
}

function addFieldMark(s, mark) { s.fieldMarks.push(mark); return mark; }

function makeBanana(s, x, y, scale) {
  const c = s.add.container(x, y).setScale(scale);
  c.add(s.add.ellipse(0, 1, 55, 27, 0x8a4d18).setRotation(-.2));
  c.add(s.add.ellipse(0, 0, 51, 22, C.gold).setRotation(-.2).setStrokeStyle(2, 0x704018));
  c.add(s.add.ellipse(-2, 4, 37, 9, 0xd78c25, .72).setRotation(-.2));
  c.add(s.add.ellipse(-12, -5, 17, 4, 0xffef9c, .9).setRotation(-.2));
  c.add(s.add.ellipse(-25, -2, 8, 11, C.lime).setRotation(-.45));
  c.add(s.add.ellipse(25, 2, 8, 11, 0xffdf77).setRotation(.45));
  c.add(s.add.rectangle(0, 0, 2, 12, 0x704018).setRotation(-.2));
  for (let i = -1; i <= 1; i++) c.add(s.add.rectangle(i * 5, -1, 2, 8, C.cream).setRotation(-.2));
  c.add(s.add.rectangle(-28, -2, 5, 4, 0x5e3614).setRotation(-.2)); c.add(s.add.rectangle(28, 2, 5, 4, 0x5e3614).setRotation(-.2));
  return c;
}

function held(s, key) { return s.inputState.held[key] === true; }
