/* ============ Lottie animations ============
   Any element <div class="lot" data-lot="NAME"> plays lottie/NAME.json. The player (vendor/lottie_light.min.js, ~165 KB)
   and each animation are only downloaded the first time they are needed, so start-up stays as fast as before.
   One-shot animations (trophy, level complete, gift) start when they come into view and stop on a nice frame;
   looping ones (music notes, buddy) only run while their screen is showing. "Reduce motion" shows a still frame. */
(() => {
  const CFG = {
    "trophy":         { stop:0.98 },               // a medal turns into a trophy with stars
    "level-complete": { stop:0.6, crop:[0.1, 0.52] },   // tall canvas: show only the band with the banner and stars; it empties out after ~60%
    "gift":           { stop:0.5, slice:true },    // stop just after the box opens
    "music-notes":    { loop:true },
    "buddy":          { loop:true },
  };
  const still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ver = typeof APP_V === "string" && APP_V ? "?v=" + APP_V : "";
  let libP = null;
  const lib = () => libP || (libP = new Promise((res, rej) => {
    if (window.lottie) return res(window.lottie);
    const s = document.createElement("script"); s.src = "vendor/lottie_light.min.js" + ver;
    s.onload = () => res(window.lottie); s.onerror = () => { libP = null; rej(new Error("lottie")); }; document.head.appendChild(s);
  }));
  const cache = {};
  const data = n => cache[n] || (cache[n] = fetch(`lottie/${n}.json${ver}`).then(r => { if (!r.ok) throw new Error(n); return r.json(); }).catch(e => { delete cache[n]; throw e; }));
  const live = new Set();
  const shown = el => { if (!el.isConnected || !el.getClientRects().length) return false;   // inside a hidden screen, or still faded out
    const step = el.closest("#modalBox > *"); return !step || +getComputedStyle(step).opacity > 0.3; };

  async function mount(el){
    if (el._lot) return; el._lot = true;
    const n = el.dataset.lot, c = CFG[n] || {};
    let L, d; try { [L, d] = await Promise.all([lib(), data(n)]); } catch (e) { el.remove(); return; }
    if (!el.isConnected) return;
    let box = el;
    if (c.crop) {   // show one horizontal band of a tall animation
      const full = (el.clientWidth || 300) * d.h / d.w; box = document.createElement("div"); el.appendChild(box);
      el.style.overflow = "hidden"; el.style.height = Math.round((c.crop[1] - c.crop[0]) * full) + "px";
      box.style.height = Math.round(full) + "px"; box.style.marginTop = -Math.round(c.crop[0] * full) + "px"; }
    const a = L.loadAnimation({ container:box, renderer:"svg", loop:!!c.loop && !still, autoplay:false,
      animationData:JSON.parse(JSON.stringify(d)),   // the player changes the data it is given, so each copy gets its own
      rendererSettings:{ preserveAspectRatio:c.slice ? "xMidYMid slice" : "xMidYMid meet" } });
    const frames = d.op - d.ip, end = Math.max(1, Math.floor(frames * (c.stop || 1)) - 1);
    el._anim = a; el._loop = !!c.loop; live.add(el);
    if (still) { a.goToAndStop(c.loop ? Math.floor(frames / 2) : end, true); return; }
    if (c.loop) { if (shown(el)) a.play(); return; }
    a.goToAndStop(0, true);
    const t0 = performance.now(), go = () => {   // wait until the result screen has revealed it (celebrate.js fades steps in)
      if (!el.isConnected) return;
      if (shown(el) || performance.now() - t0 > 6000) a.playSegments([0, end], true); else setTimeout(go, 80); };
    go();
  }
  function refresh(root){
    for (const el of [...live]) {
      if (!el.isConnected) { el._anim.destroy(); live.delete(el); continue; }
      if (el._loop && !still) shown(el) ? el._anim.play() : el._anim.pause();   // loops rest while their screen is hidden
    }
    (root || document).querySelectorAll(".lot[data-lot]").forEach(mount);
  }

  const plainModal = window.modal;
  window.modal = html => { plainModal(html); refresh($("modalBox")); };
  const plainClose = window.closeModal;
  window.closeModal = () => { plainClose(); setTimeout(() => refresh(document.createElement("div")), 0); };
  const plainShow = window.show;
  window.show = screen => { plainShow(screen); setTimeout(() => refresh(), 0); };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { for (const el of live) if (el._loop) el._anim.pause(); }
    else refresh(document.createElement("div"));
  });
})();
