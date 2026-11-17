/* =========================================================
   BOSS: THE PLATFORM ENFORCER
   ========================================================= */
class Enforcer extends Enemy {
  constructor(x){
    super(x, 'enforcer', { hp:80, name:'THE PLATFORM ENFORCER' });
    this.isEnforcer = true;
    this.w = 60; this.h = 100;
    this.x = x; this.y = GY - this.h - 2;
    this.boss = true; this.aggro = true;
    this.state = 'idle'; this.timer = 0; this.cd = 1.5; this.didHit = false;
    this.phase = 0; this.hurtT = 0; this.hitGround = false; this.didSlam = false;
    this.dropChance = 1;
  }
  get box(){ return { x:this.x, y:this.y, w:this.w, h:this.h }; }

  choose(p, adx){
    const r = Math.random();
    this.didHit = false; this.didSlam = false; this.hitGround = false;
    if (adx < 88 && r < .5){ this.state = 'grab'; this.timer = .54; }
    else if (adx < 132){ this.state = 'punch'; this.timer = .62; }
    else if (adx > 150 && adx < 640 && r < .58){ this.state = 'charge'; this.timer = 1.02; }
    else if (r < .38){ this.state = 'slam'; this.timer = .66; }
    else { this.state = 'punch'; this.timer = .62; }
    this.cd = (this.state === 'charge' ? 1.75 : 1.4) - this.phase * .26;
    AudioR.blip(this.state === 'charge' ? 168 : 236, .1, 'sawtooth', .04, -90);
  }

  update(dt, lvl, p){
    if (this.dead) return;
    this.anim += dt; this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.hurtT > 0){
      this.hurtT -= dt; this.vx *= .9; this.vy += GRAV*dt; collideWorld(this, lvl, dt); return;
    }
    if (this.hp <= this.maxHp*.5 && this.phase === 0){
      this.phase = 1; ring(this.cx, this.y+this.h/2, '#39e6ff', 130); shake(9); toast('ER WIRD SCHNELLER');
    }
    if (this.hp <= this.maxHp*.25 && this.phase === 1){
      this.phase = 2; ring(this.cx, this.y+this.h/2, '#ff2e88', 160); shake(12);
    }
    this.cd = Math.max(0, this.cd - dt);
    const dx = p.cx - this.cx, adx = Math.abs(dx);

    if (this.state === 'idle'){
      this.face = dx > 0 ? 1 : -1;
      this.vy += GRAV*dt;
      this.vx = lerp(this.vx, this.face * (104 + this.phase*26), .1);
      collideWorld(this, lvl, dt);
      if (this.cd <= 0 && adx < 620) this.choose(p, adx);
      return;
    }
    this.timer -= dt;
    const slow = this.phase > 0 ? .84 : 1;

    if (this.state === 'punch'){
      this.vx *= .86; this.vy += GRAV*dt; collideWorld(this, lvl, dt);
      if (!this.didHit && this.timer <= .18 * slow){
        this.didHit = true;
        const hb = { x: this.face > 0 ? this.x + this.w - 12 : this.x - 84, y: this.y + 12, w: 96, h: this.h - 16 };
        spark(hb.x + hb.w/2, hb.y + 28, 10, '#9df3ff', 280); shake(7); AudioR.heavy();
        if (overlap(hb, p.box)) p.hurt(2, this.face > 0 ? 1 : -1);
      }
      if (this.timer <= -.26) this.state = 'idle';
      return;
    }

    if (this.state === 'charge'){
      if (this.timer > .58){
        this.vx *= .84; this.vy += GRAV*dt; collideWorld(this, lvl, dt);
        if (Math.random() < dt*26) spark(this.cx - this.face*22, this.y + this.h - 8, 2, '#39e6ff', 150);
      } else if (this.timer > 0){
        this.vx = this.face * 790; this.vy += GRAV*dt; collideWorld(this, lvl, dt);
        if (Math.random() < .6) spark(this.cx - this.face*20, this.y + this.h - 22, 2, '#c9f7ff', 210);
        if (!this.didHit && overlap(this.box, p.box)){
          this.didHit = true; p.hurt(2, this.face > 0 ? 1 : -1);
          shake(10); FX.flash = .25; AudioR.heavy(); hitstop(.08);
        }
        if (this.timer <= 0){ this.vx *= .18; this.state = 'idle'; }
      } else this.state = 'idle';
      return;
    }

