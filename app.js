/* Piano Practice — hears a real piano over Web MIDI, shows the sheet music,
   waits for every note of a chord, and has a falling-notes game.
   Pieces: library/index.json (MusicXML) + pieces the player adds (MusicXML, .mxl, MIDI). */
"use strict";

/* ============ small helpers ============ */
const $ = id => document.getElementById(id);
const NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const isBlack = m => [1,3,6,8,10].includes(((m % 12) + 12) % 12);
const today = () => { const d = new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
const uniq = a => [...new Set(a)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ============ saved progress (this device) ============ */
const KEY = "piano.v2";
let store = { name:"", pieces:{}, current:null, practiceDone:"", speed:"slow", hand:"both", sound:null,
              zoom:0.9, fullKeys:false, playOnPiano:true, games:{} };
try { const raw = localStorage.getItem(KEY); if (raw) store = Object.assign(store, JSON.parse(raw)); } catch (e) {}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
function rec(id){ return store.pieces[id] || (store.pieces[id] = { plays:0, both:null, R:null, L:null }); }
const starsFor = acc => acc >= 0.95 ? 3 : acc >= 0.8 ? 2 : 1;
const gameOpen = () => store.practiceDone === today();

/* ============ pieces the player adds (IndexedDB) ============ */
const DB = {
  db:null,
  open(){ return new Promise((res) => {
    setTimeout(() => res(false), 2500);            // never let a stuck database block the app
    try { const r = indexedDB.open("piano-pieces", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("pieces", { keyPath:"id" });
      r.onsuccess = () => { this.db = r.result; res(true); };
      r.onerror = () => res(false);
    } catch (e) { res(false); } }); },
  tx(mode){ return this.db.transaction("pieces", mode).objectStore("pieces"); },
  all(){ return new Promise(res => { if (!this.db) return res([]); const q = this.tx("readonly").getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); }); },
  put(v){ return new Promise(res => { if (!this.db) return res(false); const q = this.tx("readwrite").put(v); q.onsuccess = () => res(true); q.onerror = () => res(false); }); },
  del(id){ return new Promise(res => { if (!this.db) return res(false); const q = this.tx("readwrite").delete(id); q.onsuccess = () => res(true); q.onerror = () => res(false); }); },
};

/* ============ sound (laptop/tablet speaker) + piano output ============ */
let actx = null;
const soundOn = () => store.sound === null ? !midiIn : store.sound;
function synth(m, len = 0.6, force = false){
  if (!force && !soundOn()) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    const t = actx.currentTime, f = 440 * Math.pow(2, (m - 69) / 12);
    const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.15, len));
    g.connect(actx.destination);
    for (const [type, mul, vol] of [["triangle",1,1],["sine",2,0.22]]) {
      const o = actx.createOscillator(), og = actx.createGain(); o.type = type; o.frequency.value = f * mul;
      og.gain.value = vol; o.connect(og); og.connect(g); o.start(t); o.stop(t + Math.max(0.15, len) + 0.05);
    }
  } catch (e) {}
}
function pianoOut(){ if (!midiAccess || !store.playOnPiano) return null; let o = null; midiAccess.outputs.forEach(x => { if (!o && x.state === "connected") o = x; }); return o; }
/* play a note for "Listen"/accompaniment: through the real piano if possible, else the speaker */
function playNote(m, secs, vel = 70){
  const o = pianoOut();
  if (o) { try { o.send([0x90, m, vel]); o.send([0x80, m, 0], performance.now() + Math.max(120, secs * 1000 - 30)); return; } catch (e) {} }
  synth(m, secs, true);
}
function allNotesOff(){ const o = pianoOut(); if (o) try { o.send([0xB0, 123, 0]); } catch (e) {} }
function updateSoundBtn(){ $("soundBtn").textContent = soundOn() ? "🔊 Sound: on" : "🔈 Sound: off"; }

/* ============ on-screen keyboard ============ */
let keyEls = {};
function buildKeyboard(lo, hi){
  if (store.fullKeys) { lo = 21; hi = 108; }
  else { lo = Math.min(lo - 2, 48); hi = Math.max(hi + 2, 84);
    lo = lo - (((lo % 12) + 12) % 12); if (hi % 12) hi += 12 - (hi % 12);
    lo = Math.max(21, lo); hi = Math.min(108, hi); }
  keyEls = {};
  const kb = $("kb"); kb.innerHTML = "";
  const whites = []; for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
  const N = whites.length, bw = 100 / N * 0.62;
  whites.forEach(m => { const d = document.createElement("div"); d.className = "key w" + (m === 60 ? " midc" : "");
    d.textContent = N <= 36 ? NAMES[m % 12] : (m % 12 === 0 ? "C" + (m / 12 - 1) : ""); d.dataset.m = m; kb.appendChild(d); keyEls[m] = d; });
  for (let m = lo; m <= hi; m++) if (isBlack(m)) {
    const wi = whites.indexOf(m - 1); if (wi < 0) continue;
    const d = document.createElement("div"); d.className = "key b"; d.dataset.m = m;
    d.style.width = bw + "%"; d.style.left = ((wi + 1) / N * 100 - bw / 2) + "%"; kb.appendChild(d); keyEls[m] = d; }
}
/* targets: Map midi -> "R" | "L";  done: Set of midis already played in this step */
function showTargets(targets, done = new Set()){
  for (const m in keyEls) {
    const el = keyEls[m], h = targets.get(+m);
    el.classList.toggle("tR", h === "R" && !done.has(+m));
    el.classList.toggle("tL", h === "L" && !done.has(+m));
    el.classList.toggle("done", !!h && done.has(+m));
  }
}
function flash(m, cls){
  const el = keyEls[m]; if (!el) return;
  el.classList.remove("ok","bad"); void el.offsetWidth; el.classList.add(cls);
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove(cls), cls === "ok" ? 260 : 420);
}
const touching = new Map();
$("kb").addEventListener("pointerdown", e => { const k = e.target.closest(".key"); if (!k) return;
  e.preventDefault(); const m = +k.dataset.m; touching.set(e.pointerId, m); noteOn(m, "screen"); });
