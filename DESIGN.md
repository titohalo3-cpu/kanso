# Kansō · Dirección visual

**Idea:** sala de cine a oscuras. Las portadas son las protagonistas; la interfaz se retira y solo el rojo bermellón marca lo importante (puesto, temporadas, nota).

## Referencias
- Fila horizontal tipo Netflix: tarjetas 16:9, sello «TOP» rojo, píldora roja de temporadas y barra de nota bajo la tarjeta.
- Rejilla tipo Disney+: pósters 2:3, degradado inferior, nombre en tipografía de cartel y línea de meta (nota • año • géneros).
- Distribución de HorizonX Explore: lateral fijo con buscador, orden y chips; contenido a la derecha.
- Movimiento: entradas escalonadas de Anime.js, inclinación con brillo (Unlumen), contadores y aperturas que se expanden desde la tarjeta (bencho.dev).

## Tokens
- Fondo `--fondo` #0a0a0d · superficie `--superficie` #16161c · texto `--texto` #f4f1ec.
- Acento `--acento` #f43f2e (bermellón). Niveles de nota: oro ≥ 9, verde ≥ 7,5, ámbar ≥ 5, rojo < 5.
- Tipos: Bricolage Grotesque (cartel, ancho 78 %), Geist (texto), Geist Mono (notas).
- Radios 6 / 10 / 18 px. Espaciado en múltiplos de 4.
- Tema claro automático con `prefers-color-scheme: light`; las tarjetas siguen oscuras porque llevan imagen.

## Movimiento
- Curva base `cubic-bezier(.16,1,.3,1)` (outExpo en Anime.js).
- Todo se desactiva con `prefers-reduced-motion: reduce`.
