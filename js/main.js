import * as datos from "./datos.js";
import * as anilist from "./anilist.js";
import * as fx from "./animaciones.js";
import { crearApilado } from "./apilado.js";

const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
let tunel = null;
let relleno = []; // portadas en tendencia para el túnel mientras la lista es corta

const $ = (s, r = document) => r.querySelector(s);
const estado = { series: [], texto: "", orden: "recientes", editable: true, abierta: null };
let contexto = null; // qué edita el formulario: { tipo: "serie" | "temporada", id?, serie_id? }

// --- Utilidades --------------------------------------------------------------
function h(tag, props = {}, ...hijos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "style") for (const [p, val] of Object.entries(v)) n.style.setProperty(p, val);
    else if (k === "dataset") Object.assign(n.dataset, v);
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const c of hijos.flat()) if (c != null && c !== false && c !== "") n.append(c);
  return n;
}

const svg = (d) => {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("aria-hidden", "true");
  s.innerHTML = d; // solo trazos fijos de este archivo
  return s;
};
const ICONOS = {
  cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13 7 4 4"/>',
  borrar: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
};

const urlSegura = (u) => (typeof u === "string" && /^https:\/\/\S+$/i.test(u.trim()) ? u.trim() : "");
const colorSeguro = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || "") ? c : "#2a2a33");
const normal = (s) => (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const fmt = (n) => (n == null ? "–" : (Math.round(n * 10) / 10).toFixed(1).replace(".", ","));
const nivel = (n) => (n == null ? null : n >= 9 ? "oro" : n >= 7.5 ? "alto" : n >= 5 ? "medio" : "bajo");
const plural = (n, una, varias) => `${n} ${n === 1 ? una : varias}`;

export function notaDe(s) {
  if (s.nota != null) return Number(s.nota);
  const ns = (s.temporadas || []).map((t) => t.nota).filter((n) => n != null).map(Number);
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : null;
}

function imagen(url, clase = "") {
  const u = urlSegura(url);
  if (!u) return null;
  const img = h("img", { class: clase || null, src: u, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" });
  img.addEventListener("error", () => img.remove(), { once: true });
  return img;
}

function intercalar(partes) {
  return partes.filter(Boolean).flatMap((p, i) => (i ? [h("span", { class: "punto", "aria-hidden": "true" }, "•"), p] : [p]));
}

let temporizador;
function aviso(msg, tipo = "ok") {
  const t = $("#toast");
  t.textContent = msg;
  t.dataset.tipo = tipo;
  if (t.matches(":popover-open")) t.hidePopover();
  t.showPopover();
  clearTimeout(temporizador);
  temporizador = setTimeout(() => t.hidePopover(), 3400);
}

function mensajeError(e) {
  const m = e?.message || String(e);
  if (e?.code === "42501" || /row-level security/i.test(m)) return "Supabase no deja escribir: ejecuta supabase/sin-login.sql en el SQL Editor.";
  return `No se pudo guardar: ${m}`;
}

// --- Tarjetas ----------------------------------------------------------------
function tarjeta(s) {
  const n = notaDe(s);
  const temps = s.temporadas?.length || 0;
  return h("li", { class: "celda" },
    h("button", {
      type: "button", class: "tarjeta", style: { "--c": colorSeguro(s.color) }, dataset: { id: s.id },
      "aria-label": `${s.nombre}. Nota ${fmt(n)}${temps > 1 ? `. ${temps} temporadas` : ""}`,
    },
      imagen(s.poster_url, "tarjeta__img"),
      temps > 1 && h("span", { class: "tarjeta__temps" }, `${temps} temp.`),
      h("span", { class: "tarjeta__info" },
        h("span", { class: "tarjeta__nombre" }, s.nombre),
        h("span", { class: "tarjeta__meta" }, intercalar([
          h("span", { class: "nota-chip", dataset: { nivel: nivel(n) } }, fmt(n)),
          s.anio && h("span", {}, String(s.anio)),
          s.generos?.length && h("span", { class: "meta__generos" }, s.generos.join(", ")),
        ])),
      ),
      h("span", { class: "tarjeta__brillo", "aria-hidden": "true" }),
    ),
  );
}

function tarjetaAncha(s, puesto) {
  const n = notaDe(s);
  const temps = s.temporadas?.length || 0;
  const banner = urlSegura(s.banner_url);
  return h("li", { class: "ancha" },
    h("button", { type: "button", class: "ancha__boton", dataset: { id: s.id }, "aria-label": `Número ${puesto}: ${s.nombre}. Nota ${fmt(n)}` },
      h("span", { class: "ancha__marco", style: { "--c": colorSeguro(s.color) } },
        imagen(banner || s.poster_url, banner ? "ancha__img" : "ancha__img ancha__img--poster"),
        h("span", { class: "ancha__puesto", "aria-hidden": "true" }, h("small", {}, "TOP"), String(puesto)),
        h("span", { class: "ancha__nombre", "aria-hidden": "true" }, s.nombre),
        temps > 1 && h("span", { class: "ancha__pill" }, `${temps} temporadas`),
      ),
      h("span", { class: "ancha__pie", "aria-hidden": "true" },
        h("span", { class: "ancha__barra" }, h("span", { class: "ancha__relleno", style: { "--p": `${(n ?? 0) * 10}%` } })),
        h("span", { class: "ancha__nota" }, fmt(n)),
      ),
    ),
  );
}

// --- Render ------------------------------------------------------------------
const ORDENES = {
  recientes: (a, b) => new Date(b.creado_en) - new Date(a.creado_en),
  antiguos: (a, b) => new Date(a.creado_en) - new Date(b.creado_en),
  nota: (a, b) => (notaDe(b) ?? -1) - (notaDe(a) ?? -1),
  nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
};

function filtradas() {
  const t = normal(estado.texto.trim());
  return estado.series
    .filter((s) => (!t || normal(`${s.nombre} ${s.titulo_original || ""}`).includes(t)))
    .sort(ORDENES[estado.orden]);
}

function render({ animar = "no" } = {}) {
  const lista = filtradas();
  const rejilla = $("#rejilla");
  rejilla.replaceChildren(...lista.map(tarjeta));
  rejilla.removeAttribute("aria-busy");

  $("#vacio").hidden = lista.length > 0;
  $("#btn-anadir-vacio").hidden = estado.series.length > 0;
  $("#vacio-texto").textContent = estado.series.length
    ? "Nada coincide con ese filtro."
    : "Aún no has apuntado ningún anime. Empieza por el último que terminaste.";

  const filtrando = estado.texto.trim();
  const top = estado.series.filter((s) => notaDe(s) != null).sort(ORDENES.nota).slice(0, 10);
  $("#top").hidden = filtrando || top.length < 2;
  if (animar === "todo" || !$("#carril").children.length || animar === "no") {
    $("#carril").replaceChildren(...top.map((s, i) => tarjetaAncha(s, i + 1)));
    fx.barras($("#carril"));
  }

  $("#contador").textContent = `${plural(estado.series.length, "anime", "animes")} en la lista`;
  if (animar === "todo") {
    fx.entrada([...rejilla.children]);
    fx.entradaCarril([...$("#carril").children]);
  } else if (animar === "filtro") fx.entrada([...rejilla.children], { suave: true });
}

function renderStats() {
  const temps = estado.series.reduce((a, s) => a + Math.max(1, s.temporadas?.length || 0), 0);
  const notas = estado.series.map(notaDe).filter((n) => n != null);
  const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
  $('[data-palabra="series"]').textContent = estado.series.length === 1 ? "anime" : "animes";
  $('[data-palabra="temporadas"]').textContent = temps === 1 ? "temporada" : "temporadas";
  fx.contar($('[data-stat="series"]'), estado.series.length, (v) => String(Math.round(v)));
  fx.contar($('[data-stat="temporadas"]'), temps, (v) => String(Math.round(v)));
  if (media == null) $('[data-stat="media"]').textContent = "–";
  else fx.contar($('[data-stat="media"]'), media, fmt);
}

// --- Detalle -----------------------------------------------------------------
function anillo(n) {
  const C = 2 * Math.PI * 44;
  const arco = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  const pista = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  for (const c of [pista, arco]) {
    c.setAttribute("cx", "50"); c.setAttribute("cy", "50"); c.setAttribute("r", "44");
  }
  pista.setAttribute("class", "anillo__pista");
  arco.setAttribute("class", "anillo__arco");
  arco.setAttribute("stroke-dasharray", C.toFixed(2));
  arco.dataset.c = C.toFixed(2);
  arco.style.strokeDashoffset = (C * (1 - (n ?? 0) / 10)).toFixed(2);
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 100 100");
  s.setAttribute("aria-hidden", "true");
  s.append(pista, arco);
  return h("div", { class: "anillo", dataset: { nivel: nivel(n) } },
    h("div", { class: "anillo__svg" }, s, h("span", { class: "anillo__num", dataset: { valor: n ?? 0 } }, fmt(n))),
    h("span", { class: "anillo__leyenda" }, "Mi nota"),
  );
}

// Temporadas como pila de cartas: la de delante es la que se describe al lado.
function pilaTemporadas(temps, s) {
  const color = { "--c": colorSeguro(s.color) };
  const cartas = temps.map((t) =>
    h("div", { class: "carta", style: color, "aria-hidden": "true" },
      imagen(t.poster_url || s.poster_url, "carta__img"),
      h("span", { class: "carta__etiqueta" }, `Temporada ${t.numero} · ${fmt(t.nota == null ? null : Number(t.nota))}`),
    ),
  );
  const num = h("p", { class: "temporada__num" });
  const nombre = h("h4", { class: "temporada__nombre" });
  const nota = h("span", { class: "temporada__nota" });
  const relleno = h("span", { class: "barra__relleno" });
  const pos = h("p", { class: "temporada__pos" });
  const info = h("div", { class: "temporada-info", "aria-live": "polite" },
    num, nombre,
    h("div", { class: "temporada__puntos" }, nota, h("span", { class: "barra__pista", "aria-hidden": "true" }, relleno)),
    pos,
  );
  let actual = temps[0];
  const acciones = h("div", { class: "temporada__acciones" },
    temps.length > 1 && h("button", { type: "button", class: "boton boton--oscuro", onclick: () => pila.siguiente() }, "Siguiente temporada"),
    estado.editable && h("button", { type: "button", class: "icono", "aria-label": "Editar esta temporada", onclick: () => abrirForm({ tipo: "temporada", id: actual.id, serie_id: s.id }, actual) }, svg(ICONOS.editar)),
    estado.editable && h("button", { type: "button", class: "icono", "aria-label": "Borrar esta temporada", onclick: () => borrarTemporada(actual) }, svg(ICONOS.borrar)),
  );
  info.append(acciones);
  const escenario = h("div", { class: "pila__escenario", style: { "--cuantas": String(Math.min(temps.length, 5)) } }, cartas);
  const pila = crearApilado(escenario, cartas, {
    alCambiar: (i) => {
      actual = temps[i];
      const n = actual.nota == null ? null : Number(actual.nota);
      info.dataset.nivel = nivel(n) || "";
      num.textContent = `Temporada ${actual.numero}${actual.anio ? ` · ${actual.anio}` : ""}`;
      nombre.textContent = actual.nombre;
      nota.textContent = fmt(n);
      relleno.style.setProperty("--p", `${(n ?? 0) * 10}%`);
      pos.textContent = temps.length > 1 ? `${i + 1} de ${temps.length} · pulsa o arrastra la carta para ver la siguiente` : "La única temporada apuntada.";
    },
  });
  return h("div", { class: "pila", "data-entra": "" }, h("div", { class: "pila__marco" }, escenario), info);
}

function contenidoDetalle(s) {
  const n = notaDe(s);
  const temps = s.temporadas || [];
  const banner = urlSegura(s.banner_url);
  const c = { "--c": colorSeguro(s.color) };
  return [
    h("button", { type: "button", class: "icono modal__cerrar", "aria-label": "Cerrar", onclick: cerrarDetalle }, svg(ICONOS.cerrar)),
    h("div", { class: "det__banner", style: c }, imagen(banner || s.poster_url, banner ? "" : "det__banner--poster")),
    h("div", { class: "det__cab" },
      h("div", { class: "det__poster", style: c, "data-entra": "" }, imagen(s.poster_url)),
      h("div", { class: "det__titulos", "data-entra": "" },
        h("h2", { class: "det__nombre", id: "det-nombre" }, s.nombre),
        s.titulo_original && h("p", { class: "det__original" }, s.titulo_original),
        h("p", { class: "det__meta" }, intercalar([
          s.anio && h("span", {}, String(s.anio)),
          h("span", {}, plural(Math.max(1, temps.length), "temporada", "temporadas")),
          s.nota == null && temps.length > 1 && h("span", {}, "nota media de temporadas"),
        ])),
        s.generos?.length && h("div", { class: "det__generos" }, s.generos.map((g) => h("span", {}, g))),
      ),
      h("div", { "data-entra": "", class: "det__anillo" }, anillo(n)),
    ),
    h("section", { class: "det__temporadas", "aria-labelledby": "det-temps" },
      h("div", { class: "det__temporadas-cab", "data-entra": "" },
        h("h3", { id: "det-temps" }, "Temporadas"),
        estado.editable && h("button", { type: "button", class: "boton boton--claro", onclick: () => abrirForm({ tipo: "temporada", serie_id: s.id }, { numero: (temps.at(-1)?.numero || 0) + 1, nombre: `${s.nombre} · Temporada ${(temps.at(-1)?.numero || 0) + 1}` }) }, svg(ICONOS.mas), "Añadir temporada"),
      ),
      temps.length
        ? pilaTemporadas(temps, s)
        : h("p", { class: "det__solo", "data-entra": "" }, "Aún no has apuntado temporadas sueltas: su nota es la del anime."),
    ),
    estado.editable && h("footer", { class: "det__acciones", "data-entra": "" },
      h("button", { type: "button", class: "boton boton--peligro", onclick: () => borrarSerie(s) }, svg(ICONOS.borrar), "Borrar anime"),
      h("button", { type: "button", class: "boton boton--claro", onclick: () => abrirForm({ tipo: "serie", id: s.id }, s) }, svg(ICONOS.editar), "Editar anime"),
    ),
  ];
}

function pintarDetalle(s) {
  const panel = $("#detalle-panel");
  panel.replaceChildren(...contenidoDetalle(s));
  fx.detalle(panel, fmt);
}

function abrirDetalle(id, origen) {
  const s = estado.series.find((x) => String(x.id) === String(id));
  if (!s) return;
  estado.abierta = s.id;
  const panel = $("#detalle-panel");
  panel.removeAttribute("style");
  panel.replaceChildren(...contenidoDetalle(s));
  panel.scrollTop = 0;
  fx.abrirModal($("#detalle"), panel, origen);
  fx.detalle(panel, fmt);
}

function cerrarDetalle() {
  estado.abierta = null;
  fx.cerrarModal($("#detalle"), $("#detalle-panel"));
}

// --- Formulario ----------------------------------------------------------------
const form = $("#form");
let busqueda = null;

function previsualizar(url) {
  $("#f-preview").replaceChildren(imagen(url) || "");
}

function rellenar(valores) {
  for (const [k, v] of Object.entries(valores)) {
    const campo = form.elements[k];
    if (!campo || campo instanceof RadioNodeList) continue;
    campo.value = k === "generos" && Array.isArray(v) ? v.join(", ") : k === "nota" && v != null ? fmt(Number(v)) : (v ?? "");
  }
  previsualizar(form.elements.poster_url.value);
}

function abrirForm(ctx, valores = {}) {
  contexto = ctx;
  form.reset();
  form.dataset.tipo = ctx.tipo;
  form.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
  $("#f-resultados").replaceChildren();
  $("#form-titulo").textContent = ctx.tipo === "serie" ? (ctx.id ? "Editar anime" : "Añadir anime") : ctx.id ? "Editar temporada" : "Añadir temporada";
  rellenar(valores);
  const dlg = $("#dlg-form");
  fx.abrirModal(dlg, form);
  $("#f-buscar").focus();
}

function mostrarResultados(media) {
  const lista = $("#f-resultados");
  if (!media.length) return lista.replaceChildren(h("li", { class: "resultados__estado" }, "Sin resultados."));
  lista.replaceChildren(...media.map((m) => {
    const d = anilist.aDatos(m);
    return h("li", {},
      h("button", { type: "button", class: "resultado", onclick: () => elegir(d) },
        imagen(d.poster_url) || h("span", { class: "resultado__hueco" }),
        h("span", {}, h("strong", {}, d.nombre), h("small", {}, [d.anio, m.format?.replace("_", " ")].filter(Boolean).join(" · "))),
      ),
    );
  }));
}

function elegir(d) {
  const valores = contexto.tipo === "serie"
    ? d
    : { nombre: d.nombre, poster_url: d.poster_url, anio: d.anio, anilist_id: d.anilist_id };
  rellenar(valores);
  $("#f-resultados").replaceChildren();
  $("#f-buscar").value = "";
  form.elements.nota.focus();
}

$("#f-buscar").addEventListener("input", (e) => {
  const texto = e.target.value.trim();
  clearTimeout(busqueda?.t);
  busqueda?.ctrl.abort();
  if (texto.length < 2) return $("#f-resultados").replaceChildren();
  const ctrl = new AbortController();
  busqueda = {
    ctrl,
    t: setTimeout(async () => {
      $("#f-resultados").replaceChildren(h("li", { class: "resultados__estado" }, "Buscando…"));
      try { mostrarResultados(await anilist.buscar(texto, ctrl.signal)); }
      catch (err) { if (err.name !== "AbortError") $("#f-resultados").replaceChildren(h("li", { class: "resultados__estado" }, "AniList no responde; pega la URL a mano.")); }
    }, 350),
  };
});
$("#f-buscar").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $(".resultado")?.focus(); }
});
form.elements.poster_url.addEventListener("input", (e) => previsualizar(e.target.value));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const v = (k) => String(fd.get(k) ?? "").trim();
  const num = (k) => (v(k) === "" ? null : Number(v(k).replace(",", ".")));
  const notaOk = v("nota") === "" || form.elements.nota.checkValidity();
  form.elements.nota.toggleAttribute("aria-invalid", !notaOk);
  form.elements.nombre.toggleAttribute("aria-invalid", !v("nombre"));
  if (!v("nombre")) return aviso("Escribe el nombre.", "error"), form.elements.nombre.focus();
  if (!notaOk) return aviso("La nota va de 0 a 10, con un decimal como mucho.", "error"), form.elements.nota.focus();
  if (contexto.tipo === "temporada" && v("nota") === "") return aviso("Pon la nota de la temporada.", "error"), form.elements.nota.focus();

  const base = { id: contexto.id, nombre: v("nombre"), poster_url: urlSegura(v("poster_url")) || null, anio: num("anio"), nota: num("nota"), anilist_id: num("anilist_id") };
  const boton = $("#f-guardar");
  boton.setAttribute("aria-busy", "true");
  try {
    if (contexto.tipo === "serie") {
      await datos.guardarSerie({
        ...base,
        titulo_original: v("titulo_original") || null,
        banner_url: urlSegura(v("banner_url")) || null,
        color: /^#[0-9a-f]{3,8}$/i.test(v("color")) ? v("color") : null,
        generos: v("generos").split(",").map((g) => g.trim()).filter(Boolean).slice(0, 6),
      });
    } else {
      await datos.guardarTemporada({ ...base, serie_id: contexto.serie_id, numero: num("numero") ?? 1 });
    }
    fx.cerrarModal($("#dlg-form"), form);
    await recargar();
    aviso(contexto.id ? "Cambios guardados." : "Añadido a tu lista.");
  } catch (err) {
    aviso(mensajeError(err), "error");
  } finally {
    boton.removeAttribute("aria-busy");
  }
});

