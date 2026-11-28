"use strict";
/* ============ combo characters ============
   Now and then (on purpose irregular), when the player is on a run of correct notes in Practice or the Game,
   one of the dinosaurs / monsters / funky characters jumps in from the side with a speech bubble, dances
   for a couple of seconds and leaves. Picked by the family from lottie/chars (see lottie/CREDITS.md).
   Never blocks taps or keys; never twice in a row the same one; at most one on screen. */
(() => {
  const CHARS = ["D3", "D6", "D7", "D10", "D11", "X3", "X4", "X9", "X10", "X11", "X14", "K7", "K10"];
  const SAY = ["Rawr! Amazing!", "Wooo!", "You rock!", "Keep going!", "Super star!", "Wow wow wow!", "So cool!", "Yay!", "Groovy!", "Monster combo!"];
  const still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let last = "", ready = [], busy = false, nextOk = 0, box = null, anim = null;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pickId = () => { let c; do c = CHARS[Math.floor(Math.random() * CHARS.length)]; while (c === last && CHARS.length > 1); return c; };
  function preload(){   // keep one character downloaded and waiting, so a pop-up never waits for the network
    if (ready.length || !window.lottieLib) return;
    const id = pickId();
    Promise.all([lottieLib(), lottieJson("chars/" + id)]).then(([, d]) => { if (!ready.length) ready.push([id, d]); }).catch(() => {});
  }
  /* called on every correct note / chord with the current run length */
  window.charCombo = (mode, combo) => {
    if (still || busy || !window.gsap) return;
    const minRun = mode === "game" ? 5 : 6;
    if (combo < Math.max(2, minRun - 3)) return;
    preload();
    if (combo < minRun || performance.now() < nextOk || !ready.length) return;
    const chance = combo % 5 === 0 ? 0.55 : 0.07;   // more likely on 5, 10, 15…, but never predictable
    if (Math.random() > chance) return;
    show(ready.shift(), combo);
  };
  function show([id, d], combo){
    busy = true; last = id;
    box = box || Object.assign(document.createElement("div"), { id:"charPop" }); document.body.appendChild(box);
    const left = Math.random() < 0.5, size = Math.round(Math.min(190, Math.max(120, innerWidth * 0.16)));
    const said = Math.random() < 0.35 ? `${combo} in a row!` : SAY[Math.floor(Math.random() * SAY.length)];
    box.innerHTML = `<div class="bubble">${said}</div><div class="who"></div>`;
    box.className = left ? "left" : "right";
    Object.assign(box.style, { width:size + "px", top:Math.round(rnd(0.22, 0.55) * innerHeight) + "px", left:left ? "6px" : "", right:left ? "" : "6px" });
    anim = lottie.loadAnimation({ container:box.querySelector(".who"), renderer:"svg", loop:true, autoplay:true, animationData:JSON.parse(JSON.stringify(d)) });
    const off = left ? -size - 40 : size + 40, b = box.querySelector(".bubble");
    gsap.timeline({ onComplete:done })
      .fromTo(box, { x:off, rotation:left ? -25 : 25, opacity:1 }, { x:0, rotation:0, duration:0.55, ease:"back.out(1.8)" })
      .fromTo(b, { scale:0, opacity:0 }, { scale:1, opacity:1, duration:0.35, ease:"back.out(2.5)" }, "-=0.15")
      .to(box, { y:-14, duration:0.22, yoyo:true, repeat:3, ease:"sine.inOut" }, "+=0.1")
      .to(box, { rotation:left ? 6 : -6, duration:0.25, yoyo:true, repeat:1 }, "+=0.3")
      .to(b, { scale:0, opacity:0, duration:0.2 }, "+=0.5")
      .to(box, { x:off, rotation:left ? -20 : 20, duration:0.45, ease:"back.in(1.6)" });
  }
  function done(){
    if (anim) { anim.destroy(); anim = null; } if (box) box.remove();
    busy = false; nextOk = performance.now() + rnd(9000, 22000);   // a random quiet spell before the next one
    preload();
  }
  window.charHide = () => { if (busy && box) { gsap.killTweensOf(box); gsap.killTweensOf(box.querySelector(".bubble")); done(); } };
})();
