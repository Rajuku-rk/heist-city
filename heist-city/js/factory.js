// Mesh builders: characters (cops/thief/boss), the car, and trees.
import { scene, world } from './engine.js';

export function makeChar(body, accent, female){
  const g=new THREE.Group();
  const bm=new THREE.MeshStandardMaterial({color:body,roughness:.6,metalness:.1});
  const am=new THREE.MeshStandardMaterial({color:accent,roughness:.5,emissive:accent,emissiveIntensity:.3});
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.5,1.3,12),bm); torso.position.y=1.15; torso.castShadow=true; g.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.36,16,16),bm); head.position.y=2.05; head.castShadow=true; g.add(head);
  const visor=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.16,0.1),am); visor.position.set(0,2.06,0.32); g.add(visor);
  if(female){ const bun=new THREE.Mesh(new THREE.SphereGeometry(0.2,10,10),bm); bun.position.set(0,2.2,-0.32); g.add(bun); }
  const lg=new THREE.CylinderGeometry(0.16,0.14,0.95,8);
  const lL=new THREE.Mesh(lg,bm); lL.position.set(-0.2,0.45,0); lL.castShadow=true; g.add(lL);
  const lR=new THREE.Mesh(lg,bm); lR.position.set(0.2,0.45,0); lR.castShadow=true; g.add(lR);
  const armR=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.18,0.7),am); armR.position.set(0.34,1.3,0.3); g.add(armR);
  const armL=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.18,0.7),am); armL.position.set(-0.34,1.3,0.3); g.add(armL);
  const gun=new THREE.Mesh(new THREE.BoxGeometry(0.13,0.13,0.6),new THREE.MeshStandardMaterial({color:0x111216,metalness:.6,roughness:.4})); gun.position.set(0.34,1.28,0.75); g.add(gun);
  g.userData={lL,lR,armR,armL,gun,runPhase:0}; scene.add(g); return g;
}
export function makeCar(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.3,0.9,4.6),new THREE.MeshStandardMaterial({color:0xd23a2a,roughness:.4,metalness:.45})); body.position.y=0.85; body.castShadow=true; g.add(body);
  const cab=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.85,2.3),new THREE.MeshStandardMaterial({color:0x10202a,roughness:.25,metalness:.6})); cab.position.set(0,1.55,-0.1); g.add(cab);
  const wg=new THREE.CylinderGeometry(0.46,0.46,0.4,14), wm=new THREE.MeshStandardMaterial({color:0x0c0c0c});
  [[-1.1,1.5],[1.1,1.5],[-1.1,-1.5],[1.1,-1.5]].forEach(([x,z])=>{ const w=new THREE.Mesh(wg,wm); w.rotation.z=Math.PI/2; w.position.set(x,0.46,z); g.add(w); });
  const beacon=new THREE.Mesh(new THREE.SphereGeometry(0.4,12,12),new THREE.MeshBasicMaterial({color:0xffb22e})); beacon.position.y=2.4; g.add(beacon); g.userData={beacon};
  scene.add(g); return g;
}
export function makeTree(x,z,s){
  const g=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.22*s,0.3*s,2*s,7),new THREE.MeshStandardMaterial({color:0x4a3526,roughness:.9})); trunk.position.y=1*s; trunk.castShadow=true; g.add(trunk);
  const fol=new THREE.MeshStandardMaterial({color:0x244d2c,roughness:.9,emissive:0x0a160c,emissiveIntensity:.4});
  for(let k=0;k<3;k++){ const b=new THREE.Mesh(new THREE.SphereGeometry((1.1-0.2*k)*s,8,7),fol); b.position.set((Math.random()-.5)*0.6*s,(2+k*0.7)*s,(Math.random()-.5)*0.6*s); b.castShadow=true; g.add(b); }
  g.position.set(x,0,z); world.add(g); return g;
}
