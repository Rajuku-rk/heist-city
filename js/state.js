// Single shared mutable game state. Every module reads/writes this object.
export const S = {
  mode:'menu', t:0, elapsed:0, points:0, combo:0, comboT:0, shake:0, camYaw:0,
  keys:{}, touchVec:{x:0,y:0}, touchJump:false, touchBlock:false,
  bot:false, botMove:{x:0,y:0}, botSprint:false, botJump:false, botBlock:false, botAtk:0,
  // weapons
  ammo:30, reloading:false, reloadT:0, fireCd:0, firing:false, shootReq:false, gunIndex:1, gun:null, tracers:[], muzzleT:0,
  credits:0, upgrades:{dmg:0,ammo:0,hp:0}, sceneIndex:0,
  heist:{looted:false,cracking:false,progress:0,zone:null,name:''},
  alarm:false, heat:0, waveTimer:0, waveCount:0, round:1, roundChanging:false,
  player:null, police:[], car:null, driving:false, hidden:false, bossDefeated:false,
  buildings:[], parks:[], hideouts:[], pickups:[], safe:null, diamond:null,
  route:[], lastStartKey:-1, fight:{active:false, target:null, cd:0}
};
export function actor(){ return S.driving ? S.car : S.player; }
