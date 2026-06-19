// Gunplay: switchable weapons (pistol/rifle/shotgun), cops' pistols, hitscan + cover, tracers, muzzle flash.
import { CFG } from './config.js';
import { S } from './state.js';
import { scene } from './engine.js';
import { Audio } from './audio.js';
import { flash, banner, hitMark, popup } from './ui.js';
import { playAction, setGunModel } from './models.js';
import { camera } from './engine.js';

function stockKey(g){ return g.name==='RIFLE'?'rifle':(g.name==='SHOTGUN'?'shotgun':null); }

// --- aimed shooting: your aim line must pass through the enemy's body ---
const AIM_RADIUS = 1.6; // how close the aim line must pass to the body (smaller = harder)
export function updateAim(){
  const cross=document.getElementById('crosshair'); if(!cross || S.mode!=='play') return;
  const p=S.player, g=S.gun; if(!p||!g){ cross.classList.remove('on-target'); return; }
  p.aiming = !!(S.aimMode && !S.fight.active && !S.driving);
  const fx=Math.sin(p.facing), fz=Math.cos(p.facing); let on=false;
  if(S.aimMode){ for(const c of S.police){ if(c.state==='down') continue;
    const dx=c.x-p.x, dz=c.z-p.z, t=dx*fx+dz*fz;
    if(t<=0 || t>g.range) continue;
    if(Math.abs(dx*(-fz)+dz*fx)>AIM_RADIUS) continue;
    if(segmentBlocked(p.x,p.z,c.x,c.z)) continue;
    on=true; break; } }
  cross.classList.toggle('on-target', on);
}

let muzzle=null;
export function initWeapons(){
  if(!S.tracers.length){
    for(let i=0;i<24;i++){ const m=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,1),
      new THREE.MeshBasicMaterial({color:0xfff2a0,transparent:true,opacity:.9,fog:false})); m.visible=false; scene.add(m); S.tracers.push({mesh:m,life:0}); }
  } else for(const t of S.tracers){ t.life=0; t.mesh.visible=false; }
  if(!muzzle){ muzzle=new THREE.Mesh(new THREE.SphereGeometry(0.26,8,8), new THREE.MeshBasicMaterial({color:0xffd060,fog:false})); muzzle.visible=false; scene.add(muzzle); }
}
function getTracer(){ for(const t of S.tracers){ if(t.life<=0) return t; } return S.tracers[0]; }
function spawnTracer(ax,ay,az,bx,by,bz,color){ const t=getTracer(); const len=Math.hypot(bx-ax,by-ay,bz-az)||0.1;
  t.mesh.position.set((ax+bx)/2,(ay+by)/2,(az+bz)/2); t.mesh.scale.set(1,1,len); t.mesh.lookAt(bx,by,bz);
  t.mesh.material.color.set(color); t.mesh.material.opacity=.9; t.mesh.visible=true; t.life=0.06; }

export function segmentBlocked(ax,az,bx,bz){ const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz),steps=Math.ceil(len/1.2);
  for(let s=1;s<steps;s++){ const u=s/steps,x=ax+dx*u,z=az+dz*u;
    for(const b of S.buildings){ if(x>b.cx-b.hw-0.3&&x<b.cx+b.hw+0.3&&z>b.cz-b.hd-0.3&&z<b.cz+b.hd+0.3) return true; } } return false; }

export function setGun(i){ if(i<0||i>=CFG.guns.length) return; S.gunIndex=i; S.gun=CFG.guns[i]; S.ammo=S.gun.mag; S.reloading=false; S.fireCd=0; if(S.player&&S.player.hand) setGunModel(S.player,S.gun.name.toLowerCase()); banner(S.gun.name+' equipped','#ffb22e'); }
export function reload(){ if(S.reloading||S.ammo>=S.gun.mag) return;
  const k=stockKey(S.gun);
  if(k && (S.stock[k]||0)<=0){ banner('OUT OF '+S.gun.name+' AMMO','#ff5a4e'); return; }
  S.reloading=true; S.reloadT=S.gun.reload; Audio.reload(); playAction(S.player,'reload',S.gun.reload); }

