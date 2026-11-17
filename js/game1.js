
/* =========================================================
   HAMBURG NIGHT RUN — Engine
   ========================================================= */
'use strict';
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d', { alpha:false });
const VW = 960, VH = 540;
let VIEW = { s:1, ox:0, oy:0 };

function resize(){
  const w = innerWidth, h = innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cvs.width = Math.max(1, Math.floor(w * dpr));
  cvs.height = Math.max(1, Math.floor(h * dpr));
  const s = Math.min(w / VW, h / VH);
  VIEW = { s, ox:(w - VW*s)/2, oy:(h - VH*s)/2, dpr, w, h };
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
resize();

const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const lerp  = (a,b,t) => a + (b-a)*t;
const rnd   = (a=0,b=1) => a + Math.random()*(b-a);
const rndi  = (a,b) => Math.floor(rnd(a,b+1));
const sign  = v => v < 0 ? -1 : 1;
const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
const now = () => performance.now()/1000;

/* ---------------- Input ---------------- */
const KEYMAP = {
  ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right',
  ArrowUp:'jump', KeyW:'jump', Space:'jump', KeyZ:'jump',
  ArrowDown:'slide', KeyS:'slide',
  KeyJ:'punch', KeyK:'kick', KeyL:'heavy', KeyU:'special',
  ShiftLeft:'dash', ShiftRight:'dash', KeyX:'dash',
  KeyE:'interact', KeyR:'restart', Escape:'pause', KeyP:'pause'
};
const raw = {}, held = {}, prev = {};
for (const k of ['left','right','jump','slide','punch','kick','heavy','special','dash','interact','pause']) {
  raw[k] = false; held[k] = false; prev[k] = false;
}
addEventListener('keydown', e => {
  const k = KEYMAP[e.code];
  if (k){ raw[k] = true; if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault(); }
  if (!AudioR.on) AudioR.unlock();
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) raw[k] = false; });
addEventListener('blur', () => { for (const k in raw) raw[k] = false; });

// Touch buttons
const touchWrap = document.getElementById('touch');
document.querySelectorAll('.tbtn').forEach(btn => {
  const k = btn.dataset.k;
  const on  = e => { e.preventDefault(); raw[k] = true; btn.classList.add('act'); if (!AudioR.on) AudioR.unlock(); };
  const off = e => { e.preventDefault(); raw[k] = false; btn.classList.remove('act'); };
  btn.addEventListener('pointerdown', on);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointercancel', off);
  btn.addEventListener('pointerleave', off);
  btn.addEventListener('contextmenu', e => e.preventDefault());
});
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouch) touchWrap.classList.add('on');

function pollInput(){
  for (const k in raw){ prev[k] = held[k]; held[k] = raw[k]; }
}
const pressed = k => held[k] && !prev[k];
const P = {
  get left(){return held.left}, get right(){return held.right},
  get jump(){return pressed('jump')}, get jumpHeld(){return held.jump},
  get slide(){return held.slide}, get punch(){return pressed('punch')},
  get kick(){return pressed('kick')}, get heavy(){return pressed('heavy')},
  get special(){return pressed('special')}, get dash(){return pressed('dash')}
};

