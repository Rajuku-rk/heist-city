// Renderer, scene, camera, lights, and the (re-themeable) sky. THREE is a global (loaded in index.html).
import { CFG, HALF } from './config.js';

export const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x070b15, 60, 210);

export const camera = new THREE.PerspectiveCamera(62, innerWidth/innerHeight, 0.1, 800);

const ambient = new THREE.AmbientLight(0x2a3344, 0.7); scene.add(ambient);
const hemi = new THREE.HemisphereLight(0x35425c, 0x0a0d12, 0.5); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9fb6e0, 0.75);
moon.position.set(60,110,40); moon.castShadow = true; moon.shadow.mapSize.set(2048,2048);
moon.shadow.camera.left=-HALF-30; moon.shadow.camera.right=HALF+30;
moon.shadow.camera.top=HALF+30; moon.shadow.camera.bottom=-HALF-30; moon.shadow.camera.far=320;
scene.add(moon);

export const world = new THREE.Group(); scene.add(world);

const _cv=document.createElement('canvas'); _cv.width=16; _cv.height=256; const _cx=_cv.getContext('2d');
const _tex=new THREE.CanvasTexture(_cv);
const _dome=new THREE.Mesh(new THREE.SphereGeometry(400,24,16), new THREE.MeshBasicMaterial({ map:_tex, side:THREE.BackSide, fog:false })); scene.add(_dome);
const _starGeo=new THREE.BufferGeometry();
{ const N=500, pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){ const r=380, th=Math.random()*Math.PI*2, ph=Math.acos(Math.random()*0.6+0.2);
    pos[i*3]=r*Math.sin(ph)*Math.cos(th); pos[i*3+1]=r*Math.cos(ph); pos[i*3+2]=r*Math.sin(ph)*Math.sin(th); }
  _starGeo.setAttribute('position', new THREE.BufferAttribute(pos,3)); }
const _stars=new THREE.Points(_starGeo, new THREE.PointsMaterial({ color:0x9fb6e0, size:1.6, fog:false })); scene.add(_stars);
const _disc=new THREE.Mesh(new THREE.SphereGeometry(14,20,20), new THREE.MeshBasicMaterial({ color:0xeef2ff, fog:false })); _disc.position.set(120,160,-160); scene.add(_disc);

export function applyScene(s){
  scene.fog.color.set(s.fog);
  ambient.color.set(s.amb); ambient.intensity=s.ambI;
  hemi.color.set(s.hemiSky); hemi.intensity=s.hemiI;
  moon.color.set(s.sun); moon.intensity=s.sunI;
  const g=_cx.createLinearGradient(0,0,0,256); g.addColorStop(0,s.sky[0]); g.addColorStop(0.55,s.sky[1]); g.addColorStop(1,s.sky[2]);
  _cx.fillStyle=g; _cx.fillRect(0,0,16,256); _tex.needsUpdate=true;
  _stars.visible=!!s.stars; _disc.material.color.set(s.disc||0xeef2ff);
}
applyScene(CFG.scenes[0]);

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});