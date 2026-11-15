const W = 800;
const H = 600;
// A 130-yard field gives long drives room to breathe; a yard is 15.4 px and each end zone 130 px.
const YD = 130;
const WORLD = 260 + YD * 15.4;
const TOP = 145;
const BOTTOM = 520;
const END = 130;
const C = { grass: 0x23683a, stripe: 0xffffff, flagBlue: 0x1671d9, gold: 0xffc857, cream: 0xf7f9ff, ink: 0x0b1b3a, red: 0xd52b1e, blue: 0x76baff, black: 0x050d20 };
// Stadium bowl, in field pixels: the stands rise STAND_H over STAND_W, ROWS steps, and the corners are CORNER_R round.
const STAND_W = 360, STAND_H = 560, ROWS = 28, CORNER_R = 260, AD_H = 26, ARC = 8, PITCH = 22;
const CROWD = [0xd52b1e, 0x1671d9, 0xf7f9ff, 0xffc857, 0x6a2bd1, 0x2bd66b];
// Chase camera: horizon line, camera height, focal length, distance behind the focus and nearest drawn depth.
const HZ = 130, CAMH = 240, FOC = 390, BACK = 390, NEAR = 215;
// [name, HUD code, jersey, trim/helmet, turf dark, turf light, neon lines?]; the home side (P1) paints the field.
// Only the host team, Platanus, gets neon lines: its home field doubles as the hackathon's terminal-styled stage.
const TEAMS = [
  ['OSIRIS.XP', 'OSX', 0x1c1c1c, 0xffc857, 0x1a1a1a, 0x262626],
  ['PLATANUS', 'PLT', 0xffd23f, 0xf7f9ff, 0x161616, 0x1b1b1b, 0xeeff00],
  ['REBELDES DE BOSTON', 'RDB', 0xf7f9ff, 0xd52b1e, 0x4a1418, 0x5c1a1f],
  ['SAMMIS', 'SAM', 0x1c1c1c, 0x2bd66b, 0x0f3d24, 0x145030],
  ['BERTON', 'BRT', 0x6a2bd1, 0xffc857, 0x2a1650, 0x341c62]
];
// Shared bold fonts: Arial Black for titles and monospace for small labels.
const AB = { fontFamily: 'Arial Black, sans-serif', fontStyle: 'bold' }, MO = { fontFamily: 'monospace', fontStyle: 'bold' };
// [skin, hair] for the chibi players on the team screen.
const LOOKS = [[0xf0c49a, 0x2b1b0f], [0xc68642, 0x111111], [0xf0c49a, 0xd9a441], [0x8d5524, 0x111111], [0xe0ac69, 0x6b3b1a]];
// Ball styles for the ball screen. Curve 0 makes a football, curve 7 a banana; tips are drawn only when given.
// The last flag turns a football into a drone: four rotor arms, a camera lens at the nose and a status light.
const BALLS = [['PLATANUS BALL', 7, 11, 0xffc857, 0xd78c25, 0xfff3a8, 0xf7f9ff, 0x5e3614, 0x5e3614, 0x2b1a0d], ['CLASSIC BALL', 0, 20, 0x8a4b22, 0x5e3014, 0xc0713c, 0xf7f9ff, 0x2a1408, 0, 0],
  ['OSIRIS BALL', 0, 20, 0x1c1c1c, 0x0d0d0d, 0x4a4a4a, 0xffc857, 0xffc857, 0, 0, 1], ['NEON BALL', 0, 20, 0x0b1b3a, 0x050d20, 0x1b3a70, 0xeeff00, 0xeeff00, 0, 0]];
// Screen-fixed overlays (HUD, menus) all need the same two calls, so GameObjects get a one-call shortcut.
Phaser.GameObjects.GameObject.prototype.ui = function (d) { return this.setScrollFactor(0).setDepth(d); };
// Short aliases for the Phaser maths used all over the game logic.
const sin = Math.sin, abs = Math.abs, rand = Math.random, dst = Phaser.Math.Distance.Between, clp = Phaser.Math.Clamp, lrp = Phaser.Math.Linear, rbt = Phaser.Math.Between;
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
  scene: { create, update },
};
new Phaser.Game(config);

function create() {
  const s = this;
  // Compact custom scene fields save bytes because the challenge minifier preserves property names.
  s.b = { held: {}, pressed: {} };
  const down = e => { const c = KEY_TO_ARCADE[(e.key || '').toLowerCase()]; if (c) { if (!s.b.held[c]) s.b.pressed[c] = true; s.b.held[c] = true; if ((c === 'START1' || c === 'START2') && s.c === 'select') s.sound?.context?.resume?.(); } };
  const up = e => { const c = KEY_TO_ARCADE[(e.key || '').toLowerCase()]; if (c) s.b.held[c] = false; };
  window.addEventListener('keydown', down); window.addEventListener('keyup', up);
  s.events.once('shutdown', () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); });
  s.c = 'title'; s.d = [[], []]; s.a = 0; s.P = [0, 0]; s.e = 0; s.g = null; s.kick = null; s.H = null; s.duo = false; s.F = 0; s.A = 1; s.j = WORLD / 2;
  s.cx = WORLD / 2; s.cl = W / 2; s.s = 1; s.ctrl = []; s.top = [];
  // Stored records survive releases, so anything that is not a well-formed entry is dropped.
  window.platanusArcadeStorage?.get(TOP_KEY).then(r => {
    if (Array.isArray(r?.value)) s.top = r.value.filter(e => typeof e?.n === 'string' && Number.isFinite(e.s)).slice(0, 5);
  }).catch(() => {});
  s.bt = s.textures.createCanvas('stadium', W, H); s.gl = s.textures.createCanvas('glow', W, H);
  s.add.image(0, 0, 'stadium').setOrigin(0).setDepth(-2); s.add.image(0, 0, 'glow').setOrigin(0).setDepth(1);
  drawSky(s); buildStands(s);
  s.fieldArt = s.add.graphics(); s.v = []; makeFieldMarks(s); s.aimArt = s.add.graphics().setDepth(15);
  s.C = createIntroArt(s); s.y = s.add.graphics().ui(18);
  // A second camera keeps the HUD and overlays out of the world camera's touchdown zoom.
  s.ui = s.cameras.add(0, 0, W, H);
  s.M = s.add.graphics().ui(19);
  s.p = [0, 1]; s.T = [TEAMS[0], TEAMS[1]];
  s.V = s.add.text(58, 41, 'P1', { ...AB, fontSize: '22px', color: '#f7f9ff', stroke: '#050d20', strokeThickness: 5 }).setOrigin(.5).ui(20);
  s.D = s.add.text(234, 41, 'CPU', { ...AB, fontSize: '22px', color: '#f7f9ff', stroke: '#050d20', strokeThickness: 5 }).setOrigin(.5).ui(20);
  s.hud = s.add.text(146, 41, '', { ...AB, fontSize: '28px', color: '#f7f9ff', align: 'center' }).setOrigin(.5).ui(20);
  s.Q = s.add.graphics().ui(20);
  s.U = s.add.text(686, 60, '', { ...MO, fontSize: '13px', color: '#c5d9f2', align: 'center' }).setOrigin(.5).ui(20);
  s.E = s.add.graphics().ui(19);
  drawDrivePlate(s.E);
  s.z = s.add.text(686, 31, '', { ...AB, fontSize: '26px', color: '#4aa8ff', align: 'center', stroke: '#050d20', strokeThickness: 4 }).setOrigin(.5).ui(20);
  [s.M, s.V, s.D, s.hud, s.Q, s.U, s.E, s.z].forEach(item => item.setVisible(false));
  s.q = s.add.graphics().ui(19);
  s.q.fillStyle(C.ink, .92).fillRect(60, 548, 680, 40);
  s.q.lineStyle(1, C.cream, .38).strokeRect(60, 548, 680, 40);
  s.W = s.add.text(W / 2, 568, '', { ...MO, fontSize: '15px', color: '#f7f9ff', align: 'center' }).setOrigin(.5).ui(20);
  s.K = s.add.text(W / 2, 492, 'PRESS START', { ...AB, fontSize: '24px', color: '#ffc857', stroke: '#050d20', strokeThickness: 6 }).setOrigin(.5).ui(20);
  s.u = s.add.text(W / 2, 70, 'OYE PLATANUS, ¿NOS VEMOS?', { ...AB, fontSize: '30px', color: '#f7f9ff', stroke: '#050d20', strokeThickness: 7 }).setOrigin(.5).ui(20);
  s.B = s.add.text(W / 2, 105, 'PLATANUS HACK 26  /  CHILE', { ...MO, fontSize: '12px', color: '#ffffff', stroke: '#050d20', strokeThickness: 4 }).setOrigin(.5).ui(20);
  const mono = { ...MO, fontSize: '14px', color: '#f7f9ff', lineSpacing: 6 }, big = { ...AB, color: '#f7f9ff', stroke: '#050d20', strokeThickness: 5, align: 'center' };
  s.best = s.add.text(W / 2, 530, '', { ...mono, color: '#8fd0ff' }).setOrigin(.5).ui(20);
  s.credit = s.add.text(W / 2, 565, 'CREATED BY ARAMIS2009', { ...mono, fontSize: '12px', color: '#c5d9f2' }).setOrigin(.5).ui(20);
  s.w = s.add.graphics().ui(35);
  s.sel = [
    s.add.text(W / 2, 64, 'CHOOSE YOUR MODE', { ...big, fontSize: '32px' }).setOrigin(.5),
    s.add.text(265, 232, '1 PLAYER\nYOU VS CPU', { ...big, fontSize: '22px' }).setOrigin(.5),
    s.add.text(535, 232, '2 PLAYERS\nP1 VS P2', { ...big, fontSize: '22px' }).setOrigin(.5),
    s.add.text(168, 312, 'P1   MOVE  WASD\n     PASS  U   LONG  O\n     JUKE / TACKLE  I\n     FIELD GOAL     J\n     PEEL / PUSH    K\n     JUMP           L', mono),
    s.add.text(420, 312, 'P2   MOVE  ARROWS\n     PASS  R   LONG  Y\n     JUKE / TACKLE  T\n     FIELD GOAL     F\n     PEEL / PUSH    G\n     JUMP           H', mono),
    s.add.text(W / 2, 536, '<  >  CHOOSE     START  PLAY     I  BACK', { ...big, fontSize: '18px', color: '#ffc857' }).setOrigin(.5),
    s.add.text(W / 2, 496, 'P2 CAN ALSO JOIN A SOLO MATCH BY MOVING', { ...mono, fontSize: '11px', color: '#c5d9f2' }).setOrigin(.5)
  ];
  s.sel.forEach(t => t.ui(36).setVisible(false));
  s.tm = [
    s.add.text(W / 2, 64, 'CHOOSE YOUR TEAM', { ...big, fontSize: '32px' }),
    ...TEAMS.map((t, i) => s.add.text(156 + i * 122, 322, `${t[1]}\n\n${t[0].replace(' ', '\n')}`, { ...big, fontSize: '13px', strokeThickness: 4 })),
    s.add.text(W / 2, 536, '<  >  CHOOSE     U  LOCK     I  BACK', { ...big, fontSize: '18px', color: '#ffc857' }),
    s.add.text(0, 0, 'P1', { ...big, fontSize: '18px', color: '#4aa8ff' }),
    s.add.text(0, 0, 'P2', { ...big, fontSize: '18px', color: '#ff5a4a' }),
    ...TEAMS.map((t, i) => s.add.text(156 + i * 122, 210, String([1, 26, 12, 23, 66][i]), { ...big, fontSize: '26px', color: '#' + t[3].toString(16).padStart(6, '0'), strokeThickness: 5 }))
  ];
  s.tm.forEach(t => t.setOrigin(.5, 0).ui(36).setVisible(false));
  // Ball screen: four cards of 130 px from x = 119, with a live preview of each ball and its name.
  s.ball = 0;
  s.bl = BALLS.map((b, i) => s.add.text(184 + i * 144, 340, b[0].replace(' ', '\n'), { ...big, fontSize: '16px' }).setOrigin(.5, 0).ui(36).setVisible(false));
  s.bp = BALLS.map((b, i) => makeBanana(s, 184 + i * 144, 255, 2, i).ui(37).setVisible(false));
  s.q.setVisible(false); s.W.setVisible(false);
}

