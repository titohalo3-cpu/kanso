# Kansō

Registro personal de los animes y películas de anime que he visto: portada, nombre, nota y, si un anime tiene varias, sus temporadas con su nota. Datos en Supabase.

## Datos

- Stack: HTML, CSS y JS sin build ni frameworks. Anime.js 4.0.2, three.js 0.180.0 (import map) y supabase-js 2.45.4 por CDN (jsdelivr, versión fija).
- Servidor local: `preview_start` → `kanso` (puerto 5504, `.claude/launch.json`).
- Publicación: GitHub Pages (repo `titohalo3-cpu/kanso`, rama `main`, raíz) — URL: https://titohalo3-cpu.github.io/kanso/
- Supabase: proyecto propio de Kansō (`hxrnztktuzvmqzdkdmqs`, `js/config.js`, clave anon). Esquema en `supabase/schema.sql` + `supabase/sin-login.sql` + `supabase/peliculas.sql` (columna `tipo`: `serie` o `pelicula`) (uso personal: la clave anon puede escribir, sin inicio de sesión).
- Portadas: búsqueda en la API pública de AniList (`js/anilist.js`).

## Estructura

- `index.html` — hero «AnimeMatch» con túnel, carril «Mejor valorados», lista con buscador y orden (recientes, antiguos, A-Z, mejor valorados) y diálogos.
- `css/estilos.css` — tokens en `:root` (oscuro y claro) y estilos. Dirección visual en `DESIGN.md`.
- `js/main.js` — render, filtros, detalle, formularios y sesión.
- `js/datos.js` — Supabase o, si no hay tablas (o con `?demo` en la URL), modo demo en localStorage (`kanso:demo:v1`).
- `js/tunel.js` — túnel WebGL de portadas (three.js): mis animes salen cada pocas portadas; el resto son 50 populares de AniList que cambian cada día (`anilist.delDia`, ciclo de 40 días).
- `js/visor.js` — visor 3D a pantalla completa de una portada del túnel (se gira 360° arrastrando).
- `js/apilado.js` — pila de cartas de temporadas en la ficha (adaptación de «Card swap» de bencho.dev).
- `js/animaciones.js` — todo el movimiento; respeta `prefers-reduced-motion`.

## Interacción principal

Lo que `probador-web` debe poder hacer para dar el proyecto por bueno:
- Ver la rejilla de pósters y el carril de mejor valorados.
- Filtrar por texto, por Todo / Animes / Películas y cambiar el orden.
- Pulsar un anime con varias temporadas (fondo desenfocado) y pasar sus cartas de temporada con un toque o arrastrando.
- Arrastrar el túnel y pulsar una portada: abre el visor 3D, girar la portada 360°.
- La bola naranja fija (abajo a la derecha) abre el alta de un anime; no hay más botones de añadir.
- Añadir un anime buscando la portada en AniList y añadirle una temporada.
- Añadir una película (selector Anime / Película en el formulario; la búsqueda se limita a películas). Las películas no tienen temporadas.

## Reglas del proyecto

- Rutas relativas siempre (GitHub Pages sirve bajo `/<repo>/`).
- Antes de cada publicación: `node tools/versionar.mjs` (pone `?v=` nuevo a `estilos.css` y a todos los módulos de `js/` vía import map, para que la caché de Pages no mezcle archivos viejos y nuevos). Si se añade un módulo nuevo a `js/`, entra solo.
- Colores y espacios solo con las variables de `:root`.
- Móvil primero: sin scroll horizontal a 375 px.
- Datos del usuario siempre con `textContent` (helper `h()`), nunca `innerHTML`. URLs de imagen solo `https://`.

## Estado

- Hecho: web completa, esquema SQL ejecutado en Supabase y publicada en GitHub Pages.
- Siguiente: ejecutar `supabase/sin-login.sql` y comprobar que se guarda sin iniciar sesión.
