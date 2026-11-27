/* Stage 2: practice minutes, streaks + freezes, stickers, tricky spots, recorder,
   parent screen (hold 3 s + 4-digit code), export / import of progress.  Loaded after app.js. */
"use strict";

const noteName = m => NAMES[m % 12].replace("#", "♯") + (Math.floor(m / 12) - 1);
const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
const dayKey = off => { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
function day(d = today()){ return store.days[d] || (store.days[d] = { sec:0, runs:0, game:false }); }

/* ============ practice minutes ============ */
/* Time between two notes counts as practice if the gap is under 20 s (thinking pauses count, walking away doesn't). */
let lastNoteAt = 0, watchOn = false;
function onActivity(m, vel){
  if (REC.on) REC.events.push([performance.now() - REC.t0, 0x90, m, vel]);
  if (watchOn) clearWatch();
  if (!["practice","game"].includes(ui.screen)) return;
  const now = Date.now();
  if (lastNoteAt && now - lastNoteAt < 20000) day().sec += (now - lastNoteAt) / 1000;
  lastNoteAt = now;
  if (!onActivity._t || now - onActivity._t > 5000) { onActivity._t = now; save(); if (updateStreak()) renderStreakPill(); }
}
function trackMiss(midis){
  for (const m of midis) { store.missNotes[m] = (store.missNotes[m] || 0) + 1; if (PR) { PR.missNotes = PR.missNotes || {}; PR.missNotes[m] = (PR.missNotes[m] || 0) + 1; } }
}
function logResult(o){ store.log.push(Object.assign({ d:today(), t:Date.now() }, o)); if (store.log.length > 1500) store.log.splice(0, store.log.length - 1500); }

/* ============ streaks (with freezes, never a guilt message) ============ */
const dayCounts = D => D.sec >= store.goalMin * 60 || D.runs >= 3;
function updateStreak(){
  const d = today(); if (!dayCounts(day(d))) return false;
  const s = store.streak; if (s.lastDay === d) return false;
  if (!s.lastDay) s.count = 1;
  else { const gap = daysBetween(s.lastDay, d) - 1;
    if (gap <= 0) s.count++; else if (gap <= s.freezes) { s.freezes -= gap; s.count++; } else s.count = 1; }
  s.lastDay = d; s.longest = Math.max(s.longest, s.count);
  if (s.count % 7 === 0) s.freezes = Math.min(2, s.freezes + 1);
  save(); return true;
}
function currentStreak(){
  const s = store.streak; if (!s.lastDay) return 0;
  const gap = daysBetween(s.lastDay, today()) - 1;
  return gap <= s.freezes ? s.count : 0;
}
function renderStreakPill(){
  const n = currentStreak(), f = store.streak.freezes;
  $("streakPill").textContent = `🔥 ${n}` + (f ? ` · 🧊${f}` : "");
  $("streakPill").title = `Practice streak: ${n} day${n === 1 ? "" : "s"}. Freezes saved: ${f} (each covers one missed day).`;
}
function welcomeBack(){
  const s = store.streak; if (!s.lastDay || store.welcomed === today()) return;
  if (daysBetween(s.lastDay, today()) >= 2) { store.welcomed = today(); save(); cheerToast(`Welcome back${store.name ? ", " + store.name : ""}! 🎹`); }
}
function cheerToast(text){ modal(`<h2>${esc(text)}</h2><div class="row"><button id="mOk">Let's play</button></div>`); $("mOk").onclick = closeModal; }

/* ============ stickers ============ */
const finishedCount = () => Object.values(store.pieces).filter(r => r.both || r.R || r.L).length;
const STICKERS = [
  { id:"first",   e:"🎵", name:"First piece finished",        test:c => c.type === "practice" && c.whole },
  { id:"both",    e:"🙌", name:"Both hands together",         test:c => c.type === "practice" && c.whole && c.h === "both" },
  { id:"three",   e:"🌟", name:"First 3-star piece",          test:c => c.type === "practice" && c.whole && c.acc >= 0.95 },
  { id:"goal",    e:"⏱️", name:"Hit the daily practice goal", test:() => day().sec >= store.goalMin * 60 },
  { id:"loop5",   e:"🔁", name:"Looped a tricky bit 5 times", test:c => c.type === "practice" && c.loops >= 5 },
  { id:"rec",     e:"🎙️", name:"First recording",             test:c => c.type === "rec" },
  { id:"combo25", e:"🎮", name:"25 in a row in the game",     test:c => c.type === "game" && c.best >= 25 },
  { id:"grade2",  e:"🥈", name:"Finished a Grade 2 piece",    test:c => c.type === "practice" && c.whole && c.h === "both" && c.grade === 2 },
  { id:"grade3",  e:"🎓", name:"Finished a Grade 3 piece",    test:c => c.type === "practice" && c.whole && c.h === "both" && c.grade === 3 },
  { id:"grade4",  e:"🏔️", name:"Finished a Grade 4 piece",    test:c => c.type === "practice" && c.whole && c.h === "both" && c.grade === 4 },
  { id:"ten",     e:"📚", name:"10 different pieces",         test:() => finishedCount() >= 10 },
  { id:"streak7", e:"🔥", name:"7-day streak",                test:() => store.streak.count >= 7 },
  { id:"streak30",e:"🏆", name:"30-day streak",               test:() => store.streak.count >= 30 },
];
function checkStickers(c){
  const got = []; for (const s of STICKERS) if (!store.stickers[s.id] && s.test(c || {})) { store.stickers[s.id] = today(); got.push(s); }
  if (got.length) save(); return got;
}
const stickersHtml = list => list && list.length ? `<p>🎉 New sticker${list.length > 1 ? "s" : ""}: <b>${list.map(s => s.e + " " + s.name).join(", ")}</b></p>` : "";
function stickerToast(list){ cheer("New sticker: " + list.map(s => s.e + " " + s.name).join(", ")); }
function renderStickers(){
  const n = currentStreak(), s = store.streak;
  const stars = Array.from({ length:Math.min(n, 14) }, () => "⭐").join("") + (n > 14 ? " +" + (n - 14) : "");
  $("stickerBody").innerHTML = `
    <div class="card"><div class="big-label">🔥 Practice streak: ${n} day${n === 1 ? "" : "s"}</div>
      <div class="streakstars">${stars || "Play today to start a streak!"}</div>
      <p class="muted">Longest: ${s.longest} · Freezes saved: ${"🧊".repeat(s.freezes) || "none yet"} <span class="small-print">(you earn one every 7 days — it covers a missed day)</span></p>
      <p class="muted small-print">A day counts when you practise ${store.goalMin} minutes or finish 3 pieces. Today: ${Math.round(day().sec / 60)} min, ${day().runs} finished.</p></div>
    <div class="stickergrid">${STICKERS.map(st => `<div class="sticker ${store.stickers[st.id] ? "got" : ""}"><div class="e">${st.e}</div><div>${st.name}</div>${store.stickers[st.id] ? `<div class="small-print muted">${store.stickers[st.id]}</div>` : ""}</div>`).join("")}</div>`;
}

/* ============ after a run / a game ============ */
function afterPractice(acc, h, whole, looping){
  const D = day(); if (whole && !looping) D.runs++;
  logResult({ id:piece.meta.id, title:piece.meta.title, mode:"practice", hand:h, acc:Math.round(acc * 100), whole,
              bars:`${$("barFrom").value}-${$("barTo").value}`, min:Math.round(D.sec / 60) });
  save(); updateStreak(); renderStreakPill();
  return checkStickers({ type:"practice", acc, h, whole, grade:piece.meta.grade, loops:looping ? (PR.loops + 1) : 0 });
}
function afterGame(acc, best){
  day().game = true;
  logResult({ id:piece.meta.id, title:piece.meta.title, mode:"game", hand:store.hand, acc:Math.round(acc * 100), speed:store.speed });
  save(); updateStreak(); renderStreakPill();
  return checkStickers({ type:"game", acc, best });
}

/* ============ tricky spots ============ */
function trickyBars(){
  const by = {}; for (const i in (PR.missed || {})) { const b = piece.steps[i].bar; by[b] = (by[b] || 0) + PR.missed[i]; }
  return Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => +x[0]);
}
function trickyNotes(){ return Object.entries(PR.missNotes || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => +x[0]); }
function trickyHtml(){
  const bars = trickyBars(), notes = trickyNotes();
  if (!bars.length) return `<p>🎯 No tricky spots — every note right first time!</p>`;
  for (const m of notes) if (keyEls[m]) keyEls[m].classList.add("watch");
  watchOn = notes.length > 0;
  return `<p>Tricky spot${bars.length > 1 ? "s" : ""}: <b>${bars.map(b => "bar " + b).join(", ")}</b></p>
    ${notes.length ? `<p>Notes to watch (glowing): <b>${notes.map(noteName).join(", ")}</b></p>` : ""}
    <div class="row"><button class="ghost" id="mTricky">🔁 Practise bar ${bars[0]} slowly, on a loop</button></div>
    <p class="muted small-print">${trickyTip(bars[0])}</p>`;
}
function trickyTip(bar){
  const tips = [`Bar ${bar} was tricky. Play it slowly, one hand at a time first.`, `Try bar ${bar} hands separately, then together.`, `Say the note names out loud in bar ${bar} as you play.`];
  return tips[Math.floor(Math.random() * tips.length)];
}
function wireTricky(){
  const b = $("mTricky"); if (!b) return; const bar = trickyBars()[0];
  b.onclick = () => { closeModal(); $("barFrom").value = bar; $("barTo").value = bar; setRepeat(true); startRun(); cheer(`Looping bar ${bar} — take it slowly`); };
}
function clearWatch(){ watchOn = false; document.querySelectorAll(".key.watch").forEach(k => k.classList.remove("watch")); }

