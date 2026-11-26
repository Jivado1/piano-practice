/* Help: pop-out explanations next to the controls (ⓘ), and a "Getting started" guide (❓). Loaded last. */
"use strict";

const HELP = {
  connect:{ title:"🎹 Connecting the piano", body:`
    <ol>
      <li>Turn the piano on.</li>
      <li>Plug a USB cable into the socket marked <b>USB TO HOST</b> on the back of the piano (<i>not</i> "USB TO DEVICE").</li>
      <li>Plug the other end into the computer. On a tablet, use a <b>USB-C OTG adapter</b> (or a USB-C cable made for this).</li>
      <li>Use <b>Chrome</b> or <b>Edge</b> on a computer, or <b>Chrome</b> on an Android tablet. iPad and iPhone can't connect to a piano.</li>
      <li>Press <b>Connect piano</b>, then press <b>Allow</b>. The box turns <span class="ok">green</span> and shows the piano's name.</li>
    </ol>
    <p><b>Not working?</b></p>
    <ul>
      <li>Close other music apps (for example Yamaha's Smart Pianist). Often only one app can use the piano at a time.</li>
      <li>Unplug the cable, plug it back in, then reload this page.</li>
      <li>Try another cable. Some cables only charge and don't carry data.</li>
      <li>If you pressed <b>Block</b> by mistake, tap the 🔒 or ⓘ left of the web address, go to <b>Site settings → MIDI devices → Allow</b>, then reload.</li>
    </ul>
    <p class="muted">No piano nearby? Tap the keys on the screen, or use the computer keys (see ❓).</p>` },
  add:{ title:"➕ Adding your own music", body:`
    <p>Two kinds of file work:</p>
    <ul>
      <li><b>MusicXML</b> (<code>.musicxml</code>, <code>.xml</code>, <code>.mxl</code>) shows the <b>full sheet music</b>.</li>
      <li><b>MIDI</b> (<code>.mid</code>) shows <b>falling notes</b> (a MIDI file has no printed music in it).</li>
    </ul>
    <p><b>Where to find music</b></p>
    <ul>
      <li><b>MuseScore.com</b>: open a piece → <i>Download</i> → <i>MusicXML</i> (needs a free account).</li>
      <li><b>Your teacher</b> may have MusicXML or MIDI files.</li>
      <li><b>Mutopia Project</b> (mutopiaproject.org): free classical pieces as MIDI.</li>
      <li><b>IMSLP</b> (imslp.org): some pieces have MusicXML.</li>
    </ul>
    <p><b>How:</b> tap <b>➕ Add a piece</b> and choose the file (on a tablet, look in <i>Downloads</i>). It appears under <b>My pieces</b> at the bottom of the Library.</p>
    <p class="muted">Pieces you add stay on this device only. To copy them to another device, use <b>Export</b> on the parent screen. Exam books are copyrighted, so only add files you're allowed to use.</p>` },
  record:{ title:"🎙 Recording yourself", body:`
    <ol><li>Tap <b>🎙 Record</b>. The button turns red and counts the time.</li>
      <li>Play. Chords, loud and soft notes and timing are all recorded.</li>
      <li>Tap <b>■ Stop</b>.</li></ol>
    <p>Your recordings are in the <b>Library</b> under <b>🎙️ My recordings</b>:</p>
    <ul><li><b>▶ Play</b> plays it back, on the real piano if it's connected.</li>
      <li><b>⬇ .mid</b> downloads it as a MIDI file to send to your teacher.</li>
      <li><b>✕</b> deletes it.</li></ul>` },
  listen:{ title:"▶ Listen", body:`
    <p>Plays the music from the blue marker onwards and lights up each key as it plays, so you can hear how it should sound.</p>
    <p>It plays at the <b>🥁 metronome speed</b>, so you can slow it down to 75% or 50%. Turn the metronome on first to hear the beat in time with the music.</p>
    <p>If the piano is connected, <b>the piano plays it by itself</b>. A parent can turn this off on the parent screen. Tap <b>■ Stop</b> to stop.</p>
    <p>Turn on <b>🔁 Repeat</b> and Listen starts again from the beginning each time it ends, until you tap Stop. Repeat also makes Practice start again when you finish.</p>` },
  hands:{ title:"✋ Which hand", body:`
    <ul><li><b>Right</b>: only the right-hand notes (top stave). Keys glow <span class="rh">blue</span>.</li>
      <li><b>Left</b>: only the left-hand notes (bottom stave). Keys glow <span class="lh">purple</span>.</li>
      <li><b>Both</b>: everything together.</li></ul>
    <p><b>Chords:</b> press <b>every</b> glowing key, in any order. When they're all played, the music moves on. There's no timer, so take your time.</p>
    <p>A wrong key flashes <span class="bad">orange</span>. Just try again.</p>` },
  bars:{ title:"🔁 Practising part of a piece", body:`
    <p>Type the <b>first</b> and <b>last bar</b> you want to practise. The bar numbers are printed above the music.</p>
    <p>Turn on <b>🔁 Repeat</b> to play that part again and again from its first bar. Each time round, the app tells you how many notes you got right.</p>
    <p>After each run, the app shows your <b>tricky spots</b> and offers to loop the trickiest bar for you.</p>` },
  game:{ title:"🎮 The game", body:`
    <p>Notes fall down the screen. Play each one as it reaches the <b>yellow line</b>. You have about a quarter of a second either side.</p>
    <ul><li>Pick <b>Right</b>, <b>Left</b> or <b>Both</b>. The other hand plays along by itself.</li>
      <li><b>🐢 Slow</b> is half speed, <b>🐇 Medium</b> is three-quarter speed, <b>🚀 Full speed</b> is the real tempo.</li>
      <li>The bars you chose on the Practice screen are used here too.</li></ul>
    <p class="muted">The game unlocks after one practice run each day. A parent can change this.</p>` },
  streak:{ title:"🔥 Streak and 🧊 freezes", body:`
    <p>🔥 is how many days in a row you've practised.</p>
    <p>A day counts when you practise for the <b>daily goal</b> (set on the parent screen) <b>or</b> finish <b>3 pieces</b>.</p>
    <p>🧊 <b>Freezes:</b> you earn one every 7 days (you can save up to 2). A freeze covers one missed day automatically, so the streak keeps going.</p>
    <p>See all your stickers on the <b>⭐ Stickers</b> tab.</p>` },
  parent:{ title:"👪 Parent screen", body:`
    <p>For grown-ups: <b>press and hold 👪 for 3 seconds</b>, then type the 4-digit code. The first time, you choose the code.</p>
    <p>It shows practice minutes for each day, the notes most often missed, progress on each piece, and recent activity. Settings are there too: name, daily goal, game rules and sound.</p>
    <p>Use <b>Export / Import progress</b> to move stars, stickers, added pieces and recordings between the tablet and the computer.</p>` },
  keys:{ title:"⌨️ Playing without a piano", body:`
    <p><b>Tap the keys on the screen</b>. They play a piano sound.</p>
    <p>Or use the <b>computer keyboard</b>: <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> <kbd>F</kbd> <kbd>G</kbd> <kbd>H</kbd> <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd> <kbd>;</kbd> <kbd>'</kbd> are white keys starting from C. <kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd> <kbd>Y</kbd> <kbd>U</kbd> <kbd>O</kbd> <kbd>P</kbd> are black keys. <kbd>Z</kbd> and <kbd>X</kbd> move down or up an octave.</p>` },
  metro:{ title:"🥁 Metronome", body:`
    <p>The metronome clicks the beat so you can keep steady time. It starts at the <b>speed and beats per bar written in the music</b>.</p>
    <ul><li><b>− / +</b> change the speed by 1 (hold the button to change it faster), or drag the slider.</li>
      <li><b>50%</b> and <b>75%</b> slow it down to practise. <b>Song</b> goes back to the speed in the music.</li>
      <li><b>👆 Tap</b>: tap the button in time 3 or 4 times to set the speed you want.</li>
      <li>Beat 1 of every bar is a <b>louder, deeper drum</b> and lights up in a <span class="bad">different colour</span>. You can turn this accent off.</li>
      <li><b>Sound</b>: choose 🥁 Drum, 🪵 Woodblock or 🖌️ Soft tick.</li>
      <li><b>▶ Listen</b> plays at the metronome speed. If the metronome is on, it ticks in time with the music.</li>
      <li>6/8 counts <b>2</b> big beats per bar, and 9/8 counts 3.</li></ul>
    <p class="muted">Each piece remembers its own metronome speed. The metronome stops when you leave the Practice screen.</p>` },
  sound:{ title:"🔊 Sound", body:`
    <p>🔊 Taps on the on-screen keys (and computer keys) play a grand-piano sound through the speaker.</p>
    <p>When the real piano is connected, it makes its own sound, so the speaker stays quiet while you play the piano.</p>
    <p>Tap the button to mute everything (🔇) or turn it back on.</p>` },
};

