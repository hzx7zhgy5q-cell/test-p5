/* 
Neon Heart — Dual-Chamber Pacemaker in Complete Heart Block (FIXED)
Controls: F1 = fullscreen
*/

let t0, bpm = 60;
let cycleMs = 60000 / bpm;
let atrialLead, ventricularLead;
let saPath = [], hisPath = [], rvPurkinje = [], lvPurkinje = [];
let aortaPath = [], pulmArtPath = [], pulmVeinPaths = [], svcPath = [], ivcPath = [], coronaries = [];
let particles = [];
let showNative = true;
let neon = {bg:[5,6,12], atria:[200,0,255], vent:[255,40,60], vessel:[80,200,255], node:[255,220,0],
            lead:[70,160,255], pacer:[60,120,255], green:[0,255,140], cyan:[0,255,255], mag:[255,0,190], white:[245,245,245]};
let beatPhase = 0;
let avDelayMs = 160;
let atrialPulseWindow = [0, 80];
let ventricularPulseWindow = [avDelayMs, avDelayMs+80];

function setup(){
  createCanvas(1000, 680);
  t0 = millis();
  textFont('Helvetica');
  angleMode(DEGREES);
  initGeometry();
  initParticles();
}

function draw(){
  background(neon.bg);
  translate(width*0.12, 0);
  let now = millis();
  let inCycle = (now - t0) % cycleMs;
  beatPhase = inCycle / cycleMs;

  let atrialScale = 1 + 0.015 * easePulse(inCycle, atrialPulseWindow);
  let ventScale   = 1 + 0.022 * easePulse(inCycle, ventricularPulseWindow);

  drawTitle();

  let pacedA = inWindow(inCycle, atrialPulseWindow);
  let pacedV = inWindow(inCycle, ventricularPulseWindow);
  drawPacemaker(pacedA, pacedV);

  push();
  translate(200, 70);
  drawVessels();
  drawAtria(atrialScale);
  drawVentricles(ventScale);
  drawConduction(pacedA, pacedV, inCycle);
  drawLeads(pacedA, pacedV);
  updateParticles();
  pop();

  drawLegend(pacedA, pacedV);

  fill(220);
  textAlign(CENTER);
  textSize(13);
  text("F1: Fullscreen | Neon stylised anatomy • Complete heart block • Dual-chamber pacing (RA → RV)", width/2, height-18);
}

/* ---------- Geometry & Paths ---------- */

function initGeometry(){
  // Pacemaker leads
  atrialLead = { from: createVector(-50, 210), to: createVector(345, 170) };
  ventricularLead = { from: createVector(-50, 230), to: createVector(370, 330) };

  // Conduction paths
  const SA = createVector(310, 130);
  const AV = createVector(340, 210);
  const His = createVector(360, 240);
  saPath = makeBezierPath([SA, p(320,160), p(330,185), AV], 36);
  hisPath = makeBezierPath([AV, His, p(370,260), p(380,280)], 24);
  rvPurkinje = fan(His, 6, 60, 130, 320, 360);
  lvPurkinje = fan(p(385,275), 7, 60, 130, 420, 360);

  // Great vessels (ensure 4,7,10... control points)
  aortaPath = makeBezierPath([
    p(410,180), p(480,130), p(520,110), p(560,150),
    p(530,180), p(500,200), p(460,220)
  ], 80);

  // Aortic branches (make sure each has 4 points)
  let brachio = makeBezierPath([p(520,118), p(515,95), p(510,78), p(505,70)], 20);
  let lcc     = makeBezierPath([p(535,115), p(540,92), p(545,75), p(548,65)], 20);
  let lsub    = makeBezierPath([p(552,125), p(565,105), p(580,90), p(592,80)], 20);

  // Pulmonary artery
  pulmArtPath = makeBezierPath([p(380,190), p(430,160), p(470,170), p(520,210)], 60);

  // Pulmonary veins (now 4 points each)
  let pv1 = makeBezierPath([p(520,270), p(555,272), p(575,285), p(590,300)], 24);
  let pv2 = makeBezierPath([p(510,290), p(545,305), p(565,318), p(585,330)], 24);

  // SVC / IVC (now 4 points each)
  svcPath = makeBezierPath([p(320,90), p(318,65), p(315,40), p(312,20)], 24);
  ivcPath = makeBezierPath([p(330,390), p(330,420), p(330,450), p(330,470)], 28);

  // Coronaries
  let rca = makeBezierPath([p(420,185), p(400,210), p(380,235), p(360,260)], 36);
  let rca2= makeBezierPath([p(360,260), p(348,285), p(343,305), p(340,320)], 28);
  let lad = makeBezierPath([p(430,210), p(435,245), p(438,285), p(440,320)], 36);
  let cx  = makeBezierPath([p(430,210), p(455,230), p(475,255), p(490,280)], 28);

  coronaries = [rca, rca2, lad, cx, brachio, lcc, lsub];
  pulmVeinPaths = [pv1, pv2];
}

