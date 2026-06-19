// Builds the city geometry and spawns all actors (thief, car, cops, boss).
import { CFG, HALF, nodeX, nodeZ } from './config.js';
import { S } from './state.js';
import { scene, world } from './engine.js';
import { makeChar, makeCar, makeTree } from './factory.js';
import { recomputeGPS } from './nav.js';
import { banner } from './ui.js';
import { Audio } from './audio.js';
import { placeHeist } from './heist.js';
import { makeAnimatedChar, setGunModel } from './models.js';

export function collide(ent,r){
  for(const b of S.buildings){ const nx=Math.max(b.cx-b.hw,Math.min(ent.x,b.cx+b.hw)), nz=Math.max(b.cz-b.hd,Math.min(ent.z,b.cz+b.hd));
    const dx=ent.x-nx,dz=ent.z-nz,d2=dx*dx+dz*dz; if(d2<r*r){ if(d2>1e-6){ const d=Math.sqrt(d2); ent.x+=dx/d*(r-d); ent.z+=dz/d*(r-d);} else ent.x=b.cx+b.hw+r; } }
  const lim=HALF+CFG.unit/2-r; ent.x=Math.max(-lim,Math.min(lim,ent.x)); ent.z=Math.max(-lim,Math.min(lim,ent.z));
  if(ent.z<-HALF-2) ent.z=-HALF-2;
}

function pickupMesh(type){ const grp=new THREE.Group();
  if(type==='ammo'){ const box=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.6,0.7),new THREE.MeshStandardMaterial({color:0x2c2c2c,emissive:0x4a3a00,emissiveIntensity:.5})); box.castShadow=true; grp.add(box);
    const b=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.18,0.3),new THREE.MeshBasicMaterial({color:0xffd060})); b.position.y=0.18; grp.add(b);
  } else { const box=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.7,0.9),new THREE.MeshStandardMaterial({color:0xe8e8e8,emissive:0x224422,emissiveIntensity:.4})); box.castShadow=true; grp.add(box);
    const c1=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.18,0.2),new THREE.MeshBasicMaterial({color:0x37c837})); c1.position.y=0.05; grp.add(c1);
    const c2=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.55,0.2),new THREE.MeshBasicMaterial({color:0x37c837})); c2.position.y=0.05; grp.add(c2); }
  return grp; }

// --- procedural textures for the city look ---
function makeFacadeTex(wallHex){
  const c=document.createElement('canvas'); c.width=32; c.height=64; const x=c.getContext('2d');
  x.fillStyle=wallHex; x.fillRect(0,0,32,64);
  for(let fy=0; fy<8; fy++) for(let wx=0; wx<3; wx++){
    const r=Math.random(); x.fillStyle = r<0.40 ? '#ffd98a' : (r<0.62 ? '#9fe0ff' : '#0b0e14');
    x.fillRect(4+wx*9, 4+fy*7.6, 6, 5);
  }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.magFilter=THREE.NearestFilter; return t;
}
function makeDashTex(){
  const c=document.createElement('canvas'); c.width=8; c.height=32; const x=c.getContext('2d');
  x.clearRect(0,0,8,32); x.fillStyle='#cfc9ad'; x.fillRect(3,6,2,16);
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.magFilter=THREE.NearestFilter; return t;
}

