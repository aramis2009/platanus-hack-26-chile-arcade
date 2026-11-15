const W = 800;
const H = 600;
// A 130-yard field gives long drives room to breathe; a yard is 15.4 px and each end zone 130 px.
const YD = 130;
const WORLD = 260 + YD * 15.4;
const TOP = 145;
const BOTTOM = 520;
const END = 130;
const C = { grass: 0x23683a, stripe: 0xffffff, flagBlue: 0x1671d9, gold: 0xffc857, cream: 0xf7f9ff, ink: 0x0b1b3a, red: 0xd52b1e, blue: 0x76baff, black: 0x050d20 };
// Chase camera: horizon line, camera height, focal length, distance behind the focus and nearest drawn depth.
const HZ = 130, CAMH = 240, FOC = 430, BACK = 330, NEAR = 215;
// [name, HUD code, jersey, trim/helmet, turf dark, turf light, neon lines?]; the home side (P1) paints the field.
// Only the host team, Platanus, gets neon lines: its home field doubles as the hackathon's terminal-styled stage.
const TEAMS = [
  ['OSIRIS.XP', 'OSX', 0x1c1c1c, 0xffc857, 0x1a1a1a, 0x262626],
  ['PLATANUS', 'PLT', 0xffd23f, 0xf7f9ff, 0x161616, 0x1b1b1b, 0xeeff00],
  ['REBELDES DE BOSTON', 'RDB', 0xf7f9ff, 0xd52b1e, 0x4a1418, 0x5c1a1f],
  ['SAMMIS', 'SAM', 0x1c1c1c, 0x2bd66b, 0x0f3d24, 0x145030],
  ['BERTON', 'BRT', 0x6a2bd1, 0xffc857, 0x2a1650, 0x341c62]
];
const TOP_KEY = 'oye-ibai:top5';
const TOUCHDOWN_EMOJIS =['🏈', '🎉', '🏆', '🕺', '🔥', '🍌', '🙌', '⚡', '👑', '💥'];

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
  type: Phaser.AUTO, width: W, height: H, parent: 'game-root', backgroundColor: '#050d20',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: { preload, create, update },
};
new Phaser.Game(config);

function preload() {
  this.load.image('cover', 'cover.png');
}

