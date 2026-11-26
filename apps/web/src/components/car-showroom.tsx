"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildCar } from "@/lib/car-model";

export interface ShowroomTeam { teamId: string; name: string; colour: string; position: number; points: number; car: string }
export interface ShowroomDriver { id: string; code: string; name: string; number: string | null; teamId: string; team: string; colour: string; position: number; points: number; wins: number; nationality: string | null; portrait: string }

/** 3D turntable: an original open-wheeler, recoloured live to the selected team. */
function Turntable({ colour }: { colour: string }) {
  const host = useRef<HTMLDivElement>(null);
  const paintRef = useRef<{ target: THREE.Color } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { setFailed(true); return; }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.touchAction = "pan-y";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(7.2, 2.2, 6.2);
    scene.add(new THREE.HemisphereLight(0xdfe6f0, 0x0e0e0e, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(5, 9, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x5b8fe0, 2.4); rim.position.set(-6, 3, -5); scene.add(rim);
    const warm = new THREE.PointLight(0xcc7722, 14, 12); warm.position.set(3, 1.2, -3); scene.add(warm);

    // concrete turntable with a cobalt ring and survey ticks
    const table = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.3, 0.18, 96), new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.95 }));
    disc.position.y = -0.09; disc.receiveShadow = true; table.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.25, 0.04, 8, 128), new THREE.MeshBasicMaterial({ color: 0x0047ab }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; table.add(ring);
    for (let i = 0; i < 72; i++) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(i % 6 ? 0.12 : 0.3, 0.01, 0.025), new THREE.MeshBasicMaterial({ color: i % 6 ? 0x3a3a3a : 0xa9a9a9 }));
      const a = (i / 72) * Math.PI * 2; t.position.set(Math.cos(a) * 3.95, 0.006, Math.sin(a) * 3.95); t.rotation.y = -a; table.add(t);
    }
    scene.add(table);

    const { car, paint, wheels } = buildCar(colour);
    car.scale.setScalar(1.05);
    table.add(car);
    paintRef.current = { target: new THREE.Color(colour) };

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true;
    controls.minPolarAngle = 0.6; controls.maxPolarAngle = 1.45;
    controls.target.set(0, 0.5, 0);

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.position.setLength(w / h < 1 ? 13 : 9);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    let raf = 0, last = performance.now(), visible = true;
    const io = new IntersectionObserver(([en]) => { visible = !!en?.isIntersecting; if (visible) { last = performance.now(); loop(); } });
    io.observe(el);
    const loop = () => {
      cancelAnimationFrame(raf);
      if (!visible || document.hidden) return;
      raf = requestAnimationFrame(loop);
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!reduced) { table.rotation.y += dt * 0.35; for (const w of wheels) w.rotation.z -= dt * 1.5; }
      const tgt = paintRef.current?.target;
      if (tgt) paint.color.lerp(tgt, 1 - Math.pow(0.002, dt));
      controls.update();
      renderer.render(scene, camera);
    };
    const onVis = () => { if (!document.hidden) { last = performance.now(); loop(); } };
    document.addEventListener("visibilitychange", onVis);
    loop();
    return () => {
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); controls.dispose();
      document.removeEventListener("visibilitychange", onVis);
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose()); });
      renderer.dispose(); renderer.domElement.remove();
    };
    // the car is built once; colour changes are animated through paintRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { paintRef.current?.target.set(colour); }, [colour]);

  if (failed) return <div className="grid h-full place-items-center text-sm text-muted">3D isn&apos;t available in this browser.</div>;
  return <div ref={host} className="absolute inset-0 cursor-grab active:cursor-grabbing" />;
}

function DriverCard({ d, big = false, onPick }: { d: ShowroomDriver; big?: boolean; onPick?: () => void }) {
  const Tag = onPick ? "button" : "div";
  return (
    <Tag {...(onPick ? { type: "button" as const, onClick: onPick, "aria-label": `${d.name}, ${d.team}: show car` } : {})}
      className={`distort group relative flex w-full flex-col overflow-hidden rounded-lg border-2 border-border-strong bg-surface text-left ${big ? "min-h-[15rem] p-5" : "min-h-[11rem] p-3"}`}
      style={{ boxShadow: `5px 5px 0 ${d.colour}` }}>
      {/* team-colour slab + giant outlined race number behind the portrait */}
      <span className="pointer-events-none absolute bottom-0 right-0 h-[62%] w-[58%] opacity-25" style={{ background: d.colour }} aria-hidden />
      <span className={`pointer-events-none absolute -right-1 leading-[0.8] ${big ? "-top-2 text-[9rem]" : "-top-1 text-[5.5rem]"}`}
        style={{ color: "transparent", WebkitTextStroke: `2px ${d.colour}` }} aria-hidden>{d.number ?? "–"}</span>
      <img src={d.portrait} alt="" loading="lazy" decoding="async"
        className={`pointer-events-none absolute bottom-0 right-0 object-contain object-bottom transition-transform duration-300 ease-out group-hover:scale-105 ${big ? "h-[92%] max-w-[62%]" : "h-[88%] max-w-[58%]"}`}
        onError={(e) => { e.currentTarget.style.display = "none"; }} />
      <span className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: d.colour }} aria-hidden />
      <span className="mono relative z-10 text-[11px] text-subtle">P{String(d.position).padStart(2, "0")}{d.nationality ? <><br />{d.nationality.toUpperCase()}</> : null}</span>
      <span className={`relative z-10 mt-auto max-w-[60%] uppercase leading-none ${big ? "text-4xl" : "text-2xl"}`}>{d.code}</span>
      <span className={`relative z-10 max-w-[62%] uppercase leading-tight ${big ? "mt-1 text-sm" : "text-[11px]"}`}>{d.name}</span>
      <span className="mono relative z-10 mt-1 flex max-w-[62%] flex-wrap gap-x-3 text-[11px] text-muted">
        <span><span className="text-fg">{d.points}</span> PTS</span>
        {d.wins > 0 && <span><span className="text-fg">{d.wins}</span> W</span>}
      </span>
    </Tag>
  );
}

