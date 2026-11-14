import { useEffect, useRef } from "react";
import * as THREE from "three";

// colors per body: base, dark, light, atmosphere glow
const LOOK = {
  mars:   { c: ["#b5532f", "#6e2c17", "#e0925f"], glow: "#ff8a5c", bump: true },
  moon:   { c: ["#8d8d8d", "#4b4b4b", "#c4c4c4"], glow: null, bump: true },
  venus:  { c: ["#e3b66a", "#b9822f", "#f6e2a8"], glow: "#ffd58a" },
  europa: { c: ["#e4dccb", "#b9ad98", "#f4efe4"], glow: "#9fc4ff" },
  sun:    { c: ["#ff9a1f", "#e8400a", "#fff0a0"], glow: "#ff8a00", emissive: true },
};
const FALLBACK = { c: ["#6f7a99", "#3a4260", "#aeb8d6"], glow: "#7aa2ff" };

const hash = (x, y, s) => {
  const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return h - Math.floor(h);
};
const smooth = (t) => t * t * (3 - 2 * t);

// value noise that wraps horizontally so the texture has no seam
function noise(x, y, px, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash(((xi % px) + px) % px, yi, s);
  const b = hash((((xi + 1) % px) + px) % px, yi, s);
  const c = hash(((xi % px) + px) % px, yi + 1, s);
  const d = hash((((xi + 1) % px) + px) % px, yi + 1, s);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
function fbm(u, v, sx, sy, seed) {
  let amp = 0.5, sum = 0, norm = 0;
  for (let o = 0; o < 5; o++) {
    const f = 2 ** o;
    sum += amp * noise(u * sx * f, v * sy * f, sx * f, seed + o);
    norm += amp;
    amp *= 0.5;
  }
  return sum / norm;
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function makeTexture(slug, look) {
  const W = 512, H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(W, H);
  const [base, dark, light] = look.c.map(rgb);
  const seed = slug.length * 7.3;
  const banded = slug === "venus" || slug === "sun";

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      let n = banded
        ? fbm(u + fbm(u, v, 3, 3, seed) * 0.15, v, 4, 1.5, seed)
        : fbm(u, v, 4, 2, seed);
      let col = n < 0.5 ? mix(dark, base, n * 2) : mix(base, light, (n - 0.5) * 2);
      if (slug === "mars" && (v < 0.07 || v > 0.93)) col = mix(col, [245, 245, 250], 0.85);
      const i = (y * W + x) * 4;
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  if (slug === "moon" || slug === "mars") {
    for (let k = 0; k < 70; k++) {
      const x = Math.random() * W, y = H * 0.1 + Math.random() * H * 0.8;
      const r = 2 + Math.random() ** 2 * 16;
      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
      g.addColorStop(0, "rgba(0,0,0,0.35)");
      g.addColorStop(0.8, "rgba(0,0,0,0.12)");
      g.addColorStop(1, "rgba(255,255,255,0.22)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (slug === "europa") {
    ctx.strokeStyle = "rgba(130,70,40,0.55)";
    for (let k = 0; k < 40; k++) {
      ctx.lineWidth = 0.6 + Math.random() * 1.4;
      ctx.beginPath();
      let x = Math.random() * W, y = Math.random() * H;
      ctx.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        x += (Math.random() - 0.5) * 90; y += (Math.random() - 0.5) * 50;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

const glowMaterial = (color, power = 2) =>
  new THREE.ShaderMaterial({
    uniforms: { glow: { value: new THREE.Color(color) } },
    vertexShader: `varying vec3 vN;
      void main(){ vN = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 glow; varying vec3 vN;
      void main(){ float i = pow(max(0.0, 0.7 - dot(vN, vec3(0.0,0.0,1.0))), ${power.toFixed(1)});
      gl_FragColor = vec4(glow * i * 1.6, i); }`,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });

export default function Planet3D({ slug }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const look = LOOK[slug] || FALLBACK;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const texture = makeTexture(slug, look);
    const material = look.emissive
      ? new THREE.MeshBasicMaterial({ map: texture })
      : new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.95,
          metalness: 0,
          ...(look.bump ? { bumpMap: texture, bumpScale: 0.04 } : {}),
        });

    const planet = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), material);
    planet.rotation.z = 0.2;
    scene.add(planet);

    if (look.glow) {
      const atm = new THREE.Mesh(
        new THREE.SphereGeometry(look.emissive ? 1.35 : 1.14, 64, 64),
        glowMaterial(look.glow, look.emissive ? 3 : 2)
      );
      scene.add(atm);
    }

    if (!look.emissive) {
      scene.add(new THREE.AmbientLight(0xffffff, 0.35));
      const sun = new THREE.DirectionalLight(0xffffff, 2.6);
      sun.position.set(-3, 1.5, 3);
      scene.add(sun);
    }

    // optional real texture: public/textures/<slug>.jpg (falls back silently)
    new THREE.TextureLoader().load(
      `/textures/${slug}.jpg`,
      (real) => {
        real.colorSpace = THREE.SRGBColorSpace;
        material.map = real;
        if (material.bumpMap) material.bumpMap = real;
        material.needsUpdate = true;
      },
      undefined,
      () => {}
    );

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // drag to spin
    let dragging = false, lastX = 0, velocity = 0;
    const down = (e) => { dragging = true; lastX = e.clientX; };
    const up = () => { dragging = false; };
    const move = (e) => {
      if (!dragging) return;
      velocity = (e.clientX - lastX) * 0.008;
      planet.rotation.y += velocity;
      lastX = e.clientX;
    };
    const el = renderer.domElement;
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointermove", move);

    let raf;
    const loop = () => {
      if (!dragging) planet.rotation.y += 0.0018 + velocity * 0.9;
      velocity *= 0.95;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointermove", move);
      scene.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose?.();
      });
      texture.dispose();
      renderer.dispose();
      mount.removeChild(el);
    };
  }, [slug]);

  return <div className="planet-stage" ref={mountRef} />;
}