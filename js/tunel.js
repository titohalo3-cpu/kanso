// Túnel de portadas en WebGL (three.js 0.180.0 por import map).
// Las portadas viajan por una pista en U: nacen a un lado, se alejan hasta el fondo y vuelven por el otro.
// Al arrastrar deprisa se doblan hacia quien mira y separan un poco sus colores.
import * as THREE from "three";

const OPCIONES = {
  ancho: 2.1,          // anchura de cada portada (alto = ancho × 1,5)
  hueco: 0.14,         // separación entre portadas
  crucero: 0.9,        // velocidad sin tocar nada (unidades/s)
  pliegue: 0.55,       // cuánto se doblan con la velocidad
  franja: 0.006,       // separación de colores con la velocidad
  bruma: [16, 40],     // distancias entre las que se funden con el fondo
  A: 6.6, B: 30, C: 2.6, // forma de la pista: x = A·sen φ, z = C − B·cos φ
  phiMax: 1.95,
};

const VERTEX = /* glsl */ `
  uniform float uFold;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec3 p = position;
    float c = uv.x * 2.0 - 1.0;
    p.z += uFold * (1.0 - c * c);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uHasTex;
  uniform vec3 uColor;
  uniform vec3 uGround;
  uniform float uImgAspect;
  uniform float uShift;
  uniform vec2 uHaze;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vDepth;

  float rounded(vec2 uv, vec2 size, float r) {
    vec2 q = abs((uv - 0.5) * size) - (size * 0.5 - r);
    return length(max(q, 0.0)) - r;
  }

  void main() {
    vec2 size = vec2(1.0, 1.5);
    if (rounded(vUv, size, 0.05) > 0.0) discard;
    // Encaje tipo "cover" de la imagen en la tarjeta 2:3
    vec2 uv = vUv;
    float plane = size.x / size.y;
    if (uImgAspect > plane) uv.x = (uv.x - 0.5) * plane / uImgAspect + 0.5;
    else uv.y = (uv.y - 0.5) * uImgAspect / plane + 0.5;
    vec3 col = uColor;
    if (uHasTex > 0.5) {
      col.r = texture2D(uTex, uv + vec2(uShift, 0.0)).r;
      col.g = texture2D(uTex, uv).g;
      col.b = texture2D(uTex, uv - vec2(uShift, 0.0)).b;
    }
    float haze = smoothstep(uHaze.x, uHaze.y, vDepth) * 0.6;
    col = mix(col, uGround, haze);
    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }
`;

