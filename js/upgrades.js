// Persistent credits + upgrade shop. Spends banked credits on damage/ammo/health.
import { CFG } from './config.js';
import { S } from './state.js';

const BASE = { hp: CFG.player.maxHp, dmg: CFG.guns.map(g=>g.dmg), mag: CFG.guns.map(g=>g.mag),
  walk: CFG.player.walk, sprint: CFG.player.sprint, crack: CFG.heist.crackTime };
const DEFS = [
  { key:'dmg',   name:'Weapon Damage', desc:'+15% damage per level',        base:400 },
  { key:'ammo',  name:'Magazine Size', desc:'+5 rounds per level',          base:350 },
  { key:'hp',    name:'Max Health',    desc:'+20 HP per level',             base:450 },
  { key:'spd',   name:'Move Speed',    desc:'+4% run & sprint per level',   base:500 },
  { key:'armor', name:'Body Armor',    desc:'-6% gun damage taken per level', base:550 },
  { key:'crack', name:'Fast Hands',    desc:'Crack heists 8% faster per level', base:380 },
  { key:'loot',  name:'Loot Bonus',    desc:'+10% credits earned per level',  base:600 }
];
const MAX = 5;
const el = id => document.getElementById(id);

export function loadUpgrades(){
  try{ S.credits = parseInt(localStorage.getItem('heist_credits')||'0',10)||0;
       S.upgrades = JSON.parse(localStorage.getItem('heist_upgrades')||'{}'); }catch(e){ S.upgrades={}; }
  S.upgrades = Object.assign({dmg:0,ammo:0,hp:0,spd:0,armor:0,crack:0,loot:0}, S.upgrades||{});
  try{ S.stock = Object.assign({rifle:120,shotgun:48}, JSON.parse(localStorage.getItem('heist_stock')||'{}')); }catch(e){}
}
function save(){ try{ localStorage.setItem('heist_credits',String(S.credits)); localStorage.setItem('heist_upgrades',JSON.stringify(S.upgrades)); localStorage.setItem('heist_stock',JSON.stringify(S.stock)); }catch(e){} }

export function applyUpgrades(){
  CFG.player.maxHp = BASE.hp + S.upgrades.hp*20;
  CFG.guns.forEach((g,i)=>{ g.dmg = Math.round(BASE.dmg[i]*(1+S.upgrades.dmg*0.15)); g.mag = BASE.mag[i] + S.upgrades.ammo*5; });
  CFG.player.walk   = BASE.walk  *(1+S.upgrades.spd*0.04);
  CFG.player.sprint = BASE.sprint*(1+S.upgrades.spd*0.04);
  CFG.heist.crackTime = BASE.crack*(1-S.upgrades.crack*0.08);
  S.armorMult = 1 - S.upgrades.armor*0.06;
  S.lootMult  = 1 + S.upgrades.loot*0.10;
}
export function addCredits(n){ S.credits += Math.max(0,Math.floor(n*(S.lootMult||1))); save(); }
function cost(def){ return def.base*(S.upgrades[def.key]+1); }

function buy(key){ const def=DEFS.find(d=>d.key===key); if(!def) return; const lvl=S.upgrades[key];
  if(lvl>=MAX) return; const c=cost(def); if(S.credits<c) return; S.credits-=c; S.upgrades[key]=lvl+1; applyUpgrades(); save(); render(); }

function render(){ el('shopCredits').textContent = S.credits.toLocaleString();
  el('shopList').innerHTML = DEFS.map(d=>{ const lvl=S.upgrades[d.key], maxed=lvl>=MAX, c=cost(d);
    const dots=Array.from({length:MAX},(_,i)=>'<span class="dot '+(i<lvl?'on':'')+'"></span>').join('');
    return '<div class="up-row"><div class="up-info"><div class="up-name">'+d.name+'</div><div class="up-desc">'+d.desc+'</div><div class="up-dots">'+dots+'</div></div>'+
      '<button class="up-buy" data-k="'+d.key+'" '+(maxed?'disabled':'')+'>'+(maxed?'MAX':('$'+c.toLocaleString()))+'</button></div>'; }).join('');
  el('shopList').querySelectorAll('.up-buy').forEach(b=>b.onclick=()=>buy(b.dataset.k));
  const PACKS=[{k:'rifle',name:'Rifle Ammo',amt:90,price:200},{k:'shotgun',name:'Shotgun Shells',amt:36,price:200}];
  el('shopList').innerHTML += PACKS.map(p=>'<div class="up-row"><div class="up-info"><div class="up-name">'+p.name+'</div>'+
    '<div class="up-desc">+'+p.amt+' rounds · you have <b style="color:#ffcf3a">'+(S.stock[p.k]||0)+'</b></div></div>'+
    '<button class="up-buy" data-a="'+p.k+'" '+(S.credits<p.price?'disabled':'')+'>$'+p.price+'</button></div>').join('');
  el('shopList').querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{ const p=PACKS.find(x=>x.k===b.dataset.a);
    if(S.credits<p.price) return; S.credits-=p.price; S.stock[p.k]=(S.stock[p.k]||0)+p.amt; save(); render(); }); }

export function openShop(){ render(); el('startScreen').classList.add('hidden'); el('endScreen').classList.add('hidden'); el('shopScreen').classList.remove('hidden'); }
export function closeShop(){ el('shopScreen').classList.add('hidden'); el('startScreen').classList.remove('hidden'); }

export const AD_REWARD=300, AD_COOLDOWN=60; let adReadyAt=0;
// Later: replace the body of showRewardedAd with a real ad-network call,
// and call grantAdReward() from its "ad completed" callback.
function grantAdReward(){ addCredits(AD_REWARD/( (S.lootMult||1) )); render(); }
function showRewardedAd(){
  const now=Date.now()/1000;
  if(now<adReadyAt){ const b=el('adBtn'); if(b){ b.textContent='AD READY IN '+Math.ceil(adReadyAt-now)+'s'; setTimeout(()=>{ b.textContent='▶ WATCH AD · +'+AD_REWARD+' CREDITS'; },1500); } return; }
  adReadyAt=now+AD_COOLDOWN;
  const ov=el('adOverlay'), cnt=el('adCount'); if(!ov) return; ov.classList.remove('hidden');
  let t=3; cnt.textContent=t;
  const iv=setInterval(()=>{ t--; cnt.textContent=t;
    if(t<=0){ clearInterval(iv); ov.classList.add('hidden'); grantAdReward(); } },1000);
}
export function initShop(){ loadUpgrades(); applyUpgrades();
  ['shopBtn','shopBtn2'].forEach(id=>{ const b=el(id); if(b) b.onclick=openShop; });
  const back=el('shopBack'); if(back) back.onclick=closeShop;
  const ad=el('adBtn'); if(ad) ad.onclick=showRewardedAd; }
