"use strict";
/* ============ home: the GenMusic landing page and "Who's playing?" ============
   Each player has their own stars, streaks, stickers and recordings (see players in app.js); songs are shared. */
let homeIntroDone = false, homeWave = null;
function renderHome(){
  const box = $("playerList");
  box.innerHTML = players.list.map(p => {
    const s = peekStore(p.id), streak = s.streak && s.streak.lastDay ? (typeof daysBetween === "function" && daysBetween(s.streak.lastDay, today()) <= 1 ? s.streak.count : 0) : 0;
    const stk = Object.keys(s.stickers || {}).length, stars = Object.values(s.pieces || {}).reduce((n, r) => n + (r && r.both ? r.both.stars : 0), 0);
    return `<button class="playercard${p.id === players.active ? " current" : ""}" data-id="${p.id}">
      <span class="edit" title="Change name or avatar">✎</span>
      <span class="av">${p.av}</span><span class="nm">${esc(p.name || "Player")}</span>
      <span class="st">🔥 ${streak} · ⭐ ${stars} · 🏅 ${stk}</span></button>`;
  }).join("") + `<button class="playercard add" id="addPlayer"><span class="av">＋</span><span class="nm">New player</span><span class="st">Tap to add</span></button>`;
  box.querySelectorAll(".playercard[data-id]").forEach(b => b.onclick = e => {
    if (e.target.classList.contains("edit")) { editPlayer(b.dataset.id); return; }
    pickPlayer(b.dataset.id, b);
  });
  $("addPlayer").onclick = () => editPlayer(null);
  homeAnimate();
}
function pickPlayer(id, card){
  if (!player(id).name) { editPlayer(id, () => pickPlayer(id)); return; }   // a player needs a name first
  const go = () => {
    switchPlayer(id); show("library");
    if (typeof welcomeBack === "function") welcomeBack();
    if (typeof maybeFirstRunHelp === "function" && !$("modal").classList.contains("show")) maybeFirstRunHelp();
  };
  if (window.gsap && card && !matchMedia("(prefers-reduced-motion: reduce)").matches)
    gsap.timeline({ onComplete:go }).to(card, { scale:1.12, duration:0.15, ease:"power2.out" }).to(card, { scale:0.9, opacity:0, duration:0.22, ease:"power2.in" });
  else go();
}
function editPlayer(id, then){
  const p = id ? player(id) : null; let av = p ? p.av : AVATARS[Math.floor(Math.random() * AVATARS.length)];
  modal(`<h2>${p ? (p.name ? "Change player" : "What’s your name?") : "New player"}</h2>
    <p><input type="text" id="plName" maxlength="20" placeholder="Name" value="${p ? esc(p.name) : ""}"></p>
    <div class="avpick">${AVATARS.map(a => `<button class="ghost small${a === av ? " on" : ""}" data-av="${a}">${a}</button>`).join("")}</div>
    <p id="plMsg" class="muted"></p>
    <div class="row">${p && players.list.length > 1 ? `<button class="ghost" id="plDel">🗑 Remove</button>` : ""}<button class="ghost" id="plCancel">Cancel</button><button id="plOk">${p ? "Save" : "Add player"}</button></div>`);
  document.querySelectorAll(".avpick button").forEach(b => b.onclick = () => { av = b.dataset.av; document.querySelectorAll(".avpick button").forEach(x => x.classList.toggle("on", x === b)); });
  const nameIn = $("plName"); setTimeout(() => nameIn.focus(), 50);
  $("plCancel").onclick = () => { closeModal(); renderHome(); };
  const ok = () => {
    const name = nameIn.value.trim(); if (!name) { $("plMsg").textContent = "Type a name first."; return; }
    if (players.list.some(x => x.id !== id && x.name.toLowerCase() === name.toLowerCase())) { $("plMsg").textContent = "Someone already has that name."; return; }
    if (p) { p.name = name; p.av = av;
      if (id === players.active) { store.name = name; save(); applyName(); }
      else { const s = readStore(id); s.name = name; try { localStorage.setItem(keyFor(id), JSON.stringify(s)); } catch (e) {} savePlayers(); } }
    else addPlayer(name, av);
    closeModal(); homeIntroDone = true; renderHome(); if (then) then();
  };
  $("plOk").onclick = ok; nameIn.onkeydown = e => { if (e.key === "Enter") ok(); };
  if ($("plDel")) $("plDel").onclick = async () => {
    if (!confirm(`Remove ${p.name || "this player"}? Their stars, stickers and recordings on this device will be deleted.`)) return;
    if (!confirm("Are you sure? This cannot be undone.")) return;
    try { for (const r of await DB.all("recordings")) if ((r.who || "p1") === id) await DB.del(r.id, "recordings"); } catch (e) {}
    removePlayer(id); closeModal(); renderHome();
  };
}