function playerFire(){ const p=S.player, g=S.gun; if(S.ammo<=0){ reload(); return; } S.ammo--; S.fireCd=g.fireCd; Audio.shot(); playAction(p,'shoot',0.18);
  const fx=Math.sin(p.facing), fz=Math.cos(p.facing);
  let target=null,bd=1e9;
  if(S.aimMode){
    for(const c of S.police){ if(c.state==='down') continue;
      const dx=c.x-p.x, dz=c.z-p.z, t=dx*fx+dz*fz;
      if(t<=0 || t>g.range) continue;
      if(Math.abs(dx*(-fz)+dz*fx)>AIM_RADIUS) continue;
      if(segmentBlocked(p.x,p.z,c.x,c.z)) continue;
      if(t<bd){ bd=t; target=c; } }
  } else {
    const sprayRange=g.range*0.6;
    for(const c of S.police){ if(c.state==='down') continue;
      const dx=c.x-p.x,dz=c.z-p.z,d=Math.hypot(dx,dz)||1e-4;
      if(d>sprayRange) continue;
      if((dx/d)*fx+(dz/d)*fz < Math.cos(g.cone)) continue;
      if(segmentBlocked(p.x,p.z,c.x,c.z)) continue;
      if(d<bd){bd=d;target=c;} }
  }
  const dmg=g.dmg*(g.pellets||1); let endD=g.range;
  const gx=p.x+fx*0.7, gz=p.z+fz*0.7, gy=1.4;
  if(target){ endD=bd; target.hp-=dmg; S.shake=Math.max(S.shake,(g.pellets>1)?.25:.1);
    if(target.hp<=0){ target.hp=0; target.state='down'; target.downT=(target.role==='boss')?1e9:6; target.mesh.rotation.z=0;
      const pts=(target.role==='boss')?1500:200; S.points+=pts; hitMark(true); popup((target.role==='boss'?'CAPTAIN DOWN +':'KILL +')+pts,'#ffd24a'); Audio.hitmark();
      if(target.role==='boss'){ S.bossDefeated=true; banner('★ CAPTAIN DOWN — GRAB THE DIAMOND','#28e0c8'); } }
    else { S.points+=18; if(Math.random()<0.4) playAction(target,'hit',0.18); hitMark(false); Audio.hitmark(); }
  }
  const n=Math.min(g.pellets||1,5);
  for(let i=0;i<n;i++){ const a=p.facing+((n>1)?(Math.random()-0.5)*g.cone:0); spawnTracer(gx,gy,gz, p.x+Math.sin(a)*(endD+0.7),1.4, p.z+Math.cos(a)*(endD+0.7),0xfff2a0); }
  muzzle.position.set(gx,gy,gz); muzzle.visible=true; S.muzzleT=0.05; S.shake=Math.max(S.shake,.12);
}

export function copFire(c){ if(c.gunCd>0) return; const p=S.player; const dx=p.x-c.x,dz=p.z-c.z,d=Math.hypot(dx,dz)||1e-4;
  const range=c.gunRange||CFG.copGun.range;
  if(d<CFG.copGun.minRange||d>range) return; if(segmentBlocked(c.x,c.z,p.x,p.z)) return;
  c.gunCd=(c.gunCdBase||CFG.copGun.fireCd)*(0.8+Math.random()*0.5); Audio.shot(); playAction(c,'shoot',0.18);
  const hit = !S.hidden && Math.random()<(c.aim||CFG.copGun.hitChance);
  let ex=p.x,ez=p.z; if(!hit){ ex+=(Math.random()-0.5)*4; ez+=(Math.random()-0.5)*4; }
  spawnTracer(c.x+(dx/d)*0.7,1.4,c.z+(dz/d)*0.7,ex,1.3,ez,0xff8060);
  if(hit && !S.driving){ p.hp-=(c.gunDmg||CFG.copGun.dmg)*(S.armorMult||1); flash(0.26,'#ff3b4e'); S.shake=Math.max(S.shake,.28);
    if(p.hp<=0){ p.hp=0; import('./game.js').then(m=>m.endGame(false)); } }
}

export function updateWeapons(dt){
  for(const c of S.police){ if(c.gunCd>0) c.gunCd-=dt; }
  if(S.fireCd>0) S.fireCd-=dt;
  if(S.reloading){ S.reloadT-=dt; if(S.reloadT<=0){ S.reloading=false;
  const k=stockKey(S.gun);
  if(k){ const take=Math.min(S.gun.mag-S.ammo, S.stock[k]||0); S.ammo+=take; S.stock[k]=(S.stock[k]||0)-take; }
  else S.ammo=S.gun.mag; } }
  if(S.mode==='play' && !S.fight.active && !S.driving){
    const want = S.gun.auto ? S.firing : S.shootReq;
    if(want && !S.reloading && S.fireCd<=0 && S.ammo>0) playerFire();
    else if(want && S.ammo<=0) reload();
  }
  S.shootReq=false;
  for(const t of S.tracers){ if(t.life>0){ t.life-=dt; t.mesh.material.opacity=Math.max(0,t.life/0.06)*0.9; if(t.life<=0) t.mesh.visible=false; } }
  if(S.muzzleT>0){ S.muzzleT-=dt; if(S.muzzleT<=0 && muzzle) muzzle.visible=false; }
}
