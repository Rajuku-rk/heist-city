// Lock-in melee combat: multiple cops gang up; the Captain is a boss with big HP.
import { CFG, dist } from './config.js';
import { S } from './state.js';
import { Audio } from './audio.js';
import { banner, flash, el, popup } from './ui.js';
import { blocking, relabelButtons } from './input.js';
import { endGame } from './game.js';
import { playAction, updateFightAnim, playDeath } from './models.js';

export function enterFight(){ if(S.fight.active) return; S.fight.active=true; S.player.vx=S.player.vz=0; S.player.fAtk=0;
  el('fightUI').classList.remove('hidden'); relabelButtons(); Audio.play('fight'); banner('⚔ THEY GOT YOU','#ff3b4e'); }
export function endFight(){ S.fight.active=false; S.fight.target=null; el('fightUI').classList.add('hidden'); relabelButtons(); Audio.play('run'); S.fight.cd=CFG.fight.cooldown; banner('BREAK FREE — RUN!','#28e0c8'); }
function addCombo(){ S.combo++; S.comboT=1.6; S.points+=10*S.combo; }
export function downCop(c){ c.hp=0; c.state='down'; c.downT=(c.role==='boss')?1e9:6; c.mesh.rotation.z=0; c.mesh.scale.setScalar(c.role==='boss'?CFG.boss.scale:1); playDeath(c);
  const pts=(c.role==='boss')?1500:300; S.points+=pts; popup((c.role==='boss'?'CAPTAIN DOWN +':'KO! +')+pts,'#ffd24a');
  if(c.role==='boss'){ S.bossDefeated=true; banner('★ CAPTAIN DOWN — GRAB THE DIAMOND','#28e0c8'); } }

export function fightPunch(){ if(!S.fight.active) return; const p=S.player,c=S.fight.target; if(!c||p.fAtk>0||blocking()) return;
    p.fAtk=CFG.fight.punchCd; p.fType='punch'; playAction(p,'punch'); c.hp-=CFG.fight.punchDmg*(1+S.combo*0.05); addCombo(); Audio.punch(); flash(.14,'#28e0c8'); S.shake=Math.max(S.shake,.18); if(c.hp<=0) downCop(c); }
export function fightKick(){ if(!S.fight.active) return; const p=S.player,c=S.fight.target; if(!c||p.fAtk>0||blocking()) return;
   p.fAtk=CFG.fight.kickCd; p.fType='kick'; playAction(p,'cross'); c.hp-=CFG.fight.kickDmg*(1+S.combo*0.05); addCombo();;
  const a=Math.atan2(c.x-p.x,c.z-p.z); c.x+=Math.sin(a)*1.5; c.z+=Math.cos(a)*1.5; c.windup=0; c.fTimer=Math.max(c.fTimer,0.9);
  Audio.hitHeavy(); flash(.22,'#28e0c8'); S.shake=Math.max(S.shake,.6); if(c.hp<=0) downCop(c); }

export function updateFight(dt){
  const p=S.player;
  const near=S.police.filter(c=>c.state!=='down' && dist(p,c)<CFG.fight.keep);
  if(near.length===0){ endFight(); return; }
  // boss first, then nearest
  near.sort((a,b)=>{ if(a.role==='boss') return -1; if(b.role==='boss') return 1; return dist(p,a)-dist(p,b); });
  for(const c of S.police){ if(c.state==='fight' && near.indexOf(c)<0) c.state='chase'; }
  const ring=Math.min(CFG.fight.maxAttackers, near.length);
  const target=near[0]; S.fight.target=target;
  p.facing=Math.atan2(target.x-p.x,target.z-p.z); p.mesh.rotation.y=p.facing; const base=p.facing;
  if(p.fAtk>0) p.fAtk-=dt;
  updateFightAnim(p,dt);

  for(let k=0;k<near.length;k++){ const c=near[k]; c.state='fight';
    const sc=c.role==='boss'?CFG.boss.scale:1; c.mesh.scale.x+=(sc-c.mesh.scale.x)*Math.min(1,10*dt); c.mesh.scale.y+=(sc-c.mesh.scale.y)*Math.min(1,10*dt); c.mesh.scale.z+=(sc-c.mesh.scale.z)*Math.min(1,10*dt);
    if(k<ring){ // attackers: slotted around the player
      const ang=base+(k-(ring-1)/2)*0.7; const sx=p.x+Math.sin(ang)*2.4, sz=p.z+Math.cos(ang)*2.4;
      c.x+=(sx-c.x)*Math.min(1,7*dt); c.z+=(sz-c.z)*Math.min(1,7*dt);
      c.facing=Math.atan2(p.x-c.x,p.z-c.z); c.mesh.rotation.y=c.facing;
      const boss=c.role==='boss'; const dmg0=boss?CFG.boss.dmg:CFG.fight.copDmg, bm=boss?CFG.boss.blockMul:CFG.fight.blockMul, wu=boss?CFG.boss.windup:CFG.fight.copWindup, iv=boss?CFG.boss.interval:CFG.fight.copInterval;
      c.fTimer-=dt;
      if(c.windup>0){ c.windup-=dt;
        if(c.windup<=0){ const dmg=blocking()?dmg0*bm:dmg0; p.hp-=dmg;
          if(blocking()){ Audio.block(); flash(.14,'#ffb22e'); } else { Audio.hitHeavy(); flash(boss?.5:.36,'#ff3b4e'); S.shake=Math.max(S.shake,boss?.8:.5); }
          if(p.hp<=0){ p.hp=0; S.fight.active=false; el('fightUI').classList.add('hidden'); endGame(false); return; } } }
      else { if(c.fTimer<=0){ c.windup=wu; c.fTimer=iv+Math.random()*0.5; playAction(c,'punch',wu+0.25); } }
    } else { // backup crowding in, not yet attacking
      const dx=p.x-c.x,dz=p.z-c.z,d=Math.hypot(dx,dz)||1; if(d>3){ c.x+=dx/d*CFG.police.run*0.6*dt; c.z+=dz/d*CFG.police.run*0.6*dt; }
      c.facing=Math.atan2(dx,dz); c.mesh.rotation.y=c.facing;
    }
    updateFightAnim(c,dt);
    c.mesh.position.set(c.x,0,c.z);
  }
  el('copHp').firstElementChild.style.transform=`scaleX(${Math.max(0,target.hp/(target.maxHp||CFG.fight.copHp))})`;
  el('copName').textContent=(target.role==='boss'?'★ CAPTAIN — ':'⚔ ')+near.length+' on you — drop them to break free';
  p.mesh.position.set(p.x,0,p.z);
}