function update(time, delta) {
  const s = this, dt = Math.min(delta, 40), start = s.b.pressed.START1 || s.b.pressed.START2;
  // START2 picks the 1v1 mode wherever a match can begin; on the mode screen it only confirms a choice.
  if (start && (s.c === 'title' || s.c === 'over')) s.o = !!s.b.pressed.START2;
  if (s.c === 'title') {
    s.K.setAlpha(.68 + sin(time / 300) * .3);
    introMatch(s, time);
    if (start) showSelect(s);
  } else if (s.c === 'select') {
    const p = s.b.pressed;
    if (p.P1_L || p.P2_L) s.o = false;
    if (p.P1_R || p.P2_R || p.START2) s.o = true;
    if (p.P1_2 || p.P2_2) showTitle(s);
    else if (start || p.P1_1) showTeams(s); else drawSelect(s, time);
  } else if (s.c === 'teams') {
    updateTeams(s, time);
  } else if (s.c === 'balls') {
    updateBalls(s, time);
  } else if (s.c === 'initials') {
    updateInitials(s);
  } else if (s.c === 'playing') {
    if (s.b.pressed.START1 || s.b.pressed.START2) { s.c = 'paused'; s.h.setText('PAUSED\nPRESS START TO RESUME').setVisible(true); }
    else playFrame(s, time, dt);
  } else if (s.c === 'tackled') {
    if (time >= s.tackleUntil) finishPlay(s, s.tackleSpot, time, 'TACKLED!');
  } else if (s.c === 'kicking') {
    updateFieldGoal(s, time, dt);
  } else if (s.c === 'penalty') {
    updatePenalty(s, time);
  } else if (s.c === 'loose') {
    updateLooseBall(s, time);
  } else if (s.c === 'countdown') {
    updateCountdown(s, time);
  } else if (s.c === 'spotting') {
    if (time >= s.N) beginCountdown(s, time);
  } else if (s.c === 'celebrating') {
    updateCelebration(s, time);
  } else if (s.c === 'paused') {
    if (s.b.pressed.START1 || s.b.pressed.START2) { s.c = 'playing'; s.h.setVisible(false); }
  } else if (s.c === 'over' && start) startMatch(s, time);
  if (s.d[0].length) {
    renderWorld(s, time); drawAim(s, time);
    // The help bar would cover the play, so in a match it only shows before the snap and while paused.
    const help = s.c === 'countdown' || s.c === 'paused' || s.c === 'penalty';
    s.q.setVisible(help); s.W.setVisible(help);
  }
  s.b.pressed = {};
  // Screen-fixed objects render only on the HUD camera, everything else only on the zoomed world camera.
  for (const o of s.children.list) o.cameraFilter = o.scrollFactorX ? s.ui.id : s.cameras.main.id;
}

function startMatch(s, time) {
  s.P = [0, 0]; s.a = 0; s.g = null; s.kick = null; s.H = null; s.duo = !!s.o; s.c = 'countdown'; s.e = time + 1700; s.A = 1; s.j = WORLD / 2;
  s.J = null; s.l = false; s.snap = false; s.cd = [0, 0];
  [s.M, s.V, s.D, s.hud, s.Q, s.U, s.E, s.z].forEach(item => item.setVisible(true));
  [s.w, ...s.sel, ...s.tm, ...s.bl, ...s.bp, s.C, s.k, s.y, ...s.n, s.u, s.B, s.K, s.best, s.credit].forEach(o => o.setVisible(false));
  s.T = s.p.map(i => TEAMS[i]);
  s.M.clear(); drawHudPlate(s.M, s.T[0][2], s.T[1][2]);
  const hk = s.T[0][6];
  s.ez.forEach(t => t.setText(s.T[0][0])); const nm = s.T[0][0], F = Math.min(90, 1250 / nm.length);
  // Letters advance by their real glyph width (minus the stroke overlap) so the name reads as one word.
  let x = 0;
  s.midL.forEach((t, i) => { t.setText(nm[i] || '').setFontSize(F).setColor('#' + s.T[0][3].toString(16).padStart(6, '0')); t.rot = 1; t.fx = x + t.width / 2; x += t.width ? t.width - 14 : 0; });
  s.midL.forEach(t => t.fx += WORLD / 2 - x / 2);
  s.v.forEach(m => {
    m.off = m.hk === 1 ? !hk : m.hk === 0 && !!hk;
    if (m.style?.fontSize === '9px') m.setColor(hk ? '#eeff00' : '#9acaff');
    if (m.style?.fontSize === '34px') m.setColor(hk ? '#eeff00' : '#ffffff');
  });
  s.h?.destroy();
  s.h = s.add.text(W / 2, H / 2, '', { ...MO, fontSize: '30px', color: '#8fd0ff', align: 'center', stroke: '#0b1b3a', strokeThickness: 8 }).setOrigin(.5).ui(30);
  startStadiumAudio(s);
  makeTeams(s, 0, s.j); updateHud(s);
  beginCountdown(s, time);
}

function showTitle(s) {
  s.c = 'title';
  [s.w, ...s.sel].forEach(o => o.setVisible(false));
  [s.C, s.k, s.y, ...s.n, s.u, s.B, s.K, s.best, s.credit].forEach(o => o.setVisible(true));
}

function showTeams(s) {
  s.c = 'teams'; s.t = [0, !s.o];
  [...s.sel, ...s.bl, ...s.bp].forEach(o => o.setVisible(false)); s.tm.forEach(o => o.setVisible(true)); s.tm[8].setVisible(!!s.o); s.tm[0].setText('CHOOSE YOUR TEAM');
}

// The ball is shared by both sides; either player can browse and lock it, and back returns to the team screen.
function showBalls(s) {
  s.c = 'balls';
  s.tm.forEach(o => o.setVisible(false)); [s.tm[0], s.tm[6], ...s.bl, ...s.bp].forEach(o => o.setVisible(true)); s.tm[0].setText('CHOOSE YOUR BALL');
}

function updateBalls(s, time) {
  const p = s.b.pressed;
  if (p.P1_2 || p.P2_2) return showTeams(s);
  s.ball = (s.ball + (p.P1_R || p.P2_R ? 1 : 0) + (p.P1_L || p.P2_L ? 3 : 0)) % 4;
  if (p.P1_1 || p.P2_1 || p.START1 || p.START2) return startMatch(s, time);
  const g = s.w.clear();
  BALLS.forEach((b, i) => {
    const on = i === s.ball, x = 119 + i * 144, pop = on ? 3 + sin(time / 150) * 3 : 0;
    g.fillStyle(on ? 0x1b3a70 : 0x0f2447, .96).fillRoundedRect(x - pop, 170 - pop, 130 + pop * 2, 230 + pop * 2, 14);
    g.lineStyle(on ? 4 : 2, on ? C.gold : 0x2f5090).strokeRoundedRect(x - pop, 170 - pop, 130 + pop * 2, 230 + pop * 2, 14);
    s.bp[i].setPosition(x + 65, 255 + (on ? -abs(sin(time / 170)) * 8 : 0)).setRotation(on ? sin(time / 300) * .3 : -.3);
    s.bl[i].setAlpha(on ? 1 : .5);
  });
  s.tm[6].setAlpha(.7 + sin(time / 250) * .3);
}

// Each side browses on its own stick and locks with pass or START; nobody can lock a team the rival already locked.
function updateTeams(s, time) {
  const p = s.b.pressed;
  for (const t of [0, 1]) {
    const pre = 'P' + (t + 1) + '_';
    // The back button first undoes this side's lock; with nothing locked it returns to the mode screen.
    if (p[pre + '2'] && (t === 0 || s.o)) { if (s.t[t]) s.t[t] = 0; else return showSelect(s); }
    if (s.t[t]) continue;
    s.p[t] = (s.p[t] + (p[pre + 'R'] ? 1 : 0) + (p[pre + 'L'] ? 4 : 0)) % 5;
    if ((p[pre + '1'] || p['START' + (t + 1)]) && !(s.t[1 - t] && s.p[0] === s.p[1])) { s.t[t] = 1; thud(s, 520, .12, .4, 0, 1.5); }
  }
  if (!s.o && s.p[1] === s.p[0]) s.p[1] = (s.p[0] + 1 + rbt(0, 3)) % 5;
  if (s.t[0] && s.t[1]) return showBalls(s);
  const g = s.w.clear();
  TEAMS.forEach(([, , a, b], i) => {
    const x = 100 + i * 122, on = s.p.indexOf(i), mine = on > -1 && (on === 0 || s.o), pop = mine && !s.t[on] ? 3 + sin(time / 150) * 3 : 0;
    g.fillStyle(0x0f2447, .96).fillRoundedRect(x - pop, 136 - pop, 112 + pop * 2, 290 + pop * 2, 14);
    g.lineStyle(mine ? 4 : 2, mine ? (on ? 0xff5a4a : 0x4aa8ff) : 0x2f5090).strokeRoundedRect(x - pop, 136 - pop, 112 + pop * 2, 290 + pop * 2, 14);
    // The same chibi the field uses; the chosen one hops until it locks in.
    const bob = mine && !s.t[on] ? -abs(sin(time / 170)) * 6 : 0;
    g.fillStyle(C.black, .4).fillEllipse(x + 56, 307, 80, 14);
    paint(g, chibi(a, b, LOOKS[i]).slice(0, 7), x + 56, 160 + bob, 3); s.tm[9 + i].y = 210 + bob;
    if (mine && s.t[on]) g.fillStyle(on ? 0xff5a4a : 0x4aa8ff, .9).fillRoundedRect(x + 8, 400, 96, 14, 7);
  });
  [0, 1].forEach(t => s.tm[7 + t].setPosition(156 + s.p[t] * 122 + (s.o && s.p[0] === s.p[1] ? t * 30 - 15 : 0), t ? 436 : 102).setText(s.t[t] && (t === 0 || s.o) ? `P${t + 1} READY` : `P${t + 1}`));
  s.tm[6].setAlpha(.7 + sin(time / 250) * .3);
}

function showSelect(s) {
  s.c = 'select';
  [s.k, s.y, ...s.n, s.u, s.B, s.K, s.best, s.credit, ...s.tm].forEach(o => o.setVisible(false));
  [s.C, s.w, ...s.sel].forEach(o => o.setVisible(true));
}

// Mode cards are redrawn every frame so the selected one can pulse; the P2 controls dim in solo mode.
function drawSelect(s, time) {
  const g = s.w.clear(), two = !!s.o;
  g.fillStyle(0x050d20, .92).fillRoundedRect(150, 296, 500, 160, 16).lineStyle(2, C.gold, .6).strokeRoundedRect(150, 296, 500, 160, 16);
  g.lineStyle(1, 0x2f5090).lineBetween(W / 2, 312, W / 2, 440);
  for (let i = 0; i < 2; i++) {
    const on = two === !!i, x = 140 + i * 270, pop = on ? 3 + sin(time / 160) * 3 : 0;
    g.fillStyle(on ? 0x1b3a70 : 0x0f2447, .96).fillRoundedRect(x - pop, 126 - pop, 250 + pop * 2, 150 + pop * 2, 18);
    g.lineStyle(on ? 4 : 2, on ? C.gold : 0x2f5090).strokeRoundedRect(x - pop, 126 - pop, 250 + pop * 2, 150 + pop * 2, 18);
    // The helmeted head of the field players: a blue helmet for P1 and a red one for P2.
    for (let h = 0; h <= i; h++) paint(g, chibi(C.cream, h ? 0xff5a4a : 0x4aa8ff, LOOKS[h ? 1 : 0]).slice(5, 7), x + 125 + (i ? h * 80 - 40 : 0), 148, 3.2);
    s.sel[1 + i].setAlpha(on ? 1 : .5);
  }
  s.sel[4].setAlpha(two ? 1 : .3); s.sel[5].setAlpha(.7 + sin(time / 250) * .3);
}

