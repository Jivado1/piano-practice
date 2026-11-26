/* Electronic metronome: follows the piece's time signature and tempo, and can be adjusted by hand.
   Clicks are scheduled on the Web Audio clock (look-ahead scheduler), so the beat stays steady. */
"use strict";

store.metro = Object.assign({ vol:70, accent:true, per:{} }, store.metro || {});
const METRO = { on:false, nextT:0, beat:0, timer:0, queue:[], raf:0, taps:[] };
const BEAT_SYMBOL = { 0.5:"♪", 1:"♩", 1.5:"♩.", 2:"half note", 3:"dotted half" };

/* the song's beat: 6/8, 9/8 and 12/8 count in dotted quarters (2, 3, 4 beats); everything else counts the bottom number */
function songBeat(){
  const ts = (piece && piece.timeSig) || { num:4, den:4 };
  const compound = ts.den === 8 && ts.num % 3 === 0 && ts.num > 3;
  const beats = compound ? ts.num / 3 : ts.num, unitQ = compound ? 1.5 : 4 / ts.den;
  return { beats, unitQ, label:`${ts.num}/${ts.den}`, songBpm:Math.round((piece ? piece.bpm : 90) / unitQ) };
}
const metroKey = () => piece ? piece.meta.id : "_free";
function metroCfg(){
  const sb = songBeat(), o = store.metro.per[metroKey()] || {};
  return { bpm:o.bpm || sb.songBpm, beats:o.beats || sb.beats, sb, custom:!!(o.bpm || o.beats) };
}
function setMetro(patch){
  const k = metroKey(), o = Object.assign({}, store.metro.per[k], patch);
  for (const x in o) if (o[x] == null) delete o[x];
  if (Object.keys(o).length) store.metro.per[k] = o; else delete store.metro.per[k];
  save(); renderMetro();
}
const clampBpm = v => Math.max(30, Math.min(240, Math.round(v)));

/* ---- sound + scheduling ---- */
function metroClick(t, accent){
  const ctx = audio(), vol = store.metro.vol / 100; if (vol <= 0) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine"; o.frequency.value = accent ? 1760 : 1175;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((accent ? 0.9 : 0.55) * vol, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.08);
}
function metroSchedule(){
  const ctx = audio(), c = metroCfg(), spb = 60 / c.bpm;
  if (METRO.nextT < ctx.currentTime - 0.2) METRO.nextT = ctx.currentTime + 0.05;   // tab was asleep: don't burst-play missed clicks
  while (METRO.nextT < ctx.currentTime + 0.12) {
    const b = METRO.beat % c.beats;
    metroClick(METRO.nextT, store.metro.accent && b === 0 && c.beats > 1);
    METRO.queue.push({ t:METRO.nextT, b }); METRO.nextT += spb; METRO.beat++;
  }
}
function metroDraw(){
  if (!METRO.on) return;
  const now = audio().currentTime; let hit = null;   // called from the 25 ms scheduler tick
  while (METRO.queue.length && METRO.queue[0].t <= now) hit = METRO.queue.shift();
  if (hit) {
    document.querySelectorAll("#metroDots .dot").forEach((d, i) => d.classList.toggle("lit", i === hit.b));
    const btn = $("metroBtn"); btn.classList.remove("tick", "tick1"); void btn.offsetWidth; btn.classList.add(hit.b === 0 ? "tick1" : "tick");
  }
}
function metroStart(){
  const ctx = audio(); METRO.on = true; METRO.beat = 0; METRO.queue = []; METRO.nextT = ctx.currentTime + 0.08;
  clearInterval(METRO.timer); METRO.timer = setInterval(() => { metroSchedule(); metroDraw(); }, 25); metroSchedule(); renderMetro();
}
function metroStop(){
  if (!METRO.on) return; METRO.on = false; clearInterval(METRO.timer); METRO.queue = [];
  document.querySelectorAll("#metroDots .dot").forEach(d => d.classList.remove("lit")); $("metroBtn").classList.remove("tick", "tick1"); renderMetro();
}
function metroRestartBeat(){ if (METRO.on) { METRO.beat = 0; METRO.queue = []; METRO.nextT = audio().currentTime + 0.08; } }

