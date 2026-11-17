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

/* ---------------- U-BAHN-BAHNSTEIG ---------------- */
function drawStationSky(pal){
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#07030f');
  g.addColorStop(.5, pal.sky[1]);
  g.addColorStop(1, '#05020b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  const hg = ctx.createRadialGradient(VW*.5, 300, 40, VW*.5, 300, 620);
  hg.addColorStop(0, hexA('#c66bff', .16));
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, 0, VW, VH);
}

function drawStationWorld(lvl){
  const T = lvl.train || { lights:1, doors:0, phase:'idle' };
  const x0 = cam.x - 100, x1 = cam.x + VW + 100;
  const wallTop = GY - 420;

  // Wand mit Fliesen
  const g = ctx.createLinearGradient(0, wallTop, 0, GY);
  g.addColorStop(0, '#150a26'); g.addColorStop(.52, '#1e0d36'); g.addColorStop(1, '#0a0514');
  ctx.fillStyle = g; ctx.fillRect(x0, wallTop, x1 - x0, GY - wallTop);
  ctx.strokeStyle = 'rgba(140,105,190,.12)'; ctx.lineWidth = 1;
  for (let x = Math.floor(x0/46)*46; x < x1; x += 46){
    ctx.beginPath(); ctx.moveTo(x, wallTop); ctx.lineTo(x, GY); ctx.stroke();
  }
  for (let y = wallTop; y < GY; y += 32){
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  }
  // Grünspan / Flecken
  ctx.fillStyle = 'rgba(48,86,74,.13)';
  for (let x = Math.floor(x0/210)*210; x < x1; x += 210){
    ctx.fillRect(x + 30, GY - 150, 60, 22);
    ctx.fillRect(x + 120, GY - 96, 44, 16);
  }

  // Graffiti
  const tags = [
    {x:180, t:'U4', c:'#ff2e88', s:42},
    {x:760, t:'HFC', c:'#39e6ff', s:30},
    {x:1240, t:'NO SLEEP', c:'#c66bff', s:20},
    {x:2080, t:'MIRA', c:'#ffc63a', s:32},
    {x:2860, t:'214', c:'#ff2e88', s:38}
  ];
  for (const tg of tags){
    if (tg.x < x0 - 200 || tg.x > x1 + 200) continue;
    ctx.save();
    ctx.translate(tg.x, GY - 210); ctx.rotate(-.06);
    ctx.globalAlpha = .5; ctx.font = 'bold ' + tg.s + 'px Impact,"Trebuchet MS",sans-serif';
    ctx.fillStyle = tg.c; ctx.fillText(tg.t, 0, 0);
    ctx.globalAlpha = .22; ctx.fillStyle = '#fff'; ctx.fillText(tg.t, -2, -2);
    ctx.restore();
  }

  // Decke + Rohre
  ctx.fillStyle = '#08040f'; ctx.fillRect(x0, wallTop, x1 - x0, 58);
  ctx.strokeStyle = 'rgba(198,107,255,.22)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x0, wallTop + 34); ctx.lineTo(x1, wallTop + 34); ctx.stroke();
  ctx.strokeStyle = 'rgba(57,230,255,.14)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, wallTop + 48); ctx.lineTo(x1, wallTop + 48); ctx.stroke();

  // Stützen
  for (let x = Math.floor(x0/330)*330; x < x1; x += 330){
    ctx.fillStyle = '#120a20'; ctx.fillRect(x, wallTop + 40, 26, GY - wallTop - 40);
    ctx.fillStyle = 'rgba(198,107,255,.35)'; ctx.fillRect(x + 22, wallTop + 60, 3, GY - wallTop - 80);
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x, wallTop + 40, 26, 3);
  }

  // Leuchtstoffröhren (flackern, werden bei Einfahrt heller)
  for (let i = 0; i < 16; i++){
    const lx = 120 + i * 250;
    if (lx < x0 - 120 || lx > x1 + 120) continue;
    const flick = (Math.sin(G.time * 11 + i * 2.7) > -.72) ? 1 : .28;
    const bright = (.34 + (T.lights || 0) * .66) * flick;
    const ly = wallTop + 92;
    ctx.globalAlpha = bright * .5;
    const rg = ctx.createRadialGradient(lx + 60, ly + 8, 4, lx + 60, ly + 8, 130);
    rg.addColorStop(0, 'rgba(215,240,255,.55)');
    rg.addColorStop(1, 'rgba(140,200,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(lx - 80, ly - 130, 280, 280);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b0614'; ctx.fillRect(lx - 8, ly - 12, 136, 14);
    ctx.fillStyle = 'rgba(198,107,255,.18)'; ctx.fillRect(lx - 8, ly - 12, 136, 3);
    ctx.fillStyle = bright > .6 ? '#e8fbff' : '#9fb6c8';
    ctx.fillRect(lx, ly, 120, 7);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(lx, ly + 7, 120, 5);
    ctx.fillStyle = 'rgba(57,230,255,' + (bright * .5) + ')'; ctx.fillRect(lx, ly + 1, 120, 2);
  }

  // Bahnsteigschild
  ctx.fillStyle = 'rgba(8,4,16,.85)'; ctx.fillRect(256, GY - 300, 190, 46);
  ctx.strokeStyle = 'rgba(57,230,255,.4)'; ctx.lineWidth = 2; ctx.strokeRect(257, GY - 299, 188, 44);
  ctx.fillStyle = '#39e6ff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
  ctx.fillText('U4 · HAFENCITY', 268, GY - 280);
  ctx.fillStyle = '#c9f7ff'; ctx.font = 'bold 9px monospace';
  ctx.fillText('UNIVERSITÄT — BAHNSTEIG 2', 268, GY - 264);

  // Abfahrtsanzeige
  drawStationDisplay(1450, GY - 300, T);

  // Uhr
  const cx = 2180, cy = GY - 276;
  ctx.fillStyle = '#0a0514'; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,198,58,.5)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = '#ffc63a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 6, cy - 9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 12, cy - 4); ctx.stroke();

  // Tunnelmund rechts
  ctx.fillStyle = '#040108';
  ctx.fillRect(lvl.length - 170, wallTop + 30, 200, GY - wallTop - 30);
  const tg2 = ctx.createLinearGradient(lvl.length - 260, 0, lvl.length - 150, 0);
  tg2.addColorStop(0, 'rgba(4,1,8,0)'); tg2.addColorStop(1, 'rgba(4,1,8,1)');
  ctx.fillStyle = tg2; ctx.fillRect(lvl.length - 264, wallTop + 30, 120, GY - wallTop - 30);

  // Sicherheitslinie am Bahnsteig
  ctx.fillStyle = 'rgba(255,198,58,.72)'; ctx.fillRect(x0, GY - 8, x1 - x0, 5);
  ctx.fillStyle = 'rgba(255,198,58,.18)'; ctx.fillRect(x0, GY - 14, x1 - x0, 5);
}

