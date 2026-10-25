// Capa de datos: Supabase si las tablas existen; si no, modo demo en localStorage.
import { SUPABASE } from "./config.js";
import { semillaDemo } from "./anilist.js";

const SB_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
const CLAVE_LOCAL = "kanso:demo:v1";
const CAMPOS_SERIE = ["nombre", "titulo_original", "poster_url", "banner_url", "color", "anio", "generos", "nota", "anilist_id", "tipo"];
const CAMPOS_TEMPORADA = ["serie_id", "numero", "nombre", "poster_url", "anio", "nota", "anilist_id"];

let sb = null;
export let modo = "demo";

export async function iniciar() {
  // ?demo en la URL fuerza el modo demo (para probar sin tocar la base de datos)
  if (!SUPABASE.url || !SUPABASE.clave || new URLSearchParams(location.search).has("demo")) return modo;
  try {
    const { createClient } = await import(SB_CDN);
    sb = createClient(SUPABASE.url, SUPABASE.clave);
    const { error } = await sb.from("anime_series").select("id").limit(1);
    if (error) throw error;
    modo = "supabase";
  } catch (e) {
    console.warn("[Kansō] Supabase sin tablas o sin conexión; uso el modo demo.", e.message || e);
    sb = null;
  }
  return modo;
}

const solo = (obj, campos) => Object.fromEntries(campos.filter((c) => c in obj).map((c) => [c, obj[c]]));
const ordenar = (s) => ({ ...s, temporadas: [...(s.temporadas || [])].sort((a, b) => a.numero - b.numero) });

// --- Modo demo -------------------------------------------------------------
let memoria = null;

async function local() {
  if (memoria) return memoria;
  try { memoria = JSON.parse(localStorage.getItem(CLAVE_LOCAL)); } catch { memoria = null; }
  if (!memoria) {
    memoria = { sig: 1, series: [] };
    for (const s of await semillaDemo()) {
      const id = memoria.sig++;
      memoria.series.push({ ...s, id, temporadas: s.temporadas.map((t) => ({ ...t, id: memoria.sig++, serie_id: id })) });
    }
    persistir();
  }
  return memoria;
}

function persistir() {
  try { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(memoria)); } catch { /* sin almacenamiento: queda en memoria */ }
}

// --- API común -------------------------------------------------------------
export async function listar() {
  if (sb) {
    const { data, error } = await sb
      .from("anime_series")
      .select("*, temporadas:anime_temporadas(*)")
      .order("creado_en", { ascending: false });
    if (error) throw error;
    return data.map(ordenar);
  }
  return structuredClone((await local()).series).map(ordenar);
}

export async function guardarSerie(serie) {
  const fila = solo(serie, CAMPOS_SERIE);
  if (sb) {
    const q = serie.id ? sb.from("anime_series").update(fila).eq("id", serie.id) : sb.from("anime_series").insert(fila);
    const { error } = await q;
    if (error) throw error;
    return;
  }
  const m = await local();
  if (serie.id) Object.assign(m.series.find((s) => s.id === serie.id), fila);
  else m.series.push({ ...fila, id: m.sig++, creado_en: new Date().toISOString(), temporadas: [] });
  persistir();
}

export async function borrarSerie(id) {
  if (sb) {
    const { error } = await sb.from("anime_series").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const m = await local();
  m.series = m.series.filter((s) => s.id !== id);
  persistir();
}

export async function guardarTemporada(temp) {
  const fila = solo(temp, CAMPOS_TEMPORADA);
  if (sb) {
    const q = temp.id ? sb.from("anime_temporadas").update(fila).eq("id", temp.id) : sb.from("anime_temporadas").insert(fila);
    const { error } = await q;
    if (error) throw error;
    return;
  }
  const m = await local();
  const serie = m.series.find((s) => s.id === temp.serie_id);
  if (temp.id) Object.assign(serie.temporadas.find((t) => t.id === temp.id), fila);
  else serie.temporadas.push({ ...fila, id: m.sig++ });
  persistir();
}

export async function borrarTemporada(id) {
  if (sb) {
    const { error } = await sb.from("anime_temporadas").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const m = await local();
  for (const s of m.series) s.temporadas = s.temporadas.filter((t) => t.id !== id);
  persistir();
}