function beginCountdown(s, time) {
  // Kickoffs get the full 3-2-1; a new down only needs a quick snap call so the drive keeps its rhythm.
  s.c = 'countdown'; s.countEnd = time + (s.snap ? 1100 : 3500); s.I = '';
  updateCountdown(s, time);
}

function updateCountdown(s, time) {
  const remaining = s.countEnd - time;
  if (remaining <= 0) {
    s.c = 'playing'; s.snap = false; s.h.setText('').setFontSize('30px').setScale(1); s.e = time + 650;
    // Play call for a CPU passer: a third of snaps are runs, the rest drop back or roll out and look downfield.
    s.qb = s.d[s.a][0]; s.call = [0, 0, 1, 1, 1, 2, 2][rbt(0, 6)]; s.callAt = time; s.readAt = rbt(600, 1400); s.dropping = 0; return;
  }
  const label = s.snap ? (remaining > 500 ? 'SET...' : 'HUT!') : remaining > 500 ? String(Math.ceil((remaining - 500) / 1000)) : 'KICKOFF!';
  if (label !== s.I) {
    s.I = label; s.h.setText(label).setFontSize('64px').setColor('#8fd0ff').setScale(.72);
    s.tweens.add({ targets: s.h, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.Out' });
  }
}

function updateCelebration(s, time) {
  const sc = s.scorer;
  // Teammates sprint to the scorer and bounce around them while the dance plays.
  if (sc && s.d[sc.team].includes(sc)) for (const m of s.d[sc.team]) if (m !== sc) {
    const dx = sc.x - m.x, dy = sc.y + (m.number - 2) * 24 - m.y, far = Math.hypot(dx, dy) > 44;
    m.x += dx * .05; m.y += dy * .05; m.moving = far; m.hop = far ? 0 : abs(sin(time / 140 + m.number));
  }
  if (time < s.r) return;
  if (s.J !== null) {
    const m = s.P[0] - s.P[1];
    // Records rank solo wins by margin over the CPU; 1v1 results are not comparable.
    if (!s.duo && m > 0 && (s.top.length < 5 || m > s.top[4].s)) {
      s.c = 'initials'; s.ini = [0, 0, 0]; s.L = 0; s.margin = m; drawInitials(s);
    } else showOver(s);
    return;
  }
  s.A = 1; s.j = WORLD / 2; s.snap = false;
  makeTeams(s, s.nextTeam, s.j); updateHud(s);
  beginCountdown(s, time);
}

// Button 5 depends on the side: the defense drops a banana peel, the carrier stiff-arms the nearest defender.
// Each team shares one 4 s cooldown so neither move can be spammed.
function special(s, p, team, time) {
  if (time < s.cd[team] || s.g) return;
  s.cd[team] = time + 4000;
  if (team !== s.a) {
    s.S.push({ x: p.x, y: p.y, until: time + 9000 });
    return playCue(s, 'BANANA PEEL!', '#ffd23f', time, 600);
  }
  if (p !== s.d[team][0]) return;
  const dist = o => dst(o.x, o.y, p.x, p.y), d = s.d[1 - team].reduce((a, b) => dist(a) < dist(b) ? a : b);
  p.pushUntil = time + 300;
  if (dist(d) > 70) return playCue(s, 'WHIFF!', '#8fd0ff', time, 400);
  d.stunUntil = d.contactUntil = time + 1300; d.x += Math.sign(d.x - p.x || 1) * 45;
  s.tweens.add({ targets: d, fall: 1, duration: 140, yoyo: true, hold: 1000 });
  playCue(s, 'STIFF ARM!', '#8fd0ff', time, 600); thud(s, 150, .2, .9); impactBurst(s, d.x, d.y, C.gold, 10); s.cameras.main.shake(100, .005);
}

function showOver(s) {
  const rows = s.top.map((e, i) => `${i + 1}. ${e.n}  +${e.s}`).join('\n') || '---';
  s.c = 'over';
  s.h.setText(`${s.O || 'TOUCHDOWN'}!  ${s.T[s.J][0]} WINS\n${s.P[0]} - ${s.P[1]}\n\nTOP 5 VS CPU\n${rows}\n\nPRESS START`).setFontSize('22px').setColor('#8fd0ff').setScale(1);
}

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function drawInitials(s) {
  s.h.setText(`NEW RECORD!  +${s.margin}\n\n${s.ini.map(i => ABC[i]).join(' ')}\n${' '.repeat(s.L * 2)}^\n\nUP/DOWN LETTER  ·  PASS OK`).setFontSize('26px').setColor('#ffc857').setScale(1);
}

function updateInitials(s) {
  const p = s.b.pressed, i = s.L;
  if (p.P1_U || p.P1_D) s.ini[i] = (s.ini[i] + (p.P1_U ? 1 : 25)) % 26;
  if (p.P1_L && i) s.L--;
  if (p.P1_1 || p.P1_R) {
    if (i < 2) s.L++;
    else {
      s.top = [...s.top, { n: s.ini.map(c => ABC[c]).join(''), s: s.margin }].sort((a, b) => b.s - a.s).slice(0, 5);
      window.platanusArcadeStorage?.set(TOP_KEY, s.top).catch(() => {});
      return showOver(s);
    }
  }
  drawInitials(s);
}

function makeTeams(s, firstTeam = 0, spot = WORLD / 2) {
  s.G = null;
  s.d.flat().forEach(p => { p.root.destroy(); p.roleLabel.destroy(); p.controlLabel.destroy(); }); s.d = [[], []];
  const starts = firstTeam === 0
    ? [[870, 860, 860, 835], [1035, 1010, 1010, 1060]]
    : [[765, 790, 790, 740], [930, 950, 950, 965]];
  const anchor = firstTeam === 0 ? 870 : 930, shift = spot - anchor;
  for (const team of starts) for (let i = 0; i < team.length; i++) team[i] = clp(team[i] + shift, END + 36, WORLD - END - 36);
  const lanes = [333, 205, 475, 333];
  for (let team = 0; team < 2; team++) {
    for (let i = 0; i < 4; i++) {
      const p = createPlayer(s, team, i, starts[team][i], lanes[i]);
      s.d[team].push(p);
    }
  }
  s.los = spot; s.S = []; setPossession(s, firstTeam);
}

// Pixel-art player on a 48-unit grid (feet at y = 48). Every body part is a list of [colour, x, y, w, h] with a dark outline
// underneath. The team screen draws it at 3 px per unit and the field builds the same lists as game objects.
function chibi(a, b, [skin, hair]) {
  const K = 0x111111, F = 0xf7f9ff, M = 0xc5d0e0, D = b >> 1 & 0x7f7f7f, outl = l => l.map(([, x, y, w, h]) => [K, x - 1, y - 1, w + 2, h + 2]).concat(l);
  const leg = x => outl([[b, x, 30, 7, 10], [a, x + (x < 0 ? 0 : 6), 30, 1, 10], [a, x + 1, 40, 5, 5], [b, x + 1, 42, 5, 1], [F, x, 45, 7, 3], [K, x, 47, 7, 1]]);
  const arm = x => outl([[a, x, 17, 4, 10], [b, x, 19, 4, 1], [b, x, 21, 4, 1], [b, x, 26, 4, 1], [skin, x, 27, 4, 3]]);
  const eye = x => [[K, x, 7, 2, 3], [F, x, 7, 1, 1]];
  return [leg(-8), leg(1),
    outl([[skin, -3, 13, 6, 2], [a, -9, 14, 18, 16], [a, -11, 14, 22, 5], [b, -11, 14, 22, 1], [b, -9, 28, 18, 2], [b, -4, 14, 8, 1], [skin, -2, 14, 4, 1]]),
    arm(-13), arm(9),
    outl([[skin, -8, 0, 16, 14], [b, -10, -3, 20, 9], [b, -10, 4, 3, 7], [b, 7, 4, 3, 7], [D, 7, -3, 3, 9], [a, -1, -3, 2, 9], [F, -8, -2, 5, 1], [K, -7, 6, 14, 1], [K, -9, 7, 2, 2], [K, 7, 7, 2, 2]]),
    [...eye(-4), ...eye(2), [0xb5523b, -2, 12, 4, 1], ...[11, 13].map(y => [M, -7, y, 14, 1]), [M, -7, 6, 1, 8], [M, 6, 6, 1, 8]],
    [[b, -10, -3, 20, 15], [D, 6, -3, 4, 15], [a, -1, -3, 2, 15], [F, -8, -2, 5, 1], [hair, -7, 12, 14, 2]]];
}

// Draws chibi part lists with a canvas transform: pixel units to px at scale k, anchored at (x, y).
function paint(g, parts, x, y, k) {
  g.save().translateCanvas(x, y).scaleCanvas(k, k);
  parts.forEach(l => l.forEach(([c, ...r]) => g.fillStyle(c).fillRect(...r)));
  g.restore();
}

function createPlayer(s, team, number, x, y) {
  const [, , color, trim] = s.T[team], K = 1.8;
  // Brighter than the kit colours so the human-controlled marker reads against the navy turf from cabinet distance.
  const pc = team ? 0xff5a4a : 0x4aa8ff;
  // Upright billboard with its origin at the feet, so the projected ground point anchors it.
  const root = s.add.container(0, 0);
  const ballRing = s.add.ellipse(0, 0, 62, 22, C.gold, .16).setStrokeStyle(2, C.gold, .9).setVisible(false); root.add(ballRing);
  root.add(s.add.ellipse(0, 0, 44, 13, C.black, .45));
  const ring = s.add.ellipse(0, 0, 80, 28).setStrokeStyle(4, pc); root.add(ring);
  // Each part group is a container pivoting at (ox, oy), so the run cycle can lift a leg or swing an arm as one piece.
  const grp = (list, ox = 0, oy = 48) => {
    const c = s.add.container(ox * K, (oy - 48) * K);
    list.forEach(([col, px, py, w, h]) => c.add(s.add.rectangle((px + w / 2 - ox) * K, (py - oy) * K, w * K, h * K, col).setOrigin(.5, 0)));
    return root.add(c) && c;
  };
  const [legL, legR, body, armL, armR, head, face, nape] = chibi(color, trim, LOOKS[s.p[team]]);
  const limbs = [grp(legL), grp(legR)]; grp(body); limbs.push(grp(armL, -11, 17), grp(armR, 11, 17)); grp(head);
  // Facing the camera shows the face; facing away shows the back of the head.
  const napeG = grp(nape), faceG = grp(face);
  root.add(s.add.text(0, -47, String([12, 24, 55, 87][number]), { ...AB, fontSize: '13px', color: '#f7f9ff', stroke: '#0b1b3a', strokeThickness: 3 }).setOrigin(.5));
  const roleLabel = s.add.text(0, 0, '', { ...MO, fontSize: '10px', color: '#f7f9ff', stroke: '#050d20', strokeThickness: 4 }).setOrigin(.5).setDepth(10);
  const controlLabel = s.add.text(0, 0, team === 0 ? 'P1' : 'P2', { ...AB, fontSize: '16px', color: team ? '#ff5a4a' : '#4aa8ff', stroke: '#050d20', strokeThickness: 4 }).setOrigin(.5).setDepth(11).setVisible(false);
  const banana = makeBanana(s, 17, -36, .5); root.add(banana); banana.setRotation(.6).setVisible(false);
  const arrow = s.add.triangle(0, -126, 0, 0, 22, 0, 11, 16, pc).setStrokeStyle(2, C.cream); root.add(arrow);
  return { root, limbs, face: [faceG], nape: napeG, marks: [ring, arrow], banana, roleLabel, controlLabel, ballRing, team, number, position: number, x, y, jukeUntil: 0, tackleUntil: 0 };
}

function playFrame(s, time, dt) {
  const p2Input = ['P2_U', 'P2_D', 'P2_L', 'P2_R', 'P2_1', 'P2_2', 'P2_3', 'P2_6'].some(k => held(s, k) || s.b.pressed[k]);
  // P2 can still drop in mid-match; once in, their player stops being AI-driven even while idle.
  if (p2Input) s.duo = true;
  const carrier = s.d[s.a][0], attack = s.a === 0 ? 1 : -1;
  const ballTarget = s.x || carrier;
  const [human0, human1] = humans(s, carrier);
  const controlled = s.duo ? [human0, human1] : [human0];
  const controlledSet = new Set(controlled); s.aim = null;
  for (let team = 0; team < 2; team++) {
    const members = s.d[team];
    for (const p of members) {
      let vx = 0, vy = 0;
      p.roleLabel.setText(roleName(p.position, team === s.a));
      p.ballRing.setVisible(p === carrier && !s.g);
      if (controlledSet.has(p)) {
        const pre = team === 0 ? 'P1_' : 'P2_';
        // Directions are screen-relative and the camera turns with possession, so they flip with the view.
        vx = ((held(s, pre + 'U') ? 1 : 0) - (held(s, pre + 'D') ? 1 : 0)) * s.s;
        vy = ((held(s, pre + 'R') ? 1 : 0) - (held(s, pre + 'L') ? 1 : 0)) * s.s;
        if (p === carrier && !s.g) s.aim = [p, passTarget(s, p, vx, vy)[0]];
        if (p === carrier && !s.g && s.b.pressed[pre + '4'] && attemptFieldGoal(s, p, time)) return;
        if (p === carrier && !s.g && s.b.pressed[pre + '6'] && time > (p.jumpReady || 0)) { p.jumpStart = time; p.jumpUntil = time + 620; p.jumpReady = time + 1350; p.jumpDodged = false; }
        if (p === carrier && !s.g && (s.b.pressed[pre + '1'] || s.b.pressed[pre + '3'])) {
          throwBanana(s, p, vx, vy, time, s.b.pressed[pre + '3']);
        }
        if (s.b.pressed[pre + '5']) special(s, p, team, time);
        if (s.b.pressed[pre + '2']) {
          if (team === s.a) p.jukeUntil = time + 320;
          else p.tackleUntil = time + 360;
          impactBurst(s, p.x, p.y, C.cream, 6, 1);
        }
      } else if (p === carrier) {
        if (!s.g) {
          const intent = cpuCarryIntent(s, p, attack, time);
          vx = intent.vx; vy = intent.vy;
          if (intent.receiver && time >= s.F) {
            throwBanana(s, p, attack, Math.sign(intent.receiver.y - p.y), time, intent.longPass, intent.receiver);
            s.F = time + 1450;
          }
        }
      } else if (team === s.a) {
        const [targetX, targetY] = offenseTarget(s, p, carrier, attack, time);
        vx = clp((targetX - p.x) / 120, -1, 1);
        vy = clp((targetY - p.y) / 90, -1, 1);
      } else if (team !== s.a) {
        const [targetX, targetY] = defenseTarget(s, p, ballTarget, attack, time);
        vx = clp((targetX - p.x) / 115, -1, 1);
        vy = clp((targetY - p.y) / 85, -1, 1);
      }
      if (time < (p.stunUntil || 0)) vx = vy = 0;
      const mag = Math.hypot(vx, vy) || 1;
      const dashing = time < p.jukeUntil || time < p.tackleUntil;
      const chaseGap = team !== s.a ? dst(p.x, p.y, carrier.x, carrier.y) : 0;
      const speed = controlledSet.has(p) ? (dashing ? 325 : 238) : team === s.a ? (p.position === 1 || p.position === 2 ? 205 : 178) : chaseGap > 160 ? 218 : 188;
      p.x = clp(p.x + vx / mag * speed * dt / 1000, 24, WORLD - 24);
      p.y = clp(p.y + vy / mag * speed * dt / 1000, TOP + 30, BOTTOM - 27);
      p.hop = time < (p.jumpUntil || 0) ? sin((time - p.jumpStart) / (p.jumpUntil - p.jumpStart) * Math.PI) * 2 : 0;
      p.moving = Math.hypot(vx, vy) > .15; p.lean = p.moving ? vy / mag * s.s : 0;
      p.banana.setVisible(p === carrier && !s.g && !s.x);
    }
  }
  if (s.g) updatePass(s, dt, time);
  if (s.x) updateLooseBall(s, time);
  const current = s.d[s.a][0];
  // The solo CPU defense lobs a peel into the carrier's path now and then, so the gag also happens in 1P.
  if (!s.duo && s.a === 0 && time > s.cd[1] && rand() < .006) special(s, { x: current.x + 120, y: current.y }, 1, time);
  for (const pl of s.S) if (!s.g && dst(pl.x, pl.y, current.x, current.y) < 26) {
    pl.until = 0; current.stunUntil = time + 900; s.tweens.add({ targets: current, fall: 1, duration: 160, ease: 'Quad.In', yoyo: true, hold: 600 });
    playCue(s, 'SLIPPED!', '#ffd23f', time, 700); thud(s, 320, .4, .6, 0, .2); impactBurst(s, current.x, current.y, 0xffd23f, 12, 1);
  }
  s.S = s.S.filter(pl => pl.until > time);
  if (!s.g && !s.x && time > s.e) {
    for (const defender of s.d[1 - s.a]) {
      const distance = dst(current.x, current.y, defender.x, defender.y);
      if (distance < 25 && time > (defender.contactUntil || 0)) {
        if (time < (current.jumpUntil || 0)) { if (!current.jumpDodged) { current.jumpDodged = true; current.x = clp(current.x + attack * 24, END + 28, WORLD - END - 28); playCue(s, 'HURDLE!', '#ffc857', time, 500); impactBurst(s, current.x, current.y, C.gold, 10, 1); } break; }
        if (!controlledSet.has(current) && time > s.cd[s.a] && rand() < .3) { special(s, current, s.a, time); break; }
        defender.contactUntil = time + 850;
        playCrowd(s, .55, .72);
        impactBurst(s, defender.x, defender.y, C.red);
        const roll = rbt(1, 100);
        if (roll <= 5) { callDefensiveFoul(s, current, time); return; }
        // A juke timed into contact is the carrier's main counterplay; a dive tackle trades reach for fumble odds.
        if (roll <= (time < current.jukeUntil ? 75 : 25)) {
          current.x = clp(current.x - attack * 22, END + 28, WORLD - END - 28);
          playCue(s, 'BROKEN TACKLE!', '#8fd0ff', time, 400);
          break;
        }
        if (roll <= (time < defender.tackleUntil ? 45 : 32)) {
          startTackleFall(s, current, defender, time);
          dropBanana(s, current.x, current.y, time, 1 - s.a);
          playCue(s, 'FUMBLE!', '#ef6a60', time, 750); s.cameras.main.flash(180, 213, 43, 30); thud(s, 90, .3, .9); return;
        }
        // The dead-ball pause doubles as hit-stop: the world freezes while both players go down.
        s.cameras.main.shake(160, .009); thud(s, 110, .28, 1);
        startTackleFall(s, current, defender, time);
        impactBurst(s, current.x, current.y, [C.grass, C.cream, 0x2f8a4c], 14, 1);
        s.c = 'tackled'; s.tackleUntil = time + 650; s.tackleSpot = current.x; return;
      }
    }
  }
  if (s.m && time > s.m) { s.h.setText(''); s.m = 0; }
  const carrierNow = s.d[s.a][0];
  const yardsToScore = s.a === 0 ? WORLD - END - carrierNow.x : carrierNow.x - END;
  if (yardsToScore <= 240 && !s.l) { playCrowd(s, .9, 1.8); s.l = true; }
  else if (yardsToScore > 340) s.l = false;
  const scored = s.a === 0 ? carrierNow.x >= WORLD - END : carrierNow.x <= END;
  if (!s.x && scored) scoreTouchdown(s, time);
  updateHud(s);
}

function startTackleFall(s, carrier, tackler, time) {
  s.G = { carrier, tackler, start: time };
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
    const route = sin(time / 470 + p.position * 2) * 18;
    const lead = p.position === 1 ? 225 : 285;
    // While the passer drops back, routes are measured from the line of scrimmage, not from the retreating passer.
    return [clp(s.dropping ? s.los + attack * lead * .5 : carrier.x + attack * lead, END + 42, WORLD - END - 42), lane + route];
  }
  const rusher = nearestPlayer(s.d[1 - s.a], carrier);
  if (p.position === 3) {
    const close = dst(rusher.x, rusher.y, carrier.x, carrier.y) < 210;
    return [carrier.x + attack * (close ? 72 : 48), close ? lrp(carrier.y, rusher.y, .55) : carrier.y + 58];
  }
  return [carrier.x - attack * 42, carrier.y + 48];
}

function defenseTarget(s, p, carrier, attack, time) {
  if (p.position === 1 || p.position === 2) {
    const gap = dst(p.x, p.y, carrier.x, carrier.y);
    if (gap > 210) {
      const side = p.position === 1 ? -1 : 1;
      return [carrier.x + attack * 58, clp(carrier.y + side * 42, TOP + 35, BOTTOM - 35)];
    }
    const offense = s.d[s.a];
    let receiver = offense.find(q => q.position === p.position && q !== carrier);
    if (!receiver) receiver = offense.find(q => (q.position === 1 || q.position === 2) && q !== carrier);
    if (receiver) return [receiver.x + attack * 34, receiver.y + (p.position === 1 ? 18 : -18)];
  }
  if (p.position === 3) return [carrier.x + attack * 10, carrier.y];
  return [carrier.x + attack * 46, clp(carrier.y + (p.y < carrier.y ? -24 : 24), TOP + 35, BOTTOM - 35)];
}

function cpuCarryIntent(s, carrier, attack, time) {
  const defenders = s.d[1 - s.a];
  const nearest = defenders.reduce((best, p) => {
    const distance = dst(carrier.x, carrier.y, p.x, p.y);
    return distance < best.distance ? { player: p, distance } : best;
  }, { player: defenders[0], distance: Infinity });
  if (nearest.distance < 175 && time > (carrier.evadeUntil || 0)) {
    carrier.evadeSide = nearest.player.y >= carrier.y ? -1 : 1;
    carrier.evadeUntil = time + 650;
  }
  const center = (TOP + BOTTOM) / 2;
  const targetY = time < (carrier.evadeUntil || 0)
    ? clp(carrier.y + carrier.evadeSide * 105, TOP + 42, BOTTOM - 42)
    : carrier.y + (center - carrier.y) * .12;
  const t = time - s.callAt;
  let call = carrier === s.qb ? s.call : 0, receiver = call && t > s.readAt ? findOpenReceiver(s, carrier, attack) : null;
  // Pressured or too long in the pocket with nobody open, the passer tucks it and runs.
  if (call && !receiver && (nearest.distance < 105 || t > 2300)) s.call = call = 0;
  s.dropping = call;
  if (!call && nearest.distance < 225) receiver = findOpenReceiver(s, carrier, attack);
  let vx = attack, vy = clp((targetY - carrier.y) / 55, -1, 1);
  if (call === 1) vx = t < 700 ? -attack : 0;
  // The roll-out drifts back while heading for a sideline, then the passer sets his feet.
  if (call === 2) { vy = abs(carrier.y - center) < 120 ? Math.sign(carrier.y - center || 1) : 0; vx = vy && t < 1200 ? -attack * .4 : 0; }
  return { vx, vy, receiver, longPass: receiver ? dst(carrier.x, carrier.y, receiver.x, receiver.y) > 310 : false };
}

function findOpenReceiver(s, carrier, attack) {
  const defenders = s.d[1 - s.a];
  let best = null, bestScore = -Infinity;
  for (const receiver of s.d[s.a]) {
    if (receiver === carrier) continue;
    const dx = (receiver.x - carrier.x) * attack, dy = abs(receiver.y - carrier.y);
    const distance = Math.hypot(dx, dy);
    if (dx < 50 || distance > 620) continue;
    const space = Math.min(...defenders.map(d => dst(receiver.x, receiver.y, d.x, d.y)));
    if (space < 85) continue;
    const score = space + Math.min(dx, 300) * .35 - distance * .18;
    if (score > bestScore) { best = receiver; bestScore = score; }
  }
  return best;
}

// Shared by the throw and the aim reticle, so the highlighted receiver is always the one the pass goes to.
function passTarget(s, p, dx, dy, longPass) {
  if (!dx && !dy) dx = s.a === 0 ? 1 : -1;
  const aimLength = Math.hypot(dx, dy), aimX = dx / aimLength, aimY = dy / aimLength;
  const targets = s.d[s.a].filter(m => m !== p).map(m => {
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
  const attack = s.a === 0 ? 1 : -1;
  const lead = target.position === 1 || target.position === 2 ? attack * (longPass ? 104 : 54) : 0;
  const baseX = clp(target.x + lead, END + 28, WORLD - END - 28), baseY = target.y;
  const aimDot = (baseX - p.x) * aimX + (baseY - p.y) * aimY;
  const alignment = clp(aimDot / Math.max(1, dst(p.x, p.y, baseX, baseY)), 0, 1);
  const spread = (longPass ? 120 : 82) * (1 - alignment) + 8;
  const miss = Phaser.Math.FloatBetween(-spread, spread);
  const targetX = clp(baseX - aimY * miss, END + 18, WORLD - END - 18);
  const targetY = clp(baseY + aimX * miss, TOP + 26, BOTTOM - 24);
  const yardsToGoal = s.a === 0 ? WORLD - END - targetX : targetX - END;
  const distance = dst(p.x, p.y, targetX, targetY);
  playCue(s, longPass ? 'LONG PASS!' : 'PASS!', '#8fd0ff', time, 520);
  impactBurst(s, p.x + attack * 18, p.y - 10, C.gold);
  const from = { x: p.x, y: p.y }, ballScale = longPass ? 1.08 : .92;
  const [sx, sy] = proj(s, p.x, p.y);
  s.g = { from, target, targetX, targetY, x: p.x, y: p.y, elapsed: 0, trailAt: 0, duration: clp(distance * (longPass ? 1.15 : .95), longPass ? 340 : 260, longPass ? 780 : 560), height: longPass ? 18 : 9, ballScale, longPass, nearGoal: yardsToGoal <= 240, cheerPlayed: false, shadow: s.add.ellipse(sx, sy, 29, 10, C.black, .32).setDepth(11), visual: makeBanana(s, sx, sy, ballScale) };
  s.g.visual.setVisible(true).setDepth(12);
}

function updatePass(s, dt, time) {
  const f = s.g; f.elapsed += dt;
  const t = Math.min(1, f.elapsed / f.duration), target = f.target;
  if (f.nearGoal && !f.cheerPlayed && t >= .72) { playCrowd(s, 1, 2.2); f.cheerPlayed = true; }
  f.x = lrp(f.from.x, f.targetX, t); f.y = lrp(f.from.y, f.targetY, t);
  // The arc is exaggerated so the throw reads as airborne from behind the play.
  const [px, py, k] = proj(s, f.x, f.y), by = py - (32 + sin(t * Math.PI) * f.height * 5) * k;
  f.shadow.setPosition(px, py).setScale(k, k * .6);
  f.visual.setPosition(px, by).setRotation(time / 90).setScale(f.ballScale * k);
  if (time >= f.trailAt) {
    const fleck = s.add.ellipse(px, by, 10 * k, 4 * k, time % 2 ? C.gold : C.cream, .56).setDepth(11);
    s.tweens.add({ targets: fleck, scale: .15, alpha: 0, duration: 210, onComplete: () => fleck.destroy() });
    f.trailAt = time + 48;
  }
  const defenders = s.d[1 - s.a];
  for (const d of defenders) {
    if (dst(d.x, d.y - 10, f.x, f.y) < 25) {
      f.visual.destroy(); f.shadow.destroy(); s.g = null; setPossession(s, 1 - s.a, d); s.A = 1; s.j = f.x; s.e = time + 1400;
      playCue(s, 'INTERCEPTED!', '#ef6a60', time, 900); impactBurst(s, d.x, d.y, C.red, 12); s.cameras.main.flash(180, 213, 43, 30); thud(s, 90, .3, .9); return;
    }
  }
  if (t >= 1) {
    const catchers = s.d[s.a].filter(p => p !== s.d[s.a][0]);
    const receiver = catchers.reduce((best, player) => dst(player.x, player.y, f.x, f.y) < dst(best.x, best.y, f.x, f.y) ? player : best, catchers[0]);
    f.visual.destroy(); f.shadow.destroy(); s.g = null;
    if (dst(receiver.x, receiver.y, f.x, f.y) > 48) {
      finishPlay(s, s.los, time, 'INCOMPLETE!'); return;
    }
    receiver.x = f.x; receiver.y = f.y;
    setPossession(s, s.a, receiver); s.e = time + 1100;
    playCue(s, 'CAUGHT!', '#8fd0ff', time, 560); impactBurst(s, receiver.x, receiver.y, [C.gold, C.cream], 12); thud(s, 660, .1, .4, 0, 1.5);
  }
}

function dropBanana(s, x, y, time, recoverTeam) {
  if (s.g) {
    if (s.g.visual.active) s.g.visual.destroy();
    if (s.g.shadow.active) s.g.shadow.destroy();
    s.g = null;
  }
  const [px, py] = proj(s, x, y);
  s.x = { x, y, recoverTeam, landsAt: time + 360, timeoutAt: time + 1500, grounded: false, visual: makeBanana(s, px, py - 20, .84).setDepth(13), shadow: s.add.ellipse(px, py + 7, 28, 9, C.black, .38).setDepth(12) };
  s.d[s.a][0].banana.setVisible(false);
}

function updateLooseBall(s, time) {
  const ball = s.x;
  if (!ball) return;
  const [px, py, k] = proj(s, ball.x, ball.y);
  ball.shadow.setPosition(px, py).setScale(k, k * .6);
  if (!ball.grounded) {
    const fall = clp((ball.landsAt - time) / 360, 0, 1);
    ball.visual.setPosition(px, py - (8 + fall * 40) * k).setRotation(fall * 3).setScale(.84 * k);
    if (time >= ball.landsAt) {
      ball.grounded = true; s.c = 'loose'; playCue(s, 'BALL DOWN!', '#ef6a60', time, 600);
    }
    return;
  }
  ball.visual.setPosition(px, py - 6 * k).setScale(.72 * k).setRotation(0);
  const defenders = s.d[ball.recoverTeam];
  const nearest = defenders.reduce((best, player) => dst(player.x, player.y, ball.x, ball.y) < dst(best.x, best.y, ball.x, ball.y) ? player : best, defenders[0]);
  if (dst(nearest.x, nearest.y, ball.x, ball.y) > 42 && time < ball.timeoutAt) return;
  ball.visual.destroy(); ball.shadow.destroy(); s.x = null;
  s.a = ball.recoverTeam; s.A = 1; s.j = ball.x; s.e = time + 700;
  makeTeams(s, s.a, ball.x);
  playCue(s, 'BANANA RECOVERED!', '#ef6a60', time, 700);
  updateHud(s); s.c = 'spotting'; s.N = time + 700;
}

function setPossession(s, team, player) {
  if (team !== s.a) s.l = false;
  s.a = team; s.s = team ? -1 : 1;
  s.F = 0;
  const group = s.d[team];
  if (player && player !== group[0]) {
    const old = group[0]; group[0] = player; group[player.number] = old; old.number = player.number; player.number = 0;
  }
  for (const p of s.d.flat()) p.banana.setVisible(false);
  group[0].banana.setVisible(!s.g);
}

function finishPlay(s, spot, time, result) {
  const attack = s.a === 0 ? 1 : -1;
  spot = clp(spot, END + 20, WORLD - END - 20);
  const gained = (spot - s.j) * attack;
  const firstDown = gained >= 154;
  const turnover = !firstDown && s.A >= 4;
  const nextTeam = turnover ? 1 - s.a : s.a;
  if (firstDown || turnover) { s.A = 1; s.j = spot; }
  else s.A++;
  s.g = null; s.e = time + 700;
  makeTeams(s, nextTeam, spot);
  let call = result;
  if (turnover) call = 'TURNOVER ON DOWNS!';
  else if (firstDown) call = 'FIRST DOWN!';
  updateHud(s);
  playCue(s, `${call}\n${s.z.text}`, turnover ? '#ef6a60' : '#8fd0ff', time, 1300);
  s.h.setFontSize('34px').setScale(.7);
  s.tweens.add({ targets: s.h, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.Out' });
  s.c = 'spotting'; s.N = time + 1300; s.snap = true;
}

function fieldGoalDistance(s, x) {
  return (s.a === 0 ? WORLD - END - x : x - END) / 15.4;
}

function attemptFieldGoal(s, kicker, time) {
  const foul = s.H;
  if (!foul || foul.team !== s.a || time > foul.until) {
    playCue(s, 'FIELD GOAL ONLY AFTER A FOUL', '#ef6a60', time, 850);
    return false;
  }
  const yards = fieldGoalDistance(s, foul.spot);
  if (yards < 10 || yards > 20) {
    playCue(s, 'FIELD GOAL RANGE: 10-20 YDS', '#ef6a60', time, 850);
    return false;
  }
  const team = s.a, goalX = team === 0 ? WORLD - END : END;
  const [sx, sy] = proj(s, kicker.x, kicker.y);
  const wind = rbt(-12, 12), error = kicker.y - (TOP + BOTTOM) / 2 + wind;
  const visual = makeBanana(s, sx, sy - 14, .9).setDepth(13).setRotation(1.1);
  const shadow = s.add.ellipse(sx, sy, 28, 8, C.black, .38).setDepth(12);
  visual.cameraFilter = s.ui.id; shadow.cameraFilter = s.ui.id;
  s.kick = { team, spot: foul.spot, fromX: kicker.x, fromY: kicker.y, goalX, error, elapsed: 0, duration: 900, good: abs(error) <= 22, visual, shadow };
  s.H = null;
  kicker.banana.setVisible(false); s.c = 'kicking'; s.m = 0;
  s.h.setText('FIELD GOAL!').setColor('#f7f9ff').setFontSize('30px').setAlpha(1);
  playCrowd(s, .9, 1.5);
  return true;
}

function callDefensiveFoul(s, carrier, time) {
  const yards = fieldGoalDistance(s, carrier.x);
  if (yards >= 10 && yards <= 20) {
    s.H = { team: s.a, spot: carrier.x, until: time + 5000 };
    s.penaltyUntil = time + 5000; s.R = time + 650; s.c = 'penalty';
    s.h.setText('PENALTY!').setColor('#f7f9ff').setFontSize('30px').setAlpha(1);
    s.W.setText('FG ONLY AFTER FOUL AT 10-20 YDS   J / F KICK   ENTER: PLAY ON');
    playCrowd(s, .8, 1.2);
    return;
  }
  const attack = s.a === 0 ? 1 : -1;
  carrier.x = clp(carrier.x + attack * 77, END + 28, WORLD - END - 28);
  s.e = time + 700;
  playCue(s, 'DEFENSIVE FOUL! +5 YDS', '#8fd0ff', time, 900);
}

function updatePenalty(s, time) {
  const foul = s.H;
  if (!foul || time >= s.penaltyUntil) {
    s.H = null; s.c = 'playing'; s.h.setText('');
    return;
  }
  if (foul.team === 1 && !s.duo && time >= s.R) {
    s.R = time + 1000;
    if (rbt(1, 100) <= 58) attemptFieldGoal(s, s.d[1][0], time);
    else { s.H = null; s.c = 'playing'; s.h.setText(''); }
    return;
  }
  const pre = foul.team === 0 ? 'P1_' : 'P2_';
  if (s.b.pressed[pre + '4']) attemptFieldGoal(s, s.d[foul.team][0], time);
  else if (s.b.pressed.START1 || s.b.pressed.START2) {
    s.H = null; s.c = 'playing'; s.h.setText(''); s.e = time + 450;
  }
}

function updateFieldGoal(s, time, dt) {
  const kick = s.kick;
  if (!kick) return;
  kick.elapsed += dt;
  const t = clp(kick.elapsed / kick.duration, 0, 1);
  const [sx, sy, sk] = proj(s, kick.fromX, kick.fromY), [gx, gy, gk] = pj(s, kick.goalX, W / 2);
  const aimX = gx + kick.error * s.s * gk, groundX = lrp(sx, aimX, t), groundY = lrp(sy, gy, t);
  const scale = lrp(sk, gk, t);
  kick.shadow.setPosition(groundX, groundY).setScale(scale, scale * .5);
  kick.visual.setPosition(groundX, groundY - 58 * scale - sin(t * Math.PI) * 105 * scale).setScale(.9 * scale).setRotation(1.1 + t * 5);
  if (t < 1) return;
  kick.visual.destroy(); kick.shadow.destroy(); s.kick = null;
  if (kick.good) {
    s.P[kick.team] += 3; s.J = s.P[kick.team] >= 21 ? kick.team : null;
    s.O = 'FIELD GOAL';
    s.nextTeam = 1 - kick.team; s.r = time + 1900; s.l = false;
    s.c = 'celebrating'; s.h.setText('FIELD GOAL!  +3').setColor('#f7f9ff').setAlpha(1);
    playCrowd(s, 1.2, 2.1);
  } else {
    const nextTeam = 1 - kick.team;
    s.a = nextTeam; s.A = 1; s.j = kick.spot; s.e = time + 700;
    s.l = false; makeTeams(s, nextTeam, kick.spot); updateHud(s);
    s.c = 'spotting'; s.N = time + 950;
    playCue(s, 'NO GOOD! TURNOVER', '#ef6a60', time, 950);
  }
}

// A defender keeps control until another is clearly closer, so control does not flicker between two equidistant players.
function humans(s, carrier) {
  const d = p => dst(p.x, p.y, carrier.x, carrier.y);
  return [0, 1].map(t => {
    if (t === s.a) return s.d[t][0];
    const best = nearestPlayer(s.d[t], carrier);
    if (!s.d[t].includes(s.ctrl[t]) || d(best) + 60 < d(s.ctrl[t])) s.ctrl[t] = best;
    return s.ctrl[t];
  });
}

function nearestPlayer(players, target) { return players.slice(1).reduce((a, b) => dst(a.x, a.y, target.x, target.y) < dst(b.x, b.y, target.x, target.y) ? a : b, players[1]); }

function scoreTouchdown(s, time) {
  s.P[s.a] += 6;
  s.O = 'TOUCHDOWN';
  const scorer = s.d[s.a][0];
  s.cameras.main.flash(250, 225, 255, 0);
  s.cameras.main.shake(160, .004);
  impactBurst(s, scorer.x, scorer.y, C.flagBlue);
  s.c = 'celebrating'; s.nextTeam = 1 - s.a;
  s.J = s.P[s.a] >= 21 ? s.a : null;
  s.r = time + 2800; s.m = 0;
  s.scorer = scorer; scorer.moving = false; scorer.dance = rbt(0, 2);
  s.l = false; playCrowd(s, 1.35, 2.8);
  const emoji = TOUCHDOWN_EMOJIS[rbt(0, TOUCHDOWN_EMOJIS.length - 1)];
  s.h.setText(`${emoji} TOUCHDOWN! ${emoji}\n${['BANANA SPIN', 'ROBOT', 'SPIKE!'][scorer.dance]}`).setFontSize('34px').setColor('#8fd0ff').setAlpha(1).setScale(1);
  const celebrationEmoji = s.add.text(W / 2, H / 2 - 92, emoji, { fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif', fontSize: '48px' }).setOrigin(.5).ui(29).setScale(.45);
  s.tweens.add({ targets: celebrationEmoji, y: H / 2 - 150, scale: 1.2, alpha: 0, duration: 1250, ease: 'Back.Out', onComplete: () => celebrationEmoji.destroy() });
  scorer.ballRing.setVisible(true);
  // Confetti in the flag's colours is screen-fixed, so it falls on the HUD camera and ignores the zoom.
  for (let i = 0; i < 48; i++) {
    const c = s.add.rectangle(rand() * W, -10 - rand() * 160, 6, 11, [s.T[s.a][2], s.T[s.a][3], C.cream][i % 3]).ui(28).setAngle(rand() * 180);
    s.tweens.add({ targets: c, y: H + 20, x: c.x + rbt(-90, 90), angle: c.angle + 720, duration: rbt(1500, 2500), ease: 'Sine.In', onComplete: () => c.destroy() });
  }
  [523, 659, 784, 1047].forEach((f, i) => thud(s, f, i > 2 ? .5 : .16, .45, i * .13, 1));
  // renderWorld owns every transform, so the dance animates a value it reads instead of the sprite.
  s.tweens.add({ targets: scorer, hop: 1, duration: 180, yoyo: true, repeat: 7, ease: 'Sine.InOut' });
  if (scorer.dance > 1) impactBurst(s, scorer.x, scorer.y, [C.gold, C.cream, s.T[s.a][2]], 18, 1);
  s.tweens.add({ targets: scorer.ballRing, scaleX: 1.3, scaleY: .7, alpha: .7, duration: 240, yoyo: true, repeat: 4 });
  s.tweens.add({ targets: s.cameras.main, zoom: 1.25, duration: 360, ease: 'Sine.Out', yoyo: true, hold: 1320 });
}

function startStadiumAudio(s) {
  if (s.i) return;
  const ctx = s.sound?.context;
  if (!ctx?.createBuffer || !ctx?.createGain || !ctx?.createBiquadFilter) return;
  try {
    ctx.resume()?.catch?.(() => {});
    s.i = ctx; s.f = ctx.createGain(); s.f.gain.value = .2; s.f.connect(ctx.destination);
    s.crowd = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const noise = s.crowd.getChannelData(0); let low = 0;
    for (let i = 0; i < noise.length; i++) { low += (rand() * 2 - 1 - low) * .045; noise[i] = low * 3; }
    const crowd = ctx.createBufferSource(), crowdFilter = ctx.createBiquadFilter(), crowdGain = ctx.createGain();
    crowd.buffer = s.crowd; crowd.loop = true; crowdFilter.type = 'bandpass'; crowdFilter.frequency.value = 720; crowdFilter.Q.value = .55; crowdGain.gain.value = .06;
    crowd.connect(crowdFilter); crowdFilter.connect(crowdGain); crowdGain.connect(s.f); crowd.start();
  } catch (_) {
    s.i = null; s.f = null;
  }
}

function playCrowd(s, intensity, duration) {
  const ctx = s.i;
  if (!ctx || !s.crowd || ctx.state === 'suspended') return;
  const start = ctx.currentTime + .02, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), envelope = ctx.createGain();
  const peak = .12 * intensity;
  source.buffer = s.crowd; source.loop = true; filter.type = 'bandpass'; filter.Q.value = .65;
  filter.frequency.setValueAtTime(480, start); filter.frequency.linearRampToValueAtTime(1350, start + duration * .65);
  envelope.gain.setValueAtTime(.0001, start); envelope.gain.exponentialRampToValueAtTime(peak, start + Math.min(.28, duration * .3));
  envelope.gain.setValueAtTime(peak, start + duration * .55); envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
  source.connect(filter); filter.connect(envelope); envelope.connect(s.f); source.start(start); source.stop(start + duration + .04);
}

function playCue(s, text, color, time, duration, shake = 0) {
  s.h.setText(text).setColor(color).setAlpha(1);
  s.m = time + duration;
  if (shake) s.cameras.main.shake(130, shake);
}

// `up` turns the radial spark ring into turf kicked up from the feet.
function impactBurst(s, x, y, color, n = 8, up = 0) {
  const [sx, sy, k] = proj(s, x, y), cy = sy - (up ? 4 : 34) * k, r0 = 48 * Math.max(k, .6);
  for (let i = 0; i < n; i++) {
    const a = up ? -Math.PI * rand() : i * Math.PI * 2 / n, r = r0 * (up ? .5 + rand() * .6 : 1);
    const spark = s.add.circle(sx, cy, up ? 3 : 4, color.length ? color[i % color.length] : color, .95).setDepth(14);
    s.tweens.add({ targets: spark, x: sx + Math.cos(a) * r, y: cy + sin(a) * r, scale: .35, alpha: 0, duration: 380 + up * 220, ease: 'Quad.Out', onComplete: () => spark.destroy() });
  }
}

// A sine with a pitch slide reads as a hit, a catch or a fanfare note without any audio files.
function thud(s, f, d, v, at = 0, slide = .35) {
  const ctx = s.i;
  if (!ctx || ctx.state === 'suspended') return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + at;
  o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g); g.connect(s.f); o.start(t); o.stop(t + d);
}

function updateHud(s) {
  const carrier = s.d[s.a][0], dir = s.a === 0 ? 1 : -1;
  const toGo = Math.max(1, Math.ceil((154 - (carrier.x - s.j) * dir) / 15.4));
  // Once the first-down line sits past the goal line, football calls it "& GOAL".
  const goal = (s.j + 154 * dir - (dir > 0 ? WORLD - END : END)) * dir >= 0;
  const downName = ['1ST', '2ND', '3RD', '4TH'][s.A - 1];
  const mode = s.duo ? 'P1 VS P2' : 'P1 VS CPU';
  s.V.setText(s.T[0][1]); s.D.setText(s.T[1][1]);
  s.hud.setText(`${s.P[0]} - ${s.P[1]}`);
  s.U.setText(mode);
  s.z.setText(`${downName} & ${goal ? 'GOAL' : toGo}`);
  s.Q.clear().fillStyle(C.gold).fillRect(s.a ? 200 : 24, 64, 68, 5);
  if (!s.duo && s.a === 1) s.W.setText('P1 MOVE WASD   I HIT   K BANANA PEEL');
  else if (!s.duo) s.W.setText('MOVE WASD   U PASS   O LONG   I JUKE   K PUSH');
  else if (s.a === 0) s.W.setText('P1 WASD U-O PASS K PUSH   P2 ARROWS T HIT G PEEL');
  else s.W.setText('P2 ARROWS R-Y PASS G PUSH   P1 WASD I HIT K PEEL');
}

// Chase-camera projection. Field x is depth and `l` is the lateral position in field pixels.
// Returns [screenX, screenY, scale]; the camera never rolls, so equal depths share one screen row.
function pv(s, u, m) {
  const k = FOC / Math.max(u - s.cx + BACK, 40);
  return [W / 2 + (m - s.cl) * k, HZ + CAMH * k, k];
}
// The camera always sits behind the attacking team, so team 1's view is the field rotated 180 degrees.
function pj(s, x, l) { return s.s > 0 ? pv(s, x, l) : pv(s, WORLD - x, W - l); }
function proj(s, x, y) { return pj(s, x, fieldScreenX(y)); }

function addFieldMark(s, mark, x, l) { mark.fx = x; mark.fl = l; s.v.push(mark.setDepth(1)); return mark; }

function makeFieldMarks(s) {
  const tag0 = m => (m.hk = 0, m);
  const paint = { ...AB, fontSize: '34px', color: '#ffffff', stroke: '#174b2c', strokeThickness: 5 };
  const mono = { ...MO, fontSize: '9px', color: '#9acaff', stroke: '#0b1b3a', strokeThickness: 3 };
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
  const g = s.fieldArt, L = 18, R = W - 18, carrier = s.d[s.a][0], FAR = WORLD + 50;
  const U = x => s.s > 0 ? x : WORLD - x, M = l => s.s > 0 ? l : W - l;
  if (s.camView !== s.s) {
    // Possession changed: swing the camera round to the new attackers, masking the cut with a quick dark flash.
    if (s.camView) { s.cx = WORLD - s.cx; s.cl = W - s.cl; s.cameras.main.flash(220, 5, 13, 32); }
    s.camView = s.s;
  }
  s.cx += (U(carrier.x) - s.cx) * .08;
  s.cl += (M(clp(fieldScreenX(carrier.y), 280, 520)) - s.cl) * .08;
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
    g.fillStyle(color, alpha); g.fillRect(a[0], a[1] - h / 2, abs(lb - la) * a[2], h);
  };
  g.clear(); drawStands(s, g, time, x0);
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
  if (s.c !== 'over') {
    const gain = clp(s.j + (s.a ? -154 : 154), END, WORLD - END);
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
  for (const pl of s.S || []) {
    const [px, py, k] = proj(s, pl.x, pl.y);
    if (k < 3) g.fillStyle(0xffd23f).fillEllipse(px, py, 34 * k, 11 * k).fillStyle(0x7a5a10).fillCircle(px - 16 * k, py, 3 * k).fillCircle(px + 16 * k, py, 3 * k);
  }
  // Haze toward the horizon gives the far end of the field some depth.
  for (let i = 1; i < 5; i++) { g.fillStyle(C.black, .09); g.fillRect(0, HZ, W, i * 16); }
  for (const m of s.v) {
    const z = U(m.fx) - s.cx + BACK, k = FOC / z;
    // Flat ground art is squashed by the same factor the ground plane is foreshortened at that depth.
    if (m.setVisible(!m.off && z > NEAR * .7 && k > .22).visible) m.setPosition(...pj(s, m.fx, m.fl).slice(0, 2)).setScale(m.rot ? k * CAMH / z : k, m.rot ? k : k * CAMH / z).setRotation(m.rot ? -1.5708 * s.s : 0);
  }
  const [h0, h1] = humans(s, carrier);
  for (const p of s.d.flat()) {
    let [sx, sy, k] = proj(s, p.x, p.y);
    const pair = s.G, carrierFall = pair && p === pair.carrier, tackleDive = pair && p === pair.tackler;
    const elapsed = pair ? time - pair.start : 0, impact = pair ? clp(Math.min(elapsed / 120, (650 - elapsed) / 180, 1), 0, 1) : 0;
    const run = (s.c === 'playing' || s.c === 'celebrating') && p.moving ? sin(time / 55 + p.number * 2) : 0, hop = p.hop || 0;
    if (tackleDive) { [sx, sy, k] = proj(s, pair.carrier.x, pair.carrier.y); sy -= 16 * k; }
    p.limbs[0].y = -Math.max(0, run) * 7; p.limbs[1].y = -Math.max(0, -run) * 7;
    p.limbs[2].scaleY = 1 - run * .28; p.limbs[3].scaleY = 1 + run * .28;
    // Dances (0 banana spin, 1 robot, 2 spike) and the stiff arm drive the arms; negative scale points an arm up.
    const d = p.dance, up = sin(time / 110) > 0;
    if (d != null) { p.limbs[2].scaleY = d === 1 && up ? 1 : -1; p.limbs[3].scaleY = d === 1 ? (up ? -1 : 1) : d ? -1 : 1; }
    if (time < (p.pushUntil || 0)) p.limbs[3].scaleY = -1.3;
    // Nearer players (smaller depth) must draw over farther ones.
    const fall = carrierFall ? impact : tackleDive ? clp(Math.min((elapsed - 65) / 120, (650 - elapsed) / 110, 1), 0, 1) : p.fall || 0, roll = carrierFall ? -1.5 : tackleDive ? 1.55 : 1.3;
    p.root.setPosition(sx, sy - hop * 18 * k).setScale(k * (1 + hop * .1), k * (1 - hop * .12) * (carrierFall || tackleDive ? 1 - fall * .68 : 1)).setRotation((p.lean || 0) * .1 + hop * .2 + fall * roll).setDepth(8 + k * .01 + (tackleDive ? .08 : 0)).setVisible(k < 2.6);
    if (d === 0) p.root.scaleX *= Math.cos(time / 110);
    const mine = p === h0 || (s.duo && p === h1);
    p.marks.forEach(m => m.setVisible(mine)); p.face.forEach(f => f.setVisible(p.team !== s.a)); p.nape.setVisible(p.team === s.a);
    p.roleLabel.setPosition(sx, sy - 104 * k).setVisible(k < 2.6 && !mine);
    p.controlLabel.setPosition(sx, sy - 136 * k).setVisible(mine && k < 2.6);
  }
}

// Aim guide for a human passer: dotted throw arc, a ring under the receiver and a marker above them.
// Green means no defender within 85px (the same "open" rule the CPU uses), red means covered.
function drawAim(s, time) {
  const g = s.aimArt.clear(), a = s.aim;
  if (s.c !== 'playing' || !a || s.g) return;
  const [q, r] = a, open = Math.min(...s.d[1 - s.a].map(d => dst(r.x, r.y, d.x, d.y))) >= 85;
  const col = open ? 0x4dff88 : C.red, [rx, ry, k] = proj(s, r.x, r.y), pulse = 1 + sin(time / 90) * .12;
  for (let i = 1; i < 10; i++) {
    const t = i / 10, [px, py, pk] = proj(s, lrp(q.x, r.x, t), lrp(q.y, r.y, t));
    g.fillStyle(C.cream, .55).fillCircle(px, py - (32 + sin(t * Math.PI) * 45) * pk, 3 * Math.max(pk, .5));
  }
  if (rx < 30 || rx > W - 30) {
    // Off-screen receiver: pin an arrow to the nearest side edge so the player knows a throw is there.
    const ex = rx < 30 ? 22 : W - 22, ey = clp(ry - 40 * k, 150, H - 80), d = rx < 30 ? -1 : 1;
    g.fillStyle(col).fillTriangle(ex + d * 14, ey, ex - d * 8, ey - 14, ex - d * 8, ey + 14);
    return;
  }
  g.lineStyle(4, col, .9).strokeEllipse(rx, ry, 70 * k * pulse, 24 * k * pulse);
  g.fillStyle(col).fillTriangle(rx - 11, ry - 112 * k - 18, rx + 11, ry - 112 * k - 18, rx, ry - 112 * k - 2);
}

// Every row follows one rounded rectangle (straight sides, quarter-circle corners, straight back) pushed outwards by d.
// View space: u is depth and m is lateral, so mirroring for the attacking team needs no special case.
function standPath(d) {
  const R = CORNER_R + d, uc = WORLD - CORNER_R, a = [[0, -d]];
  for (let i = 0; i <= 2 * ARC + 1; i++) {
    const right = i > ARC, t = Math.PI / 2 * (right ? 2 * ARC + 1 - i : i) / ARC, c = Math.cos(t) * (right ? 1 : -1);
    a.push([uc + R * sin(t), (right ? W - CORNER_R : CORNER_R) + R * c]);
  }
  return a.concat([[0, W + d]]);
}

// Row 0 is the low ad wall. Fans stand on each tread, one per PITCH along the path; their index is fixed by position
// along the row, so the colours never change as the camera moves.
function buildStands(s) {
  const dd = STAND_W / ROWS;
  s.rows = Array.from({ length: ROWS }, (_, r) => {
    const mid = standPath(r * dd + dd / 2), ppl = []; let acc = 0, c = 0;
    for (let i = 1; i < mid.length; i++) {
      const [u0, m0] = mid[i - 1], [u1, m1] = mid[i], len = Math.hypot(u1 - u0, m1 - m0);
      for (; acc < len; acc += PITCH) ppl.push([u0 + (u1 - u0) * acc / len, m0 + (m1 - m0) * acc / len, c++]);
      acc -= len;
    }
    return { h: AD_H + (STAND_H - AD_H) * r / ROWS, pts: standPath(r * dd), ppl };
  });
}

// From the low camera the treads are mostly out of sight, so each row paints its riser from the ground up. Rows go from
// the outermost to the innermost: nearer rows cover the ones behind, and the slivers between risers get filled.
function drawStands(s, g, time, x0) {
  const hype = s.c === 'celebrating', clamp = clp, hash = (r, c) => Math.imul(r * 7919 + c, 2654435761) >>> 0;
  const fog = (c, f) => (c >> 16 & 255) * f << 16 | (c >> 8 & 255) * f << 8 | (c & 255) * f;
  for (let r = ROWS - 1; r >= 0; r--) {
    const { h, pts, ppl } = s.rows[r], aisle = r && r % 9 === 0, wall = aisle ? 0x6f86ad : r % 2 ? 0x15305c : 0x0f2447;
    for (let i = 1; i < pts.length; i++) {
      const A = pv(s, Math.max(pts[i - 1][0], x0), pts[i - 1][1]), B = pv(s, Math.max(pts[i][0], x0), pts[i][1]);
      // Fog darkens distant and high rows, so the far end of the bowl fades into the roof.
      g.fillStyle(fog(wall, clamp(.3 + (A[2] + B[2]) * .7, .4, 1) * (1 - .3 * r / ROWS)));
      g.fillTriangle(A[0], A[1] - h * A[2], B[0], B[1] - h * B[2], B[0], B[1]).fillTriangle(A[0], A[1] - h * A[2], B[0], B[1], A[0], A[1]);
    }
    if (aisle) continue;
    for (const [u, m, c] of ppl) {
      if (u < x0) continue;
      const [x0s, y0s, k] = pv(s, u, m), st = k > .35 ? 1 : k > .2 ? 2 : k > .12 ? 4 : 8;
      // Far fans are thinned in powers of two, so the same fans always survive and nothing flickers.
      if (c % st || x0s < -12 || x0s > W + 12) continue;
      const hs = hash(r, c), sz = Math.max(2, k * 14), x = x0s, y = y0s - h * k;
      if (y < -12 || y > H) continue;
      const f = clamp(.3 + k, .4, .75) * (1 - .3 * r / ROWS), jump = hype || !(hs & 7) ? sin(time / (hype ? 60 : 170) + hs) * (hype ? 3 : 1.5) : 0;
      if (!r) { g.fillStyle(fog(CROWD[hs % 6], f * .8)).fillRect(x - PITCH * 1.5 * k, y, PITCH * 3 * k, AD_H * k); continue; }
      g.fillStyle(fog(CROWD[hs % 6], f)).fillRect(x - sz / 2, y - sz * 1.2 + jump, sz, sz * 1.2);
      if (sz > 5) g.fillStyle(fog(0xf0c49a, f)).fillRect(x - sz * .3, y - sz * 1.65 + jump, sz * .6, sz * .45);
      // Camera flashes pop in the crowd while a touchdown is celebrated.
      if (hype && rand() < .0025) g.fillStyle(0xffffff, .9).fillCircle(x, y - sz, sz * 1.5);
    }
  }
}

// Sky, roof canopy and light towers never move with the camera, so they are painted once into two canvases.
function drawSky(s) {
  const c = s.bt.getContext();
  c.fillStyle = '#0a1830'; c.fillRect(0, 0, W, H); c.fillStyle = '#070c18'; c.fillRect(0, 0, W, 44);
  for (let x = 0; x < W; x += 40) { c.fillStyle = '#101a30'; c.fillRect(x, 0, 3, 44); }
  c.fillStyle = '#2a3f66'; c.fillRect(0, 43, W, 3); s.bt.refresh();
  const g = s.gl.getContext();
  // Four towers sit at the corners of the bowl; the far pair is drawn smaller.
  for (const [x, y, z] of [[56, 74, 1], [744, 74, 1], [220, 58, .6], [580, 58, .6]]) {
    const halo = g.createRadialGradient(x, y, 2, x, y, 130 * z);
    halo.addColorStop(0, 'rgba(255,244,205,.5)'); halo.addColorStop(1, 'rgba(255,244,205,0)');
    g.fillStyle = halo; g.fillRect(x - 130, y - 130, 260, 260);
    g.fillStyle = '#0a1322'; g.fillRect(x - 3 * z, y + 16 * z, 6 * z, 90 * z); g.fillRect(x - 30 * z, y - 18 * z, 60 * z, 34 * z);
    g.fillStyle = '#fff2bf';
    for (let i = 0; i < 8; i++) g.fillRect(x - 26 * z + i % 4 * 14 * z, y - 14 * z + (i >> 2) * 14 * z, 10 * z, 10 * z);
  }
  s.gl.refresh();
}

// Top-down bowl: six superellipse tiers packed with fans, an aisle gap every 25 seats, and a light tower in each corner.
// The title plays a looping 9 s mini game on the cover pitch. Both teams line up at midfield; at 1.5 s the ball is snapped to
// Platanus' runner, who cuts under the middle Berton rusher and scores at 4.6 s, and the stands erupt with flashes, confetti
// and blazing light towers. Everything is a closed-form function of the clock.
function introMatch(s, time) {
  const f = s.y.clear(), c = time % 9000, t = c / 1000, td = t > 4.7, e = c - 4700, K = .62;
  const run = clp((t - 1.9) / 2.7, 0, 1), cx = 350 + 235 * run, cy = 300 + 45 * sin(Math.PI * run), push = 22 * clp(t - 1.5, 0, 1);
  const hop = i => td ? abs(sin(e / 170 + i)) * 12 : 0;
  [[cx, cy - hop(0), 1], [390 + push, 262 - hop(1), 1], [390 + push, 338 - hop(2), 1],
    [415 + push + sin(c / 90) * 2, 262, 4], [418 + 40 * clp(t - 1.5, 0, 3), 292, 4], [415 + push + sin(c / 90 + 2) * 2, 338, 4]].sort((a, b) => a[1] - b[1])
    .forEach(([x, y, m]) => paint(f, chibi(TEAMS[m][2], TEAMS[m][3], LOOKS[m]).slice(0, 7), x, y - 48 * K, K));
  // The ball waits on the line, flies back to the runner at the snap, then rides under his arm.
  const bx = t < 1.5 ? 400 : t < 1.9 ? lrp(400, 350, (t - 1.5) / .4) : cx + 9, by = t < 1.9 ? 300 : cy - 14 - hop(0);
  f.fillStyle(0x2b1a0d).fillEllipse(bx, by, 18, 11).fillStyle(0xffc857).fillEllipse(bx, by, 16, 9).fillStyle(0xf7f9ff).fillRect(bx - 3, by - 1, 6, 1.5);
  if (td) {
    f.fillStyle(0xffffff, .1 + sin(time / 70) * .08).fillRect(567, 185, 44, 230);
    for (const x of [78, 722]) for (const y of [70, 530]) f.fillStyle(0xfff6d0, .12 + sin(time / 60 + x) * .08).fillCircle(x, y, 80);
    for (let i = 0; i < 60; i++) f.fillStyle([0xffc857, 0x6a2bd1, 0xf7f9ff, 0x1671d9, 0xd52b1e][i % 5]).fillRect(i * 137 % 800, (e * (.18 + i % 5 * .04) + i * 41) % 620 - 20, 5, 8);
  }
  for (let i = 0; i < (td ? 40 : 5); i++) { const a = rand() * 7, r = .78 + rand() * .2; f.fillStyle(td ? [0xfff6d0, 0xffc857, 0xf7f9ff][i % 3] : 0xffffff, rand()).fillCircle(W / 2 + Math.cos(a) * 392 * r, H / 2 + sin(a) * 268 * r, td ? 3.2 : 2.5); }
  s.best.setText(td ? 'TOUCHDOWN!' : s.top[0] ? `BEST VS CPU   ${s.top[0].n}  +${s.top[0].s}` : 'BEAT THE CPU TO SET A RECORD').setColor(td ? '#ffc857' : '#8fd0ff');
}

function drawIntroBowl(g, fans) {
  const ring = (t, n = 96) => Array.from({ length: n }, (_, i) => {
    const a = Math.PI * 2 * i / n, c = Math.cos(a), v = sin(a);
    return { x: 400 + (392 - t * 17) * Math.sign(c) * abs(c) ** .77, y: 300 + (272 - t * 13.7) * Math.sign(v) * abs(v) ** .77 };
  });
  g.fillStyle(0x050d20).fillRect(0, 0, W, H);
  for (let t = 0; t < 6; t++) {
    g.fillStyle(t % 2 ? 0x1b3a70 : 0x0f2447).fillPoints(ring(t), true);
    // Two rows of fans per tier; the second row is shifted so the seats stagger.
    for (const o of [.3, .75]) ring(t + o, 200 - t * 10).forEach((p, j) => {
      if (j % 25 > 1) g.fillStyle(fans[(j * 5 + t * 3 + (o > .5 ? 2 : 0)) % fans.length], .9).fillRect(p.x - 3.5, p.y - 3, 7, 6);
    });
  }
  g.fillStyle(0x080f1f).fillPoints(ring(6), true).lineStyle(3, C.gold, .7).strokePoints(ring(6), true);
  // Dark plates keep the title and the prompt readable over the crowd.
  g.fillStyle(0x050d20, .72).fillRoundedRect(120, 44, 560, 76, 22).fillRoundedRect(150, 478, 500, 104, 22);
  for (const [x, y] of [[78, 70], [722, 70], [78, 530], [722, 530]]) {
    for (let r = 72; r > 10; r -= 12) g.fillStyle(0xfff2bf, .045).fillCircle(x, y, r);
    g.fillStyle(0x0a1322).fillRect(x - 24, y - 9, 48, 18);
    for (let i = 0; i < 4; i++) g.fillStyle(0xfff6d0).fillRect(x - 20 + i * 10, y - 5, 7, 10);
  }
}

function createIntroArt(s) {
  const g = s.add.graphics().ui(15);
  drawIntroBowl(g, TEAMS.flatMap(t => [t[2], t[3]]));
  s.k = s.add.container(80, 60).setScale(.8).ui(17);
  const p = s.add.graphics(); s.k.add(p);
  // The centered top-down pitch leaves visible stands on every side.
  // Split field: Osiris.xp (black and gold) hosts the left half, Berton (purple and gold) the right.
  p.fillStyle(0x1c1c1c); p.fillRoundedRect(112, 132, 288, 336, 32); p.fillRect(380, 132, 20, 336);
  p.fillStyle(0x6a2bd1); p.fillRoundedRect(400, 132, 288, 336, 32); p.fillRect(400, 132, 20, 336);
  p.fillStyle(C.gold); p.fillRoundedRect(126, 146, 548, 308, 24);
  p.fillStyle(0x1a1a1a); p.fillRect(136, 156, 264, 288); p.fillStyle(0x2a1650); p.fillRect(400, 156, 264, 288);
  // The cover field mirrors the game's 130 yards: 418 px between goal lines, 3.215 px per yard.
  for (let i = 0; i < 13; i++) {
    p.fillStyle(i < 7 ? (i % 2 ? 0x262626 : 0x1a1a1a) : i % 2 ? 0x341c62 : 0x2a1650, .85); p.fillRect(191 + i * 32.15, 158, 16, 284);
  }
  p.fillStyle(0x0d0d0d); p.fillRect(136, 156, 55, 288);
  p.fillStyle(0x6a2bd1); p.fillRect(609, 156, 55, 288);
  p.lineStyle(2, C.gold, .94); p.strokeRect(136, 156, 528, 288);
  p.lineStyle(2, C.gold, .7);
  for (let i = 0; i <= 13; i++) {
    const x = 191 + i * 32.15;
    p.lineBetween(x, 158, x, 442);
    if (i === 0 || i === 13) { p.lineStyle(4, C.gold, .98); p.lineBetween(x, 156, x, 444); p.lineStyle(2, C.gold, .7); }
  }
  for (let i = 1; i < 65; i++) {
    const x = 191 + i * 6.43;
    p.lineBetween(x, 236, x, 248); p.lineBetween(x, 352, x, 364);
  }
  p.lineStyle(2, C.gold, .9); p.strokeCircle(400, 300, 47);
  p.lineStyle(1, C.gold, .8); p.lineBetween(400, 159, 400, 441);
  p.fillStyle(C.gold); p.fillRect(127, 279, 4, 42); p.fillRect(669, 279, 4, 42);
  s.n = [];
  for (let n = 10; n <= 60; n += 10) {
    const left = 191 + n * 3.215, right = 609 - n * 3.215;
    for (const x of [left, right]) for (const y of [177, 423]) {
      s.n.push(s.k.add(s.add.text(x, y, String(n), { ...AB, fontSize: '11px', color: '#ffc857', stroke: '#050d20', strokeThickness: 2 }).setOrigin(.5)));
    }
  }
  s.n.push(s.k.add(s.add.text(W / 2, H / 2, 'HACK 26', { ...AB, fontSize: '20px', color: '#ffc857', stroke: '#050d20', strokeThickness: 5 }).setOrigin(.5)));
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




function makeBanana(s, x, y, scale, style = s.ball) {
  const [, curve, th, body, shade, hi, band, line, tl, tr, drone] = BALLS[style], ly = curve ? -1.5 : -2;
  const c = s.add.container(x, y).setScale(scale), g = s.add.graphics(), pt = i => { const e = sin(Math.PI * i / 12); return [(i / 12 - .5) * 58, -2 + curve * e, 3 + th * e ** .7]; };
  // A strip between two fractions of the banana's thickness, as a polygon along the curved centre line.
  const edge = (a, b) => [...Array(13).keys()].map(i => ({ x: pt(i)[0], y: pt(i)[1] + (a - .5) * pt(i)[2] })).concat([...Array(13).keys()].reverse().map(i => ({ x: pt(i)[0], y: pt(i)[1] + (b - .5) * pt(i)[2] })));
  if (drone) for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const ex = dx * 23, ey = -2 + dy * 15;
    g.lineStyle(2.5, line).lineBetween(dx * 8, -2 + dy * 7, ex, ey).fillStyle(line, .4).fillEllipse(ex, ey, 22, 6).fillStyle(0x111111).fillCircle(ex, ey, 2.4);
  }
  g.fillStyle(body).fillPoints(edge(0, 1), true).lineStyle(2, line).strokePoints(edge(0, 1), true);
  g.fillStyle(shade, .85).fillPoints(edge(.55, .95), true).fillStyle(hi, .9).fillPoints(edge(.12, .3), true);
  for (const i of [2, 10]) g.fillStyle(band).fillRect(pt(i)[0] - 1.3, pt(i)[1] - pt(i)[2] / 2, 2.6, pt(i)[2]);
  g.lineStyle(1.6, band).lineBetween(-8, ly, 8, ly);
  for (let k = 0; k < 4; k++) g.lineBetween(-6 + k * 4, ly - 2, -6 + k * 4, ly + 2);
  if (drone) g.fillStyle(band).fillCircle(21, -2, 3.2).fillStyle(0x111111).fillCircle(21, -2, 1.5).fillStyle(0xff3b3b).fillCircle(-21, -2, 1.7);
  if (tl) g.fillStyle(tl).fillRect(-33, -5, 6, 5).fillStyle(tr).fillCircle(29.5, -1.5, 2.6);
  return c.add(g) && c;
}

function held(s, key) { return s.b.held[key] === true; }
function fieldScreenX(y) { return (y - TOP) * W / (BOTTOM - TOP); }
