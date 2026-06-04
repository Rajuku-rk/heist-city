// Game flow: start/end, and the main animation loop that ties every system together.
import { CFG, nodeX, nodeZ, dist } from './config.js';
import { S, actor } from './state.js';
import { renderer, scene, camera, applyScene } from './engine.js';
import { buildCity, spawnAll, updateAlarm, spawnRoundGuards } from './world.js';
import { updatePlayer, updateCar } from './actors.js';
import { updatePolice } from './police.js';
import { updateFight, enterFight } from './fight.js';
import { initWeapons, updateWeapons } from './weapons.js';
import { botThink } from './bot.js';
import { updateCamera } from './camera.js';
import { drawMap, updateHud, updateBanner, banner, el } from './ui.js';
import { recomputeGPS } from './nav.js';
import { Audio } from './audio.js';
import { relabelButtons } from './input.js';
import { applyUpgrades, addCredits } from './upgrades.js';
import { updateHeist, placeHeist } from './heist.js';

function goFullscreen(){
  if(!document.body.classList.contains('mobile')) return;
  const el=document.documentElement, fn=el.requestFullscreen||el.webkitRequestFullscreen;
  if(!fn || document.fullscreenElement) return;
  try{ const p=fn.call(el);
    if(p&&p.then) p.then(()=>{ if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{}); }).catch(()=>{});
  }catch(e){}
}
export function startGame(bot){ goFullscreen(); applyUpgrades(); applyScene(CFG.scenes[S.sceneIndex]); buildCity(); spawnAll(); initWeapons(); S.points=0; S.elapsed=0; S.round=1; S.roundChanging=false; S.mode='play'; S.bot=!!bot;
  camera.position.set(nodeX(Math.floor(CFG.GN/2)),8,nodeZ(Math.floor(CFG.GN/2))-11);
  el('startScreen').classList.add('hidden'); el('endScreen').classList.add('hidden'); el('fightUI').classList.add('hidden');
  el('hud').classList.remove('hidden'); el('botTag').style.opacity=bot?1:0; relabelButtons(); Audio.play('run'); }

export function endGame(won){ if(S.mode!=='play') return; S.mode='over'; S.firing=false; addCredits(S.points); Audio.stop(); won?Audio.win():Audio.lose();
  const sc=el('endScreen'); sc.className='screen '+(won?'win':'lose'); el('endKicker').textContent=won?'Diamond Secured':('Busted — reached Round '+S.round);
  el('endTitle').textContent=won?'YOU GOT AWAY':'BUSTED'; el('endScore').textContent=Math.floor(S.points).toLocaleString(); el('endTime').textContent=Math.floor(S.elapsed)+'s';
  el('hud').classList.add('hidden'); el('botTag').style.opacity=0; }

export function nextRound(){
  S.round++; S.points+=CFG.pointsWin;
  S.player.hp=Math.min(CFG.player.maxHp, S.player.hp+CFG.round.healOnClear);
  for(let i=S.police.length-1;i>=0;i--){ const c=S.police[i]; if(c.state==='down'){ if(c.mesh) scene.remove(c.mesh); S.police.splice(i,1); } }
  for(const c of S.police){ c.state='patrol'; c.anchor={x:c.x,z:c.z}; c.lostT=0; }
  placeHeist(); spawnRoundGuards();
  banner('ROUND '+S.round+' — hotter heat, bigger score','#ffcf3a'); if(Audio.kit) Audio.kit();
  S.roundChanging=false;
}

let last=performance.now();
export function loop(now){ requestAnimationFrame(loop); let dt=(now-last)/1000; last=now; if(dt>0.05) dt=0.05; S.t+=dt;
  if(S.car&&S.car.mesh.userData.beacon) S.car.mesh.userData.beacon.material.color.setHSL(0.1,1,0.5+0.25*Math.sin(S.t*4));
  if(S.diamond){ S.diamond.mesh.rotation.y+=dt*1.6; S.diamond.mesh.position.y=2.2+Math.sin(S.t*2)*0.25; }
  for(const k of S.pickups){ if(!k.active){ k.t-=dt; if(k.t<=0){ k.active=true; k.mesh.visible=true; } } else k.mesh.rotation.y+=dt*2; }
  if(S.mode==='play'){
    S.elapsed+=dt; S.points+=CFG.pointsPerSec*dt; if(S.fight.cd>0) S.fight.cd-=dt; if(S.comboT>0){ S.comboT-=dt; if(S.comboT<=0) S.combo=0; }
    if(S.bot) botThink(dt);
    if(S.fight.active) updateFight(dt); else if(S.driving) updateCar(dt); else updatePlayer(dt);
    updateHeist(dt); updateAlarm(dt);
    if(!S.bossDefeated){ const boss=S.police.find(c=>c.role==='boss');
      if(boss && !boss.warned && Math.hypot(S.player.x-boss.x,S.player.z-boss.z)<55){
        boss.warned=true; banner('★ THE CAPTAIN GUARDS THE ESCAPE — gun him down or take him down','#ffd24a'); } }
    updateWeapons(dt);
    updatePolice(dt); if(!S.fight.active) recomputeGPS(false);
    let nd=1e9; const a=actor(); for(const pol of S.police){ if(pol.state==='down')continue; nd=Math.min(nd,dist(a,pol)); }
    Audio.intensity(S.fight.active?1:Math.max(0,Math.min(1,1-(nd-4)/26)));
    updateHud(); updateBanner(dt); drawMap();
  }
  updateCamera(dt); renderer.render(scene,camera); }