async function borrarSerie(s) {
  if (!confirm(`¿Borrar «${s.nombre}» y todas sus temporadas?`)) return;
  try {
    await datos.borrarSerie(s.id);
    cerrarDetalle();
    await recargar();
    aviso("Anime borrado.");
  } catch (err) { aviso(mensajeError(err), "error"); }
}

async function borrarTemporada(t) {
  if (!confirm(`¿Borrar «${t.nombre}»?`)) return;
  try {
    await datos.borrarTemporada(t.id);
    await recargar();
    aviso("Temporada borrada.");
  } catch (err) { aviso(mensajeError(err), "error"); }
}

// --- Eventos generales ---------------------------------------------------------
for (const dlg of document.querySelectorAll(".modal, .visor")) {
  const panel = dlg.querySelector(".modal__panel");
  const cerrar = () => (dlg.id === "detalle" ? cerrarDetalle() : dlg.id === "visor" ? cerrarVisor() : fx.cerrarModal(dlg, panel));
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); cerrar(); });
  dlg.addEventListener("click", (e) => {
    if ((e.target === dlg && dlg.id !== "visor") || e.target.closest("[data-cerrar]")) cerrar();
  });
}

for (const id of ["#rejilla", "#carril"]) {
  $(id).addEventListener("click", (e) => {
    const b = e.target.closest("[data-id]");
    if (b) abrirDetalle(b.dataset.id, b.closest(".tarjeta, .ancha__marco") || b.querySelector(".ancha__marco") || b);
  });
}
fx.inclinacion($("#rejilla"), ".tarjeta");