export function buildCity(){
  S.buildings.length=0; S.parks.length=0; S.hideouts.length=0; S.pickups.length=0; S.safe=null; S.diamond=null;
  while(world.children.length) world.remove(world.children[0]);
  const span=CFG.GN*CFG.unit;

  const ground=new THREE.Mesh(new THREE.BoxGeometry(span+60,1,span+60),new THREE.MeshStandardMaterial({color:0x1a1d24,roughness:1})); ground.position.y=-0.5; ground.receiveShadow=true; world.add(ground);
  const river=new THREE.Mesh(new THREE.PlaneGeometry(span+120,70),new THREE.MeshStandardMaterial({color:0x123a52,roughness:.2,metalness:.6,emissive:0x06202e,emissiveIntensity:.5})); river.rotation.x=-Math.PI/2; river.position.set(0,-0.2,-HALF-46); world.add(river);
  const embank=new THREE.Mesh(new THREE.BoxGeometry(span+60,2,3),new THREE.MeshStandardMaterial({color:0x20252e})); embank.position.set(0,0.6,-HALF-9); world.add(embank);

  const dash=makeDashTex();
  for(let i=0;i<=CFG.GN;i++){
    const tv=dash.clone(); tv.needsUpdate=true; tv.repeat.set(1,Math.round(span/4));
    const v=new THREE.Mesh(new THREE.PlaneGeometry(0.5,span),new THREE.MeshBasicMaterial({map:tv,transparent:true,depthWrite:false})); v.rotation.x=-Math.PI/2; v.position.set(nodeX(i),0.05,0); world.add(v);
    const tz=dash.clone(); tz.needsUpdate=true; tz.repeat.set(1,Math.round(span/4));
    const hh=new THREE.Mesh(new THREE.PlaneGeometry(0.5,span),new THREE.MeshBasicMaterial({map:tz,transparent:true,depthWrite:false})); hh.rotation.x=-Math.PI/2; hh.rotation.z=Math.PI/2; hh.position.set(0,0.05,nodeZ(i)); world.add(hh);
  }

  const safeBlock=[CFG.GN-1,CFG.GN-1], parkBlocks=[[1,3],[4,1]], hideBlocks=[[0,4],[5,5],[2,1]];
  const isSafe=(i,j)=>i===safeBlock[0]&&j===safeBlock[1];
  const isPark=(i,j)=>parkBlocks.some(b=>b[0]===i&&b[1]===j);
  const isHide=(i,j)=>hideBlocks.some(b=>b[0]===i&&b[1]===j);
  const inner=CFG.unit-CFG.road;
  const palette=['#2b333f','#3a2f28','#28323f','#342b3a','#33303a','#2f3a3a'];
  const swMat=new THREE.MeshStandardMaterial({color:0x3a3f48,roughness:.95});
  const grassMat=new THREE.MeshStandardMaterial({color:0x244a2a,roughness:.95});
  const pathMat=new THREE.MeshStandardMaterial({color:0x6a6258,roughness:1});
  const capMat=new THREE.MeshStandardMaterial({color:0x14171d,roughness:1});
  const acMat=new THREE.MeshStandardMaterial({color:0x3a3f48,roughness:1});

  for(let i=0;i<CFG.GN;i++) for(let j=0;j<CFG.GN;j++){
    const cx=nodeX(i)+CFG.unit/2, cz=nodeZ(j)+CFG.unit/2;
    if(isPark(i,j)){
      const gr=new THREE.Mesh(new THREE.BoxGeometry(inner+3,0.25,inner+3),grassMat); gr.position.set(cx,0.12,cz); gr.receiveShadow=true; world.add(gr);
      const px=new THREE.Mesh(new THREE.BoxGeometry(inner+3,0.06,2),pathMat); px.position.set(cx,0.26,cz); world.add(px);
      const pz=new THREE.Mesh(new THREE.BoxGeometry(2,0.06,inner+3),pathMat); pz.position.set(cx,0.26,cz); world.add(pz);
      for(let k=0;k<5;k++) makeTree(cx+(Math.random()-.5)*inner*0.7, cz+(Math.random()-.5)*inner*0.7, 0.9+Math.random()*0.4);
      S.parks.push({cx,cz}); continue;
    }
    const sw=new THREE.Mesh(new THREE.BoxGeometry(inner+3,0.3,inner+3),swMat); sw.position.set(cx,0.15,cz); sw.receiveShadow=true; world.add(sw);
    if(isSafe(i,j)){
      const pad=new THREE.Mesh(new THREE.CylinderGeometry(6,6,0.18,40),new THREE.MeshStandardMaterial({color:0x28e0c8,emissive:0x28e0c8,emissiveIntensity:1.0,transparent:true,opacity:.5})); pad.position.set(cx,0.32,cz); world.add(pad);
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(3.4,6,22,28,1,true),new THREE.MeshBasicMaterial({color:0x28e0c8,transparent:true,opacity:.1,side:THREE.DoubleSide})); beam.position.set(cx,11,cz); world.add(beam);
      const pl=new THREE.PointLight(0x28e0c8,2.4,40); pl.position.set(cx,7,cz); world.add(pl); S.safe={x:cx,z:cz,r:6};
      const dia=new THREE.Mesh(new THREE.OctahedronGeometry(1.1),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x9ff0ff,emissiveIntensity:1.4,metalness:.7,roughness:.1})); dia.position.set(cx,2.2,cz); world.add(dia); S.diamond={x:cx,z:cz,mesh:dia};
    } else if(isHide(i,j)){
      const post=new THREE.MeshStandardMaterial({color:0x223326}); [[-3,-3],[3,-3],[-3,3],[3,3]].forEach(([ox,oz])=>{ const p=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,3.4,8),post); p.position.set(cx+ox,1.7,cz+oz); world.add(p); });
      const roof=new THREE.Mesh(new THREE.BoxGeometry(7.5,0.4,7.5),new THREE.MeshStandardMaterial({color:0x2e5a34,emissive:0x103a18,emissiveIntensity:.6})); roof.position.set(cx,3.5,cz); roof.castShadow=true; world.add(roof);
      const zone=new THREE.Mesh(new THREE.CylinderGeometry(5,5,0.1,28),new THREE.MeshBasicMaterial({color:0x5dd95d,transparent:true,opacity:.14})); zone.position.set(cx,0.2,cz); world.add(zone);
      makeTree(cx-4,cz-4,0.8); makeTree(cx+4,cz+4,0.8); S.hideouts.push({x:cx,z:cz,r:5});
    } else {
      const h=12+Math.random()*28, w=inner*(0.78+Math.random()*0.16);
      const tex=makeFacadeTex(palette[(i*3+j)%palette.length]);
      tex.repeat.set(Math.max(1,Math.round(w/7)), Math.max(2,Math.round(h/6)));
      const mat=new THREE.MeshStandardMaterial({ map:tex, emissiveMap:tex, emissive:0xffffff, emissiveIntensity:0.5, roughness:.9, metalness:.05 });
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),mat); m.position.set(cx,h/2+0.3,cz); m.castShadow=true; m.receiveShadow=true; world.add(m);
      const cap=new THREE.Mesh(new THREE.BoxGeometry(w+0.5,0.7,w+0.5),capMat); cap.position.set(cx,h+0.65,cz); cap.castShadow=true; world.add(cap);
      const ac=new THREE.Mesh(new THREE.BoxGeometry(2,1.1,2),acMat); ac.position.set(cx+(Math.random()-.5)*w*0.4, h+1.05, cz+(Math.random()-.5)*w*0.4); ac.castShadow=true; world.add(ac);
      S.buildings.push({cx,cz,hw:w/2,hd:w/2});
    }
  }

  const poleMat=new THREE.MeshStandardMaterial({color:0x15181f}), bulbMat=new THREE.MeshBasicMaterial({color:0xffd9a0});
  for(let i=0;i<=CFG.GN;i++) for(let j=0;j<=CFG.GN;j++){ if((i+j)%2!==0) continue;
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.16,5,8),poleMat); pole.position.set(nodeX(i)+2,2.5,nodeZ(j)+2); pole.castShadow=true; world.add(pole);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.15,0.15),poleMat); arm.position.set(nodeX(i)+2.8,4.9,nodeZ(j)+2); world.add(arm);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.34,10,10),bulbMat); bulb.position.set(nodeX(i)+3.5,4.8,nodeZ(j)+2); world.add(bulb); }

  const hpSpots=[[1,1],[5,2],[2,5],[6,4]], ammoSpots=[[3,6],[6,1],[0,2],[4,5]];
  for(const [i,j] of hpSpots){ const x=nodeX(i),z=nodeZ(j); const g=pickupMesh('hp'); g.position.set(x,1.0,z); world.add(g); S.pickups.push({x,z,active:true,t:0,type:'hp',mesh:g}); }
  for(const [i,j] of ammoSpots){ const x=nodeX(i),z=nodeZ(j); const g=pickupMesh('ammo'); g.position.set(x,1.0,z); world.add(g); S.pickups.push({x,z,active:true,t:0,type:'ammo',mesh:g}); }
  placeHeist();
}