    if (this.state === 'grab'){
      this.vx *= .7; this.vy += GRAV*dt; collideWorld(this, lvl, dt);
      if (!this.didHit && this.timer <= .14 * slow){
        this.didHit = true;
        const hb = { x: this.face > 0 ? this.x + this.w - 8 : this.x - 42, y: this.y + 10, w: 64, h: this.h - 14 };
        if (overlap(hb, p.box)){
          p.hurt(2, this.face > 0 ? 1 : -1);
          p.vy = -450; p.invuln = Math.max(p.invuln, .5);
          hitstop(.16); shake(12); AudioR.heavy(); spark(p.cx, p.cy, 14, '#ff5a7a', 300);
          toast('GEPACKT');
        } else spark(hb.x + hb.w/2, hb.y + 24, 6, '#9df3ff', 180);
      }
      if (this.timer <= -.3) this.state = 'idle';
      return;
    }

    if (this.state === 'slam'){
      if (!this.didSlam && this.timer <= .42){ this.didSlam = true; this.vy = -760; }
      this.vx = lerp(this.vx, 0, .18);
      this.vy += GRAV*dt; collideWorld(this, lvl, dt);
      if (this.didSlam && !this.hitGround && this.onGround && this.vy >= 0){
        this.hitGround = true;
        shake(18); FX.flash = .4; AudioR.heavy();
        ring(this.cx, this.y + this.h, '#c66bff', 210); ring(this.cx, this.y + this.h, '#39e6ff', 150);
        spark(this.cx, this.y + this.h, 22, '#c66bff', 430);
        if (Math.abs(p.cx - this.cx) < 195 && Math.abs((p.y + p.h) - (this.y + this.h)) < 80){
          p.hurt(2, p.cx < this.cx ? -1 : 1); p.vy = -380;
        }
      }
      if (this.timer <= -.38){ this.state = 'idle'; this.hitGround = false; }
      return;
    }
    this.state = 'idle';
  }

  die(){
    if (this.dead) return;
    this.dead = true; this.hp = 0;
    spark(this.cx, this.y + this.h/2, 30, '#39e6ff', 480);
    ring(this.cx, this.y + this.h/2, '#ffffff', 170);
    shake(18); FX.flash = .5; AudioR.ko();
    G.score += 5000;
    G.items.push({ x:this.cx - 10, y:this.y + this.h - 32, w:20, h:20, kind:'heart', vy:-140, taken:false });
    G.boss = null;
    document.getElementById('bossbar').classList.remove('on');
    const T = G.activeLevel.train;
    if (T){ T.phase = 'board'; T.t = 0; }
    toast('BAHNSTEIG FREI — EINSTEIGEN');
    AudioR.chime();
  }
}

/* =========================================================
   LEVEL AUFBAU
   ========================================================= */
function startLevel(index){
  const def = LEVELS[index];
  if (!def) return;
  G.levelIndex = index;
  G.score = 0; G.combo = 0; G.comboT = 0; G.time = 0;
  G.boss = null; G.projs = [];
  const lvl = {
    def, pal: def.pal, length: def.length, height: 760,
    solids: [], hazards: [], items: [], npcs: [], crates: [], enemies: [],
    arenas: (def.arenas||[]).map(a => ({ ...a, done:false, started:false })),
    bossSpawned: false, gate: null
  };
  for (const [x,w] of def.ground) lvl.solids.push({ x, y:GY, w, h:GH, type:'solid', ground:true });
  for (const p of (def.plats||[])) lvl.solids.push({ ...p, h:p.h });
  lvl.solids.sort((a,b)=>a.x-b.x);
  lvl.hazards = (def.hazards||[]).map(h => ({ ...h }));
  lvl.crates = (def.crates||[]).filter(c => c.x < def.length-300);
  lvl.bins = (def.bins||[]).map(b => ({ ...b }));
  lvl.machines = (def.machines||[]).map(m => ({ ...m }));
  lvl.items = (def.items||[]).map(it => ({ ...it, w:20, h:20, taken:false, vy:0 }));
  lvl.npcs = (def.npcs||[]).map(n => ({ ...n, talked:false }));
  lvl.enemies = (def.enemies||[]).map(e => new Enemy(e.x, e.type));
  lvl.bossDef = def.boss;
  lvl.train = null;
  G.cine = null;
  AudioR.stopAmbient();
  if (def.script === 'lastTrain'){
    lvl.train = {
      phase:'intro', t:0,
      trainX: def.train.enterX, stopX: def.train.stopX,
      doorX: def.train.stopX + def.train.doorOff,
      doors:0, lights:0, prompt:false
    };
    G.cine = { t:0, dur:3.4 };
    AudioR.startAmbient();
  }

  G.activeLevel = lvl;
  G.player = new Player(def.start.x, def.start.y - 60, G.char);
  G.player.hp = G.player.maxHp;
  cam.x = 0; cam.y = 0; cam.tx = 0; cam.ty = 0;
  FX.parts.length = 0; FX.rings.length = 0; FX.shake = 0; FX.hitstop = 0; FX.flash = 0;
  G.scene = 'play'; G.playing = true;
  document.getElementById('menuOv').classList.remove('on');
  document.getElementById('endOv').classList.remove('on');
  document.getElementById('storyOv').classList.remove('on');
  document.getElementById('pauseOv').classList.remove('on');
  document.getElementById('hud').classList.add('on');
  document.getElementById('bossbar').classList.remove('on');
  document.getElementById('endOv').classList.remove('on');
  document.getElementById('hudName').textContent = G.char === 'kai' ? 'KAI' : 'MIRA';
  document.getElementById('hudLevel').textContent = def.tag;
  toast(def.tag + ' — ' + def.time);
  updateHUD();
}