function drawStationDisplay(x, y, T){
  const arriving = ['arrive','doors','fight','board','into'].includes(T.phase);
  const blink = !arriving || Math.floor(G.time * 4) % 2 === 0;
  ctx.strokeStyle = '#2a1a3e'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 26, y - 52); ctx.lineTo(x + 26, y);
  ctx.moveTo(x + 174, y - 52); ctx.lineTo(x + 174, y);
  ctx.stroke();
  ctx.fillStyle = '#08040f'; ctx.fillRect(x, y, 200, 58);
  ctx.strokeStyle = 'rgba(255,198,58,.45)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, 198, 56);
  ctx.fillStyle = 'rgba(255,198,58,.08)'; ctx.fillRect(x + 6, y + 6, 188, 46);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,198,58,.75)'; ctx.font = 'bold 8px monospace';
  ctx.fillText('NÄCHSTER ZUG', x + 12, y + 20);
  ctx.fillStyle = 'rgba(255,198,58,.38)'; ctx.font = 'bold 8px monospace';
  ctx.fillText('RICHTUNG NIENDORF', x + 12, y + 48);
  ctx.textAlign = 'right';
  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = arriving ? (blink ? '#ff2e88' : '#ff8ac4') : '#ffc63a';
  ctx.fillText(arriving ? 'EINFAHRT' : '02:43', x + 188, y + 34);
  ctx.textAlign = 'left';
}

