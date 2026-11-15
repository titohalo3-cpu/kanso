// Búsqueda de portadas en AniList (API GraphQL pública, sin clave y con CORS).
const API = "https://graphql.anilist.co";
const CAMPOS = "id title { romaji english } coverImage { extraLarge color } bannerImage seasonYear startDate { year } genres format";

const GENEROS = {
  Action: "Acción", Adventure: "Aventura", Comedy: "Comedia", Drama: "Drama", Ecchi: "Ecchi",
  Fantasy: "Fantasía", Horror: "Terror", "Mahou Shoujo": "Mahō shōjo", Mecha: "Mecha", Music: "Música",
  Mystery: "Misterio", Psychological: "Psicológico", Romance: "Romance", "Sci-Fi": "Ciencia ficción",
  "Slice of Life": "Cotidiano", Sports: "Deportes", Supernatural: "Sobrenatural", Thriller: "Thriller",
};

// AniList limita las peticiones por minuto (429) y a veces falla un momento (5xx):
// se reintenta una vez tras la espera que pide, y lo ya buscado sale de la caché.
const cache = new Map();
const espera = (ms, signal) => new Promise((ok, mal) => {
  const t = setTimeout(ok, ms);
  signal?.addEventListener("abort", () => { clearTimeout(t); mal(new DOMException("Cancelada", "AbortError")); }, { once: true });
});

export class ErrorAniList extends Error {
  constructor(estado) {
    super(estado === 429 ? "AniList está saturado" : `AniList respondió ${estado}`);
    this.estado = estado;
  }
}

async function consulta(query, variables, signal) {
  const clave = JSON.stringify([query, variables]);
  if (cache.has(clave)) return cache.get(clave);
  for (let intento = 0; ; intento++) {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
      signal,
    });
    if (res.ok) {
      const { data } = await res.json();
      const media = data?.Page?.media ?? [];
      cache.set(clave, media);
      return media;
    }
    if (intento > 0 || !(res.status === 429 || res.status >= 500)) throw new ErrorAniList(res.status);
    const segundos = Number(res.headers.get("Retry-After")) || 3;
    await espera(Math.min(segundos, 10) * 1000, signal);
  }
}

// soloPeliculas: limita la búsqueda a películas (formato MOVIE)
// (AniList responde 500 si format_in llega a null, así que el filtro solo se añade con películas)
export function buscar(texto, signal, soloPeliculas = false) {
  const filtro = soloPeliculas ? ", format_in: [MOVIE]" : "";
  return consulta(
    `query ($s: String) { Page(perPage: 8) { media(search: $s, type: ANIME, sort: SEARCH_MATCH${filtro}) { ${CAMPOS} } } }`,
    { s: texto },
    signal,
  );
}

// Portadas del día para el túnel: cada día una página distinta de los animes más populares,
// así que cambian a diario por otros que no han salido (el ciclo da la vuelta cada 40 días).
export function delDia(fecha = new Date()) {
  const dia = Math.floor((fecha.getTime() - fecha.getTimezoneOffset() * 60000) / 86400000);
  return consulta(
    `query ($p: Int) { Page(page: $p, perPage: 50) { media(sort: POPULARITY_DESC, type: ANIME, isAdult: false, format_in: [TV, MOVIE, ONA]) { ${CAMPOS} } } }`,
    { p: (dia % 40) + 1 },
  );
}

// Convierte un resultado de AniList en los campos del formulario.
export function aDatos(m) {
  const nombre = m.title.english || m.title.romaji;
  return {
    nombre,
    titulo_original: m.title.romaji && m.title.romaji !== nombre ? m.title.romaji : "",
    poster_url: m.coverImage?.extraLarge || "",
    banner_url: m.bannerImage || "",
    color: m.coverImage?.color || "",
    anio: m.seasonYear || m.startDate?.year || "",
    generos: (m.genres || []).slice(0, 3).map((g) => GENEROS[g] || g),
    anilist_id: m.id,
    tipo: m.format === "MOVIE" ? "pelicula" : "serie",
  };
}

// Datos de ejemplo para el modo demo (cuando Supabase aún no tiene las tablas).
const SEMILLA = [
  { n: "Frieren", ids: [154587], nota: 9.6 },
  { n: "Death Note", ids: [1535], nota: 9.3 },
  { n: "Cyberpunk: Edgerunners", ids: [120377], nota: 9.0 },
  { n: "Attack on Titan", ids: [16498, 20958, 99147, 110277], notas: [9.0, 8.4, 9.3, 8.8] },
  { n: "JoJo's Bizarre Adventure", ids: [14719, 20474, 21450, 102883], notas: [8.3, 8.6, 9.0, 8.9], fijo: true },
  { n: "Jujutsu Kaisen", ids: [113415, 145064], notas: [8.5, 8.9] },
  { n: "Vinland Saga", ids: [101348, 136430], notas: [9.1, 8.7] },
  { n: "Steins;Gate", ids: [9253], nota: 9.2 },
  { n: "Chainsaw Man", ids: [127230], nota: 8.4 },
  { n: "Cowboy Bebop", ids: [1], nota: 8.8 },
];

export async function semillaDemo() {
  let porId = new Map();
  try {
    const ids = SEMILLA.flatMap((s) => s.ids);
    const media = await consulta(
      `query ($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, type: ANIME) { ${CAMPOS} } } }`,
      { ids },
    );
    porId = new Map(media.map((m) => [m.id, aDatos(m)]));
  } catch (e) {
    console.warn("[Kansō] AniList no responde; la demo irá sin imágenes.", e.message);
  }
  const ahora = Date.now();
  return SEMILLA.map((s, i) => {
    const base = porId.get(s.ids[0]) || {};
    const serie = {
      ...base,
      nombre: s.fijo || !base.nombre ? s.n : base.nombre,
      nota: s.nota ?? null,
      creado_en: new Date(ahora - i * 86400000).toISOString(),
      temporadas: [],
    };
    if (s.notas) {
      serie.temporadas = s.ids.map((id, j) => {
        const t = porId.get(id) || {};
        return {
          numero: j + 1,
          nombre: t.nombre || `Temporada ${j + 1}`,
          poster_url: t.poster_url || "",
          anio: t.anio || null,
          nota: s.notas[j],
          anilist_id: id,
        };
      });
    }
    return serie;
  });
}