document.querySelectorAll("[data-carril]").forEach((b) =>
  b.addEventListener("click", () => {
    const c = $("#carril");
    c.scrollBy({ left: Number(b.dataset.carril) * c.clientWidth * 0.8, behavior: "smooth" });
  }),
);

let retardoBusqueda;
$("#buscar").addEventListener("input", (e) => {
  estado.texto = e.target.value;
  clearTimeout(retardoBusqueda);
  retardoBusqueda = setTimeout(() => render({ animar: "filtro" }), 140);
});
$("#orden").addEventListener("change", (e) => {
  estado.orden = e.target.value;
  render({ animar: "filtro" });
});
for (const id of ["#btn-anadir", "#btn-anadir-hero", "#btn-anadir-vacio"]) $(id).addEventListener("click", () => abrirForm({ tipo: "serie" }));

// --- Túnel de portadas -----------------------------------------------------------
// Una portada por anime (nunca las de sus temporadas) y, detrás, las populares que no tengo.
function imagenesTunel() {
  const propias = [];
  const urls = new Set();
  const ids = new Set();
  for (const s of estado.series) {
    const u = urlSegura(s.poster_url);
    if (!u || urls.has(u)) continue;
    urls.add(u);
    if (s.anilist_id) ids.add(Number(s.anilist_id));
    propias.push({ url: u, color: colorSeguro(s.color), id: s.id });
  }
  const extra = relleno.filter((r) => !urls.has(r.url) && !ids.has(Number(r.datos.anilist_id)));
  $("#tunel-ayuda").textContent = propias.length
    ? "Arrastra para explorar · pulsa una portada para abrirla"
    : "Arrastra para explorar · pulsa una portada para añadirla";
  return [...propias, ...extra];
}

