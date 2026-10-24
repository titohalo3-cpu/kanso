// Pila de cartas de temporadas (adaptado de «Card swap» de bencho.dev a JS sin frameworks).
// Cada carta está en una ranura: un paso más atrás, arriba y a la derecha que la anterior.
// Pulsar la carta de delante, o arrastrarla y soltarla, la manda al fondo y las demás avanzan.
// El orden es el único estado; mover una carta es cambiarle la ranura y dejar que la transición la lleve.

const PASO_X = 34;
const PASO_Y = 26;
const PASO_Z = 70;
const VISIBLES = 5;

const ranura = (k) => `translate3d(${k * PASO_X}px, ${-k * PASO_Y}px, ${-k * PASO_Z}px) skewY(6deg)`;

export function crearApilado(escenario, cartas, { alCambiar = () => {} } = {}) {
  let orden = cartas.map((_, i) => i);
  let arrastre = null;

  const asentar = () => cartas.forEach((c) => { c.style.transition = ""; c.style.transform = ""; });

  function pintar() {
    orden.forEach((idx, k) => {
      const c = cartas[idx];
      c.style.setProperty("--t", ranura(Math.min(k, VISIBLES - 1)));
      c.style.zIndex = String(cartas.length - k);
      c.style.opacity = k < VISIBLES ? "" : "0";
      c.toggleAttribute("data-frente", k === 0);
    });
    alCambiar(orden[0]);
  }

  function siguiente() {
    if (cartas.length < 2) return;
    asentar();
    orden = [...orden.slice(1), orden[0]];
    pintar();
  }

  // Solo se mueve la carta agarrada; la ventana escucha el gesto para no perderlo por el borde.
  // Pasado un poco, la carta va «con goma» para que un arrastre largo no la saque del bloque.
  const goma = (d) => 160 * Math.tanh(d / 160);
  function agarrar(e) {
    const c = e.currentTarget;
    if (!c.hasAttribute("data-frente") || arrastre || e.button !== 0) return;
    arrastre = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, t: performance.now(), c };
    c.style.transition = "none";
    addEventListener("pointermove", mover);
    addEventListener("pointerup", soltar);
    addEventListener("pointercancel", soltar);
  }
  function mover(e) {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    arrastre.dx = e.clientX - arrastre.x;
    arrastre.dy = e.clientY - arrastre.y;
    const x = goma(arrastre.dx), y = goma(arrastre.dy);
    arrastre.c.style.transform = `${ranura(0)} translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(x * 0.05).toFixed(2)}deg)`;
  }
  function soltar(e) {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const { dx, dy, t } = arrastre;
    arrastre = null;
    removeEventListener("pointermove", mover);
    removeEventListener("pointerup", soltar);
    removeEventListener("pointercancel", soltar);
    const lejos = Math.hypot(dx, dy);
    const rapido = lejos / Math.max(1, performance.now() - t) > 0.6;
    // Un toque, o un arrastre largo o rápido: al fondo. Si no, vuelve a su sitio.
    if (e.type !== "pointercancel" && (lejos < 6 || lejos > 70 || (rapido && lejos > 24))) siguiente();
    else asentar();
  }

  cartas.forEach((c) => {
    c.addEventListener("pointerdown", agarrar);
    c.addEventListener("dragstart", (e) => e.preventDefault());
  });
  pintar();
  return { siguiente };
}
