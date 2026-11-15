const W = 800;
const H = 600;
const WORLD = 1800;
const TOP = 145;
const BOTTOM = 520;
const END = 130;
const C = { grass: 0x17345f, stripe: 0xffffff, flagBlue: 0x1671d9, gold: 0xffc857, cream: 0xf7f9ff, ink: 0x0b1b3a, red: 0xd52b1e, blue: 0x76baff, black: 0x050d20 };
// Chase camera: horizon line, camera height, focal length, distance behind the focus and nearest drawn depth.
const HZ = 130, CAMH = 240, FOC = 430, BACK = 330, NEAR = 215;
const TOUCHDOWN_EMOJIS = ['🏈', '🎉', '🏆', '🕺', '🔥', '🍌', '🙌', '⚡', '👑', '💥'];

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
  const down = e => { const c = KEY_TO_ARCADE[(e.key || '').toLowerCase()]; if (c) { if (!s.inputState.held[c]) s.inputState.pressed[c] = true; s.inputState.held[c] = true; if ((c === 'START1' || c === 'START2') && s.phase === 'controls') s.sound?.context?.resume?.(); } };
  const up = e => { const c = KEY_TO_ARCADE[(e.key || '').toLowerCase()]; if (c) s.inputState.held[c] = false; };
  window.addEventListener('keydown', down); window.addEventListener('keyup', up);
  s.events.once('shutdown', () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); });
  s.phase = 'title'; s.players = [[], []]; s.possession = 0; s.scores = [0, 0]; s.turnoverUntil = 0; s.pass = null; s.twoPlayers = false; s.cpuThrowAt = 0; s.down = 1; s.driveStart = WORLD / 2;
  s.cx = WORLD / 2; s.cl = W / 2;
  s.stadiumArt = s.add.graphics().setDepth(-2); drawStadium(s);
  s.fieldArt = s.add.graphics(); s.fieldMarks = []; makeFieldMarks(s);
  s.cover = s.add.image(W / 2, H / 2, 'cover').setScrollFactor(0).setDepth(16);
  // A second camera keeps the HUD and overlays out of the world camera's touchdown zoom.
  s.ui = s.cameras.add(0, 0, W, H);
  s.hudArt = s.add.graphics().setScrollFactor(0).setDepth(19);
  drawHudPlate(s.hudArt);
  s.hudHeader = s.add.text(122, 24, 'OYE IBAI, ¿NOS VEMOS?', { fontFamily: 'monospace', fontSize: '8px', color: '#1671d9', fontStyle: 'bold', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.hudLeft = s.add.text(51, 51, 'P1', { fontFamily: 'monospace', fontSize: '9px', color: '#0b1b3a', fontStyle: 'bold' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.hudRight = s.add.text(193, 51, 'CPU', { fontFamily: 'monospace', fontSize: '9px', color: '#f7f9ff', fontStyle: 'bold' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.hud = s.add.text(122, 52, '', { fontFamily: 'Arial Black, sans-serif', fontSize: '17px', color: '#f7f9ff', fontStyle: 'bold', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.hudStatus = s.add.text(700, 57, '', { fontFamily: 'monospace', fontSize: '8px', color: '#c5d9f2', fontStyle: 'bold', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.driveArt = s.add.graphics().setScrollFactor(0).setDepth(19);
  drawDrivePlate(s.driveArt);
  s.driveBanner = s.add.text(700, 36, '', { fontFamily: 'Arial Black, sans-serif', fontSize: '15px', color: '#1671d9', fontStyle: 'bold', align: 'center', stroke: '#050d20', strokeThickness: 3 }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  [s.hudArt, s.hudHeader, s.hudLeft, s.hudRight, s.hud, s.hudStatus, s.driveArt, s.driveBanner].forEach(item => item.setVisible(false));
  s.helpPlate = s.add.graphics().setScrollFactor(0).setDepth(19);
  s.helpPlate.fillStyle(C.ink, .92).fillRect(130, 567, 540, 25);
  s.helpPlate.lineStyle(1, C.cream, .38).strokeRect(130, 567, 540, 25);
  s.help = s.add.text(W / 2, 580, '', { fontFamily: 'monospace', fontSize: '9px', color: '#f7f9ff', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.titleArt = s.add.graphics().setScrollFactor(0).setDepth(18);
  drawTitlePlate(s.titleArt);
  s.titleArt.setVisible(false);
  s.titleTag = s.add.text(142, 147, 'PLATANUS ARCADE  /  SANTIAGO 2026', { fontFamily: 'monospace', fontSize: '12px', color: '#1671d9', fontStyle: 'bold' }).setOrigin(0, .5).setScrollFactor(0).setDepth(20).setVisible(false);
  s.title = s.add.text(137, 205, 'OYE IBAI,', { fontFamily: 'Arial Black, sans-serif', fontSize: '48px', color: '#f7f9ff', fontStyle: 'bold', stroke: '#0b1b3a', strokeThickness: 6 }).setOrigin(0, .5).setScrollFactor(0).setDepth(20).setVisible(false);
  s.titleAccent = s.add.text(137, 267, '¿NOS VEMOS?', { fontFamily: 'Arial Black, sans-serif', fontSize: '43px', color: '#1671d9', fontStyle: 'bold', stroke: '#0b1b3a', strokeThickness: 6 }).setOrigin(0, .5).setScrollFactor(0).setDepth(20).setVisible(false);
  s.tagline = s.add.text(142, 326, 'A BANANA FOOTBALL SENDOFF.', { fontFamily: 'monospace', fontSize: '12px', color: '#c5d9f2', fontStyle: 'bold' }).setOrigin(0, .5).setScrollFactor(0).setDepth(20).setVisible(false);
  s.modeText = s.add.text(142, 379, 'SOLO  ·  YOU VS CPU     /     LOCAL  ·  2 PLAYERS', { fontFamily: 'monospace', fontSize: '11px', color: '#f7f9ff', fontStyle: 'bold' }).setOrigin(0, .5).setScrollFactor(0).setDepth(20).setVisible(false);
  s.prompt = s.add.text(694, 34, 'PRESS ENTER', { fontFamily: 'monospace', fontSize: '11px', color: '#1671d9', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 3 }).setOrigin(.5).setScrollFactor(0).setDepth(20);
  s.titleBanana = makeBanana(s, 572, 295, 2.2).setRotation(-.28).setScrollFactor(0).setDepth(20);
  s.titleBanana.setVisible(false);
  s.loadingArt = s.add.graphics().setScrollFactor(0).setDepth(35); drawLoadingPlate(s.loadingArt);
  s.loadingTitle = s.add.text(W / 2, 242, 'GET READY', { fontFamily: 'Arial Black, sans-serif', fontSize: '43px', color: '#f7f9ff', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 6 }).setOrigin(.5).setScrollFactor(0).setDepth(36);
  s.loadingCredit = s.add.text(W / 2, 305, 'CREATOR: ARAMIS2009', { fontFamily: 'monospace', fontSize: '18px', color: '#1671d9', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 4 }).setOrigin(.5).setScrollFactor(0).setDepth(36);
  s.loadingStatus = s.add.text(W / 2, 448, 'LOADING GAME', { fontFamily: 'monospace', fontSize: '12px', color: '#f7f9ff', fontStyle: 'bold' }).setOrigin(.5).setScrollFactor(0).setDepth(36);
  s.loadingProgress = s.add.graphics().setScrollFactor(0).setDepth(36);
  s.loadingBanana = makeBanana(s, W / 2, 376, 1.2).setScrollFactor(0).setDepth(36);
  [s.loadingArt, s.loadingTitle, s.loadingCredit, s.loadingStatus, s.loadingProgress, s.loadingBanana].forEach(item => item.setVisible(false));
  s.controlsArt = s.add.graphics().setScrollFactor(0).setDepth(35); drawControlsPlate(s.controlsArt);
  s.controlsTitle = s.add.text(W / 2, 151, 'CONTROLS // READY', { fontFamily: 'Arial Black, sans-serif', fontSize: '33px', color: '#1671d9', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 5 }).setOrigin(.5).setScrollFactor(0).setDepth(36);
  s.controlsP1 = s.add.text(205, 235, 'P1  /  SOLO VS CPU\n\nMOVE + AIM     WASD\nPASS             U\nLONG PASS       O\nJUKE / TACKLE   I', { fontFamily: 'monospace', fontSize: '15px', color: '#f7f9ff', lineSpacing: 8, stroke: '#050d20', strokeThickness: 2 }).setScrollFactor(0).setDepth(36);
  s.controlsP2 = s.add.text(432, 235, 'P2  /  LOCAL\n\nMOVE + AIM     ARROWS\nPASS             R\nLONG PASS       Y\nJUKE / TACKLE   T', { fontFamily: 'monospace', fontSize: '15px', color: '#f7f9ff', lineSpacing: 8, stroke: '#050d20', strokeThickness: 2 }).setScrollFactor(0).setDepth(36);
  s.controlsCredit = s.add.text(W / 2, 408, 'CREATOR: ARAMIS2009', { fontFamily: 'monospace', fontSize: '12px', color: '#c5d9f2', fontStyle: 'bold' }).setOrigin(.5).setScrollFactor(0).setDepth(36);
  s.controlsPrompt = s.add.text(W / 2, 457, 'PRESS ENTER TO KICK OFF', { fontFamily: 'Arial Black, sans-serif', fontSize: '16px', color: '#1671d9', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 4 }).setOrigin(.5).setScrollFactor(0).setDepth(36);
  [s.controlsArt, s.controlsTitle, s.controlsP1, s.controlsP2, s.controlsCredit, s.controlsPrompt].forEach(item => item.setVisible(false));
  s.help.setText('AIM WASD  ·  PASS U  ·  LONG PASS O');
}

function update(time, delta) {
  const s = this, dt = Math.min(delta, 40);
  if (s.phase === 'title') {
    s.prompt.setAlpha(.68 + Math.sin(time / 300) * .25);
    if (s.inputState.pressed.START1 || s.inputState.pressed.START2) showLoading(s, time);
  } else if (s.phase === 'loading') {
    updateLoading(s, time);
  } else if (s.phase === 'controls') {
    s.controlsPrompt.setAlpha(.72 + Math.sin(time / 280) * .22);
    if (s.inputState.pressed.START1 || s.inputState.pressed.START2) startMatch(s, time);
  } else if (s.phase === 'playing') {
    if (s.inputState.pressed.START1 || s.inputState.pressed.START2) { s.phase = 'paused'; s.message.setText('PAUSED\nPRESS START TO RESUME').setVisible(true); }
    else playFrame(s, time, dt);
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
  } else if (s.phase === 'over' && (s.inputState.pressed.START1 || s.inputState.pressed.START2)) startMatch(s, time);
  if (s.players[0].length) renderWorld(s, time);
  s.inputState.pressed = {};
  // Screen-fixed objects render only on the HUD camera, everything else only on the zoomed world camera.
  for (const o of s.children.list) o.cameraFilter = o.scrollFactorX ? s.ui.id : s.cameras.main.id;
}

function startMatch(s, time) {
  s.scores = [0, 0]; s.possession = 0; s.pass = null; s.twoPlayers = false; s.phase = 'countdown'; s.turnoverUntil = time + 1700; s.down = 1; s.driveStart = WORLD / 2;
  s.pendingWinner = null; s.nearGoalCheered = false;
  [s.hudArt, s.hudHeader, s.hudLeft, s.hudRight, s.hud, s.hudStatus, s.driveArt, s.driveBanner, s.helpPlate, s.help].forEach(item => item.setVisible(true));
  [s.loadingArt, s.loadingTitle, s.loadingCredit, s.loadingStatus, s.loadingProgress, s.loadingBanana, s.controlsArt, s.controlsTitle, s.controlsP1, s.controlsP2, s.controlsCredit, s.controlsPrompt].forEach(item => item.setVisible(false));
  s.cover.setVisible(false);
  s.titleArt.setVisible(false); s.titleTag.setVisible(false); s.title.setVisible(false); s.titleAccent.setVisible(false); s.tagline.setVisible(false); s.modeText.setVisible(false); s.prompt.setVisible(false); s.titleBanana.setVisible(false); s.message?.destroy();
  s.message = s.add.text(W / 2, H / 2, '', { fontFamily: 'monospace', fontSize: '30px', color: '#1671d9', fontStyle: 'bold', align: 'center', stroke: '#0b1b3a', strokeThickness: 6 }).setOrigin(.5).setScrollFactor(0).setDepth(30);
  startStadiumAudio(s);
  makeTeams(s, 0, s.driveStart); updateHud(s);
  beginCountdown(s, time);
}

function showLoading(s, time) {
  s.phase = 'loading'; s.loadingUntil = time + 1800;
  s.cover.setVisible(false); s.prompt.setVisible(false); s.helpPlate.setVisible(false); s.help.setVisible(false);
  [s.loadingArt, s.loadingTitle, s.loadingCredit, s.loadingStatus, s.loadingProgress, s.loadingBanana].forEach(item => item.setVisible(true));
  updateLoading(s, time);
}

function updateLoading(s, time) {
  const progress = Phaser.Math.Clamp(1 - (s.loadingUntil - time) / 1800, 0, 1);
  s.loadingProgress.clear(); s.loadingProgress.fillStyle(C.flagBlue, .95).fillRect(180, 424, 440 * progress, 9);
  s.loadingBanana.setRotation(time / 450);
  if (time >= s.loadingUntil) showControls(s);
}

function showControls(s) {
  s.phase = 'controls';
  [s.loadingArt, s.loadingTitle, s.loadingCredit, s.loadingStatus, s.loadingProgress, s.loadingBanana].forEach(item => item.setVisible(false));
  [s.controlsArt, s.controlsTitle, s.controlsP1, s.controlsP2, s.controlsCredit, s.controlsPrompt].forEach(item => item.setVisible(true));
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
    s.countLabel = label; s.message.setText(label).setFontSize('64px').setColor('#1671d9').setScale(.72);
    s.tweens.add({ targets: s.message, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.Out' });
  }
}

function updateCelebration(s, time) {
  if (time < s.celebrationUntil) return;
  if (s.pendingWinner !== null) {
    s.phase = 'over'; s.message.setText(`TOUCHDOWN!\nTEAM ${s.pendingWinner + 1} WINS\n${s.scores[0]}  -  ${s.scores[1]}\nPRESS START TO PLAY AGAIN`).setFontSize('28px').setColor('#1671d9').setScale(1);
    return;
  }
  s.down = 1; s.driveStart = WORLD / 2;
  makeTeams(s, s.nextTeam, s.driveStart); updateHud(s);
  beginCountdown(s, time);
}

function makeTeams(s, firstTeam = 0, spot = WORLD / 2) {
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
  setPossession(s, firstTeam);
}

function createPlayer(s, team, number, x, y) {
  const color = team ? C.red : C.flagBlue, dark = team ? 0xb32119 : 0x0b54b8, trim = team ? C.cream : C.flagBlue, skin = 0xf0c49a;
  // Upright billboard with its origin at the feet, so the projected ground point anchors it.
  const root = s.add.container(0, 0);
  const ballRing = s.add.ellipse(0, 0, 62, 22, C.gold, .16).setStrokeStyle(2, C.gold, .9).setVisible(false); root.add(ballRing);
  root.add(s.add.ellipse(0, 0, 44, 13, C.black, .45));
  // Legs then arms; renderWorld pumps them while the player runs.
  const limbs = [s.add.rectangle(-7, -10, 10, 22, C.cream), s.add.rectangle(7, -10, 10, 22, C.cream), s.add.rectangle(-19, -43, 8, 23, color).setOrigin(.5, 0), s.add.rectangle(19, -43, 8, 23, color).setOrigin(.5, 0)];
  root.add(limbs);
  root.add(s.add.rectangle(0, -21, 26, 7, dark));
  root.add(s.add.rectangle(0, -34, 27, 21, color).setStrokeStyle(1, C.cream));
  root.add(s.add.ellipse(0, -45, 46, 15, dark).setStrokeStyle(2, C.cream));
  root.add(s.add.rectangle(0, -52, 9, 6, skin));
  // Team 0 wears a white helmet so the blue side still stands out against the navy turf.
  root.add(s.add.circle(0, -61, 11, team ? C.red : C.cream).setStrokeStyle(2, trim));
  root.add(s.add.rectangle(0, -62, 3, 20, trim));
  // Team 1 runs at the camera, so only it shows a face and facemask; team 0 is seen from behind.
  if (team) { root.add(s.add.rectangle(0, -58, 14, 8, skin)); root.add(s.add.rectangle(0, -59, 17, 2, 0x9fb0c8)); root.add(s.add.rectangle(0, -55, 17, 2, 0x9fb0c8)); }
  root.add(s.add.text(0, -34, String(number + 1), { fontFamily: 'Arial Black, sans-serif', fontSize: '14px', color: '#f7f9ff', fontStyle: 'bold', stroke: '#0b1b3a', strokeThickness: 3 }).setOrigin(.5));
  const roleLabel = s.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '10px', color: '#f7f9ff', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 4 }).setOrigin(.5).setDepth(10);
  const controlLabel = s.add.text(0, 0, team === 0 ? 'P1' : 'P2', { fontFamily: 'monospace', fontSize: '12px', color: team === 0 ? '#1671d9' : '#ef6a60', fontStyle: 'bold', stroke: '#050d20', strokeThickness: 4 }).setOrigin(.5).setDepth(11).setVisible(false);
  const banana = makeBanana(s, 15, -27, .5); root.add(banana); banana.setRotation(.6).setVisible(false);
  return { root, limbs, banana, roleLabel, controlLabel, ballRing, team, number, position: number, x, y, jukeUntil: 0, tackleUntil: 0 };
}

function playFrame(s, time, dt) {
  const p2Input = ['P2_U', 'P2_D', 'P2_L', 'P2_R', 'P2_1', 'P2_2', 'P2_3'].some(k => held(s, k) || s.inputState.pressed[k]);
  if (p2Input) s.twoPlayers = true;
  const carrier = s.players[s.possession][0], attack = s.possession === 0 ? 1 : -1;
  const ballTarget = s.looseBall || carrier;
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
        // Up means downfield, away from the camera.
        vx = (held(s, pre + 'U') ? 1 : 0) - (held(s, pre + 'D') ? 1 : 0);
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
        const [targetX, targetY] = defenseTarget(s, p, ballTarget, attack, time);
        vx = Phaser.Math.Clamp((targetX - p.x) / 115, -1, 1);
        vy = Phaser.Math.Clamp((targetY - p.y) / 85, -1, 1);
      }
      const mag = Math.hypot(vx, vy) || 1;
      const dashing = time < p.jukeUntil || time < p.tackleUntil;
      const chaseGap = team !== s.possession ? Phaser.Math.Distance.Between(p.x, p.y, carrier.x, carrier.y) : 0;
      const speed = controlledSet.has(p) ? (dashing ? 325 : 238) : team === s.possession ? (p.position === 1 || p.position === 2 ? 205 : 178) : chaseGap > 160 ? 218 : 188;
      p.x = Phaser.Math.Clamp(p.x + vx / mag * speed * dt / 1000, 24, WORLD - 24);
      p.y = Phaser.Math.Clamp(p.y + vy / mag * speed * dt / 1000, TOP + 30, BOTTOM - 27);
      p.moving = Math.hypot(vx, vy) > .15; p.lean = p.moving ? vy / mag : 0;
      p.banana.setVisible(p === carrier && !s.pass && !s.looseBall);
    }
  }
  if (s.pass) updatePass(s, dt, time);
  if (s.looseBall) updateLooseBall(s, time);
  const current = s.players[s.possession][0];
  if (!s.pass && !s.looseBall && time > s.turnoverUntil) {
    for (const defender of s.players[1 - s.possession]) {
      const distance = Phaser.Math.Distance.Between(current.x, current.y, defender.x, defender.y);
      if (distance < 25 && time > (defender.contactUntil || 0)) {
        defender.contactUntil = time + 850;
        playCrowd(s, .55, .72);
        impactBurst(s, defender.x, defender.y, C.red);
        if (Phaser.Math.Between(1, 100) <= (time < defender.tackleUntil ? 45 : 18)) {
          dropBanana(s, current.x, current.y, time, 1 - s.possession);
          playCue(s, 'FUMBLE!', '#ef6a60', time, 750); return;
        }
        current.x = Phaser.Math.Clamp(current.x - attack * 22, END + 28, WORLD - END - 28);
        playCue(s, 'BROKEN TACKLE!', '#1671d9', time, 400);
        break;
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
  const aimLength = Math.hypot(dx, dy), aimX = dx / aimLength, aimY = dy / aimLength;
  const targets = mates.map(m => {
    const tx = m.x - p.x, ty = m.y - p.y, dist = Math.hypot(tx, ty);
    return { p: m, alignment: (tx * aimX + ty * aimY) / Math.max(1, dist), dist };
  });
  const forward = targets.filter(t => t.alignment > 0);
  const options = forward.length ? forward : targets;
  options.sort((a, b) => b.alignment - a.alignment || (longPass ? b.dist - a.dist : a.dist - b.dist));
  const target = preferredTarget || options[0].p;
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
  playCue(s, longPass ? 'LONG PASS!' : 'PASS!', '#1671d9', time, 520);
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
      playCue(s, 'INTERCEPTED!', '#ef6a60', time, 900); impactBurst(s, d.x, d.y, C.red); return;
    }
  }
  if (t >= 1) {
    const catchers = s.players[s.possession].filter(p => p !== s.players[s.possession][0]);
    const receiver = catchers.reduce((best, player) => Phaser.Math.Distance.Between(player.x, player.y, f.x, f.y) < Phaser.Math.Distance.Between(best.x, best.y, f.x, f.y) ? player : best, catchers[0]);
    f.visual.destroy(); f.shadow.destroy(); s.pass = null;
    if (Phaser.Math.Distance.Between(receiver.x, receiver.y, f.x, f.y) > 48) {
      dropBanana(s, f.x, f.y, time, 1 - s.possession); playCue(s, 'WILD PASS!', '#ef6a60', time, 650); return;
    }
    receiver.x = f.x; receiver.y = f.y;
    setPossession(s, s.possession, receiver); s.turnoverUntil = time + 1100;
    playCue(s, 'CAUGHT!', '#1671d9', time, 560); impactBurst(s, receiver.x, receiver.y, C.gold);
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
  s.possession = team;
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
  else if (result === 'INCOMPLETE!') call = 'INCOMPLETE!';
  playCue(s, call, turnover ? '#ef6a60' : '#1671d9', time, 850);
  updateHud(s);
  s.phase = 'spotting'; s.spotUntil = time + 850;
}

function nearestPlayer(players, target) { return players.slice(1).reduce((a, b) => Phaser.Math.Distance.Between(a.x, a.y, target.x, target.y) < Phaser.Math.Distance.Between(b.x, b.y, target.x, target.y) ? a : b, players[1]); }

function scoreTouchdown(s, time) {
  s.scores[s.possession]++;
  const scorer = s.players[s.possession][0];
  s.cameras.main.flash(250, 225, 255, 0);
  s.cameras.main.shake(160, .004);
  impactBurst(s, scorer.x, scorer.y, C.flagBlue);
  s.phase = 'celebrating'; s.nextTeam = 1 - s.possession;
  s.pendingWinner = s.scores[s.possession] >= 3 ? s.possession : null;
  s.celebrationUntil = time + 2200; s.messageUntil = 0;
  s.nearGoalCheered = false; playCrowd(s, 1.35, 2.8);
  const emoji = TOUCHDOWN_EMOJIS[Phaser.Math.Between(0, TOUCHDOWN_EMOJIS.length - 1)];
  s.message.setText(`${emoji} TOUCHDOWN! ${emoji}`).setFontSize('34px').setColor('#1671d9').setAlpha(1).setScale(1);
  const celebrationEmoji = s.add.text(W / 2, H / 2 - 92, emoji, { fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif', fontSize: '48px' }).setOrigin(.5).setScrollFactor(0).setDepth(29).setScale(.45);
  s.tweens.add({ targets: celebrationEmoji, y: H / 2 - 150, scale: 1.2, alpha: 0, duration: 1250, ease: 'Back.Out', onComplete: () => celebrationEmoji.destroy() });
  scorer.ballRing.setVisible(true);
  // renderWorld owns every transform, so the dance animates a value it reads instead of the sprite.
  s.tweens.add({ targets: scorer, hop: 1, duration: 180, yoyo: true, repeat: 5, ease: 'Sine.InOut' });
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

function impactBurst(s, x, y, color) {
  const [sx, sy, k] = proj(s, x, y); x = sx; y = sy - 34 * k;
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4, spark = s.add.circle(x, y, 4, color, .95).setDepth(14);
    s.tweens.add({ targets: spark, x: x + Math.cos(angle) * 48, y: y + Math.sin(angle) * 48, scale: .35, alpha: 0, duration: 380, onComplete: () => spark.destroy() });
  }
}

function updateHud(s) {
  const carrier = s.players[s.possession][0], dir = s.possession === 0 ? 1 : -1;
  const toGo = Math.max(1, Math.ceil((154 - (carrier.x - s.driveStart) * dir) / 15.4));
  const downName = ['1ST', '2ND', '3RD', '4TH'][s.down - 1];
  const mode = s.twoPlayers ? 'P1 VS P2' : 'P1 VS CPU';
  s.hudLeft.setText('P1'); s.hudRight.setText(s.twoPlayers ? 'P2' : 'CPU');
  s.hud.setText(`${s.scores[0]}  —  ${s.scores[1]}`);
  s.hudStatus.setText(mode);
  s.driveBanner.setText(`${downName} & ${toGo}`);
  if (!s.twoPlayers && s.possession === 1) s.help.setText('P1 MOVE WASD   I TO HIT     CPU RUNS / PASSES');
  else if (!s.twoPlayers) s.help.setText('MOVE WASD   AIM + U PASS   AIM + O LONG   I JUKE');
  else if (s.possession === 0) s.help.setText('P1 WASD   AIM + U / O PASS   P2 ARROWS   T HIT');
  else s.help.setText('P2 ARROWS   AIM + R / Y PASS   P1 WASD   I HIT');
}

// Chase-camera projection. Field x is depth and `l` is the lateral position in field pixels.
// Returns [screenX, screenY, scale]; the camera never rolls, so equal depths share one screen row.
function pj(s, x, l) {
  const k = FOC / Math.max(x - s.cx + BACK, 40);
  return [W / 2 + (l - s.cl) * k, HZ + CAMH * k, k];
}
function proj(s, x, y) { return pj(s, x, fieldScreenX(y)); }

function addFieldMark(s, mark, x, l) { mark.fx = x; mark.fl = l; s.fieldMarks.push(mark.setDepth(1)); return mark; }

function makeFieldMarks(s) {
  const paint = { fontFamily: 'Arial Black, sans-serif', fontSize: '30px', color: '#f7f9ff', fontStyle: 'bold' };
  const mono = { fontFamily: 'monospace', fontSize: '9px', color: '#9acaff', fontStyle: 'bold', stroke: '#0b1b3a', strokeThickness: 3 };
  for (const x of [END / 2, WORLD - END / 2]) addFieldMark(s, s.add.text(0, 0, 'PLATANUS HACK 26', { ...paint, fontSize: '40px', stroke: '#07132b', strokeThickness: 6 }).setOrigin(.5), x, W / 2);
  for (let n = 10; n < 100; n += 10) {
    // Painted just beyond their line so the stripe does not cut through the digits.
    for (const l of [112, W - 112]) addFieldMark(s, s.add.text(0, 0, String(Math.min(n, 100 - n)).split('').join(' '), paint).setOrigin(.5, 1.2).setAlpha(.9), END + n * 15.4, l);
  }
  const codeBits = ['0x26', '0101', 'RUN>', 'HACK'];
  let row = 0;
  for (let x = END + 48; x < WORLD - END - 24; x += 118) {
    const code = codeBits[row++ % 4];
    for (const l of [56, W - 56]) addFieldMark(s, s.add.text(0, 0, code, mono).setOrigin(.5).setAlpha(.72), x, l);
  }
  const mid = WORLD / 2;
  addFieldMark(s, s.add.ellipse(0, 0, 270, 270, C.flagBlue, .3).setStrokeStyle(4, C.cream, .8), mid, W / 2);
  // The lone star of the Chilean flag is the midfield emblem.
  addFieldMark(s, s.add.star(0, 0, 5, 44, 110, C.cream, .16), mid, W / 2);
  addFieldMark(s, s.add.text(0, 0, '> ./PLATANUS_ARCADE', mono).setOrigin(.5), mid + 62, W / 2);
  addFieldMark(s, s.add.text(0, 0, 'HACK 26', { ...paint, color: '#1671d9', stroke: '#0b1b3a', strokeThickness: 5 }).setOrigin(.5), mid + 18, W / 2);
  addFieldMark(s, s.add.text(0, 0, 'aramis2009', { ...mono, fontSize: '15px', color: '#f7f9ff' }).setOrigin(.5), mid - 26, W / 2);
}

function renderWorld(s, time) {
  const g = s.fieldArt, L = 18, R = W - 18, carrier = s.players[s.possession][0], FAR = WORLD + 50;
  // When team 1 has the ball it runs at the camera, so pull back to keep the defenders in frame.
  s.cx += (carrier.x - (s.possession ? 190 : 0) - s.cx) * .08;
  s.cl += (Phaser.Math.Clamp(fieldScreenX(carrier.y), 280, 520) - s.cl) * .08;
  const x0 = s.cx - BACK + NEAR;
  const poly = (color, ...p) => { g.fillStyle(color); g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < 8; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fillPath(); };
  const band = (xa, xb, la, lb, color) => {
    xa = Math.max(xa, x0); if (xb <= xa) return;
    const a = pj(s, xa, la), b = pj(s, xa, lb), c = pj(s, xb, lb), d = pj(s, xb, la);
    poly(color, a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]);
  };
  const stripe = (x, la, lb, t, color, alpha = 1) => {
    if (x < x0) return;
    const a = pj(s, x, la), h = Math.max(1, t * a[2]);
    g.fillStyle(color, alpha); g.fillRect(a[0], a[1] - h / 2, (lb - la) * a[2], h);
  };
  g.clear();
  g.fillStyle(C.ink); g.fillRect(0, HZ, W, H - HZ);
  // Far stand: seat rows with crowd flecks that slide with the camera, above a perimeter board.
  const [, sb, kb] = pj(s, FAR, 0);
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
    const a = pj(s, x0, la), b = pj(s, FAR, la), c = pj(s, FAR, lb), d = pj(s, x0, lb);
    poly(0x13294f, a[0], a[1] - 40 * a[2], b[0], b[1] - 40 * b[2], c[0], c[1] - 260 * c[2], d[0], d[1] - 260 * d[2]);
    poly(C.flagBlue, a[0], a[1], b[0], b[1], b[0], b[1] - 40 * b[2], a[0], a[1] - 40 * a[2]);
  }
  band(0, END, L, R, 0x0039a6); band(WORLD - END, WORLD, L, R, C.red);
  // Mow bands flip every 5 yards so the turf pattern lines up with the painted yard lines.
  for (let i = 0; i < 20; i++) band(END + i * 77, END + i * 77 + 77, L, R, i % 2 ? 0x1d3f72 : 0x14305a);
  for (let n = Math.max(1, Math.ceil((x0 - END) / 15.4)); n < 100; n++) {
    const x = END + n * 15.4;
    if (n % 5 === 0) stripe(x, L, R, n % 10 ? 2 : 3, C.cream, n % 10 ? .62 : .92);
    // Single-yard ticks are dropped in the distance, where they would only shimmer.
    else if (x - x0 < 700) for (const l of [L + 5, R - 17, W / 2 - 96, W / 2 + 84]) stripe(x, l, l + 12, 2, C.cream, .7);
  }
  band(0, WORLD, L, L + 5, C.cream); band(0, WORLD, R - 5, R, C.cream);
  for (const x of [3, END, WORLD - END, WORLD - 3]) stripe(x, L, R, 6, C.cream);
  if (s.phase !== 'over') {
    const gain = Phaser.Math.Clamp(s.driveStart + (s.possession ? -154 : 154), END, WORLD - END);
    stripe(gain, L, R, 3, C.flagBlue, .8); stripe(carrier.x, L, R, 4, C.red, .95);
  }
  for (const x of [12, WORLD - 12]) {
    if (x < x0) continue;
    // Goal posts and pylons stand upright, so their height scales with depth like the players do.
    const [px, py, k] = pj(s, x, W / 2);
    g.fillStyle(C.gold); g.fillRect(px - 3 * k, py - 46 * k, 6 * k, 46 * k); g.fillRect(px - 46 * k, py - 50 * k, 92 * k, 5 * k);
    g.fillRect(px - 46 * k, py - 135 * k, 4 * k, 85 * k); g.fillRect(px + 42 * k, py - 135 * k, 4 * k, 85 * k);
  }
  g.fillStyle(0xff7a1a);
  for (const x of [4, END, WORLD - END, WORLD - 4]) {
    if (x < x0) continue;
    for (const l of [L, R]) { const [px, py, k] = pj(s, x, l); g.fillRect(px - 4 * k, py - 16 * k, 8 * k, 16 * k); }
  }
  // Haze toward the horizon gives the far end of the field some depth.
  for (let i = 1; i < 5; i++) { g.fillStyle(C.black, .09); g.fillRect(0, HZ, W, i * 16); }
  for (const m of s.fieldMarks) {
    const z = m.fx - s.cx + BACK, k = FOC / z;
    // Flat ground art is squashed by the same factor the ground plane is foreshortened at that depth.
    if (m.setVisible(z > NEAR * .7 && k > .22).visible) m.setPosition(W / 2 + (m.fl - s.cl) * k, HZ + CAMH * k).setScale(k, k * CAMH / z);
  }
  for (const p of s.players.flat()) {
    const [sx, sy, k] = proj(s, p.x, p.y), run = s.phase === 'playing' && p.moving ? Math.sin(time / 55 + p.number * 2) : 0, hop = p.hop || 0;
    p.limbs[0].y = -10 - Math.max(0, run) * 7; p.limbs[1].y = -10 - Math.max(0, -run) * 7;
    p.limbs[2].scaleY = 1 - run * .28; p.limbs[3].scaleY = 1 + run * .28;
    // Nearer players (smaller depth) must draw over farther ones.
    p.root.setPosition(sx, sy - hop * 18 * k).setScale(k * (1 + hop * .1), k * (1 - hop * .12)).setRotation((p.lean || 0) * .1 + hop * .2).setDepth(8 - p.x * .001).setVisible(k < 2.6);
    p.roleLabel.setPosition(sx, sy - 80 * k).setVisible(k < 2.6);
    p.controlLabel.setPosition(sx, sy - 80 * k - 13);
  }
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

function drawHudPlate(g) {
  g.fillStyle(C.black, .88); g.fillRect(18, 12, 208, 57);
  g.fillStyle(0x214f91, .9); g.fillRect(18, 12, 208, 4); g.fillRect(18, 12, 4, 57);
  g.fillStyle(C.ink, .92); g.fillRect(25, 19, 194, 43);
  g.fillStyle(C.flagBlue, .94); g.fillRect(30, 38, 42, 21);
  g.fillStyle(C.red, .94); g.fillRect(172, 38, 42, 21);
  g.lineStyle(1, C.cream, .74); g.strokeRect(18, 12, 208, 57);
  g.lineStyle(1, C.blue, .45); g.lineBetween(25, 35, 219, 35);
}

function drawDrivePlate(g) {
  g.fillStyle(C.black, .88); g.fillRect(618, 12, 164, 57);
  g.fillStyle(0x214f91, .9); g.fillRect(778, 12, 4, 57); g.fillRect(618, 65, 164, 4);
  g.fillStyle(C.ink, .92); g.fillRect(625, 19, 150, 43);
  g.lineStyle(1, C.cream, .74); g.strokeRect(618, 12, 164, 57);
  g.lineStyle(1, C.gold, .72); g.lineBetween(631, 45, 769, 45);
}

function drawLoadingPlate(g) {
  g.fillStyle(C.black, .97); g.fillRect(0, 0, W, H);
  g.fillStyle(C.ink, .95); g.fillRect(72, 104, 656, 392);
  g.fillStyle(C.flagBlue, .95); g.fillRect(72, 104, 178, 6);
  g.fillStyle(C.red, .95); g.fillRect(550, 490, 178, 6);
  g.lineStyle(3, C.cream, .82); g.strokeRect(72, 104, 656, 392);
  g.lineStyle(1, C.blue, .48); g.strokeRect(84, 116, 632, 368);
  g.fillStyle(C.black, .9); g.fillRect(180, 424, 440, 9);
  g.lineStyle(1, C.cream, .52); g.strokeRect(180, 424, 440, 9);
}

function drawControlsPlate(g) {
  g.fillStyle(C.black, .96); g.fillRect(0, 0, W, H);
  g.fillStyle(0x0b1b3a, .95); g.fillRect(64, 96, 672, 410);
  g.fillStyle(C.flagBlue, .96); g.fillRect(64, 96, 162, 6);
  g.fillStyle(C.red, .96); g.fillRect(574, 500, 162, 6);
  g.lineStyle(2, C.blue, .7); g.strokeRect(64, 96, 672, 410);
  g.lineStyle(1, C.flagBlue, .48); g.strokeRect(75, 107, 650, 388);
  g.lineStyle(1, C.blue, .36); g.lineBetween(400, 210, 400, 378);
  g.fillStyle(C.ink, .95); g.fillRect(160, 438, 480, 43);
  g.lineStyle(1, C.flagBlue, .65); g.strokeRect(160, 438, 480, 43);
}

function drawTitlePlate(g) {
  g.fillStyle(C.black, .9); g.fillRect(92, 113, 616, 374);
  g.fillStyle(C.ink, .92); g.fillRect(101, 122, 598, 356);
  g.lineStyle(2, C.flagBlue, .72); g.strokeRect(92, 113, 616, 374);
  g.lineStyle(1, C.cream, .42); g.strokeRect(101, 122, 598, 356);
  g.fillStyle(C.flagBlue, .95); g.fillRect(92, 113, 146, 5);
  g.fillStyle(C.red, .95); g.fillRect(562, 482, 146, 5);
  g.lineStyle(2, C.flagBlue, .48); g.strokeCircle(572, 295, 94); g.strokeCircle(572, 295, 79);
  g.lineStyle(1, C.cream, .2); g.lineBetween(505, 228, 639, 362); g.lineBetween(639, 228, 505, 362);
  g.fillStyle(C.gold, .9); g.fillCircle(671, 158, 3); g.fillCircle(654, 172, 2); g.fillCircle(682, 184, 2);
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
