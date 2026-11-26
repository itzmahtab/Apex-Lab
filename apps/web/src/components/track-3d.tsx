"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface Track3DData {
  year: number; sessionName: string; lapTimeS: number; driver: string; driverName: string | null; teamColour: string | null;
  points: { t: number; x: number; y: number; z: number }[];
}

const fmtLap = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, "0")}`;
/** OpenF1 positions are in decimetres (a lap of Monza integrates to ~5.8 km at this scale). */
const UNIT_M = 0.1;

/**
 * Circuit in 3D from real car positions: an asphalt ribbon with real (exaggerated) elevation,
 * a racing line coloured by speed, and the lap's car replaying it in real time.
 * Pass `data`, or `src` to fetch it lazily (an API route returning Track3DData or null).
 */
export function Track3D({ data: initial, src, className = "h-[420px]", compact = false }: { data?: Track3DData | null; src?: string; className?: string; compact?: boolean }) {
  const [data, setData] = useState<Track3DData | null | undefined>(initial ?? (src ? undefined : null));
  const host = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const [lengthKm, setLengthKm] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src || initial) return;
    let gone = false;
    fetch(src).then((r) => (r.ok ? r.json() : null)).then((d: Track3DData | null) => { if (!gone) setData(d); }).catch(() => { if (!gone) setData(null); });
    return () => { gone = true; };
  }, [src, initial]);

  useEffect(() => {
    const el = host.current;
    if (!el || !data || data.points.length < 30) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { setFailed(true); return; }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    el.appendChild(renderer.domElement);

    // --- normalise geometry ---
    const raw = data.points;
    const xs = raw.map((p) => p.x), ys = raw.map((p) => p.y), zs = raw.map((p) => p.z);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, zMin = Math.min(...zs);
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;
    const S = 10 / span;
    const zRange = Math.max(...zs) - zMin;
    // real elevation, exaggerated ×3 but capped so flat street circuits still read
    const E = Math.min(S * 3, zRange > 0 ? 0.9 / zRange : 0);
    const P = raw.map((p) => new THREE.Vector3((p.x - cx) * S, (p.z - zMin) * E + 0.02, -(p.y - cy) * S));

    // speed from consecutive positions (km/h), lightly smoothed
    const spd = raw.map((p, i) => {
      const a = raw[Math.max(0, i - 1)]!, b = raw[Math.min(raw.length - 1, i + 1)]!;
      const dt = b.t - a.t, d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) * UNIT_M;
      return dt > 0 ? (d / dt) * 3.6 : 0;
    });
    const smooth = spd.map((_, i) => { let s = 0, n = 0; for (let k = -2; k <= 2; k++) { const v = spd[i + k]; if (v != null) { s += v; n++; } } return s / n; });
    let len = 0; for (let i = 1; i < raw.length; i++) len += Math.hypot(raw[i]!.x - raw[i - 1]!.x, raw[i]!.y - raw[i - 1]!.y) * UNIT_M;
    setLengthKm(len / 1000);
    const vMin = Math.min(...smooth), vMax = Math.max(...smooth);

    const curve = new THREE.CatmullRomCurve3(P, true, "centripetal");
    const n = P.length;
    const M = n * 4;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x08090c, 14, 30);
    const camera = new THREE.PerspectiveCamera(compact ? 40 : 38, 1, 0.1, 100);
    camera.position.set(0, 7.5, 9.5);
    scene.add(new THREE.HemisphereLight(0xbcd3ff, 0x0b0d10, 1.1));
    const dir = new THREE.DirectionalLight(0xffffff, 1.4); dir.position.set(4, 10, 6); scene.add(dir);

    // ground: faint engineering grid fading out
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec2 vP; void main(){ vec2 g = abs(fract(vP*1.0 - .5) - .5) / fwidth(vP*1.0);
        float line = 1.0 - min(min(g.x,g.y), 1.0); float fade = 1.0 - smoothstep(4.0, 15.0, length(vP));
        gl_FragColor = vec4(vec3(0.45,0.55,0.7), line*0.10*fade); }`,
    }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // ribbon + edges + elevation "curtain"
    const W = 0.17;
    const up = new THREE.Vector3(0, 1, 0);
    const road: number[] = [], edgeL: THREE.Vector3[] = [], edgeR: THREE.Vector3[] = [], curtain: number[] = [], idx: number[] = [], cIdx: number[] = [];
    for (let i = 0; i <= M; i++) {
      const u = (i % M) / M;
      const p = curve.getPoint(u), t = curve.getTangent(u);
      const side = new THREE.Vector3().crossVectors(t, up).normalize();
      const l = p.clone().addScaledVector(side, W / 2), r = p.clone().addScaledVector(side, -W / 2);
      road.push(l.x, l.y, l.z, r.x, r.y, r.z);
      edgeL.push(l.clone().setY(l.y + 0.004)); edgeR.push(r.clone().setY(r.y + 0.004));
      curtain.push(p.x, p.y - 0.01, p.z, p.x, 0, p.z);
      if (i < M) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); cIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute("position", new THREE.Float32BufferAttribute(road, 3)); roadGeo.setIndex(idx); roadGeo.computeVertexNormals();
    scene.add(new THREE.Mesh(roadGeo, new THREE.MeshStandardMaterial({ color: 0x1d222c, roughness: 0.85, metalness: 0.1, side: THREE.DoubleSide })));
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xcfd8e6, transparent: true, opacity: 0.45 });
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(edgeL), edgeMat), new THREE.Line(new THREE.BufferGeometry().setFromPoints(edgeR), edgeMat));
    if (E > 0) {
      const cg = new THREE.BufferGeometry();
      cg.setAttribute("position", new THREE.Float32BufferAttribute(curtain, 3)); cg.setIndex(cIdx);
      scene.add(new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: 0x56b4e9, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false })));
    }

    // speed-coloured racing line (slow = blue → fast = red)
    const slow = new THREE.Color(0x56b4e9), mid = new THREE.Color(0xf6c453), fast = new THREE.Color(0xff453a);
    const colourAt = (v: number, out: THREE.Color) => {
      const k = (v - vMin) / (vMax - vMin || 1);
      return k < 0.5 ? out.copy(slow).lerp(mid, k * 2) : out.copy(mid).lerp(fast, (k - 0.5) * 2);
    };
    const lp: number[] = [], lc: number[] = [], tmp = new THREE.Color();
    for (let i = 0; i <= M; i++) {
      const u = (i % M) / M, p = curve.getPoint(u);
      lp.push(p.x, p.y + 0.008, p.z);
      const f = u * n, i0 = Math.floor(f) % n, i1 = (i0 + 1) % n;
      colourAt(smooth[i0]! + (smooth[i1]! - smooth[i0]!) * (f - Math.floor(f)), tmp);
      lc.push(tmp.r, tmp.g, tmp.b);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
    lineGeo.setAttribute("color", new THREE.Float32BufferAttribute(lc, 3));
    const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0 });
    scene.add(new THREE.Line(lineGeo, lineMat));
    lineGeo.setDrawRange(0, reduced ? M + 1 : 0);

    // start/finish gantry
    const s0 = curve.getPoint(0), st = curve.getTangent(0), sside = new THREE.Vector3().crossVectors(st, up).normalize();
    const gantry = new THREE.Group();
    const postMat = new THREE.MeshBasicMaterial({ color: 0xf4f6f8 });
    for (const k of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.32, 0.02), postMat);
      post.position.copy(s0).addScaledVector(sside, k * (W / 2 + 0.04)).setY(s0.y + 0.16);
      gantry.add(post);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0xff453a }));
    bar.position.copy(s0).setY(s0.y + 0.32);
    bar.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), sside);
    gantry.add(bar);
    scene.add(gantry);

    // the car + trail
    const team = data.teamColour && /^[0-9a-fA-F]{6}$/.test(data.teamColour) ? new THREE.Color(`#${data.teamColour}`) : new THREE.Color(0xff453a);
    const car = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 24), new THREE.MeshBasicMaterial({ color: team }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d")!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })(),
      color: team, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    glow.scale.setScalar(0.7);
    car.add(glow);
    scene.add(car);
    const TRAIL = 70;
    const trailPos = new Float32Array(TRAIL * 3), trailCol = new Float32Array(TRAIL * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
    trailGeo.setAttribute("color", new THREE.BufferAttribute(trailCol, 3));
    scene.add(new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending })));

    const times = raw.map((p) => p.t);
    const lap = data.lapTimeS;
    const locate = (tau: number) => {
      let lo = 0, hi = n - 1;
      while (lo < hi - 1) { const m = (lo + hi) >> 1; if (times[m]! <= tau) lo = m; else hi = m; }
      const span = times[hi]! - times[lo]! || 1;
      return Math.min(n - 1e-4, lo + Math.max(0, Math.min(1, (tau - times[lo]!) / span)));
    };

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.enableZoom = false; controls.enablePan = false;
    controls.minPolarAngle = 0.25; controls.maxPolarAngle = 1.35;
    controls.autoRotate = !reduced; controls.autoRotateSpeed = 0.6;
    renderer.domElement.style.touchAction = "pan-y";

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      // fit the ~10-unit-wide circuit: distance from the vertical FOV, widened for narrow frames
      const halfFov = (camera.fov * Math.PI) / 360;
      const radius = 5.6;
      const d = (radius / Math.sin(halfFov)) / Math.min(1, w / h) * 0.95;
      camera.position.setLength(d);
      camera.far = d * 4;
      scene.fog = new THREE.Fog(0x08090c, d * 1.1, d * 2.6);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    let raf = 0, visible = true, start = performance.now(), last = start, intro = 0;
    const io = new IntersectionObserver(([en]) => { visible = !!en?.isIntersecting; if (visible) { last = performance.now(); loop(); } });
    io.observe(el);
    const hist: THREE.Vector3[] = [];
    let hudTick = 0;
    const loop = () => {
      cancelAnimationFrame(raf);
      if (!visible || document.hidden) return;
      raf = requestAnimationFrame(loop);
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (intro < 1) { intro = Math.min(1, intro + dt / 1.8); lineMat.opacity = intro; lineGeo.setDrawRange(0, Math.floor((reduced ? 1 : intro) * (M + 1))); }
      const tau = reduced ? 0 : ((now - start) / 1000) % lap;
      const f = locate(tau);
      const pos = curve.getPoint(f / n);
      car.position.copy(pos).setY(pos.y + 0.07);
      hist.unshift(car.position.clone()); if (hist.length > TRAIL) hist.pop();
      for (let i = 0; i < TRAIL; i++) {
        const h = hist[Math.min(i, hist.length - 1)]!;
        trailPos.set([h.x, h.y, h.z], i * 3);
        const a = 1 - i / TRAIL;
        trailCol.set([team.r * a, team.g * a, team.b * a], i * 3);
      }
      trailGeo.attributes.position!.needsUpdate = true; trailGeo.attributes.color!.needsUpdate = true;
      glow.scale.setScalar(0.6 + Math.sin(now / 160) * 0.06);
      if (hud.current && (hudTick += dt) > 0.05) {
        hudTick = 0;
        const i0 = Math.floor(f) % n;
        hud.current.querySelector("[data-t]")!.textContent = fmtLap(tau);
        hud.current.querySelector("[data-v]")!.textContent = String(Math.round(smooth[i0]!));
      }
      controls.update();
      renderer.render(scene, camera);
    };
    const onVis = () => { if (!document.hidden) { last = performance.now(); loop(); } };
    document.addEventListener("visibilitychange", onVis);
    loop();

    return () => {
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); controls.dispose();
      document.removeEventListener("visibilitychange", onVis);
      scene.traverse((o) => {
        const m = o as THREE.Mesh; m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => { (x as THREE.SpriteMaterial).map?.dispose(); x.dispose(); });
      });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [data, compact]);

  if (data === undefined) return <div className={`skeleton ${className}`} aria-label="Loading 3D circuit" role="status" />;
  if (data === null || failed) {
    return (
      <div className={`grid place-items-center rounded-2xl border border-border bg-surface/60 text-center text-sm text-muted ${className}`} role="status">
        <p className="max-w-xs px-4">{failed ? "Your browser can't draw 3D here." : "No car-position data for this circuit yet. The 3D view appears once OpenF1 has a lap here."}</p>
      </div>
    );
  }
  const summary = `3D circuit from ${data.driver}'s ${data.year} ${data.sessionName.toLowerCase()} lap, ${fmtLap(data.lapTimeS)}${lengthKm ? `, about ${lengthKm.toFixed(2)} km` : ""}.`;
  return (
    <figure className={`relative m-0 overflow-hidden rounded-2xl border border-border bg-[radial-gradient(ellipse_at_50%_30%,#121826,#08090c_75%)] ${className}`}>
      <div ref={host} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
      <figcaption className="sr-only">{summary}</figcaption>
      <div ref={hud} className="pointer-events-none absolute left-3 top-3 rounded-xl border border-border/80 bg-bg/70 px-3 py-2 backdrop-blur" aria-hidden>
        <div className="text-[10px] uppercase tracking-[0.14em] text-subtle">{data.driver} · {data.year} {data.sessionName}</div>
        <div className="mt-0.5 flex items-baseline gap-3">
          <span className="num text-lg font-semibold" data-t>0:00.000</span>
          <span className="num text-sm text-muted"><span data-v>0</span> km/h</span>
        </div>
      </div>
      {!compact && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted" aria-hidden>
          <span className="inline-flex items-center gap-2">Slow<span className="h-1.5 w-24 rounded-full bg-gradient-to-r from-telemetry via-warn to-accent" />Fast</span>
          <span className="num">{lengthKm ? `${lengthKm.toFixed(2)} km · ` : ""}lap {fmtLap(data.lapTimeS)} · elevation ×3</span>
        </div>
      )}
    </figure>
  );
}