for (const ev of ["pointerup","pointercancel","pointerleave"])
  $("kb").addEventListener(ev, e => { if (touching.has(e.pointerId)) { noteOff(touching.get(e.pointerId)); touching.delete(e.pointerId); } });

/* ============ input: the piano (Web MIDI) ============ */
let midiAccess = null, midiIn = false;
function setStatus(){
  const names = []; if (midiAccess) midiAccess.inputs.forEach(i => { if (i.state === "connected") names.push(i.name); });
  midiIn = names.length > 0;
  $("status").textContent = midiIn ? "🎹 " + names.join(", ") : (midiAccess ? "Piano not found — is it on and plugged in?" : "Piano not connected");
  $("status").classList.toggle("on", midiIn);
  $("connectBtn").classList.toggle("hidden", midiIn);
  updateSoundBtn();
}
function bindInputs(){ if (!midiAccess) return; midiAccess.inputs.forEach(inp => { inp.onmidimessage = onMidi; }); setStatus(); }
function onMidi(ev){
  const [st, d1, d2] = ev.data, cmd = st & 0xF0;
  if (cmd === 0x90 && d2 > 0) noteOn(d1, "midi");
  else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) noteOff(d1);
}
async function connectMidi(){
  if (!navigator.requestMIDIAccess) {
    $("status").textContent = "This browser can't hear a piano — use Chrome (computer or Android) or Edge.";
    $("kbhelp").classList.remove("hidden"); return;
  }
  try { midiAccess = await navigator.requestMIDIAccess({ sysex:false });
    midiAccess.onstatechange = bindInputs; bindInputs();
    if (!midiIn) $("kbhelp").classList.remove("hidden");
  } catch (e) {
    $("status").textContent = "Piano permission was blocked — tap the icon left of the address bar and allow MIDI.";
  }
}
$("connectBtn").onclick = connectMidi;
(async () => { try { if (navigator.permissions) { const p = await navigator.permissions.query({ name:"midi" }); if (p.state === "granted") connectMidi(); } } catch (e) {} })();

/* ============ input: computer keyboard ============ */
const KMAP = { a:0,w:1,s:2,e:3,d:4,f:5,t:6,g:7,y:8,h:9,u:10,j:11,k:12,o:13,l:14,p:15,";":16,"'":17 };
let kbOct = 4; const held = new Map();
const updKbBase = () => $("kbBase").textContent = "C" + kbOct;
window.addEventListener("keydown", e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA/.test(document.activeElement?.tagName || "")) return;
  const k = e.key.toLowerCase();
  if (k === "z") { kbOct = Math.max(1, kbOct - 1); updKbBase(); return; }
  if (k === "x") { kbOct = Math.min(7, kbOct + 1); updKbBase(); return; }
  if (k in KMAP) { e.preventDefault(); const m = (kbOct + 1) * 12 + KMAP[k]; held.set(k, m); noteOn(m, "kb"); }
});
window.addEventListener("keyup", e => { const k = e.key.toLowerCase(); if (held.has(k)) { noteOff(held.get(k)); held.delete(k); } });
$("kbModeBtn").onclick = () => $("kbhelp").classList.toggle("hidden");

function noteOn(m, src){
  const el = keyEls[m]; if (el) el.classList.add("down");
  if (src !== "midi" || soundOn()) synth(m);
  if (ui.screen === "practice") practiceNote(m);
  else if (ui.screen === "game") gameNote(m);
}
function noteOff(m){ const el = keyEls[m]; if (el) el.classList.remove("down"); }

/* ============ screens ============ */
const ui = { screen:"library" };
function show(screen){
  stopListen(); if (screen !== "game") stopGame();
  document.querySelectorAll("#tabs button[data-screen]").forEach(b => b.classList.toggle("active", b.dataset.screen === screen));
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + screen));
  ui.screen = screen; updateGameTab(); closeModal();
  $("kbCard").classList.toggle("hidden", screen === "library");
  if (screen === "library") renderLibrary();
  if (screen === "practice") openPractice();
  if (screen === "game") prepareGame();
  wakeLock(screen !== "library"); window.scrollTo(0, 0); setTimeout(fitLayout, 0);
}
document.querySelectorAll("#tabs button[data-screen]").forEach(b => b.onclick = () => show(b.dataset.screen));
function updateGameTab(){ $("gameTab").textContent = gameOpen() ? "🎮 Game" : "🎮 Game 🔒"; }