export function spawnAll(){
  if(S.player) scene.remove(S.player.mesh); S.player=null;
  S.police.forEach(p=>scene.remove(p.mesh)); S.police=[];
  if(S.car) scene.remove(S.car.mesh); S.car=null;
  S.fight.active=false; S.fight.target=null; S.fight.cd=0; S.hidden=false; S.combo=0; S.bossDefeated=false;
  S.gun=CFG.guns[S.gunIndex]; S.ammo=S.gun.mag; S.reloading=false; S.reloadT=0; S.fireCd=0; S.firing=false; S.shootReq=false;

  const _pc=makeAnimatedChar(0x1b3a4a);
  S.player={mesh:_pc.mesh,mixer:_pc.mixer,actions:_pc.actions,animCur:'',hand:_pc.hand,gun:_pc.gun,x:nodeX(Math.floor(CFG.GN/2)),z:nodeZ(Math.floor(CFG.GN/2)),y:0,vy:0,vx:0,vz:0,facing:0,hp:CFG.player.maxHp,stam:CFG.player.maxStam,grounded:true,runPhase:0,fAtk:0,fType:null};
  { const _g=CFG.guns[S.gunIndex]||CFG.guns[0]; if(S.player.hand&&_g) setGunModel(S.player,_g.name.toLowerCase()); }
  S.car=null;

  function cop(o){ const pc=makeAnimatedChar(o.accent,false); if(o.scale) pc.mesh.scale.setScalar(o.scale);
    S.police.push({mesh:pc.mesh,mixer:pc.mixer,actions:pc.actions,animCur:'',x:o.x,z:o.z,y:0,vx:0,vz:0,facing:0,hp:o.hp,maxHp:o.hp,state:'patrol',role:o.role,anchor:{x:o.x,z:o.z},path:[],repath:0,runPhase:0,windup:0,fTimer:1,downT:0,lostT:0,gunCd:0}); }

  cop({role:'boss',body:0x101014,accent:0xffd24a,scale:CFG.boss.scale,hp:CFG.boss.hp,x:S.safe.x-11,z:S.safe.z-11});
  cop({role:'guard',female:false,body:0x2a1530,accent:0xff3b4e,hp:100,x:S.safe.x-13,z:S.safe.z-4});
  cop({role:'guard',female:true ,body:0x301a36,accent:0xff6fa0,hp:100,x:S.safe.x-4,z:S.safe.z-13});
  const cps=[[3,3],[CFG.GN,2],[1,CFG.GN],[CFG.GN-2,CFG.GN-3],[2,2]];
  cps.forEach(([ci,cj],k)=>cop({role:'checkpoint',female:(k%2===0),body:(k%2===0)?0x301a36:0x2a1530,accent:(k%2===0)?0xff6fa0:0xff3b4e,hp:100,x:nodeX(ci),z:nodeZ(cj)}));
  if(S.heist.zone){ const hz=S.heist.zone, R=hz.r+1.5; for(let k=0;k<3;k++){ const a=k*2.094; cop({role:'guard',body:0x1c2330,accent:0x3ad0ff,female:(k%2===0),hp:110,x:hz.x+Math.cos(a)*R,z:hz.z+Math.sin(a)*R}); } }

  const _boss=S.police.find(c=>c.role==='boss'); if(_boss){ _boss.appeared=true; _boss.mesh.visible=true; }
  S.driving=false; S.camYaw=0; S.lastStartKey=-1; recomputeGPS(true);
}

