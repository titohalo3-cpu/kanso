// Movimiento con Anime.js v4. Si la librería no carga o el usuario pide menos movimiento, todo se muestra quieto.
const CDN = "https://cdn.jsdelivr.net/npm/animejs@4.0.2/+esm";
const reducido = matchMedia("(prefers-reduced-motion: reduce)");
let A = null;

export async function cargar() {
  if (reducido.matches) return;
  try {
    A = await import(CDN);
    document.documentElement.classList.add("fx");
  } catch (e) {
    console.warn("[Kansō] Anime.js no ha cargado; sigo sin animaciones.", e.message);
  }
}

const activo = () => A && !reducido.matches;

const columnas = (nodos) => {
  const top = nodos[0].offsetTop;
  const n = nodos.findIndex((x) => x.offsetTop !== top);
  return n === -1 ? nodos.length : n;
};

// Titular partido en letras que suben desde una máscara. Respeta los <span> de color del titular.
export function titular(el) {
  el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
  const partir = (texto) => texto.split(/(\s+)/).filter(Boolean).map((p) => {
    if (/^\s+$/.test(p)) return document.createTextNode(" ");
    const palabra = document.createElement("span");
    palabra.className = "palabra";
    for (const ch of p) {
      const l = document.createElement("span");
      l.className = "letra";
      l.textContent = ch;
      palabra.append(l);
    }
    return palabra;
  });
  for (const nodo of [...el.childNodes]) {
    if (nodo.nodeType === Node.TEXT_NODE) nodo.replaceWith(...partir(nodo.textContent));
    else nodo.replaceChildren(...partir(nodo.textContent));
  }
  for (const n of el.children) n.setAttribute("aria-hidden", "true");
  if (!activo()) return;
  const letras = el.querySelectorAll(".letra");
  A.utils.set(letras, { translateY: "105%" });
  A.animate(letras, { translateY: "0%", duration: 1300, delay: A.stagger(24, { start: 150 }), ease: "outExpo" });
}

// Cada bloque entra una vez al llegar a pantalla: sus hijos suben escalonados.
export function alEntrar(bloques) {
  if (!activo()) return;
  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const hijos = [...e.target.children];
      A.animate(hijos, { opacity: [0, 1], translateY: [28, 0], duration: 1000, delay: A.stagger(80), ease: "outExpo" });
    }
  }, { threshold: 0.2 });
  bloques.forEach((b) => io.observe(b));
}

// Entrada escalonada de la rejilla, desde la primera tarjeta en diagonal.
export function entrada(nodos, { suave = false } = {}) {
  if (!activo() || !nodos.length) return;
  const cols = columnas(nodos);
  A.utils.set(nodos, { opacity: 0, translateY: suave ? 14 : 56, scale: suave ? 0.98 : 0.92 });
  A.animate(nodos, {
    opacity: 1,
    translateY: 0,
    scale: 1,
    duration: suave ? 600 : 1100,
    delay: A.stagger(suave ? 18 : 55, { grid: [cols, Math.ceil(nodos.length / cols)], from: "first" }),
    ease: "outExpo",
  });
}

export function entradaCarril(nodos) {
  if (!activo() || !nodos.length) return;
  A.utils.set(nodos, { opacity: 0, translateX: 90 });
  A.animate(nodos, { opacity: 1, translateX: 0, duration: 1200, delay: A.stagger(70, { start: 250 }), ease: "outExpo" });
}

// Barras de nota que se llenan al entrar en pantalla.
export function barras(raiz, selector = ".ancha__relleno") {
  const els = [...raiz.querySelectorAll(selector)];
  if (!activo() || !els.length) return;
  A.utils.set(els, { scaleX: 0 });
  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      A.animate(e.target, { scaleX: 1, duration: 1500, delay: 150, ease: "outExpo" });
    }
  }, { threshold: 0.5 });
  els.forEach((el) => io.observe(el));
}

// Contador numérico (número que sube hasta su valor).
export function contar(el, hasta, formato) {
  if (!activo()) return void (el.textContent = formato(hasta));
  const o = { v: 0 };
  el.textContent = formato(0);
  const anim = A.animate(o, { v: hasta, duration: 1500, delay: 200, ease: "outExpo", onUpdate: () => (el.textContent = formato(o.v)) });
  // Si requestAnimationFrame se congela (pestaña en segundo plano), el valor final llega igual
  setTimeout(() => { anim.pause(); el.textContent = formato(hasta); }, 1800);
}

