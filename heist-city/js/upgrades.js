// Persistent credits + upgrade shop. Spends banked credits on damage/ammo/health.
import { CFG } from './config.js';
import { S } from './state.js';

const BASE = { hp: CFG.player.maxHp, dmg: CFG.guns.map(g=>g.dmg), mag: CFG.guns.map(g=>g.mag) };
const DEFS = [
  { key:'dmg',  name:'Weapon Damage', desc:'+15% damage per level', base:400 },
  { key:'ammo', name:'Magazine Size', desc:'+5 rounds per level',   base:350 },
  { key:'hp',   name:'Max Health',    desc:'+20 HP per level',       base:450 }
];
const MAX = 5;
const el = id => document.getElementById(id);

export function loadUpgrades(){
  try{ S.credits = parseInt(localStorage.getItem('heist_credits')||'0',10)||0;
       S.upgrades = JSON.parse(localStorage.getItem('heist_upgrades')||'{}'); }catch(e){ S.upgrades={}; }
  S.upgrades = Object.assign({dmg:0,ammo:0,hp:0}, S.upgrades||{});
}
function save(){ try{ localStorage.setItem('heist_credits',String(S.credits)); localStorage.setItem('heist_upgrades',JSON.stringify(S.upgrades)); }catch(e){} }

export function applyUpgrades(){
  CFG.player.maxHp = BASE.hp + S.upgrades.hp*20;
  CFG.guns.forEach((g,i)=>{ g.dmg = Math.round(BASE.dmg[i]*(1+S.upgrades.dmg*0.15)); g.mag = BASE.mag[i] + S.upgrades.ammo*5; });
}
export function addCredits(n){ S.credits += Math.max(0,Math.floor(n)); save(); }
function cost(def){ return def.base*(S.upgrades[def.key]+1); }

function buy(key){ const def=DEFS.find(d=>d.key===key); if(!def) return; const lvl=S.upgrades[key];
  if(lvl>=MAX) return; const c=cost(def); if(S.credits<c) return; S.credits-=c; S.upgrades[key]=lvl+1; applyUpgrades(); save(); render(); }

function render(){ el('shopCredits').textContent = S.credits.toLocaleString();
  el('shopList').innerHTML = DEFS.map(d=>{ const lvl=S.upgrades[d.key], maxed=lvl>=MAX, c=cost(d);
    const dots=Array.from({length:MAX},(_,i)=>'<span class="dot '+(i<lvl?'on':'')+'"></span>').join('');
    return '<div class="up-row"><div class="up-info"><div class="up-name">'+d.name+'</div><div class="up-desc">'+d.desc+'</div><div class="up-dots">'+dots+'</div></div>'+
      '<button class="up-buy" data-k="'+d.key+'" '+(maxed?'disabled':'')+'>'+(maxed?'MAX':('$'+c.toLocaleString()))+'</button></div>'; }).join('');
  el('shopList').querySelectorAll('.up-buy').forEach(b=>b.onclick=()=>buy(b.dataset.k)); }

export function openShop(){ render(); el('startScreen').classList.add('hidden'); el('endScreen').classList.add('hidden'); el('shopScreen').classList.remove('hidden'); }
export function closeShop(){ el('shopScreen').classList.add('hidden'); el('startScreen').classList.remove('hidden'); }

export function initShop(){ loadUpgrades(); applyUpgrades();
  ['shopBtn','shopBtn2'].forEach(id=>{ const b=el(id); if(b) b.onclick=openShop; });
  const back=el('shopBack'); if(back) back.onclick=closeShop; }