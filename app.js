// ===== Ascendant v5.3 — Cinematic Timeline Edition =====
const $ = (s,d=document)=>d.querySelector(s);
const $$ = (s,d=document)=>[...d.querySelectorAll(s)];
$("#year").textContent = new Date().getFullYear();

// --- Audio engine (unlocked on first interaction) ---
let actx, gainMaster;
function unlockAudio(){
  if(actx) return;
  try{
    actx = new (window.AudioContext||window.webkitAudioContext)();
    gainMaster = actx.createGain();
    gainMaster.gain.value = 0.12; // overall volume
    gainMaster.connect(actx.destination);
    // tiny startup whoosh
    whoosh(0.06, 0.7);
  }catch(e){}
}
['pointerdown','mousemove','scroll','touchstart'].forEach(t=> window.addEventListener(t, unlockAudio, {once:true, passive:true}));

function whoosh(vol=0.06, dur=0.6){
  if(!actx) return;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(260, actx.currentTime);
  o.frequency.exponentialRampToValueAtTime(60, actx.currentTime+dur);
  g.gain.setValueAtTime(0.0001, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, actx.currentTime+0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime+dur);
  o.connect(g).connect(gainMaster);
  o.start(); o.stop(actx.currentTime+dur+0.02);
}

function swordSwoosh(){
  if(!actx) return;
  // layered noise + bandpass + pitch drop for sword feel
  const noise = actx.createBufferSource();
  const buffer = actx.createBuffer(1, actx.sampleRate*0.4, actx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<data.length;i++){ data[i] = (Math.random()*2-1) * Math.pow(1-i/data.length, 0.2); }
  noise.buffer = buffer;

  const bp = actx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 6;

  const g = actx.createGain();
  g.gain.value = 0.0001;
  const t = actx.currentTime;
  g.gain.exponentialRampToValueAtTime(0.18, t+0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t+0.35);

  noise.connect(bp).connect(g).connect(gainMaster);
  noise.start(); noise.stop(t+0.36);
}

// --- Background particles (cinematic but subtle) ---
(function background(){
  const c = $("#bg-canvas"); if(!c) return; const ctx = c.getContext("2d");
  let W,H,parts=[];
  function resize(){ W=c.width=innerWidth; H=c.height=innerHeight; parts = new Array(Math.min(90, Math.floor(W*H/22000))).fill(0).map(()=>({x:Math.random()*W,y:Math.random()*H,r:1+Math.random()*2.4,a:0.05+Math.random()*0.17,vx:(Math.random()-.5)*0.06,vy:(Math.random()-.5)*0.06})) }
  addEventListener("resize",resize); resize();
  let mx=-999,my=-999; addEventListener("mousemove",(e)=>{mx=e.clientX;my=e.clientY},{passive:true});
  (function tick(){
    ctx.clearRect(0,0,W,H);
    for(const p of parts){
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<-20)p.x=W+20; if(p.x>W+20)p.x=-20;
      if(p.y<-20)p.y=H+20; if(p.y>H+20)p.y=-20;
      const d = Math.hypot(p.x-mx,p.y-my); const glow = Math.max(0,1-d/240);
      ctx.beginPath(); ctx.fillStyle = `rgba(255,90,31,${0.05+p.a})`; ctx.arc(p.x,p.y,p.r*(1+glow*1.6),0,Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(tick);
  })();
})();

// --- Parallax hero micro-motion ---
(function parallaxHero(){
  const grp=$("#heroParallax"); if(!grp) return; let tx=0,ty=0,rx=0,ry=0;
  addEventListener('mousemove', (e)=>{ const x=(e.clientX/innerWidth-.5), y=(e.clientY/innerHeight-.5); rx=x*10; ry=y*8; tx=x*14; ty=y*12; }, {passive:true});
  (function frame(){ grp.style.transform=`translate3d(${tx}px,${ty}px,0) rotateX(${-ry}deg) rotateY(${rx}deg)`; requestAnimationFrame(frame); })();
})();

// --- Tilt for cards & buttons (shine follows cursor) ---
(function tiltables(){
  const els = $$('[data-tilt], .nav-link, .btn');
  els.forEach(el=>{
    let rx=0,ry=0,tx=0,ty=0;
    function on(e){ const r=el.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width-.5; const y=(e.clientY-r.top)/r.height-.5; rx=(-y*6); ry=(x*8); el.style.setProperty('--mx',(x*100+50)+'%'); el.style.setProperty('--my',(y*100+50)+'%'); const s=el.querySelector('.shine'); if(s){s.style.setProperty('--mx',(x*100+50)+'%'); s.style.setProperty('--my',(y*100+50)+'%')} }
    el.addEventListener('mousemove', on);
    el.addEventListener('mouseleave', ()=>{rx=0;ry=0;});
    (function loop(){ tx+=(rx-tx)*0.12; ty+=(ry-ty)*0.12; el.style.transform=`perspective(900px) rotateX(${tx}deg) rotateY(${ty}deg)`; requestAnimationFrame(loop); })();
  });
})();

// --- Skills telemetry (stronger proximity + charge sound) ---
(function skills(){
  const rings = $$('.ring'); if(!rings.length) return;
  const circ = 2*Math.PI*48;

  function chargeSound(){
    if(!actx) return;
    const o=actx.createOscillator(); const g=actx.createGain();
    o.type='triangle'; o.frequency.value=420;
    const t=actx.currentTime;
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(0.08,t+0.04);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.18);
    o.connect(g).connect(gainMaster); o.start(); o.stop(t+0.2);
  }

  const io = new IntersectionObserver(entries=>{
    entries.forEach(ent=>{
      if(!ent.isIntersecting) return;
      const ring = ent.target;
      const val = Number(ring.dataset.value||0);
      const prog = ring.querySelector('.progress');
      const num  = ring.querySelector('.num');
      let p=0;
      const id = setInterval(()=>{
        p+=2;
        if(p===2) chargeSound();
        const off=circ*(1-Math.min(p,val)/100);
        prog.style.strokeDashoffset = off;
        num.textContent = String(Math.min(p,val));
        if(p>=val){ clearInterval(id); ring.classList.add('glow'); setTimeout(()=> ring.classList.remove('glow'), 1000); }
      },16);
      io.unobserve(ring);
    });
  }, {threshold:.5});
  rings.forEach(r=> io.observe(r));

  // stronger proximity glow + cursor sync
  addEventListener('mousemove', (e)=>{
    rings.forEach(r=>{
      const rect=r.getBoundingClientRect();
      const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
      const d=Math.hypot(e.clientX-cx, e.clientY-cy);
      r.classList.toggle('glow', d<260);
      r.style.setProperty('--mx', ( (e.clientX-rect.left)/rect.width*100 )+'%');
      r.style.setProperty('--my', ( (e.clientY-rect.top)/rect.height*100 )+'%');
      if(d<180) chargeSound();
    });
  }, {passive:true});
})();