function p(x,y){ return createVector(x,y); }

function makeBezierPath(points, steps){
  // requires points.length = 4,7,10... (3k+1)
  let pts = [];
  if (!points || points.length < 4) return pts;
  for (let i=0; i<=points.length-4; i+=3){
    for (let t=0; t<=1; t+=1/steps){
      let x = bezierPoint(points[i].x, points[i+1].x, points[i+2].x, points[i+3].x, t);
      let y = bezierPoint(points[i].y, points[i+1].y, points[i+2].y, points[i+3].y, t);
      pts.push(createVector(x,y));
    }
  }
  return pts;
}

function fan(origin, count, rMin, rMax, xBias, yBase){
  let arr = [];
  for (let i=0;i<count;i++){
    let ang = map(i, 0, count-1, -45, 45);
    let r = random(rMin, rMax);
    let end = createVector(origin.x + cos(ang)*r, yBase + sin(ang)*0.4*r);
    arr.push([origin.copy(), end]);
  }
  return arr;
}

/* ---------- Drawing ---------- */

function drawTitle(){
  push();
  noStroke();
  fill(240);
  textAlign(LEFT, TOP);
  textSize(22);
  text("Neon Heart • Dual-Chamber Pacemaker • Complete Heart Block", 22, 20);
  textSize(14);
  fill(200);
  text("Atria (magenta) • Ventricles (red) • Vessels (cyan) • Conduction (gold) • Pacemaker (blue)", 22, 48);
  pop();
}

function drawAtria(scaleF=1){
  push();
  translate(0,-10);
  scale(scaleF);
  neonBlob([p(300,150), p(270,165), p(260,195), p(285,210), p(310,205), p(320,175)], neon.mag, 7, 8, 55);
  neonBlob([p(345,150), p(375,160), p(395,185), p(380,205), p(355,210), p(335,190)], neon.mag, 7, 8, 55);
  pop();
  glowText("Right Atrium", 285, 145, neon.mag, 12);
  glowText("Left Atrium",  370, 145, neon.mag, 12);
}

function drawVentricles(scaleF=1){
  push();
  scale(scaleF);
  neonBlob([p(330,220), p(300,260), p(295,300), p(305,340), p(330,360), p(360,350), p(370,320), p(360,280)], neon.vent, 8, 10, 70);
  neonBlob([p(370,220), p(395,245), p(405,280), p(405,320), p(395,350), p(370,370), p(340,360), p(345,300)], neon.vent, 8, 10, 70);
  pop();
  glowText("Right Ventricle", 300, 375, neon.vent, 12);
  glowText("Left Ventricle",  385, 380, neon.vent, 12);
}

function drawVessels(){
  glowPolyline(aortaPath, neon.vessel, 6, 7);
  glowPolyline(pulmArtPath, neon.vessel, 5, 7);
  pulmVeinPaths.forEach(pv => glowPolyline(pv, neon.vessel, 4, 6));
  glowPolyline(svcPath, neon.vessel, 5, 7);
  glowPolyline(ivcPath, neon.vessel, 5, 7);
  coronaries.forEach(c => glowPolyline(c, [255,120,0], 3, 6));

  // Labels with safe sampling
  const aPt = safePoint(aortaPath, 0.25);
  const pPt = safePoint(pulmArtPath, 0.35);
  const pvPt = safePoint(pulmVeinPaths[0], 0.4);
  const sPt = safePoint(svcPath, 0.9);
  const iPt = safePoint(ivcPath, 0.9);
  if (aPt) glowText("Aorta", aPt.x+16, aPt.y-10, neon.vessel, 12);
  if (pPt) glowText("Pulmonary Artery", pPt.x+10, pPt.y-16, neon.vessel, 12);
  if (pvPt) glowText("Pulmonary Veins", pvPt.x+10, pvPt.y-10, neon.vessel, 12);
  if (sPt) glowText("SVC", sPt.x-8, sPt.y-20, neon.vessel, 12);
  if (iPt) glowText("IVC", iPt.x+10, iPt.y+5, neon.vessel, 12);
}

