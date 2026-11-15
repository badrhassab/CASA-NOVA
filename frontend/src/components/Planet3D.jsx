import React, { useEffect, useRef, useState } from "react";
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
  const safeSlug = (slug || "mars").toLowerCase();
  const W = 512, H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  const img = ctx.createImageData(W, H);
  const [base, dark, light] = look.c.map(rgb);
  const seed = safeSlug.length * 7.3;
  const banded = safeSlug === "venus" || safeSlug === "sun";

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      let n = banded
        ? fbm(u + fbm(u, v, 3, 3, seed) * 0.15, v, 4, 1.5, seed)
        : fbm(u, v, 4, 2, seed);
      let col = n < 0.5 ? mix(dark, base, n * 2) : mix(base, light, (n - 0.5) * 2);
      if (safeSlug === "mars" && (v < 0.07 || v > 0.93)) col = mix(col, [245, 245, 250], 0.85);
      const i = (y * W + x) * 4;
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  if (safeSlug === "moon" || safeSlug === "mars") {
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
  if (safeSlug === "europa") {
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

export default function Planet3D({ slug = "mars", className = "planet-stage" }) {
  const mountRef = useRef(null);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const safeSlug = (slug || "mars").toLowerCase();
    const look = LOOK[safeSlug] || FALLBACK;

    mount.innerHTML = "";

    let scene;
    let camera;
    let renderer;
    let raf;
    let ro;

    try {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.z = 4.2;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "default" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      mount.appendChild(renderer.domElement);

      // Starfield
      const starCount = 350;
      const starGeo = new THREE.BufferGeometry();
      const starPositions = new Float32Array(starCount * 3);
      const starColors = new Float32Array(starCount * 3);

      for (let i = 0; i < starCount; i++) {
        const rad = 25 + Math.random() * 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        starPositions[i * 3]     = rad * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta);
        starPositions[i * 3 + 2] = rad * Math.cos(phi);

        const isOrange = Math.random() < 0.1;
        if (isOrange) {
          starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.42; starColors[i * 3 + 2] = 0.17;
        } else {
          const b = 0.65 + Math.random() * 0.35;
          starColors[i * 3] = b; starColors[i * 3 + 1] = b; starColors[i * 3 + 2] = Math.min(1.0, b + Math.random() * 0.15);
        }
      }

      starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

      const starCanvas = document.createElement("canvas");
      starCanvas.width = 16; starCanvas.height = 16;
      const sCtx = starCanvas.getContext("2d");
      if (sCtx) {
        const starGrad = sCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
        starGrad.addColorStop(0, "rgba(255,255,255,1)");
        starGrad.addColorStop(0.35, "rgba(255,255,255,0.75)");
        starGrad.addColorStop(1, "rgba(255,255,255,0)");
        sCtx.fillStyle = starGrad;
        sCtx.beginPath(); sCtx.arc(8, 8, 8, 0, Math.PI * 2); sCtx.fill();
      }
      const starTexture = new THREE.CanvasTexture(starCanvas);

      const starMat = new THREE.PointsMaterial({
        size: 0.22,
        map: starTexture,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);

      // Planet sphere
      const texture = makeTexture(safeSlug, look);
      const material = look.emissive
        ? new THREE.MeshBasicMaterial({ map: texture })
        : new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.92,
            metalness: 0.05,
            ...(look.bump ? { bumpMap: texture, bumpScale: 0.045 } : {}),
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
        scene.add(new THREE.AmbientLight(0xffffff, 0.45));
        const sun = new THREE.DirectionalLight(0xffffff, 2.8);
        sun.position.set(-3, 1.8, 3.2);
        scene.add(sun);
        const rim = new THREE.DirectionalLight(0x4060aa, 0.6);
        rim.position.set(3, -1, -2);
        scene.add(rim);
      }

      const resize = () => {
        if (!mount) return;
        const w = mount.clientWidth || 320;
        const h = mount.clientHeight || 320;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      ro = new ResizeObserver(resize);
      ro.observe(mount);

      let dragging = false, lastX = 0, velocity = 0;
      const down = (e) => { dragging = true; lastX = e.clientX; };
      const up = () => { dragging = false; };
      const move = (e) => {
        if (!dragging) return;
        velocity = (e.clientX - lastX) * 0.008;
        planet.rotation.y += velocity;
        stars.rotation.y += velocity * 0.25;
        lastX = e.clientX;
      };
      const el = renderer.domElement;
      el.addEventListener("pointerdown", down);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointermove", move);

      const loop = () => {
        if (!dragging) {
          planet.rotation.y += 0.002 + velocity * 0.9;
          stars.rotation.y += 0.0003;
          stars.rotation.x += 0.0001;
        }
        velocity *= 0.95;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      loop();

      return () => {
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        el.removeEventListener("pointerdown", down);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointermove", move);
        scene.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            const m = o.material;
            if (Array.isArray(m)) m.forEach(x => x.dispose());
            else m.dispose();
          }
        });
        starTexture.dispose();
        texture.dispose();
        renderer.dispose();
        if (mount.contains(el)) {
          mount.removeChild(el);
        }
      };
    } catch (err) {
      console.warn("WebGL initialization note:", err);
      setWebglError(true);
    }
  }, [slug]);

  if (webglError) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="w-48 h-48 rounded-full border border-orange-500/40 bg-gradient-to-tr from-orange-950 via-slate-900 to-amber-900/50 shadow-[0_0_60px_rgba(255,90,31,0.25)] flex items-center justify-center font-mono text-[10px] text-orange-300">
          ● {slug ? slug.toUpperCase() : 'CELESTIAL BODY'}
        </div>
      </div>
    );
  }

  return <div className={className} ref={mountRef} />;
}