// --- Timeline: diagonal beam, orbs with particle bursts & sword swoosh on enter ---
(function timeline(){
  const sec = $("#timeline"); if(!sec) return;
  let entered=false;
  const io = new IntersectionObserver(entries=>{
    entries.forEach(ent=>{
      if(ent.isIntersecting && !entered){
        entered=true;
        swordSwoosh();
        const beam = sec.querySelector('.beam'); beam.style.boxShadow = '0 0 60px #ff5a1f99, 0 0 20px #ff5a1f';
      }
    });
  }, {threshold:.3});
  io.observe(sec);

  // orb hover = expand + particles (canvas burst)
  const orbs = $$('.orb', sec);
  orbs.forEach(orb=>{
    orb.addEventListener('mouseenter', ()=>{
      orb.classList.add('hot');
      // small particle burst using DOM canvas
      const burst = document.createElement('canvas');
      burst.width = 160; burst.height = 160;
      burst.style.position='absolute'; burst.style.left='-66px'; burst.style.top='-66px';
      burst.style.pointerEvents='none'; burst.style.transform='rotate(12deg)';
      orb.appendChild(burst);
      const ctx = burst.getContext('2d');
      const ps = Array.from({length:16}, ()=>({x:80,y:80,a:1, r:1+Math.random()*2, vx:(Math.random()-0.5)*3, vy:(Math.random()-0.5)*3-1}));
      let t=0; (function tick(){
        ctx.clearRect(0,0,160,160);
        ps.forEach(p=>{
          p.x+=p.vx; p.y+=p.vy; p.vy+=0.03; p.a*=0.95;
          ctx.beginPath(); ctx.fillStyle=`rgba(255,120,40,${p.a})`; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
        });
        if(t++<28) requestAnimationFrame(tick); else burst.remove();
      })();
      whoosh(0.05,0.35);
    });
    orb.addEventListener('mouseleave', ()=> orb.classList.remove('hot'));
  });
})();

// ===== v5.4 Trajectory: sequential reveal + audio =====
const tl = document.querySelector('#trajectory .timeline3d');
const milestones = [...document.querySelectorAll('#trajectory .milestone')];

