/* =========================================================
   PHYSIK / KOLLISION
   ========================================================= */
const GRAV = 1900;
function rampY(p, e){
  if (p.type !== 'ramp') return p.y;
  const t = clamp((e.x + e.w/2 - p.x) / p.w, 0, 1);
  return p.dir > 0 ? p.y + p.h*t : p.y + p.h*(1-t);
}
function collideWorld(e, lvl, dt){
  const solids = lvl.solids;
  e.onGround = false;
  // horizontal
  e.x += e.vx * dt;
  for (const p of solids){
    if (p.type !== 'solid') continue;
    if (!overlap(e, p)) continue;
    if (e.vx > 0){ e.x = p.x - e.w; e.vx = 0; }
    else if (e.vx < 0){ e.x = p.x + p.w; e.vx = 0; }
  }
  // vertical
  const prevBottom = e.y + e.h;
  e.y += e.vy * dt;
  for (const p of lvl.solids){
    if (!overlap(e, p)) continue;
    if (p.type === 'oneway'){
      const top = p.y;
      if (e.vy >= 0 && prevBottom <= top + 6 && !e.dropThrough){
        e.y = top - e.h; e.vy = 0; e.onGround = true;
      }
      continue;
    }
    if (p.type === 'ramp'){
      const sy = rampY(p, e);
      if (e.vy >= 0 && prevBottom <= sy + 14){
        e.y = sy - e.h; e.vy = 0; e.onGround = true;
      }
      continue;
    }
    if (e.vy > 0){ e.y = p.y - e.h; e.vy = 0; e.onGround = true; }
    else if (e.vy < 0){ e.y = p.y + p.h; e.vy = 0; }
  }
  // ramp-Stand auch ohne Volltreffer
  if (!e.onGround){
    for (const p of lvl.solids){
      if (p.type !== 'ramp') continue;
      if (e.x + e.w < p.x || e.x > p.x + p.w) continue;
      const sy = rampY(p, e);
      const bottom = e.y + e.h;
      if (bottom >= sy - 2 && bottom <= sy + 26 && e.vy >= 0){
        e.y = sy - e.h; e.vy = 0; e.onGround = true;
      }
    }
  }
  e.x = clamp(e.x, 0, lvl.length - e.w);
}

/* =========================================================
   ANGRIFFE
   ========================================================= */
const ATTACKS = {
  punch1 : {dur:.24, hx:18, hy:-40, hw:44, hh:26, dmg:7,  kb:130, hs:.045, sh:2,   freeze:.09, next:'punch2', chain:.36, sfx:'light'},
  punch2 : {dur:.26, hx:20, hy:-38, hw:48, hh:28, dmg:8,  kb:160, hs:.05,  sh:2.5, freeze:.09, next:'kick',   chain:.38, sfx:'light'},
  kick   : {dur:.34, hx:24, hy:-38, hw:58, hh:26, dmg:13, kb:250, hs:.07,  sh:4,   freeze:.16, next:'heavy',  chain:.42, sfx:'mid'},
  heavy  : {dur:.52, hx:20, hy:-48, hw:66, hh:46, dmg:22, kb:380, hs:.1,   sh:7,   freeze:.3,  next:null,     chain:.5,  sfx:'heavy', launch:-330},
  kick2  : {dur:.30, hx:22, hy:-34, hw:60, hh:40, dmg:14, kb:280, hs:.07,  sh:4.5, freeze:.16, next:null,     chain:.4,  sfx:'mid', launch:-190},
  airkick: {dur:.40, hx:14, hy:-18, hw:58, hh:44, dmg:16, kb:300, hs:.08,  sh:4.5, freeze:.2,  next:null,     chain:.4,  sfx:'mid', launch:-140, air:true},
  airpunch:{dur:.28, hx:16, hy:-30, hw:46, hh:30, dmg:10, kb:180, hs:.05,  sh:2,   freeze:.12, next:null,     chain:.3,  sfx:'light', air:true},
  dashpunch:{dur:.34,hx:22, hy:-40, hw:66, hh:40, dmg:18, kb:340, hs:.09,  sh:5,   freeze:.24, next:null,     chain:.4,  sfx:'heavy', launch:-260},
  slide  : {dur:.52, hx:6,  hy:-20, hw:62, hh:20, dmg:12, kb:220, hs:.06,  sh:3,   freeze:.14, next:null,     chain:.3,  sfx:'light', low:true},
  special: {dur:.66, hx:0,  hy:-56, hw:96, hh:80, dmg:10, kb:300, hs:.06,  sh:6,   freeze:.1,  next:null,     chain:.6,  sfx:'heavy', multi:3, launch:-220}
};