function spawnArenaWave(a){
  const types = a.wave.slice();
  for (let i=0;i<types.length;i++){
    const side = i % 2 === 0 ? 1 : -1;
    const ex = clamp(G.player.x + side * rnd(160,260), a.x1, a.x2);
    const e = new Enemy(ex, types[i]);
    e.y = GY - e.h - 2;
    e.aggro = true;
    G.activeLevel.enemies.push(e);
  }
  toast('SPERRGEBIET — KÄMPFE FREI');
}

function spawnBoss(){
  const b = G.activeLevel.bossDef;
  if (!b) return;
  const e = new Enemy(b.x, b.type, { hp:b.hp, name:b.name });
  e.boss = true; e.aggro = true;
  e.name = b.name;
  G.activeLevel.enemies.push(e);
  G.boss = e;
  const bar = document.getElementById('bossbar');
  document.getElementById('bossName').textContent = b.name;
  document.getElementById('bossFill').style.width = '100%';
  bar.classList.add('on');
  toast(b.name);
  shake(10);
}

/* =========================================================
   LEVEL-SKRIPT: U-BAHN — LAST TRAIN
   ========================================================= */
function spawnGang(){
  const p = G.player, lvl = G.activeLevel;
  ['grunt','runner','grunt','dodger','blocker'].forEach((t, i) => {
    const x = clamp(p.cx + 430 + i*54, 120, lvl.length - 160);
    const e = new Enemy(x, t, { hp: Math.round(ETYPES[t].hp * 1.15) });
    e.aggro = true; e.face = -1;
    lvl.enemies.push(e);
  });
  toast('FÜNF MANN — KEINER MIT FAHRKARTE');
  shake(4);
  AudioR.blip(300, .12, 'square', .04, -120);
}

function spawnGang2(){
  const p = G.player, lvl = G.activeLevel;
  ['heavy','elite','runner'].forEach((t, i) => {
    const x = clamp(p.cx + 470 + i*60, 120, lvl.length - 160);
    const e = new Enemy(x, t);
    e.aggro = true; e.face = -1;
    lvl.enemies.push(e);
  });
  toast('NACHWUCHS VON DER ROLLTREPPE');
  AudioR.blip(260, .14, 'square', .045, -130);
  shake(5);
}

function spawnEnforcer(x){
  const e = new Enforcer(x);
  G.activeLevel.enemies.push(e);
  G.boss = e;
  document.getElementById('bossName').textContent = 'THE PLATFORM ENFORCER';
  document.getElementById('bossFill').style.width = '100%';
  document.getElementById('bossbar').classList.add('on');
  toast('THE PLATFORM ENFORCER');
  shake(14); FX.flash = .35;
  AudioR.announce();
}

