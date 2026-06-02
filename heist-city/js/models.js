// Loads the rigged GLB character and builds animated instances. (Stage 1)
import { scene } from './engine.js';

const TARGET_HEIGHT = 1.9;     // tune: character height in game units
const FACE_OFFSET   = 0; // tune: rotate model so it faces forward (+z)
const RUN_SPEED     = 9;       // tune: speed above which the run clip plays
const WALK_SPEED    = 0.6;     // tune: speed above which the walk clip plays

let gltf=null, CHAR_SCALE=1, MODEL_MINY=0;

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
  const CLIPS={ idle:'Idle_Loop', walk:'Walk_Loop', run:'Sprint_Loop', punch:'Punch_Jab', cross:'Punch_Cross', shoot:'Pistol_Shoot', death:'Death01' };
  for(const key in CLIPS){ const clip=THREE.AnimationClip.findByName(gltf.animations,CLIPS[key]); if(clip) actions[key]=mixer.clipAction(clip); }
  const ent={ mesh:wrapper, mixer, actions, animCur:'', lock:0, dead:false };
  playAnim(ent,'idle'); mixer.update(0);
  return ent;
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