// Modal que se abre como una ventana del tamaño de la tarjeta que se expande.
export function abrirModal(dlg, panel, origen) {
  if (!dlg.open) dlg.showModal();
  if (!activo()) return;
  const b = panel.getBoundingClientRect();
  const a = origen?.getBoundingClientRect();
  if (a && a.width) {
    const w = Math.min(a.width, b.width);
    const h = Math.min(a.height, b.height);
    const cx = Math.max(0, Math.min(a.left - b.left, b.width - w));
    const cy = Math.max(0, Math.min(a.top - b.top, b.height - h));
    A.utils.set(panel, {
      translateX: a.left - (b.left + cx),
      translateY: a.top - (b.top + cy),
      clipPath: `inset(${cy}px ${b.width - cx - w}px ${b.height - cy - h}px ${cx}px round 10px)`,
    });
    A.animate(panel, {
      translateX: 0,
      translateY: 0,
      clipPath: "inset(0px 0px 0px 0px round 18px)",
      duration: 850,
      ease: "outExpo",
      onComplete: () => panel.style.removeProperty("clip-path"),
    });
  } else {
    A.utils.set(panel, { opacity: 0, translateY: 24, scale: 0.97 });
    A.animate(panel, { opacity: 1, translateY: 0, scale: 1, duration: 550, ease: "outExpo" });
  }
}

// Contenido del detalle: bloques escalonados, barras y anillo de nota.
export function detalle(panel, formato) {
  const hijos = panel.querySelectorAll("[data-entra]");
  const rellenos = panel.querySelectorAll(".barra__relleno");
  const anillo = panel.querySelector(".anillo__arco");
  const num = panel.querySelector(".anillo__num");
  if (num) contar(num, Number(num.dataset.valor), formato);
  if (!activo()) return;
  if (hijos.length) {
    A.utils.set(hijos, { opacity: 0, translateY: 18 });
    A.animate(hijos, { opacity: 1, translateY: 0, duration: 800, delay: A.stagger(50, { start: 240 }), ease: "outExpo" });
  }
  if (rellenos.length) {
    A.utils.set(rellenos, { scaleX: 0 });
    A.animate(rellenos, { scaleX: 1, duration: 1300, delay: A.stagger(70, { start: 450 }), ease: "outExpo" });
  }
  if (anillo) {
    const final = anillo.style.strokeDashoffset;
    A.utils.set(anillo, { strokeDashoffset: anillo.dataset.c });
    A.animate(anillo, { strokeDashoffset: final, duration: 1600, delay: 250, ease: "outExpo" });
  }
}

export function cerrarModal(dlg, panel) {
  if (!dlg.open) return;
  if (!activo()) return dlg.close();
  // El cierre no depende de que la animación termine (requestAnimationFrame se congela en pestañas ocultas).
  let hecho = false;
  const fin = () => {
    if (hecho) return;
    hecho = true;
    anim.pause();
    dlg.close();
    panel.removeAttribute("style");
  };
  const anim = A.animate(panel, { opacity: 0, translateY: 16, scale: 0.97, duration: 220, ease: "inQuad", onComplete: fin });
  setTimeout(fin, 260);
}

// Inclinación 3D con brillo que sigue al puntero (solo ratón).
export function inclinacion(cont, selector) {
  if (reducido.matches || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  cont.addEventListener("pointermove", (e) => {
    const t = e.target.closest(selector);
    if (!t) return;
    const r = t.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    t.style.setProperty("--ry", `${(x - 0.5) * 12}deg`);
    t.style.setProperty("--rx", `${(0.5 - y) * 12}deg`);
    t.style.setProperty("--mx", `${x * 100}%`);
    t.style.setProperty("--my", `${y * 100}%`);
  });
  cont.addEventListener("pointerout", (e) => {
    const t = e.target.closest(selector);
    if (t && !t.contains(e.relatedTarget)) ["--rx", "--ry"].forEach((p) => t.style.removeProperty(p));
  });
}

// La bola de añadir se deja atraer por el puntero cuando pasa cerca (efecto imán).
export function bola(el) {
  if (reducido.matches || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const RADIO = 150;
  addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2 - (parseFloat(el.style.getPropertyValue("--imanx")) || 0);
    const cy = r.top + r.height / 2 - (parseFloat(el.style.getPropertyValue("--imany")) || 0);
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    const f = d < RADIO ? (1 - d / RADIO) * 0.45 : 0;
    el.style.setProperty("--imanx", `${(dx * f).toFixed(1)}px`);
    el.style.setProperty("--imany", `${(dy * f).toFixed(1)}px`);
  }, { passive: true });
  if (activo()) A.animate(el, { scale: [0, 1], duration: 900, delay: 900, ease: "outElastic(1, .6)" });
}