function updateTrainScript(dt){
  const lvl = G.activeLevel, T = lvl.train, p = G.player;
  if (!T) return;
  T.t += dt;
  const alive = lvl.enemies.filter(e => !e.dead).length;
  const d = lvl.def;

  switch (T.phase){
    case 'intro':
      if (T.t > 3.4){ T.phase = 'wait'; T.t = 0; G.cine = null; toast('02:43 — WARTE AUF DEN ZUG'); }
      break;
    case 'wait':
      // Countdown blinkt, Spieler hat volle Kontrolle
      if (p.cx > 900 || T.t > 11){ T.phase = 'gang'; T.t = 0; spawnGang(); }
      break;
    case 'gang':
      if (alive === 0){ T.phase = 'wave2'; T.t = 0; }
      break;
    case 'wave2':
      if (T.t > 1.15){ spawnGang2(); T.phase = 'gang2'; T.t = 0; }
      break;
    case 'gang2':
      if (alive === 0){
        T.phase = 'announce'; T.t = 0;
        AudioR.announce();
        toast('ACHTUNG — ZUG NACH NIENDORF, EINFAHRT');
      }
      break;
    case 'announce':
      T.lights = clamp(T.t / 2.2, 0, 1);
      if (T.t > 2.4){ T.phase = 'arrive'; T.t = 0; AudioR.rumble(3.4, .1); }
      break;
    case 'arrive': {
      const k = clamp(T.t / 3.4, 0, 1);
      const ease = 1 - Math.pow(1 - k, 3);
      T.trainX = lerp(d.train.enterX, d.train.stopX, ease);
      T.lights = 1;
      if (k > .05 && k < .95) shake(2.4);
      if (Math.random() < dt*14) spark(cam.x + rnd(20, VW-20), GY - rnd(4, 40), 2, '#c9f7ff', 120);
      if (k >= 1){ T.phase = 'doors'; T.t = 0; AudioR.chime(); toast('TÜREN ÖFFNEN'); }
      break;
    }
    case 'doors':
      T.doors = clamp(T.t / .75, 0, 1);
      if (T.t > 1.15){ T.phase = 'fight'; T.t = 0; spawnEnforcer(T.doorX + 60); }
      break;
    case 'fight':
      T.doors = 1;
      break;
    case 'board':
      T.doors = 1;
      T.prompt = Math.abs(p.cx - T.doorX) < 96;
      if (T.prompt && (pressed('interact') || Math.abs(p.cx - T.doorX) < 46)){
        T.phase = 'into'; T.t = 0; T.prompt = false;
        AudioR.chime(); FX.flash = .55; toast('EINSTEIGEN');
      }
      break;
    case 'into':
      T.doors = 1;
      if (T.t > 1.25) endLevel(true);
      break;
  }
}

/* =========================================================
   UPDATE
   ========================================================= */