function drawConduction(pacedA, pacedV, inCycle){
  let SA = saPath.length? saPath[0].copy() : p(310,130);
  let AV = saPath.length? saPath[saPath.length-1].copy() : p(340,210);

  glowDot(SA.x, SA.y, neon.node, pacedA ? 12:8);
  glowText("SA node", SA.x-10, SA.y-18, neon.node, 11);

  glowDot(AV.x, AV.y, neon.node, pacedA ? 10:7);
  glowText("AV node (blocked)", AV.x+8, AV.y+16, neon.node, 11);

  glowPolyline(saPath, neon.node, 2.4, 6);
  glowPolyline(hisPath, neon.node, 2.2, 6);

  rvPurkinje.forEach(seg => glowSegment(seg[0], seg[1], neon.node, 2, 5));
  lvPurkinje.forEach(seg => glowSegment(seg[0], seg[1], neon.node, 2, 5));

  if (pacedA){
    moveSparkAlong(saPath, neon.cyan, 0.8);
  } else if (showNative){
    moveSparkAlong(saPath, [255,200,0], 0.4);
  }
  if (pacedV){
    moveSparkAlong(hisPath, neon.green, 0.9);
    rvPurkinje.forEach(seg => moveSparkSegment(seg[0], seg[1], neon.green, 0.8));
    lvPurkinje.forEach(seg => moveSparkSegment(seg[0], seg[1], neon.green, 0.8));
  }
}

function drawPacemaker(pacedA, pacedV){
  push();
  translate(70, 160);
  neonRoundedRect(-100, -40, 90, 60, 16, neon.pacer, 4, 10);
  glowText("Pacemaker", -55, -55, neon.pacer, 12);
  let aCol = pacedA ? neon.cyan : [140,160,180];
  let vCol = pacedV ? neon.green : [140,160,180];
  glowDot(-85, -22, aCol, pacedA?10:7);
  glowText("A", -85, -36, aCol, 11);
  glowDot(-25, -22, vCol, pacedV?10:7);
  glowText("V", -25, -36, vCol, 11);
  pop();
}

function drawLeads(pacedA, pacedV){
  glowBezier(atrialLead.from, p(120,200), p(240,185), atrialLead.to, neon.lead, 2.5, 7);
  glowBezier(ventricularLead.from, p(130,240), p(250,260), ventricularLead.to, neon.lead, 2.5, 7);
  if (pacedA) glowSegment(atrialLead.from, atrialLead.to, neon.cyan, 3, 6);
  if (pacedV) glowSegment(ventricularLead.from, ventricularLead.to, neon.green, 3, 6);
}

/* ---------- Particles ---------- */

function initParticles(){
  let allPaths = [aortaPath, pulmArtPath, ...pulmVeinPaths, svcPath, ivcPath].filter(p=>p && p.length>1);
  for (let i=0;i<80;i++){
    let path = random(allPaths);
    particles.push({
      path, idx: floor(random(path.length)),
      speed: random(0.4, 1.2), size: random(2,4),
      col: random([neon.vessel, [0,220,255], [0,255,180]])
    });
  }
}

function updateParticles(){
  for (let p of particles){
    if (!p.path || p.path.length < 2) continue;
    p.idx = (p.idx + p.speed) % p.path.length;
    let a = p.path[floor(p.idx)];
    let b = p.path[(floor(p.idx)+1) % p.path.length];
    if (!a || !b) continue;
    let x = lerp(a.x, b.x, p.idx % 1);
    let y = lerp(a.y, b.y, p.idx % 1);
    glowDot(x, y, p.col, p.size+2);
  }
}

/* ---------- Neon utils ---------- */

function glowPolyline(pts, col, w=3, layers=6){
  if (!pts || pts.length < 2) return;
  for (let k=layers; k>=1; k--){
    let alpha = map(k, 1, layers, 220, 25);
    stroke(color(col[0], col[1], col[2], alpha));
    strokeWeight(w + (layers-k)*2.2);
    noFill();
    beginShape();
    for (let v of pts) vertex(v.x, v.y);
    endShape();
  }
}

function glowSegment(a, b, col, w=3, layers=6){
  for (let k=layers; k>=1; k--){
    let alpha = map(k, 1, layers, 230, 20);
    stroke(color(col[0], col[1], col[2], alpha));
    strokeWeight(w + (layers-k)*2.2);
    line(a.x, a.y, b.x, b.y);
  }
}