/* ============ recorder ============
   Two kinds: the notes from the piano cable (plays back on the piano, downloads as .mid), or sound from the microphone
   (for when the cable isn't plugged in). "Record with" in the parent settings: auto = cable if the piano is connected, else the mic. */
const REC = { on:false, t0:0, events:[], timer:0, mr:null, stream:null, chunks:[], mime:"" };
function recNoteOff(m){ if (REC.on) REC.events.push([performance.now() - REC.t0, 0x80, m, 0]); }
const recUsesMic = () => store.recWith === "mic" || (store.recWith !== "piano" && !midiIn);
async function micStart(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { cheer("This browser can't record from the microphone", true); return false; }
  try {   // switch off the phone-call processing: it treats a piano as noise and squashes it
    REC.stream = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false } });
  } catch (e) { cheer("The microphone is blocked: tap the icon left of the address bar and allow the microphone", true); return false; }
  REC.mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find(t => MediaRecorder.isTypeSupported(t)) || "";
  REC.chunks = [];
  REC.mr = new MediaRecorder(REC.stream, REC.mime ? { mimeType:REC.mime, audioBitsPerSecond:128000 } : {});
  REC.mr.ondataavailable = e => { if (e.data && e.data.size) REC.chunks.push(e.data); };
  REC.mr.start(1000); return true;
}
async function micStop(){
  const mr = REC.mr; if (!mr) return null;
  await new Promise(res => { mr.onstop = res; try { mr.stop(); } catch (e) { res(); } });
  REC.stream.getTracks().forEach(t => t.stop());
  const mime = mr.mimeType || REC.mime || "audio/webm", blob = new Blob(REC.chunks, { type:mime });
  REC.mr = REC.stream = null; REC.chunks = [];
  return { audio:await blob.arrayBuffer(), mime };
}
$("recBtn").onclick = async () => {
  if (!REC.on) {
    const mic = recUsesMic();
    if (mic && !(await micStart())) return;
    REC.on = true; REC.t0 = performance.now(); REC.events = []; $("recBtn").classList.add("recording");
    const tick = () => { const s = Math.floor((performance.now() - REC.t0) / 1000); $("recBtn").textContent = `■ Stop ${mic ? "🎤 " : ""}${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
    tick(); REC.timer = setInterval(tick, 500);
    if (mic) cheer("🎤 Recording with the microphone: play when you're ready");
    return;
  }
  REC.on = false; clearInterval(REC.timer); $("recBtn").classList.remove("recording"); $("recBtn").textContent = "🎙 Record";
  const dur0 = performance.now() - REC.t0, snd = await micStop(), ev = REC.events.slice();
  if (snd && dur0 < 1500) { cheer("That was too short, so nothing was saved", true); return; }
  if (!snd && !ev.some(e => e[1] === 0x90)) { cheer("Nothing was played, so nothing was saved", true); return; }
  const lastT = ev.length ? Math.max(...ev.map(e => e[0])) : 0, dur = Math.max(dur0, lastT + 300);
  for (const m of new Set(ev.filter(e => e[1] === 0x90).map(e => e[2]))) {   // close any notes still held
    const on = ev.filter(e => e[2] === m && e[1] === 0x90).length, off = ev.filter(e => e[2] === m && e[1] === 0x80).length;
    for (let i = off; i < on; i++) ev.push([dur, 0x80, m, 0]);
  }
  const r = { id:"rec-" + Date.now(), title:(piece ? piece.meta.title : "Free play"), when:new Date().toLocaleString(), dur, events:ev };
  if (snd) Object.assign(r, snd);
  const ok = await DB.put(r, "recordings");
  const st = checkStickers({ type:"rec" });
  cheer(ok ? "Saved! Find it in the Library under My recordings" : "Sorry — this browser would not save the recording", !ok);
  if (st.length) setTimeout(() => stickerToast(st), 2000);
};
let playTimers = [];
let playAudio = null;
function stopPlayback(){ playTimers.forEach(clearTimeout); playTimers = [];
  if (playAudio) { playAudio.pause(); URL.revokeObjectURL(playAudio.src); playAudio = null; }
  allNotesOff(); document.querySelectorAll(".recplay").forEach(b => b.textContent = "▶ Play"); }
function playRecording(r, btn){
  if (playTimers.length || playAudio) { stopPlayback(); return; }
  btn.textContent = "■ Stop";
  if (r.audio) {   // a microphone recording: play the sound through the tablet's speaker
    playAudio = new Audio(URL.createObjectURL(new Blob([r.audio], { type:r.mime })));
    playAudio.onended = stopPlayback; playAudio.play().catch(() => { stopPlayback(); cheer("Couldn't play this recording", true); });
    return;
  }
  const ons = {}; const notes = [];
  for (const [t, c, m, v] of r.events.slice().sort((a, b) => a[0] - b[0])) {
    if (c === 0x90) (ons[m] = ons[m] || []).push([t, v]);
    else { const o = ons[m] && ons[m].shift(); if (o) notes.push({ m, t:o[0], len:(t - o[0]) / 1000, v:o[1] }); }
  }
  for (const n of notes) playTimers.push(setTimeout(() => playNote(n.m, n.len, n.v), n.t));
  playTimers.push(setTimeout(stopPlayback, r.dur + 400));
}
function midiFile(r){   // Standard MIDI File, format 0, 480 ticks per quarter at 120 bpm (1 tick = 1.0417 ms)
  const bytes = [], vlq = n => { const s = [n & 0x7f]; while ((n >>= 7)) s.unshift((n & 0x7f) | 0x80); return s; };
  const ev = r.events.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  bytes.push(0x00, 0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20);
  let last = 0;
  for (const [t, c, m, v] of ev) { const tick = Math.round(t * 0.96); bytes.push(...vlq(Math.max(0, tick - last)), c, m & 0x7f, v & 0x7f); last = Math.max(last, tick); }
  bytes.push(0x00, 0xFF, 0x2F, 0x00);
  const hdr = [0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1, 0x01,0xE0];
  const L = bytes.length, trk = [0x4D,0x54,0x72,0x6B, (L >>> 24) & 255, (L >>> 16) & 255, (L >>> 8) & 255, L & 255];
  return new Blob([new Uint8Array(hdr.concat(trk, bytes))], { type:"audio/midi" });
}
function download(blob, name){ const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
async function renderRecordings(){
  const list = (await DB.all("recordings")).sort((a, b) => b.id.localeCompare(a.id));
  const box = $("recList");
  box.innerHTML = `<div class="grade"><h2>🎙️ My recordings</h2></div>` + (list.length ? "" : `<p class="muted">Press <b>🎙 Record</b> on the Practice screen to record yourself: the notes from the piano cable, or the sound from the microphone if the piano isn't plugged in. Recordings stay on this device.</p>`);
  for (const r of list) {
    const row = document.createElement("div"); row.className = "card row recrow";
    const s = Math.round(r.dur / 1000), notes = (r.events || []).filter(e => e[1] === 0x90).length;
    const what = r.audio ? `🎤 microphone · ${r.audio.byteLength < 1048576 ? Math.max(1, Math.round(r.audio.byteLength / 1024)) + " KB" : (r.audio.byteLength / 1048576).toFixed(1) + " MB"}` : `🎹 ${notes} notes`;
    const ext = r.audio ? (/mp4/.test(r.mime) ? "m4a" : /ogg/.test(r.mime) ? "ogg" : "webm") : "mid";
    row.innerHTML = `<div><b>${esc(r.title)}</b><div class="muted small-print">${esc(r.when)} · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} · ${what}</div></div><span class="spacer"></span>
      <button class="small recplay">▶ Play</button><button class="ghost small recdl">⬇ .${ext}</button><button class="ghost small recdel">✕</button>`;
    row.querySelector(".recplay").onclick = e => playRecording(r, e.target);
    row.querySelector(".recdl").onclick = () => download(r.audio ? new Blob([r.audio], { type:r.mime }) : midiFile(r), `${r.title.replace(/[^\w\- ]+/g, "")} ${r.id.slice(4)}.${ext}`);
    row.querySelector(".recdel").onclick = async () => { if (confirm("Delete this recording?")) { await DB.del(r.id, "recordings"); renderRecordings(); } };
    box.appendChild(row);
  }
}

/* ============ parent gate: hold 3 s, then a 4-digit code ============ */
(() => {
  const b = $("parentBtn"); let t = 0;
  const cancel = () => { clearTimeout(t); b.classList.remove("holding"); };
  b.addEventListener("pointerdown", e => { e.preventDefault(); b.classList.add("holding"); t = setTimeout(() => { cancel(); b._held = Date.now(); askPin(); }, 3000); });
  for (const ev of ["pointerup","pointerleave","pointercancel"]) b.addEventListener(ev, cancel);
})();
function askPin(){
  if (!store.pin) {
    modal(`<h2>Set a parent code</h2><p>Choose 4 digits. You'll need them to open the parent screen.</p>
      <p><input type="password" inputmode="numeric" maxlength="4" id="pin1" placeholder="4 digits"></p>
      <p><input type="password" inputmode="numeric" maxlength="4" id="pin2" placeholder="again"></p><p id="pinMsg" class="muted"></p>
      <div class="row"><button class="ghost" id="pinNo">Cancel</button><button id="pinOk">Save</button></div>`);
    $("pin1").focus(); $("pinNo").onclick = closeModal;
    $("pinOk").onclick = () => { const a = $("pin1").value, b = $("pin2").value;
      if (!/^\d{4}$/.test(a)) return $("pinMsg").textContent = "Please use exactly 4 digits.";
      if (a !== b) return $("pinMsg").textContent = "The two codes don't match.";
      store.pin = a; save(); show("parent"); };
    return;
  }
  modal(`<h2>Parent code</h2><p><input type="password" inputmode="numeric" maxlength="4" id="pinIn" placeholder="4 digits"></p><p id="pinMsg" class="muted"></p>
    <div class="row"><button class="ghost" id="pinNo">Cancel</button><button id="pinOk">Open</button></div>`);
  $("pinIn").focus(); $("pinNo").onclick = closeModal;
  const go = () => { if ($("pinIn").value === store.pin) show("parent"); else { $("pinMsg").textContent = "That's not the code."; $("pinIn").value = ""; } };
  $("pinOk").onclick = go; $("pinIn").onkeydown = e => { if (e.key === "Enter") go(); };
}

/* ============ parent screen ============ */
function chartSvg(){
  const days = Array.from({ length:14 }, (_, i) => dayKey(i - 13));
  const mins = days.map(d => Math.round(((store.days[d] || {}).sec || 0) / 60));
  const goal = store.goalMin, max = Math.max(goal * 1.3, ...mins, 5), W = 700, H = 200, bw = W / 14;
  const y = v => H - 24 - (v / max) * (H - 44);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Minutes practised per day, last 14 days">`;
  s += `<line x1="0" x2="${W}" y1="${y(goal)}" y2="${y(goal)}" stroke="#ff9a3c" stroke-dasharray="6 5" stroke-width="2"/><text x="${W - 4}" y="${y(goal) - 5}" text-anchor="end" font-size="13" fill="#c26a12">goal ${goal} min</text>`;
  days.forEach((d, i) => { const v = mins[i], x = i * bw + 6, w = bw - 12;
    s += `<rect x="${x}" y="${y(v)}" width="${w}" height="${Math.max(0, H - 24 - y(v))}" rx="5" fill="${v >= goal ? "#2fb36b" : "#7b5cff"}"/>`;
    if (v) s += `<text x="${x + w / 2}" y="${y(v) - 5}" text-anchor="middle" font-size="13" fill="#2b2340">${v}</text>`;
    s += `<text x="${x + w / 2}" y="${H - 6}" text-anchor="middle" font-size="12" fill="#7a7290">${+d.slice(8)}</text>`; });
  return s + `</svg>`;
}
function renderParent(){
  const D = day(), s = store.streak;
  const miss = Object.entries(store.missNotes).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const rows = Object.entries(store.pieces).filter(([, r]) => r.plays).map(([id, r]) => {
    const meta = findPiece(id), title = meta ? meta.title : id;
    const trend = store.log.filter(l => l.id === id && l.mode === "practice" && l.whole).slice(-5).map(l => l.acc + "%").join(" → ");
    const f = x => x ? `${Math.round(x.best * 100)}% ${"⭐".repeat(x.stars)}` : "—";
    return `<tr><td>${esc(title)}</td><td>${r.plays}</td><td>${f(r.both)}</td><td>${f(r.R)}</td><td>${f(r.L)}</td><td class="small-print">${trend || "—"}</td></tr>`; }).join("");
  const recent = store.log.slice(-10).reverse().map(l => `<tr><td>${l.d}</td><td>${esc(l.title || l.id)}</td><td>${l.mode}${l.mode === "practice" ? (l.whole ? "" : " (bars " + l.bars + ")") : " (" + l.speed + ")"}</td><td>${l.hand}</td><td>${l.acc}%</td></tr>`).join("");
  $("parentBody").innerHTML = `
  <div class="pgrid">
    <div class="card"><h3>Today</h3>
      <p class="bigstat">${Math.round(D.sec / 60)} <span>/ ${store.goalMin} min</span></p>
      <p>Finished pieces today: <b>${D.runs}</b> · Practice done: <b>${store.practiceDone === today() ? "yes ✅" : "not yet"}</b> · Game played: <b>${D.game ? "yes" : "no"}</b></p>
      <p>Streak: <b>${currentStreak()}</b> days · longest <b>${s.longest}</b> · freezes <b>${s.freezes}</b></p></div>
    <div class="card"><h3>Most-missed notes</h3>
      ${miss.length ? `<p class="bigstat">${miss.map(([m, n]) => `${noteName(+m)} <span>×${n}</span>`).join(" &nbsp; ")}</p>` : "<p class='muted'>Nothing yet.</p>"}
      <p class="muted small-print">Counted when a wrong key was pressed while this note was expected.</p></div>
  </div>
  <div class="card"><h3>Minutes practised — last 14 days</h3>${chartSvg()}</div>
  <div class="card"><h3>Pieces</h3>${rows ? `<div class="tablewrap"><table><tr><th>Piece</th><th>Runs</th><th>Both hands</th><th>Right</th><th>Left</th><th>Last 5 full runs</th></tr>${rows}</table></div>` : "<p class='muted'>No pieces played yet.</p>"}</div>
  <div class="card"><h3>Recent activity</h3>${recent ? `<div class="tablewrap"><table><tr><th>Date</th><th>Piece</th><th>Mode</th><th>Hand</th><th>Score</th></tr>${recent}</table></div>` : "<p class='muted'>Nothing yet.</p>"}</div>
  <div class="card"><h3>Settings</h3>
    <div class="settings">
      <label>Player name <input type="text" id="sName" maxlength="20" value="${esc(store.name)}"></label>
      <label>Daily goal (minutes) <input type="number" id="sGoal" min="1" max="120" value="${store.goalMin}"></label>
      <label><input type="checkbox" id="sGameLock" ${store.gameNeedsPractice ? "checked" : ""}> Game unlocks only after a practice run each day</label>
      <label>Game speed <select id="sSpeed">${["slow","medium","fast"].map(v => `<option ${store.speed === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label>Laptop/tablet sound <select id="sSound"><option value="auto" ${store.sound === null ? "selected" : ""}>auto (off when the piano is connected)</option><option value="on" ${store.sound === true ? "selected" : ""}>on</option><option value="off" ${store.sound === false ? "selected" : ""}>off</option></select></label>
      <label><input type="checkbox" id="sFull" ${store.fullKeys ? "checked" : ""}> Show all 88 keys</label>
      <label><input type="checkbox" id="sOut" ${store.playOnPiano ? "checked" : ""}> Listen and recordings play on the real piano</label>
      <label>Record with <select id="sRec"><option value="auto" ${store.recWith === "auto" ? "selected" : ""}>auto (piano cable if connected, else microphone)</option><option value="piano" ${store.recWith === "piano" ? "selected" : ""}>piano cable only</option><option value="mic" ${store.recWith === "mic" ? "selected" : ""}>microphone</option></select></label>
      <label>New parent code <input type="password" inputmode="numeric" maxlength="4" id="sPin" placeholder="leave empty to keep"></label>
    </div>
    <div class="row"><button id="sSave">Save settings</button><span id="sMsg" class="muted"></span></div></div>
  <div class="card"><h3>Move progress between devices</h3>
    <p class="muted">Export downloads one file with stars, streaks, stickers, added pieces and recordings. Import it on the other device (it replaces that device's progress).</p>
    <div class="row"><button id="pExport">⬇ Export progress</button>
      <label class="button-like">⬆ Import progress<input type="file" id="pImport" accept=".json,application/json" hidden></label>
      <span class="spacer"></span><button class="ghost" id="pReset">Reset progress…</button></div></div>`;
  $("sSave").onclick = () => {
    store.name = $("sName").value.trim(); store.goalMin = Math.min(120, Math.max(1, +$("sGoal").value || 15));
    store.gameNeedsPractice = $("sGameLock").checked; store.speed = $("sSpeed").value;
    store.sound = { auto:null, on:true, off:false }[$("sSound").value]; store.fullKeys = $("sFull").checked; store.playOnPiano = $("sOut").checked; store.recWith = $("sRec").value;
    const p = $("sPin").value; if (p && !/^\d{4}$/.test(p)) { $("sMsg").textContent = "The code must be 4 digits."; return; } if (p) store.pin = p;
    save(); applyName(); updateSoundBtn(); updateGameTab(); renderStreakPill(); $("sMsg").textContent = "Saved ✓";
  };
  $("pExport").onclick = exportProgress;
  $("pImport").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) importProgress(f); };
  $("pReset").onclick = () => {
    if (!confirm("Delete ALL stars, streaks, stickers and history on this device? (Added pieces and recordings are kept.)")) return;
    if (!confirm("Are you sure? This cannot be undone.")) return;
    Object.assign(store, { pieces:{}, games:{}, practiceDone:"", days:{}, log:[], missNotes:{}, streak:{ count:0, lastDay:null, longest:0, freezes:0 }, stickers:{} });
    save(); renderStreakPill(); renderParent();
  };
}
$("parentClose").onclick = () => show("library");

/* ============ export / import ============ */
function b64(buf){ const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s){ const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; }
async function exportProgress(){
  const pieces = (await DB.all("pieces")).map(p => p.data instanceof ArrayBuffer ? Object.assign({}, p, { data:{ b64:b64(p.data) } }) : p);
  const recordings = (await DB.all("recordings")).map(r => r.audio instanceof ArrayBuffer ? Object.assign({}, r, { audio:{ b64:b64(r.audio) } }) : r);
  const blob = new Blob([JSON.stringify({ app:"piano-practice", v:2, exported:new Date().toISOString(), store, pieces, recordings })], { type:"application/json" });
  download(blob, `piano-progress-${today()}.json`);
}
async function importProgress(f){
  let d; try { d = JSON.parse(await f.text()); } catch (e) { alert("That file isn't a progress file."); return; }
  if (!d || d.app !== "piano-practice" || !d.store) { alert("That file isn't a progress file from this app."); return; }
  if (!confirm(`Replace the progress on this device with the file exported ${String(d.exported || "").slice(0, 10)}?`)) return;
  store = Object.assign({}, store, d.store); save();
  for (const p of d.pieces || []) await DB.put(p.data && p.data.b64 ? Object.assign({}, p, { data:unb64(p.data.b64) }) : p, "pieces");
  for (const r of d.recordings || []) await DB.put(r.audio && r.audio.b64 ? Object.assign({}, r, { audio:unb64(r.audio.b64) }) : r, "recordings");
  await loadLibrary(); applyName(); updateSoundBtn(); updateGameTab(); renderStreakPill(); renderParent();
  alert("Progress imported ✓");
}

/* ============ start ============ */
(async () => {
  applyName(); updateSoundBtn(); updKbBase(); renderStreakPill();
  await DB.open(); await loadLibrary();
  if (!store.current && library.length) store.current = library[0].id;
  show("library"); welcomeBack();
  if (typeof maybeFirstRunHelp === "function" && !document.getElementById("modal").classList.contains("show")) maybeFirstRunHelp();
})();