/* ---- the pop-out ---- */
let helpPop = null;
function closeHelp(){ if (helpPop) { helpPop.remove(); helpPop = null; } }
function openHelp(key, anchor){
  closeHelp(); const h = HELP[key]; if (!h) return;
  const pop = document.createElement("div"); pop.className = "helppop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", h.title);
  pop.innerHTML = `<div class="hp-h"><b>${h.title}</b><button class="hp-x" aria-label="Close">✕</button></div><div class="hp-b">${h.body}</div>`;
  document.body.appendChild(pop); helpPop = pop;
  pop.querySelector(".hp-x").onclick = closeHelp;
  const W = Math.min(400, innerWidth - 24); pop.style.width = W + "px";
  if (anchor && anchor.getBoundingClientRect && anchor.offsetParent) {
    const r = anchor.getBoundingClientRect();
    let left = Math.min(Math.max(12, r.left + r.width / 2 - W / 2), innerWidth - W - 12), top = r.bottom + 10;
    if (top + pop.offsetHeight > innerHeight - 12) top = Math.max(12, r.top - pop.offsetHeight - 10);
    if (top + pop.offsetHeight > innerHeight - 12) top = Math.max(12, innerHeight - pop.offsetHeight - 12);
    pop.style.left = left + "px"; pop.style.top = top + "px";
    const ax = Math.min(Math.max(16, r.left + r.width / 2 - left), W - 16); pop.style.setProperty("--ax", ax + "px");
    pop.classList.toggle("above", top < r.top);
  } else { pop.classList.add("center"); }
}
document.addEventListener("pointerdown", e => { if (helpPop && !helpPop.contains(e.target) && !e.target.closest(".info,[data-help]")) closeHelp(); }, true);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeHelp(); });
window.addEventListener("orientationchange", closeHelp);

