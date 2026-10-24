# Kansō

Registro personal de los animes que he visto: portada, nombre, nota y, si tiene varias, sus temporadas con su nota. Datos en Supabase.

## Datos

- Stack: HTML, CSS y JS sin build ni frameworks. Anime.js 4.0.2 y supabase-js 2.45.4 por CDN (jsdelivr, versión fija).
- Servidor local: `preview_start` → `kanso` (puerto 5504, `.claude/launch.json`).
- Publicación: GitHub Pages — URL: pendiente.
- Supabase: proyecto de DBD Builds (`js/config.js`, clave anon). Esquema en `supabase/schema.sql`.
- Portadas: búsqueda en la API pública de AniList (`js/anilist.js`).

## Estructura

- `index.html` — lateral (buscador, orden, géneros, estadísticas), carril «Mejor valorados», rejilla y diálogos.
- `css/estilos.css` — tokens en `:root` (oscuro y claro) y estilos. Dirección visual en `DESIGN.md`.
- `js/main.js` — render, filtros, detalle, formularios y sesión.
- `js/datos.js` — Supabase o, si no hay tablas, modo demo en localStorage (`kanso:demo:v1`).
- `js/animaciones.js` — todo el movimiento; respeta `prefers-reduced-motion`.

## Interacción principal

Lo que `probador-web` debe poder hacer para dar el proyecto por bueno:
- Ver la rejilla de pósters y el carril de mejor valorados.
- Filtrar por texto y por género, y cambiar el orden.
- Pulsar un anime con varias temporadas y ver cada temporada con su nota.
- (Modo demo o con sesión) añadir un anime buscando la portada en AniList y añadirle una temporada.

## Reglas del proyecto

- Rutas relativas siempre (GitHub Pages sirve bajo `/<repo>/`).
- Colores y espacios solo con las variables de `:root`.
- Móvil primero: sin scroll horizontal a 375 px.
- Datos del usuario siempre con `textContent` (helper `h()`), nunca `innerHTML`. URLs de imagen solo `https://`.

## Estado

- Hecho: web completa, esquema SQL y modo demo.
- Siguiente: ejecutar `supabase/schema.sql`, crear usuario en Supabase Auth y añadirlo a `anime_duenos`.
