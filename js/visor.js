// Visor 3D de una portada: la portada es una carta con grosor que se gira 360° arrastrando.
// Delante va la portada; detrás, una ficha dibujada en un canvas con el nombre y la nota.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const ANCHO = 2;
const ALTO = 3;
const GROSOR = 0.07;

// Brillo que barre la carta según el ángulo, como una carta plastificada
const BRILLO_V = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const BRILLO_F = /* glsl */ `
  uniform float uAng;
  varying vec2 vUv;
  float rounded(vec2 uv, vec2 size, float r) {
    vec2 q = abs((uv - 0.5) * size) - (size * 0.5 - r);
    return length(max(q, 0.0)) - r;
  }
  void main() {
    if (rounded(vUv, vec2(1.0, 1.5), 0.04) > 0.0) discard;
    float banda = (vUv.x + vUv.y * 0.6) - (0.8 + uAng * 0.7);
    float luz = pow(max(0.0, 1.0 - abs(banda) * 3.0), 3.0) * 0.32;
    gl_FragColor = vec4(vec3(luz), luz);
  }
`;

function dorso({ nombre, nota, meta, temporadas, color }) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1536;
  const x = c.getContext("2d");
  x.fillStyle = "#111111";
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = color || "#ff4a1c";
  x.fillRect(0, 0, c.width, 18);
  const f = (peso, px) => `${peso} ${px}px Geist, system-ui, sans-serif`;
  x.fillStyle = "#ffffff";
  x.font = f(600, 44);
  x.fillText("AnimeMatch", 80, 140);
  // Nombre en varias líneas
  x.font = f(700, 104);
  const palabras = nombre.split(" ");
  let linea = "";
  let y = 330;
  for (const p of palabras) {
    const prueba = linea ? `${linea} ${p}` : p;
    if (x.measureText(prueba).width > 860 && linea) {
      x.fillText(linea, 80, y);
      linea = p;
      y += 108;
    } else linea = prueba;
  }
  x.fillText(linea, 80, y);
  x.fillStyle = "#9a9893";
  x.font = f(500, 40);
  x.fillText(meta, 80, y + 80);
  if (nota) {
    x.fillStyle = "#ffffff";
    x.font = f(700, 300);
    x.fillText(nota, 70, 1080);
    x.fillStyle = "#9a9893";
    x.font = f(500, 44);
    x.fillText("Mi nota", 84, 1150);
  } else {
    x.fillStyle = "#ffffff";
    x.font = f(600, 64);
    x.fillText("Aún no la he visto", 80, 1120);
  }
  x.font = f(500, 38);
  temporadas.slice(0, 4).forEach((t, i) => x.fillText(t, 84, 1270 + i * 56));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function crearVisor(contenedor) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "visor__canvas";
  contenedor.append(renderer.domElement);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camara.position.set(0, 0, 9);

  const canto = new THREE.MeshBasicMaterial({ color: "#1c1c1c" });
  const frente = new THREE.MeshBasicMaterial({ color: "#2a2a33" });
  const atras = new THREE.MeshBasicMaterial({ color: "#111111" });
  const geo = new RoundedBoxGeometry(ANCHO, ALTO, GROSOR, 6, 0.09);
  const carta = new THREE.Mesh(geo, [canto, canto, canto, canto, frente, atras]);
  const grupo = new THREE.Group();
  grupo.add(carta);
  const brillo = new THREE.ShaderMaterial({
    vertexShader: BRILLO_V, fragmentShader: BRILLO_F, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, uniforms: { uAng: { value: 0 } },
  });
  const capaDelante = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, ALTO), brillo);
  capaDelante.position.z = GROSOR / 2 + 0.002;
  const capaDetras = capaDelante.clone();
  capaDetras.rotation.y = Math.PI;
  capaDetras.position.z = -capaDelante.position.z;
  grupo.add(capaDelante, capaDetras);
  escena.add(grupo);

  const cargador = new THREE.TextureLoader();
  cargador.setCrossOrigin("anonymous");

  // Giro: arrastre horizontal libre (360°), vertical limitado; inercia al soltar
  let giroY = 0, giroX = 0, velY = 0, objetivoX = 0;
  let arrastre = null;
  let activo = false;
  let entrada = 0;
  const lienzo = renderer.domElement;
  lienzo.style.touchAction = "none";
  lienzo.addEventListener("pointerdown", (e) => {
    arrastre = { x: e.clientX, y: e.clientY, t: performance.now() };
    lienzo.setPointerCapture(e.pointerId);
    contenedor.classList.add("girando");
  });
  lienzo.addEventListener("pointermove", (e) => {
    if (!arrastre) return;
    const ahora = performance.now();
    const dx = e.clientX - arrastre.x;
    const dy = e.clientY - arrastre.y;
    const dt = Math.max((ahora - arrastre.t) / 1000, 0.008);
    giroY += dx * 0.012;
    objetivoX = Math.max(-0.45, Math.min(0.45, objetivoX + dy * 0.006));
    velY = velY * 0.5 + ((dx * 0.012) / dt) * 0.5;
    arrastre = { x: e.clientX, y: e.clientY, t: ahora };
  });
  const soltar = () => { arrastre = null; contenedor.classList.remove("girando"); };
  lienzo.addEventListener("pointerup", soltar);
  lienzo.addEventListener("pointercancel", soltar);
  lienzo.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") velY -= 4;
    if (e.key === "ArrowRight") velY += 4;
  });

  function medir() {
    const { width, height } = contenedor.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camara.aspect = width / height;
    // La carta siempre cabe: se aleja la cámara en pantallas bajas o estrechas
    const distAlto = (ALTO * (camara.aspect < 1 ? 0.6 : 0.74)) / Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
    const distAncho = distAlto / Math.min(1, camara.aspect / 0.62);
    camara.position.z = Math.max(distAlto, distAncho);
    // En pantallas anchas la carta se aparta a la derecha para dejar sitio al texto
    const mitadAncho = Math.tan(THREE.MathUtils.degToRad(camara.fov / 2)) * camara.position.z * camara.aspect;
    grupo.position.x = camara.aspect > 1.1 ? mitadAncho * 0.3 : 0;
    camara.updateProjectionMatrix();
  }
  new ResizeObserver(medir).observe(contenedor);

  const reloj = new THREE.Clock();
  function cuadro() {
    if (!activo) return;
    const dt = Math.min(reloj.getDelta(), 0.05);
    const t = reloj.elapsedTime;
    entrada = Math.min(1, entrada + dt * 1.4);
    const e = 1 - Math.pow(1 - entrada, 4);
    if (!arrastre) {
      giroY += velY * dt;
      velY *= Math.pow(0.08, dt);
      objetivoX *= Math.pow(0.2, dt);
    }
    giroX += (objetivoX - giroX) * Math.min(1, dt * 10);
    grupo.rotation.set(giroX + Math.sin(t * 0.8) * 0.03, giroY + (1 - e) * -1.6 + Math.sin(t * 0.5) * 0.06, 0);
    grupo.position.y = Math.sin(t * 1.1) * 0.05 - (1 - e) * 0.6;
    grupo.scale.setScalar(0.7 + e * 0.3);
    // El brillo sigue al ángulo de la carta
    const ang = Math.atan2(Math.sin(giroY), Math.cos(giroY)) / Math.PI;
    brillo.uniforms.uAng.value = ang;
    renderer.render(escena, camara);
    requestAnimationFrame(cuadro);
  }

  return {
    mostrar(datos) {
      giroY = 0; giroX = 0; velY = 0; objetivoX = 0; entrada = 0;
      frente.map?.dispose(); atras.map?.dispose();
      frente.map = null; frente.color.set(datos.color || "#2a2a33"); frente.needsUpdate = true;
      atras.map = dorso(datos); atras.color.set("#ffffff"); atras.needsUpdate = true;
      carta.scale.y = 1;
      if (datos.poster_url) {
        const u = `${datos.poster_url}${datos.poster_url.includes("?") ? "&" : "?"}gl=1`;
        cargador.load(u, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 8;
          frente.map = tex;
          frente.color.set("#ffffff");
          frente.needsUpdate = true;
          // La carta toma la proporción real de la portada
          const aspecto = tex.image.width / tex.image.height;
          carta.scale.y = ANCHO / aspecto / ALTO;
          capaDelante.scale.y = capaDetras.scale.y = carta.scale.y;
        });
      }
      medir();
      if (!activo) {
        activo = true;
        reloj.getDelta();
        requestAnimationFrame(cuadro);
      }
    },
    parar() { activo = false; },
    girar: (v) => (velY += v),
  };
}
