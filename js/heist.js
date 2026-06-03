// Heist loop, phase 1: pick a target building each run, mark it gold, let the thief crack it.
import { CFG } from './config.js';
import { S } from './state.js';
import { world } from './engine.js';
import { banner } from './ui.js';
import { Audio } from './audio.js';

let beacon=null, loot=null, light=null, lastB=-1;

export function placeHeist(){
  if(beacon){ world.remove(beacon); beacon=null; } if(light){ world.remove(light); light=null; } if(loot){ world.remove(loot); loot=null; }
  S.heist.looted=false; S.heist.cracking=false; S.heist.progress=0; S.heist.zone=null;
  S.alarm=false; S.heat=0; S.waveTimer=0; S.waveCount=0;
  if(!S.buildings.length) return;
  let maxD=0; for(const bb of S.buildings){ const d=S.safe?Math.hypot(bb.cx-S.safe.x,bb.cz-S.safe.z):0; if(d>maxD)maxD=d; }
  const far=S.buildings.filter(bb=>!S.safe||Math.hypot(bb.cx-S.safe.x,bb.cz-S.safe.z)>maxD*0.7);
  let bi=Math.floor(Math.random()*far.length);
  if(far.length>1 && bi===lastB) bi=(bi+1)%far.length;
  lastB=bi; const b=far[bi]||S.buildings[0];
  S.heist.name=CFG.heist.names[Math.floor(Math.random()*CFG.heist.names.length)];
  S.heist.zone={ x:b.cx, z:b.cz, r:b.hw+3 };
  const gold=0xffcf3a;
  beacon=new THREE.Mesh(new THREE.CylinderGeometry(2.6,5.5,20,28,1,true),
    new THREE.MeshBasicMaterial({color:gold,transparent:true,opacity:.12,side:THREE.DoubleSide,fog:false}));
  beacon.position.set(b.cx,10,b.cz); world.add(beacon);
  light=new THREE.PointLight(gold,2.0,46); light.position.set(b.cx,8,b.cz); world.add(light);
  loot=new THREE.Mesh(new THREE.OctahedronGeometry(1.0),
    new THREE.MeshStandardMaterial({color:0xfff2c0,emissive:gold,emissiveIntensity:1.3,metalness:.6,roughness:.2}));
  loot.position.set(b.cx,7,b.cz); world.add(loot);
}

export function updateHeist(dt){
  if(loot && loot.visible){ loot.rotation.y+=dt*1.8; loot.position.y=7+Math.sin(S.t*2)*0.4; }
  const z=S.heist.zone; if(!z||S.heist.looted) return;
  const p=S.player;
  const near = Math.hypot(p.x-z.x,p.z-z.z) < z.r && !S.driving && !S.fight.active;
  S.heist.cracking=near;
  if(near){
    S.heist.progress=Math.min(1, S.heist.progress + dt/CFG.heist.crackTime);
    if(S.heist.progress>=1){
      S.heist.looted=true; S.heist.cracking=false; S.points+=CFG.heist.lootPoints;
      if(beacon) beacon.visible=false; if(light) light.intensity=0; if(loot) loot.visible=false;
      S.alarm=true; S.heat=1; S.waveCount=0; S.waveTimer=CFG.alarm.firstDelay;
      banner('LOOT SECURED — ALARM TRIPPED! ESCAPE NOW','#ff5a4e'); Audio.kit(); if(Audio.alert) Audio.alert();
    }
  } else {
    S.heist.progress=Math.max(0, S.heist.progress - dt*0.5);
  }
}
