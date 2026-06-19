// Loads the rigged GLB character and builds animated instances. (Stage 1)
import { scene } from './engine.js';

const TARGET_HEIGHT = 1.9;     // tune: character height in game units
const FACE_OFFSET   = 0; // tune: rotate model so it faces forward (+z)
const RUN_SPEED     = 9;       // tune: speed above which the run clip plays
const WALK_SPEED    = 0.6;     // tune: speed above which the walk clip plays

let gltf=null, CHAR_SCALE=1, MODEL_MINY=0;

// --- Gun-in-hand tuning (tweak if the gun sits wrong in the hand) ---
const GUN_POS = { x:0.05, y:0.0, z:0.06 }; // offset from the hand bone (metres)
const GUN_ROT = { x:0, y:0, z:0 };          // extra rotation (radians) if it points wrong
const GUN_SCALE = 1.4;                       // overall gun size multiplier
const _gunBody = new THREE.MeshStandardMaterial({color:0x23262d,roughness:0.5,metalness:0.6});
const _gunDark = new THREE.MeshStandardMaterial({color:0x111318,roughness:0.6,metalness:0.4});

// Build a simple low-poly gun. type: 'pistol' | 'rifle' | 'shotgun'
function makeGunMesh(type){
  const g=new THREE.Group();
  const box=(w,h,d,m)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m||_gunBody);
  if(type==='rifle'||type==='shotgun'){
    const len=type==='shotgun'?0.42:0.6;
    const body=box(0.05,0.09,len); body.position.z=len*0.3; g.add(body);
    const barrel=box(0.028,0.028,len*0.7,_gunDark); barrel.position.z=len*0.75; g.add(barrel);
    const grip=box(0.045,0.13,0.05,_gunDark); grip.position.set(0,-0.085,0.02); grip.rotation.x=0.25; g.add(grip);
    const stock=box(0.04,0.07,0.15,_gunDark); stock.position.z=-0.12; g.add(stock);
    const mag=box(0.035,0.11,0.05,_gunDark); mag.position.set(0,-0.085,0.16); g.add(mag);
  } else {
    const body=box(0.045,0.12,0.18); body.position.z=0.03; g.add(body);
    const barrel=box(0.03,0.035,0.14,_gunDark); barrel.position.z=0.15; g.add(barrel);
    const grip=box(0.045,0.13,0.06,_gunDark); grip.position.set(0,-0.1,-0.03); grip.rotation.x=0.3; g.add(grip);
  }
  g.scale.setScalar(GUN_SCALE);
  return g;
}

// Find the character's right-hand bone (robust across rigs).
function findHandBone(root){
  const pats=[/right.*hand/i,/hand.*_?r$/i,/hand_r/i,/handr$/i,/wrist.*r$/i,/mixamorigrighthand/i];
  let hit=null, anyHand=null;
  root.traverse(o=>{ if(!o.isBone) return; const n=o.name||'';
    if(/hand/i.test(n)) anyHand=anyHand||o;
    if(!hit){ for(const p of pats){ if(p.test(n)){ hit=o; break; } } } });
  return hit||anyHand||null;
}

export function loadModels(){
  return new Promise((res,rej)=>{
    new THREE.GLTFLoader().load('assets/character.glb', g=>{
      gltf=g;
      const box=new THREE.Box3().setFromObject(g.scene); const h=(box.max.y-box.min.y)||1;
      CHAR_SCALE=TARGET_HEIGHT/h; MODEL_MINY=box.min.y;
      res();
    }, undefined, err=>{ console.error('model load failed',err); rej(err); });
  });
}