function create() {
  const s = this;
  s.inputState = { held: {}, pressed: {} };
  const down = e => { const c = KEY_TO_ARCADE[(e.key || '').toLowerCase()]; if (c) { if (!s.inputState.held[c]) s.inputState.pressed[c] = true; s.inputState.held[c] = true; if ((c === 'START1' || c === 'START2') && s.phase === 'select') s.sound?.context?.resume?.(); } };
  const up = e => { const c = KEY_TO_ARCADE[(e.key || '').toLowerCase()]; if (c) s.inputState.held[c] = false; };
  window.addEventListener('keydown', down); window.addEventListener('keyup', up);
  s.events.once('shutdown', () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); });
  s.phase = 'title'; s.players = [[], []]; s.possession = 0; s.scores = [0, 0]; s.turnoverUntil = 0; s.pass = null; s.fieldGoal = null; s.foulOpportunity = null; s.twoPlayers = false; s.cpuThrowAt = 0; s.down = 1; s.driveStart = WORLD / 2;
  s.cx = WORLD / 2; s.cl = W / 2; s.view = 1; s.ctrl = []; s.top = [];
  // Stored records survive releases, so anything that is not a well-formed entry is dropped.
  window.platanusArcadeStorage?.get(TOP_KEY).then(r => {
    if (Array.isArray(r?.value)) s.top = r.value.filter(e => typeof e?.n === 'string' && Number.isFinite(e.s)).slice(0, 5);
  }).catch(() => {});
  s.stadiumArt = s.add.graphics().setDepth(-2); drawStadium(s);
  s.fieldArt = s.add.graphics(); s.fieldMarks = []; makeFieldMarks(s); s.aimArt = s.add.graphics().setDepth(15);
  s.cover = s.add.image(W / 2, H / 2, 'cover').setScrollFactor(0).setDepth(16).setVisible(false);
  s.introArt = createIntroArt(s); s.twinkle = s.add.graphics().setScrollFactor(0).setDepth(16);
  // A second camera keeps the HUD and overlays out of the world camera's touchdown zoom.
  s.ui = s.cameras.add(0, 0, W, H);
  s.hudArt = s.add.graphics().setScrollFactor(0).setDepth(19);
  s.pick = [0, 1]; s.T = [TEAMS[0], TEAMS[1]];
  s.hudLeft = s.add.text(58, 41, 'P1', { fontFamily: 'Arial Black, sans-serif', fontSize: '22px', color: '#f7f9ff', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 5 }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.hudRight = s.add.text(234, 41, 'CPU', { fontFamily: 'Arial Black, sans-serif', fontSize: '22px', color: '#f7f9ff', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 5 }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.hud = s.add.text(146, 41, '', { fontFamily: 'Arial Black, sans-serif', fontSize: '28px', color: '#f7f9ff', fontStyle: 'bold', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.possBar = s.add.graphics().setScrollFactor(0).setDepth(20);
  s.hudStatus = s.add.text(686, 60, '', { fontFamily: 'monospace', fontSize: '13px', color: '#c5d9f2', fontStyle: 'bold', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.driveArt = s.add.graphics().setScrollFactor(0).setDepth(19);
  drawDrivePlate(s.driveArt);
  s.driveBanner = s.add.text(686, 31, '', { fontFamily: 'Arial Black, sans-serif', fontSize: '26px', color: '#4aa8ff', fontStyle: 'bold', align: 'center', stroke: '#050d20', strokeThickness: 4 }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  [s.hudArt, s.hudLeft, s.hudRight, s.hud, s.possBar, s.hudStatus, s.driveArt, s.driveBanner].forEach(item => item.setVisible(false));
  s.helpPlate = s.add.graphics().setScrollFactor(0).setDepth(19);
  s.helpPlate.fillStyle(C.ink, .92).fillRect(60, 548, 680, 40);
  s.helpPlate.lineStyle(1, C.cream, .38).strokeRect(60, 548, 680, 40);
  s.help = s.add.text(W / 2, 568, '', { fontFamily: 'monospace', fontSize: '15px', color: '#f7f9ff', fontStyle: 'bold', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.prompt = s.add.text(W / 2, 492, 'PRESS START', { fontFamily: 'Arial Black, sans-serif', fontSize: '24px', color: '#ffc857', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 6 }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.introTitle = s.add.text(W / 2, 70, 'OYE PLATANUS, ¿NOS VEMOS?', { fontFamily: 'Arial Black, sans-serif', fontSize: '30px', color: '#f7f9ff', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 7 }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.introTag = s.add.text(W / 2, 105, 'PLATANUS HACK 26  /  CHILE', { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 4 }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  const mono = { fontFamily: 'monospace', fontSize: '14px', color: '#f7f9ff', fontStyle: 'bold', lineSpacing: 6 }, big = { fontFamily: 'Arial Black, sans-serif', fontStyle: 'bold', color: '#f7f9ff', stroke: '#050d20', strokeThickness: 5, align: 'center' };
  s.best = s.add.text(W / 2, 530, '', { ...mono, color: '#8fd0ff' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.credit = s.add.text(W / 2, 565, 'CREATED BY ARAMIS2009', { ...mono, fontSize: '12px', color: '#c5d9f2' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.selArt = s.add.graphics().setScrollFactor(0).setDepth(35);
  s.sel = [
    s.add.text(W / 2, 64, 'CHOOSE YOUR MODE', { ...big, fontSize: '32px' }).setOrigin(.5),
    s.add.text(240, 232, '1 PLAYER\nYOU VS CPU', { ...big, fontSize: '22px' }).setOrigin(.5),
    s.add.text(560, 232, '2 PLAYERS\nP1 VS P2', { ...big, fontSize: '22px' }).setOrigin(.5),
    s.add.text(122, 330, 'P1   MOVE  WASD\n     PASS  U   LONG  O\n     JUKE / TACKLE  I\n     FIELD GOAL     J\n     PEEL / PUSH    K\n     JUMP           L', mono),
    s.add.text(432, 330, 'P2   MOVE  ARROWS\n     PASS  R   LONG  Y\n     JUKE / TACKLE  T\n     FIELD GOAL     F\n     PEEL / PUSH    G\n     JUMP           H', mono),
    s.add.text(W / 2, 512, '<  >  CHOOSE     START  PLAY     I  BACK', { ...big, fontSize: '18px', color: '#ffc857' }).setOrigin(.5),
    s.add.text(W / 2, 470, 'P2 CAN ALSO JOIN A SOLO MATCH BY MOVING', { ...mono, fontSize: '11px', color: '#c5d9f2' }).setOrigin(.5)
  ];
  s.sel.forEach(t => t.setScrollFactor(0).setDepth(36).setVisible(false));
  s.tm = [
    s.add.text(W / 2, 36, 'CHOOSE YOUR TEAM', { ...big, fontSize: '32px' }),
    ...TEAMS.map((t, i) => s.add.text(96 + i * 152, 314, `${t[1]}\n\n${t[0].replace(' ', '\n')}`, { ...big, fontSize: '13px', strokeThickness: 4 })),
    s.add.text(W / 2, 512, '<  >  CHOOSE     U  LOCK     I  BACK', { ...big, fontSize: '18px', color: '#ffc857' }),
    s.add.text(0, 0, 'P1', { ...big, fontSize: '18px', color: '#4aa8ff' }),
    s.add.text(0, 0, 'P2', { ...big, fontSize: '18px', color: '#ff5a4a' }),
    ...TEAMS.map((t, i) => s.add.text(96 + i * 152, 214, String([1, 26, 12, 23, 55][i]), { ...big, fontSize: '36px', color: '#' + t[3].toString(16).padStart(6, '0'), strokeThickness: 6 }))
  ];
  s.tm.forEach(t => t.setOrigin(.5, 0).setScrollFactor(0).setDepth(36).setVisible(false));
  s.helpPlate.setVisible(false); s.help.setVisible(false);
}

function update(time, delta) {
  const s = this, dt = Math.min(delta, 40), start = s.inputState.pressed.START1 || s.inputState.pressed.START2;
  // START2 picks the 1v1 mode wherever a match can begin; on the mode screen it only confirms a choice.
  if (start && (s.phase === 'title' || s.phase === 'over')) s.wantTwo = !!s.inputState.pressed.START2;
  if (s.phase === 'title') {
    s.prompt.setAlpha(.68 + Math.sin(time / 300) * .3);
    const f = s.twinkle.clear();
    for (let i = 0; i < 5; i++) { const a = Math.random() * 7, r = .78 + Math.random() * .2; f.fillStyle(0xffffff, Math.random()).fillCircle(W / 2 + Math.cos(a) * 392 * r, H / 2 + Math.sin(a) * 268 * r, 2.5); }
    s.best.setText(s.top[0] ? `BEST VS CPU   ${s.top[0].n}  +${s.top[0].s}` : 'BEAT THE CPU TO SET A RECORD');
    if (start) showSelect(s);
  } else if (s.phase === 'select') {
    const p = s.inputState.pressed;
    if (p.P1_L || p.P2_L) s.wantTwo = false;
    if (p.P1_R || p.P2_R || p.START2) s.wantTwo = true;
    if (p.P1_2 || p.P2_2) showTitle(s);
    else if (start || p.P1_1) showTeams(s); else drawSelect(s, time);
  } else if (s.phase === 'teams') {
    updateTeams(s, time);
  } else if (s.phase === 'initials') {
    updateInitials(s);
  } else if (s.phase === 'playing') {
    if (s.inputState.pressed.START1 || s.inputState.pressed.START2) { s.phase = 'paused'; s.message.setText('PAUSED\nPRESS START TO RESUME').setVisible(true); }
    else playFrame(s, time, dt);
  } else if (s.phase === 'tackled') {
    if (time >= s.tackleUntil) finishPlay(s, s.tackleSpot, time, 'TACKLED!');
  } else if (s.phase === 'kicking') {
    updateFieldGoal(s, time, dt);
  } else if (s.phase === 'penalty') {
    updatePenalty(s, time);
  } else if (s.phase === 'loose') {
    updateLooseBall(s, time);
  } else if (s.phase === 'countdown') {
    updateCountdown(s, time);
  } else if (s.phase === 'spotting') {
    if (time >= s.spotUntil) beginCountdown(s, time);
  } else if (s.phase === 'celebrating') {
    updateCelebration(s, time);
  } else if (s.phase === 'paused') {
    if (s.inputState.pressed.START1 || s.inputState.pressed.START2) { s.phase = 'playing'; s.message.setVisible(false); }
  } else if (s.phase === 'over' && start) startMatch(s, time);
  if (s.players[0].length) {
    renderWorld(s, time); drawAim(s, time);
    // The help bar would cover the play, so in a match it only shows before the snap and while paused.
    const help = s.phase === 'countdown' || s.phase === 'paused' || s.phase === 'penalty';
    s.helpPlate.setVisible(help); s.help.setVisible(help);
  }
  s.inputState.pressed = {};
  // Screen-fixed objects render only on the HUD camera, everything else only on the zoomed world camera.
  for (const o of s.children.list) o.cameraFilter = o.scrollFactorX ? s.ui.id : s.cameras.main.id;
}

function startMatch(s, time) {
  s.scores = [0, 0]; s.possession = 0; s.pass = null; s.fieldGoal = null; s.foulOpportunity = null; s.twoPlayers = !!s.wantTwo; s.phase = 'countdown'; s.turnoverUntil = time + 1700; s.down = 1; s.driveStart = WORLD / 2;
  s.pendingWinner = null; s.nearGoalCheered = false; s.snap = false; s.cd = [0, 0];
  [s.hudArt, s.hudLeft, s.hudRight, s.hud, s.possBar, s.hudStatus, s.driveArt, s.driveBanner].forEach(item => item.setVisible(true));
  [s.selArt, ...s.sel, ...s.tm, s.introArt, s.twinkle, ...s.introMarks, s.introTitle, s.introTag, s.prompt, s.best, s.credit].forEach(o => o.setVisible(false));
  s.T = s.pick.map(i => TEAMS[i]);
  s.hudArt.clear(); drawHudPlate(s.hudArt, s.T[0][2], s.T[1][2]);
  const hk = s.T[0][6];
  s.ez.forEach(t => t.setText(s.T[0][0])); const nm = s.T[0][0], F = Math.min(90, 1250 / nm.length);
  // Letters advance by their real glyph width (minus the stroke overlap) so the name reads as one word.
  let x = 0;
  s.midL.forEach((t, i) => { t.setText(nm[i] || '').setFontSize(F).setColor('#' + s.T[0][3].toString(16).padStart(6, '0')); t.rot = 1; t.fx = x + t.width / 2; x += t.width ? t.width - 14 : 0; });
  s.midL.forEach(t => t.fx += WORLD / 2 - x / 2);
  s.fieldMarks.forEach(m => {
    m.off = m.hk === 1 ? !hk : m.hk === 0 && !!hk;
    if (m.style?.fontSize === '9px') m.setColor(hk ? '#eeff00' : '#9acaff');
    if (m.style?.fontSize === '34px') m.setColor(hk ? '#eeff00' : '#ffffff');
  });
  s.message?.destroy();
  s.message = s.add.text(W / 2, H / 2, '', { fontFamily: 'monospace', fontSize: '30px', color: '#8fd0ff', fontStyle: 'bold', align: 'center', stroke: '#0b1b3a', strokeThickness: 8 }).setOrigin(.5).setScrollFactor(0).setDepth(30);
  startStadiumAudio(s);
  makeTeams(s, 0, s.driveStart); updateHud(s);
  beginCountdown(s, time);
}

function showTitle(s) {
  s.phase = 'title';
  [s.selArt, ...s.sel].forEach(o => o.setVisible(false));
  [s.introArt, s.twinkle, ...s.introMarks, s.introTitle, s.introTag, s.prompt, s.best, s.credit].forEach(o => o.setVisible(true));
}

function showTeams(s) {
  s.phase = 'teams'; s.lock = [0, !s.wantTwo];
  s.sel.forEach(o => o.setVisible(false)); s.tm.forEach(o => o.setVisible(true)); s.tm[8].setVisible(!!s.wantTwo);
}

// Each side browses on its own stick and locks with pass or START; nobody can lock a team the rival already locked.
function updateTeams(s, time) {
  const p = s.inputState.pressed;
  for (const t of [0, 1]) {
    const pre = 'P' + (t + 1) + '_';
    // The back button first undoes this side's lock; with nothing locked it returns to the mode screen.
    if (p[pre + '2'] && (t === 0 || s.wantTwo)) { if (s.lock[t]) s.lock[t] = 0; else return showSelect(s); }
    if (s.lock[t]) continue;
    s.pick[t] = (s.pick[t] + (p[pre + 'R'] ? 1 : 0) + (p[pre + 'L'] ? 4 : 0)) % 5;
    if ((p[pre + '1'] || p['START' + (t + 1)]) && !(s.lock[1 - t] && s.pick[0] === s.pick[1])) { s.lock[t] = 1; thud(s, 520, .12, .4, 0, 1.5); }
  }
  if (!s.wantTwo && s.pick[1] === s.pick[0]) s.pick[1] = (s.pick[0] + 1 + Phaser.Math.Between(0, 3)) % 5;
  if (s.lock[0] && s.lock[1]) return startMatch(s, time);
  const g = s.selArt.clear();
  g.fillStyle(C.black).fillRect(0, 0, W, H);
  TEAMS.forEach(([, , a, b], i) => {
    const x = 28 + i * 152, on = s.pick.indexOf(i), mine = on > -1 && (on === 0 || s.wantTwo), pop = mine && !s.lock[on] ? 3 + Math.sin(time / 150) * 3 : 0;
    g.fillStyle(C.ink, .95).fillRoundedRect(x - pop, 120 - pop, 136 + pop * 2, 300 + pop * 2, 14);
    g.lineStyle(mine ? 4 : 1, mine ? (on ? 0xff5a4a : 0x4aa8ff) : C.cream, mine ? 1 : .3).strokeRoundedRect(x - pop, 120 - pop, 136 + pop * 2, 300 + pop * 2, 14);
    // The jersey is outlined in its trim colour so the black kits still read on the navy card.
    const shirt = [38, 180, 56, 176, 68, 190, 80, 176, 98, 180, 126, 206, 112, 226, 98, 214, 98, 290, 38, 290, 38, 214, 24, 226, 10, 206].map((v, j) => v + (j % 2 ? 0 : x));
    const pts = []; for (let j = 0; j < shirt.length; j += 2) pts.push({ x: shirt[j], y: shirt[j + 1] });
    g.fillStyle(a).fillPoints(pts, true).lineStyle(3, b).strokePoints(pts, true);
    g.fillStyle(b).fillTriangle(x + 56, 176, x + 80, 176, x + 68, 190).fillRect(x + 38, 278, 60, 6);
    g.lineStyle(5, b).lineBetween(x + 12, 209, x + 25, 228).lineBetween(x + 124, 209, x + 111, 228);
    if (mine && s.lock[on]) g.fillStyle(on ? 0xff5a4a : 0x4aa8ff, .9).fillRoundedRect(x + 18, 394, 100, 14, 7);
  });
  [0, 1].forEach(t => s.tm[7 + t].setPosition(96 + s.pick[t] * 152 + (s.wantTwo && s.pick[0] === s.pick[1] ? t * 30 - 15 : 0), t ? 432 : 92).setText(s.lock[t] && (t === 0 || s.wantTwo) ? `P${t + 1} READY` : `P${t + 1}`));
  s.tm[6].setAlpha(.7 + Math.sin(time / 250) * .3);
}

function showSelect(s) {
  s.phase = 'select';
  [s.introArt, s.twinkle, ...s.introMarks, s.introTitle, s.introTag, s.prompt, s.best, s.credit].forEach(o => o.setVisible(false));
  s.tm.forEach(o => o.setVisible(false)); [s.selArt, ...s.sel].forEach(o => o.setVisible(true));
}

// Mode cards are redrawn every frame so the selected one can pulse; the P2 controls dim in solo mode.
function drawSelect(s, time) {
  const g = s.selArt.clear(), two = !!s.wantTwo;
  g.fillStyle(C.black).fillRect(0, 0, W, H);
  g.fillStyle(C.flagBlue).fillRect(0, 0, W / 2, 6); g.fillStyle(C.red).fillRect(W / 2, 0, W / 2, 6);
  g.fillStyle(C.ink, .9).fillRoundedRect(90, 310, 620, 140, 14);
  g.lineStyle(1, C.blue, .5).strokeRoundedRect(90, 310, 620, 140, 14).lineBetween(W / 2, 326, W / 2, 434);
  for (let i = 0; i < 2; i++) {
    const on = two === !!i, x = 90 + i * 320, pop = on ? 4 + Math.sin(time / 160) * 3 : 0;
    g.fillStyle(on ? C.flagBlue : C.ink, on ? .5 : .9).fillRoundedRect(x - pop, 110 - pop, 300 + pop * 2, 170 + pop * 2, 18);
    g.lineStyle(on ? 4 : 2, on ? C.gold : C.cream, on ? 1 : .3).strokeRoundedRect(x - pop, 110 - pop, 300 + pop * 2, 170 + pop * 2, 18);
    for (let h = 0; h <= i; h++) {
      const hx = x + 150 + (i ? h * 76 - 38 : 0), hy = 162, d = h ? -1 : 1;
      g.fillStyle(h ? C.red : C.flagBlue).fillCircle(hx, hy, 26).fillStyle(C.cream).fillRect(hx - 3, hy - 26, 6, 24);
      g.fillRect(hx + d * 8 - (d < 0 ? 22 : 0), hy + 2, 22, 4).fillRect(hx + d * 8 - (d < 0 ? 22 : 0), hy + 11, 22, 4).fillRect(hx + d * 28 - 2, hy - 2, 4, 18);
    }
    s.sel[1 + i].setAlpha(on ? 1 : .5);
  }
  s.sel[4].setAlpha(two ? 1 : .3); s.sel[5].setAlpha(.7 + Math.sin(time / 250) * .3);
}

function beginCountdown(s, time) {
  // Kickoffs get the full 3-2-1; a new down only needs a quick snap call so the drive keeps its rhythm.
  s.phase = 'countdown'; s.countdownUntil = time + (s.snap ? 1100 : 3500); s.countLabel = '';
  updateCountdown(s, time);
}

function updateCountdown(s, time) {
  const remaining = s.countdownUntil - time;
  if (remaining <= 0) {
    s.phase = 'playing'; s.snap = false; s.message.setText('').setFontSize('30px').setScale(1); s.turnoverUntil = time + 650; return;
  }
  const label = s.snap ? (remaining > 500 ? 'SET...' : 'HUT!') : remaining > 500 ? String(Math.ceil((remaining - 500) / 1000)) : 'KICKOFF!';
  if (label !== s.countLabel) {
    s.countLabel = label; s.message.setText(label).setFontSize('64px').setColor('#8fd0ff').setScale(.72);
    s.tweens.add({ targets: s.message, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.Out' });
  }
}

function updateCelebration(s, time) {
  const sc = s.scorer;
  // Teammates sprint to the scorer and bounce around them while the dance plays.
  if (sc && s.players[sc.team].includes(sc)) for (const m of s.players[sc.team]) if (m !== sc) {
    const dx = sc.x - m.x, dy = sc.y + (m.number - 2) * 24 - m.y, far = Math.hypot(dx, dy) > 44;
    m.x += dx * .05; m.y += dy * .05; m.moving = far; m.hop = far ? 0 : Math.abs(Math.sin(time / 140 + m.number));
  }
  if (time < s.celebrationUntil) return;
  if (s.pendingWinner !== null) {
    const m = s.scores[0] - s.scores[1];
    // Records rank solo wins by margin over the CPU; 1v1 results are not comparable.
    if (!s.twoPlayers && m > 0 && (s.top.length < 5 || m > s.top[4].s)) {
      s.phase = 'initials'; s.ini = [0, 0, 0]; s.iniPos = 0; s.margin = m; drawInitials(s);
    } else showOver(s);
    return;
  }
  s.down = 1; s.driveStart = WORLD / 2; s.snap = false;
  makeTeams(s, s.nextTeam, s.driveStart); updateHud(s);
  beginCountdown(s, time);
}

// Button 5 depends on the side: the defense drops a banana peel, the carrier stiff-arms the nearest defender.
// Each team shares one 4 s cooldown so neither move can be spammed.
function special(s, p, team, time) {
  if (time < s.cd[team] || s.pass) return;
  s.cd[team] = time + 4000;
  if (team !== s.possession) {
    s.peels.push({ x: p.x, y: p.y, until: time + 9000 });
    return playCue(s, 'BANANA PEEL!', '#ffd23f', time, 600);
  }
  if (p !== s.players[team][0]) return;
  const dist = o => Phaser.Math.Distance.Between(o.x, o.y, p.x, p.y), d = s.players[1 - team].reduce((a, b) => dist(a) < dist(b) ? a : b);
  p.pushUntil = time + 300;
  if (dist(d) > 70) return playCue(s, 'WHIFF!', '#8fd0ff', time, 400);
  d.stunUntil = d.contactUntil = time + 1300; d.x += Math.sign(d.x - p.x || 1) * 45;
  s.tweens.add({ targets: d, fall: 1, duration: 140, yoyo: true, hold: 1000 });
  playCue(s, 'STIFF ARM!', '#8fd0ff', time, 600); thud(s, 150, .2, .9); impactBurst(s, d.x, d.y, C.gold, 10); s.cameras.main.shake(100, .005);
}

function showOver(s) {
  const rows = s.top.map((e, i) => `${i + 1}. ${e.n}  +${e.s}`).join('\n') || '---';
  s.phase = 'over';
  s.message.setText(`${s.pendingScoreType || 'TOUCHDOWN'}!  ${s.T[s.pendingWinner][0]} WINS\n${s.scores[0]} - ${s.scores[1]}\n\nTOP 5 VS CPU\n${rows}\n\nPRESS START`).setFontSize('22px').setColor('#8fd0ff').setScale(1);
}

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function drawInitials(s) {
  s.message.setText(`NEW RECORD!  +${s.margin}\n\n${s.ini.map(i => ABC[i]).join(' ')}\n${' '.repeat(s.iniPos * 2)}^\n\nUP/DOWN LETTER  ·  PASS OK`).setFontSize('26px').setColor('#ffc857').setScale(1);
}

function updateInitials(s) {
  const p = s.inputState.pressed, i = s.iniPos;
  if (p.P1_U || p.P1_D) s.ini[i] = (s.ini[i] + (p.P1_U ? 1 : 25)) % 26;
  if (p.P1_L && i) s.iniPos--;
  if (p.P1_1 || p.P1_R) {
    if (i < 2) s.iniPos++;
    else {
      s.top = [...s.top, { n: s.ini.map(c => ABC[c]).join(''), s: s.margin }].sort((a, b) => b.s - a.s).slice(0, 5);
      window.platanusArcadeStorage?.set(TOP_KEY, s.top).catch(() => {});
      return showOver(s);
    }
  }
  drawInitials(s);
}

function makeTeams(s, firstTeam = 0, spot = WORLD / 2) {
  s.tacklePair = null;
  s.players.flat().forEach(p => { p.root.destroy(); p.roleLabel.destroy(); p.controlLabel.destroy(); }); s.players = [[], []];
  const starts = firstTeam === 0
    ? [[870, 860, 860, 835], [1035, 1010, 1010, 1060]]
    : [[765, 790, 790, 740], [930, 950, 950, 965]];
  const anchor = firstTeam === 0 ? 870 : 930, shift = spot - anchor;
  for (const team of starts) for (let i = 0; i < team.length; i++) team[i] = Phaser.Math.Clamp(team[i] + shift, END + 36, WORLD - END - 36);
  const lanes = [333, 205, 475, 333];
  for (let team = 0; team < 2; team++) {
    for (let i = 0; i < 4; i++) {
      const p = createPlayer(s, team, i, starts[team][i], lanes[i]);
      s.players[team].push(p);
    }
  }
  s.los = spot; s.peels = []; setPossession(s, firstTeam);
}

function createPlayer(s, team, number, x, y) {
  const [, , color, trim] = s.T[team], dark = color >> 1 & 0x7f7f7f, skin = 0xf0c49a;
  // Brighter than the kit colours so the human-controlled marker reads against the navy turf from cabinet distance.
  const pc = team ? 0xff5a4a : 0x4aa8ff;
  // Upright billboard with its origin at the feet, so the projected ground point anchors it.
  const root = s.add.container(0, 0);
  const ballRing = s.add.ellipse(0, 0, 62, 22, C.gold, .16).setStrokeStyle(2, C.gold, .9).setVisible(false); root.add(ballRing);
  root.add(s.add.ellipse(0, 0, 44, 13, C.black, .45));
  const ring = s.add.ellipse(0, 0, 80, 28).setStrokeStyle(4, pc); root.add(ring);
  // Legs and arms remain separate so the existing run cycle animates the full kit.
  const limbs = [s.add.rectangle(-7, -10, 11, 19, C.cream), s.add.rectangle(7, -10, 11, 19, C.cream), s.add.rectangle(-20, -44, 10, 23, color).setOrigin(.5, 0), s.add.rectangle(20, -44, 10, 23, color).setOrigin(.5, 0)];
  root.add(limbs);
  root.add(s.add.rectangle(-11, -2, 15, 5, C.ink).setStrokeStyle(1, C.black));
  root.add(s.add.rectangle(11, -2, 15, 5, C.ink).setStrokeStyle(1, C.black));
  root.add(s.add.rectangle(-11, -7, 3, 14, C.cream)); root.add(s.add.rectangle(11, -7, 3, 14, C.cream));
  root.add(s.add.rectangle(-7, -10, 2, 15, color)); root.add(s.add.rectangle(7, -10, 2, 15, color));
  root.add(s.add.ellipse(0, -19, 35, 18, C.cream).setStrokeStyle(2, 0xc5d9f2));
  root.add(s.add.rectangle(0, -27, 31, 4, C.ink));
  root.add(s.add.rectangle(0, -27, 7, 7, C.cream).setStrokeStyle(1, C.blue));
  root.add(s.add.ellipse(0, -44, 52, 24, dark).setStrokeStyle(2, C.cream));
  root.add(s.add.ellipse(0, -43, 43, 16, color));
  root.add(s.add.rectangle(-19, -44, 10, 5, C.cream)); root.add(s.add.rectangle(19, -44, 10, 5, C.cream));
  root.add(s.add.rectangle(-19, -44, 3, 5, trim)); root.add(s.add.rectangle(19, -44, 3, 5, trim));
  root.add(s.add.rectangle(0, -35, 30, 22, color).setStrokeStyle(2, dark));
  root.add(s.add.rectangle(-12, -43, 4, 7, trim)); root.add(s.add.rectangle(12, -43, 4, 7, trim));
  root.add(s.add.rectangle(0, -35, 3, 16, trim, .8));
  root.add(s.add.rectangle(0, -25, 11, 3, C.cream, .9));
  root.add(s.add.rectangle(-23, -28, 7, 14, skin).setStrokeStyle(1, 0xb98160));
  root.add(s.add.rectangle(23, -28, 7, 14, skin).setStrokeStyle(1, 0xb98160));
  root.add(s.add.rectangle(-23, -20, 9, 6, trim).setStrokeStyle(1, C.cream));
  root.add(s.add.rectangle(23, -20, 9, 6, trim).setStrokeStyle(1, C.cream));
  root.add(s.add.rectangle(0, -55, 12, 7, skin));
  const helmet = trim;
  root.add(s.add.ellipse(0, -68, 33, 25, helmet).setStrokeStyle(2, dark));
  root.add(s.add.ellipse(0, -75, 25, 11, 0xffffff, .35));
  root.add(s.add.rectangle(0, -68, 4, 20, color));
  root.add(s.add.ellipse(-10, -67, 4, 4, color));
  // The face cage appears when the player faces the camera, keeping the silhouette readable in play.
  const face = [s.add.rectangle(0, -62, 16, 7, skin), s.add.rectangle(0, -60, 20, 2, 0xc5d9f2), s.add.rectangle(0, -55, 22, 2, 0xc5d9f2), s.add.rectangle(-9, -58, 2, 7, 0xc5d9f2), s.add.rectangle(9, -58, 2, 7, 0xc5d9f2)]; root.add(face);
  root.add(s.add.text(0, -35, String([12, 24, 55, 87][number]), { fontFamily: 'Arial Black, sans-serif', fontSize: '14px', color: '#f7f9ff', fontStyle: 'bold', stroke: '#0b1b3a', strokeThickness: 3 }).setOrigin(.5));
  const roleLabel = s.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '10px', color: '#f7f9ff', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 4 }).setOrigin(.5).setDepth(10);
  const controlLabel = s.add.text(0, 0, team === 0 ? 'P1' : 'P2', { fontFamily: 'Arial Black, sans-serif', fontSize: '16px', color: team ? '#ff5a4a' : '#4aa8ff', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 4 }).setOrigin(.5).setDepth(11).setVisible(false);
  const banana = makeBanana(s, 15, -27, .5); root.add(banana); banana.setRotation(.6).setVisible(false);
  const arrow = s.add.triangle(0, -104, 0, 0, 22, 0, 11, 16, pc).setStrokeStyle(2, C.cream); root.add(arrow);
  return { root, limbs, face, marks: [ring, arrow], banana, roleLabel, controlLabel, ballRing, team, number, position: number, x, y, jukeUntil: 0, tackleUntil: 0 };
}

function playFrame(s, time, dt) {
  const p2Input = ['P2_U', 'P2_D', 'P2_L', 'P2_R', 'P2_1', 'P2_2', 'P2_3', 'P2_6'].some(k => held(s, k) || s.inputState.pressed[k]);
  // P2 can still drop in mid-match; once in, their player stops being AI-driven even while idle.
  if (p2Input) s.twoPlayers = true;
  const carrier = s.players[s.possession][0], attack = s.possession === 0 ? 1 : -1;
  const ballTarget = s.looseBall || carrier;
  const [human0, human1] = humans(s, carrier);
  const controlled = s.twoPlayers ? [human0, human1] : [human0];
  const controlledSet = new Set(controlled); s.aim = null;
  for (let team = 0; team < 2; team++) {
    const members = s.players[team];
    for (const p of members) {
      let vx = 0, vy = 0;
      p.roleLabel.setText(roleName(p.position, team === s.possession));
      p.ballRing.setVisible(p === carrier && !s.pass);
      if (controlledSet.has(p)) {
        const pre = team === 0 ? 'P1_' : 'P2_';
        // Directions are screen-relative and the camera turns with possession, so they flip with the view.
        vx = ((held(s, pre + 'U') ? 1 : 0) - (held(s, pre + 'D') ? 1 : 0)) * s.view;
        vy = ((held(s, pre + 'R') ? 1 : 0) - (held(s, pre + 'L') ? 1 : 0)) * s.view;
        if (p === carrier && !s.pass) s.aim = [p, passTarget(s, p, vx, vy)[0]];
        if (p === carrier && !s.pass && s.inputState.pressed[pre + '4'] && attemptFieldGoal(s, p, time)) return;
        if (p === carrier && !s.pass && s.inputState.pressed[pre + '6'] && time > (p.jumpReady || 0)) { p.jumpStart = time; p.jumpUntil = time + 620; p.jumpReady = time + 1350; p.jumpDodged = false; }
        if (p === carrier && !s.pass && (s.inputState.pressed[pre + '1'] || s.inputState.pressed[pre + '3'])) {
          throwBanana(s, p, vx, vy, time, s.inputState.pressed[pre + '3']);
        }
        if (s.inputState.pressed[pre + '5']) special(s, p, team, time);
        if (s.inputState.pressed[pre + '2']) {
          if (team === s.possession) p.jukeUntil = time + 320;
          else p.tackleUntil = time + 360;
          impactBurst(s, p.x, p.y, C.cream, 6, 1);
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
        const [targetX, targetY] = defenseTarget(s, p, ballTarget, attack, time);
        vx = Phaser.Math.Clamp((targetX - p.x) / 115, -1, 1);
        vy = Phaser.Math.Clamp((targetY - p.y) / 85, -1, 1);
      }
      if (time < (p.stunUntil || 0)) vx = vy = 0;
      const mag = Math.hypot(vx, vy) || 1;
      const dashing = time < p.jukeUntil || time < p.tackleUntil;
      const chaseGap = team !== s.possession ? Phaser.Math.Distance.Between(p.x, p.y, carrier.x, carrier.y) : 0;
      const speed = controlledSet.has(p) ? (dashing ? 325 : 238) : team === s.possession ? (p.position === 1 || p.position === 2 ? 205 : 178) : chaseGap > 160 ? 218 : 188;
      p.x = Phaser.Math.Clamp(p.x + vx / mag * speed * dt / 1000, 24, WORLD - 24);
      p.y = Phaser.Math.Clamp(p.y + vy / mag * speed * dt / 1000, TOP + 30, BOTTOM - 27);
      p.hop = time < (p.jumpUntil || 0) ? Math.sin((time - p.jumpStart) / (p.jumpUntil - p.jumpStart) * Math.PI) * 2 : 0;
      p.moving = Math.hypot(vx, vy) > .15; p.lean = p.moving ? vy / mag * s.view : 0;
      p.banana.setVisible(p === carrier && !s.pass && !s.looseBall);
    }
  }
  if (s.pass) updatePass(s, dt, time);
  if (s.looseBall) updateLooseBall(s, time);
  const current = s.players[s.possession][0];
  // The solo CPU defense lobs a peel into the carrier's path now and then, so the gag also happens in 1P.
  if (!s.twoPlayers && s.possession === 0 && time > s.cd[1] && Math.random() < .006) special(s, { x: current.x + 120, y: current.y }, 1, time);
  for (const pl of s.peels) if (!s.pass && Phaser.Math.Distance.Between(pl.x, pl.y, current.x, current.y) < 26) {
    pl.until = 0; current.stunUntil = time + 900; s.tweens.add({ targets: current, fall: 1, duration: 160, ease: 'Quad.In', yoyo: true, hold: 600 });
    playCue(s, 'SLIPPED!', '#ffd23f', time, 700); thud(s, 320, .4, .6, 0, .2); impactBurst(s, current.x, current.y, 0xffd23f, 12, 1);
  }
  s.peels = s.peels.filter(pl => pl.until > time);
  if (!s.pass && !s.looseBall && time > s.turnoverUntil) {
    for (const defender of s.players[1 - s.possession]) {
      const distance = Phaser.Math.Distance.Between(current.x, current.y, defender.x, defender.y);
      if (distance < 25 && time > (defender.contactUntil || 0)) {
        if (time < (current.jumpUntil || 0)) { if (!current.jumpDodged) { current.jumpDodged = true; current.x = Phaser.Math.Clamp(current.x + attack * 24, END + 28, WORLD - END - 28); playCue(s, 'HURDLE!', '#ffc857', time, 500); impactBurst(s, current.x, current.y, C.gold, 10, 1); } break; }
        if (!controlledSet.has(current) && time > s.cd[s.possession] && Math.random() < .3) { special(s, current, s.possession, time); break; }
        defender.contactUntil = time + 850;
        playCrowd(s, .55, .72);
        impactBurst(s, defender.x, defender.y, C.red);
        const roll = Phaser.Math.Between(1, 100);
        if (roll <= 5) { callDefensiveFoul(s, current, time); return; }
        // A juke timed into contact is the carrier's main counterplay; a dive tackle trades reach for fumble odds.
        if (roll <= (time < current.jukeUntil ? 75 : 25)) {
          current.x = Phaser.Math.Clamp(current.x - attack * 22, END + 28, WORLD - END - 28);
          playCue(s, 'BROKEN TACKLE!', '#8fd0ff', time, 400);
          break;
        }
        if (roll <= (time < defender.tackleUntil ? 45 : 32)) {
          startTackleFall(s, current, defender, time);
          dropBanana(s, current.x, current.y, time, 1 - s.possession);
          playCue(s, 'FUMBLE!', '#ef6a60', time, 750); s.cameras.main.flash(180, 213, 43, 30); thud(s, 90, .3, .9); return;
        }
        // The dead-ball pause doubles as hit-stop: the world freezes while both players go down.
        s.cameras.main.shake(160, .009); thud(s, 110, .28, 1);
        startTackleFall(s, current, defender, time);
        impactBurst(s, current.x, current.y, [C.grass, C.cream, 0x2f8a4c], 14, 1);
        s.phase = 'tackled'; s.tackleUntil = time + 650; s.tackleSpot = current.x; return;
      }
    }
  }
  if (s.messageUntil && time > s.messageUntil) { s.message.setText(''); s.messageUntil = 0; }
  const carrierNow = s.players[s.possession][0];
  const yardsToScore = s.possession === 0 ? WORLD - END - carrierNow.x : carrierNow.x - END;
  if (yardsToScore <= 240 && !s.nearGoalCheered) { playCrowd(s, .9, 1.8); s.nearGoalCheered = true; }
  else if (yardsToScore > 340) s.nearGoalCheered = false;
  const scored = s.possession === 0 ? carrierNow.x >= WORLD - END : carrierNow.x <= END;
  if (!s.looseBall && scored) scoreTouchdown(s, time);
  updateHud(s);
}

function startTackleFall(s, carrier, tackler, time) {
  s.tacklePair = { carrier, tackler, start: time };
  carrier.stunUntil = tackler.stunUntil = time + 650;
  s.tweens.add({ targets: s.cameras.main, zoom: 1.16, duration: 120, yoyo: true, hold: 220, ease: 'Quad.Out' });
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

// Shared by the throw and the aim reticle, so the highlighted receiver is always the one the pass goes to.
function passTarget(s, p, dx, dy, longPass) {
  if (!dx && !dy) dx = s.possession === 0 ? 1 : -1;
  const aimLength = Math.hypot(dx, dy), aimX = dx / aimLength, aimY = dy / aimLength;
  const targets = s.players[s.possession].filter(m => m !== p).map(m => {
    const tx = m.x - p.x, ty = m.y - p.y, dist = Math.hypot(tx, ty);
    return { p: m, alignment: (tx * aimX + ty * aimY) / Math.max(1, dist), dist };
  });
  const forward = targets.filter(t => t.alignment > 0);
  const options = forward.length ? forward : targets;
  options.sort((a, b) => b.alignment - a.alignment || (longPass ? b.dist - a.dist : a.dist - b.dist));
  return [options[0].p, aimX, aimY];
}

function throwBanana(s, p, vx, vy, time, longPass, preferredTarget) {
  const [aimed, aimX, aimY] = passTarget(s, p, vx, vy, longPass);
  const target = preferredTarget || aimed;
  const attack = s.possession === 0 ? 1 : -1;
  const lead = target.position === 1 || target.position === 2 ? attack * (longPass ? 104 : 54) : 0;
  const baseX = Phaser.Math.Clamp(target.x + lead, END + 28, WORLD - END - 28), baseY = target.y;
  const aimDot = (baseX - p.x) * aimX + (baseY - p.y) * aimY;
  const alignment = Phaser.Math.Clamp(aimDot / Math.max(1, Phaser.Math.Distance.Between(p.x, p.y, baseX, baseY)), 0, 1);
  const spread = (longPass ? 120 : 82) * (1 - alignment) + 8;
  const miss = Phaser.Math.FloatBetween(-spread, spread);
  const targetX = Phaser.Math.Clamp(baseX - aimY * miss, END + 18, WORLD - END - 18);
  const targetY = Phaser.Math.Clamp(baseY + aimX * miss, TOP + 26, BOTTOM - 24);
  const yardsToGoal = s.possession === 0 ? WORLD - END - targetX : targetX - END;
  const distance = Phaser.Math.Distance.Between(p.x, p.y, targetX, targetY);
  playCue(s, longPass ? 'LONG PASS!' : 'PASS!', '#8fd0ff', time, 520);
  impactBurst(s, p.x + attack * 18, p.y - 10, C.gold);
  const from = { x: p.x, y: p.y }, ballScale = longPass ? 1.08 : .92;
  const [sx, sy] = proj(s, p.x, p.y);
  s.pass = { from, target, targetX, targetY, x: p.x, y: p.y, elapsed: 0, trailAt: 0, duration: Phaser.Math.Clamp(distance * (longPass ? 1.15 : .95), longPass ? 340 : 260, longPass ? 780 : 560), height: longPass ? 18 : 9, ballScale, longPass, nearGoal: yardsToGoal <= 240, cheerPlayed: false, shadow: s.add.ellipse(sx, sy, 29, 10, C.black, .32).setDepth(11), visual: makeBanana(s, sx, sy, ballScale) };
  s.pass.visual.setVisible(true).setDepth(12);
}

function updatePass(s, dt, time) {
  const f = s.pass; f.elapsed += dt;
  const t = Math.min(1, f.elapsed / f.duration), target = f.target;
  if (f.nearGoal && !f.cheerPlayed && t >= .72) { playCrowd(s, 1, 2.2); f.cheerPlayed = true; }
  f.x = Phaser.Math.Linear(f.from.x, f.targetX, t); f.y = Phaser.Math.Linear(f.from.y, f.targetY, t);
  // The arc is exaggerated so the throw reads as airborne from behind the play.
  const [px, py, k] = proj(s, f.x, f.y), by = py - (32 + Math.sin(t * Math.PI) * f.height * 5) * k;
  f.shadow.setPosition(px, py).setScale(k, k * .6);
  f.visual.setPosition(px, by).setRotation(time / 90).setScale(f.ballScale * k);
  if (time >= f.trailAt) {
    const fleck = s.add.ellipse(px, by, 10 * k, 4 * k, time % 2 ? C.gold : C.cream, .56).setDepth(11);
    s.tweens.add({ targets: fleck, scale: .15, alpha: 0, duration: 210, onComplete: () => fleck.destroy() });
    f.trailAt = time + 48;
  }
  const defenders = s.players[1 - s.possession];
  for (const d of defenders) {
    if (Phaser.Math.Distance.Between(d.x, d.y - 10, f.x, f.y) < 25) {
      f.visual.destroy(); f.shadow.destroy(); s.pass = null; setPossession(s, 1 - s.possession, d); s.down = 1; s.driveStart = f.x; s.turnoverUntil = time + 1400;
      playCue(s, 'INTERCEPTED!', '#ef6a60', time, 900); impactBurst(s, d.x, d.y, C.red, 12); s.cameras.main.flash(180, 213, 43, 30); thud(s, 90, .3, .9); return;
    }
  }
  if (t >= 1) {
    const catchers = s.players[s.possession].filter(p => p !== s.players[s.possession][0]);
    const receiver = catchers.reduce((best, player) => Phaser.Math.Distance.Between(player.x, player.y, f.x, f.y) < Phaser.Math.Distance.Between(best.x, best.y, f.x, f.y) ? player : best, catchers[0]);
    f.visual.destroy(); f.shadow.destroy(); s.pass = null;
    if (Phaser.Math.Distance.Between(receiver.x, receiver.y, f.x, f.y) > 48) {
      finishPlay(s, s.los, time, 'INCOMPLETE!'); return;
    }
    receiver.x = f.x; receiver.y = f.y;
    setPossession(s, s.possession, receiver); s.turnoverUntil = time + 1100;
    playCue(s, 'CAUGHT!', '#8fd0ff', time, 560); impactBurst(s, receiver.x, receiver.y, [C.gold, C.cream], 12); thud(s, 660, .1, .4, 0, 1.5);
  }
}

function dropBanana(s, x, y, time, recoverTeam) {
  if (s.pass) {
    if (s.pass.visual.active) s.pass.visual.destroy();
    if (s.pass.shadow.active) s.pass.shadow.destroy();
    s.pass = null;
  }
  const [px, py] = proj(s, x, y);
  s.looseBall = { x, y, recoverTeam, landsAt: time + 360, timeoutAt: time + 1500, grounded: false, visual: makeBanana(s, px, py - 20, .84).setDepth(13), shadow: s.add.ellipse(px, py + 7, 28, 9, C.black, .38).setDepth(12) };
  s.players[s.possession][0].banana.setVisible(false);
}

function updateLooseBall(s, time) {
  const ball = s.looseBall;
  if (!ball) return;
  const [px, py, k] = proj(s, ball.x, ball.y);
  ball.shadow.setPosition(px, py).setScale(k, k * .6);
  if (!ball.grounded) {
    const fall = Phaser.Math.Clamp((ball.landsAt - time) / 360, 0, 1);
    ball.visual.setPosition(px, py - (8 + fall * 40) * k).setRotation(fall * 3).setScale(.84 * k);
    if (time >= ball.landsAt) {
      ball.grounded = true; s.phase = 'loose'; playCue(s, 'BALL DOWN!', '#ef6a60', time, 600);
    }
    return;
  }
  ball.visual.setPosition(px, py - 6 * k).setScale(.72 * k).setRotation(0);
  const defenders = s.players[ball.recoverTeam];
  const nearest = defenders.reduce((best, player) => Phaser.Math.Distance.Between(player.x, player.y, ball.x, ball.y) < Phaser.Math.Distance.Between(best.x, best.y, ball.x, ball.y) ? player : best, defenders[0]);
  if (Phaser.Math.Distance.Between(nearest.x, nearest.y, ball.x, ball.y) > 42 && time < ball.timeoutAt) return;
  ball.visual.destroy(); ball.shadow.destroy(); s.looseBall = null;
  s.possession = ball.recoverTeam; s.down = 1; s.driveStart = ball.x; s.turnoverUntil = time + 700;
  makeTeams(s, s.possession, ball.x);
  playCue(s, 'BANANA RECOVERED!', '#ef6a60', time, 700);
  updateHud(s); s.phase = 'spotting'; s.spotUntil = time + 700;
}

function setPossession(s, team, player) {
  if (team !== s.possession) s.nearGoalCheered = false;
  s.possession = team; s.view = team ? -1 : 1;
  s.cpuThrowAt = 0;
  const group = s.players[team];
  if (player && player !== group[0]) {
    const old = group[0]; group[0] = player; group[player.number] = old; old.number = player.number; player.number = 0;
  }
  for (const p of s.players.flat()) p.banana.setVisible(false);
  group[0].banana.setVisible(!s.pass);
}

function finishPlay(s, spot, time, result) {
  const attack = s.possession === 0 ? 1 : -1;
  spot = Phaser.Math.Clamp(spot, END + 20, WORLD - END - 20);
  const gained = (spot - s.driveStart) * attack;
  const firstDown = gained >= 154;
  const turnover = !firstDown && s.down >= 4;
  const nextTeam = turnover ? 1 - s.possession : s.possession;
  if (firstDown || turnover) { s.down = 1; s.driveStart = spot; }
  else s.down++;
  s.pass = null; s.turnoverUntil = time + 700;
  makeTeams(s, nextTeam, spot);
  let call = result;
  if (turnover) call = 'TURNOVER ON DOWNS!';
  else if (firstDown) call = 'FIRST DOWN!';
  updateHud(s);
  playCue(s, `${call}\n${s.driveBanner.text}`, turnover ? '#ef6a60' : '#8fd0ff', time, 1300);
  s.message.setFontSize('34px').setScale(.7);
  s.tweens.add({ targets: s.message, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.Out' });
  s.phase = 'spotting'; s.spotUntil = time + 1300; s.snap = true;
}

function fieldGoalDistance(s, x) {
  return (s.possession === 0 ? WORLD - END - x : x - END) / 15.4;
}

function attemptFieldGoal(s, kicker, time) {
  const foul = s.foulOpportunity;
  if (!foul || foul.team !== s.possession || time > foul.until) {
    playCue(s, 'FIELD GOAL ONLY AFTER A FOUL', '#ef6a60', time, 850);
    return false;
  }
  const yards = fieldGoalDistance(s, foul.spot);
  if (yards < 10 || yards > 20) {
    playCue(s, 'FIELD GOAL RANGE: 10-20 YDS', '#ef6a60', time, 850);
    return false;
  }
  const team = s.possession, goalX = team === 0 ? WORLD - END : END;
  const [sx, sy] = proj(s, kicker.x, kicker.y);
  const wind = Phaser.Math.Between(-12, 12), error = kicker.y - (TOP + BOTTOM) / 2 + wind;
  const visual = makeBanana(s, sx, sy - 14, .9).setDepth(13).setRotation(1.1);
  const shadow = s.add.ellipse(sx, sy, 28, 8, C.black, .38).setDepth(12);
  visual.cameraFilter = s.ui.id; shadow.cameraFilter = s.ui.id;
  s.fieldGoal = { team, spot: foul.spot, fromX: kicker.x, fromY: kicker.y, goalX, error, elapsed: 0, duration: 900, good: Math.abs(error) <= 22, visual, shadow };
  s.foulOpportunity = null;
  kicker.banana.setVisible(false); s.phase = 'kicking'; s.messageUntil = 0;
  s.message.setText('FIELD GOAL!').setColor('#f7f9ff').setFontSize('30px').setAlpha(1);
  playCrowd(s, .9, 1.5);
  return true;
}

function callDefensiveFoul(s, carrier, time) {
  const yards = fieldGoalDistance(s, carrier.x);
  if (yards >= 10 && yards <= 20) {
    s.foulOpportunity = { team: s.possession, spot: carrier.x, until: time + 5000 };
    s.penaltyUntil = time + 5000; s.penaltyDecisionAt = time + 650; s.phase = 'penalty';
    s.message.setText('PENALTY!').setColor('#f7f9ff').setFontSize('30px').setAlpha(1);
    s.help.setText('FG ONLY AFTER FOUL AT 10-20 YDS   J / F KICK   ENTER: PLAY ON');
    playCrowd(s, .8, 1.2);
    return;
  }
  const attack = s.possession === 0 ? 1 : -1;
  carrier.x = Phaser.Math.Clamp(carrier.x + attack * 77, END + 28, WORLD - END - 28);
  s.turnoverUntil = time + 700;
  playCue(s, 'DEFENSIVE FOUL! +5 YDS', '#8fd0ff', time, 900);
}

function updatePenalty(s, time) {
  const foul = s.foulOpportunity;
  if (!foul || time >= s.penaltyUntil) {
    s.foulOpportunity = null; s.phase = 'playing'; s.message.setText('');
    return;
  }
  if (foul.team === 1 && !s.twoPlayers && time >= s.penaltyDecisionAt) {
    s.penaltyDecisionAt = time + 1000;
    if (Phaser.Math.Between(1, 100) <= 58) attemptFieldGoal(s, s.players[1][0], time);
    else { s.foulOpportunity = null; s.phase = 'playing'; s.message.setText(''); }
    return;
  }
  const pre = foul.team === 0 ? 'P1_' : 'P2_';
  if (s.inputState.pressed[pre + '4']) attemptFieldGoal(s, s.players[foul.team][0], time);
  else if (s.inputState.pressed.START1 || s.inputState.pressed.START2) {
    s.foulOpportunity = null; s.phase = 'playing'; s.message.setText(''); s.turnoverUntil = time + 450;
  }
}

function updateFieldGoal(s, time, dt) {
  const kick = s.fieldGoal;
  if (!kick) return;
  kick.elapsed += dt;
  const t = Phaser.Math.Clamp(kick.elapsed / kick.duration, 0, 1);
  const [sx, sy, sk] = proj(s, kick.fromX, kick.fromY), [gx, gy, gk] = pj(s, kick.goalX, W / 2);
  const aimX = gx + kick.error * s.view * gk, groundX = Phaser.Math.Linear(sx, aimX, t), groundY = Phaser.Math.Linear(sy, gy, t);
  const scale = Phaser.Math.Linear(sk, gk, t);
  kick.shadow.setPosition(groundX, groundY).setScale(scale, scale * .5);
  kick.visual.setPosition(groundX, groundY - 58 * scale - Math.sin(t * Math.PI) * 105 * scale).setScale(.9 * scale).setRotation(1.1 + t * 5);
  if (t < 1) return;
  kick.visual.destroy(); kick.shadow.destroy(); s.fieldGoal = null;
  if (kick.good) {
    s.scores[kick.team] += 3; s.pendingWinner = s.scores[kick.team] >= 21 ? kick.team : null;
    s.pendingScoreType = 'FIELD GOAL';
    s.nextTeam = 1 - kick.team; s.celebrationUntil = time + 1900; s.nearGoalCheered = false;
    s.phase = 'celebrating'; s.message.setText('FIELD GOAL!  +3').setColor('#f7f9ff').setAlpha(1);
    playCrowd(s, 1.2, 2.1);
  } else {
    const nextTeam = 1 - kick.team;
    s.possession = nextTeam; s.down = 1; s.driveStart = kick.spot; s.turnoverUntil = time + 700;
    s.nearGoalCheered = false; makeTeams(s, nextTeam, kick.spot); updateHud(s);
    s.phase = 'spotting'; s.spotUntil = time + 950;
    playCue(s, 'NO GOOD! TURNOVER', '#ef6a60', time, 950);
  }
}

// A defender keeps control until another is clearly closer, so control does not flicker between two equidistant players.
function humans(s, carrier) {
  const d = p => Phaser.Math.Distance.Between(p.x, p.y, carrier.x, carrier.y);
  return [0, 1].map(t => {
    if (t === s.possession) return s.players[t][0];
    const best = nearestPlayer(s.players[t], carrier);
    if (!s.players[t].includes(s.ctrl[t]) || d(best) + 60 < d(s.ctrl[t])) s.ctrl[t] = best;
    return s.ctrl[t];
  });
}

function nearestPlayer(players, target) { return players.slice(1).reduce((a, b) => Phaser.Math.Distance.Between(a.x, a.y, target.x, target.y) < Phaser.Math.Distance.Between(b.x, b.y, target.x, target.y) ? a : b, players[1]); }

function scoreTouchdown(s, time) {
  s.scores[s.possession] += 6;
  s.pendingScoreType = 'TOUCHDOWN';
  const scorer = s.players[s.possession][0];
  s.cameras.main.flash(250, 225, 255, 0);
  s.cameras.main.shake(160, .004);
  impactBurst(s, scorer.x, scorer.y, C.flagBlue);
  s.phase = 'celebrating'; s.nextTeam = 1 - s.possession;
  s.pendingWinner = s.scores[s.possession] >= 21 ? s.possession : null;
  s.celebrationUntil = time + 2800; s.messageUntil = 0;
  s.scorer = scorer; scorer.moving = false; scorer.dance = Phaser.Math.Between(0, 2);
  s.nearGoalCheered = false; playCrowd(s, 1.35, 2.8);
  const emoji = TOUCHDOWN_EMOJIS[Phaser.Math.Between(0, TOUCHDOWN_EMOJIS.length - 1)];
  s.message.setText(`${emoji} TOUCHDOWN! ${emoji}\n${['BANANA SPIN', 'ROBOT', 'SPIKE!'][scorer.dance]}`).setFontSize('34px').setColor('#8fd0ff').setAlpha(1).setScale(1);
  const celebrationEmoji = s.add.text(W / 2, H / 2 - 92, emoji, { fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif', fontSize: '48px' }).setOrigin(.5).setScrollFactor(0).setDepth(29).setScale(.45);
  s.tweens.add({ targets: celebrationEmoji, y: H / 2 - 150, scale: 1.2, alpha: 0, duration: 1250, ease: 'Back.Out', onComplete: () => celebrationEmoji.destroy() });
  scorer.ballRing.setVisible(true);
  // Confetti in the flag's colours is screen-fixed, so it falls on the HUD camera and ignores the zoom.
  for (let i = 0; i < 48; i++) {
    const c = s.add.rectangle(Math.random() * W, -10 - Math.random() * 160, 6, 11, [s.T[s.possession][2], s.T[s.possession][3], C.cream][i % 3]).setScrollFactor(0).setDepth(28).setAngle(Math.random() * 180);
    s.tweens.add({ targets: c, y: H + 20, x: c.x + Phaser.Math.Between(-90, 90), angle: c.angle + 720, duration: Phaser.Math.Between(1500, 2500), ease: 'Sine.In', onComplete: () => c.destroy() });
  }
  [523, 659, 784, 1047].forEach((f, i) => thud(s, f, i > 2 ? .5 : .16, .45, i * .13, 1));
  // renderWorld owns every transform, so the dance animates a value it reads instead of the sprite.
  s.tweens.add({ targets: scorer, hop: 1, duration: 180, yoyo: true, repeat: 7, ease: 'Sine.InOut' });
  if (scorer.dance > 1) impactBurst(s, scorer.x, scorer.y, [C.gold, C.cream, s.T[s.possession][2]], 18, 1);
  s.tweens.add({ targets: scorer.ballRing, scaleX: 1.3, scaleY: .7, alpha: .7, duration: 240, yoyo: true, repeat: 4 });
  s.tweens.add({ targets: s.cameras.main, zoom: 1.25, duration: 360, ease: 'Sine.Out', yoyo: true, hold: 1320 });
}

function startStadiumAudio(s) {
  if (s.stadiumAudioCtx) return;
  const ctx = s.sound?.context;
  if (!ctx?.createBuffer || !ctx?.createGain || !ctx?.createBiquadFilter) return;
  try {
    ctx.resume()?.catch?.(() => {});
    s.stadiumAudioCtx = ctx; s.stadiumMaster = ctx.createGain(); s.stadiumMaster.gain.value = .2; s.stadiumMaster.connect(ctx.destination);
    s.crowdBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const noise = s.crowdBuffer.getChannelData(0); let low = 0;
    for (let i = 0; i < noise.length; i++) { low += (Math.random() * 2 - 1 - low) * .045; noise[i] = low * 3; }
    const crowd = ctx.createBufferSource(), crowdFilter = ctx.createBiquadFilter(), crowdGain = ctx.createGain();
    crowd.buffer = s.crowdBuffer; crowd.loop = true; crowdFilter.type = 'bandpass'; crowdFilter.frequency.value = 720; crowdFilter.Q.value = .55; crowdGain.gain.value = .06;
    crowd.connect(crowdFilter); crowdFilter.connect(crowdGain); crowdGain.connect(s.stadiumMaster); crowd.start();
  } catch (_) {
    s.stadiumAudioCtx = null; s.stadiumMaster = null;
  }
}

function playCrowd(s, intensity, duration) {
  const ctx = s.stadiumAudioCtx;
  if (!ctx || !s.crowdBuffer || ctx.state === 'suspended') return;
  const start = ctx.currentTime + .02, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), envelope = ctx.createGain();
  const peak = .12 * intensity;
  source.buffer = s.crowdBuffer; source.loop = true; filter.type = 'bandpass'; filter.Q.value = .65;
  filter.frequency.setValueAtTime(480, start); filter.frequency.linearRampToValueAtTime(1350, start + duration * .65);
  envelope.gain.setValueAtTime(.0001, start); envelope.gain.exponentialRampToValueAtTime(peak, start + Math.min(.28, duration * .3));
  envelope.gain.setValueAtTime(peak, start + duration * .55); envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
  source.connect(filter); filter.connect(envelope); envelope.connect(s.stadiumMaster); source.start(start); source.stop(start + duration + .04);
}

function playCue(s, text, color, time, duration, shake = 0) {
  s.message.setText(text).setColor(color).setAlpha(1);
  s.messageUntil = time + duration;
  if (shake) s.cameras.main.shake(130, shake);
}

// `up` turns the radial spark ring into turf kicked up from the feet.
function impactBurst(s, x, y, color, n = 8, up = 0) {
  const [sx, sy, k] = proj(s, x, y), cy = sy - (up ? 4 : 34) * k, r0 = 48 * Math.max(k, .6);
  for (let i = 0; i < n; i++) {
    const a = up ? -Math.PI * Math.random() : i * Math.PI * 2 / n, r = r0 * (up ? .5 + Math.random() * .6 : 1);
    const spark = s.add.circle(sx, cy, up ? 3 : 4, color.length ? color[i % color.length] : color, .95).setDepth(14);
    s.tweens.add({ targets: spark, x: sx + Math.cos(a) * r, y: cy + Math.sin(a) * r, scale: .35, alpha: 0, duration: 380 + up * 220, ease: 'Quad.Out', onComplete: () => spark.destroy() });
  }
}

// A sine with a pitch slide reads as a hit, a catch or a fanfare note without any audio files.
function thud(s, f, d, v, at = 0, slide = .35) {
  const ctx = s.stadiumAudioCtx;
  if (!ctx || ctx.state === 'suspended') return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + at;
  o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g); g.connect(s.stadiumMaster); o.start(t); o.stop(t + d);
}

function updateHud(s) {
  const carrier = s.players[s.possession][0], dir = s.possession === 0 ? 1 : -1;
  const toGo = Math.max(1, Math.ceil((154 - (carrier.x - s.driveStart) * dir) / 15.4));
  // Once the first-down line sits past the goal line, football calls it "& GOAL".
  const goal = (s.driveStart + 154 * dir - (dir > 0 ? WORLD - END : END)) * dir >= 0;
  const downName = ['1ST', '2ND', '3RD', '4TH'][s.down - 1];
  const mode = s.twoPlayers ? 'P1 VS P2' : 'P1 VS CPU';
  s.hudLeft.setText(s.T[0][1]); s.hudRight.setText(s.T[1][1]);
  s.hud.setText(`${s.scores[0]} - ${s.scores[1]}`);
  s.hudStatus.setText(mode);
  s.driveBanner.setText(`${downName} & ${goal ? 'GOAL' : toGo}`);
  s.possBar.clear().fillStyle(C.gold).fillRect(s.possession ? 200 : 24, 64, 68, 5);
  if (!s.twoPlayers && s.possession === 1) s.help.setText('P1 MOVE WASD   I HIT   K BANANA PEEL');
  else if (!s.twoPlayers) s.help.setText('MOVE WASD   U PASS   O LONG   I JUKE   K PUSH');
  else if (s.possession === 0) s.help.setText('P1 WASD U-O PASS K PUSH   P2 ARROWS T HIT G PEEL');
  else s.help.setText('P2 ARROWS R-Y PASS G PUSH   P1 WASD I HIT K PEEL');
}

// Chase-camera projection. Field x is depth and `l` is the lateral position in field pixels.
// Returns [screenX, screenY, scale]; the camera never rolls, so equal depths share one screen row.
function pv(s, u, m) {
  const k = FOC / Math.max(u - s.cx + BACK, 40);
  return [W / 2 + (m - s.cl) * k, HZ + CAMH * k, k];
}
// The camera always sits behind the attacking team, so team 1's view is the field rotated 180 degrees.
function pj(s, x, l) { return s.view > 0 ? pv(s, x, l) : pv(s, WORLD - x, W - l); }
function proj(s, x, y) { return pj(s, x, fieldScreenX(y)); }

function addFieldMark(s, mark, x, l) { mark.fx = x; mark.fl = l; s.fieldMarks.push(mark.setDepth(1)); return mark; }

function makeFieldMarks(s) {
  const tag0 = m => (m.hk = 0, m);
  const paint = { fontFamily: 'Arial Black, sans-serif', fontSize: '34px', color: '#ffffff', fontStyle: 'bold', stroke: '#174b2c', strokeThickness: 5 };
  const mono = { fontFamily: 'monospace', fontSize: '9px', color: '#9acaff', fontStyle: 'bold', stroke: '#0b1b3a', strokeThickness: 3 };
  s.ez = [END / 2, WORLD - END / 2].map(x => tag0(addFieldMark(s, s.add.text(0, 0, 'PLATANUS HACK 26', { ...paint, fontSize: '40px', stroke: '#07132b', strokeThickness: 6 }).setOrigin(.5), x, W / 2)));
  for (let n = 10; n < YD; n += 10) {
    // Painted just beyond their line so the stripe does not cut through the digits.
    for (const l of [112, W - 112]) addFieldMark(s, s.add.text(0, 0, String(Math.min(n, YD - n)), paint).setOrigin(.5, 1.2).setAlpha(.94), END + n * 15.4, l);
  }
  const codeBits = ['0x26', '0101', 'RUN>', 'HACK'];
  let row = 0;
  for (let x = END + 48; x < WORLD - END - 24; x += 118) {
    const code = codeBits[row++ % 4];
    for (const l of [56, W - 56]) tag0(addFieldMark(s, s.add.text(0, 0, code, mono).setOrigin(.5).setAlpha(.72), x, l));
  }
  const mid = WORLD / 2;
  // The home team's name is painted down the length of the field, one letter per depth slot so each glyph
  // gets its own perspective scale. Letters lie rotated (`rot`): their ground squash goes on the local x axis.
  s.midL = [];
  for (let i = 0; i < 18; i++) s.midL.push(tag0(addFieldMark(s, s.add.text(0, 0, '', { ...paint, stroke: '#050d20', strokeThickness: 8 }).setOrigin(.5), mid, W / 2)));
  // LED dot-matrix boards in the Platanus Hack site's style; they are the only art on Platanus's home field (hk = 1).
  dotText(s, 'led', 'PLATANUS HACK');
  for (const x of [END / 2, WORLD - END / 2]) addFieldMark(s, s.add.image(0, 0, 'led'), x, W / 2).hk = 1;
  // Like the other teams' names, the midfield board lies along the field one letter at a time: a single long
  // sprite shares one depth scale and reads as a standing sign instead of paint on the turf.
  [...'PLATANUS HACK'].forEach((c, i) => {
    if (c === ' ') return;
    if (!s.textures.exists('L' + c)) dotText(s, 'L' + c, c, 11);
    const m = addFieldMark(s, s.add.image(0, 0, 'L' + c), mid + (i - 6) * 66, W / 2); m.hk = m.rot = 1;
  });
}

// Hand-made 5x7 LED font for the letters of "PLATANUS HACK": each glyph is 7 rows in base 32, 5 bits per row.
// Rendering antialiased canvas text and sampling it gave ragged dots, so the board is plotted from these bits.
const DOTS = { P: 'uhhuggg', L: 'ggggggv', A: 'ehhvhhh', T: 'v444444', N: 'hpljhhh', U: 'hhhhhhe', S: 'fgge11u', H: 'hhhvhhh', C: 'ehggghe', K: 'hikokih' };

// Horizontal runs of lit cells merge into rounded bars, the rest stay round dots, like the Platanus Hack site board.
function dotText(s, key, str, D = 5) {
  const b = document.createElement('canvas'), y = b.getContext('2d');
  b.width = str.length * 6 * D; b.height = 7 * D; y.fillStyle = '#eeff00';
  [...str].forEach((c, i) => [...(DOTS[c] || '0000000')].forEach((r, j) => {
    const bit = k => parseInt(r, 32) >> 4 - k & 1;
    for (let k = 0; k < 5; k++) if (bit(k)) {
      let e = k; while (e < 4 && bit(e + 1)) e++;
      y.beginPath(); y.roundRect((i * 6 + k + .1) * D, (j + .1) * D, (e - k + .8) * D, D * .8, D * .4); y.fill(); k = e;
    }
  }));
  s.textures.addCanvas(key, b);
}

function renderWorld(s, time) {
  const g = s.fieldArt, L = 18, R = W - 18, carrier = s.players[s.possession][0], FAR = WORLD + 50;
  const U = x => s.view > 0 ? x : WORLD - x, M = l => s.view > 0 ? l : W - l;
  if (s.camView !== s.view) {
    // Possession changed: swing the camera round to the new attackers, masking the cut with a quick dark flash.
    if (s.camView) { s.cx = WORLD - s.cx; s.cl = W - s.cl; s.cameras.main.flash(220, 5, 13, 32); }
    s.camView = s.view;
  }
  s.cx += (U(carrier.x) - s.cx) * .08;
  s.cl += (M(Phaser.Math.Clamp(fieldScreenX(carrier.y), 280, 520)) - s.cl) * .08;
  const x0 = s.cx - BACK + NEAR;
  const poly = (color, ...p) => { g.fillStyle(color); g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < 8; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fillPath(); };
  // band and stripe take field coordinates and clip against the camera in view space.
  const band = (xa, xb, la, lb, color) => {
    let ua = U(xa), ub = U(xb);
    if (ua > ub) [ua, ub] = [ub, ua];
    ua = Math.max(ua, x0); if (ub <= ua) return;
    const a = pv(s, ua, M(la)), b = pv(s, ua, M(lb)), c = pv(s, ub, M(lb)), d = pv(s, ub, M(la));
    poly(color, a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]);
  };
  const stripe = (x, la, lb, t, color, alpha = 1) => {
    if (U(x) < x0) return;
    const a = pv(s, U(x), Math.min(M(la), M(lb))), h = Math.max(1, t * a[2]);
    g.fillStyle(color, alpha); g.fillRect(a[0], a[1] - h / 2, Math.abs(lb - la) * a[2], h);
  };
  g.clear();
  g.fillStyle(C.ink); g.fillRect(0, HZ, W, H - HZ);
  // Far stand: seat rows with crowd flecks that slide with the camera, above a perimeter board.
  const [, sb, kb] = pv(s, FAR, 0);
  for (let r = 9; r >= 0; r--) {
    g.fillStyle(r % 2 ? 0x13294f : 0x0e2040); g.fillRect(0, sb - (42 + r * 16) * kb, W, 16 * kb + 1);
    for (let c = 0; c < 36; c++) {
      g.fillStyle([C.flagBlue, C.red, C.cream][(c * 7 + r * 3) % 3], .7);
      g.fillRect(((c * 53 + r * 29 - s.cl * kb) % 860 + 860) % 860 - 30, sb - (36 + r * 16) * kb, 4 * kb + 1, 5 * kb + 1);
    }
  }
  g.fillStyle(C.flagBlue); g.fillRect(0, sb - 26 * kb, W, 26 * kb);
  g.fillStyle(C.cream); g.fillRect(0, sb - 26 * kb, W, 2);
  // Side stands: a low wall along each touchline and a raked bank of seats behind it.
  for (const [la, lb] of [[-70, -330], [W + 70, W + 330]]) {
    const a = pv(s, x0, la), b = pv(s, FAR, la), c = pv(s, FAR, lb), d = pv(s, x0, lb);
    poly(0x13294f, a[0], a[1] - 40 * a[2], b[0], b[1] - 40 * b[2], c[0], c[1] - 260 * c[2], d[0], d[1] - 260 * d[2]);
    poly(C.flagBlue, a[0], a[1], b[0], b[1], b[0], b[1] - 40 * b[2], a[0], a[1] - 40 * a[2]);
  }
  const ln = s.T[0][6] || C.cream;
  band(0, WORLD, 0, W, s.T[0][6] ? 0x0e0e0e : 0x174b2c);
  band(0, WORLD, L, R, C.grass);
  // Five-yard mowing lanes alternate natural greens, matching the painted field rhythm.
  for (let i = 0; i < YD / 5; i++) band(END + i * 77, END + i * 77 + 77, L, R, i % 2 ? s.T[0][5] : s.T[0][4]);
  band(0, END, L, R, s.T[0][6] ? 0x111111 : s.T[0][2]); band(WORLD - END, WORLD, L, R, s.T[1][2]);
  for (let n = 1; n < YD; n++) {
    const x = END + n * 15.4;
    if (n % 5 === 0) stripe(x, L, R, n % 10 ? 2 : 3, ln, n % 10 ? .84 : .98);
    // Paired hash marks sit inside the field; distant ticks are omitted to prevent shimmer.
    else if (U(x) - x0 < 820) for (const l of [W / 2 - 104, W / 2 + 92]) stripe(x, l, l + 12, 2, ln, .78);
  }
  band(0, WORLD, L, L + 5, ln); band(0, WORLD, R - 5, R, ln);
  for (const x of [3, END, WORLD - END, WORLD - 3]) stripe(x, L, R, 6, ln);
  if (s.phase !== 'over') {
    const gain = Phaser.Math.Clamp(s.driveStart + (s.possession ? -154 : 154), END, WORLD - END);
    stripe(gain, L, R, 3, C.flagBlue, .8); stripe(carrier.x, L, R, 4, C.red, .95);
  }
  for (const x of [END, WORLD - END]) {
    if (U(x) < x0) continue;
    // Goal posts and pylons stand upright, so their height scales with depth like the players do.
    const [px, py, k] = pj(s, x, W / 2);
    g.fillStyle(C.gold); g.fillRect(px - 3 * k, py - 46 * k, 6 * k, 46 * k); g.fillRect(px - 46 * k, py - 50 * k, 92 * k, 5 * k);
    g.fillRect(px - 46 * k, py - 135 * k, 4 * k, 85 * k); g.fillRect(px + 42 * k, py - 135 * k, 4 * k, 85 * k);
  }
  g.fillStyle(0xff7a1a);
  for (const x of [4, END, WORLD - END, WORLD - 4]) {
    if (U(x) < x0) continue;
    for (const l of [L, R]) { const [px, py, k] = pj(s, x, l); g.fillRect(px - 4 * k, py - 16 * k, 8 * k, 16 * k); }
  }
  for (const pl of s.peels || []) {
    const [px, py, k] = proj(s, pl.x, pl.y);
    if (k < 3) g.fillStyle(0xffd23f).fillEllipse(px, py, 34 * k, 11 * k).fillStyle(0x7a5a10).fillCircle(px - 16 * k, py, 3 * k).fillCircle(px + 16 * k, py, 3 * k);
  }
  // Haze toward the horizon gives the far end of the field some depth.
  for (let i = 1; i < 5; i++) { g.fillStyle(C.black, .09); g.fillRect(0, HZ, W, i * 16); }
  if (s.T[0][6]) {
    // CRT scanlines plus a slow refresh sweep sell the terminal look without extra objects.
    g.fillStyle(ln, .035); for (let y = HZ; y < H; y += 4) g.fillRect(0, y, W, 1);
    g.fillStyle(ln, .07).fillRect(0, HZ + time / 9 % (H - HZ), W, 26);
  }
  for (const m of s.fieldMarks) {
    const z = U(m.fx) - s.cx + BACK, k = FOC / z;
    // Flat ground art is squashed by the same factor the ground plane is foreshortened at that depth.
    if (m.setVisible(!m.off && z > NEAR * .7 && k > .22).visible) m.setPosition(...pj(s, m.fx, m.fl).slice(0, 2)).setScale(m.rot ? k * CAMH / z : k, m.rot ? k : k * CAMH / z).setRotation(m.rot ? -1.5708 * s.view : 0);
  }
  const [h0, h1] = humans(s, carrier);
  for (const p of s.players.flat()) {
    let [sx, sy, k] = proj(s, p.x, p.y);
    const pair = s.tacklePair, carrierFall = pair && p === pair.carrier, tackleDive = pair && p === pair.tackler;
    const elapsed = pair ? time - pair.start : 0, impact = pair ? Phaser.Math.Clamp(Math.min(elapsed / 120, (650 - elapsed) / 180, 1), 0, 1) : 0;
    const run = (s.phase === 'playing' || s.phase === 'celebrating') && p.moving ? Math.sin(time / 55 + p.number * 2) : 0, hop = p.hop || 0;
    if (tackleDive) { [sx, sy, k] = proj(s, pair.carrier.x, pair.carrier.y); sy -= 16 * k; }
    p.limbs[0].y = -10 - Math.max(0, run) * 7; p.limbs[1].y = -10 - Math.max(0, -run) * 7;
    p.limbs[2].scaleY = 1 - run * .28; p.limbs[3].scaleY = 1 + run * .28;
    // Dances (0 banana spin, 1 robot, 2 spike) and the stiff arm drive the arms; negative scale points an arm up.
    const d = p.dance, up = Math.sin(time / 110) > 0;
    if (d != null) { p.limbs[2].scaleY = d === 1 && up ? 1 : -1; p.limbs[3].scaleY = d === 1 ? (up ? -1 : 1) : d ? -1 : 1; }
    if (time < (p.pushUntil || 0)) p.limbs[3].scaleY = -1.3;
    // Nearer players (smaller depth) must draw over farther ones.
    const fall = carrierFall ? impact : tackleDive ? Phaser.Math.Clamp(Math.min((elapsed - 65) / 120, (650 - elapsed) / 110, 1), 0, 1) : p.fall || 0, roll = carrierFall ? -1.5 : tackleDive ? 1.55 : 1.3;
    p.root.setPosition(sx, sy - hop * 18 * k).setScale(k * (1 + hop * .1), k * (1 - hop * .12) * (carrierFall || tackleDive ? 1 - fall * .68 : 1)).setRotation((p.lean || 0) * .1 + hop * .2 + fall * roll).setDepth(8 + k * .01 + (tackleDive ? .08 : 0)).setVisible(k < 2.6);
    if (d === 0) p.root.scaleX *= Math.cos(time / 110);
    const mine = p === h0 || (s.twoPlayers && p === h1);
    p.marks.forEach(m => m.setVisible(mine)); p.face.forEach(f => f.setVisible(p.team !== s.possession));
    p.roleLabel.setPosition(sx, sy - 80 * k).setVisible(k < 2.6 && !mine);
    p.controlLabel.setPosition(sx, sy - 112 * k).setVisible(mine && k < 2.6);
  }
}

// Aim guide for a human passer: dotted throw arc, a ring under the receiver and a marker above them.
// Green means no defender within 85px (the same "open" rule the CPU uses), red means covered.
function drawAim(s, time) {
  const g = s.aimArt.clear(), a = s.aim;
  if (s.phase !== 'playing' || !a || s.pass) return;
  const [q, r] = a, open = Math.min(...s.players[1 - s.possession].map(d => Phaser.Math.Distance.Between(r.x, r.y, d.x, d.y))) >= 85;
  const col = open ? 0x4dff88 : C.red, [rx, ry, k] = proj(s, r.x, r.y), pulse = 1 + Math.sin(time / 90) * .12;
  for (let i = 1; i < 10; i++) {
    const t = i / 10, [px, py, pk] = proj(s, Phaser.Math.Linear(q.x, r.x, t), Phaser.Math.Linear(q.y, r.y, t));
    g.fillStyle(C.cream, .55).fillCircle(px, py - (32 + Math.sin(t * Math.PI) * 45) * pk, 3 * Math.max(pk, .5));
  }
  if (rx < 30 || rx > W - 30) {
    // Off-screen receiver: pin an arrow to the nearest side edge so the player knows a throw is there.
    const ex = rx < 30 ? 22 : W - 22, ey = Phaser.Math.Clamp(ry - 40 * k, 150, H - 80), d = rx < 30 ? -1 : 1;
    g.fillStyle(col).fillTriangle(ex + d * 14, ey, ex - d * 8, ey - 14, ex - d * 8, ey + 14);
    return;
  }
  g.lineStyle(4, col, .9).strokeEllipse(rx, ry, 70 * k * pulse, 24 * k * pulse);
  g.fillStyle(col).fillTriangle(rx - 11, ry - 112 * k - 18, rx + 11, ry - 112 * k - 18, rx, ry - 112 * k - 2);
}

function drawStadium(s) {
  const g = s.stadiumArt;
  g.fillStyle(C.black); g.fillRect(0, 0, W, H);
  // Floodlight banks hang in the night sky above the far stand.
  for (const x of [150, W - 150]) {
    g.fillStyle(0x8abfff, .08); g.fillCircle(x, 44, 74); g.fillStyle(0x8abfff, .1); g.fillCircle(x, 44, 42);
    g.fillStyle(0x24477b); g.fillRect(x - 3, 56, 6, 90);
    g.fillStyle(C.cream);
    for (let i = 0; i < 8; i++) g.fillRect(x - 31 + (i % 4) * 16, 30 + (i >> 2) * 14, 12, 9);
  }
}

function createIntroArt(s) {
  const g = s.add.graphics().setScrollFactor(0).setDepth(15);
  // Night sky: stacked translucent bands fade navy into black, with a few stars above the roof.
  g.fillStyle(C.black).fillRect(0, 0, W, H);
  for (let i = 0; i < 12; i++) g.fillStyle(0x16306a, .05).fillRect(0, i * 50, W, H - i * 50);
  for (let i = 0; i < 60; i++) g.fillStyle(C.cream, .25 + i % 3 * .2).fillCircle(i * 137 % W, i * 53 % 90, i % 4 ? 1 : 1.6);
  // Floodlight towers sit behind the bowl and throw soft cones onto the pitch.
  for (const x of [70, W - 70]) {
    g.fillStyle(0xfff6d0, .05).fillTriangle(x, 52, W / 2 - 150, 330, W / 2 + 150, 330);
    g.fillStyle(0x24477b).fillRect(x - 3, 52, 6, 150);
    g.fillStyle(0x8abfff, .1).fillCircle(x, 44, 60).fillStyle(0xfff6d0, .16).fillCircle(x, 44, 32);
    g.fillStyle(0x0a1630).fillRect(x - 30, 28, 60, 32).fillStyle(0xfff6d0);
    for (let i = 0; i < 8; i++) g.fillRect(x - 26 + (i % 4) * 14, 32 + (i >> 2) * 14, 10, 10);
  }
  // Tiered stands: outer rings first so inner tiers overlap them, each packed with fans in the five team colours.
  const fans = [C.gold, 0x6a2bd1, C.cream, 0xeeff00, C.red, 0x2bd66b];
  for (let t = 0; t < 6; t++) {
    const rx = 392 - t * 19, ry = 268 - t * 17, n = 130 - t * 12;
    g.fillStyle(t % 2 ? 0x0e2040 : 0x13294f).fillEllipse(W / 2, H / 2, rx * 2, ry * 2);
    for (let j = 0; j < n; j++) {
      const a = j * 6.283 / n + t * .37;
      g.fillStyle(fans[(j * 7 + t * 3) % 6], .55 + (j % 3) * .15).fillCircle(W / 2 + Math.cos(a) * (rx - 9), H / 2 + Math.sin(a) * (ry - 8), 2.4);
    }
  }
  // Roof rim with a ring of lights, then sponsor boards around the pitch in team colours.
  g.lineStyle(8, 0x0a1630).strokeEllipse(W / 2, H / 2, 790, 544);
  for (let j = 0; j < 48; j++) g.fillStyle(C.gold, .85).fillCircle(W / 2 + Math.cos(j * .1309) * 395, H / 2 + Math.sin(j * .1309) * 272, 2);
  g.fillStyle(0x0a1630).fillRoundedRect(98, 116, 604, 368, 36);
  for (let j = 0; j < 8; j++) g.fillStyle(fans[j % 6], .9).fillRect(126 + j * 70, 119, 60, 8).fillRect(126 + j * 70, 473, 60, 8);
  // Split field: Osiris.xp (black and gold) hosts the left half, Berton (purple and gold) the right.
  g.fillStyle(0x1c1c1c); g.fillRoundedRect(112, 132, 288, 336, 32); g.fillRect(380, 132, 20, 336);
  g.fillStyle(0x6a2bd1); g.fillRoundedRect(400, 132, 288, 336, 32); g.fillRect(400, 132, 20, 336);
  g.fillStyle(C.gold); g.fillRoundedRect(126, 146, 548, 308, 24);
  g.fillStyle(0x1a1a1a); g.fillRect(136, 156, 264, 288); g.fillStyle(0x2a1650); g.fillRect(400, 156, 264, 288);
  // The cover field mirrors the game's 130 yards: 418 px between goal lines, 3.215 px per yard.
  for (let i = 0; i < 13; i++) {
    g.fillStyle(i < 7 ? (i % 2 ? 0x262626 : 0x1a1a1a) : i % 2 ? 0x341c62 : 0x2a1650, .85); g.fillRect(191 + i * 32.15, 158, 16, 284);
  }
  g.fillStyle(0x0d0d0d); g.fillRect(136, 156, 55, 288);
  g.fillStyle(0x6a2bd1); g.fillRect(609, 156, 55, 288);
  g.lineStyle(2, C.gold, .94); g.strokeRect(136, 156, 528, 288);
  g.lineStyle(2, C.gold, .7);
  for (let i = 0; i <= 13; i++) {
    const x = 191 + i * 32.15;
    g.lineBetween(x, 158, x, 442);
    if (i === 0 || i === 13) { g.lineStyle(4, C.gold, .98); g.lineBetween(x, 156, x, 444); g.lineStyle(2, C.gold, .7); }
  }
  for (let i = 1; i < 65; i++) {
    const x = 191 + i * 6.43;
    g.lineBetween(x, 236, x, 248); g.lineBetween(x, 352, x, 364);
  }
  g.lineStyle(2, C.gold, .9); g.strokeCircle(400, 300, 47);
  g.lineStyle(1, C.gold, .8); g.lineBetween(400, 159, 400, 441);
  g.fillStyle(C.gold); g.fillRect(127, 279, 4, 42); g.fillRect(669, 279, 4, 42);
  s.introMarks = [];
  for (let n = 10; n <= 60; n += 10) {
    const left = 191 + n * 3.215, right = 609 - n * 3.215;
    for (const x of [left, right]) for (const y of [177, 423]) {
      s.introMarks.push(s.add.text(x, y, String(n), { fontFamily: 'Arial Black, sans-serif', fontSize: '11px', color: '#ffc857', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 2 }).setOrigin(.5).setScrollFactor(0).setDepth(17));
    }
  }
  s.introMarks.push(s.add.text(W / 2, H / 2, 'HACK 26', { fontFamily: 'Arial Black, sans-serif', fontSize: '20px', color: '#ffc857', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 5 }).setOrigin(.5).setScrollFactor(0).setDepth(18));
  return g;
}

function drawHudPlate(g, a, b) {
  g.fillStyle(C.black, .9); g.fillRect(16, 10, 260, 62);
  g.fillStyle(C.ink, .95); g.fillRect(22, 16, 248, 50);
  g.fillStyle(a); g.fillRect(24, 18, 68, 44);
  g.fillStyle(b); g.fillRect(200, 18, 68, 44);
  g.lineStyle(2, C.cream, .8); g.strokeRect(16, 10, 260, 62);
}

function drawDrivePlate(g) {
  g.fillStyle(C.black, .9); g.fillRect(588, 10, 196, 62);
  g.fillStyle(C.ink, .95); g.fillRect(594, 16, 184, 50);
  g.lineStyle(2, C.cream, .8); g.strokeRect(588, 10, 196, 62);
  g.lineStyle(1, C.gold, .72); g.lineBetween(602, 48, 770, 48);
}




function makeBanana(s, x, y, scale) {
  const c = s.add.container(x, y).setScale(scale);
  c.add(s.add.ellipse(0, 1, 55, 27, 0x8a4d18).setRotation(-.2));
  c.add(s.add.ellipse(0, 0, 51, 22, C.gold).setRotation(-.2).setStrokeStyle(2, 0x704018));
  c.add(s.add.ellipse(-2, 4, 37, 9, 0xd78c25, .72).setRotation(-.2));
  c.add(s.add.ellipse(-12, -5, 17, 4, 0xffef9c, .9).setRotation(-.2));
  c.add(s.add.ellipse(-25, -2, 8, 11, C.flagBlue).setRotation(-.45));
  c.add(s.add.ellipse(25, 2, 8, 11, 0xffdf77).setRotation(.45));
  c.add(s.add.rectangle(0, 0, 2, 12, 0x704018).setRotation(-.2));
  for (let i = -1; i <= 1; i++) c.add(s.add.rectangle(i * 5, -1, 2, 8, C.cream).setRotation(-.2));
  c.add(s.add.rectangle(-28, -2, 5, 4, 0x5e3614).setRotation(-.2)); c.add(s.add.rectangle(28, 2, 5, 4, 0x5e3614).setRotation(-.2));
  return c;
}

function held(s, key) { return s.inputState.held[key] === true; }
function fieldScreenX(y) { return (y - TOP) * W / (BOTTOM - TOP); }
