(function(){
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(prefersReduced) return;

  const canvas = document.getElementById('bgCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');

  const snippets = ["<3","❤","<love/>","const love = true;","if(love){ console.log('❤️') }","<3 // kindness","/* be kind */","<3<3","<3 4ever"];
  const fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace";

  let width = 0, height = 0;
  let columns = []; // each column has {x, y, speed, textIndex, size}
  let isMobile = false;
  let maxDpr = 1;
  const gradientCache = new Map();
  const hwCores = (navigator.hardwareConcurrency) ? Math.max(1, navigator.hardwareConcurrency) : 2;

  function resize(){
    const rawDpr = Math.max(1, window.devicePixelRatio || 1);
    isMobile = window.innerWidth <= 480;
    // limit DPR on mobile to reduce pixel work
    maxDpr = isMobile ? Math.min(rawDpr, 1.25) : rawDpr;
    width = canvas.width = Math.floor(window.innerWidth * maxDpr);
    height = canvas.height = Math.floor(window.innerHeight * maxDpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(maxDpr,0,0,maxDpr,0,0);

    // make mobile sizing more compact so the visual scale matches desktop
    const columnWidth = isMobile ? 18 : 28; // visual column width in px
    // reduce column count further on low-core devices
    const coreFactor = hwCores <= 2 ? 0.7 : 1;
    const rawCols = Math.max(6, Math.floor((window.innerWidth / columnWidth) * coreFactor));
    const cols = Math.min(rawCols, 80);
    columns = [];
    for(let i=0;i<cols;i++){
      const x = (i + 0.5) * (window.innerWidth / cols);
      columns.push({
        x,
        y: Math.random() * -height * 0.6,
        speed: (isMobile ? 0.35 + Math.random()*0.8 : 0.6 + Math.random()*1.6),
        textIndex: Math.floor(Math.random()*snippets.length),
        size: isMobile ? 10 + Math.floor(Math.random()*5) : 14 + Math.floor(Math.random()*12)
      });
    }
    // clear gradient cache because sizes changed
    gradientCache.clear();
  }

  function drawGradient(x,size){
    // cache gradients by rounded size to avoid recreating every draw
    const key = Math.round(size/2)*2;
    if(gradientCache.has(key)) return gradientCache.get(key);
    const g = ctx.createLinearGradient(0,0,0,size);
    g.addColorStop(0, '#ff9ad5');
    g.addColorStop(0.5, '#ff4fa3');
    g.addColorStop(1, '#a80057');
    gradientCache.set(key, g);
    return g;
  }

  let last = performance.now();
  let acc = 0;
  const frameInterval = 1000 / 30; // target ~30fps
  function frame(now){
    const delta = now - last;
    last = now;
    acc += delta;
    if(acc < frameInterval){
      raf = requestAnimationFrame(frame);
      return;
    }
    const step = Math.min(60, acc);
    acc = acc % frameInterval;

    // fade with slight overlay for trailing effect
    ctx.fillStyle = isMobile ? 'rgba(6,3,8,0.28)' : 'rgba(6,3,8,0.22)';
    ctx.fillRect(0,0,window.innerWidth, window.innerHeight);

    columns.forEach(col => {
      col.y += col.speed * (step * 0.06);
      if(col.y > window.innerHeight + 50) col.y = -30 - Math.random()*200;

      ctx.font = `${col.size}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // glow shadow scaled to size (disabled for perf)
      ctx.shadowColor = 'rgba(255,79,163,0.25)';
      ctx.shadowBlur = 0;

      // pink gradient fill (cached)
      ctx.fillStyle = drawGradient(col.x, col.size);

      const text = snippets[(col.textIndex + Math.floor(col.y/40)) % snippets.length];
      ctx.fillText(text, col.x, col.y);

      // tiny secondary char for layered look (skip on mobile)
      if(!isMobile){
        ctx.shadowBlur = 2;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillText('.', col.x + (col.size*0.6), col.y + (col.size*0.2));
      }
    });

    raf = requestAnimationFrame(frame);
  }

  let raf = null;
  window.addEventListener('resize', ()=>{ resize(); });
  window.addEventListener('visibilitychange', ()=>{
    if(document.hidden){ if(raf) { cancelAnimationFrame(raf); raf = null; } }
    else { if(!raf){ last = performance.now(); raf = requestAnimationFrame(frame); } }
  });
  resize();
  // initial dark fill for nice backdrop
  ctx.fillStyle = '#07030a';
  ctx.fillRect(0,0,window.innerWidth, window.innerHeight);

  raf = requestAnimationFrame(frame);

  // cleanup on unload
  window.addEventListener('pagehide', ()=>{ if(raf) cancelAnimationFrame(raf); raf = null; });
})();