/* =========================================================
   SPIELER
   ========================================================= */
class Player {
  constructor(x, y, char){
    this.char = char || 'mira';
    this.w = 34; this.h = 68;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.face = 1;
    this.state = 'idle';
    this.t = 0; this.anim = 0;
    this.maxHp = 5; this.hp = 5;
    this.onGround = false; this.jumps = 0; this.coyote = 0;
    this.atk = null; this.atkT = 0; this.hits = null; this.buf = null; this.bufT = 0;
    this.invuln = 0; this.hurtT = 0; this.dashT = 0; this.dashCd = 0; this.spCd = 0;
    this.slideT = 0; this.dropThrough = false;
    this.dmgMul = this.char === 'kai' ? 1.3 : 1;
    this.speed = this.char === 'kai' ? 232 : 268;
    this.jumpV = this.char === 'kai' ? -648 : -672;
    this.comboChain = 0;
  }
  get box(){ return { x:this.x, y:this.y, w:this.w, h:this.h }; }
  get cx(){ return this.x + this.w/2; }
  get cy(){ return this.y + this.h/2; }

  startAttack(name){
    const a = ATTACKS[name];
    this.state = 'attack'; this.atk = a; this.atkName = name; this.atkT = 0; this.hits = new Set();
    this.hitDone = false; this.multiDone = 0;
    this.vx *= .25;
    if (name === 'slide'){ this.slideT = a.dur; }
    AudioR.blip(name === 'heavy' || name === 'special' ? 150 : 300, .05, 'square', .025, -80);
    return true;
  }

  takeAttackInput(){
    const canAir = !this.onGround;
    if (P.punch){
      if (this.state === 'dash') return this.startAttack('dashpunch');
      if (canAir) return this.startAttack('airpunch');
      return this.startAttack(this.comboChain >= 1 ? 'punch2' : 'punch1');
    }
    if (P.kick){
      if (canAir) return this.startAttack('airkick');
      return this.startAttack(this.comboChain >= 2 ? 'kick2' : 'kick');
    }
    if (P.heavy){
      if (canAir) return this.startAttack('airkick');
      return this.startAttack('heavy');
    }
    if (P.special && this.spCd <= 0){ this.spCd = 2.2; return this.startAttack('special'); }
    return false;
  }

