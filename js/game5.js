/* =========================================================
   HUD / DIALOG / MELDUNGEN
   ========================================================= */
const heartsEl = document.getElementById('hearts');
for (let i=0;i<5;i++){
  const d = document.createElement('div'); d.className = 'hp'; heartsEl.appendChild(d);
}
let toastT = 0;
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1900);
}
function updateHUD(){
  const p = G.player; if (!p) return;
  const hs = heartsEl.children;
  for (let i=0;i<hs.length;i++) hs[i].classList.toggle('off', i >= p.hp);
  document.getElementById('hudScore').textContent = 'SCORE ' + String(Math.floor(G.score)).padStart(6,'0');
  const c = document.getElementById('combo');
  if (G.combo >= 2){ c.firstChild.nodeValue = G.combo; c.classList.add('on'); }
  else c.classList.remove('on');
}

function openDialog(who, lines){
  G.dialog = { who, lines, i:0 };
  const d = document.getElementById('dlg');
  document.getElementById('dlgWho').textContent = who;
  document.getElementById('dlgTxt').textContent = lines[0];
  d.classList.add('on');
}
function advanceDialog(){
  const dlg = G.dialog; if (!dlg) return;
  dlg.i++;
  if (dlg.i >= dlg.lines.length){
    G.dialog = null;
    document.getElementById('dlg').classList.remove('on');
    return;
  }
  document.getElementById('dlgTxt').textContent = dlg.lines[dlg.i];
}
document.getElementById('dlg').addEventListener('pointerdown', e => { e.preventDefault(); advanceDialog(); });

/* =========================================================
   MENÜ
   ========================================================= */
const cardsEl = document.getElementById('cards');
LEVELS.forEach((l, i) => {
  const c = document.createElement('div');
  c.className = 'card' + (i === 0 ? ' sel' : '');
  c.innerHTML = '<div class="num">LEVEL ' + (i+1) + ' · ' + l.time + '</div>' +
                '<div class="nm">' + l.name + '</div>' +
                '<div class="st">' + (l.boss ? 'BOSS: ' + l.boss.name.split('—')[0].trim() : 'PATROUILLE') + '</div>' +
                '<div class="flag">▶</div>';
  c.addEventListener('click', () => {
    [...cardsEl.children].forEach(x => x.classList.remove('sel'));
    c.classList.add('sel');
    G.levelIndex = i;
  });
  cardsEl.appendChild(c);
});

function setChar(c){
  G.char = c;
  document.getElementById('pickMira').classList.toggle('sel', c === 'mira');
  document.getElementById('pickKai').classList.toggle('sel', c === 'kai');
}
document.getElementById('pickMira').addEventListener('click', () => setChar('mira'));
if (isTouch) document.getElementById('pickKai').addEventListener('click', () => setChar('kai'));
else document.getElementById('pickKai').addEventListener('click', () => setChar('kai'));

function toMenu(){
  G.scene = 'menu'; G.playing = false;
  AudioR.stopAmbient();
  document.getElementById('menuOv').classList.add('on');
  document.getElementById('endOv').classList.remove('on');
  document.getElementById('pauseOv').classList.remove('on');
  document.getElementById('hud').classList.remove('on');
  document.getElementById('bossbar').classList.remove('on');
  document.getElementById('dlg').classList.remove('on');
  G.dialog = null;
}
function togglePause(){
  if (G.scene === 'play'){
    G.scene = 'pause';
    document.getElementById('pauseOv').classList.add('on');
  } else if (G.scene === 'pause'){
    G.scene = 'play';
    document.getElementById('pauseOv').classList.remove('on');
    last = performance.now();
  }
}

function goFullscreen(){
  const el = document.documentElement;
  const rf = el.requestFullscreen || el.webkitRequestFullscreen;
  if (rf) rf.call(el).catch(() => {});
  if (screen.orientation && screen.orientation.lock){
    screen.orientation.lock('landscape').catch(() => {});
  }
  setTimeout(resize, 250);
}

