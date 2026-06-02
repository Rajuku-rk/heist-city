// Procedural sound: separate looping tracks for running vs fighting, plus one-shot SFX.
export const Audio = (function(){
  let ctx, master, music, timer, step=0, mode=null;
  function init(){ if(ctx) return; ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain(); master.gain.value=0.5; master.connect(ctx.destination);
    music=ctx.createGain(); music.gain.value=0.2; music.connect(master); }
  function blip(f,d,t,g,dest){ const o=ctx.createOscillator(),gn=ctx.createGain(); o.type=t||'square'; o.frequency.value=f;
    gn.gain.setValueAtTime(0,ctx.currentTime); gn.gain.linearRampToValueAtTime(g||.3,ctx.currentTime+.01);
    gn.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+(d||.15)); o.connect(gn); gn.connect(dest||master); o.start(); o.stop(ctx.currentTime+(d||.15)); }
  function kick(){ const o=ctx.createOscillator(),g=ctx.createGain(); o.frequency.setValueAtTime(120,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40,ctx.currentTime+.12); g.gain.setValueAtTime(.5,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.18); o.connect(g); g.connect(music); o.start(); o.stop(ctx.currentTime+.2); }
  function runTick(){ const bass=[55,55,73.4,55,65.4,55,82.4,73.4]; const f=bass[step%bass.length];
    blip(f,.22,'sawtooth',.45,music); if(step%2===0) blip(f*4,.12,'square',.15,music); kick(); step++; }
  function fightTick(){ const riff=[98,98,116.5,130.8,98,116.5,87.3,98]; const f=riff[step%riff.length];
    blip(f,.16,'sawtooth',.5,music); blip(f*2,.1,'square',.2,music); if(step%2===0) kick(); if(step%4===2) blip(1200,.04,'square',.12,music); step++; }
  function schedule(){ clearInterval(timer); if(mode==='run') timer=setInterval(runTick,230); else if(mode==='fight') timer=setInterval(fightTick,150); }
  return {
    ensure(){ init(); if(ctx.state==='suspended') ctx.resume(); },
    play(m){ this.ensure(); if(mode===m) return; mode=m; step=0; schedule(); },
    stop(){ mode=null; clearInterval(timer); },
    intensity(x){ if(music) music.gain.value=.13+.18*x; },
    foot(){ if(ctx) blip(180+Math.random()*40,.05,'triangle',.1); },
    engine(){ if(ctx) blip(70,.1,'sawtooth',.12); },
    punch(){ if(ctx) blip(170,.08,'square',.32); },
    hitHeavy(){ if(ctx){ blip(110,.18,'square',.5); blip(55,.22,'sawtooth',.4); } },
    block(){ if(ctx) blip(320,.06,'triangle',.28); },
    shot(){ if(!ctx) return;
      if(!ctx._noise){ const b=ctx.createBuffer(1,ctx.sampleRate*0.2,ctx.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; ctx._noise=b; }
      const s=ctx.createBufferSource(); s.buffer=ctx._noise; const g=ctx.createGain(); const f=ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=850;
      g.gain.setValueAtTime(.55,ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.09); s.connect(f); f.connect(g); g.connect(master); s.start(); s.stop(ctx.currentTime+.1);
      const o=ctx.createOscillator(),og=ctx.createGain(); o.frequency.setValueAtTime(190,ctx.currentTime); o.frequency.exponentialRampToValueAtTime(48,ctx.currentTime+.08);
      og.gain.setValueAtTime(.45,ctx.currentTime); og.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.1); o.connect(og); og.connect(master); o.start(); o.stop(ctx.currentTime+.11); },
    hitmark(){ if(ctx) blip(1500,.03,'square',.18); },
    reload(){ if(ctx)[420,640].forEach((f,i)=>setTimeout(()=>blip(f,.05,'square',.18),i*130)); },
    kit(){ if(ctx)[660,880].forEach((f,i)=>setTimeout(()=>blip(f,.12,'triangle',.25),i*80)); },
    alert(){ if(ctx)[880,660].forEach((f,i)=>setTimeout(()=>blip(f,.15,'square',.25),i*150)); },
    win(){ if(ctx)[523,659,784,1046].forEach((f,i)=>setTimeout(()=>blip(f,.3,'triangle',.3),i*120)); },
    lose(){ if(ctx)[330,294,233,165].forEach((f,i)=>setTimeout(()=>blip(f,.4,'sawtooth',.3),i*150)); }
  };
})();
