import { CFG, dist } from './config.js';
import { S } from './state.js';
import { fightPunch, fightKick } from './fight.js';
import { reload, setGun } from './weapons.js';
import { startGame } from './game.js';
import { applyScene } from './engine.js';

export function blocking(){ return S.bot ? S.botBlock : (S.keys['KeyL']||S.keys['ShiftLeft']||S.keys['ShiftRight']||S.touchBlock); }

export function toggleCar(){ if(S.mode!=='play'||S.fight.active) return; S.firing=false;
  if(S.driving){ S.driving=false; S.player.x=S.car.x+Math.cos(S.car.facing+1.57)*2.6; S.player.z=S.car.z+Math.sin(S.car.facing+1.57)*2.6; S.player.mesh.visible=true; S.lastStartKey=-1; }
  else { if(S.car && dist(S.player,S.car)<3.8){ S.driving=true; S.player.mesh.visible=false; S.car.speed=0; S.lastStartKey=-1; } } }

export function toggleBot(){ if(S.mode!=='play') return; S.bot=!S.bot; document.getElementById('botTag').style.opacity=S.bot?1:0; }

export function relabelButtons(){ const bAct=document.getElementById('btnAct'),bJump=document.getElementById('btnJump'),bHit=document.getElementById('btnHit'),bHide=document.getElementById('btnHide'),bGun=document.getElementById('btnGun');
  if(S.fight.active){ bHit.textContent='PUNCH'; bJump.textContent='KICK'; bAct.innerHTML='BLOCK<br>(hold)'; bHide.style.display='none'; if(bGun) bGun.style.display='none'; }
  else { bHit.innerHTML='FIRE<br>(hold)'; bJump.textContent='JUMP'; bAct.textContent='CAR'; bHide.style.display=''; if(bGun) bGun.style.display=''; } }

export function inputWorldDir(){ let ix=0,iz=0;
  if(S.bot){ ix=S.botMove.x; iz=S.botMove.y; }
  else { if(S.keys['KeyW']||S.keys['ArrowUp']) iz-=1; if(S.keys['KeyS']||S.keys['ArrowDown']) iz+=1; if(S.keys['KeyA']||S.keys['ArrowLeft']) ix-=1; if(S.keys['KeyD']||S.keys['ArrowRight']) ix+=1; if(S.touchVec.x||S.touchVec.y){ ix+=S.touchVec.x; iz+=S.touchVec.y; } }
  const L=Math.hypot(ix,iz); if(L>1){ix/=L;iz/=L;} const sin=Math.sin(S.camYaw),cos=Math.cos(S.camYaw);
  return { wx:sin*(-iz)+(-cos)*(ix), wz:cos*(-iz)+(sin)*(ix), mag:L }; }

export function botAimToward(dx,dz){ const d=Math.hypot(dx,dz)||1; dx/=d; dz/=d; const sin=Math.sin(S.camYaw),cos=Math.cos(S.camYaw);
  const fwd=dx*sin+dz*cos, rgt=-dx*cos+dz*sin; S.botMove.x=rgt; S.botMove.y=-fwd; }

export function setupInput(){
  addEventListener('keydown',e=>{ S.keys[e.code]=true;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    if(!S.bot){
      if(S.fight.active){ if(e.code==='KeyJ') fightPunch(); if(e.code==='KeyK') fightKick(); }
      else { if(e.code==='KeyF'){ if(!S.firing) S.shootReq=true; S.firing=true; } if(e.code==='KeyR') reload();
             if(e.code==='Digit1') setGun(0); if(e.code==='Digit2') setGun(1); if(e.code==='Digit3') setGun(2); }
      if(e.code==='KeyE') toggleCar();
    }
    if(e.code==='KeyP') toggleBot(); });
  addEventListener('keyup',e=>{ S.keys[e.code]=false; if(e.code==='KeyF') S.firing=false; });

  import('./engine.js').then(({renderer})=>{ const el=renderer.domElement;
    el.addEventListener('pointerdown',()=>{ if(S.mode!=='play'||S.bot) return; if(S.fight.active) fightPunch(); else if(!S.driving){ S.shootReq=true; S.firing=true; } });
    el.addEventListener('pointerup',()=>{ S.firing=false; }); });
  addEventListener('pointerup',()=>{ S.firing=false; });

  if(('ontouchstart' in window)||navigator.maxTouchPoints>0) document.body.classList.add('mobile');
  const stick=document.getElementById('stick'),knob=document.getElementById('knob'); let active=false;
  function set(t){ const r=stick.getBoundingClientRect(); let dx=t.clientX-(r.left+r.width/2),dy=t.clientY-(r.top+r.height/2); const max=r.width/2;
    const L=Math.hypot(dx,dy); if(L>max){dx*=max/L;dy*=max/L;} knob.style.transform=`translate(${dx}px,${dy}px)`; S.touchVec.x=dx/max; S.touchVec.y=dy/max; }
  stick.addEventListener('touchstart',e=>{active=true;set(e.touches[0]);e.preventDefault();});
  stick.addEventListener('touchmove',e=>{if(active)set(e.touches[0]);e.preventDefault();});
  stick.addEventListener('touchend',e=>{active=false;knob.style.transform='';S.touchVec.x=0;S.touchVec.y=0;e.preventDefault();});
  const bAct=document.getElementById('btnAct'),bJump=document.getElementById('btnJump'),bHit=document.getElementById('btnHit'),bGun=document.getElementById('btnGun');
  bHit.addEventListener('touchstart',e=>{ if(S.fight.active) fightPunch(); else if(!S.driving){ S.shootReq=true; S.firing=true; } e.preventDefault(); });
  bHit.addEventListener('touchend',e=>{ S.firing=false; e.preventDefault(); });
  bJump.addEventListener('touchstart',e=>{ if(S.fight.active) fightKick(); else S.touchJump=true; e.preventDefault(); });
  bJump.addEventListener('touchend',e=>{ S.touchJump=false; e.preventDefault(); });
  bAct.addEventListener('touchstart',e=>{ if(S.fight.active) S.touchBlock=true; else toggleCar(); e.preventDefault(); });
  bAct.addEventListener('touchend',e=>{ S.touchBlock=false; e.preventDefault(); });
  if(bGun) bGun.addEventListener('touchstart',e=>{ setGun((S.gunIndex+1)%CFG.guns.length); e.preventDefault(); });

  const sb=document.getElementById('sceneBtn');
  if(sb){ const upd=()=>{ sb.textContent='TIME: '+CFG.scenes[S.sceneIndex].name; };
    sb.onclick=()=>{ S.sceneIndex=(S.sceneIndex+1)%CFG.scenes.length; applyScene(CFG.scenes[S.sceneIndex]); upd(); }; upd(); }

  document.getElementById('startBtn').addEventListener('click',()=>startGame(false));
  document.getElementById('demoBtn').addEventListener('click',()=>startGame(true));
  document.getElementById('restartBtn').addEventListener('click',()=>startGame(false));
}