export function crearTunel(contenedor, { fondo = "#ecebe6", alElegir = () => {}, reducido = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "tunel__lienzo";
  renderer.domElement.setAttribute("aria-hidden", "true");
  contenedor.prepend(renderer.domElement);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(34, 2, 0.1, 100);
  camara.position.set(0, 0.25, 8);
  camara.lookAt(0, 0, -12);

  const suelo = new THREE.Color(fondo);
  const cargador = new THREE.TextureLoader();
  cargador.setCrossOrigin("anonymous");
  const texturas = new Map();
  const geometria = new THREE.PlaneGeometry(OPCIONES.ancho, OPCIONES.ancho * 1.5, 24, 1);

  // Tabla de longitud de arco para repartir las portadas a distancias iguales
  const { A, B, C, phiMax } = OPCIONES;
  const MUESTRAS = 1200;
  const phis = new Float32Array(MUESTRAS + 1);
  const largos = new Float32Array(MUESTRAS + 1);
  let total = 0;
  for (let i = 0; i <= MUESTRAS; i++) {
    const phi = -phiMax + (2 * phiMax * i) / MUESTRAS;
    if (i) {
      const p0 = phis[i - 1];
      total += Math.hypot(A * (Math.sin(phi) - Math.sin(p0)), B * (Math.cos(phi) - Math.cos(p0)));
    }
    phis[i] = phi;
    largos[i] = total;
  }
  const phiEn = (s) => {
    let lo = 0, hi = MUESTRAS;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (largos[mid] < s) lo = mid; else hi = mid;
    }
    const t = (s - largos[lo]) / (largos[hi] - largos[lo] || 1);
    return phis[lo] + (phis[hi] - phis[lo]) * t;
  };

  const paso = OPCIONES.ancho + OPCIONES.hueco;
  const cuantas = Math.floor(total / paso);
  const tarjetas = [];
  for (let i = 0; i < cuantas; i++) {
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTex: { value: null },
        uHasTex: { value: 0 },
        uColor: { value: new THREE.Color("#2a2a33") },
        uGround: { value: suelo },
        uImgAspect: { value: 2 / 3 },
        uFold: { value: 0 },
        uShift: { value: 0 },
        uHaze: { value: new THREE.Vector2(...OPCIONES.bruma) },
        uOpacity: { value: 1 },
      },
    });
    const malla = new THREE.Mesh(geometria, material);
    malla.userData.base = i * paso;
    escena.add(malla);
    tarjetas.push(malla);
  }

  function textura(url) {
    if (texturas.has(url)) return texturas.get(url);
    const entrada = { tex: null, aspect: 2 / 3, esperando: [] };
    texturas.set(url, entrada);
    const listo = (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      entrada.tex = tex;
      entrada.aspect = tex.image.width / tex.image.height;
      entrada.esperando.forEach((fn) => fn());
      entrada.esperando = [];
    };
    // WebGL necesita la imagen con CORS. Se pide con otra URL para no chocar con la copia
    // sin cabeceras CORS que la caché guarda de las <img> normales.
    cargador.load(`${url}${url.includes("?") ? "&" : "?"}gl=1`, listo, undefined, () => {});
    return entrada;
  }

  // Cada imagen sale una sola vez: si hay menos imágenes que huecos, se reparten más separadas
  function ponerImagenes(items) {
    if (!items.length) return;
    const n = Math.min(items.length, tarjetas.length);
    const separacion = total / n;
    tarjetas.forEach((malla, i) => {
      malla.visible = i < n;
      if (!malla.visible) return;
      malla.userData.base = i * Math.max(paso, separacion);
      const item = items[i];
      const u = malla.material.uniforms;
      malla.userData.item = item;
      u.uColor.value.set(item.color || "#2a2a33");
      u.uHasTex.value = 0;
      if (!item.url) return;
      const e = textura(item.url);
      const aplicar = () => {
        if (malla.userData.item !== item) return;
        u.uTex.value = e.tex;
        u.uImgAspect.value = e.aspect;
        u.uHasTex.value = 1;
      };
      if (e.tex) aplicar(); else e.esperando.push(aplicar);
    });
  }

  // Movimiento: crucero + arrastre con inercia
  const POR_PIXEL = 0.03;
  let desplazamiento = 0;
  let velocidad = 0;
  let pausado = reducido;
  let arrastrando = null;
  let visible = true;

  const lienzo = renderer.domElement;
  lienzo.style.touchAction = "pan-y";
  contenedor.addEventListener("pointerdown", (e) => {
    if (e.target !== lienzo) return;
    arrastrando = { x: e.clientX, x0: e.clientX, y0: e.clientY, t: performance.now() };
    velocidad = 0;
    contenedor.classList.add("arrastrando");
  });
  addEventListener("pointermove", (e) => {
    if (!arrastrando) return;
    const ahora = performance.now();
    const dx = e.clientX - arrastrando.x;
    const dts = Math.max((ahora - arrastrando.t) / 1000, 0.008);
    arrastrando.x = e.clientX;
    arrastrando.t = ahora;
    desplazamiento += dx * POR_PIXEL;
    velocidad = velocidad * 0.5 + ((dx * POR_PIXEL) / dts) * 0.5;
  });
  addEventListener("pointerup", (e) => {
    if (!arrastrando) return;
    const quieto = Math.hypot(e.clientX - arrastrando.x0, e.clientY - arrastrando.y0) < 6;
    arrastrando = null;
    contenedor.classList.remove("arrastrando");
    if (quieto && e.target === lienzo) elegir(e);
  });
  lienzo.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // el scroll vertical sigue siendo de la página
    e.preventDefault();
    velocidad += e.deltaX * 0.05;
  }, { passive: false });

  const rayo = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  function elegir(e) {
    const r = lienzo.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(puntero, camara);
    const [golpe] = rayo.intersectObjects(tarjetas.filter((t) => t.visible), false);
    if (golpe?.object.userData.item) alElegir(golpe.object.userData.item);
  }
  lienzo.addEventListener("pointermove", (e) => {
    if (arrastrando) return;
    const r = lienzo.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(puntero, camara);
    contenedor.classList.toggle("sobre-portada", rayo.intersectObjects(tarjetas.filter((t) => t.visible), false).length > 0);
  });

  let escalaX = 1;
  function medir() {
    const { width, height } = contenedor.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camara.aspect = width / height;
    // En pantallas estrechas la pista se estrecha para que las portadas no se pierdan por los lados
    escalaX = Math.min(1, Math.max(0.42, camara.aspect / 2.4));
    camara.updateProjectionMatrix();
  }
  new ResizeObserver(medir).observe(contenedor);
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(contenedor);
  medir();

  const reloj = new THREE.Clock();
  const pos = new THREE.Vector3();
  function cuadro() {
    const dt = Math.min(reloj.getDelta(), 0.05);
    if (visible && !document.hidden) {
      if (!arrastrando) {
        velocidad *= Math.pow(0.06, dt); // inercia
        desplazamiento += ((pausado ? 0 : OPCIONES.crucero) + velocidad) * dt;
      }
      const brio = reducido ? 0 : Math.max(-1, Math.min(1, velocidad / 28));
      for (const malla of tarjetas) {
        const s = (((malla.userData.base + desplazamiento) % total) + total) % total;
        const phi = phiEn(s);
        pos.set(A * escalaX * Math.sin(phi), 0, C - B * Math.cos(phi));
        malla.position.copy(pos);
        const tx = A * escalaX * Math.cos(phi), tz = B * Math.sin(phi);
        malla.rotation.y = -Math.atan2(tz, tx) - brio * 0.35;
        const u = malla.material.uniforms;
        u.uFold.value = Math.abs(brio) * OPCIONES.pliegue;
        u.uShift.value = brio * OPCIONES.franja;
        // Aparecen y se van suavemente en los extremos de la pista
        const borde = Math.min(s, total - s);
        u.uOpacity.value = Math.min(1, borde / (paso * 1.2));
      }
      renderer.render(escena, camara);
    }
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);

  return {
    ponerImagenes,
    empujar: (v) => (velocidad += v),
    alternarPausa: () => (pausado = !pausado),
    get pausado() { return pausado; },
  };
}
