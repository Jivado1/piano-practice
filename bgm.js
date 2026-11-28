"use strict";
/* ============ background music ============
   A gentle, original 16-bar piano tune (C major, I–vi–IV–V), played with the app's own grand-piano samples, so there is
   no music file to download or license. It plays on Home, Library and Stickers, fades out when Practice or the Game
   opens (or a recording plays), and fades back in afterwards. Every other time round it plays an octave up, softer,
   like a music box. 🎶 in the top bar switches it on/off (saved for this device); the 🔇 speaker switch silences it too.
   Browsers only allow sound after the first tap, so on a fresh start it begins with the first touch. */
(() => {
  const BPM = 80, BEAT = 60 / BPM, BAR = 4 * BEAT, VOL = 0.32;
  const N = s => { const m = /^([A-G])(#?)(\d)$/.exec(s); return 12 * (+m[3] + 1) + "C D EF G A B".indexOf(m[1]) + (m[2] ? 1 : 0); };
  /* chords: [root, minor?, seventh?] */
  const CH = { C:[48,0], Am:[45,1], F:[41,0], G:[43,0], Em:[40,1], G7:[43,0,1] };
  const SONG = [   // [chord, right-hand notes [beat, note, beats]]
    ["C",  [[0,"E5",1],[1,"G5",1],[2,"E5",1],[3,"D5",1]]],
    ["Am", [[0,"C5",1.5],[1.5,"E5",0.5],[2,"A5",2]]],
    ["F",  [[0,"A5",1],[1,"G5",1],[2,"F5",1],[3,"A5",1]]],
    ["G",  [[0,"G5",3],[3,"D5",1]]],
    ["C",  [[0,"E5",1],[1,"G5",1],[2,"C6",1],[3,"B5",1]]],
    ["Am", [[0,"A5",1.5],[1.5,"G5",0.5],[2,"E5",2]]],
    ["F",  [[0,"F5",1],[1,"A5",1],[2,"G5",1],[3,"D5",1]]],
    ["C",  [[0,"C5",3]]],
    ["F",  [[0,"A5",1],[1,"C6",1],[2,"A5",1],[3,"F5",1]]],
    ["G",  [[0,"G5",1],[1,"B5",1],[2,"D6",2]]],
    ["Em", [[0,"G5",1],[1,"E5",1],[2,"B5",1.5],[3.5,"A5",0.5]]],
    ["Am", [[0,"A5",3],[3,"E5",1]]],
    ["F",  [[0,"F5",1],[1,"A5",1],[2,"C6",1],[3,"A5",1]]],
    ["G",  [[0,"G5",1],[1,"F5",0.5],[1.5,"E5",0.5],[2,"D5",2]]],
    ["C",  [[0,"E5",1],[1,"G5",1],[2,"C6",1],[3,"G5",1]]],
    ["G7", [[0,"F5",1],[1,"D5",1],[2,"B4",2]]],
  ].map(([c, rh]) => [c, rh.map(([b, n, d]) => [b, N(n), d])]);
  const ON_SCREENS = new Set(["home", "library", "stickers", "parent"]);

  let bus = null, timer = 0, nextBar = 0, barT = 0, playing = false, ducked = false, screen = "home";
  const wanted = () => store.bgm !== false && store.sound !== false && ON_SCREENS.has(screen) && !ducked && !document.hidden;

  function setup(){
    if (bus) return bus;
    const ctx = audio(); bus = ctx.createGain(); bus.gain.value = 0.0001;
    const dly = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain(), tone = ctx.createBiquadFilter();
    dly.delayTime.value = 0.29; fb.gain.value = 0.28; wet.gain.value = 0.2; tone.type = "lowpass"; tone.frequency.value = 2600;   // a little room echo
    bus.connect(ctx.destination); bus.connect(dly); dly.connect(tone); tone.connect(fb); fb.connect(dly); tone.connect(wet); wet.connect(ctx.destination);
    return bus;
  }
  function note(m, t, dur, vel){
    const ctx = audio(), k = nearestSample(m); if (k === null) return;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = PIANO.buf[k]; src.playbackRate.value = Math.pow(2, (m - k) / 12);
    g.gain.setValueAtTime(vel, t); g.gain.setTargetAtTime(0, t + dur, 0.35);
    src.connect(g); g.connect(bus); src.start(t); src.stop(t + dur + 2.5);
  }
  function scheduleBar(i, t){
    const [c, rh] = SONG[i % SONG.length], [root, minor, sev] = CH[c], box = Math.floor(i / SONG.length) % 2 === 1;
    const third = root + (minor ? 3 : 4), fifth = root + 7;
    const lh = [root, fifth, third + 12, fifth, root + 12, fifth, sev ? root + 10 + 12 : third + 12, fifth];   // rolling left-hand eighths
    lh.forEach((m, j) => note(m, t + j * BEAT / 2, BEAT * 0.9, j === 0 ? 0.2 : 0.12));
    for (const [b, m, d] of rh) note(m + (box ? 12 : 0), t + b * BEAT, d * BEAT, box ? 0.2 : 0.3);
  }
  function tick(){
    const ctx = audio();
    if (barT < ctx.currentTime + 0.05) barT = ctx.currentTime + 0.15;        // fell behind (tab was asleep): restart cleanly
    while (barT < ctx.currentTime + 1.2) { scheduleBar(nextBar++, barT); barT += BAR; }
  }
  async function start(){
    if (playing) return; playing = true;
    try { await loadPiano(); } catch (e) {}
    if (!playing) return;
    const ctx = audio(); try { await ctx.resume(); } catch (e) {}
    if (!playing) return;
    if (ctx.state !== "running") { playing = false; return; }   // no tap yet: try again on the first one
    setup(); bus.gain.cancelScheduledValues(ctx.currentTime); bus.gain.setTargetAtTime(VOL, ctx.currentTime, 0.6);
    nextBar -= nextBar % 4;                    // carry on from the start of the phrase we were in
    barT = 0; tick(); clearInterval(timer); timer = setInterval(tick, 250);
  }
  function stop(fast){
    if (!playing) return; playing = false;
    const ctx = audio(); bus && bus.gain.setTargetAtTime(0.0001, ctx.currentTime, fast ? 0.08 : 0.35);
    clearInterval(timer); timer = 0;           // notes already queued fade out under the falling volume
  }
  function sync(){ wanted() ? start() : stop(!ON_SCREENS.has(screen)); updBtn(); }
  function updBtn(){
    const b = $("bgmBtn"); if (!b) return;
    const on = store.bgm !== false; b.textContent = on ? "🎶" : "🎵"; b.classList.toggle("off", !on);
    b.title = on ? "Background music is on (tap to turn off)" : "Background music is off (tap to turn on)";
  }

  const plainShow = window.show;
  window.show = s => { screen = s; plainShow(s); sync(); };
  const plainPlay = window.playRecording, plainStop = window.stopPlayback;
  window.playRecording = (r, btn) => { const was = playTimers.length || playAudio; plainPlay(r, btn); ducked = !was; sync(); };
  window.stopPlayback = () => { plainStop(); ducked = false; sync(); };
  const plainSwitch = window.switchPlayer;
  window.switchPlayer = id => { plainSwitch(id); sync(); };
  $("bgmBtn").onclick = () => { store.bgm = store.bgm === false; save(); sync(); };
  const plainSound = $("soundBtn").onclick;
  $("soundBtn").onclick = e => { plainSound(e); sync(); };
  document.addEventListener("visibilitychange", sync);
  for (const ev of ["pointerdown", "keydown"]) document.addEventListener(ev, () => { if (!playing && wanted()) setTimeout(sync, 0); }, { capture:true });
  window.bgmSync = sync; window.bgmState = () => ({ playing, ducked, screen, bar:nextBar, gain:bus ? +bus.gain.value.toFixed(3) : 0 });
  updBtn();
})();