function drawBench(s){
  const x = s.x, y = s.y;
  ctx.fillStyle = 'rgba(57,230,255,.16)';
  ctx.fillRect(x - 2, y + s.h + 4, s.w + 4, 6);
  ctx.fillStyle = '#2a1c14'; ctx.fillRect(x, y + 6, s.w, 8);
  ctx.fillStyle = '#3b2718'; ctx.fillRect(x + 2, y + 16, s.w - 4, 7);
  ctx.fillStyle = '#4a3120'; ctx.fillRect(x + 2, y + 25, s.w - 4, 5);
  ctx.fillStyle = '#0b0712';
  ctx.fillRect(x + 6, y + 30, 6, s.h - 28);
  ctx.fillRect(x + s.w - 12, y + 30, 6, s.h - 28);
  ctx.fillStyle = 'rgba(198,107,255,.45)'; ctx.fillRect(x, y + 5, s.w, 2);
}

function drawBin(b){
  if (b.broken){
    ctx.fillStyle = '#1c2430'; ctx.fillRect(b.x - 10, b.y + b.h - 12, 44, 12);
    ctx.fillStyle = 'rgba(57,230,255,.3)'; ctx.fillRect(b.x - 10, b.y + b.h - 12, 44, 2);
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(b.x - 2, b.y + b.h - 4, b.w + 4, 4);
  ctx.fillStyle = '#1b2634'; ctx.fillRect(b.x, b.y + 8, b.w, b.h - 8);
  ctx.fillStyle = '#26374a'; ctx.fillRect(b.x - 3, b.y, b.w + 6, 9);
  ctx.fillStyle = 'rgba(57,230,255,.45)'; ctx.fillRect(b.x, b.y + 14, b.w, 2);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.strokeRect(b.x + .5, b.y + 8.5, b.w - 1, b.h - 10);
}

function drawMachine(m){
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(m.x - 3, m.y + m.h - 5, m.w + 6, 5);
  ctx.fillStyle = '#0e0a1a'; ctx.fillRect(m.x, m.y, m.w, m.h);
  ctx.strokeStyle = 'rgba(198,107,255,.45)'; ctx.lineWidth = 2; ctx.strokeRect(m.x + 1, m.y + 1, m.w - 2, m.h - 2);
  const on = m.used ? '#39e6ff' : '#ff2e88';
  ctx.fillStyle = on; ctx.globalAlpha = .8;
  ctx.fillRect(m.x + 6, m.y + 10, m.w - 12, 22);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#05030a'; ctx.fillRect(m.x + 8, m.y + 12, m.w - 16, 18);
  ctx.fillStyle = on; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
  ctx.fillText(m.used ? 'OK' : '02:43', m.x + m.w/2, m.y + 24);
  ctx.fillText('FAHRKARTE', m.x + m.w/2, m.y + 60);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1b1228'; ctx.fillRect(m.x + 8, m.y + 40, m.w - 16, 6);
  ctx.fillStyle = 'rgba(255,198,58,.5)'; ctx.fillRect(m.x + 10, m.y + 68, m.w - 20, 3);
  if (G.nearMachine === m){
    ctx.fillStyle = 'rgba(57,230,255,.9)'; ctx.fillRect(m.x + m.w/2 - 9, m.y - 24, 18, 15);
    ctx.fillStyle = '#04101c'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    ctx.fillText('E', m.x + m.w/2, m.y - 12);
    ctx.textAlign = 'left';
  }
}

function drawTrainDoor(T, dx){
  const top = GY - 152, hh = 148;
  // Innenlicht
  ctx.fillStyle = '#0a0714'; ctx.fillRect(dx, top, 64, hh);
  const g = ctx.createLinearGradient(0, top, 0, top + hh);
  g.addColorStop(0, 'rgba(190,235,255,' + (.18 + T.doors*.4) + ')');
  g.addColorStop(.5, 'rgba(120,190,240,' + (.08 + T.doors*.22) + ')');
  g.addColorStop(1, 'rgba(255,235,190,' + (.16 + T.doors*.44) + ')');
  ctx.fillStyle = g; ctx.fillRect(dx, top, 64, hh);
  ctx.fillStyle = 'rgba(255,255,255,' + (.14 + T.doors*.35) + ')';
  ctx.fillRect(dx + 6, top + 44, 52, 3);
  ctx.fillStyle = 'rgba(52,34,88,' + (.45 + T.doors*.45) + ')';
  ctx.fillRect(dx + 5, top + hh - 42, 22, 15);
  ctx.fillRect(dx + 38, top + hh - 42, 21, 15);
  // Türen schieben sich auf
  const slide = T.doors * 30;
  ctx.fillStyle = '#100a1c';
  const pw = 32 - T.doors * 30.5;
  ctx.fillRect(dx - slide, top, Math.max(1.5, pw), hh);
  ctx.fillRect(dx + 32 + slide, top, Math.max(1.5, pw), hh);
  // Rahmen
  ctx.strokeStyle = 'rgba(198,107,255,.7)'; ctx.lineWidth = 2;
  ctx.strokeRect(dx - 2, top - 2, 68, hh + 4);
  // Licht auf den Bahnsteig
  if (T.doors > .1){
    const lg = ctx.createLinearGradient(0, GY - 20, 0, GY + 40);
    lg.addColorStop(0, 'rgba(255,240,200,' + (T.doors*.5) + ')');
    lg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = lg; ctx.fillRect(dx - 26, GY - 16, 116, 60);
  }
}

function drawTrain(lvl){
  const T = lvl.train;
  if (!T) return;
  if (!['arrive','doors','fight','board','into'].includes(T.phase)) return;
  const top = GY - 186, bot = GY - 4, carW = 400, gap = 12;
  ctx.save();
  // Schatten / Gleisbett
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(T.trainX - 120, GY - 26, 2300, 30);
  for (let c = 0; c < 5; c++){
    const x = T.trainX + c * (carW + gap);
    const grad = ctx.createLinearGradient(0, top, 0, bot);
    grad.addColorStop(0, '#2a1850');
    grad.addColorStop(.45, '#1a0f2e');
    grad.addColorStop(1, '#0a0616');
    ctx.fillStyle = grad; ctx.fillRect(x, top, carW, bot - top);
    // Dach
    ctx.fillStyle = '#3d2a66'; ctx.fillRect(x, top, carW, 9);
    ctx.fillStyle = 'rgba(198,107,255,.55)'; ctx.fillRect(x, top + 9, carW, 2);
    // Fensterband
    for (let w2 = 0; w2 < 5; w2++){
      const wx = x + 26 + w2 * 74;
      const lit = ((c * 5 + w2) % 7) !== 3;
      ctx.fillStyle = lit ? 'rgba(57,230,255,.20)' : 'rgba(8,5,14,.92)';
      ctx.fillRect(wx, top + 42, 58, 44);
      if (lit){ ctx.fillStyle = 'rgba(255,255,255,.09)'; ctx.fillRect(wx + 4, top + 46, 50, 3); }
      ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.strokeRect(wx + .5, top + 42.5, 57, 43);
    }
    // Türen
    if (c === 0) drawTrainDoor(T, x + 330);
    else {
      ctx.fillStyle = '#120a20'; ctx.fillRect(x + 306, top + 36, 62, 128);
      ctx.strokeStyle = 'rgba(198,107,255,.4)'; ctx.strokeRect(x + 306.5, top + 36.5, 61, 127);
      ctx.fillStyle = 'rgba(57,230,255,.45)'; ctx.fillRect(x + 335, top + 36, 4, 128);
    }
    // Radkästen
    ctx.fillStyle = '#07040e';
    ctx.fillRect(x + 44, bot - 20, 92, 20);
    ctx.fillRect(x + 264, bot - 20, 92, 20);
    // Linie
    ctx.fillStyle = '#ffc63a'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
    ctx.fillText('U4', x + 10, top + 30);
    ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fillRect(x, bot - 6, carW, 2);
  }
  // Front + Scheinwerfer
  const fx = T.trainX;
  ctx.fillStyle = '#0c0718'; ctx.fillRect(fx - 16, top + 18, 18, bot - top - 30);
  const lamps = [top + 42, top + 96];
  for (const ly of lamps){
    const hg = ctx.createRadialGradient(fx - 12, ly, 2, fx - 12, ly, 90);
    hg.addColorStop(0, 'rgba(255,255,235,.95)');
    hg.addColorStop(.35, 'rgba(210,240,255,.45)');
    hg.addColorStop(1, 'rgba(150,220,255,0)');
    ctx.fillStyle = hg; ctx.fillRect(fx - 110, ly - 80, 200, 160);
    ctx.fillStyle = '#fffdf0'; ctx.fillRect(fx - 14, ly - 5, 6, 10);
  }
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawBorderPrompt(T){
  if (!T.prompt) return;
  const x = T.doorX, y = GY - 190;
  ctx.fillStyle = 'rgba(10,4,18,.9)'; ctx.fillRect(x - 56, y - 26, 112, 30);
  ctx.strokeStyle = 'rgba(57,230,255,.8)'; ctx.lineWidth = 2; ctx.strokeRect(x - 55, y - 25, 110, 28);
  ctx.fillStyle = '#9df3ff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
  ctx.fillText('E — EINSTEIGEN', x, y - 7);
  ctx.textAlign = 'left';
}

function drawBackground(lvl){
  const pal = lvl.pal, off = cam.x;
  if (pal.station){ drawStationSky(pal); return; }
  // Himmel über die ganze Fläche (keine schwarzen Balken)
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, pal.sky[0]);
  g.addColorStop(.62, pal.sky[1]);
  g.addColorStop(1, '#08040d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);

  // Horizontglühen
  const hg = ctx.createRadialGradient(VW*.5, 400, 30, VW*.5, 400, 560);
  hg.addColorStop(0, hexA(pal.glow, .18));
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, 0, VW, VH);

  // Mond
  const my = 92 - cam.y*.06;
  const mg = ctx.createRadialGradient(VW*.78, my, 6, VW*.78, my, 90);
  mg.addColorStop(0, 'rgba(255,255,255,.22)');
  mg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(VW*.78, my, 90, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,250,240,.16)';
  ctx.beginPath(); ctx.arc(VW*.78, my, 34, 0, Math.PI*2); ctx.fill();

  // Parallax-Layer
  ctx.save();
  ctx.translate(0, -cam.y*.05);
  cityLayer(off, 318, pal.far, 7, .10, { pal, minH:30, maxH:120 });
  ctx.restore();
  ctx.save();
  ctx.translate(0, -cam.y*.12);
  cityLayer(off, 372, pal.mid, 31, .26, { pal, minH:40, maxH:150 });
  ctx.restore();
  ctx.save();
  ctx.translate(0, -cam.y*.2);
  cityLayer(off, 418, pal.near, 77, .48, { pal, minH:34, maxH:110 });
  ctx.restore();

  // Dunst am Horizont
  const fog = ctx.createLinearGradient(0, 300, 0, 440);
  fog.addColorStop(0, 'rgba(0,0,0,0)');
  fog.addColorStop(1, hexA(pal.sky[0], .85));
  ctx.fillStyle = fog; ctx.fillRect(0, 300, VW, 150);

  // Regen
  if (pal.rain){
    ctx.strokeStyle = 'rgba(180,210,255,.16)'; ctx.lineWidth = 1;
    for (let i=0;i<80;i++){
      const rx = ((i*137 + G.time*520*(i%3+1)) % (VW+200)) - 100;
      const ry = ((i*89 + G.time*780) % VH);
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx-7, ry+20); ctx.stroke();
    }
  }
}

