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
  s.cameras.main.setBounds(0, 0, W, WORLD).setScroll(0, WORLD / 2 - H / 2);
  s.hudArt = s.add.graphics().setScrollFactor(0).setDepth(19);
  drawHudPlate(s.hudArt);
  s.hudHeader = s.add.text(160, 30, 'PLATANANA BOWL', { fontFamily: 'monospace', fontSize: '10px', color: '#e1ff00', fontStyle: 'bold', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.hudLeft = s.add.text(64, 60, 'P1', { fontFamily: 'monospace', fontSize: '11px', color: '#092218', fontStyle: 'bold' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.hudRight = s.add.text(255, 60, 'CPU', { fontFamily: 'monospace', fontSize: '11px', color: '#fff4cf', fontStyle: 'bold' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.hud = s.add.text(160, 61, '', { fontFamily: 'Arial Black, sans-serif', fontSize: '25px', color: '#fff4cf', fontStyle: 'bold', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.hudStatus = s.add.text(160, 91, '', { fontFamily: 'monospace', fontSize: '9px', color: '#c1d9c5', fontStyle: 'bold', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.driveArt = s.add.graphics().setScrollFactor(0).setDepth(19);
  drawDrivePlate(s.driveArt);
  s.driveBanner = s.add.text(W / 2, 529, '', { fontFamily: 'Arial Black, sans-serif', fontSize: '25px', color: '#e1ff00', fontStyle: 'bold', align: 'center', stroke: '#07180f', strokeThickness: 5 }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  [s.hudArt, s.hudHeader, s.hudLeft, s.hudRight, s.hud, s.hudStatus, s.driveArt, s.driveBanner].forEach(item => item.setVisible(false));
  s.helpPlate = s.add.graphics().setScrollFactor(0).setDepth(19);
  s.helpPlate.fillStyle(C.ink, .92).fillRect(130, 567, 540, 25);
  s.helpPlate.lineStyle(1, C.cream, .38).strokeRect(130, 567, 540, 25);
  s.help = s.add.text(W / 2, 580, '', { fontFamily: 'monospace', fontSize: '9px', color: '#fff4cf', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
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
  } else if (s.phase === 'countdown') {
    updateCountdown(s, time);
  } else if (s.phase === 'celebrating') {
    updateCelebration(s, time);
  } else if (s.phase === 'paused') {
    if (s.inputState.pressed.START1 || s.inputState.pressed.START2) { s.phase = 'playing'; s.message.setVisible(false); }
  } else if (s.phase === 'over' && (s.inputState.pressed.START1 || s.inputState.pressed.START2)) startMatch(s, time);
  s.inputState.pressed = {};
}

function startMatch(s, time) {
  s.scores = [0, 0]; s.possession = 0; s.pass = null; s.twoPlayers = false; s.phase = 'countdown'; s.turnoverUntil = time + 1700;
  s.pendingWinner = null;
  [s.hudArt, s.hudHeader, s.hudLeft, s.hudRight, s.hud, s.hudStatus, s.driveArt, s.driveBanner].forEach(item => item.setVisible(true));
  s.fieldMarks.forEach(mark => mark.setVisible(true));
  s.titleArt.setVisible(false); s.titleTag.setVisible(false); s.title.setVisible(false); s.titleAccent.setVisible(false); s.tagline.setVisible(false); s.modeText.setVisible(false); s.prompt.setVisible(false); s.titleBanana.setVisible(false); s.message?.destroy();
  s.message = s.add.text(W / 2, H / 2, '', { fontFamily: 'monospace', fontSize: '30px', color: '#e1ff00', fontStyle: 'bold', align: 'center', stroke: '#092218', strokeThickness: 6 }).setOrigin(.5).setScrollFactor(0).setDepth(30);
  makeTeams(s); updateHud(s); s.cameras.main.startFollow(s.players[s.possession][0].root, false, .06, .06);
  beginCountdown(s, time);
}

function beginCountdown(s, time) {
  s.phase = 'countdown'; s.countdownUntil = time + 3500; s.countLabel = '';
  updateCountdown(s, time);
}

function updateCountdown(s, time) {
  const remaining = s.countdownUntil - time;
  if (remaining <= 0) {
    s.phase = 'playing'; s.message.setText('').setFontSize('30px').setScale(1); s.turnoverUntil = time + 650; return;
  }
  const label = remaining > 500 ? String(Math.ceil((remaining - 500) / 1000)) : 'KICKOFF!';
  if (label !== s.countLabel) {
    s.countLabel = label; s.message.setText(label).setFontSize('64px').setColor('#e1ff00').setScale(.72);
    s.tweens.add({ targets: s.message, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.Out' });
  }
}

function updateCelebration(s, time) {
  if (time < s.celebrationUntil) return;
  if (s.pendingWinner !== null) {
    s.phase = 'over'; s.message.setText(`TOUCHDOWN!\nTEAM ${s.pendingWinner + 1} WINS\n${s.scores[0]}  -  ${s.scores[1]}\nPRESS START TO PLAY AGAIN`).setFontSize('28px').setColor('#e1ff00').setScale(1);
    s.cameras.main.stopFollow(); return;
  }
  makeTeams(s, s.nextTeam); updateHud(s); s.cameras.main.startFollow(s.players[s.possession][0].root, false, .06, .06);
  beginCountdown(s, time);
}

function makeTeams(s, firstTeam = 0) {
  s.players.flat().forEach(p => { p.root.destroy(); p.roleLabel.destroy(); p.controlLabel.destroy(); }); s.players = [[], []];
  const starts = firstTeam === 0
    ? [[870, 860, 860, 835], [1035, 1010, 1010, 1060]]
    : [[765, 790, 790, 740], [930, 950, 950, 965]];
  const lanes = [333, 205, 475, 333];
  for (let team = 0; team < 2; team++) {
    for (let i = 0; i < 4; i++) {
      const p = createPlayer(s, team, i, starts[team][i], lanes[i]);
      s.players[team].push(p);
    }
  }
  setPossession(s, firstTeam);
}

function createPlayer(s, team, number, x, y) {
  const color = team === 0 ? C.lime : C.red;
  const root = s.add.container(fieldScreenX(y), fieldScreenY(x)).setDepth(6).setScale(1.12);
  const ballRing = s.add.ellipse(0, 14, 50, 32, C.gold, .16).setStrokeStyle(2, C.gold, .9).setVisible(false); root.add(ballRing);
  root.add(s.add.ellipse(0, 31, 38, 10, C.black, .68));
  root.add(s.add.rectangle(-8, 27, 9, 17, 0x10251a)); root.add(s.add.rectangle(8, 27, 9, 17, 0x10251a));
  root.add(s.add.rectangle(-9, 34, 13, 5, C.cream)); root.add(s.add.rectangle(9, 34, 13, 5, C.cream));
  root.add(s.add.rectangle(0, 12, 30, 28, color).setStrokeStyle(2, C.cream));
  root.add(s.add.rectangle(0, 1, 38, 11, team === 0 ? 0xb6d900 : 0xc44b3b).setStrokeStyle(1, C.cream));
  root.add(s.add.rectangle(0, 13, 19, 19, team === 0 ? 0xc4e83b : 0xf17a67, .45));
  root.add(s.add.rectangle(-15, 2, 5, 3, C.cream)); root.add(s.add.rectangle(15, 2, 5, 3, C.cream));
  root.add(s.add.rectangle(-20, 11, 9, 20, color).setRotation(-.2).setStrokeStyle(1, C.cream));
  root.add(s.add.rectangle(20, 11, 9, 20, color).setRotation(.2).setStrokeStyle(1, C.cream));
  root.add(s.add.rectangle(0, -5, 11, 7, 0xf0c49a));
  root.add(s.add.ellipse(0, -17, 30, 23, team === 0 ? 0xb7dc10 : 0xc94d3e).setStrokeStyle(2, C.cream));
  root.add(s.add.ellipse(-5, -22, 12, 4, C.cream, .5));
  root.add(s.add.rectangle(0, -18, 4, 19, C.cream));
  root.add(s.add.rectangle(14, -14, 11, 3, C.cream)); root.add(s.add.rectangle(14, -5, 11, 3, C.cream));
  root.add(s.add.rectangle(20, -10, 3, 11, C.cream));
  root.add(s.add.text(0, 12, String(number + 1), { fontFamily: 'Arial Black, sans-serif', fontSize: '12px', color: team === 0 ? '#092218' : '#fff4cf', fontStyle: 'bold' }).setOrigin(.5));
  const roleLabel = s.add.text(fieldScreenX(y), fieldScreenY(x) - 39, '', { fontFamily: 'monospace', fontSize: '10px', color: '#fff4cf', fontStyle: 'bold', stroke: '#07180f', strokeThickness: 4 }).setOrigin(.5).setDepth(10);
  const controlLabel = s.add.text(fieldScreenX(y), fieldScreenY(x) - 53, team === 0 ? 'P1' : 'P2', { fontFamily: 'monospace', fontSize: '12px', color: team === 0 ? '#e1ff00' : '#ff8e7a', fontStyle: 'bold', stroke: '#07180f', strokeThickness: 4 }).setOrigin(.5).setDepth(11).setVisible(false);
  const banana = makeBanana(s, 0, 25, .58); root.add(banana); banana.setRotation(Math.PI / 2).setVisible(false);
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
        vx = (held(s, pre + 'D') ? 1 : 0) - (held(s, pre + 'U') ? 1 : 0);
        vy = (held(s, pre + 'R') ? 1 : 0) - (held(s, pre + 'L') ? 1 : 0);
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
      const direction = team === s.possession ? attack : -attack;
      const px = fieldScreenX(p.y), py = fieldScreenY(p.x), angle = direction > 0 ? Math.PI : 0;
      p.root.setPosition(px, py).setRotation(angle).setDepth(6 + p.x * .001);
      p.roleLabel.setPosition(px, py - 39).setDepth(10 + p.x * .001);
      p.controlLabel.setPosition(px, py - 53).setDepth(11 + p.x * .001);
      p.banana.setPosition(0, -25).setRotation(Math.PI / 2);
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
  const from = { x: p.x, y: p.y }, ballScale = longPass ? 1.08 : .92;
  const fromScreen = { x: fieldScreenX(from.y), y: fieldScreenY(from.x) };
  const passAngle = Math.atan2(targetX - from.x, (targetY - from.y) * W / (BOTTOM - TOP));
  s.pass = { from, target, targetX, targetY, x: p.x, y: p.y, elapsed: 0, trailAt: 0, duration: Phaser.Math.Clamp(distance * (longPass ? 1.15 : .95), longPass ? 340 : 260, longPass ? 780 : 560), height: longPass ? 18 : 9, angle: passAngle, ballScale, longPass, shadow: s.add.ellipse(fromScreen.x, fromScreen.y + 7, 29, 10, C.black, .32).setRotation(passAngle).setDepth(11), visual: makeBanana(s, fromScreen.x, fromScreen.y, ballScale) };
  s.pass.visual.setVisible(true).setDepth(12);
}

function updatePass(s, dt, time) {
  const f = s.pass; f.elapsed += dt;
  const t = Math.min(1, f.elapsed / f.duration), target = f.target;
  f.x = Phaser.Math.Linear(f.from.x, f.targetX, t); f.y = Phaser.Math.Linear(f.from.y, f.targetY, t);
  const lift = Math.sin(t * Math.PI) * f.height;
  const px = fieldScreenX(f.y), py = fieldScreenY(f.x);
  f.shadow.setPosition(px, py + 7).setScale(1 + lift * .012, .72);
  f.visual.setPosition(px, py - lift).setRotation(f.angle + Math.sin(t * Math.PI * 2) * .035).setScale(f.ballScale + lift * .002);
  if (time >= f.trailAt) {
    const fleck = s.add.ellipse(px, py - lift, f.longPass ? 12 : 8, 3, time % 2 ? C.gold : C.cream, .56).setRotation(f.angle).setDepth(11);
    s.tweens.add({ targets: fleck, x: px - Math.cos(f.angle) * 25, y: py - lift - Math.sin(f.angle) * 25, scale: .15, alpha: 0, duration: 210, onComplete: () => fleck.destroy() });
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
    target.root.setPosition(fieldScreenX(target.y), fieldScreenY(target.x));
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
  if (s.cameras?.main) s.cameras.main.startFollow(group[0].root, false, .06, .06);
}

function nearestPlayer(players, target) { return players.slice(1).reduce((a, b) => Phaser.Math.Distance.Between(a.x, a.y, target.x, target.y) < Phaser.Math.Distance.Between(b.x, b.y, target.x, target.y) ? a : b, players[1]); }

function scoreTouchdown(s, time) {
  s.scores[s.possession]++;
  const scorer = s.players[s.possession][0];
  s.cameras.main.flash(250, 225, 255, 0);
  s.cameras.main.shake(160, .004);
  impactBurst(s, scorer.x, scorer.y, C.lime);
  s.phase = 'celebrating'; s.nextTeam = 1 - s.possession;
  s.pendingWinner = s.scores[s.possession] >= 3 ? s.possession : null;
  s.celebrationUntil = time + 2200; s.messageUntil = 0;
  s.message.setText('TOUCHDOWN!').setFontSize('40px').setColor('#e1ff00').setAlpha(1).setScale(1);
  const root = scorer.root, baseAngle = root.angle, baseY = root.y, baseScale = root.scaleX;
  scorer.ballRing.setVisible(true);
  s.tweens.add({ targets: root, angle: baseAngle + 18, y: baseY - 10, scaleX: baseScale * 1.14, scaleY: baseScale * .82, duration: 180, yoyo: true, repeat: 5, ease: 'Sine.InOut', onComplete: () => { if (root.active) root.setAngle(baseAngle).setPosition(fieldScreenX(scorer.y), fieldScreenY(scorer.x)).setScale(baseScale); } });
  s.tweens.add({ targets: scorer.ballRing, scaleX: 1.3, scaleY: .7, alpha: .7, duration: 240, yoyo: true, repeat: 4 });
  s.cameras.main.stopFollow();
}

function playCue(s, text, color, time, duration, shake = 0) {
  s.message.setText(text).setColor(color).setAlpha(1);
  s.messageUntil = time + duration;
  if (shake) s.cameras.main.shake(130, shake);
}

function impactBurst(s, x, y, color) {
  const sx = fieldScreenX(y), sy = fieldScreenY(x); x = sx; y = sy;
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4, spark = s.add.circle(x, y, 4, color, .95).setDepth(14);
    s.tweens.add({ targets: spark, x: x + Math.cos(angle) * 48, y: y + Math.sin(angle) * 48, scale: .35, alpha: 0, duration: 380, onComplete: () => spark.destroy() });
  }
}

function updateHud(s) {
  const carrier = s.players[s.possession][0], dir = s.possession === 0 ? 1 : -1;
  const yards = Math.floor((dir > 0 ? WORLD - END - carrier.x : carrier.x - END) / 15.4);
  const mode = s.twoPlayers ? 'P1 VS P2' : 'P1 VS CPU';
  s.hudLeft.setText('P1'); s.hudRight.setText(s.twoPlayers ? 'P2' : 'CPU');
  s.hud.setText(`${s.scores[0]}  —  ${s.scores[1]}`);
  s.hudStatus.setText(`${mode}    ·    FIRST TO 3 TOUCHDOWNS`);
  s.driveBanner.setText(`${Math.max(0, yards)} YDS TO END ZONE`);
  if (!s.twoPlayers && s.possession === 1) s.help.setText('P1 MOVE WASD   TACKLE I     CPU RUNS / PASSES');
  else if (!s.twoPlayers) s.help.setText('P1 MOVE WASD   PASS U / LONG O   JUKE I     CPU DEFENDS');
  else if (s.possession === 0) s.help.setText('P1 MOVE WASD   PASS U / LONG O   JUKE I     P2 MOVE ARROWS   TACKLE T');
  else s.help.setText('P2 MOVE ARROWS   PASS R / LONG Y   JUKE T     P1 MOVE WASD   TACKLE I');
}

function drawField(s) {
  const g = s.fieldArt; g.clear();
  g.fillStyle(C.grass); g.fillRect(18, 0, W - 36, WORLD);
  for (let y = END; y < WORLD - END; y += 154) {
    g.fillStyle(Math.floor(y / 154) % 2 ? 0x1c5739 : 0x164a32, .6); g.fillRect(20, y, W - 40, 77);
  }
  for (const y of [0, WORLD - END]) {
    g.fillStyle(0x0d3b28); g.fillRect(18, y, W - 36, END);
    for (let x = 38; x < W - 30; x += 38) {
      g.lineStyle(12, 0x1c5639, .58); g.lineBetween(x, y + 10, x + 24, y + END - 10);
    }
    g.lineStyle(3, C.cream, .82); g.strokeRect(24, y + 6, W - 48, END - 12);
    addFieldMark(s, s.add.text(W / 2, y + END / 2, 'PLATANUS HACK 26', { fontFamily: 'Arial Black, sans-serif', fontSize: '25px', color: '#e1ff00', fontStyle: 'bold', stroke: '#0d3b28', strokeThickness: 5 }).setOrigin(.5).setDepth(2));
  }
  g.lineStyle(3, C.cream, .76); g.strokeRect(18, 0, W - 36, WORLD);
  g.lineStyle(2, C.cream, .68);
  for (let y = END; y <= WORLD - END; y += 77) {
    const tenYardLine = Math.round((y - END) / 77) % 2 === 0;
    g.lineStyle(tenYardLine ? 2 : 1, C.cream, tenYardLine ? .76 : .34);
    g.lineBetween(20, y, W - 20, y);
    g.lineBetween(220, y - 5, 248, y - 5); g.lineBetween(220, y + 5, 248, y + 5);
    g.lineBetween(W - 248, y - 5, W - 220, y - 5); g.lineBetween(W - 248, y + 5, W - 220, y + 5);
  }
  g.lineStyle(4, C.lime, .88); g.lineBetween(18, END, W - 18, END); g.lineBetween(18, WORLD - END, W - 18, WORLD - END);
  for (let y = END + 154; y < WORLD - END; y += 154) {
    const yards = Math.round((y - END) / 15.4);
    s.add.text(70, y + 10, String(yards), { fontFamily: 'Arial Black, sans-serif', fontSize: '18px', color: '#f5f4d8', fontStyle: 'bold', stroke: '#164a32', strokeThickness: 3 }).setOrigin(.5).setDepth(2);
    s.add.text(W - 70, y + 10, String(yards), { fontFamily: 'Arial Black, sans-serif', fontSize: '18px', color: '#f5f4d8', fontStyle: 'bold', stroke: '#164a32', strokeThickness: 3 }).setOrigin(.5).setDepth(2);
  }
  const midY = WORLD / 2;
  addFieldMark(s, s.add.ellipse(W / 2, midY, 270, 160, C.ink, .04).setStrokeStyle(4, C.lime, .65).setDepth(1));
  addFieldMark(s, s.add.text(W / 2, midY - 19, 'HACK 26', { fontFamily: 'Arial Black, sans-serif', fontSize: '31px', color: '#e1ff00', fontStyle: 'bold', stroke: '#164a32', strokeThickness: 5 }).setOrigin(.5).setDepth(2));
  addFieldMark(s, s.add.text(W / 2, midY + 22, 'aramis2009', { fontFamily: 'monospace', fontSize: '15px', color: '#fff4cf', fontStyle: 'bold', stroke: '#164a32', strokeThickness: 4 }).setOrigin(.5).setDepth(2));
}

function drawStadium(s) {
  const g = s.stadiumArt;
  g.fillStyle(C.black); g.fillRect(0, 0, W, WORLD);
  g.fillStyle(0x102b1d); g.fillRect(0, 0, W, WORLD);
  for (let y = 0; y < WORLD; y += 72) {
    g.fillStyle(0x07180f); g.fillRect(0, y, 18, 64); g.fillRect(W - 18, y, 18, 64);
    g.fillStyle(0x254d36); g.fillRect(3, y + 8, 12, 4); g.fillRect(W - 15, y + 8, 12, 4);
    for (let x = 22; x < 48; x += 12) {
      const color = Math.floor((x + y) / 12) % 3 === 0 ? C.lime : Math.floor((x + y) / 12) % 3 === 1 ? C.red : C.cream;
      g.fillStyle(color, .75); g.fillCircle(x, y + 28, 2); g.fillCircle(W - x, y + 47, 2);
    }
  }
  g.fillStyle(0x183d29); g.fillRect(18, 0, 8, WORLD); g.fillRect(W - 26, 0, 8, WORLD);
  g.lineStyle(1, C.lime, .26); g.lineBetween(17, 0, 17, WORLD); g.lineBetween(W - 18, 0, W - 18, WORLD);
}

function drawHudPlate(g) {
  g.fillStyle(C.black, .96); g.fillRect(18, 15, 280, 101);
  g.fillStyle(0x57718d, .95); g.fillRect(18, 15, 280, 9); g.fillRect(18, 15, 12, 101);
  g.fillStyle(C.ink, .96); g.fillRect(34, 27, 250, 78);
  g.fillStyle(C.lime, .96); g.fillRect(38, 47, 55, 48);
  g.fillStyle(C.red, .96); g.fillRect(225, 47, 55, 48);
  g.lineStyle(2, C.cream, .85); g.strokeRect(18, 15, 280, 101);
  g.lineStyle(1, C.blue, .65); g.lineBetween(34, 27, 284, 27); g.lineBetween(34, 105, 284, 105);
  g.lineStyle(2, C.gold, .82); g.lineBetween(128, 103, 192, 103);
}

function drawDrivePlate(g) {
  g.fillStyle(C.black, .96); g.fillRect(132, 494, 536, 65);
  g.fillStyle(0x57718d, .95); g.fillRect(132, 494, 24, 8); g.fillRect(644, 551, 24, 8);
  g.fillStyle(C.ink, .96); g.fillRect(145, 503, 510, 47);
  g.lineStyle(2, C.cream, .82); g.strokeRect(132, 494, 536, 65);
  g.lineStyle(1, C.blue, .5);
  for (let x = 165; x < 640; x += 34) g.lineBetween(x, 503, x, 550);
  g.lineStyle(2, C.gold, .82); g.lineBetween(148, 548, 652, 548);
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
function fieldScreenX(y) { return (y - TOP) * W / (BOTTOM - TOP); }
function fieldScreenY(x) { return x; }