export function CarShowroom({ season, teams, drivers }: { season: number; teams: ShowroomTeam[]; drivers: ShowroomDriver[] }) {
  const [teamId, setTeamId] = useState(teams[0]?.teamId ?? "");
  const [view, setView] = useState<"photo" | "3d">("photo");
  const team = teams.find((t) => t.teamId === teamId) ?? teams[0];
  if (!team) return null;
  const pair = drivers.filter((d) => d.teamId === team.teamId).slice(0, 2);
  const pick = (id: string) => setTeamId(id);

  return (
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-12">
        {/* team picker: ruled list with constructor position */}
        <div className="order-2 lg:order-1 lg:col-span-3">
          <div className="grid grid-cols-2 border-2 border-border sm:grid-cols-3 lg:grid-cols-1" role="radiogroup" aria-label="Team">
            {teams.map((t) => (
              <div key={t.teamId} className="border-b border-r border-border last:border-b-0 lg:border-r-0">
                <button type="button" role="radio" aria-checked={t.teamId === team.teamId} onClick={() => pick(t.teamId)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs uppercase transition-colors duration-200 ${t.teamId === team.teamId ? "bg-bone text-bg" : "hover:bg-elevated"}`}>
                  <span className="mono w-5 text-[11px]">{String(t.position).padStart(2, "0")}</span>
                  <span className="h-3.5 w-1.5 shrink-0" style={{ background: t.colour }} aria-hidden />
                  <span className="truncate">{t.name}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* official car render, or the 3D turntable */}
        <div className="order-1 lg:order-2 lg:col-span-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex border-2 border-border text-[11px]" role="group" aria-label="View">
              {(["photo", "3d"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
                  className={`stamp px-3 py-1 text-[10px] ${view === v ? "bg-bone text-bg" : "text-muted hover:text-fg"}`}>{v === "photo" ? "Car" : "3D"}</button>
              ))}
            </div>
            <span className="mono text-[11px] text-subtle">{team.points} PTS · P{String(team.position).padStart(2, "0")}</span>
          </div>
          <div id="showroom" className="relative h-[300px] overflow-hidden rounded-lg border-2 border-border-strong bg-[radial-gradient(ellipse_at_50%_70%,#232323,#0e0e0e_70%)] sm:h-[420px]"
            style={{ boxShadow: `8px 8px 0 ${team.colour}` }}>
            {view === "photo" ? (
              <>
                <span className="pointer-events-none absolute -left-10 bottom-10 h-[46%] w-[120%] -rotate-3" style={{ background: team.colour, opacity: 0.85 }} aria-hidden />
                <span className="pointer-events-none absolute right-3 top-2 text-[7rem] uppercase leading-none tracking-tighter sm:text-[10rem]"
                  style={{ color: "transparent", WebkitTextStroke: "2px rgba(244,244,241,.18)" }} aria-hidden>{String(team.position).padStart(2, "0")}</span>
                <img key={team.teamId} src={team.car} alt={`${team.name} ${season} car`} decoding="async" onError={() => setView("3d")}
                  className="car-in absolute bottom-[8%] left-1/2 w-[112%] max-w-none -translate-x-1/2 object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,.6)]" />
              </>
            ) : <Turntable colour={team.colour} />}
            <div className="pointer-events-none absolute left-0 top-0 border-b-2 border-r-2 border-border-strong bg-bg px-3 py-1.5">
              <div className="stamp text-[10px] text-subtle">P{String(team.position).padStart(2, "0")} constructor</div>
              <div className="text-lg uppercase leading-tight">{team.name}</div>
            </div>
          </div>
          <p className="mono mt-3 text-[11px] text-subtle">{view === "photo" ? `${season} CAR · IMAGE © FORMULA 1 / ${team.name.toUpperCase()}` : "GENERIC OPEN-WHEELER BUILT IN CODE, PAINTED IN THE TEAM'S COLOUR · DRAG TO ORBIT"}</p>
        </div>

        {/* the pair */}
        <div className="order-3 grid content-start gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-1">
          {pair.map((d) => <DriverCard key={d.id} d={d} big />)}
        </div>
      </div>

      {/* full grid */}
      <div>
        <h3 className="stamp mb-4 text-accent">All {drivers.length} drivers · tap to see their car</h3>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {drivers.map((d, i) => (
            <li key={d.id} className="rise" style={{ ["--i" as string]: Math.min(i, 14) }}>
              <DriverCard d={d} onPick={() => { pick(d.teamId); document.getElementById("showroom")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" }); }} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