function updateWorld(dt){
  const lvl = G.activeLevel, p = G.player;
  G.time += dt;
  if (G.comboT > 0){ G.comboT -= dt; if (G.comboT <= 0){ G.combo = 0; } }

  // Bahnsteig-Skript (Intro, Bande, Einfahrt, Boss, Einstieg)
  if (lvl.train) updateTrainScript(dt);
  if (lvl.train && (lvl.train.phase === 'intro' || lvl.train.phase === 'into')){
    updateFX(dt); camFollow(p, dt, lvl); updateHUD();
    return;
  }

  // bewegliche Plattformen
  for (const s of lvl.solids){
    if (s.type !== 'move') continue;
    s.x = s.ox + Math.sin(G.time * s.sp + s.ph) * s.ax;
    s.y = s.oy + Math.sin(G.time * s.sp + s.ph) * s.ay;
  }

  // Wind (HafenCity)
  if (lvl.pal.wind) p.vx += lvl.pal.wind * dt * (Math.sin(G.time*.7) > 0 ? 1 : .4);

  p.update(dt, lvl);

  // Dialog blockiert Bewegung
  if (G.dialog){
    if (pressed('interact')) advanceDialog();
  }

  // Gegner
  for (const e of lvl.enemies){
    if (!e.dead) e.update(dt, lvl, p);
  }
  lvl.enemies = lvl.enemies.filter(e => !e.dead || e.bossKeep);

  // Kisten zerbrechen
  if (p.state === 'attack' && p.atk && p.atkT > .05 && p.atkT < .24){
    const a = p.atk;
    const hb = { x: p.face>0 ? p.x+a.hx : p.x+p.w-a.hx-a.hw, y:p.y+p.h+a.hy, w:a.hw, h:a.hh };
    for (const c of lvl.crates){
      if (c.broken || !overlap(hb, c)) continue;
      c.hp -= 1;
      spark(c.x+c.w/2, c.y+c.h/2, 8, '#ffb347', 240);
      shake(3);
      if (c.hp <= 0){
        c.broken = true;
        G.score += 50;
        if (Math.random() < .45) lvl.items.push({ x:c.x+6, y:c.y+4, w:20, h:20, kind: Math.random()<.3?'heart':'crown', taken:false, vy:-120 });
        AudioR.blip(220,.1,'square',.04,-90);
      }
    }
  }

  // Mülleimer umtreten
  if (lvl.bins && p.state === 'attack' && p.atk && p.atkT > .05 && p.atkT < .24){
    const a = p.atk;
    const hb = { x: p.face>0 ? p.x+a.hx : p.x+p.w-a.hx-a.hw, y:p.y+p.h+a.hy, w:a.hw, h:a.hh };
    for (const b of lvl.bins){
      if (b.broken || b.hp <= 0 || !overlap(hb, b)) continue;
      b.hp--; shake(2); AudioR.blip(190, .09, 'square', .04, -70);
      spark(b.x + b.w/2, b.y + b.h/2, 9, '#39e6ff', 230);
      if (b.hp <= 0){
        b.broken = true; G.score += 60;
        if (Math.random() < .35) lvl.items.push({ x:b.x, y:b.y, w:20, h:20, kind:'crown', taken:false, vy:-140 });
      }
    }
  }

  // Hazards
  for (const hz of lvl.hazards){
    if (overlap(p.box, hz) && p.invuln <= 0){
      p.hurt(1, p.cx < hz.x + hz.w/2 ? 1 : -1);
      p.vy = -420;
    }
  }

  // Items
  for (let i=lvl.items.length-1;i>=0;i--){
    const it = lvl.items[i];
    if (it.taken) { lvl.items.splice(i,1); continue; }
    it.vy = (it.vy||0) + GRAV*dt*.5; it.y += it.vy*dt;
    if (it.y > GY-30){ it.y = GY-30; it.vy = 0; }
    if (overlap(p.box, it)){
      it.taken = true;
      if (it.kind === 'heart'){
        if (p.hp < p.maxHp){ p.hp++; toast('+1 LEBEN'); } else G.score += 300;
      } else { G.score += 250; toast('+250'); }
      AudioR.pick(); ring(it.x+10, it.y+10, '#ffc63a', 40);
    }
  }

  // Arenen
  for (const a of lvl.arenas){
    if (!a.done && !a.started && p.cx > a.x1 && p.cx < a.x2){
      a.started = true; spawnArenaWave(a);
    }
    if (a.started && !a.done){
      const alive = lvl.enemies.filter(e => !e.dead && e.x > a.x1-120 && e.x < a.x2+120).length;
      if (alive === 0){ a.done = true; toast('FREI'); ring(p.cx, p.cy, '#39e6ff', 100); }
    }
  }

  // Boss
  const bd = lvl.bossDef;
  if (bd && !lvl.bossSpawned && !bd.scripted && p.cx > bd.x - 620){ lvl.bossSpawned = true; spawnBoss(); }

  // Boss-Leiste + Levelende
  if (G.boss){
    const f = Math.max(0, G.boss.hp/G.boss.maxHp);
    document.getElementById('bossFill').style.width = (f*100).toFixed(1) + '%';
    if (G.boss.dead || f <= 0){
      document.getElementById('bossbar').classList.remove('on');
      G.boss = null;
      setTimeout(() => endLevel(true), 650);
    }
  }

  // Absturz
  if (p.y > GY + 260){
    p.hp = Math.max(0, p.hp - 1);
    p.x = clamp(p.x - 240, 20, lvl.length-100); p.y = GY - 140; p.vy = 0; p.vx = 0;
    p.invuln = 1.2;
    if (p.hp <= 0) gameOver();
  }

  // Tod
  if (p.hp <= 0) gameOver();

  // Ticketautomat
  G.nearMachine = null;
  for (const m of (lvl.machines || [])){
    if (m.used) continue;
    if (Math.abs(p.cx - (m.x + m.w/2)) < 66) G.nearMachine = m;
  }
  if (G.nearMachine && (pressed('interact') || (isTouch && Math.abs(p.cx - (G.nearMachine.x + G.nearMachine.w/2)) < 40))){
    G.nearMachine.used = true;
    G.score += 400; FX.flash = .12; AudioR.chime();
    toast('FAHRKARTE GEZOGEN — 02:43');
    ring(G.nearMachine.x + 22, G.nearMachine.y + 30, '#ffc63a', 60);
  }

  // NPC-Interaktion
  G.nearNpc = null;
  for (const n of lvl.npcs){
    if (Math.abs(p.cx - n.x) < 90 && !G.dialog) G.nearNpc = n;
  }
  if (G.nearNpc && (pressed('interact') || (isTouch && Math.abs(p.cx - G.nearNpc.x) < 46))) openDialog(G.nearNpc.name, G.nearNpc.lines);

  camFollow(p, dt, lvl);
  updateFX(dt);
  updateHUD();
}

