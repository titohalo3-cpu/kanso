# Kansō · Dirección visual

**Idea:** las portadas que he visto forman un pasillo. El hero es un túnel WebGL con mis portadas reales (o las populares de AniList mientras la lista es corta); al pulsar una se abre su ficha o, si aún no la tengo, el formulario para añadirla.

## Referencias
- **Yohaku Tunnel Hero** (HorizonX): hero de una pantalla, fondo hueso, titular centrado en dos tonos, dos acciones y túnel de imágenes que se pliega al arrastrar.
- Fila horizontal tipo Netflix: tarjetas 16:9 con sello TOP, píldora de temporadas y barra de nota debajo.
- Rejilla tipo Disney+: pósters 2:3 con velo oscuro bajo el nombre y la línea nota • año • géneros.

## Tokens
- Fondo `--fondo` #ecebe6 · superficie `--superficie` #f6f5f1 · hundido `--hundido` #e1e0da · tinta `--texto` #111.
- Acento `--acento` #ff4a1c: solo sello, puesto TOP, píldoras de temporadas y barras de nota.
- Niveles de nota: oro ≥ 9, verde ≥ 7,5, ámbar ≥ 5, rojo < 5.
- Una sola familia: Geist (400–700), cifras tabulares. Titular 500 con tracking −0,05 em.
- Botones siempre redondos (999px). Imágenes con radio 6 px. Sin sombras en reposo, sin líneas finas, sin degradados salvo el velo bajo texto sobre imagen.
- Solo tema claro.

## Movimiento
- Túnel (`js/tunel.js`): crucero lento, arrastre con inercia, pliegue y separación de color según la velocidad, bruma hacia el fondo. Botón de pausa y flechas del teclado.
- Anime.js: titular letra a letra, entradas escalonadas al hacer scroll, contadores, barras que se llenan, ficha que se abre desde la tarjeta.
- Curva base `cubic-bezier(.16,1,.3,1)` (outExpo). Con `prefers-reduced-motion` el túnel arranca parado y no se pliega.
