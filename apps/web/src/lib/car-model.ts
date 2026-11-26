import * as THREE from "three";

/**
 * A generic open-wheel race car built from primitives: original design, no team's real car or
 * livery is reproduced. Length ≈ 5.6 units along +x (nose at +x), wheels resting on y = 0.
 * Returns the group plus the materials that carry the team colour, so callers can recolour it.
 */
export function buildCar(colour = "#cc7722", opts: { compound?: string; lowDetail?: boolean } = {}) {
  const seg = opts.lowDetail ? 12 : 28;
  const car = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: colour, metalness: 0.45, roughness: 0.32 });
  const carbon = new THREE.MeshStandardMaterial({ color: 0x151515, metalness: 0.3, roughness: 0.55 });
  const satin = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.4 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, metalness: 0, roughness: 0.9 });
  const bone = new THREE.MeshStandardMaterial({ color: 0xf4f4f1, metalness: 0.1, roughness: 0.5 });
  const tyreBand = new THREE.MeshStandardMaterial({
    color: { SOFT: 0xd41a1a, MEDIUM: 0xe8b400, HARD: 0xf4f4f1, INTERMEDIATE: 0x3a9a3a, WET: 0x2f6fd0 }[opts.compound ?? "MEDIUM"] ?? 0xe8b400,
    roughness: 0.6,
  });

  // --- body: side profile extruded across the car's width ---
  const profile = new THREE.Shape();
  profile.moveTo(2.75, 0.2);          // nose tip
  profile.lineTo(2.7, 0.3);
  profile.quadraticCurveTo(1.6, 0.46, 0.75, 0.6);   // nose rising to the cockpit
  profile.lineTo(0.35, 0.66);
  profile.lineTo(-0.1, 0.62);          // cockpit opening
  profile.quadraticCurveTo(-0.3, 1.02, -0.55, 1.05); // airbox
  profile.quadraticCurveTo(-1.6, 0.86, -2.35, 0.5); // engine cover sweeping down
  profile.lineTo(-2.6, 0.42);
  profile.lineTo(-2.6, 0.16);
  profile.lineTo(2.75, 0.16);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(profile, { depth: 0.56, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: seg }), paint);
  body.geometry.translate(0, 0, -0.28);
  car.add(body);

  // sidepods: top-view shape extruded upward, one each side
  const pod = new THREE.Shape();
  pod.moveTo(0.55, 0); pod.quadraticCurveTo(0.45, 0.42, 0.1, 0.46); pod.lineTo(-1.3, 0.4);
  pod.quadraticCurveTo(-1.95, 0.22, -2.05, 0); pod.lineTo(0.55, 0);
  for (const side of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(pod, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: seg }), paint);
    m.rotation.x = -Math.PI / 2;
    m.scale.set(1, side, 1);
    m.position.set(0, 0.17, side * 0.26);
    car.add(m);
    // inlet
    const inlet = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.34), carbon);
    inlet.position.set(0.56, 0.36, side * 0.5);
    car.add(inlet);
  }

  // floor and plank
  const floor = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.05, 1.45), carbon);
  floor.position.set(-0.25, 0.12, 0);
  car.add(floor);

  // --- front wing: main plane, two flaps, endplates ---
  const fw = new THREE.Group();
  const main = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.035, 1.95), carbon); main.position.set(0, 0.06, 0); fw.add(main);
  [0.11, 0.2].forEach((y, i) => {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 1.85 - i * 0.1), i ? paint : carbon);
    flap.position.set(-0.12 - i * 0.07, y, 0); flap.rotation.z = 0.28 + i * 0.12; fw.add(flap);
  });
  for (const side of [-1, 1]) { const ep = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.03), paint); ep.position.set(-0.05, 0.13, side * 0.98); fw.add(ep); }
  fw.position.set(2.62, 0.02, 0);
  car.add(fw);

  // --- rear wing: two elements on endplates, pylon, beam wing ---
  const rw = new THREE.Group();
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.045, 1.05), paint); upper.position.y = 1.08; upper.rotation.z = -0.12; rw.add(upper);
  const flapR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 1.05), carbon); flapR.position.set(-0.1, 1.2, 0); flapR.rotation.z = -0.5; rw.add(flapR);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.9), carbon); beam.position.y = 0.48; rw.add(beam);
  for (const side of [-1, 1]) { const ep = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.86, 0.035), carbon); ep.position.set(-0.04, 0.84, side * 0.54); rw.add(ep); }
  const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.05), satin); pylon.position.set(0.12, 0.78, 0); rw.add(pylon);
  rw.position.set(-2.62, 0, 0);
  car.add(rw);

  // --- halo + driver ---
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, seg, Math.PI * 1.15), satin);
  halo.rotation.set(Math.PI / 2, 0, Math.PI / 2 - Math.PI * 0.075);
  halo.position.set(0.05, 0.92, 0);
  car.add(halo);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.3, 8), satin);
  pillar.position.set(0.37, 0.78, 0); pillar.rotation.z = -0.5;
  car.add(pillar);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, seg, seg), bone);
  helmet.position.set(-0.08, 0.82, 0);
  car.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.172, seg, seg, -0.6, 1.2, 1.2, 0.5), carbon);
  visor.position.copy(helmet.position);
  car.add(visor);

  // --- wheels with suspension ---
  const wheels: THREE.Group[] = [];
  const axles: [number, number, number][] = [[1.85, 0.34, 0.3], [-1.95, 0.37, 0.4]]; // x, radius, width
  for (const [x, r, w] of axles) for (const side of [-1, 1]) {
    const wheel = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, seg), rubber); tyre.rotation.x = Math.PI / 2; wheel.add(tyre);
    const band = new THREE.Mesh(new THREE.TorusGeometry(r * 0.82, 0.018, 6, seg), tyreBand); band.position.z = side * (w / 2 + 0.002); wheel.add(band);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.01, seg), satin); rim.rotation.x = Math.PI / 2; wheel.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, w + 0.03, 10), paint); hub.rotation.x = Math.PI / 2; wheel.add(hub);
    wheel.position.set(x, r, side * (0.72 + w / 2));
    car.add(wheel); wheels.push(wheel);
    for (const dy of [0.08, -0.06]) { // wishbones
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.62, 6), satin);
      arm.rotation.x = Math.PI / 2; arm.position.set(x, r + dy, side * 0.52); car.add(arm);
    }
  }

  // number board on the engine cover (blank: we never draw team marks)
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.012, 0.08), bone);
  stripe.position.set(1.4, 0.5, 0); stripe.rotation.z = 0.12;
  car.add(stripe);

  car.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { car, paint, wheels };
}