// Sounds (respect your existing SOUND_ON boolean if you have one)
let SOUND_ON = (localStorage.getItem('asc-sound') || 'on') === 'on';
const s_swoosh = new Audio('assets/sfx/sword-swoosh.mp3');
const s_ping   = new Audio('assets/sfx/orb-ping.mp3');
const s_hum5   = new Audio('assets/sfx/excite-hum-5s.mp3');
[s_swoosh, s_ping, s_hum5].forEach(a => { a.volume = SOUND_ON ? 0.45 : 0; a.preload = 'auto'; });

let humPlayed = false;

if (tl) {
  const io = new IntersectionObserver((ents)=>{
    ents.forEach(ent=>{
      if(!ent.isIntersecting) return;
      milestones.forEach((m,i)=> setTimeout(()=> m.classList.add('show'), i*350));
      // One-time swoosh + 5s excite hum when first entering
      if (SOUND_ON) {
        try { s_swoosh.currentTime = 0; s_swoosh.play(); } catch {}
        if (!humPlayed) { humPlayed = true; try { s_hum5.currentTime = 0; s_hum5.play(); } catch {} }
      }
      io.disconnect();
    });
  }, {threshold:.25});
  io.observe(tl);

  // Beam sweep cursor linkage (moves beam mask subtly)
  const beamCore = document.querySelector('.beam3d .beam-core');
  tl.addEventListener('mousemove', (e)=>{
    const r = tl.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    beamCore && beamCore.style.setProperty('--m', `${x}%`);
  });
}

// Orb hover ping + particles
milestones.forEach(m=>{
  const orb = m.querySelector('.orb');
  if(!orb) return;
  orb.addEventListener('mouseenter', ()=>{
    if(SOUND_ON){ try { s_ping.currentTime=0; s_ping.play(); } catch{} }
    // quick particle burst
    burst(orb, 12);
  });
});

// very light particle burst util
function burst(el, n=10){
  const box = el.getBoundingClientRect();
  for(let i=0;i<n;i++){
    const p = document.createElement('i');
    p.style.position='fixed'; p.style.left=(box.left+box.width/2)+'px'; p.style.top=(box.top+box.height/2)+'px';
    p.style.width=p.style.height='4px'; p.style.borderRadius='50%';
    p.style.background = i%2 ? '#10e6ff' : '#ff5a1f';
    p.style.pointerEvents='none'; p.style.zIndex=9999; p.style.opacity=.9;
    document.body.appendChild(p);
    const ang = Math.random()*Math.PI*2, sp = 2+Math.random()*5;
    const dx = Math.cos(ang)*sp, dy = Math.sin(ang)*sp;
    let t=0; const a = setInterval(()=>{
      t+=1; p.style.transform=`translate(${dx*t}px,${dy*t}px) scale(${1 - t/22})`;
      p.style.opacity = String(0.9 - t/24);
      if(t>22){ clearInterval(a); p.remove(); }
    }, 16);
  }
}

// Proximity glow for skill rings (rings must have class .skill-ring)
const rings = [...document.querySelectorAll('.skill-ring')];
window.addEventListener('mousemove', (e)=>{
  rings.forEach(r=>{
    const bb = r.getBoundingClientRect();
    const cx = bb.left + bb.width/2, cy = bb.top + bb.height/2;
    const d  = Math.hypot(e.clientX - cx, e.clientY - cy);
    let prox = 0;
    if (d < 180) prox = 1;
    if (d < 110) prox = 2; // “charged”
    r.dataset.prox = String(prox);
  });
});

const coin = document.querySelector('.logo-coin');
document.querySelectorAll('.topnav a').forEach(a=>{
  a.addEventListener('mouseenter', ()=>{
    if(!coin) return;
    coin.classList.remove('ripple');
    // force reflow then re-add for retrigger
    void coin.offsetWidth;
    coin.classList.add('ripple');
  });
});


// --- Mailto ---
window.sendMail = function(form){
  const name = encodeURIComponent(form.name.value.trim());
  const email = encodeURIComponent(form.email.value.trim());
  const msg = encodeURIComponent(form.message.value.trim());
  const subject = encodeURIComponent(`Portfolio inquiry from ${form.name.value.trim()}`);
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${msg}`);
  location.href = `mailto:danialsaed31@gmail.com?subject=${subject}&body=${body}`;
  return false;
};

// --- Startup flare on first interaction ---
(function startupFlare(){
  let done=false; function trigger(){ if(done) return; done=true; const f=$("#flare"); f.classList.add('show'); setTimeout(()=> f.classList.remove('show'), 900); }
  addEventListener('pointerdown', trigger, {once:true}); addEventListener('mousemove', trigger, {once:true, passive:true}); addEventListener('scroll', trigger, {once:true, passive:true});
})();