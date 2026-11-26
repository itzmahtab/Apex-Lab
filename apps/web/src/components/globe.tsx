"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { LAND_H, LAND_MASK_B64, LAND_W } from "@/lib/land-mask";
import { latLngToXYZ, subsolarPoint } from "@/lib/geo";

export interface GlobePin { id: string; lat: number; lng: number; state: "completed" | "live" | "next" | "upcoming" }

/**
 * Night-and-day 3D globe (plain three.js, no textures).
 * - land drawn as dots from a 1° land mask; the sun lights them from its real position right now
 * - every circuit is a pin; the next race pulses; the season route is an animated arc chain
 * - drag to spin, click a pin to select it; `focusId` turns the globe to face that pin
 * Purely decorative for assistive tech: the same information is in the panel next to it.
 */
export function Globe({ pins, focusId, onSelect, className }: {
  pins: GlobePin[]; focusId: string | null; onSelect?: (id: string) => void; className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ focus: (id: string | null) => void } | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return; // no WebGL: the page's panels still carry everything
    }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "pan-y";
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 4.2);
    const world = new THREE.Group();
    scene.add(world);

    const sunDir = new THREE.Vector3();
    const updateSun = () => {
      const s = subsolarPoint(new Date());
      sunDir.set(...latLngToXYZ(s.lat, s.lng)).normalize();
    };
    updateSun();
    // sun direction in world-group space is fixed to the earth, so it rotates with the globe
    const uniforms = { uSun: { value: sunDir }, uTime: { value: 0 } };

    // --- ocean sphere with day/night shading ---
    const ocean = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 96),
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(position); vW = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW;
          void main(){
            float d = dot(vN, uSun);
            float day = smoothstep(-0.08, 0.18, d);
            vec3 night = vec3(0.020,0.026,0.040);
            vec3 dayC = vec3(0.055,0.090,0.150);
            vec3 c = mix(night, dayC, day);
            float term = exp(-pow(d*9.0,2.0));            // warm band along the terminator
            c += vec3(1.0,0.36,0.18) * term * 0.10;
            float rim = pow(1.0 - abs(vW.z), 3.0);
            c += vec3(0.22,0.45,0.75) * rim * (0.15 + 0.35*day);
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    world.add(ocean);

    // --- land dots (fibonacci sampling, kept where the mask says land) ---
    const bits = Uint8Array.from(atob(LAND_MASK_B64), (ch) => ch.charCodeAt(0));
    const isLand = (lat: number, lng: number) => {
      const r = Math.min(LAND_H - 1, Math.max(0, Math.floor(90 - lat)));
      const c = Math.min(LAND_W - 1, Math.max(0, Math.floor(lng + 180)));
      const i = r * LAND_W + c;
      return (bits[i >> 3]! >> (i & 7)) & 1;
    };
    const N = 42000, pos: number[] = [], seed: number[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = golden * i;
      const x = Math.cos(th) * rad, z = Math.sin(th) * rad;
      const lat = Math.asin(y) * 180 / Math.PI;
      // inverse of latLngToXYZ's longitude convention
      const lng = ((Math.atan2(z, -x) * 180 / Math.PI - 90 + 540) % 360) - 180;
      if (isLand(lat, lng)) { pos.push(x * 1.002, y * 1.002, z * 1.002); seed.push(Math.random()); }
    }
    const landGeo = new THREE.BufferGeometry();
    landGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    landGeo.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
    const land = new THREE.Points(landGeo, new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uPx: { value: renderer.getPixelRatio() } },
      transparent: true, depthWrite: false,
      vertexShader: `uniform float uPx; attribute float aSeed; varying float vD; varying float vS; varying float vFacing;
        uniform vec3 uSun;
        void main(){
          vD = dot(normalize(position), uSun); vS = aSeed;
          vec4 mv = modelViewMatrix*vec4(position,1.);
          vFacing = dot(normalize(normalMatrix*position), normalize(-mv.xyz));
          gl_PointSize = (vS > 0.9 ? 2.6 : 2.1) * uPx * (3.6 / -mv.z);
          gl_Position = projectionMatrix*mv;
        }`,
      fragmentShader: `uniform float uTime; varying float vD; varying float vS; varying float vFacing;
        void main(){
          vec2 p = gl_PointCoord - .5; if (dot(p,p) > .25) discard;
          float day = smoothstep(-0.06, 0.2, vD);
          vec3 dayC = mix(vec3(0.55,0.66,0.80), vec3(0.85,0.90,0.97), vS);
          vec3 nightC = vec3(0.26,0.31,0.42);
          // a few "city lights" twinkle on the night side
          float city = step(0.9, vS) * (1.0 - day) * (0.75 + 0.25*sin(uTime*1.7 + vS*80.0));
          vec3 c = mix(nightC, dayC, day) + vec3(1.0,0.66,0.32) * city;
          float a = mix(0.7, 0.95, day) * smoothstep(0.0, 0.25, vFacing);
          gl_FragColor = vec4(c, a);
        }`,
    }));
    world.add(land);

    // --- atmosphere ---
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 64, 64),
      new THREE.ShaderMaterial({
        uniforms, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        vertexShader: `varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix*normal); vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vP;
          void main(){ float i = pow(clamp(0.66 - dot(vN, vec3(0,0,1.)), 0.0, 1.0), 4.0); float day = 0.35 + 0.65*smoothstep(-0.3,0.4,dot(vP,uSun));
            gl_FragColor = vec4(vec3(0.30,0.58,1.0) * i * day * 1.1, 1.0); }`,
      }),
    );
    scene.add(atmo);

    // --- season route arcs ---
    const arcs: THREE.Line[] = [];
    const ordered = pins;
    for (let i = 0; i < ordered.length - 1; i++) {
      const a = new THREE.Vector3(...latLngToXYZ(ordered[i]!.lat, ordered[i]!.lng));
      const b = new THREE.Vector3(...latLngToXYZ(ordered[i + 1]!.lat, ordered[i + 1]!.lng));
      const dist = a.distanceTo(b);
      const mid = a.clone().add(b).normalize().multiplyScalar(1 + Math.min(0.5, 0.08 + dist * 0.22));
      const curve = new THREE.QuadraticBezierCurve3(a.clone().multiplyScalar(1.004), mid, b.clone().multiplyScalar(1.004));
      const pts = curve.getPoints(64);
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      g.setAttribute("aT", new THREE.Float32BufferAttribute(pts.map((_, k) => k / 64), 1));
      const done = ordered[i + 1]!.state === "completed" || ordered[i + 1]!.state === "live";
      const line = new THREE.Line(g, new THREE.ShaderMaterial({
        uniforms: { uTime: uniforms.uTime, uDone: { value: done ? 1 : 0 }, uPhase: { value: i * 0.37 } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `uniform float uTime; uniform float uDone; uniform float uPhase; varying float vT;
          void main(){
            float flow = fract(vT*3.0 - uTime*0.35 + uPhase);
            float dash = smoothstep(0.0,0.08,flow) * (1.0 - smoothstep(0.35,0.5,flow));
            vec3 c = mix(vec3(0.45,0.52,0.62), vec3(1.0,0.27,0.23), uDone);
            float a = mix(0.18, 0.55, uDone) + dash * mix(0.25, 0.6, uDone);
            float ends = smoothstep(0.0,0.06,vT) * smoothstep(1.0,0.94,vT);
            gl_FragColor = vec4(c, a*ends);
          }`,
      }));
      arcs.push(line);
      world.add(line);
    }

    // --- pins ---
    const pinGroup = new THREE.Group();
    world.add(pinGroup);
    const hitTargets: THREE.Mesh[] = [];
    const pulses: THREE.Mesh[] = [];
    const Z = new THREE.Vector3(0, 0, 1);
    const colourOf = (s: GlobePin["state"]) => (s === "next" || s === "live" ? 0xff453a : s === "completed" ? 0xf4f6f8 : 0x56b4e9);
    for (const p of pins) {
      const v = new THREE.Vector3(...latLngToXYZ(p.lat, p.lng));
      const holder = new THREE.Group();
      holder.position.copy(v);
      holder.quaternion.setFromUnitVectors(Z, v.clone().normalize());
      const hot = p.state === "next" || p.state === "live";
      const stemLen = hot ? 0.14 : 0.06;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, stemLen, 6), new THREE.MeshBasicMaterial({ color: colourOf(p.state), transparent: true, opacity: 0.8 }));
      stem.rotation.x = Math.PI / 2; stem.position.z = stemLen / 2;
      const head = new THREE.Mesh(new THREE.SphereGeometry(hot ? 0.02 : 0.012, 16, 16), new THREE.MeshBasicMaterial({ color: colourOf(p.state) }));
      head.position.z = stemLen;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.024, 40), new THREE.MeshBasicMaterial({ color: colourOf(p.state), transparent: true, opacity: p.state === "upcoming" ? 0.5 : 0.85, side: THREE.DoubleSide }));
      ring.position.z = 0.002;
      holder.add(stem, head, ring);
      if (hot) {
        const pulse = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.028, 48), new THREE.MeshBasicMaterial({ color: 0xff453a, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
        pulse.position.z = 0.003;
        holder.add(pulse); pulses.push(pulse);
      }
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.z = stemLen / 2;
      hit.userData.id = p.id;
      holder.add(hit); hitTargets.push(hit);
      holder.userData.id = p.id;
      pinGroup.add(holder);
    }

    // selection halo
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.042, 48), new THREE.MeshBasicMaterial({ color: 0xf6c453, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    halo.visible = false;
    world.add(halo);

    // --- rotation state ---
    let yaw = 0, pitch = 0.35, vYaw = reduced ? 0 : 0.0016, vPitch = 0;
    let targetYaw: number | null = null, targetPitch: number | null = null;
    let dragging = false, lastX = 0, lastY = 0, idleSince = performance.now(), moved = 0;
    const focus = (id: string | null) => {
      const p = id ? pins.find((x) => x.id === id) : null;
      if (!p) { halo.visible = false; return; }
      const v = new THREE.Vector3(...latLngToXYZ(p.lat, p.lng));
      halo.position.copy(v.clone().multiplyScalar(1.003));
      halo.quaternion.setFromUnitVectors(Z, v.clone().normalize());
      halo.visible = true;
      // yaw so the point faces +z, pitch so its latitude sits near the centre
      const ty = -Math.atan2(v.x, v.z);
      let dy = ty - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      targetYaw = yaw + dy;
      targetPitch = Math.max(-1.1, Math.min(1.1, (p.lat * Math.PI) / 180 * 0.85));
      if (reduced) { yaw = targetYaw; pitch = targetPitch; targetYaw = targetPitch = null; }
      idleSince = performance.now();
    };
    api.current = { focus };

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pick = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects([ocean, ...hitTargets], false);
      const first = hits[0];
      return first && first.object !== ocean ? (first.object.userData.id as string) : null;
    };
    const onDown = (e: PointerEvent) => {
      dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
      targetYaw = targetPitch = null;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) {
        renderer.domElement.style.cursor = pick(e) ? "pointer" : "grab";
        return;
      }
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX; lastY = e.clientY;
      vYaw = dx * 0.005; vPitch = dy * 0.004;
      yaw += vYaw; pitch = Math.max(-1.2, Math.min(1.2, pitch + vPitch));
      idleSince = performance.now();
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      if (moved < 6) { const id = pick(e); if (id) onSelectRef.current?.(id); }
      idleSince = performance.now();
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointercancel", () => (dragging = false));

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      // keep the globe fully visible on narrow screens
      camera.position.z = w / h < 0.9 ? 4.2 / Math.max(0.62, w / h) * 0.9 : 4.2;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el); resize();

    let visible = true, raf = 0, last = performance.now(), sunTick = 0;
    const io = new IntersectionObserver(([en]) => { visible = !!en?.isIntersecting; if (visible) loop(); });
    io.observe(el);

    const loop = () => {
      cancelAnimationFrame(raf);
      if (!visible || document.hidden) return;
      raf = requestAnimationFrame(loop);
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      uniforms.uTime.value += reduced ? 0 : dt;
      if ((sunTick += dt) > 30) { sunTick = 0; updateSun(); }

      if (targetYaw != null && targetPitch != null) {
        const k = 1 - Math.pow(0.0025, dt);
        yaw += (targetYaw - yaw) * k; pitch += (targetPitch - pitch) * k;
        if (Math.abs(targetYaw - yaw) < 0.001 && Math.abs(targetPitch - pitch) < 0.001) { targetYaw = targetPitch = null; }
      } else if (!dragging) {
        vYaw *= 0.94; vPitch *= 0.9;
        const idle = now - idleSince > 4500;
        yaw += vYaw + (idle && !reduced ? 0.0012 : 0);
        pitch = Math.max(-1.2, Math.min(1.2, pitch + vPitch));
      }
      world.rotation.set(pitch, yaw, 0, "XYZ");

      const t = uniforms.uTime.value;
      for (const p of pulses) {
        const f = (t * 0.6) % 1;
        p.scale.setScalar(1 + f * 3.2);
        (p.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - f);
      }
      if (halo.visible) halo.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
      renderer.render(scene, camera);
    };
    const onVis = () => { if (!document.hidden) { last = performance.now(); loop(); } };
    document.addEventListener("visibilitychange", onVis);
    loop();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
  }, [pins]);

  useEffect(() => { api.current?.focus(focusId); }, [focusId, pins]);

  return <div ref={host} className={className} />;
}
