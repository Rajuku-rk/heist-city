// Behind-the-back follow camera (frames the cop during a fight) + screen shake.
import { S, actor } from './state.js';
import { camera } from './engine.js';

export function updateCamera(dt){ const a=actor(); if(!a) return;
  const aiming = S.aimMode && !S.fight.active && !S.driving;
  let targetYaw;
  if(S.fight.active && S.fight.target){ targetYaw=Math.atan2(S.fight.target.x-a.x,S.fight.target.z-a.z); }
  else targetYaw=(a.facing!==undefined?a.facing:S.camYaw);
  let diff=targetYaw-S.camYaw; while(diff>Math.PI)diff-=2*Math.PI; while(diff<-Math.PI)diff+=2*Math.PI;
  S.camYaw+=diff*Math.min(1,(S.fight.active?6:(aiming?7:2.4))*dt);   // 2.4 = camera turn speed; tune to taste
  let D=S.fight.active?7:(S.driving?15:11), H=S.fight.active?4.5:(S.driving?8:7);
  if(aiming){ D=9; H=5; }
  const tx=a.x-Math.sin(S.camYaw)*D, tz=a.z-Math.cos(S.camYaw)*D, ay=a.y||0;
  camera.position.x+=(tx-camera.position.x)*Math.min(1,8*dt); camera.position.z+=(tz-camera.position.z)*Math.min(1,8*dt); camera.position.y+=(ay+H-camera.position.y)*Math.min(1,8*dt);
  if(S.shake>0){ camera.position.x+=(Math.random()-.5)*S.shake; camera.position.y+=(Math.random()-.5)*S.shake; S.shake*=0.86; if(S.shake<0.02)S.shake=0; }
  const fovT = aiming?40:62; camera.fov += (fovT-camera.fov)*Math.min(1,8*dt); camera.updateProjectionMatrix();
  if(S.fight.active && S.fight.target){ const c=S.fight.target; camera.lookAt(a.x+(c.x-a.x)*0.35,1.4,a.z+(c.z-a.z)*0.35); } else camera.lookAt(a.x,ay+1.5,a.z); }