document.getElementById('btnStart').addEventListener('click', () => { AudioR.unlock(); startLevel(G.levelIndex); });
document.getElementById('btnFull').addEventListener('click', goFullscreen);
document.getElementById('btnCredits').addEventListener('click', () => document.getElementById('storyOv').classList.add('on'));
document.getElementById('btnStoryBack').addEventListener('click', () => document.getElementById('storyOv').classList.remove('on'));
document.getElementById('btnResume').addEventListener('click', togglePause);
document.getElementById('btnRestart').addEventListener('click', () => startLevel(G.levelIndex));
document.getElementById('btnMenu').addEventListener('click', toMenu);
document.getElementById('btnNext').addEventListener('click', () => startLevel(Math.min(LEVELS.length-1, G.levelIndex+1)));
document.getElementById('btnAgain').addEventListener('click', () => startLevel(G.levelIndex));
document.getElementById('btnToMenu').addEventListener('click', toMenu);
document.getElementById('tPause').addEventListener('pointerdown', e => { e.preventDefault(); togglePause(); });

addEventListener('keydown', e => {
  if (e.code === 'Escape' || e.code === 'KeyP'){
    if (G.scene === 'play' || G.scene === 'pause') togglePause();
  }
  if (e.code === 'Enter' && G.scene === 'menu') startLevel(G.levelIndex);
  if (e.code === 'KeyR' && (G.scene === 'play' || G.scene === 'pause')) startLevel(G.levelIndex);
});
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());

/* =========================================================
   RENDER + LOOP
   ========================================================= */
function drawCinematic(){
  const T = G.activeLevel && G.activeLevel.train;
  if (!T || T.phase !== 'intro') return;
  const t = T.t, dur = 3.4;
  const barA = clamp(t / .45, 0, 1) * clamp((dur - t) / .5, 0, 1);
  ctx.save();
  ctx.fillStyle = 'rgba(2,1,6,' + (.94 * barA) + ')';
  ctx.fillRect(0, 0, VW, 58);
  ctx.fillRect(0, VH - 58, VW, 58);
  const a = clamp((t - .25) / 1.1, 0, 1) * clamp((dur - t) / .55, 0, 1);
  ctx.globalAlpha = a;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 21px "Trebuchet MS",sans-serif';
  ctx.fillText('U4 · HAFENCITY', 40, VH - 88);
  ctx.fillStyle = '#39e6ff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('02:43 — LETZTER ZUG', 42, VH - 68);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(198,107,255,.9)';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('BAHNSTEIG 2', VW - 40, VH - 68);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
  ctx.restore();
}

function render(){
  const dpr = VIEW.dpr;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = '#05020a';
  ctx.fillRect(0, 0, cvs.width, cvs.height);
  const scale = VIEW.s * dpr;
  ctx.setTransform(scale, 0, 0, scale, VIEW.ox*dpr, VIEW.oy*dpr);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();

  if (G.activeLevel && G.scene !== 'menu'){
    drawBackground(G.activeLevel);
    ctx.save();
    ctx.translate(camShakeX(), camShakeY());
    drawLevel(G.activeLevel);
    ctx.restore();
    drawCinematic();
  } else {
    const dummy = { pal: LEVELS[0].pal };
    drawBackground(dummy);
    // Silhouette fürs Menü
    ctx.save();
    ctx.globalAlpha = .5;
    ctx.fillStyle = '#0a0410';
    ctx.fillRect(0, 400, VW, 140);
    ctx.restore();
  }
  ctx.restore();
}

let last = performance.now();
function frame(ts){
  const dt = Math.min(.05, Math.max(0, (ts - last) / 1000));
  last = ts;
  pollInput();
  if (G.scene === 'play'){
    if (FX.hitstop > 0){ FX.hitstop -= dt; updateFX(dt); }
    else if (!G.dialog) updateWorld(dt);
    else { updateFX(dt); }
  } else {
    updateFX(dt);
  }
  render();
  requestAnimationFrame(frame);
}
setChar('mira');
requestAnimationFrame(frame);

/* =========================================================
   PIXEL-SPRITES (Kontur + Teile)
   ========================================================= */