/* ---------------- Audio (synthetisch, keine Assets) ---------------- */
const AudioR = {
  on:false, ac:null, ambient:null, master:null, vol:0.7,
  unlock(){
    try{
      this.ac = this.ac || new (window.AudioContext || window.webkitAudioContext)();
      if (this.ac.state === 'suspended') this.ac.resume();
      if (!this.master){
        this.master = this.ac.createGain();
        this.master.gain.value = this.vol;
        this.master.connect(this.ac.destination);
      }
      this.master.gain.value = this.vol;
      this.on = true;
    }catch(e){ this.on = false; }
  },
  setVol(v){ this.vol = clamp(v, 0, 1); if (this.master) this.master.gain.value = this.vol; },
  blip(freq=220, dur=.08, type='square', vol=.05, slide=0){
    if (!this.on || !this.ac) return;
    const t = this.ac.currentTime;
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide), t+dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0008, t+dur);
    o.connect(g); g.connect(this.master || this.ac.destination);
    o.start(t); o.stop(t+dur+.02);
  },
  hit(){ this.blip(140,.07,'square',.05,-70); },
  heavy(){ this.blip(90,.13,'sawtooth',.06,-50); },
  jump(){ this.blip(420,.07,'triangle',.03,180); },
  hurt(){ this.blip(180,.16,'sawtooth',.06,-110); },
  pick(){ this.blip(760,.09,'sine',.05,320); },
  ko(){ this.blip(70,.35,'sine',.09,-40); },
  /* --- Bahnsteig-Atmosphäre --- */
  startAmbient(){
    if (!this.on || !this.ac || this.ambient) return;
    try{
      const ac = this.ac;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate*2), ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i=0;i<d.length;i++) d[i] = (Math.random()*2-1)*.4;
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
      const g = ac.createGain(); g.gain.value = .05;
      src.connect(lp); lp.connect(g); g.connect(this.master || ac.destination); src.start();
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 51;
      const og = ac.createGain(); og.gain.value = .028;
      o.connect(og); og.connect(this.master || ac.destination); o.start();
      this.ambient = { src, o };
    }catch(e){ this.ambient = null; }
  },
  stopAmbient(){
    try{ if (!this.ambient) return; this.ambient.src.stop(); this.ambient.o.stop(); }
    catch(e){}
    this.ambient = null;
  },
  rumble(dur=.9, vol=.09){
    if (!this.on || !this.ac) return;
    try{
      const ac = this.ac, n = Math.floor(ac.sampleRate*dur);
      const buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      for (let i=0;i<n;i++) d[i] = (Math.random()*2-1) * (1 - i/n) * .8;
      const src = ac.createBufferSource(); src.buffer = buf;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240;
      const g = ac.createGain();
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + dur);
      src.connect(lp); lp.connect(g); g.connect(ac.destination); src.start();
    }catch(e){}
  },
  chime(){ this.blip(880,.12,'sine',.05,0); setTimeout(() => this.blip(1174,.16,'sine',.05,0), 170); },
  announce(){ this.blip(620,.1,'square',.03,0); setTimeout(() => this.blip(468,.14,'square',.03,-40), 180); }
};