// Al pulsar una portada del túnel se abre el visor 3D (nunca el formulario de alta)
let visor = null;
async function elegirDelTunel(item) {
  const s = item.id != null ? estado.series.find((x) => x.id === item.id) : null;
  const d = s || item.datos;
  if (!d) return;
  const n = s ? notaDe(s) : null;
  const temps = s?.temporadas || [];
  const meta = [d.anio, (d.generos || []).join(", ")].filter(Boolean).join(" · ");
  const dlg = $("#visor");
  dlg.style.setProperty("--c", colorSeguro(d.color));
  $("#visor-nombre").textContent = d.nombre;
  $("#visor-origen").textContent = s
    ? (temps.length > 1 ? `En mi lista · ${temps.length} temporadas` : "En mi lista")
    : "Popular ahora en AniList";
  $("#visor-nota").textContent = fmt(n);
  $("#visor-nota").parentElement.hidden = !s;
  if (!s) $("#visor-origen").textContent = "Popular ahora en AniList · aún no la he visto";
  $("#visor-meta").textContent = meta;
  const enlaceAniList = d.anilist_id && h("a", { class: "boton boton--claro", href: `https://anilist.co/anime/${Number(d.anilist_id)}`, target: "_blank", rel: "noopener" }, "Ver en AniList", svg('<path d="M7 17 17 7M8 7h9v9"/>'));
  $("#visor-acciones").replaceChildren(...[
    s && h("button", { type: "button", class: "boton boton--claro", onclick: () => { cerrarVisor(); abrirDetalle(s.id); } }, "Ver ficha completa"),
    enlaceAniList,
  ].filter(Boolean));
  dlg.showModal();
  fx.detalle(dlg, fmt);
  $("#visor-escena").focus({ preventScroll: true });
  try {
    if (!visor) visor = (await import("./visor.js")).crearVisor($("#visor-escena"));
    visor.mostrar({
      nombre: d.nombre,
      poster_url: urlSegura(d.poster_url),
      color: colorSeguro(d.color),
      nota: s ? fmt(n) : null,
      meta,
      temporadas: temps.map((t) => `Temporada ${t.numero} · ${fmt(t.nota == null ? null : Number(t.nota))}`),
    });
  } catch (e) {
    console.warn("[Kansō] Sin visor 3D; muestro la portada quieta.", e.message);
    $("#visor-escena").replaceChildren(h("div", { class: "visor__quieta" }, imagen(d.poster_url)));
  }
}