export function makeAnimatedChar(tint,shadow){
  const inner=THREE.SkeletonUtils.clone(gltf.scene);
  inner.scale.setScalar(CHAR_SCALE);
  inner.position.y=-MODEL_MINY*CHAR_SCALE;
  inner.rotation.y=FACE_OFFSET;
  inner.traverse(o=>{ if(o.isMesh){ o.castShadow=(shadow!==false); o.frustumCulled=false; if(tint!=null){ o.material=new THREE.MeshStandardMaterial({color:tint,roughness:0.65,metalness:0.05,skinning:true}); } } });
  const wrapper=new THREE.Group(); wrapper.add(inner); scene.add(wrapper);
  const mixer=new THREE.AnimationMixer(inner);
  const actions={};
  const CLIPS={ idle:'Idle_Loop', walk:'Walk_Loop', run:'Sprint_Loop', punch:'Punch_Jab', cross:'Punch_Cross', shoot:'Pistol_Shoot', death:'Death01', hit:'Hit_Chest', reload:'Pistol_Reload' };
  for(const key in CLIPS){ const clip=THREE.AnimationClip.findByName(gltf.animations,CLIPS[key]); if(clip) actions[key]=mixer.clipAction(clip); }
  { const pick=n=>THREE.AnimationClip.findByName(gltf.animations,n);
    const aimClip=pick('Pistol_Aim_Neutral')||pick('Pistol_Idle_Loop');
    if(aimClip) actions.aim=mixer.clipAction(aimClip); }
  const ent={ mesh:wrapper, mixer, actions, animCur:'', lock:0, dead:false, hand:null, gun:null };
  const hand=findHandBone(inner);
  if(hand){ ent.hand=hand;
    if(!makeAnimatedChar._logged){ makeAnimatedChar._logged=true; console.log('[gun] using hand bone:', hand.name); }
    setGunModel(ent,'pistol');
  } else if(!makeAnimatedChar._warned){ makeAnimatedChar._warned=true;
    const names=[]; inner.traverse(o=>{ if(o.isBone) names.push(o.name); });
    console.warn('[gun] no right-hand bone found; gun not attached. Bones:', names);
  }
  playAnim(ent,'idle'); mixer.update(0);
  return ent;
}

// Swap the gun a character holds. type: 'pistol' | 'rifle' | 'shotgun'
export function setGunModel(ent,type){
  if(!ent||!ent.hand) return;
  if(ent.gun){ ent.hand.remove(ent.gun); ent.gun=null; }
  const gun=makeGunMesh(type);
  ent.hand.updateWorldMatrix(true,false);
  const ws=new THREE.Vector3(); ent.hand.getWorldScale(ws);
  const s=ws.x||1;
  gun.scale.multiplyScalar(1/s);
  gun.position.set(GUN_POS.x/s,GUN_POS.y/s,GUN_POS.z/s);
  gun.rotation.set(GUN_ROT.x,GUN_ROT.y,GUN_ROT.z);
  ent.hand.add(gun); ent.gun=gun;
}

export function playAnim(ent,name){
  if(!ent.actions[name] || ent.animCur===name) return;
  const next=ent.actions[name], prev=ent.animCur&&ent.actions[ent.animCur];
  next.reset().setEffectiveWeight(1).fadeIn(0.2).play();
  if(prev) prev.fadeOut(0.2);
  ent.animCur=name;
}

export function driveLocomotion(ent,dt){
  if(!ent.mixer) return;
  ent.mixer.update(dt);
  if(ent.dead) return;
  if(ent.lock>0){ ent.lock-=dt; if(ent.lock>0) return; }
  if(ent.aiming && ent.actions.aim){ playAnim(ent,'aim'); return; }
  const sp=Math.hypot(ent.vx||0,ent.vz||0);
  playAnim(ent, sp>RUN_SPEED ? 'run' : (sp>WALK_SPEED ? 'walk' : 'idle'));
}

export function updateFightAnim(ent,dt){
  if(!ent.mixer) return;
  ent.mixer.update(dt);
  if(ent.dead) return;
  if(ent.lock>0){ ent.lock-=dt; if(ent.lock>0) return; }
  playAnim(ent,'idle');
}

export function playAction(ent,name,lock){
  const a=ent.actions&&ent.actions[name]; if(!a||ent.dead) return;
  const prev=ent.animCur&&ent.actions[ent.animCur];
  a.reset(); a.setLoop(THREE.LoopOnce,1); a.clampWhenFinished=true; a.setEffectiveWeight(1).fadeIn(0.08).play();
  if(prev&&prev!==a) prev.fadeOut(0.08);
  ent.animCur=name; ent.lock=(lock!=null)?lock:a.getClip().duration;
}

export function playDeath(ent){
  if(ent.dead) return; ent.dead=true;
  const a=ent.actions&&ent.actions.death; if(!a) return;
  const prev=ent.animCur&&ent.actions[ent.animCur];
  a.reset(); a.setLoop(THREE.LoopOnce,1); a.clampWhenFinished=true; a.setEffectiveWeight(1).fadeIn(0.12).play();
  if(prev&&prev!==a) prev.fadeOut(0.12);
  ent.animCur='death';
}