// --- floating HP bars over cops ---
const _hpTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=2;
  const x=cv.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,2,2); return new THREE.CanvasTexture(cv); })();
function attachHpBar(c){
  const mk=color=>{ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:_hpTex,color})); s.center.set(0,0.5); return s; };
  const w=(c.role==='boss')?1.7:1.1;
  c.hpBg=mk(0x14171d); c.hpBg.scale.set(w,0.12,1); c.hpBg.position.set(-w/2,2.45,0);
  c.hpFg=mk(c.role==='boss'?0xffd24a:0xff4d5e); c.hpFg.scale.set(w,0.13,1); c.hpFg.position.set(-w/2,2.45,0.01);
  c.hpW=w; c.mesh.add(c.hpBg); c.mesh.add(c.hpFg);
}
export function updateHpBars(){
  for(const c of S.police){ if(!c.mesh) continue; if(!c.hpBg) attachHpBar(c);
    const r=Math.max(0,Math.min(1,c.hp/(c.maxHp||100)));
    c.hpFg.scale.x=Math.max(0.001,c.hpW*r);
    const vis=c.state!=='down'; c.hpBg.visible=vis; c.hpFg.visible=vis; }
}


// ---- Alarm + escalating police waves (phase 2) ----
export function addCop(o){ const pc=makeAnimatedChar(o.accent,false); if(o.scale) pc.mesh.scale.setScalar(o.scale);
  const c={mesh:pc.mesh,mixer:pc.mixer,actions:pc.actions,animCur:'',x:o.x,z:o.z,y:0,vx:0,vz:0,facing:0,hp:o.hp,maxHp:o.hp,state:o.state||'patrol',role:o.role,kind:o.kind||'cop',gunDmg:o.gunDmg,gunRange:o.gunRange,gunCdBase:o.gunCdBase,anchor:{x:o.x,z:o.z},path:[],repath:0,runPhase:0,windup:0,fTimer:1,downT:0,lostT:0,gunCd:0};
  S.police.push(c); return c; }

