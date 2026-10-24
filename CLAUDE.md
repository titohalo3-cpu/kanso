# Kansō

Registro personal de los animes que he visto: portada, nombre, nota y, si tiene varias, sus temporadas con su nota. Datos en Supabase.

## Datos

- Stack: HTML, CSS y JS sin build ni frameworks. Anime.js 4.0.2, three.js 0.180.0 (import map) y supabase-js 2.45.4 por CDN (jsdelivr, versión fija).
- Servidor local: `preview_start` → `kanso` (puerto 5504, `.claude/launch.json`).
- Publicación: GitHub Pages (repo `titohalo3-cpu/kanso`, rama `main`, raíz) — URL: https://titohalo3-cpu.github.io/kanso/
- Supabase: proyecto propio de Kansō (`hxrnztktuzvmqzdkdmqs`, `js/config.js`, clave anon). Esquema en `supabase/schema.sql` + `supabase/sin-login.sql` (uso personal: la clave anon puede escribir, sin inicio de sesión).
- Portadas: búsqueda en la API pública de AniList (`js/anilist.js`).

## Estructura

- `index.html` — hero con túnel, carril «Mejor valorados», lista con buscador, orden y géneros, pie y diálogos.
- `css/estilos.css` — tokens en `:root` (oscuro y claro) y estilos. Dirección visual en `DESIGN.md`.
- `js/main.js` — render, filtros, detalle, formularios y sesión.
- `js/datos.js` — Supabase o, si no hay tablas (o con `?demo` en la URL), modo demo en localStorage (`kanso:demo:v1`).
- `js/tunel.js` — túnel WebGL de portadas (three.js).
- `js/animaciones.js` — todo el movimiento; respeta `prefers-reduced-motion`.

## Interacción principal

Lo que `probador-web` debe poder hacer para dar el proyecto por bueno:
- Ver la rejilla de pósters y el carril de mejor valorados.
- Filtrar por texto y por género, y cambiar el orden.
- Pulsar un anime con varias temporadas y ver cada temporada con su nota.
- Arrastrar el túnel y pulsar una portada (abre la ficha o el formulario con ese anime).
- Añadir un anime buscando la portada en AniList y añadirle una temporada.

## Reglas del proyecto

- Rutas relativas siempre (GitHub Pages sirve bajo `/<repo>/`).
- Colores y espacios solo con las variables de `:root`.
- Móvil primero: sin scroll horizontal a 375 px.
- Datos del usuario siempre con `textContent` (helper `h()`), nunca `innerHTML`. URLs de imagen solo `https://`.

## Estado

- Hecho: web completa, esquema SQL ejecutado en Supabase y publicada en GitHub Pages.
- Siguiente: ejecutar `supabase/sin-login.sql` y comprobar que se guarda sin iniciar sesión.