/* ---- ⓘ buttons beside the controls ---- */
function addInfo(target, key, label){
  if (!target) return;
  const b = document.createElement("button"); b.className = "info"; b.type = "button"; b.textContent = "i";
  b.title = label || HELP[key].title.replace(/^\S+\s/, ""); b.setAttribute("aria-label", "Help: " + b.title);
  b.onclick = e => { e.stopPropagation(); helpPop && helpPop._key === key ? closeHelp() : (openHelp(key, b), helpPop._key = key); };
  target.insertAdjacentElement("afterend", b);
}
addInfo($("connectBtn"), "connect", "How to connect the piano");
addInfo(document.querySelector("label.button-like"), "add", "How to add your own music");
addInfo($("handSeg"), "hands", "Which hand / chords");
addInfo($("barTo").parentElement, "bars", "Practising part of a piece");
addInfo($("recBtn"), "record", "Recording yourself");
addInfo($("metroBtn"), "metro", "How the metronome works");
addInfo($("listenBtn"), "listen", "Listen");
addInfo($("startGameBtn"), "game", "How the game works");
/* controls that open their help when tapped */
$("streakPill").setAttribute("data-help", "streak"); $("streakPill").onclick = e => openHelp("streak", e.currentTarget);
$("status").setAttribute("data-help", "connect"); $("status").onclick = e => { if (!midiIn) openHelp("connect", e.currentTarget); };
$("parentBtn").addEventListener("click", e => { const b = e.currentTarget; if (Date.now() - (b._held || 0) > 1500) openHelp("parent", b); });
/* tell people what to do when the piano can't be found or permission was blocked */
const _setStatus = setStatus;
setStatus = function(){ _setStatus(); if (midiAccess && !midiIn && !setStatus._shown) { setStatus._shown = true; setTimeout(() => openHelp("connect", $("status")), 300); } };
const _connect = $("connectBtn").onclick;
$("connectBtn").onclick = async e => { await _connect(e); if (!midiAccess || !midiIn) openHelp("connect", $("status")); };

/* ---- ❓ Getting started ---- */
function gettingStarted(){
  closeHelp();
  const step = (n, text, key) => `<li><span class="gs-n">${n}</span><span>${text}</span>${key ? `<button class="ghost small gs-more" data-k="${key}">How?</button>` : ""}</li>`;
  modal(`<h2>❓ Getting started</h2>
    <ol class="gs">
      ${step(1, "<b>Connect the piano</b> with a USB cable and press <b>Connect piano</b>.", "connect")}
      ${step(2, "Pick a piece in the <b>📚 Library</b>. There are warm-ups and Grade 1–4 pieces.", null)}
      ${step(3, "<b>🎹 Practice:</b> play the glowing keys. For chords, press every glowing key.", "hands")}
      ${step(4, "Practise a few bars on a <b>loop</b> until they're easy.", "bars")}
      ${step(5, "Finish a piece to unlock the <b>🎮 Game</b>.", "game")}
      ${step(6, "Keep steady time with the <b>🥁 metronome</b>.", "metro")}
      ${step(7, "<b>🎙 Record</b> yourself and listen back.", "record")}
      ${step(8, "Add your own music with <b>➕ Add a piece</b>.", "add")}
      ${step(9, "Keep your <b>🔥 streak</b> and collect <b>⭐ stickers</b>.", "streak")}
    </ol>
    <p class="muted small-print">No piano? <a href="#" id="gsKeys">Play with the screen or computer keys</a> · Sound: <a href="#" id="gsSound">about the speaker</a> · Grown-ups: <a href="#" id="gsParent">parent screen</a></p>
    <div class="row"><button id="gsOk">Let's play!</button></div>`);
  document.querySelectorAll(".gs-more").forEach(b => b.onclick = () => { const k = b.dataset.k; closeModal(); openHelp(k, null); });
  $("gsKeys").onclick = e => { e.preventDefault(); closeModal(); openHelp("keys", null); };
  $("gsSound").onclick = e => { e.preventDefault(); closeModal(); openHelp("sound", null); };
  $("gsParent").onclick = e => { e.preventDefault(); closeModal(); openHelp("parent", null); };
  $("gsOk").onclick = closeModal;
}
$("helpBtn").onclick = gettingStarted;
function maybeFirstRunHelp(){ if (!store.helpSeen) { store.helpSeen = true; save(); gettingStarted(); } }
