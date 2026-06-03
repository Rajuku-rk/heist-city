// Tunable constants + small math helpers. Edit values here to balance the game.
export const CFG = {
  GN:7, unit:22, road:8,
  player:{ walk:7.8, sprint:12.5, accel:18, jump:9.5, radius:0.7, maxHp:100, maxStam:100, stamDrain:25, stamRegen:16 },
  car:{ topSpeed:22, accel:10, turn:2.8, radius:1.7 },
  police:{ walk:6.8, run:9.6, accel:9, radius:0.7, maxHp:100, sight:30, alert:60, lose:4.0, engage:2.9, repath:0.7 },
  fight:{ copHp:100, punchDmg:10, punchCd:0.30, kickDmg:20, kickCd:0.68, copDmg:9,
          copInterval:1.25, copWindup:0.45, blockMul:0.16, maxAttackers:3, keep:13, cooldown:1.8 },
  boss:{ hp:260, dmg:16, interval:1.0, windup:0.4, blockMul:0.32, scale:1.4 },
  // GUNPLAY
  guns:[
    { name:'PISTOL',  dmg:24, fireCd:0.28, mag:14, reload:1.0, range:46, cone:0.16, pellets:1, auto:false },
    { name:'RIFLE',   dmg:15, fireCd:0.11, mag:30, reload:1.4, range:50, cone:0.30, pellets:1, auto:true  },
    { name:'SHOTGUN', dmg:9,  fireCd:0.7,  mag:6,  reload:1.8, range:24, cone:0.55, pellets:6, auto:false }
  ],

  scenes:[
    { name:'NIGHT',   fog:0x070b15, amb:0x2a3344, ambI:0.7,  hemiSky:0x35425c, hemiI:0.5,  sun:0x9fb6e0, sunI:0.75, sky:['#0a1430','#0a0f1e','#05070d'], stars:true,  disc:0xeef2ff },
    { name:'EVENING', fog:0x3a2236, amb:0x4a3848, ambI:0.9,  hemiSky:0x6a4a58, hemiI:0.6,  sun:0xffb070, sunI:1.05, sky:['#ff9a5b','#a05a6e','#2a1830'], stars:false, disc:0xffd9a0 },
    { name:'DAY',     fog:0x9fc6e8, amb:0x8aa0b8, ambI:1.05, hemiSky:0x9fc6e8, hemiI:0.75, sun:0xfff4e0, sunI:1.35, sky:['#79bdff','#bfe2ff','#eaf5ff'], stars:false, disc:0xffffff }
  ],

  heist:{ crackTime:5, lootPoints:600, names:['THE VAULT','THE JEWELRY STORE','THE ART GALLERY','THE CASINO CAGE','THE CENTRAL BANK'] },
  alarm:{ firstDelay:2.5, interval:6, perWave:2, maxActive:18, spawnDist:30, maxHeat:5, heatEvery:2 },
  copTypes:{
    heavy:  { tint:0xff7a1a, hp:280, gunDmg:11, gunRange:30, gunCdBase:1.5, fromRound:2 },
    sniper: { tint:0xa770ff, hp:55,  gunDmg:26, gunRange:78, gunCdBase:2.4, fromRound:3 }
  },
  round:{ healOnClear:30 },
  copGun:{ dmg:6, fireCd:1.0, range:42, minRange:5, hitChance:0.5 },        // cops' pistols
  pickup:{ heal:35, respawn:18 }, ammoPickup:{ amount:30, respawn:16 }, hideRegen:16,
  gravity:26, pointsPerSec:8, pointsWin:2500
};
export const HALF = CFG.GN*CFG.unit/2;
export const nodeX = i => -HALF + i*CFG.unit;
export const nodeZ = j => -HALF + j*CFG.unit;
export const dist = (a,b) => Math.hypot(a.x-b.x, a.z-b.z);