function glowBezier(a, c1, c2, d, col, w=3, layers=6){
  for (let k=layers; k>=1; k--){
    let alpha = map(k, 1, layers, 220, 20);
    stroke(color(col[0], col[1], col[2], alpha));
    strokeWeight(w + (layers-k)*2.2);
    noFill();
    bezier(a.x, a.y, c1.x, c1.y, c2.x, c2.y, d.x, d.y);
  }
}

function glowDot(x,y, col, r=8, layers=6){
  noStroke();
  for (let k=layers; k>=1; k--){
    let alpha = map(k, 1, layers, 230, 18);
    fill(color(col[0], col[1], col[2], alpha));
    circle(x, y, r + (layers-k)*4);
  }
}

function neonRoundedRect(x,y,w,h,r,col, base=3, layers=8){
  for (let k=layers; k>=1; k--){
    let alpha = map(k, 1, layers, 220, 18);
    stroke(color(col[0], col[1], col[2], alpha));
    strokeWeight(base + (layers-k)*2.2);
    noFill();
    rect(x, y, w, h, r);
  }
}

function neonBlob(points, col, w=6, layers=8){
  for (let k=layers; k>=1; k--){
    let alpha = map(k, 1, layers, 220, 16);
    stroke(color(col[0], col[1], col[2], alpha));
    strokeWeight(w + (layers-k)*2.2);
    noFill();
    beginShape();
    for (let i=0;i<points.length;i++){
      let v = points[i];
      curveVertex(v.x, v.y);
    }
    for (let i=0;i<3;i++) curveVertex(points[i].x, points[i].y);
    endShape();
  }
}

function glowText(txt, x, y, col, sz=12){
  textSize(sz);
  textAlign(LEFT, CENTER);
  fill(color(col[0], col[1], col[2], 40)); noStroke();
  for (let k=6;k>=1;k--) text(txt, x, y + k*0.6);
  fill(color(255,255,255,235));
  text(txt, x, y);
}

function moveSparkAlong(pts, col, speed=0.8){
  if (!pts || pts.length<2) return;
  let t = (millis() % cycleMs) / cycleMs;
  let idx = floor(t * pts.length * speed) % (pts.length-1);
  let a = pts[idx], b = pts[idx+1];
  glowDot(lerp(a.x,b.x,0.5), lerp(a.y,b.y,0.5), col, 7, 6);
}

function moveSparkSegment(a, b, col, speed=0.8){
  let t = (millis() % cycleMs) / cycleMs;
  let x = lerp(a.x, b.x, (t*speed)%1);
  let y = lerp(a.y, b.y, (t*speed)%1);
  glowDot(x, y, col, 6, 6);
}

/* ---------- Timing & helpers ---------- */

function easePulse(inCycle, window){
  let [s,e] = window;
  if (inCycle < s || inCycle > e) return 0;
  let u = (inCycle - s) / (e - s);
  return sin(u*180);
}

function inWindow(inCycle, window){
  return inCycle >= window[0] && inCycle <= window[1];
}

function safePoint(path, ratio=0.5){
  if (!path || path.length === 0) return null;
  let idx = constrain(floor(path.length * ratio), 0, path.length-1);
  return path[idx];
}

/* ---------- Legend ---------- */
function drawLegend(pA, pV){
  const x0 = width-250, y0 = 120, lh = 24;
  glowText("Legend", x0, y0-26, neon.white, 14);
  legendRow(x0, y0+0*lh, neon.mag, "Atria");
  legendRow(x0, y0+1*lh, neon.vent, "Ventricles");
  legendRow(x0, y0+2*lh, neon.vessel, "Major vessels");
  legendRow(x0, y0+3*lh, neon.node, "Conduction");
  legendRow(x0, y0+4*lh, neon.pacer, "Pacemaker");
  legendRow(x0, y0+5*lh, pA?neon.cyan:[170,170,170], `Atrial pace ${pA?"(active)":""}`);
  legendRow(x0, y0+6*lh, pV?neon.green:[170,170,170], `Ventricular pace ${pV?"(active)":""}`);
}

function legendRow(x,y,col,label){
  glowDot(x, y, col, 8, 6);
  fill(230);
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(12);
  text(label, x+16, y);
}

/* ---------- Fullscreen ---------- */
function keyPressed(){
  if (keyCode === 112){ // F1
    let fs = fullscreen();
    fullscreen(!fs);
  }
}