function copSpec(x,z,state){
  const r=Math.random();
  if(S.round>=CFG.copTypes.sniper.fromRound && r<0.18){ const t=CFG.copTypes.sniper;
    return {role:'checkpoint',kind:'sniper',accent:t.tint,hp:t.hp,gunDmg:t.gunDmg,gunRange:t.gunRange,gunCdBase:t.gunCdBase,x,z,state}; }
  if(S.round>=CFG.copTypes.heavy.fromRound && r<0.42){ const t=CFG.copTypes.heavy;
    return {role:'checkpoint',kind:'heavy',accent:t.tint,hp:t.hp,gunDmg:t.gunDmg,gunRange:t.gunRange,gunCdBase:t.gunCdBase,x,z,state}; }
  return {role:'checkpoint',kind:'cop',accent:(Math.random()<0.5)?0xff6fa0:0xff3b4e,hp:100,x,z,state};
}

function spawnWave(){
  const active=S.police.reduce((n,c)=>n+(c.state!=='down'?1:0),0);
  if(active>=CFG.alarm.maxActive) return;
  const p=S.player, room=CFG.alarm.maxActive-active, lim=HALF+CFG.unit/2-2;
  const n=Math.min(CFG.alarm.perWave+Math.floor(S.waveCount/2)+Math.floor((S.round-1)*0.7), room);
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, R=CFG.alarm.spawnDist;
    const x=Math.max(-lim,Math.min(lim,p.x+Math.cos(a)*R)), z=Math.max(-lim,Math.min(lim,p.z+Math.sin(a)*R));
    addCop(copSpec(x,z,'chase')); }
  banner('POLICE BACKUP INBOUND','#ff5a4e'); if(Audio.alert) Audio.alert();
}

export function spawnRoundGuards(){
  const z=S.heist.zone; if(!z) return;
  const g=Math.min(8, 3+Math.floor((S.round-1)*0.8));
  for(let i=0;i<g;i++){ const a=(i/g)*Math.PI*2, R=z.r+5;
    addCop(copSpec(z.x+Math.cos(a)*R, z.z+Math.sin(a)*R, 'patrol')); }
}

export function updateAlarm(dt){
  if(!S.alarm) return;
  S.waveTimer-=dt;
  if(S.waveTimer<=0){ spawnWave(); S.waveCount++; S.heat=Math.min(CFG.alarm.maxHeat,1+Math.floor(S.waveCount/CFG.alarm.heatEvery)); S.waveTimer=CFG.alarm.interval; }
}