function gameOver(){
  G.playing = false; G.scene = 'end';
  AudioR.stopAmbient();
  const ov = document.getElementById('endOv');
  document.getElementById('endTitle').innerHTML = 'GAME <span>OVER</span>';
  document.getElementById('endSub').textContent = G.activeLevel.def.tag;
  document.getElementById('endText').textContent =
    'Die Nacht ist vorbei — für diesmal. Noch einmal von vorn? Die Straße wartet nicht, aber sie läuft auch nicht weg.';
  document.getElementById('btnNext').style.display = 'none';
  ov.classList.add('on');
  document.getElementById('hud').classList.remove('on');
}

function endLevel(win){
  if (!win) return gameOver();
  G.playing = false; G.scene = 'end';
  AudioR.stopAmbient();
  const isLast = G.levelIndex >= LEVELS.length - 1;
  const ov = document.getElementById('endOv');
  document.getElementById('endTitle').innerHTML = isLast ? 'DIE STADT <span>HÖRT ZU</span>' : 'CHAPTER <span>CLEAR</span>';
  document.getElementById('endSub').textContent = G.activeLevel.def.name + ' · ' + G.activeLevel.def.time;
  document.getElementById('endText').textContent = isLast
    ? 'Der Saal ist still. 214 Zeilen, und eine Frau aus der Hein-Hoyer-Straße, die sie vorgelesen hat. Draußen scheint die Sonne — das erste Mal in dieser Nacht.'
    : 'Kapitel geschafft. Die nächste Station wartet: ' + (LEVELS[G.levelIndex+1]?.name || '—') + '.';
  if (G.activeLevel.def.script === 'lastTrain'){
    document.getElementById('endTitle').innerHTML = 'NEXT <span>STOP</span>';
    document.getElementById('endText').textContent =
      'Die Türen schließen sich hinter dir. Der Zug rollt an, das Licht im Wagen ist zu hell für 02:43. ' +
      'Zwei Sitze weiter liegt eine Fahrkarte, die auf deinen Namen ausgestellt ist — und ein Zettel: „Steig in Altona um.“';
  }
  document.getElementById('btnNext').style.display = isLast ? 'none' : 'inline-block';
  ov.classList.add('on');
  document.getElementById('hud').classList.remove('on');
  document.getElementById('bossbar').classList.remove('on');
}

/* =========================================================
   ZEICHNEN
   ========================================================= */
function hexA(hex, a){
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

function cityLayer(off, baseY, color, seed, sc, opts = {}){
  const pal = opts.pal || LEVELS[0].pal;
  const minH = opts.minH ?? 40, maxH = opts.maxH ?? 150;
  let x = -((off*sc) % 260) - 40;
  let s = seed;
  const rand = () => { s = (s*9301 + 49297) % 233280; return s/233280; };
  while (x < VW + 260){
    const w = 38 + rand()*86;
    const h = minH + rand()*maxH;
    const top = baseY - h;
    ctx.fillStyle = color;
    ctx.fillRect(x, top, w, h);
    // Dachkante mit Rim-Light
    ctx.fillStyle = hexA(pal.glow2, .22);
    ctx.fillRect(x, top, w, 1.5);
    // Fenster
    for (let wy = top + 10; wy < baseY - 8; wy += 13){
      for (let wx = x + 6; wx < x + w - 9; wx += 12){
        const lit = ((wx*7 + wy*13 + seed) % 7) < 2;
        ctx.fillStyle = lit ? hexA(pal.glow, .30) : 'rgba(255,255,255,.035)';
        ctx.fillRect(wx, wy, 4, 5);
      }
    }
    // Antenne / Aufbau
    if (rand() > .72){
      ctx.fillStyle = color;
      ctx.fillRect(x + w*.4, top - 16, 3, 16);
      ctx.fillStyle = hexA('#ff3b5c', .8);
      ctx.fillRect(x + w*.4, top - 18, 3, 3);
    }
    x += w + 8 + rand()*14;
  }
}
