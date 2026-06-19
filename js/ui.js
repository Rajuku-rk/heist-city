// HUD, banner, screen flash, and the GPS minimap.
import { CFG, HALF, nodeX, nodeZ, dist } from './config.js';
import { S, actor } from './state.js';

export const el = id => document.getElementById(id);
const mini = el('mini'), mctx = mini.getContext('2d');
let bannerT = 0;

export function banner(text,color){ const b=el('banner'); b.textContent=text; b.style.color=color||'#fff'; b.style.opacity=1; b.style.transform='translate(-50%,-50%) scale(1.12)'; bannerT=1.1; }
export function updateBanner(dt){ if(bannerT>0){ bannerT-=dt; if(bannerT<=0){ const b=el('banner'); b.style.opacity=0; b.style.transform='translate(-50%,-50%) scale(1)'; } } }
export function flash(a,c){ const f=el('flash'); f.style.background=c||'#ff3b4e'; f.style.opacity=a; setTimeout(()=>f.style.opacity=0,90); }
export function hitMark(kill){ const h=el('hitmarker'); h.className=kill?'kill':''; h.style.opacity='1'; clearTimeout(h._t); h._t=setTimeout(()=>{ h.style.opacity='0'; }, kill?260:120); }
export function popup(text,color){ const c=el('popups'); if(!c) return; const d=document.createElement('div'); d.className='pop'; d.textContent=text; if(color) d.style.color=color; d.style.left=(46+Math.random()*8)+'%'; c.appendChild(d); requestAnimationFrame(()=>d.classList.add('go')); setTimeout(()=>d.remove(),950); }

export function updateHud(){ const p=S.player;
  el('thiefHp').firstElementChild.style.transform=`scaleX(${Math.max(0,p.hp/CFG.player.maxHp)})`;
  el('stam').firstElementChild.style.transform=`scaleX(${Math.max(0,p.stam/CFG.player.maxStam)})`;
  el('points').childNodes[0].nodeValue=Math.floor(S.points).toLocaleString();
  { const rt=el('roundTag'); if(rt) rt.textContent='ROUND '+S.round; }
  const wEl=el('wanted'); if(wEl){ if(S.alarm){ wEl.style.opacity=1; wEl.textContent='WANTED '+'★'.repeat(S.heat)+'☆'.repeat(Math.max(0,CFG.alarm.maxHeat-S.heat)); } else wEl.style.opacity=0; }
  el('hidden').style.opacity=S.hidden?1:0;
  el('combo').style.opacity=S.combo>1?1:0; el('combo').textContent=S.combo>1?('COMBO ×'+S.combo):'';
  const gunMode = !S.fight.active && !S.driving;
  el('crosshair').style.opacity = gunMode?1:0;
  el('ammo').style.opacity = gunMode?1:0;
  el('ammo').innerHTML = S.gun.name+' · '+(S.reloading ? 'RELOADING…' : '<b>'+S.ammo+'</b>/'+S.gun.mag+(stKey()?(' · '+(S.stock[stKey()]||0)):'')+' <span>R · 1/2/3 swap</span>');
  const pr=el('prompt');
  if(S.fight.active) pr.style.opacity=0;
  else if(!S.driving && S.car && dist(S.player,S.car)<3.8){ pr.innerHTML='Press <b>E</b> to steal the car'; pr.style.opacity=1; }
  else if(S.driving){ pr.innerHTML='Press <b>E</b> to get out'; pr.style.opacity=1; }
  else pr.style.opacity=0;
  const h=S.heist;
  el('objective').innerHTML = S.fight.active ? 'Beat them down — you <b>can\'t escape</b> until they\'re out'
    : (S.hidden ? '<b>Hidden</b> — health recovering, cops losing your trail'
    : (h.looted ? 'Loot secured — <b>escape to the safe house!</b>'
    : (h.cracking ? 'Cracking <b>'+h.name+'</b>… stay on the spot'
                  : 'Rob <b>'+h.name+'</b> — reach the gold marker')));
  const hb=el('heistBar');
  if(hb){ if(h.cracking && !h.looted){ hb.style.opacity=1; hb.firstElementChild.style.transform='scaleX('+h.progress+')'; } else hb.style.opacity=0; } }