const INK = 'rgba(3,1,6,.92)';
function part(x, y, w, h, col, stroke = true){
  ctx.fillStyle = col;
  ctx.fillRect(x, y, w, h);
  if (stroke){
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
    ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  }
}
function drawPlayerSprite(p){
  const kai = p.char === 'kai';
  const f = p.face;
  const x = Math.round(p.x), y = Math.round(p.y), w = p.w, h = p.h;
  const air = !p.onGround;
  const run = p.state === 'run';
  const ph = Math.sin(p.anim * 15);
  const bob = run ? Math.abs(ph) * 1.5 : Math.sin(p.anim * 3) * 1;

  const skin   = kai ? '#c1865c' : '#b8794f';
  const skinD  = kai ? '#8e5f3c' : '#87563a';
  const topCol = kai ? '#20232c' : '#141020';
  const pantCol= kai ? '#1a1d24' : '#181322';
  const hairCol= kai ? '#0f0c0d' : '#150c11';
  const shoe   = kai ? '#2a2f38' : '#f4f4f8';

  ctx.save();
  ctx.globalAlpha = .3; ctx.fillStyle = '#000';
  ctx.fillRect(x - 1, y + h - 3, w + 2, 4);
  ctx.globalAlpha = 1;

  const cx = x + w/2;
  const legTop = y + 42 + bob;
  const sw = run ? ph * 5 : (air ? 4 : 0);
  part(x + 5,  legTop, 9, 19 - Math.abs(sw)*.3, pantCol);
  part(x + 20, legTop, 9, 19 + Math.abs(sw)*.3, pantCol);
  part(x + 3,  legTop + 19 - Math.abs(sw)*.3, 13, 7, shoe);
  part(x + 18, legTop + 19 + Math.abs(sw)*.3, 13, 7, shoe);
  if (!kai){
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(x + 3, legTop + 23, 13, 2);
    ctx.fillRect(x + 18, legTop + 23, 13, 2);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(x + 5, legTop + 2, 2, 15);
    ctx.fillRect(x + 20, legTop + 2, 2, 15);
  }
  part(x + 6, y + 20 + bob, w - 12, 24, topCol);
  if (!kai){
    part(x + 6, y + 21 + bob, w - 12, 3, '#ffffff', false);
    part(x + 6, y + 38 + bob, w - 12, 3, '#ffffff', false);
  } else {
    part(x + 6, y + 38 + bob, w - 12, 3, '#ff2e88', false);
    part(x + 12, y + 24 + bob, 2, 14, '#2c3038', false);
  }
  const armSw = run ? -ph * 5 : (p.state === 'attack' ? -6 : 0);
  part(x + 1, y + 23 + bob + armSw, 6, 17, topCol);
  part(x + w - 7, y + 23 + bob - armSw, 6, 17, topCol);
  part(x + 1, y + 38 + bob + armSw, 6, 5, skinD);
  part(x + w - 7, y + 38 + bob - armSw, 6, 5, skinD);

  const hy = y + 4 + bob*.6;
  part(x + 9, hy, 16, 16, skin);
  part(x + 8, hy - 2, 18, 6, hairCol);
  if (!kai){
    const sway = Math.sin(p.anim * 5) * 2;
    part(x + (f > 0 ? 3 : 24), hy - 1 + sway, 6, 15, hairCol);
    part(x + (f > 0 ? 1 : 27), hy + 9 + sway, 5, 8, hairCol);
    ctx.strokeStyle = '#ffc63a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + (f > 0 ? 22 : 12), hy + 13, 2.6, 0, Math.PI*2); ctx.stroke();
  } else {
    part(x + 8, hy - 3, 18, 4, hairCol, false);
  }
  ctx.fillStyle = '#f6f2ff';
  ctx.fillRect(x + (f > 0 ? 18 : 11), hy + 7, 4, 3);
  ctx.fillStyle = '#0a0509';
  ctx.fillRect(x + (f > 0 ? 20 : 12), hy + 7, 2, 3);

  if (p.state === 'attack' && p.atk){
    const a = p.atk, prog = clamp(p.atkT / a.dur, 0, 1);
    ctx.globalAlpha = (1 - prog) * .9;
    ctx.strokeStyle = a.dmg > 15 ? '#ff2e88' : '#bff6ff';
    ctx.lineWidth = a.dmg > 15 ? 5 : 3;
    ctx.beginPath();
    if (a.multi) ctx.arc(cx, y + h*.5, 30 + prog*50, 0, Math.PI*2);
    else ctx.arc(cx + f*8, y + h*.52, 24 + prog*26, f > 0 ? -1.0 : Math.PI - 1.0, f > 0 ? 1.0 : Math.PI + 1.0);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (p.invuln > 0 && Math.floor(p.invuln * 18) % 2 === 0){
    ctx.globalAlpha = .45; ctx.fillStyle = '#fff';
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawEnforcer(e){
  const x = Math.round(e.x), y = Math.round(e.y), w = e.w, h = e.h, f = e.face;
  const flash = e.hitFlash > 0;
  const body = flash ? '#ffffff' : '#41305f';
  const vest = flash ? '#ffffff' : '#1d2d4a';
  const st = e.state;
  const armUp = st === 'slam';
  const armFwd = st === 'punch' || st === 'grab' || st === 'charge';

  const aura = ctx.createRadialGradient(x + w/2, y + h*.5, 6, x + w/2, y + h*.5, 90);
  aura.addColorStop(0, 'rgba(57,230,255,.20)');
  aura.addColorStop(1, 'rgba(57,230,255,0)');
  ctx.fillStyle = aura; ctx.fillRect(x - 60, y - 40, w + 120, h + 100);
  ctx.globalAlpha = .38; ctx.fillStyle = '#000';
  ctx.fillRect(x - 5, y + h - 5, w + 10, 7); ctx.globalAlpha = 1;

  // Beine
  const step = st === 'charge' ? 8 : Math.sin(e.anim * 7) * 3;
  part(x + 8, y + h - 42, 17, 34 - step, '#0d0a16');
  part(x + w - 25, y + h - 42, 17, 34 + step, '#0d0a16');
  part(x + 5, y + h - 10, 23, 10, '#05030a');
  part(x + w - 28, y + h - 10, 23, 10, '#05030a');

  // Körper + Weste
  part(x + 4, y + 20, w - 8, h - 58, body);
  part(x + 9, y + 26, w - 18, h - 74, vest, false);
  ctx.fillStyle = '#39e6ff';
  ctx.fillRect(x + 11, y + 32, w - 22, 4);
  ctx.fillRect(x + 11, y + 50, w - 22, 3);
  ctx.fillStyle = 'rgba(255,198,58,.65)';
  ctx.fillRect(x + 11, y + 58, w - 22, 2);
  // Schulterplatten
  part(x - 6, y + 16, 16, 18, vest, false);
  part(x + w - 10, y + 16, 16, 18, vest, false);
  ctx.fillStyle = 'rgba(57,230,255,.5)';
  ctx.fillRect(x - 6, y + 16, 16, 2);
  ctx.fillRect(x + w - 10, y + 16, 16, 2);
  ctx.fillStyle = 'rgba(57,230,255,.5)';
  ctx.fillRect(x + 3, y + 22, 2, h - 62);
  ctx.fillRect(x + w - 5, y + 22, 2, h - 62);

  // Arme
  if (armUp){
    part(x - 4, y + 6, 12, 30, body);
    part(x + w - 8, y + 6, 12, 30, body);
  } else if (armFwd){
    part(x + (f > 0 ? w - 12 : 0), y + 28, f > 0 ? 34 : 34, 12, body);
    part(x + (f > 0 ? w + 16 : -22), y + 24, 18, 20, flash ? '#ffffff' : '#3a2a5a');
  } else {
    part(x + 1, y + 26, 10, 34, body);
    part(x + w - 11, y + 26, 10, 34, body);
  }

  // Kopf + Visier
  part(x + 10, y + 2, w - 20, 24, flash ? '#ffffff' : '#2b1f42');
  ctx.fillStyle = '#39e6ff';
  ctx.fillRect(x + (f > 0 ? 18 : 14), y + 11, w - 32, 4);
  ctx.fillStyle = 'rgba(57,230,255,.25)';
  ctx.fillRect(x + (f > 0 ? 18 : 14) - 2, y + 9, w - 28, 8);
  // Helm
  ctx.fillStyle = flash ? '#ffffff' : '#2b1f42';
  ctx.fillRect(x + 10, y - 3, w - 20, 7);
  ctx.fillStyle = '#ffc63a';
  ctx.fillRect(x + w/2 - 2, y - 9, 4, 7);

  // Telegraph: Ring am Boden, verdeckt die Figur nicht
  if (st === 'punch' || st === 'grab' || st === 'charge' || st === 'slam'){
    const k = st === 'charge' ? clamp((1.02 - e.timer) / .44, 0, 1)
            : st === 'slam' ? clamp((.66 - e.timer) / .36, 0, 1)
            : clamp((.62 - e.timer) / .44, 0, 1);
    ctx.save();
    ctx.globalAlpha = .28 + k * .5;
    ctx.strokeStyle = st === 'slam' ? '#c66bff' : '#39e6ff';
    ctx.lineWidth = 2 + k * 2.5;
    ctx.beginPath();
    ctx.ellipse(x + w/2, y + h - 2, 34 + k * 26, 11 + k * 8, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.globalAlpha = .10 + k * .16;
    ctx.fillStyle = st === 'slam' ? '#c66bff' : '#39e6ff';
    ctx.beginPath();
    ctx.ellipse(x + w/2, y + h - 2, 34 + k * 26, 11 + k * 8, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
  if (e.phase >= 1){
    ctx.globalAlpha = .22 + Math.sin(G.time * 6) * .08;
    ctx.fillStyle = '#39e6ff';
    ctx.fillRect(x + 2, y + 20, 3, h - 58);
    ctx.globalAlpha = 1;
  }
}

function drawEnemySprite(e){
  if (e.dead) return;
  if (e.isEnforcer){ drawEnforcer(e); return; }
  const t = e.t, f = e.face;
  const x = Math.round(e.x), y = Math.round(e.y), w = e.w, h = e.h;
  const walk = e.onGround ? Math.sin(e.anim * 9) * 1.5 : 0;
  const flash = e.hitFlash > 0;
  const body = flash ? '#ffffff' : t.col;
  const dark = flash ? '#eeeeee' : '#100a18';

  ctx.globalAlpha = .3; ctx.fillStyle = '#000';
  ctx.fillRect(x - 1, y + h - 3, w + 2, 4);
  ctx.globalAlpha = 1;

  part(x + 4, y + h - 24, 9, 21 + walk, dark);
  part(x + w - 13, y + h - 24, 9, 21 - walk, dark);
  part(x + 2, y + 15, w - 4, h - 37, body);
  part(x + 4, y + 1, w - 8, 17, flash ? '#ffffff' : '#0c0812');
  ctx.fillStyle = '#05030a';
  ctx.fillRect(x + 6, y + 6, w - 12, 10);
  ctx.fillStyle = t.accent;
  ctx.fillRect(x + (f > 0 ? w - 13 : 7), y + 9, 4, 3);
  ctx.fillStyle = t.accent;
  ctx.fillRect(x + 2, y + 15, w - 4, 3);
  if (e.boss){
    ctx.fillRect(x + 2, y + 15, 4, h - 37);
    ctx.fillStyle = t.accent;
    ctx.fillRect(x + w/2 - 2, y - 7, 4, 7);
  }
  if (e.state === 'block'){
    ctx.strokeStyle = '#9df3ff'; ctx.lineWidth = 3; ctx.globalAlpha = .8;
    ctx.beginPath(); ctx.arc(x + w/2, y + h*.45, w*.78, f > 0 ? -1.2 : Math.PI - 1.2, f > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (e.state === 'attack'){
    const k = clamp(1 - e.timer / (t.windup || .3), 0, 1);
    const r = 20 + k * 12;
    ctx.strokeStyle = t.accent; ctx.globalAlpha = .45 + k*.5; ctx.lineWidth = 2 + k*2;
    ctx.beginPath(); ctx.arc(x + w/2 + f*8, y + h*.55, r, f > 0 ? -1.1 : 2.04, f > 0 ? 1.1 : 4.24); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (!e.boss && e.hp < e.maxHp){
    const bw = w + 4;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(x - 2, y - 9, bw, 4);
    ctx.fillStyle = t.accent; ctx.fillRect(x - 2, y - 9, bw * (e.hp / e.maxHp), 4);
  }
}

/* Debug-Hook für Tests */
window.__HNR = { G, LEVELS, ATTACKS, startLevel, ENEMIES: () => G.activeLevel ? G.activeLevel.enemies : [],
  TRAIN: () => G.activeLevel && G.activeLevel.train || null,
  sim: (secs, keys) => {
    for (const k in raw) raw[k] = false;
    if (keys) for (const k in keys) raw[k] = keys[k];
    const step = 1/60;
    for (let t=0; t<secs; t+=step){
      for (const k in raw){ prev[k] = held[k]; held[k] = raw[k]; }
      if (G.scene === 'play' && !G.dialog){ if (FX.hitstop>0) FX.hitstop -= step; else updateWorld(step); }
      updateFX(step);
    }
    return G.player ? { hp:G.player.hp, x:Math.round(G.player.x), y:Math.round(G.player.y),
      state:G.player.state, enemies:G.activeLevel.enemies.length, combo:G.combo, score:Math.round(G.score) } : null;
  }
};