/* ---- panel ---- */
function renderMetro(){
  const c = metroCfg(), sym = BEAT_SYMBOL[c.sb.unitQ] || "beat";
  $("metroSig").textContent = c.beats === c.sb.beats ? `${c.sb.label} from the music` : `${c.beats} beats per bar (music is ${c.sb.label})`;
  $("mBpm").textContent = c.bpm; $("mUnit").textContent = `${sym} = ${c.bpm}  ·  beats per minute`;
  $("mSlider").value = c.bpm; $("mBeats").value = c.beats; $("mAccent").checked = store.metro.accent; $("mVol").value = store.metro.vol;
  const pct = Math.round(c.bpm / c.sb.songBpm * 100);
  $("mNote").textContent = `Song tempo: ${sym} = ${c.sb.songBpm}${pct !== 100 ? ` · now ${pct}% of the song's speed` : ""}`;
  const dots = $("metroDots"); if (dots.children.length !== c.beats) dots.innerHTML = Array.from({ length:c.beats }, (_, i) => `<span class="dot${i === 0 ? " one" : ""}">${i + 1}</span>`).join("");
  $("mStart").textContent = METRO.on ? "■ Stop" : "▶ Start";
  $("metroBtn").textContent = METRO.on ? `🥁 ${c.bpm}` : "🥁 Metronome"; $("metroBtn").classList.toggle("running", METRO.on);
}
$("metroBtn").onclick = () => { const p = $("metroPanel"); p.classList.toggle("hidden"); if (!p.classList.contains("hidden")) renderMetro(); };
$("metroClose").onclick = () => $("metroPanel").classList.add("hidden");
$("mStart").onclick = () => METRO.on ? metroStop() : metroStart();
$("mMinus").onclick = () => setMetro({ bpm:clampBpm(metroCfg().bpm - 1) });
$("mPlus").onclick = () => setMetro({ bpm:clampBpm(metroCfg().bpm + 1) });
for (const [id, d] of [["mMinus", -1], ["mPlus", 1]]) {   // hold −/+ to change quickly
  let t = 0, r = 0; const b = $(id), stop = () => { clearTimeout(t); clearInterval(r); };
  b.addEventListener("pointerdown", () => { t = setTimeout(() => { r = setInterval(() => setMetro({ bpm:clampBpm(metroCfg().bpm + d * 2) }), 90); }, 450); });
  for (const ev of ["pointerup","pointerleave","pointercancel"]) b.addEventListener(ev, stop);
}
$("mSlider").oninput = e => setMetro({ bpm:clampBpm(+e.target.value) });
$("mBeats").onchange = e => { const v = +e.target.value; setMetro({ beats:v === songBeat().beats ? null : v }); metroRestartBeat(); };
$("mAccent").onchange = e => { store.metro.accent = e.target.checked; save(); };
$("mVol").oninput = e => { store.metro.vol = +e.target.value; save(); };
document.querySelectorAll("#metroPanel [data-pct]").forEach(b => b.onclick = () => {
  const p = +b.dataset.pct; setMetro({ bpm:p === 100 ? null : clampBpm(songBeat().songBpm * p / 100) }); });
$("mTap").onclick = () => {
  const now = performance.now(), T = METRO.taps;
  if (T.length && now - T[T.length - 1] > 2000) T.length = 0;
  T.push(now); if (T.length > 6) T.shift();
  if (T.length >= 2) { const gaps = T.slice(1).map((x, i) => x - T[i]); setMetro({ bpm:clampBpm(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length)) }); metroRestartBeat(); }
  $("mTap").textContent = `👆 Tap (${T.length})`; clearTimeout($("mTap")._t); $("mTap")._t = setTimeout(() => $("mTap").textContent = "👆 Tap", 2000);
};
$("mBeats").innerHTML = Array.from({ length:12 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