function cerrarVisor() {
  visor?.parar();
  $("#visor").close();
}

function pintarQuieto(items) {
  $("#tunel-quieto").replaceChildren(...items.slice(0, 9).map((it) => h("li", { style: { background: it.color } }, imagen(it.url))));
}

function actualizarTunel() {
  const items = imagenesTunel();
  if (tunel) tunel.ponerImagenes(items);
  else pintarQuieto(items);
}

async function iniciarTunel() {
  const cont = $("#tunel");
  try {
    relleno = (await anilist.tendencias(50)).map((m) => {
      const d = anilist.aDatos(m);
      return { url: urlSegura(d.poster_url), color: colorSeguro(d.color), datos: d };
    }).filter((r) => r.url);
  } catch { relleno = []; }
  try {
    const { crearTunel } = await import("./tunel.js");
    tunel = crearTunel(cont, { fondo: getComputedStyle(document.documentElement).getPropertyValue("--fondo").trim(), alElegir: elegirDelTunel, reducido });
    cont.classList.add("con-webgl");
  } catch (e) {
    console.warn("[Kansō] Sin WebGL; el túnel se queda quieto.", e.message);
    $("#tunel-pausa").hidden = true;
  }
  actualizarTunel();
}

$("#tunel").addEventListener("keydown", (e) => {
  if (!tunel || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
  e.preventDefault();
  tunel.empujar(e.key === "ArrowRight" ? 6 : -6);
});
$("#tunel-pausa").addEventListener("click", (e) => {
  if (!tunel) return;
  const pausado = tunel.alternarPausa();
  e.currentTarget.setAttribute("aria-pressed", String(pausado));
  e.currentTarget.setAttribute("aria-label", pausado ? "Reanudar el túnel" : "Pausar el túnel");
});
if (reducido) {
  $("#tunel-pausa").setAttribute("aria-pressed", "true");
  $("#tunel-pausa").setAttribute("aria-label", "Reanudar el túnel");
}

// --- Arranque ------------------------------------------------------------------
async function recargar(primera = false) {
  try {
    estado.series = await datos.listar();
  } catch (err) {
    aviso(`No se pudo cargar la lista: ${err.message}`, "error");
  }
  render({ animar: primera ? "todo" : "no" });
  renderStats();
  actualizarTunel();
  const abierta = estado.series.find((s) => s.id === estado.abierta);
  if (abierta && $("#detalle").open) pintarDetalle(abierta);
}

async function iniciar() {
  await Promise.all([fx.cargar(), datos.iniciar()]);
  fx.titular($("#titulo"));
  if (datos.modo === "demo") {
    const a = $("#aviso");
    a.replaceChildren(
      h("strong", {}, "Modo demo. "),
      "Los cambios se guardan solo en este navegador. Para guardarlos en Supabase ejecuta ",
      h("code", {}, "supabase/schema.sql"),
      " en el SQL Editor y recarga.",
    );
    a.hidden = false;
  }
  await recargar(true);
  fx.alEntrar(document.querySelectorAll(".seccion__cab"));
  iniciarTunel();
}

iniciar();