/* ---- the moving parts: logo letters bounce in, notes float up, cards ripple ---- */
function homeAnimate(){
  const logo = $("logo");
  if (!logo.dataset.split) { logo.innerHTML = [...logo.textContent].map(ch => `<span class="ch">${ch}</span>`).join(""); logo.dataset.split = "1"; }
  const G = window.gsap; if (!G || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cards = document.querySelectorAll("#playerList .playercard");
  if (!homeIntroDone) {
    homeIntroDone = true;
    const chars = logo.querySelectorAll(".ch");
    G.timeline()
      .fromTo(".heroIcon", { scale:0, rotation:-200 }, { scale:1, rotation:0, duration:0.9, ease:"back.out(1.7)" })
      .fromTo(chars, { y:-90, opacity:0, rotation:() => G.utils.random(-40, 40), scale:0.4 },
        { y:0, opacity:1, rotation:0, scale:1, duration:0.8, ease:"bounce.out", stagger:0.07 }, "-=0.5")
      .fromTo(".hero .tag", { opacity:0, y:12 }, { opacity:1, y:0, duration:0.5 }, "-=0.3")
      .fromTo(".who", { opacity:0, scale:0.8 }, { opacity:1, scale:1, duration:0.45, ease:"back.out(2)" }, "-=0.2")
      .fromTo(cards, { opacity:0, y:30, scale:0.85 }, { opacity:1, y:0, scale:1, duration:0.5, ease:"back.out(1.7)", stagger:0.09, clearProps:"transform,opacity" }, "-=0.2")
      .add(() => homeWave = G.to(chars, { y:-7, duration:0.6, ease:"sine.inOut", yoyo:true, repeat:-1, stagger:{ each:0.09, repeat:-1, yoyo:true } }));   // a gentle wave through the letters
    floatNotes();
  } else G.fromTo(cards, { opacity:0, y:16 }, { opacity:1, y:0, duration:0.35, ease:"back.out(1.6)", stagger:0.05, clearProps:"transform,opacity" });
}
function floatNotes(){
  const G = window.gsap, hero = document.querySelector(".hero"), cols = ["#ff5fa2","#7b5cff","#3b8cff","#2fb36b","#ffb547","#ff7a45"];
  for (let i = 0; i < 14; i++) {
    const n = document.createElement("span"); n.className = "floatnote"; n.textContent = "♪♫♩♬"[i % 4];
    n.style.color = cols[i % cols.length]; hero.appendChild(n);
    const fly = () => {
      if (!n.isConnected) return;
      if (n._tl) n._tl.kill();
      G.set(n, { left:G.utils.random(2, 96) + "%", top:"100%", opacity:0, scale:G.utils.random(0.7, 1.6), rotation:G.utils.random(-30, 30) });
      n._tl = G.timeline({ onComplete:fly, delay:G.utils.random(0, 4), paused:!document.body.classList.contains("on-home") });
      n._tl
        .to(n, { opacity:0.75, duration:0.6 }, 0)
        .to(n, { top:"-10%", duration:G.utils.random(5, 9), ease:"none" }, 0)
        .to(n, { x:G.utils.random(-40, 40), duration:1.6, ease:"sine.inOut", yoyo:true, repeat:4 }, 0)
        .to(n, { opacity:0, duration:0.8 }, ">-1.2");
    };
    fly();
  }
  /* the notes only fly while Home is showing */
  const sync = () => { const on = document.body.classList.contains("on-home") && !document.hidden;
    document.querySelectorAll(".floatnote").forEach(n => n._tl && (on ? n._tl.resume() : n._tl.pause()));
    if (homeWave) on ? homeWave.resume() : homeWave.pause(); };
  new MutationObserver(sync).observe(document.body, { attributes:true, attributeFilter:["class"] });
  document.addEventListener("visibilitychange", sync);
}
document.querySelectorAll(".brandhome").forEach(el => el.addEventListener("click", () => show("home")));