function drawLevel(lvl){
  const pal = lvl.pal;
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  if (lvl.pal.station){ drawStationWorld(lvl); drawTrain(lvl); }
  // Plattformen
  for (const s of lvl.solids){
    if (s.bench){ drawBench(s); continue; }
    if (s.type === 'ramp'){
      ctx.fillStyle = '#171022';
      ctx.beginPath();
      if (s.dir > 0){ ctx.moveTo(s.x, s.y+s.h); ctx.lineTo(s.x+s.w, s.y); ctx.lineTo(s.x+s.w, s.y+s.h); }
      else { ctx.moveTo(s.x, s.y); ctx.lineTo(s.x+s.w, s.y+s.h); ctx.lineTo(s.x, s.y+s.h); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = pal.glow; ctx.lineWidth = 2; ctx.globalAlpha = .55; ctx.stroke(); ctx.globalAlpha = 1;
      continue;
    }
    if (s.type === 'oneway'){
      ctx.fillStyle = '#1d1330';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = pal.glow2; ctx.globalAlpha = .5; ctx.fillRect(s.x, s.y, s.w, 2); ctx.globalAlpha = 1;
      continue;
    }
    if (s.type === 'move'){
      ctx.fillStyle = '#12203a';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = pal.glow2; ctx.globalAlpha = .7; ctx.fillRect(s.x, s.y, s.w, 2); ctx.globalAlpha = 1;
      continue;
    }
    // Boden / Blöcke
    const solid = s.ground || s.h > 60;
    const grad = ctx.createLinearGradient(0, s.y, 0, s.y + Math.min(s.h, 160));
    if (solid){
      grad.addColorStop(0, '#241833');
      grad.addColorStop(.18, '#171022');
      grad.addColorStop(1, '#07040c');
    } else {
      grad.addColorStop(0, '#221538');
      grad.addColorStop(1, '#120a1e');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(s.x, s.y, s.w, s.h);

    if (s.ground){
      // Bürgersteigkante
      ctx.fillStyle = '#3a2a4c'; ctx.fillRect(s.x, s.y, s.w, 5);
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(s.x, s.y, s.w, 1.5);
      ctx.fillStyle = hexA(pal.glow, .30); ctx.fillRect(s.x, s.y+1.5, s.w, 2);
      // Gehwegplatten
      ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.lineWidth = 1;
      for (let gx = s.x; gx < s.x + s.w; gx += 56){
        ctx.beginPath(); ctx.moveTo(gx, s.y+5); ctx.lineTo(gx, s.y+34); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(s.x, s.y+34); ctx.lineTo(s.x+s.w, s.y+34); ctx.stroke();
      // nasse Spiegelungen
      for (let px = s.x + 30; px < s.x + s.w - 40; px += 96){
        const wob = Math.sin((px + G.time*40) * .02) * 3;
        ctx.fillStyle = hexA(pal.glow, .13);
        ctx.fillRect(px, s.y + 44 + wob, 52, 3);
        ctx.fillStyle = hexA(pal.glow2, .10);
        ctx.fillRect(px + 18, s.y + 52 - wob, 34, 2);
      }
      // Gullydeckel
      for (let mx = s.x + 220; mx < s.x + s.w - 60; mx += 640){
        ctx.fillStyle = '#0b0712'; ctx.fillRect(mx, s.y + 40, 26, 8);
        ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = 1;
        ctx.strokeRect(mx + .5, s.y + 40.5, 25, 7);
      }
    } else {
      // Fassade / Kante
      ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fillRect(s.x, s.y, s.w, 2);
      ctx.fillStyle = hexA(pal.glow2, .22); ctx.fillRect(s.x, s.y+2, s.w, 3);
      // Ziegelfugen
      ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1;
      for (let by = s.y + 12; by < s.y + s.h; by += 12){
        ctx.beginPath(); ctx.moveTo(s.x, by); ctx.lineTo(s.x + s.w, by); ctx.stroke();
      }
    }
    // Unterkante abdunkeln
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(s.x, s.y + Math.min(s.h, 160) - 4, s.w, 4);
  }

  // Bahnsteig-Objekte
  if (lvl.bins) for (const b of lvl.bins) drawBin(b);
  if (lvl.machines) for (const m of lvl.machines) drawMachine(m);
  if (lvl.train) drawBorderPrompt(lvl.train);

  // Hazards
  for (const hz of lvl.hazards){
    ctx.fillStyle = '#ff2e88';
    for (let i=0;i<hz.w;i+=10) ctx.fillRect(hz.x+i, hz.y, 6, hz.h);
    ctx.globalAlpha = .25; ctx.fillRect(hz.x, hz.y, hz.w, hz.h+10); ctx.globalAlpha = 1;
  }
  // Kisten
  for (const c of lvl.crates){
    if (c.broken) continue;
    ctx.fillStyle = '#3a2418'; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 1.5; ctx.globalAlpha = .6;
    ctx.strokeRect(c.x+1, c.y+1, c.w-2, c.h-2); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,179,71,.35)'; ctx.fillRect(c.x+4, c.y+c.h/2-1, c.w-8, 2);
  }
  // Items
  for (const it of lvl.items){
    if (it.taken) continue;
    const bob = Math.sin(G.time*4 + it.x)*3;
    if (it.kind === 'heart'){
      ctx.fillStyle = '#ff2e88';
      ctx.beginPath();
      const cx = it.x+10, cy = it.y+10+bob;
      ctx.moveTo(cx, cy+8);
      ctx.bezierCurveTo(cx-12, cy-2, cx-6, cy-10, cx, cy-4);
      ctx.bezierCurveTo(cx+6, cy-10, cx+12, cy-2, cx, cy+8);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffc63a';
      const cx = it.x+10, cy = it.y+10+bob;
      ctx.beginPath();
      ctx.moveTo(cx-8, cy+4); ctx.lineTo(cx-6, cy-6); ctx.lineTo(cx-2, cy+1);
      ctx.lineTo(cx+2, cy-8); ctx.lineTo(cx+6, cy+1); ctx.lineTo(cx+8, cy-6);
      ctx.lineTo(cx+9, cy+4); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = .18; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(it.x+10, it.y+10+bob, 16, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
  }
  // NPCs
  for (const n of lvl.npcs){
    const y = GY - 54;
    ctx.fillStyle = '#2a1a3a'; ctx.fillRect(n.x-10, y+18, 20, 36);
    ctx.fillStyle = '#c98b62'; ctx.fillRect(n.x-7, y+4, 14, 14);
    ctx.fillStyle = '#0d0812'; ctx.fillRect(n.x-8, y+1, 16, 7);
    ctx.fillStyle = '#9df3ff'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText(n.name, n.x, y - 8);
    if (G.nearNpc === n){
      ctx.fillStyle = 'rgba(57,230,255,.9)';
      ctx.fillRect(n.x-9, y - 30, 18, 14);
      ctx.fillStyle = '#04101c'; ctx.font = 'bold 10px monospace';
      ctx.fillText('E', n.x, y - 19);
    }
    ctx.textAlign = 'left';
  }
  // Gegner
  for (const e of lvl.enemies) drawEnemySprite(e);
  // Spieler
  drawPlayerSprite(G.player);
  drawFX();
  ctx.restore();

  // Dunkelheit (Speicherstadt)
  if (pal.dark){
    const p = G.player;
    const px = p.cx - cam.x, py = p.cy - cam.y;
    const rg = ctx.createRadialGradient(px, py, 60, px, py, 300);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(1, 'rgba(0,0,0,' + pal.dark + ')');
    ctx.fillStyle = rg; ctx.fillRect(0,0,VW,VH);
  }
  if (FX.flash > 0){
    ctx.fillStyle = 'rgba(255,255,255,' + (FX.flash*.5) + ')';
    ctx.fillRect(0,0,VW,VH);
  }
}
