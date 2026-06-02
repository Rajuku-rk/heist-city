// Entry point: wires input, paints a menu backdrop, and starts the loop.
import { nodeX, nodeZ } from './config.js';
import { camera } from './engine.js';
import { buildCity, spawnAll } from './world.js';
import { setupInput } from './input.js';
import { loop } from './game.js';
import { initShop } from './upgrades.js';
import { loadModels } from './models.js';

loadModels().then(()=>{
  setupInput();
  initShop();
  buildCity(); spawnAll();
  camera.position.set(nodeX(0)-8,12,nodeZ(0)-16); camera.lookAt(0,1,0);
  requestAnimationFrame(loop);
}).catch(e=>console.error('models failed to load',e));