  update(dt, lvl){
    this.t += dt;
    this.anim += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.spCd  = Math.max(0, this.spCd - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    this.bufT   = Math.max(0, this.bufT - dt);
    if (this.comboChain > 0 && this.state === 'idle') this.comboChain = Math.max(0, this.comboChain - dt*1.6);

    /* --- Treffer-Reaktion --- */
    if (this.state === 'hurt'){
      this.hurtT -= dt;
      this.vx *= .9;
      collideWorld(this, lvl, dt);
      if (this.hurtT <= 0) this.state = 'idle';
      return;
    }

    /* --- Dash --- */
    if (this.state === 'dash'){
      this.dashT -= dt;
      this.vx = this.face * 720;
      this.vy *= .2;
      collideWorld(this, lvl, dt);
      FX.parts.push({x:this.cx,y:this.y+this.h*.6,vx:rnd(-40,40),vy:rnd(-30,10),life:.26,t:0,col:'#39e6ff',size:rnd(2,4)});
      if (this.atk) this.updateAttack(dt);
      else if (P.punch || P.kick) this.startAttack('dashpunch');
      if (this.dashT <= 0 && this.state === 'dash') this.state = this.onGround ? 'idle' : 'fall';
      return;
    }

    /* --- Angriff --- */
    if (this.state === 'attack'){
      if (!this.onGround) this.vy = Math.min(this.vy + GRAV*dt*.75, 900);
      else this.vy += GRAV*dt;
      this.updateAttack(dt);
      collideWorld(this, lvl, dt);
      return;
    }

    /* --- Bewegung --- */
    const dir = (P.right?1:0) - (P.left?1:0);
    const targetVx = dir * this.speed;
    const accel = this.onGround ? 14 : 6;
    this.vx = lerp(this.vx, targetVx, clamp(accel*dt, 0, 1));
    if (dir) this.face = dir;

    // Springen (mit Coyote-Time und Doppelsprung)
    if (P.jump){
      if (this.onGround || this.coyote > 0){
        this.vy = this.jumpV; this.jumps = 1; this.onGround = false; this.coyote = 0;
        AudioR.jump(); spark(this.cx, this.y+this.h, 5, '#8f7fff', 120);
      } else if (this.jumps < 2){
        this.vy = this.jumpV*.92; this.jumps = 2;
        AudioR.blip(520,.07,'triangle',.03,150); ring(this.cx, this.y+this.h*.6, '#39e6ff', 46);
      }
    }
    // Rutschen
    if (P.slide && this.onGround && this.dashCd <= 0){
      this.dashCd = .7; this.startAttack('slide');
      this.vx = this.face * 420;
      collideWorld(this, lvl, dt);
      return;
    }
    // Dash
    if (P.dash && this.dashCd <= 0){
      this.state = 'dash'; this.dashT = .18; this.dashCd = .55; this.invuln = Math.max(this.invuln,.16);
      AudioR.blip(640,.06,'sawtooth',.025,-200);
      this.takeAttackInput();
      return;
    }
    // Angriffe
    if (this.takeAttackInput()){
      collideWorld(this, lvl, dt);
      return;
    }

    // Schwerkraft
    this.vy += GRAV * dt;
    if (this.vy > 1200) this.vy = 1200;
    const wasGround = this.onGround;
    collideWorld(this, lvl, dt);
    if (wasGround && !this.onGround && this.vy >= 0 && !P.jump) this.coyote = .1;
    if (this.onGround){ this.jumps = 0; this.state = Math.abs(this.vx) > 30 ? 'run' : 'idle'; }
    else this.state = this.vy < 0 ? 'jump' : 'fall';
    this.dropThrough = P.slide && !this.onGround;
  }

  updateAttack(dt){
    this.atkT += dt;
    const a = this.atk;
    // aktive Trefferphase
    const active = this.atkT > (a.multi ? .12 : .055) && this.atkT < (a.multi ? .56 : .22);
    if (active) this.doHits(a);
    if (this.onGround && a === ATTACKS.slide) this.vx *= .94;
    if (this.atkT >= a.dur){
      this.state = this.onGround ? 'idle' : 'fall';
      const nxt = this.buf;
      this.buf = null;
      if (nxt && ATTACKS[nxt]) this.startAttack(nxt);
      else this.atk = null;
    }
    // Puffern
    if (P.punch){ this.buf = a.next || null; this.bufT = .2; }
    else if (P.kick) this.buf = a.next === 'heavy' ? 'heavy' : (a.next || null);
    else if (P.heavy && a.next) this.buf = 'heavy';
  }

  doHits(a){
    const hb = {
      x: this.face > 0 ? this.x + a.hx : this.x + this.w - a.hx - a.hw,
      y: this.y + this.h + a.hy + (a.air ? 0 : 0),
      w: a.hw, h: a.hh
    };
    // Multi-Hit (Special): neue Trefferliste alle 0.15 s
    if (a.multi){
      const slot = Math.floor((this.atkT - .1) / .15);
      if (slot !== this.multiDone){ this.multiDone = slot; this.hits = new Set(); }
      if (!a.multiFx){ a.multiFx = true; ring(this.cx + this.face*40, this.cy, '#ff2e88', 78); }
    }
    let connected = false;
    const list = G.activeLevel ? G.activeLevel.enemies : [];
    for (const e of list){
      if (e.dead || this.hits.has(e.id)) continue;
      if (!overlap(hb, e.box)) continue;
      this.hits.add(e.id);
      connected = true;
      const dmg = Math.round(a.dmg * this.dmgMul * (a.multi ? 1 : 1));
      const kbv = a.kb * (this.char === 'kai' ? 1.15 : 1);
      e.damage(dmg, this.face, kbv, a.launch || 0);
      spark(hb.x + hb.w/2, hb.y + hb.h/2, a.multi ? 5 : 9, '#ffe0f0', a.multi ? 200 : 330);
      if (!a.multi) ring(hb.x + hb.w/2, hb.y + hb.h/2, '#ff2e88', 46 + a.sh*4);
      hitstop(a.freeze); shake(a.sh); FX.flash = Math.min(.35, FX.flash + .12);
      a.sfx === 'heavy' ? AudioR.heavy() : AudioR.hit();
      G.combo++; G.comboT = 1.5;
      G.score += dmg * 10 * (1 + Math.min(G.combo,20)*.05);
      if (a.launch) e.vy = a.launch;
    }
    if (connected && this.atk) this.comboChain = Math.min(3, this.comboChain + 1);
  }

  hurt(dmg, dir){
    if (this.invuln > 0 || this.state === 'dash') return false;
    this.hp -= dmg;
    this.comboChain = 0;
    G.combo = 0; G.comboT = 0;
    this.state = 'hurt'; this.hurtT = .34; this.invuln = .9;
    this.vx = dir * 230; this.vy = -240;
    shake(6); FX.flash = .3; hitstop(.06); AudioR.hurt();
    spark(this.cx, this.cy, 12, '#ff5a7a', 260);
    if (this.hp <= 0){ this.hp = 0; return true; }
    return false;
  }

  /* ---------------- Zeichnen ---------------- */
  draw(){
    const kai = this.char === 'kai';
    const p = { skin: kai ? '#c98b62' : '#b07a52', top: kai ? '#c9d6e6' : '#1b1226',
                pants: '#14101c', accent: kai ? '#e23b3b' : '#ffffff', hair:'#1a0f14' };
    const f = this.face;
    const x = this.x, y = this.y, w = this.w, h = this.h;
    const runPhase = Math.sin(this.anim * 14);
    const moving = (this.state === 'run');
    const bob = moving ? Math.abs(runPhase) * 2 : Math.sin(this.anim*3)*1.2;
    const air = !this.onGround;

    ctx.save();
    // Schatten
    ctx.globalAlpha = .35; ctx.fillStyle = '#000';
    ctx.fillRect(x-2, y+h-4, w+4, 5);
    ctx.globalAlpha = 1;
    // Silhouette / Rim-Light (Lesbarkeit vor Neon)
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(x-2, y+4, w+4, h-4);
    ctx.fillStyle = this.char === 'kai' ? 'rgba(57,230,255,.18)' : 'rgba(255,107,181,.20)';
    ctx.fillRect(x + (f>0? w-2 : 0), y+8, 2, h-16);

    // Beine
    const legY = y + h - 26 - (air ? 3 : 0);
    const legSwing = moving ? runPhase * 7 : (air ? 6 : 0);
    ctx.fillStyle = p.pants;
    ctx.fillRect(x + 5, legY, 8, 20 + legSwing*.3);
    ctx.fillRect(x + w - 13, legY, 8, 20 - legSwing*.3);
    // Sneakers
    ctx.fillStyle = '#f2f2f5';
    ctx.fillRect(x + 3 + (moving?legSwing*.4:0), legY + 20 + legSwing*.3, 12, 6);
    ctx.fillRect(x + w - 15 - (moving?legSwing*.4:0), legY + 20 - legSwing*.3, 12, 6);

    // Körper
    const bodyY = y + 20 + bob*.3;
    ctx.fillStyle = p.top;
    ctx.fillRect(x + 4, bodyY, w - 8, 26);
    if (!kai){
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 4, bodyY + 1, w - 8, 3);
      ctx.fillRect(x + 4, bodyY + 22, w - 8, 4);
    } else {
      ctx.fillStyle = p.accent;
      ctx.fillRect(x + 4, bodyY + 20, w - 8, 4);
    }

    // Arme
    ctx.fillStyle = p.skin;
    const armSwing = moving ? -runPhase * 6 : (this.state === 'attack' ? -10 : 0);
    ctx.fillRect(x + 1, bodyY + 4 + armSwing*.4, 6, 18);
    ctx.fillRect(x + w - 7, bodyY + 4 - armSwing*.4, 6, 18);

    // Kopf
    const headY = y + 6 + bob*.2;
    ctx.fillStyle = p.skin;
    ctx.fillRect(x + 8, headY, 15, 15);
    // Haare
    ctx.fillStyle = p.hair;
    ctx.fillRect(x + 7, headY - 3, 17, 7);
    if (!kai){
      // Pferdeschwanz
      const sway = Math.sin(this.anim*6)*2;
      ctx.fillRect(x + (f>0? 4 : 22), headY - 1 + sway, 4, 16);
      ctx.fillRect(x + (f>0? 2 : 24), headY + 10 + sway, 4, 9);
      // Creolen
      ctx.strokeStyle = '#ffc63a'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(x + (f>0?19:12), headY + 12, 3, 0, Math.PI*2); ctx.stroke();
    } else {
      ctx.fillRect(x + 7, headY - 4, 17, 5);
    }
    // Augen
    ctx.fillStyle = '#0a0508';
    ctx.fillRect(x + (f>0? 17 : 10), headY + 7, 4, 2);

    // Angriffs-Swoosh
    if (this.state === 'attack' && this.atk){
      const a = this.atk;
      const prog = clamp(this.atkT / a.dur, 0, 1);
      ctx.globalAlpha = (1 - prog) * .85;
      ctx.strokeStyle = a.dmg > 15 ? '#ff2e88' : '#c9f7ff';
      ctx.lineWidth = a.dmg > 15 ? 5 : 3;
      ctx.beginPath();
      const cx = x + w/2, cy = y + h*.55;
      if (a.multi){
        ctx.arc(cx, cy, 30 + prog*44, 0, Math.PI*2);
      } else {
        ctx.arc(cx + f*10, cy - 6, 26 + prog*22, -0.9 + (f>0?0:Math.PI), 0.9 + (f>0?0:Math.PI));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Unverwundbarkeits-Blinken
    if (this.invuln > 0 && Math.floor(this.invuln*18) % 2 === 0){
      ctx.globalAlpha = .45; ctx.fillStyle = '#fff';
      ctx.fillRect(x-2, y-2, w+4, h+4); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}

/* =========================================================
   GEGNER
   ========================================================= */
const ETYPES = {
  grunt  : {hp:34, speed:100, w:30, h:58, dmg:1, range:46, cd:1.25, windup:.34, col:'#5a3a7a', accent:'#ff2e88', name:'RAT'},
  runner : {hp:26, speed:168, w:28, h:56, dmg:1, range:42, cd:.85,  windup:.22, col:'#3a2a5a', accent:'#39e6ff', name:'RUNNER'},
  heavy  : {hp:78, speed:70,  w:38, h:68, dmg:2, range:54, cd:1.6,  windup:.52, col:'#4a2436', accent:'#ffb347', name:'HEAVY'},
  blocker: {hp:52, speed:84,  w:32, h:60, dmg:1, range:48, cd:1.4,  windup:.4,  col:'#2f3a52', accent:'#9df3ff', name:'BLOCKER', block:.42},
  dodger : {hp:32, speed:138, w:28, h:56, dmg:1, range:44, cd:1.0,  windup:.26, col:'#4a1f4f', accent:'#ff6bb5', name:'DODGER', dodge:.38},
  elite  : {hp:64, speed:126, w:32, h:62, dmg:2, range:50, cd:.95,  windup:.3,  col:'#2a1a44', accent:'#ff2e88', name:'ELITE', block:.2, dodge:.2},
  brute  : {hp:70, speed:82,  w:42, h:70, dmg:2, range:58, cd:1.35, windup:.5,  col:'#3b1a2c', accent:'#ff2e88', name:'BOSS', boss:true},
  rusher : {hp:96, speed:150, w:34, h:64, dmg:2, range:50, cd:.8,   windup:.24, col:'#1d1630', accent:'#39e6ff', name:'BOSS', boss:true, dash:.3},
  duelist: {hp:110, speed:120, w:34, h:64, dmg:2, range:52, cd:.9,  windup:.26, col:'#2a2233', accent:'#ffc63a', name:'BOSS', boss:true, block:.45, dodge:.25},
  boss   : {hp:210, speed:110, w:36, h:66, dmg:2, range:54, cd:.85, windup:.28, col:'#1a1526', accent:'#ffc63a', name:'BOSS', boss:true, block:.35, dodge:.2, dash:.25},
  enforcer:{hp:80, speed:104, w:60, h:100, dmg:2, range:80, cd:1.2, windup:.42, col:'#1b1330', accent:'#39e6ff', name:'BOSS', boss:true}
};
let ENEMY_ID = 1;

class Enemy {
  constructor(x, type, opts = {}){
    const t = ETYPES[type] || ETYPES.grunt;
    this.type = type; this.t = t;
    this.w = t.w; this.h = t.h;
    this.x = x; this.y = GY - this.h - 2;
    this.vx = 0; this.vy = 0; this.face = -1;
    this.hp = opts.hp || t.hp; this.maxHp = this.hp;
    this.state = 'idle'; this.timer = rnd(.2,.9);
    this.cd = rnd(.3,1); this.anim = rnd(0,3); this.id = ENEMY_ID++;
    this.hurtT = 0; this.dead = false; this.onGround = false;
    this.boss = !!t.boss; this.name = opts.name || t.name;
    this.phase = 0; this.spawnX = x; this.aggro = false;
    this.dropChance = opts.drop ?? (this.boss ? 1 : .18);
    this.hitFlash = 0;
  }
  get box(){ return { x:this.x, y:this.y, w:this.w, h:this.h }; }
  get cx(){ return this.x + this.w/2; }

  damage(dmg, dir, kb, launch){
    if (this.dead) return;
    const blocking = this.state === 'block';
    const real = blocking ? Math.max(1, Math.round(dmg*.22)) : dmg;
    this.hp -= real;
    this.hitFlash = .12;
    this.face = -dir || 1;
    if (blocking){
      spark(this.cx - dir*10, this.y + this.h*.5, 5, '#9df3ff', 160);
      this.vx = dir * kb * .25;
      AudioR.blip(720,.05,'square',.03,-120);
    } else {
      this.state = 'hurt'; this.hurtT = .26;
      this.vx = dir * kb; this.vy = launch || -60;
      this.aggro = true;
    }
    if (this.hp <= 0) this.die();
  }
  die(){
    this.dead = true; this.hp = 0;
    spark(this.cx, this.y + this.h/2, 20, this.t.accent, 420);
    ring(this.cx, this.y + this.h/2, this.t.accent, 90);
    shake(this.boss ? 14 : 5); AudioR.ko();
    G.score += this.boss ? 2500 : 150;
    if (Math.random() < this.dropChance){
      G.items.push({ x:this.cx-10, y:this.y+this.h-30, w:20, h:20, kind:'heart', vy:-120, taken:false });
    }
    if (this.boss){
      G.boss = null;
      document.getElementById('bossbar').classList.remove('on');
      setTimeout(() => { if (G.scene === 'play') endLevel(true); }, 800);
    }
  }

  update(dt, lvl, p){
    if (this.dead) return;
    this.anim += dt; this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.hurtT > 0){
      this.hurtT -= dt;
      this.vx *= .88;
      this.vy += GRAV*dt;
      collideWorld(this, lvl, dt);
      if (this.hurtT <= 0) this.state = 'idle';
      return;
    }

    const dx = p.cx - this.cx, adx = Math.abs(dx);
    if (adx < 520) this.aggro = true;
    this.cd = Math.max(0, this.cd - dt);

    if (this.boss && this.hp < this.maxHp*.5 && this.phase === 0){ this.phase = 1; ring(this.cx, this.y+this.h/2, this.t.accent, 120); shake(8); }
    if (this.boss && this.hp < this.maxHp*.22 && this.phase === 1){ this.phase = 2; ring(this.cx, this.y+this.h/2, '#ff2e88', 150); shake(12); }

    if (this.state === 'attack'){
      this.timer -= dt;
      this.vx *= .92;
      this.vy += GRAV*dt;
      collideWorld(this, lvl, dt);
      // Trefferfenster
      const wu = this.t.windup * (this.phase >= 1 ? .8 : 1);
      if (this.timer < 0 && !this.didHit){
        this.didHit = true;
        const hb = { x:this.face>0 ? this.x+this.w-6 : this.x-this.t.range+14, y:this.y+12, w:this.t.range, h:this.h-12 };
        if (overlap(hb, p.box)) p.hurt(this.t.dmg, this.face > 0 ? 1 : -1);
        if (this.boss) { spark(hb.x+hb.w/2, hb.y+hb.h/2, 8, this.t.accent, 200); shake(3); }
      }
      if (this.timer < -.28){ this.state = 'idle'; this.cd = this.t.cd * (this.phase>=2?.6:1); this.didHit = false; }
      return;
    }

    if (this.state === 'block'){
      this.timer -= dt;
      this.vx *= .8;
      collideWorld(this, lvl, dt);
      if (this.timer <= 0) this.state = 'idle';
      return;
    }

    if (!this.aggro || adx > 900){
      // leichte Patrouille
      this.vx = lerp(this.vx, Math.sin(this.anim*.7) * 22, .1);
      this.vy += GRAV*dt; collideWorld(this, lvl, dt);
      return;
    }

    this.face = dx > 0 ? 1 : -1;

    // Blocken gegen nahende Angriffe
    if (this.t.block && p.state === 'attack' && adx < this.t.range + 26 && Math.random() < dt*7){
      this.state = 'block'; this.timer = .5; return;
    }
    // Ausweichen
    if (this.t.dodge && p.state === 'attack' && adx < this.t.range + 30 && this.cd <= 0 && Math.random() < this.t.dodge){
      this.vx = -this.face * 260; this.vy = -180; this.cd = .8; return;
    }
    // Boss-Dash
    if (this.boss && this.t.dash && this.cd <= 0 && adx > 130 && adx < 420 && Math.random() < dt*2.2){
      this.vx = this.face * 620; this.cd = 1.6; spark(this.cx, this.y+this.h, 10, this.t.accent, 240);
      return;
    }

    if (adx < this.t.range && this.cd <= 0 && Math.abs(p.y - this.y) < 70){
      this.state = 'attack'; this.timer = this.t.windup * (this.phase>=1?.8:1);
      this.didHit = false; this.vx = 0;
      return;
    }

    // Annäherung
    const spd = this.t.speed * (this.phase>=1?1.18:1);
    if (adx > this.t.range * .8){
      this.vx = lerp(this.vx, this.face * spd, .12);
    } else {
      this.vx *= .85;
    }
    this.vy += GRAV*dt;
    collideWorld(this, lvl, dt);
    // nicht in den Abgrund laufen
    if (this.onGround && this.x < 20) this.vx = Math.abs(this.vx);
  }

  draw(){
    if (this.dead) return;
    const t = this.t, x = this.x, y = this.y, w = this.w, h = this.h;
    const f = this.face;
    const walk = Math.sin(this.anim * (this.state === 'attack' ? 4 : 9));
    ctx.save();
    ctx.globalAlpha = .3; ctx.fillStyle = '#000'; ctx.fillRect(x-2, y+h-4, w+4, 5); ctx.globalAlpha = 1;
    const col = this.hitFlash > 0 ? '#ffffff' : t.col;
    // Beine
    ctx.fillStyle = '#100b16';
    ctx.fillRect(x+4, y+h-24, 8, 22 + (this.onGround?walk*2:0));
    ctx.fillRect(x+w-12, y+h-24, 8, 22 - (this.onGround?walk*2:0));
    // Körper
    ctx.fillStyle = col;
    ctx.fillRect(x+3, y+16, w-6, h-38);
    // Kapuze / Kopf
    ctx.fillStyle = this.boss ? '#0d0913' : col;
    ctx.fillRect(x+5, y+2, w-10, 18);
    ctx.fillStyle = '#0a0508';
    ctx.fillRect(x + (f>0? w-12 : 8), y+10, 5, 3);
    // Akzent
    ctx.fillStyle = t.accent;
    ctx.fillRect(x+3, y+16, w-6, 3);
    if (this.boss){
      ctx.fillRect(x+3, y+16, 4, h-38);
      ctx.fillStyle = t.accent;
      ctx.fillRect(x + w/2 - 2, y - 8, 4, 8);
    }
    // Angriffstelegraph
    if (this.state === 'attack'){
      const k = clamp(1 - this.timer / (this.t.windup || .3), 0, 1);
      ctx.globalAlpha = .35 + k*.55;
      ctx.strokeStyle = t.accent; ctx.lineWidth = 2 + k*2;
      const r = 22 + k*10;
      ctx.beginPath();
      ctx.arc(x + w/2 + f*10, y + h*.55, r, f > 0 ? -1.1 : 2.0, f > 0 ? 1.1 : 4.3);
      ctx.stroke();
      ctx.globalAlpha = .18 + k*.35; ctx.fillStyle = t.accent;
      ctx.beginPath(); ctx.arc(x + w/2 + f*10, y + h*.55, r, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Blockanzeige
    if (this.state === 'block'){
      ctx.strokeStyle = '#9df3ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x+w/2, y+h*.45, w*.8, -1.1, 1.1); ctx.stroke();
    }
    // HP-Balken (nicht bei Bossen, die haben oben einen)
    if (!this.boss && this.hp < this.maxHp){
      const bw = w + 6;
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x-3, y-10, bw, 4);
      ctx.fillStyle = t.accent; ctx.fillRect(x-3, y-10, bw * (this.hp/this.maxHp), 4);
    }
    ctx.restore();
  }
}
