// Pone una versión nueva a la hoja de estilos y a todos los módulos JS en index.html,
// para que el navegador no mezcle archivos nuevos con otros viejos guardados en caché.
// Uso, antes de cada publicación:  node tools/versionar.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const ruta = join(raiz, "index.html");
const version = new Date().toISOString().replace(/\D/g, "").slice(0, 14); // AAAAMMDDhhmmss

// Los módulos propios entran en el import map con su versión; así también se versionan
// los import "./x.js" que hay dentro de los propios módulos.
const modulos = readdirSync(join(raiz, "js")).filter((f) => f.endsWith(".js")).sort();
const mapa = {
  three: "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/",
  ...Object.fromEntries(modulos.map((f) => [`./js/${f}`, `./js/${f}?v=${version}`])),
};

let html = readFileSync(ruta, "utf8");
const etiquetas = [/<link rel="stylesheet" href="css\/estilos\.css/, /<script type="importmap">/, /<script type="module" src="js\/main\.js/];
if (!etiquetas.every((e) => e.test(html))) throw new Error("No he encontrado las etiquetas que versionar en index.html");
html = html
  .replace(/<link rel="stylesheet" href="css\/estilos\.css(\?v=\w+)?">/, `<link rel="stylesheet" href="css/estilos.css?v=${version}">`)
  .replace(/<script type="importmap">[\s\S]*?<\/script>/, `<script type="importmap">${JSON.stringify({ imports: mapa })}</script>`)
  .replace(/<script type="module" src="js\/main\.js(\?v=\w+)?"><\/script>/, `<script type="module" src="js/main.js?v=${version}"></script>`);

writeFileSync(ruta, html);
console.log(`Versión ${version}: estilos.css y ${modulos.length} módulos JS.`);