/* ---------------- Effekte ---------------- */
const FX = { parts:[], shake:0, hitstop:0, flash:0, rings:[] };
function spark(x,y,n=8,col='#ffd0ea',spd=260){
  for (let i=0;i<n;i++){
    const a = rnd(0,Math.PI*2), v = rnd(spd*.3, spd);
    FX.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,life:rnd(.16,.42),t:0,col,size:rnd(1.5,3.5)});
  }
}
function ring(x,y,col='#ff2e88',max=60){ FX.rings.push({x,y,t:0,life:.34,max,col}); }
function shake(v){ FX.shake = Math.max(FX.shake, v); }
function hitstop(v){ FX.hitstop = Math.max(FX.hitstop, v); }
function updateFX(dt){
  for (let i=FX.parts.length-1;i>=0;i--){
    const p = FX.parts[i]; p.t += dt;
    if (p.t >= p.life){ FX.parts.splice(i,1); continue; }
    p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 900*dt; p.vx *= .96;
  }
  for (let i=FX.rings.length-1;i>=0;i--){
    const r = FX.rings[i]; r.t += dt; if (r.t >= r.life) FX.rings.splice(i,1);
  }
  FX.shake = Math.max(0, FX.shake - dt*46);
  FX.flash = Math.max(0, FX.flash - dt*3.4);
}
function drawFX(){
  for (const p of FX.parts){
    const a = 1 - p.t/p.life;
    ctx.globalAlpha = a; ctx.fillStyle = p.col;
    ctx.fillRect(p.x-p.size/2, p.y-p.size/2, p.size, p.size);
  }
  for (const r of FX.rings){
    const k = r.t/r.life;
    ctx.globalAlpha = (1-k)*.8; ctx.strokeStyle = r.col; ctx.lineWidth = 3*(1-k)+1;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.max*k, 0, Math.PI*2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* ---------------- Kamera ---------------- */
const cam = { x:0, y:0, tx:0, ty:0, look:0 };
function camFollow(p, dt, level){
  const T = G.activeLevel && G.activeLevel.train;
  if (T && T.phase === 'intro'){
    const t = T.t;
    let want;
    if (t < 1.3) want = lerp(0, 600, t/1.3);
    else if (t < 2.4) want = lerp(600, 960, (t-1.3)/1.1);
    else want = lerp(960, p.x + p.w/2 - VW*.42, clamp((t-2.4)/1.0, 0, 1));
    cam.x = lerp(cam.x, clamp(want, 0, Math.max(0, level.length - VW)), 1 - Math.pow(.02, dt));
    cam.y = lerp(cam.y, 0, 1 - Math.pow(.01, dt));
    return;
  }
  const target = p.x + p.w/2 + p.face*70 - VW*0.42;
  cam.tx = clamp(target, 0, Math.max(0, level.length - VW));
  cam.ty = clamp(p.y - VH*0.58, -220, Math.max(0, level.height - VH));
  cam.x = lerp(cam.x, cam.tx, 1 - Math.pow(.001, dt));
  cam.y = lerp(cam.y, cam.ty, 1 - Math.pow(.004, dt));
}
const camShakeX = () => (Math.random()-.5) * FX.shake;
const camShakeY = () => (Math.random()-.5) * FX.shake;

/* ---------------- Spielzustand ---------------- */
const G = {
  scene:'menu',        // menu | play | pause | end
  char:'mira',
  levelIndex:0,
  time:0,
  score:0,
  combo:0, comboT:0,
  playing:false,
  activeLevel:null,
  player:null,
  enemies:[], items:[], breakables:[], npcs:[], props:[], triggers:[],
  gate:null,
  boss:null,
  msg:null
};

/* =========================================================
   LEVEL-BAUKASTEN
   ========================================================= */
const GY = 430, GH = 190;
const plat  = (x,y,w,h=18) => ({x,y,w,h,type:'solid'});
const one   = (x,y,w)      => ({x,y,w,h:14,type:'oneway'});
const ramp  = (x,y,w,h,dir=1) => ({x,y,w,h,type:'ramp',dir});
const gr    = (x,w)        => ({x,y:GY,w,h:GH,type:'solid',ground:true});
const mover = (x,y,w,ax=0,ay=0,sp=.5,ph=0) => ({x,y,w,h:16,type:'move',ox:x,oy:y,ax,ay,sp,ph});
const crate = (x,y=GY-36)  => ({x,y,w:32,h:36,hp:2,type:'crate'});
const spike = (x,w=34,y=GY-10) => ({x,y,w,h:10,type:'spike'});
const bench  = (x) => ({x, y:GY-34, w:78, h:34, type:'oneway', bench:true});
const bin    = (x) => ({x, y:GY-46, w:26, h:46, hp:2, broken:false, kind:'bin'});
const ticket = (x) => ({x, y:GY-78, w:44, h:78, used:false, kind:'ticket'});

const LEVELS = [
  /* 1 — REEPERBAHN */
  {
    name:'REEPERBAHN', tag:'LEVEL 1 — ST. PAULI', time:'02:17',
    pal:{ sky:['#1a0a2e','#4a0f4e'], far:'#2a0b3d', mid:'#1b0728', near:'#12051d', glow:'#ff2e88', glow2:'#39e6ff', rain:true },
    length:3300, start:{x:90,y:GY-60},
    ground:[[0,900],[960,760],[1780,700],[2540,760]],
    plats:[
      plat(520,330,150), one(700,270,110), plat(880,300,120),
      one(1120,330,130), plat(1300,250,140), one(1500,200,120), plat(1660,320,110),
      plat(1900,340,160), ramp(2100,GY,180,60,-1), one(2320,280,130),
      plat(2600,320,150), one(2820,260,120), plat(2960,340,180)
    ],
    crates:[crate(430),crate(462),crate(1080),crate(1990),crate(2700)],
    enemies:[
      {x:640,type:'grunt'},{x:820,type:'grunt'},{x:1000,type:'runner'},
      {x:1240,type:'grunt'},{x:1420,type:'blocker'},{x:1600,type:'runner'},
      {x:1860,type:'heavy'},{x:2000,type:'grunt'},{x:2120,type:'dodger'},
      {x:2400,type:'grunt'},{x:2540,type:'runner'},{x:2760,type:'elite'}
    ],
    arenas:[
      {x1:1050,x2:1420,wave:['grunt','runner','grunt']},
      {x1:2050,x2:2420,wave:['blocker','grunt','dodger']},
      {x1:2700,x2:3050,wave:['heavy','runner','elite']}
    ],
    npcs:[{x:300,name:'ROLFI',lines:['Drei Jungs in Schwarz, wie eine Katze, die ein Auto hört.','Das sind keine Bösen. Die sind bezahlt.']}],
    items:[{x:560,y:296,kind:'crown'},{x:1340,y:216,kind:'crown'},{x:1520,y:166,kind:'heart'},{x:2340,y:246,kind:'crown'}],
    boss:{name:'D-NICE — REEPERBAHN RATS',type:'brute',x:3120,hp:70}
  },
  /* 2 — U-BAHN · LAST TRAIN */
  {
    name:'U-BAHN — LAST TRAIN', tag:'LEVEL 2 — U4 · 02:43', time:'02:43',
    pal:{ sky:['#0b0420','#2a0b46'], far:'#150a26', mid:'#0f0620', near:'#08040f', glow:'#c66bff', glow2:'#39e6ff', rain:false, station:true },
    length:3400, start:{x:70,y:GY-60},
    script:'lastTrain',
    train:{ stopX:2020, doorOff:330, enterX:4180 },
    ground:[[0,3400]],
    plats:[
      bench(300), bench(980), bench(2180), bench(3080),
      ramp(1180,GY-60,110,60,-1), plat(1290,GY-60,320),
      ramp(1610,GY-140,90,80,-1), plat(1700,GY-140,300),
      one(1150,GY-170,120), plat(620,GY-130,110), one(840,GY-190,120)
    ],
    bins:[bin(430),bin(1060),bin(2320),bin(3160)],
    machines:[ticket(700),ticket(2900)],
    crates:[crate(560),crate(1520),crate(2660)],
    enemies:[],
    arenas:[],
    npcs:[{x:600,name:'JULE',lines:['Letzter Zug 02:43. Danach fährt hier nur noch die Kälte.','Fünf Mann sind gerade die Treppe runter. Keiner hat eine Karte.','Der mit der Weste? Der gehört nicht zur Bahn. Der gehört zu niemandem.']}],
    items:[{x:520,y:GY-40,kind:'crown'},{x:1330,y:GY-40,kind:'heart'},{x:1760,y:GY-40,kind:'crown'},{x:2760,y:GY-40,kind:'crown'}],
    boss:{name:'THE PLATFORM ENFORCER',type:'enforcer',x:2400,hp:80,scripted:true}
  },
  /* 3 — U-BAHN (U3) */
  {
    name:'U-BAHN', tag:'LEVEL 3 — U3', time:'03:40',
    pal:{ sky:['#04101c','#0b2b3e'], far:'#08202f', mid:'#061520', near:'#040d14', glow:'#39e6ff', glow2:'#ff2e88', rain:false },
    length:3400, start:{x:80,y:GY-60},
    ground:[[0,820],[900,520],[1500,600],[2200,1200]],
    plats:[
      mover(980,320,110,0,60,.9,0), mover(1180,320,110,0,60,.9,1.6), mover(1380,320,110,0,60,.9,3.1),
      plat(1620,300,140), one(1800,240,120), plat(1960,320,130),
      plat(2320,330,160), plat(2560,260,140), one(2740,200,130),
      plat(2900,300,150), plat(3080,360,120)
    ],
    hazards:[spike(1250,110,GY-10), spike(1700,120,GY-10), spike(2500,140,GY-10)],
    crates:[crate(700),crate(1740),crate(2620)],
    enemies:[
      {x:560,type:'grunt'},{x:760,type:'runner'},{x:1000,type:'grunt'},
      {x:1300,type:'heavy'},{x:1600,type:'dodger'},
      {x:1880,type:'runner'},{x:2010,type:'blocker'},
      {x:2360,type:'grunt'},{x:2500,type:'runner'},{x:2700,type:'elite'}
    ],
    arenas:[
      {x1:1180,x2:1520,wave:['runner','grunt','runner']},
      {x1:2280,x2:2650,wave:['heavy','dodger','blocker']}
    ],
    npcs:[{x:420,name:'ADELE',lines:['Zwei Kameras. Drei Bahnhöfe.','Er ist nicht in den Zug. Er ist am Gleis lang.']}],
    items:[{x:1200,y:270,kind:'crown'},{x:1830,y:206,kind:'heart'},{x:2580,y:226,kind:'crown'}],
    boss:{name:'THE BAG SNATCHER',type:'rusher',x:3220,hp:96}
  },
  /* 3 — ST. PAULI */
  {
    name:'ST. PAULI', tag:'LEVEL 4 — HINTERHÖFE', time:'04:20',
    pal:{ sky:['#180a26','#3a0b46'], far:'#230b34', mid:'#150720', near:'#0b0412', glow:'#ff2e88', glow2:'#a24bff', rain:true },
    length:3500, start:{x:80,y:GY-60},
    ground:[[0,700],[800,900],[1780,820],[2680,820]],
    plats:[
      one(480,330,120), plat(620,270,130), one(790,350,110),
      plat(930,320,140), one(1120,250,120), plat(1280,300,130), plat(1460,230,140),
      one(1660,320,120), plat(1820,280,150), one(2020,210,130),
      plat(2200,300,140), ramp(2400,GY,200,40,1), plat(2620,270,150), one(2830,200,120),
      plat(3000,320,160), plat(3180,260,140)
    ],
    crates:[crate(380),crate(1000),crate(1560),crate(2300),crate(2960)],
    enemies:[
      {x:520,type:'grunt'},{x:700,type:'runner'},{x:880,type:'grunt'},
      {x:1050,type:'dodger'},{x:1250,type:'heavy'},{x:1450,type:'runner'},
      {x:1650,type:'blocker'},{x:1850,type:'elite'},{x:2050,type:'grunt'},
      {x:2250,type:'runner'},{x:2450,type:'heavy'},{x:2650,type:'grunt'},
      {x:2850,type:'dodger'},{x:3050,type:'elite'}
    ],
    arenas:[
      {x1:1150,x2:1560,wave:['dodger','grunt','heavy']},
      {x1:1900,x2:2300,wave:['blocker','runner','elite']},
      {x1:2950,x2:3300,wave:['heavy','dodger','elite']}
    ],
    npcs:[{x:260,name:'BIBI',lines:['Ich hab keine Wahl, sagt irgendwie jeder in meiner Akte. Ich hatte einfach Hunger.']}],
    items:[{x:640,y:236,kind:'crown'},{x:1300,y:266,kind:'crown'},{x:1480,y:196,kind:'heart'},{x:2040,y:176,kind:'crown'},{x:3190,y:226,kind:'crown'}],
    boss:{name:'DIE RATS — ENDKAMPF',type:'duelist',x:3360,hp:110}
  },
  /* 4 — ALTONA */
  {
    name:'ALTONA', tag:'LEVEL 5 — OTTENSEN', time:'22:50',
    pal:{ sky:['#120c1e','#3b2214'], far:'#241a2e', mid:'#171225', near:'#0b0814', glow:'#ffb347', glow2:'#ff6bb5', rain:false },
    length:3600, start:{x:80,y:GY-60},
    ground:[[0,760],[860,540],[1500,1000],[2600,1000]],
    plats:[
      ramp(300,GY,240,50,1), plat(600,320,130), one(760,250,120),
      plat(980,300,140), ramp(1160,300,180,60,1), plat(1400,240,150),
      one(1600,320,130), plat(1780,280,160), one(2000,210,140),
      plat(2200,260,150), ramp(2420,GY,200,44,-1), plat(2680,300,140),
      one(2880,230,120), plat(3040,290,160), plat(3220,220,150)
    ],
    crates:[crate(520),crate(1080),crate(1860),crate(2320),crate(3120)],
    enemies:[
      {x:600,type:'grunt'},{x:900,type:'runner'},{x:1150,type:'heavy'},
      {x:1350,type:'elite'},{x:1650,type:'dodger'},{x:1850,type:'grunt'},
      {x:2100,type:'blocker'},{x:2350,type:'heavy'},{x:2550,type:'runner'},
      {x:2750,type:'elite'},{x:3000,type:'dodger'},{x:3200,type:'heavy'}
    ],
    arenas:[
      {x1:1600,x2:2000,wave:['elite','heavy','grunt']},
      {x1:2400,x2:2800,wave:['blocker','dodger','runner']},
      {x1:3150,x2:3450,wave:['elite','elite']}
    ],
    npcs:[{x:300,name:'HERR JAHNKE',lines:['Ich war auf dieser Beerdigung. Es war ein kleiner Sarg.','So schreibt man nur, wenn man sich verabschiedet.']}],
    items:[{x:780,y:216,kind:'heart'},{x:1420,y:206,kind:'crown'},{x:2020,y:176,kind:'crown'},{x:3240,y:186,kind:'crown'}],
    boss:{name:'TAREK — SICHERHEITSDIENST',type:'duelist',x:3480,hp:130}
  },
  /* 5 — ST. GEORG */
  {
    name:'ST. GEORG', tag:'LEVEL 6 — STEINDAMM', time:'00:15',
    pal:{ sky:['#1c0713','#4a0b1e'], far:'#2a0a1a', mid:'#190510', near:'#0d0309', glow:'#ff3b5c', glow2:'#39e6ff', rain:true },
    length:3700, start:{x:80,y:GY-60},
    ground:[[0,680],[780,880],[1760,900],[2760,940]],
    plats:[
      one(420,330,110), plat(560,280,120), one(720,220,110),
      plat(900,300,130), ramp(1080,GY,200,50,1), plat(1340,240,140),
      one(1540,320,120), plat(1700,280,150), one(1900,200,130), plat(2060,260,140),
      plat(2300,320,140), one(2500,250,120), plat(2660,300,150),
      plat(2900,260,150), one(3100,190,130), plat(3280,280,160)
    ],
    crates:[crate(360),crate(980),crate(1580),crate(2380),crate(2860),crate(3180)],
    enemies:[
      {x:560,type:'runner'},{x:880,type:'grunt'},{x:1080,type:'dodger'},
      {x:1300,type:'heavy'},{x:1500,type:'elite'},{x:1750,type:'grunt'},
      {x:1950,type:'runner'},{x:2100,type:'blocker'},{x:2350,type:'heavy'},
      {x:2550,type:'elite'},{x:2750,type:'dodger'},{x:2950,type:'grunt'},
      {x:3100,type:'runner'},{x:3300,type:'elite'}
    ],
    arenas:[
      {x1:1400,x2:1800,wave:['heavy','dodger','runner','grunt']},
      {x1:2350,x2:2750,wave:['blocker','elite','heavy']},
      {x1:3100,x2:3500,wave:['elite','runner','elite']}
    ],
    npcs:[{x:250,name:'FRAU BADE',lines:['Jeden Monat ein Umschlag. Er hat gesagt, du kommst von allein.']}],
    items:[{x:580,y:246,kind:'crown'},{x:1360,y:206,kind:'heart'},{x:2080,y:226,kind:'crown'},{x:3120,y:156,kind:'crown'}],
    boss:{name:'VIKTOR SALL — 1. BEGEGNUNG',type:'rusher',x:3580,hp:150}
  },
  /* 6 — HAFENCITY */
  {
    name:'HAFENCITY', tag:'LEVEL 7 — KRANE', time:'03:05',
    pal:{ sky:['#050f1c','#123a55'], far:'#0a2236', mid:'#071624', near:'#030a12', glow:'#39e6ff', glow2:'#78a6ff', rain:false, wind:38 },
    length:3800, start:{x:80,y:GY-60},
    ground:[[0,640],[760,380],[1220,320],[1620,560],[2260,420],[2760,1040]],
    plats:[
      mover(700,300,120,0,0,0), plat(860,320,120), mover(1050,280,110,90,0,.6,0),
      plat(1240,240,120), one(1400,180,120), plat(1560,280,130),
      mover(1740,240,110,0,70,.7,1.5), plat(1920,320,120), plat(2080,240,130),
      one(2240,170,120), plat(2380,270,140), mover(2560,220,110,80,0,.8,2.2),
      plat(2720,300,130), plat(2900,230,150), one(3100,160,130), plat(3280,260,160),
      plat(3480,320,150)
    ],
    crates:[crate(300),crate(980),crate(1980),crate(2860),crate(3400)],
    enemies:[
      {x:520,type:'runner'},{x:880,type:'grunt'},{x:1060,type:'dodger'},
      {x:1280,type:'heavy'},{x:1500,type:'elite'},{x:1740,type:'runner'},
      {x:1980,type:'blocker'},{x:2160,type:'grunt'},{x:2400,type:'heavy'},
      {x:2620,type:'elite'},{x:2820,type:'dodger'},{x:3020,type:'runner'},
      {x:3240,type:'heavy'},{x:3440,type:'elite'}
    ],
    arenas:[
      {x1:1650,x2:2050,wave:['heavy','dodger','grunt']},
      {x1:2400,x2:2800,wave:['elite','blocker','runner']},
      {x1:3200,x2:3600,wave:['elite','heavy','elite']}
    ],
    npcs:[{x:220,name:'ADELE',lines:['Meine Dienstnummer steht auf einer Anmeldung, die ich nicht geschrieben habe.']}],
    items:[{x:1450,y:146,kind:'crown'},{x:2260,y:136,kind:'heart'},{x:3120,y:126,kind:'crown'},{x:3300,y:226,kind:'crown'}],
    boss:{name:'SIKKERHETSDIENST — ELITETRUPP',type:'brute',x:3680,hp:170}
  },
  /* 7 — SPEICHERSTADT */
  {
    name:'SPEICHERSTADT', tag:'LEVEL 8 — HHA 4-17', time:'04:45',
    pal:{ sky:['#0a0710','#2a1a10'], far:'#1a1210', mid:'#100c0a', near:'#060405', glow:'#ffb347', glow2:'#ff6bb5', rain:false, dark:.82 },
    length:3900, start:{x:80,y:GY-60},
    ground:[[0,620],[720,420],[1240,360],[1700,600],[2400,400],[2900,1000]],
    plats:[
      plat(560,330,120), one(700,270,110), plat(860,300,130),
      mover(1040,260,110,70,0,.7,0), plat(1220,320,120), one(1380,250,120),
      plat(1540,280,130), plat(1720,220,140), one(1920,320,120),
      plat(2100,270,140), mover(2280,230,110,0,60,.8,1.2), plat(2440,310,130),
      one(2620,240,120), plat(2780,290,140), plat(2960,230,150),
      one(3160,170,130), plat(3320,260,160), plat(3520,320,150)
    ],
    crates:[crate(420),crate(940),crate(1760),crate(2500),crate(3380)],
    enemies:[
      {x:520,type:'grunt'},{x:800,type:'heavy'},{x:1000,type:'dodger'},
      {x:1200,type:'elite'},{x:1450,type:'runner'},{x:1650,type:'blocker'},
      {x:1850,type:'heavy'},{x:2050,type:'elite'},{x:2250,type:'dodger'},
      {x:2450,type:'grunt'},{x:2650,type:'runner'},{x:2850,type:'heavy'},
      {x:3050,type:'elite'},{x:3300,type:'dodger'},{x:3500,type:'elite'}
    ],
    arenas:[
      {x1:1900,x2:2300,wave:['heavy','elite','dodger']},
      {x1:2600,x2:3000,wave:['blocker','heavy','runner']},
      {x1:3300,x2:3700,wave:['elite','elite','heavy']}
    ],
    npcs:[{x:240,name:'CEM',lines:['Verbrenn es. Du bist mehr wert als 214 Zeilen.']}],
    items:[{x:600,y:296,kind:'crown'},{x:1740,y:186,kind:'heart'},{x:2980,y:196,kind:'crown'},{x:3180,y:136,kind:'crown'}],
    boss:{name:'VIKTOR SALL — DER LETZTE GANG',type:'duelist',x:3780,hp:190}
  },
  /* 8 — RATHAUS */
  {
    name:'RATHAUS', tag:'LEVEL 9 — FINALE', time:'09:30',
    pal:{ sky:['#2a1a2e','#7a4a2a'], far:'#3a2a34', mid:'#241820', near:'#120c10', glow:'#ffc63a', glow2:'#ff2e88', rain:false },
    length:4000, start:{x:80,y:GY-60},
    ground:[[0,700],[820,900],[1800,860],[2720,1280]],
    plats:[
      ramp(320,GY,220,44,1), plat(600,330,130), one(760,260,120),
      plat(920,300,140), plat(1100,230,150), one(1300,320,120), plat(1460,270,150),
      plat(1700,320,140), one(1880,250,130), plat(2040,290,150),
      plat(2260,230,140), one(2460,300,120), plat(2620,260,150),
      plat(2860,300,160), one(3060,230,130), plat(3240,270,160), plat(3440,320,150)
    ],
    crates:[crate(500),crate(1000),crate(1900),crate(2760),crate(3300)],
    enemies:[
      {x:560,type:'elite'},{x:800,type:'heavy'},{x:1000,type:'elite'},
      {x:1200,type:'dodger'},{x:1400,type:'elite'},{x:1600,type:'heavy'},
      {x:1850,type:'elite'},{x:2050,type:'runner'},{x:2250,type:'heavy'},
      {x:2450,type:'elite'},{x:2650,type:'dodger'},{x:2850,type:'heavy'},
      {x:3050,type:'elite'},{x:3250,type:'elite'}
    ],
    arenas:[
      {x1:1100,x2:1500,wave:['elite','heavy','elite']},
      {x1:2050,x2:2450,wave:['heavy','elite','dodger']},
      {x1:2900,x2:3300,wave:['elite','elite','heavy']}
    ],
    npcs:[{x:200,name:'ADELE',lines:['Meine Nummer steht auf dieser Anmeldung. Ich habe sie nicht geschrieben.']}],
    items:[{x:1120,y:196,kind:'crown'},{x:2470,y:266,kind:'heart'},{x:3080,y:196,kind:'crown'},{x:3460,y:286,kind:'crown'}],
    boss:{name:'KONRAD ALBRECHT — MERIDIAN NORD',type:'boss',x:3820,hp:210}
  }
];