export function drawMap(){ const W=mini.width,H=mini.height,pad=12, wmin=-HALF-CFG.unit/2, wspan=(HALF+CFG.unit/2)*2;
  const X=x=>pad+((x-wmin)/wspan)*(W-2*pad), Y=z=>pad+((z-wmin)/wspan)*(H-2*pad);
  mctx.clearRect(0,0,W,H); mctx.fillStyle='#0a0e14'; mctx.fillRect(0,0,W,H);
  mctx.strokeStyle='#222b36'; mctx.lineWidth=5; for(let i=0;i<=CFG.GN;i++){ mctx.beginPath(); mctx.moveTo(X(nodeX(i)),Y(-HALF)); mctx.lineTo(X(nodeX(i)),Y(HALF)); mctx.stroke(); mctx.beginPath(); mctx.moveTo(X(-HALF),Y(nodeZ(i))); mctx.lineTo(X(HALF),Y(nodeZ(i))); mctx.stroke(); }
  mctx.fillStyle='#161c26'; for(const b of S.buildings) mctx.fillRect(X(b.cx-b.hw),Y(b.cz-b.hd),(b.hw*2/wspan)*(W-2*pad),(b.hd*2/wspan)*(H-2*pad));
  mctx.fillStyle='#16361f'; for(const pk of S.parks) mctx.fillRect(X(pk.cx-8),Y(pk.cz-8),(16/wspan)*(W-2*pad),(16/wspan)*(H-2*pad));
  for(const h of S.hideouts){ mctx.fillStyle='rgba(93,217,93,.5)'; mctx.beginPath(); mctx.arc(X(h.x),Y(h.z),6,0,7); mctx.fill(); }
  for(const k of S.pickups){ if(!k.active) continue; mctx.fillStyle=(k.type==='ammo')?'#ffd060':'#37c837'; mctx.fillRect(X(k.x)-3,Y(k.z)-3,6,6); }
  if(S.route.length>1){ mctx.strokeStyle='#ffb22e'; mctx.lineWidth=4; mctx.lineJoin='round'; mctx.beginPath(); mctx.moveTo(X(S.route[0].x),Y(S.route[0].z)); for(let i=1;i<S.route.length;i++) mctx.lineTo(X(S.route[i].x),Y(S.route[i].z)); mctx.stroke(); }
  if(S.heist&&S.heist.zone&&!S.heist.looted){ mctx.fillStyle='#ffcf3a'; mctx.beginPath(); mctx.arc(X(S.heist.zone.x),Y(S.heist.zone.z),6,0,7); mctx.fill(); }
  if(S.diamond){ mctx.fillStyle='#bff7ff'; mctx.save(); mctx.translate(X(S.diamond.x),Y(S.diamond.z)); mctx.rotate(Math.PI/4); mctx.fillRect(-5,-5,10,10); mctx.restore(); }
  if(S.car){ mctx.fillStyle='#d23a2a'; mctx.fillRect(X(S.car.x)-4,Y(S.car.z)-4,8,8); }
  for(const pol of S.police){ if(pol.state==='down')continue; mctx.fillStyle=pol.role==='boss'?'#ffd24a':'#ff3b4e'; mctx.beginPath(); mctx.arc(X(pol.x),Y(pol.z),pol.role==='boss'?6:4.5,0,7); mctx.fill(); }
  const a=actor(); mctx.save(); mctx.translate(X(a.x),Y(a.z)); mctx.rotate(Math.PI-(a.facing||0)); mctx.fillStyle=S.hidden?'#5dd95d':'#fff'; mctx.beginPath(); mctx.moveTo(0,-9); mctx.lineTo(6,7); mctx.lineTo(0,3); mctx.lineTo(-6,7); mctx.closePath(); mctx.fill(); mctx.restore(); }

function stKey(){ return S.gun && (S.gun.name==='RIFLE'?'rifle':(S.gun.name==='SHOTGUN'?'shotgun':null)); }
