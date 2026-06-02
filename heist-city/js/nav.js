// Grid A* pathfinding + the GPS route that reroutes as the player moves.
import { CFG, HALF, nodeX, nodeZ } from './config.js';
import { S, actor } from './state.js';

export function nodeIndex(x,z){ let i=Math.round((x+HALF)/CFG.unit), j=Math.round((z+HALF)/CFG.unit);
  i=Math.max(0,Math.min(CFG.GN,i)); j=Math.max(0,Math.min(CFG.GN,j)); return {i,j}; }

export function astar(sx,sz,gx,gz){
  const s=nodeIndex(sx,sz), g=nodeIndex(gx,gz), sk=s.i*1000+s.j, gk=g.i*1000+g.j;
  if(sk===gk) return [{x:nodeX(g.i),z:nodeZ(g.j)}];
  const open=[sk],came={},gs={[sk]:0},f={[sk]:0},closed={}; const hf=(i,j)=>Math.abs(i-g.i)+Math.abs(j-g.j);
  while(open.length){ let bi=0; for(let k=1;k<open.length;k++) if(f[open[k]]<f[open[bi]]) bi=k;
    const cur=open.splice(bi,1)[0]; if(cur===gk) break; closed[cur]=1; const ci=Math.floor(cur/1000),cj=cur%1000;
    for(const [ni,nj] of [[ci+1,cj],[ci-1,cj],[ci,cj+1],[ci,cj-1]]){ if(ni<0||nj<0||ni>CFG.GN||nj>CFG.GN) continue; const nk=ni*1000+nj; if(closed[nk]) continue;
      const tg=gs[cur]+1; if(!(nk in gs)||tg<gs[nk]){ came[nk]=cur; gs[nk]=tg; f[nk]=tg+hf(ni,nj); if(open.indexOf(nk)<0) open.push(nk); } } }
  const path=[]; let c=gk; if(!(gk in came)&&gk!==sk) return [{x:gx,z:gz}];
  while(c!==undefined){ path.unshift({x:nodeX(Math.floor(c/1000)),z:nodeZ(c%1000)}); if(c===sk) break; c=came[c]; } return path;
}

export function recomputeGPS(force){ if(!S.safe) return; const a=actor(); const idx=nodeIndex(a.x,a.z), sk=idx.i*1000+idx.j;
  if(force||sk!==S.lastStartKey){ S.lastStartKey=sk; S.route=astar(a.x,a.z,S.safe.x,S.safe.z); S.route.push({x:S.safe.x,z:S.safe.z}); } }
