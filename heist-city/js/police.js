// Police AI: patrol/checkpoint/guard/boss, chase on sight, call backup, shoot at range, defend the diamond.
import { CFG, nodeX, nodeZ, dist } from './config.js';
import { S, actor } from './state.js';
import { astar } from './nav.js';
import { Audio } from './audio.js';
import { enterFight } from './fight.js';
import { copFire } from './weapons.js';
import { driveLocomotion, playDeath } from './models.js';

export function animChar(ent,moving){ const ud=ent.mesh.userData; if(moving){ ud.runPhase+=0.3; ud.lL.rotation.x=Math.sin(ud.runPhase)*0.6; ud.lR.rotation.x=-Math.sin(ud.runPhase)*0.6; } else { ud.lL.rotation.x*=0.8; ud.lR.rotation.x*=0.8; } }

export function updatePolice(dt){
  const p=S.player; let seenPos=null;
  const inSafe = S.bossDefeated && S.safe && Math.hypot(p.x-S.safe.x,p.z-S.safe.z) < S.safe.r+1;
  for(const pol of S.police){
    if(pol.role==='boss' && !pol.appeared){ pol.mesh.visible=false; continue; }
    if(pol.state==='down'){ playDeath(pol); if(pol.mixer) pol.mixer.update(dt); pol.mesh.position.set(pol.x,0,pol.z); continue; }
    if(pol.state==='fight'){ if(!S.fight.active) pol.state='chase'; continue; }
    const tx=actor().x, tz=actor().z, dT=Math.hypot(tx-pol.x,tz-pol.z);
    const canSee=!S.hidden && dT<CFG.police.sight;
    if(canSee){ if(pol.state!=='chase'){ pol.state='chase'; if(seenPos===null) Audio.alert(); } pol.lostT=0; seenPos={x:tx,z:tz}; }
    else if(pol.state==='chase'){ pol.lostT+=dt; if(pol.lostT>CFG.police.lose) pol.state='return'; }
    pol.repath-=dt;
    if(pol.state==='chase'){ if(pol.repath<=0){ pol.path=astar(pol.x,pol.z,tx,tz); pol.repath=CFG.police.repath; } if(dT<10) pol.path=[{x:tx,z:tz}]; }
    else if(pol.state==='return'){ if(pol.repath<=0){ pol.path=astar(pol.x,pol.z,pol.anchor.x,pol.anchor.z); pol.repath=1; } if(dist(pol,pol.anchor)<3){ pol.state='patrol'; pol.path=[]; } }
    else if(!pol.path.length){ const rad=(pol.role==='guard'||pol.role==='boss')?5:9; const ang=Math.random()*Math.PI*2; pol.path=astar(pol.x,pol.z,pol.anchor.x+Math.cos(ang)*rad,pol.anchor.z+Math.sin(ang)*rad); }
    const spd=pol.state==='chase'?CFG.police.run:CFG.police.walk;
    if(pol.path.length){ const wp=pol.path[0],dx=wp.x-pol.x,dz=wp.z-pol.z,d=Math.hypot(dx,dz)||1e-4; if(d<1.4) pol.path.shift();
      else { const tvx=dx/d*spd,tvz=dz/d*spd; pol.vx+=(tvx-pol.vx)*Math.min(1,CFG.police.accel*dt); pol.vz+=(tvz-pol.vz)*Math.min(1,CFG.police.accel*dt); pol.x+=pol.vx*dt; pol.z+=pol.vz*dt; } }
    pol.facing=Math.atan2(pol.vx,pol.vz);
    // shoot from range while chasing
    if(pol.state==='chase' && !S.fight.active && !inSafe) copFire(pol);
    // melee challenge up close
    if(!S.driving && !S.fight.active && S.fight.cd<=0 && !S.hidden && !inSafe && pol.state==='chase' && dT<CFG.police.engage) enterFight();
    driveLocomotion(pol,dt); pol.mesh.position.set(pol.x,0,pol.z); pol.mesh.rotation.y=pol.facing;
  }
  if(seenPos){ for(const pol of S.police){ if(pol.state==='down'||pol.state==='fight') continue; if(dist(pol,seenPos)<CFG.police.alert){ pol.state='chase'; pol.lostT=0; } } }
}
