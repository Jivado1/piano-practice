/* ============ celebrations (GSAP) ============
   Pop-ups bounce in; "You finished" / "Great playing!" play out step by step (score counts up, stars pop in one by one,
   a new sticker flies to the ⭐ Stickers tab); library cards and stickers ripple in. Playing itself is untouched:
   the falling notes, sparks and combo pop-ups are drawn on the canvas in app.js.
   Without GSAP, or with "reduce motion" switched on in the device settings, everything simply appears as before. */
(() => {
  const G = window.gsap, still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!G || still) return;

  /* --- pop-ups --- */
  const plainModal = window.modal;
  window.modal = html => {
    plainModal(html);
    const box = $("modalBox"); G.killTweensOf(box);
    const tl = G.timeline();
    tl.fromTo(box, { scale:0.55, opacity:0, rotation:-3 }, { scale:1, opacity:1, rotation:0, duration:0.5, ease:"back.out(1.9)" });
    if (box.querySelector(".big")) celebrate(box, tl);   // a result screen: play it out step by step
  };

  function celebrate(box, tl){
    const parts = [...box.children];
    G.set(parts, { opacity:0, y:16 });
    for (const el of parts) {
      tl.to(el, { opacity:1, y:0, duration:0.32, ease:"power2.out" }, ">-0.08");
      for (const c of el.querySelectorAll("[data-count]")) countUp(c, tl);
      if (el.classList.contains("big") && /[⭐☆]/.test(el.textContent)) popStars(el, tl);
      for (const s of el.querySelectorAll(".newst")) popSticker(s, tl);
    }
  }
  function countUp(el, tl){   // 0 -> the real number
    const to = +el.dataset.count, suf = el.dataset.suffix || "", o = { v:0 };
    el.textContent = "0" + suf;
    tl.to(o, { v:to, duration:Math.min(1.4, 0.5 + to / 4000), ease:"power1.out", onUpdate:() => { el.textContent = Math.round(o.v) + suf; } }, "<");
    tl.fromTo(el, { scale:1 }, { scale:1.25, duration:0.12, yoyo:true, repeat:1, ease:"power1.inOut" });
  }
  function popStars(el, tl){   // each ⭐ / ☆ becomes its own span and pops in, one after another
    el.innerHTML = [...el.textContent].map(ch => `<span class="popstar">${ch}</span>`).join("");
    const stars = el.querySelectorAll(".popstar");
    G.set(stars, { display:"inline-block", scale:0, rotation:-40 });
    tl.to(stars, { scale:1, rotation:0, duration:0.55, ease:"elastic.out(1, 0.45)", stagger:0.28 }, ">-0.05");
  }
  function popSticker(s, tl){   // the new sticker pops, then a copy flies to the ⭐ Stickers tab
    G.set(s, { display:"inline-block", scale:0 });
    tl.to(s, { scale:1, duration:0.6, ease:"elastic.out(1, 0.4)" }, ">");
    tl.add(() => flyToTab(s), ">+0.25");
  }
  function flyToTab(s){
    const tab = document.querySelector('#tabs button[data-screen="stickers"]'), e = s.dataset.e; if (!tab || !e) return;
    const a = s.getBoundingClientRect(), b = tab.getBoundingClientRect();
    const f = document.createElement("div"); f.className = "flyst"; f.textContent = e; document.body.appendChild(f);
    G.set(f, { left:a.left, top:a.top });
    G.timeline({ onComplete:() => f.remove() })
      .to(f, { left:b.left + b.width / 2 - 14, duration:0.9, ease:"power1.inOut" }, 0)
      .to(f, { top:b.top - 4, duration:0.9, ease:"back.in(1.6)" }, 0)
      .to(f, { scale:0.5, opacity:0.2, duration:0.9, ease:"power2.in" }, 0)
      .fromTo(tab, { scale:1 }, { scale:1.25, duration:0.15, yoyo:true, repeat:1, ease:"power2.out" }, 0.85);
  }

  /* --- the little "Nice!" / "Great!" bubble while practising --- */
  const plainCheer = window.cheer;
  window.cheer = (text, soft) => {
    plainCheer(text, soft);
    if (text) for (const id of ["cheer", "cheer2"]) { const el = $(id), sp = el && el.firstElementChild; if (sp && el.offsetParent) G.fromTo(sp, { scale:0.6 }, { scale:1, duration:0.35, ease:"back.out(2.5)", overwrite:true }); }
  };

  /* --- library cards and stickers ripple in when their screen opens --- */
  const plainShow = window.show;
  window.show = screen => {
    plainShow(screen);
    if (screen === "library") ripple(document.querySelectorAll("#libList .piece"));
    if (screen === "stickers") {
      ripple(document.querySelectorAll("#stickerBody .sticker"));
      G.fromTo("#stickerBody .sticker.got .e", { rotation:-15 }, { rotation:0, duration:0.8, ease:"elastic.out(1.2, 0.35)", stagger:0.05, delay:0.3 });
    }
  };
  function ripple(els){
    if (!els.length) return;
    const fold = innerHeight + 40, onScreen = [...els].filter(el => el.getBoundingClientRect().top < fold);   // only what can be seen: quick, and the rest is already in place
    G.fromTo(onScreen, { opacity:0, y:22, scale:0.94 }, { opacity:1, y:0, scale:1, duration:0.4, ease:"back.out(1.6)", stagger:{ each:0.025, from:"start" }, clearProps:"transform,opacity" });
  }
})();