/* ============ library ============ */
let library = [], myPieces = [];
const GRADE_NAMES = { 0:"Warm-ups", 1:"Grade 1 level", 2:"Grade 2 level", 3:"Grade 3 level", 4:"Grade 4 level", 99:"My pieces" };
async function loadLibrary(){
  try { library = await (await fetch("library/index.json")).json(); } catch (e) { library = []; }
  myPieces = (await DB.all()).map(p => ({ id:p.id, title:p.title, composer:p.composer || "Added by you", grade:99, bpm:p.bpm || 90, mine:true }));
}
const allPieces = () => library.concat(myPieces);
const findPiece = id => allPieces().find(p => p.id === id);
function starsHtml(r){
  const b = r && r.both; const s = b ? b.stars : 0;
  let h = "⭐".repeat(s) + "☆".repeat(3 - s);
  const hs = []; if (r && r.R) hs.push("R " + Math.round(r.R.best * 100) + "%"); if (r && r.L) hs.push("L " + Math.round(r.L.best * 100) + "%");
  return `<div class="stars">${h}</div>` + (b ? `<div class="c">Both hands best ${Math.round(b.best * 100)}%</div>` : "") + (hs.length ? `<div class="c">${hs.join(" · ")}</div>` : "");
}
function renderLibrary(){
  $("todayTxt").textContent = gameOpen() ? "🎮 Game unlocked today!" : "Finish a piece in Practice to unlock the game";
  const box = $("libList"); box.innerHTML = "";
  const groups = {};
  for (const p of allPieces()) (groups[p.grade] = groups[p.grade] || []).push(p);
  for (const g of Object.keys(groups).map(Number).sort((a, b) => (a === 99) - (b === 99) || a - b)) {
    const sec = document.createElement("div"); sec.className = "grade";
    sec.innerHTML = `<h2>${GRADE_NAMES[g] || "Grade " + g}</h2>`;
    const grid = document.createElement("div"); grid.className = "grid";
    for (const p of groups[g]) {
      const b = document.createElement("button"); b.className = "piece" + (p.id === store.current ? " current" : "");
      b.innerHTML = `<div class="t">${esc(p.title)}</div><div class="c">${esc(p.composer || "")}</div>${starsHtml(store.pieces[p.id])}` +
        (p.mine ? `<span class="del" title="Remove">✕</span>` : "");
      b.onclick = async e => {
        if (e.target.classList.contains("del")) { if (confirm(`Remove "${p.title}" from this device?`)) { await DB.del(p.id); await loadLibrary(); renderLibrary(); } return; }
        store.current = p.id; save(); show("practice");
      };
      grid.appendChild(b);
    }
    sec.appendChild(grid); box.appendChild(sec);
  }
  $("credits").innerHTML = "Library scores: public-domain and CC BY-SA engravings from the <a href='https://www.mutopiaproject.org' target='_blank' rel='noopener'>Mutopia Project</a> (credits in each file and in CREDITS.md). Levels are approximate, not the ABRSM syllabus. Sheet music drawn with OpenSheetMusicDisplay.";
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));

/* add a piece */
$("importFile").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  const ext = f.name.toLowerCase().split(".").pop();
  const title = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  let rec_ = { id:"my-" + Date.now(), title, added:Date.now() };
  try {
    if (ext === "mid" || ext === "midi") { rec_.kind = "midi"; rec_.data = await f.arrayBuffer(); parseMidi(rec_.data); }
    else if (ext === "mxl") { rec_.kind = "xml"; rec_.data = await readBinaryString(f); }
    else { rec_.kind = "xml"; rec_.data = await f.text();
      const t = /<(work-title|movement-title)>([^<]+)</.exec(rec_.data); if (t) rec_.title = t[2].trim();
      const c = /<creator type="composer">([^<]+)</.exec(rec_.data); if (c) rec_.composer = c[1].trim(); }
  } catch (err) { alert("Sorry, that file could not be read: " + err.message); return; }
  if (!(await DB.put(rec_))) { alert("Sorry, this browser would not save the piece."); return; }
  await loadLibrary(); store.current = rec_.id; save(); show("practice");
});
function readBinaryString(f){ return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsBinaryString(f); }); }

/* ============ loading a piece into steps ============ */
/* A "step" is one moment in the music: every note that starts together (a chord across both hands). */
let osmd = null, piece = null;
function getOsmd(){
  if (!osmd) osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("sheet", {
    autoResize:true, backend:"svg", drawTitle:false, drawSubtitle:false, drawPartNames:false, drawCredits:false,
    drawComposer:false, drawLyricist:false, followCursor:false, cursorsOptions:[{ type:0, color:"#3b8cff", alpha:0.35, follow:true }] });
  return osmd;
}
async function loadPiece(meta){
  $("loading").classList.remove("hidden");
  try {
    let src, kind = "xml";
    if (meta.mine) { const all = await DB.all(); const r = all.find(x => x.id === meta.id); if (!r) throw new Error("piece missing"); src = r.data; kind = r.kind; }
    else src = await (await fetch(meta.file)).text();
    let steps, bpm = meta.bpm || 90;
    if (kind === "midi") {
      const mf = parseMidi(src); steps = stepsFromMidi(mf); bpm = meta.bpm && !meta.mine ? meta.bpm : Math.round(60000000 / mf.tempo);
      $("sheetCard").classList.add("hidden"); $("rollWrap").classList.remove("hidden");
    } else {
      $("sheetCard").classList.remove("hidden"); $("rollWrap").classList.add("hidden");
      const o = getOsmd(); o.zoom = store.zoom;
      await o.load(src); o.render();
      steps = stepsFromOsmd(o, meta);
      const t = o.Sheet && o.Sheet.DefaultStartTempoInBpm; if (t && meta.mine) bpm = t;
    }
    const mids = steps.flatMap(s => s.notes.map(n => n.midi));
    if (!mids.length) throw new Error("no notes found");
    piece = { meta, kind, steps, bpm, lo:Math.min(...mids), hi:Math.max(...mids), bars:Math.max(...steps.map(s => s.bar)) };
    setTimeout(fitLayout, 0);
    return piece;
  } finally { $("loading").classList.add("hidden"); }
}
function stepsFromOsmd(o, meta){
  const c = o.cursor; c.show(); c.reset();
  const nStaves = (o.Sheet && o.Sheet.Staves) ? o.Sheet.Staves.length : 2;
  const steps = []; let guard = 0, lastRaw = -1, abs = 0, lastLen = 1;
  while (!c.iterator.EndReached && guard++ < 50000) {
    const it = c.iterator, notes = [];
    for (const ve of (it.CurrentVoiceEntries || [])) {
      if (ve.IsGrace) continue;
      for (const n of ve.Notes) {
        if ((n.isRest && n.isRest()) || n.halfTone == null) continue;
        const tie = n.NoteTie; if (tie && tie.StartNote && tie.StartNote !== n) continue;   // held from before
        let len = n.Length.RealValue * 4; try { if (tie && tie.Duration) len = tie.Duration.RealValue * 4; } catch (e) {}
        let staff = 0; try { staff = n.ParentStaffEntry.ParentStaff.idInMusicSheet; } catch (e) {}
        notes.push({ midi:n.halfTone + 12, dur:len, hand: nStaves > 1 ? (staff === 0 ? "R" : "L") : (meta.hand || "R") });
      }
    }
    const raw = it.currentTimeStamp.RealValue * 4;
    abs += lastRaw < 0 ? raw : (raw > lastRaw ? raw - lastRaw : lastLen);   // repeats jump back in score time
    lastRaw = raw;
    const seen = new Set(); const nn = notes.filter(n => !seen.has(n.midi) && seen.add(n.midi));
    if (nn.length) lastLen = Math.min(...nn.map(n => n.dur));
    steps.push({ t:abs, bar:it.CurrentMeasureIndex + 1, notes:nn });
    c.next();
  }
  c.reset(); cursorIdx = 0;
  return steps;
}

