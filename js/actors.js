// Player on-foot + driving updates, pickups/hideouts, and the win check (needs the boss beaten).
import { CFG, dist } from './config.js';
import { S } from './state.js';
import { Audio } from './audio.js';
import { banner } from './ui.js';
import { inputWorldDir } from './input.js';
import { collide } from './world.js';
import { animChar } from './police.js';
import { enterFight } from './fight.js';
import { driveLocomotion } from './models.js';

export function checkWin(ent){ if(S.heist.looted && !S.roundChanging && S.safe && dist(ent,S.safe)<S.safe.r){ S.roundChanging=true; import('./game.js').then(m=>m.nextRound()); } }

export function updatePlayer(dt){ const p=S.player,c=CFG.player; const {wx,wz,mag}=inputWorldDir(); const moving=mag>0.05;
  const wantSprint=(S.bot?S.botSprint:(S.keys['ShiftLeft']||S.keys['ShiftRight']))&&moving&&p.stam>1; const speed=wantSprint?c.sprint:c.walk;
  if(wantSprint) p.stam=Math.max(0,p.stam-c.stamDrain*dt); else p.stam=Math.min(c.maxStam,p.stam+c.stamRegen*dt);
  const tvx=wx*speed,tvz=wz*speed; p.vx+=(tvx-p.vx)*Math.min(1,c.accel*dt); p.vz+=(tvz-p.vz)*Math.min(1,c.accel*dt); p.x+=p.vx*dt; p.z+=p.vz*dt;
  const jump=S.bot?S.botJump:(S.keys['Space']||S.touchJump); if(jump&&p.grounded){ p.vy=c.jump; p.grounded=false; }
  p.vy-=CFG.gravity*dt; p.y+=p.vy*dt; if(p.y<=0){p.y=0;p.vy=0;p.grounded=true;}
  collide(p,c.radius);
if(moving){ const tf=Math.atan2(p.vx,p.vz); let d=tf-p.facing; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; p.facing+=d*Math.min(1,7*dt); }
  if(moving&&p.grounded){ p.runPhase+=dt*(wantSprint?14:9); if(Math.sin(p.runPhase)>0.96) Audio.foot(); }
  driveLocomotion(p,dt);
  p.mesh.position.set(p.x,p.y,p.z); p.mesh.rotation.y=p.facing;
  S.hidden=false; for(const h of S.hideouts){ if(dist(p,h)<h.r){ S.hidden=true; break; } }
  if(S.hidden) p.hp=Math.min(c.maxHp,p.hp+CFG.hideRegen*dt);
  for(const k of S.pickups){ if(k.active && dist(p,k)<1.6){
    if(k.type==='ammo'){ S.ammo=Math.min(S.gun.mag,S.ammo+CFG.ammoPickup.amount); k.t=CFG.ammoPickup.respawn; banner('+AMMO','#ffd060'); }
    else { p.hp=Math.min(c.maxHp,p.hp+CFG.pickup.heal); k.t=CFG.pickup.respawn; banner('+'+CFG.pickup.heal+' HP','#5dd95d'); }
    k.active=false; k.mesh.visible=false; Audio.kit(); } }
  checkWin(p);
}

export function updateCar(dt){ const car=S.car,c=CFG.car; const {wx,wz,mag}=inputWorldDir();
  if(mag>0.1){ const target=Math.atan2(wx,wz); let diff=target-car.facing; while(diff>Math.PI)diff-=2*Math.PI; while(diff<-Math.PI)diff+=2*Math.PI; car.facing+=Math.max(-c.turn*dt,Math.min(c.turn*dt,diff)); car.speed+=c.accel*dt; }
  else car.speed-=c.accel*1.5*dt; car.speed=Math.max(0,Math.min(c.topSpeed,car.speed));
  car.x+=Math.sin(car.facing)*car.speed*dt; car.z+=Math.cos(car.facing)*car.speed*dt; collide(car,c.radius);
  if(car.speed>2&&Math.random()<0.3) Audio.engine(); car.mesh.position.set(car.x,0,car.z); car.mesh.rotation.y=car.facing; S.player.x=car.x; S.player.z=car.z;
  S.hidden=false; checkWin(car); }
