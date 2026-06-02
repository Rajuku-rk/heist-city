// Self-playing demo: paths to the diamond, grabs health/hideouts when hurt, shoots cops, brawls when cornered.
import { CFG, dist } from './config.js';
import { S } from './state.js';
import { astar } from './nav.js';
import { fightPunch, fightKick } from './fight.js';
import { botAimToward } from './input.js';
import { segmentBlocked } from './weapons.js';

function nearest(list){ const p=S.player; let best=null,bd=1e9; for(const o of list){ if(o.active===false) continue; const d=dist(p,o); if(d<bd){bd=d;best=o;} } return {best,bd}; }
function nearestCop(){ const p=S.player; let best=null,bd=1e9; for(const c of S.police){ if(c.state==='down') continue; const d=dist(p,c); if(d<bd){bd=d;best=c;} } return {best,bd}; }

export function botThink(dt){ const p=S.player; S.botMove.x=0; S.botMove.y=0; S.botSprint=false; S.botJump=false; S.botBlock=false; S.firing=false;
  if(S.fight.active){ let danger=false; for(const c of S.police){ if(c.state==='fight' && c.windup>0.06) danger=true; }
    if(danger) S.botBlock=true; else { S.botAtk-=dt; if(S.botAtk<=0){ (Math.random()<0.4?fightKick:fightPunch)(); S.botAtk=0.28+Math.random()*0.18; } } return; }
  // shoot a cop that's in the open and in range
  const c=nearestCop();
  if(c.best && c.bd<S.gun.range && !segmentBlocked(p.x,p.z,c.best.x,c.best.z)){
    botAimToward(c.best.x-p.x,c.best.z-p.z); S.firing=true;
    if(c.bd<14){ const gx=p.x-(c.best.x-p.x), gz=p.z-(c.best.z-p.z); botAimToward(gx,gz); } // back off if too close
    return;
  }
  let goal=S.safe;
  if(p.hp<26){ const h=nearest(S.hideouts), k=nearest(S.pickups); goal=(k.bd<h.bd?k.best:h.best)||S.safe; }
  else if(p.hp<55){ const k=nearest(S.pickups); if(k.best&&k.bd<40) goal=k.best; }
  const path=astar(p.x,p.z,goal.x,goal.z); let aim=path.length?(path.length>1?path[1]:path[0]):goal; if(dist(p,goal)<16) aim=goal;
  botAimToward(aim.x-p.x,aim.z-p.z);
  S.botSprint = c.bd<20 && p.stam>12; }