/* ---- MIDI file reader (Standard MIDI File, formats 0 and 1) ---- */
function parseMidi(buf){
  const d = new DataView(buf instanceof ArrayBuffer ? buf : buf.buffer); let p = 0;
  const str = n => { let s = ""; for (let i = 0; i < n; i++) s += String.fromCharCode(d.getUint8(p++)); return s; };
  const u32 = () => { const v = d.getUint32(p); p += 4; return v; }, u16 = () => { const v = d.getUint16(p); p += 2; return v; };
  const vlq = () => { let v = 0, b; do { b = d.getUint8(p++); v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
  if (str(4) !== "MThd") throw new Error("not a MIDI file");
  const hl = u32(); const fmt = u16(), ntr = u16(), div = u16(); p += hl - 6;
  if (div & 0x8000) throw new Error("this MIDI timing format is not supported");
  let tempo = 500000; const tracks = [];
  for (let t = 0; t < ntr && p < d.byteLength; t++) {
    if (str(4) !== "MTrk") throw new Error("broken MIDI track"); const len = u32(), end = p + len;
    let tick = 0, run = 0; const open = {}, notes = [];
    while (p < end) {
      tick += vlq(); let st = d.getUint8(p);
      if (st < 0x80) st = run; else { p++; if (st < 0xF0) run = st; }
      if (st === 0xFF) { const ty = d.getUint8(p++), l = vlq();
        if (ty === 0x51 && l === 3 && tempo === 500000) tempo = (d.getUint8(p) << 16) | (d.getUint8(p + 1) << 8) | d.getUint8(p + 2);
        p += l; continue; }
      if (st === 0xF0 || st === 0xF7) { p += vlq(); continue; }
      const cmd = st & 0xF0, ch = st & 0x0F;
      if (cmd === 0xC0 || cmd === 0xD0) { p += 1; continue; }
      const a = d.getUint8(p++), b = d.getUint8(p++);
      const k = ch * 128 + a;
      if (cmd === 0x90 && b > 0) { (open[k] = open[k] || []).push(tick); }
      else if (cmd === 0x80 || (cmd === 0x90 && b === 0)) { const s = open[k] && open[k].shift(); if (s !== undefined) notes.push({ midi:a, ch, start:s, end:tick }); }
    }
    p = end; tracks.push(notes);
  }
  return { tpq:div, tempo, tracks:tracks.filter(n => n.length), fmt };
}
function stepsFromMidi(mf){
  let all = [];
  if (mf.tracks.length >= 2) mf.tracks.forEach((tr, i) => tr.forEach(n => all.push({ ...n, hand: i === 0 ? "R" : "L" })));
  else { const tr = mf.tracks[0] || []; const chs = uniq(tr.map(n => n.ch));
    tr.forEach(n => all.push({ ...n, hand: chs.length >= 2 ? (n.ch === chs[0] ? "R" : "L") : (n.midi >= 60 ? "R" : "L") })); }
  all.sort((a, b) => a.start - b.start);
  const tol = mf.tpq / 16, steps = [];
  for (const n of all) {
    const q = n.start / mf.tpq, last = steps[steps.length - 1];
    const note = { midi:n.midi, dur:Math.max(0.1, (n.end - n.start) / mf.tpq), hand:n.hand };
    if (last && (n.start - last._tick) <= tol) { if (!last.notes.some(x => x.midi === n.midi)) last.notes.push(note); }
    else steps.push({ t:q, _tick:n.start, bar:0, notes:[note] });
  }
  steps.forEach(s => s.bar = Math.floor(s.t / 4) + 1);   // MIDI has no bar lines we trust; assume 4 beats
  return steps;
}

/* ============ practice (wait mode) ============ */
function cheer(text, soft){ for (const id of ["cheer","cheer2"]) { $(id).textContent = text || ""; $(id).className = soft ? "soft" : ""; }
  clearTimeout(cheer._t); if (text) cheer._t = setTimeout(() => cheer(""), soft ? 2500 : 1800); }
let PR = null, cursorIdx = 0;
const CHEERS = ["Nice!","Great!","Yes!","Lovely!","Super!","Well done!"];
const SOFT = ["Try that one again","Look for the glowing key","Almost — try again"];
function moveCursor(i){
  if (!piece || piece.kind !== "xml" || !osmd) { cursorIdx = i; return; }
  const c = osmd.cursor;
  if (i < cursorIdx) { c.reset(); cursorIdx = 0; }
  while (cursorIdx < i && !c.iterator.EndReached) { c.next(); cursorIdx++; }
  scrollToCursor();
}
function scrollToCursor(){
  try { const el = osmd.cursor.cursorElement, box = $("sheetCard"); if (!el || box.classList.contains("hidden")) return;
    const d = el.getBoundingClientRect().top - box.getBoundingClientRect().top;
    if (d < 0 || d + el.getBoundingClientRect().height > box.clientHeight) box.scrollTo({ top: box.scrollTop + d - 12, behavior:"smooth" });
  } catch (e) {}
}
const expected = (i, hand) => piece.steps[i].notes.filter(n => hand === "both" || n.hand === hand);
function rangeIdx(){
  const from = Math.max(1, +$("barFrom").value || 1), to = Math.max(from, +$("barTo").value || piece.bars);
  let s = piece.steps.findIndex(x => x.bar >= from); if (s < 0) s = 0;
  let e = piece.steps.length - 1; while (e > s && piece.steps[e].bar > to) e--;
  return [s, e];
}
async function openPractice(){
  const meta = findPiece(store.current) || allPieces()[0]; if (!meta) return;
  if (!piece || piece.meta.id !== meta.id) {
    try { await loadPiece(meta); } catch (e) { cheer("Couldn't open this piece: " + e.message, true); return; }
    $("barFrom").value = 1; $("barTo").value = piece.bars; $("barFrom").max = $("barTo").max = piece.bars;
  }
  $("pieceTitle").textContent = meta.title;
  setHandSeg();
  buildKeyboard(piece.lo, piece.hi); kbOct = Math.max(1, Math.floor(piece.lo / 12) - 1); updKbBase();
  fitLayout(); startRun();
}
function setHandSeg(){
  document.querySelectorAll("#handSeg button").forEach(b => b.classList.toggle("active", b.dataset.hand === store.hand));
  document.querySelectorAll("#gHandSeg button").forEach(b => b.classList.toggle("active", b.dataset.hand === store.hand));
}
document.querySelectorAll("#handSeg button, #gHandSeg button").forEach(b => b.onclick = () => {
  if (G && G.running) return; store.hand = b.dataset.hand; save(); setHandSeg();
  if (ui.screen === "practice") startRun(); else prepareGame();
});
function startRun(keepLoop){
  stopListen();
  const [s, e] = rangeIdx();
  PR = { s, e, idx:-1, hand:store.hand, got:new Set(), wrong:false, clean:0, total:0, loops:keepLoop ? (PR ? PR.loops : 0) : 0, missed:{} };
  if (!keepLoop) cheer(handHint());
  goStep(nextPlayable(s));
}
function handHint(){
  const h = store.hand === "R" ? "right hand" : store.hand === "L" ? "left hand" : "both hands";
  return `Play the glowing keys — ${h}`;
}
function nextPlayable(i){ while (i <= PR.e && !expected(i, PR.hand).length) i++; return i; }
function goStep(i){
  if (i > PR.e) return finishRun();
  PR.idx = i; PR.got = new Set(); PR.wrong = false;
  moveCursor(i);
  drawStep();
}
function drawStep(){
  const exp = expected(PR.idx, PR.hand);
  showTargets(new Map(exp.map(n => [n.midi, n.hand])), PR.got);
  const st = piece.steps[PR.idx], pct = Math.round((PR.idx - PR.s) / Math.max(1, PR.e - PR.s) * 100);
  $("progressTxt").textContent = `Bar ${st.bar} of ${piece.bars} · ${pct}%` + (PR.loops ? ` · loop ${PR.loops + 1}` : "");
  if (piece.kind === "midi") drawRoll();
}
function practiceNote(m){
  if (!PR || PR.idx < 0 || PR.idx > PR.e || listening) return;
  const exp = expected(PR.idx, PR.hand).map(n => n.midi);
  if (exp.includes(m)) {
    if (PR.got.has(m)) return;
    PR.got.add(m); flash(m, "ok");
    if (PR.got.size >= exp.length) {
      PR.total++; if (!PR.wrong) PR.clean++;
      if (Math.random() < 0.12) cheer(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
      goStep(nextPlayable(PR.idx + 1));
    } else drawStep();
  } else {
    flash(m, "bad"); PR.wrong = true; PR.missed[PR.idx] = (PR.missed[PR.idx] || 0) + 1;
    cheer(SOFT[Math.floor(Math.random() * SOFT.length)], true);
  }
}
function finishRun(){
  showTargets(new Map());
  const acc = PR.total ? PR.clean / PR.total : 0, id = piece.meta.id, r = rec(id), h = PR.hand;
  const prev = r[h]; r[h] = { best:Math.max(prev ? prev.best : 0, acc), stars:Math.max(prev ? prev.stars : 0, starsFor(acc)) };
  r.plays++; const gameWas = gameOpen(); store.practiceDone = today(); save(); updateGameTab();
  const whole = PR.s === nextPlayableFrom(0) && PR.e === piece.steps.length - 1;
  if ($("loopChk").checked) {
    PR.loops++; cheer(`Loop ${PR.loops}: ${Math.round(acc * 100)}% — again!`);
    setTimeout(() => { if (ui.screen === "practice" && $("loopChk").checked) startRun(true); }, 1200); return;
  }
  confetti();
  const st = starsFor(acc), hname = h === "both" ? "both hands" : h === "R" ? "right hand" : "left hand";
  modal(`<h2>${whole ? "You finished" : "Section done"}!</h2>
    <p><b>${esc(piece.meta.title)}</b> — ${hname}${whole ? "" : `, bars ${$("barFrom").value}–${$("barTo").value}`}</p>
    <div class="big">${"⭐".repeat(st)}${"☆".repeat(3 - st)}</div>
    <p><b>${Math.round(acc * 100)}%</b> of the notes and chords right first time</p>
    ${!gameWas ? `<p>🎮 The game is unlocked for today!</p>` : ""}
    <div class="row"><button class="ghost" id="mAgain">↺ Again</button><button class="ghost" id="mLib">📚 Library</button><button id="mGame">🎮 Game</button></div>`);
  $("mAgain").onclick = () => { closeModal(); startRun(); };
  $("mLib").onclick = () => show("library");
  $("mGame").onclick = () => show("game");
}
const nextPlayableFrom = i => { while (i < piece.steps.length && !expected(i, PR.hand).length) i++; return i; };
$("restartBtn").onclick = () => startRun();
$("barFrom").onchange = $("barTo").onchange = () => startRun();
$("zoomIn").onclick = () => rezoom(0.1); $("zoomOut").onclick = () => rezoom(-0.1);
function rezoom(dz){
  if (!osmd || !piece || piece.kind !== "xml") return;
  store.zoom = Math.min(1.8, Math.max(0.5, Math.round((store.zoom + dz) * 10) / 10)); save();
  osmd.zoom = store.zoom; osmd.render(); const i = cursorIdx; osmd.cursor.reset(); cursorIdx = 0; moveCursor(i);
}

/* ---- listen: plays from the current spot, through the piano if connected ---- */
let listening = false, listenTimers = [];
function stopListen(){
  listenTimers.forEach(clearTimeout); listenTimers = [];
  if (listening) { listening = false; allNotesOff(); $("listenBtn").textContent = "▶ Listen"; if (PR) goStep(PR.idx); }
}
$("listenBtn").onclick = () => {
  if (listening) return stopListen();
  if (!piece || !PR) return;
  listening = true; $("listenBtn").textContent = "■ Stop";
  const spq = 60 / (piece.bpm * 0.85), from = PR.idx, t0 = piece.steps[from].t;
  for (let i = from; i <= PR.e; i++) {
    const st = piece.steps[i];
    listenTimers.push(setTimeout(() => {
      st.notes.forEach(n => playNote(n.midi, n.dur * spq));
      moveCursor(i); showTargets(new Map(st.notes.map(n => [n.midi, n.hand])));
      if (piece.kind === "midi") { PR.idx = i; drawRoll(); }
    }, (st.t - t0) * spq * 1000));
  }
  const endT = piece.steps[PR.e].t + Math.max(1, ...piece.steps[PR.e].notes.map(n => n.dur));
  listenTimers.push(setTimeout(() => { listening = false; $("listenBtn").textContent = "▶ Listen"; allNotesOff(); goStep(from); }, (endT - t0) * spq * 1000 + 300));
};

/* ---- note roll for MIDI pieces (no sheet music in a MIDI file) ---- */
function laneMap(canvas){
  const c = canvas.getBoundingClientRect(), kb = $("kb").getBoundingClientRect(), L = {};
  for (const m in keyEls) { const r = keyEls[m].getBoundingClientRect(); L[m] = { x:(r.left - kb.left) * (c.width / kb.width), w:r.width * (c.width / kb.width), black:isBlack(+m) }; }
  return L;
}
function fitCanvas(cv){ const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return [ctx, W, H]; }
function roundRect(ctx, x, y, w, h, r){ r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.fill(); }
function drawRoll(){
  const cv = $("rollCanvas"); if ($("rollWrap").classList.contains("hidden") || !PR) return;
  const [ctx, W, H] = fitCanvas(cv); if (!W) return; ctx.clearRect(0, 0, W, H);
  const L = laneMap(cv), hitY = H - 10, ppq = 70, t0 = piece.steps[Math.min(PR.idx, piece.steps.length - 1)].t;
  ctx.fillStyle = "#ffd84a"; ctx.fillRect(0, hitY - 2, W, 4);
  for (let i = Math.max(0, PR.idx); i < piece.steps.length; i++) {
    const st = piece.steps[i]; const y0 = hitY - (st.t - t0) * ppq; if (y0 < -50) break;
    for (const n of st.notes) { const l = L[n.midi]; if (!l) continue;
      const mine = PR.hand === "both" || n.hand === PR.hand, h = Math.max(14, n.dur * ppq - 4);
      ctx.fillStyle = !mine ? "rgba(200,190,220,.25)" : n.hand === "R" ? "#5fb0ff" : "#c77dff";
      if (i === PR.idx && PR.got.has(n.midi)) ctx.fillStyle = "#2fb36b";
      roundRect(ctx, l.x + 2, y0 - h, l.w - 4, h, 6); }
  }
}

/* ============ game (falling notes) ============ */
const SPEED = { slow:0.5, medium:0.75, fast:1.0 };
let G = null, raf = 0;
async function prepareGame(){
  const open = gameOpen();
  $("lockCard").classList.toggle("hidden", open); $("gameCard").classList.toggle("hidden", !open); $("gameCanvas").classList.toggle("hidden", !open);
  const meta = findPiece(store.current) || allPieces()[0]; if (!meta) return;
  if (!piece || piece.meta.id !== meta.id) { try { await loadPiece(meta); } catch (e) { return; } $("barFrom").value = 1; $("barTo").value = piece.bars; }
  buildKeyboard(piece.lo, piece.hi); showTargets(new Map()); setHandSeg();
  $("gameTitle").textContent = meta.title;
  document.querySelectorAll("#speedSeg button").forEach(b => b.classList.toggle("active", b.dataset.speed === store.speed));
  $("hudScore").textContent = "0"; $("hudCombo").textContent = "0"; $("hudMsg").textContent = "";
  fitLayout(); if (open) drawGame(0);
}
document.querySelectorAll("#speedSeg button").forEach(b => b.onclick = () => { if (G && G.running) return; store.speed = b.dataset.speed; save(); prepareGame(); });
$("startGameBtn").onclick = () => { if (G && G.running) { stopGame(); prepareGame(); return; } startGame(); };
function startGame(){
  const spq = 60 / (piece.bpm * SPEED[store.speed]);
  const [s, e] = (() => { const from = Math.max(1, +$("barFrom").value || 1), to = Math.max(from, +$("barTo").value || piece.bars);
    let a = piece.steps.findIndex(x => x.bar >= from); if (a < 0) a = 0; let b = piece.steps.length - 1; while (b > a && piece.steps[b].bar > to) b--; return [a, b]; })();
  const now = performance.now() / 1000, lead = 3, base = piece.steps[s].t, notes = [], auto = [];
  for (let i = s; i <= e; i++) for (const n of piece.steps[i].notes) {
    const o = { midi:n.midi, hand:n.hand, t:now + lead + (piece.steps[i].t - base) * spq, len:n.dur * spq, hit:false, miss:false };
    (store.hand === "both" || n.hand === store.hand ? notes : auto).push(o);
  }
  const end = Math.max(...notes.concat(auto).map(n => n.t + n.len)) + 1;
  G = { notes, auto, start:now, end, running:true, score:0, combo:0, best:0, hits:0, msgT:0, lanes:laneMap($("gameCanvas")) };
  $("startGameBtn").textContent = "■ Stop"; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}
function stopGame(){ cancelAnimationFrame(raf); if (G && G.running) { G.running = false; allNotesOff(); } $("startGameBtn").textContent = "▶ Start"; showTargets(new Map()); }
function gameNote(m){
  if (!G || !G.running) return; const now = performance.now() / 1000;
  let best = null; for (const n of G.notes) { if (n.hit || n.miss || n.midi !== m) continue; const d = Math.abs(n.t - now); if (d <= 0.25 && (!best || d < Math.abs(best.t - now))) best = n; }
  if (best) { best.hit = true; G.hits++; G.combo++; G.best = Math.max(G.best, G.combo); G.score += 100 + 10 * Math.min(G.combo, 20);
    flash(m, "ok"); hud(G.combo >= 10 && G.combo % 10 === 0 ? `${G.combo} in a row!` : ""); }
  else flash(m, "bad");
}
function hud(msg){ $("hudScore").textContent = G.score; $("hudCombo").textContent = G.combo; if (msg) { $("hudMsg").textContent = msg; G.msgT = performance.now(); } }
function loop(){
  if (!G || !G.running) return;
  const now = performance.now() / 1000;
  for (const n of G.notes) if (!n.hit && !n.miss && now > n.t + 0.25) { n.miss = true; G.combo = 0; hud(""); }
  for (const n of G.auto) if (!n.hit && now >= n.t) { n.hit = true; playNote(n.midi, n.len, 55); }
  if (G.msgT && performance.now() - G.msgT > 1200) { $("hudMsg").textContent = ""; G.msgT = 0; }
  const soon = new Map(); for (const n of G.notes) if (!n.hit && !n.miss && n.t - now < 0.5 && n.t - now > -0.25) soon.set(n.midi, n.hand);
  showTargets(soon);
  drawGame(now);
  if (now > G.end) return finishGame();
  raf = requestAnimationFrame(loop);
}
function drawGame(now){
  const cv = $("gameCanvas"); if (cv.classList.contains("hidden")) return;
  const [ctx, W, H] = fitCanvas(cv); if (!W) return; ctx.clearRect(0, 0, W, H);
  const L = (G && G.running && G.lanes) || laneMap(cv), hitY = H - 12, pps = 150;
  ctx.strokeStyle = "rgba(255,255,255,.07)"; for (const m in L) if (!L[m].black) { ctx.beginPath(); ctx.moveTo(L[m].x + .5, 0); ctx.lineTo(L[m].x + .5, H); ctx.stroke(); }
  ctx.fillStyle = "#ffd84a"; ctx.fillRect(0, hitY - 2, W, 4);
  if (!G || !G.running) { ctx.fillStyle = "#fff"; ctx.font = "bold 24px Nunito, Segoe UI, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Press ▶ Start, then play each note as it reaches the yellow line", W / 2, H / 2); return; }
  const cd = G.start + 3 - now;
  if (cd > 0) { ctx.fillStyle = "#fff"; ctx.font = "bold 80px Nunito, Segoe UI, sans-serif"; ctx.textAlign = "center"; ctx.fillText(Math.ceil(cd), W / 2, H / 2); }
  for (const list of [G.auto, G.notes]) for (const n of list) {
    const l = L[n.midi]; if (!l) continue;
    const yb = hitY - (n.t - now) * pps, h = Math.max(16, n.len * pps - 4), yt = yb - h; if (yt > H || yb < -10) continue;
    if (list === G.notes && n.hit) { if (now - n.t < 0.25) { ctx.fillStyle = "rgba(47,179,107,.85)"; ctx.fillRect(l.x, hitY - 22, l.w, 22); } continue; }
    ctx.fillStyle = list === G.auto ? "rgba(200,190,220,.22)" : n.miss ? "rgba(160,150,180,.35)" : n.hand === "R" ? "#5fb0ff" : "#c77dff";
    roundRect(ctx, l.x + 2, yt, l.w - 4, h, 6);
  }
}
function finishGame(){
  stopGame(); const total = G.notes.length || 1, acc = G.hits / total, id = piece.meta.id;
  store.games[id] = Math.max(store.games[id] || 0, acc); save(); confetti();
  modal(`<h2>Great playing!</h2><div class="big">🎮 ${G.score}</div>
    <p>You caught <b>${G.hits}</b> of ${G.notes.length} notes (${Math.round(acc * 100)}%)</p><p>Best combo: <b>${G.best}</b></p>
    <div class="row"><button class="ghost" id="mLib">📚 Library</button><button id="mAgain">↺ Again</button></div>`);
  $("mAgain").onclick = () => { closeModal(); startGame(); };
  $("mLib").onclick = () => show("library");
  drawGame(0);
}
window.addEventListener("resize", () => { if (G && G.running) G.lanes = laneMap($("gameCanvas")); else if (ui.screen === "game" && gameOpen()) drawGame(0); if (ui.screen === "practice" && piece && piece.kind === "midi") drawRoll(); });

/* ============ settings, modal, confetti, screen wake ============ */
$("settingsBtn").onclick = () => {
  modal(`<h2>Settings</h2>
    <p style="text-align:left">Player name<br><input type="text" id="setName" maxlength="20" value="${esc(store.name)}" placeholder="e.g. your first name"></p>
    <p style="text-align:left"><label><input type="checkbox" id="setFull" ${store.fullKeys ? "checked" : ""}> Show all 88 keys</label></p>
    <p style="text-align:left"><label><input type="checkbox" id="setOut" ${store.playOnPiano ? "checked" : ""}> "Listen" plays on the real piano (when connected)</label></p>
    <p class="muted small-print" style="text-align:left">Progress is saved on this device only.</p>
    <div class="row"><button class="ghost" id="setReset">Reset progress</button><button id="setOk">Done</button></div>`);
  $("setOk").onclick = () => { store.name = $("setName").value.trim(); store.fullKeys = $("setFull").checked; store.playOnPiano = $("setOut").checked; save(); applyName(); closeModal();
    if (piece && ui.screen !== "library") { buildKeyboard(piece.lo, piece.hi); if (ui.screen === "practice" && PR) drawStep(); } };
  $("setReset").onclick = () => { if (confirm("Delete all stars and scores on this device?")) { store.pieces = {}; store.games = {}; store.practiceDone = ""; save(); closeModal(); show("library"); } };
};
function applyName(){ const t = store.name ? `${store.name}'s Piano` : "Piano Practice"; $("appTitle").textContent = "🎹 " + t; document.title = t; }
function modal(html){ $("modalBox").innerHTML = html; $("modal").classList.add("show"); }
function closeModal(){ $("modal").classList.remove("show"); }
function confetti(){
  const cv = $("confetti"), ctx = cv.getContext("2d"); cv.width = innerWidth; cv.height = innerHeight;
  const cols = ["#ff5fa2","#7b5cff","#3b8cff","#2fb36b","#ffd84a","#ff9a3c"];
  const ps = Array.from({ length:130 }, () => ({ x:Math.random() * cv.width, y:-20 - Math.random() * cv.height * 0.5, vx:(Math.random() - .5) * 2, vy:2 + Math.random() * 3, s:6 + Math.random() * 6, c:cols[Math.floor(Math.random() * cols.length)], r:Math.random() * 6 }));
  const t0 = performance.now();
  (function f(){ const el = performance.now() - t0; ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of ps) { p.x += p.vx; p.y += p.vy; p.r += 0.1; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
    if (el < 2500) requestAnimationFrame(f); else ctx.clearRect(0, 0, cv.width, cv.height); })();
}
let wl = null;
async function wakeLock(on){ try { if (on && !wl && navigator.wakeLock) { wl = await navigator.wakeLock.request("screen"); wl.addEventListener("release", () => wl = null); } else if (!on && wl) { await wl.release(); wl = null; } } catch (e) {} }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && ui.screen !== "library") wakeLock(true); });
$("fsBtn").onclick = () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) {} };
$("soundBtn").onclick = () => { store.sound = !soundOn(); save(); updateSoundBtn(); };

/* fill the screen: sheet / roll / game area get whatever height the keyboard leaves */
function fitLayout(){
  const kb = ($("kb").offsetHeight || 150) + 26, avail = window.innerHeight - kb - 14;
  for (const id of ["sheetCard","rollCanvas","gameCanvas"]) { const el = $(id); const top = el.getBoundingClientRect().top + window.scrollY;
    if (!el.offsetParent) continue; el.style.height = Math.max(160, avail - top - (id === "gameCanvas" ? 0 : 10)) + "px"; }
  if (ui.screen === "practice" && piece && piece.kind === "midi") drawRoll();
}
window.addEventListener("resize", () => setTimeout(fitLayout, 50));

/* ============ start ============ */
(async () => {
  applyName(); updateSoundBtn(); updKbBase();
  await DB.open(); await loadLibrary();
  if (!store.current && library.length) store.current = library[0].id;
  show("library");
})();
