(function(){
var root=document.documentElement, body=document.body;
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var fine=matchMedia('(pointer: fine)').matches;
var $=function(s,c){return (c||document).querySelector(s)}, $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function smooth(a,b,v){var t=clamp((v-a)/(b-a),0,1); return t*t*(3-2*t)}
function css(n){return getComputedStyle(root).getPropertyValue(n).trim()}

/* ---------- theme ---------- */
var themeBtn=$('#themeBtn'), themeTxt=$('#themeTxt');
try{var saved=localStorage.getItem('cd-theme'); if(saved) root.setAttribute('data-theme',saved);}catch(e){}
function isDark(){var t=root.getAttribute('data-theme'); return t? t==='dark' : matchMedia('(prefers-color-scheme: dark)').matches;}
function syncThemeTxt(){themeTxt.textContent=isDark()?'Switch to light':'Switch to dark';}
syncThemeTxt();
themeBtn.addEventListener('click',function(){
  var n=isDark()?'light':'dark'; root.setAttribute('data-theme',n);
  try{localStorage.setItem('cd-theme',n);}catch(e){}
  syncThemeTxt(); if(gl) gl.theme();
});

/* ---------- menu ---------- */
var menuBtn=$('#menuBtn'), menu=$('#menu'), menuTxt=$('#menuTxt');
function setMenu(open){
  body.classList.toggle('menu-open',open);
  menuBtn.setAttribute('aria-expanded',open?'true':'false');
  menu.setAttribute('aria-hidden',open?'false':'true');
  menuTxt.textContent=open?'Close':'Menu';
}
menuBtn.addEventListener('click',function(){ setMenu(!body.classList.contains('menu-open')); });
document.addEventListener('keydown',function(e){ if(e.key==='Escape') setMenu(false); });

/* ---------- landing pages: one full screen at a time ---------- */
var track=$('#track'), pages=$$('.pg',track), dots=$$('#dots a');
var PAGE={}; pages.forEach(function(pg,i){ PAGE[pg.id]=i; });
var pi=-1, p=0, ps=0, lockUntil=0, lastWheel=0, lastGo=0;
function setPh(){ root.style.setProperty('--ph',innerHeight+'px'); }
setPh();
/* pages never scroll inside, so on a short screen a page's content shrinks until it fits */
function fitPages(){
  pages.forEach(function(pg){
    var w=pg.querySelector(':scope > .wrap'); if(!w) return;
    pg.classList.add('measure'); w.style.zoom='';
    var z=1;
    for(var k=0;k<3;k++){
      var over=Math.max(pg.scrollHeight-pg.clientHeight, w.scrollHeight-w.clientHeight);
      if(over<=1) break;
      z=Math.max(0.6, z*(pg.clientHeight-over)/pg.clientHeight); w.style.zoom=z.toFixed(3);
    }
    pg.classList.remove('measure');
  });
}
function markLinks(id){
  $$('[data-link]').forEach(function(a){ if(a.dataset.link===id) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
}
function setPage(i,instant){
  i=clamp(i,0,pages.length-1);
  if(instant){ track.style.transition='none'; }
  track.style.setProperty('--pi',i);
  if(instant){ void track.offsetWidth; track.style.transition=''; }
  if(i===pi && !instant) return;
  pi=i; p=i;
  pages.forEach(function(pg,k){ pg.classList.toggle('on',k===i); pg.inert=k!==i; });
  dots.forEach(function(d,k){ d.classList.toggle('on',k===i); });
  var id=pages[i].id;
  here.textContent=pages[i].dataset.label;
  markLinks(id==='projects-more'?'projects':id);
  if(current==='home' && location.hash.slice(1)!==id) history.replaceState(null,'',id==='home'?location.pathname+location.search:'#'+id);
}
function goPage(d){ var now=performance.now(); if(pi+d<0||pi+d>=pages.length) return; setPage(pi+d); lockUntil=now+950; lastGo=now; }
function paging(){ return current==='home' && !busy && !body.classList.contains('menu-open'); }
/* a trackpad keeps sending wheel events after a flick, so one gesture moves one page */
addEventListener('wheel',function(e){
  if(current!=='home') return;
  e.preventDefault();
  if(!paging()) return;
  var now=performance.now(), quiet=now-lastWheel; lastWheel=now;
  if(Math.abs(e.deltaY)<4 || now<lockUntil) return;
  if(quiet<220 && now-lastGo<1500) return;
  goPage(e.deltaY>0?1:-1);
},{passive:false});
var ty=null;
addEventListener('touchstart',function(e){ ty=e.touches[0].clientY; },{passive:true});
addEventListener('touchmove',function(e){ if(current==='home') e.preventDefault(); },{passive:false});
addEventListener('touchend',function(e){
  if(ty===null||!paging()) return; var dy=ty-e.changedTouches[0].clientY; ty=null;
  if(Math.abs(dy)>45 && performance.now()>=lockUntil) goPage(dy>0?1:-1);
},{passive:true});
document.addEventListener('keydown',function(e){
  if(!paging()) return;
  var tag=(e.target.tagName||'').toLowerCase(), k=e.key;
  if(k==='ArrowDown'||k==='PageDown'||(k===' '&&tag!=='button'&&tag!=='a')){ e.preventDefault(); if(performance.now()>=lockUntil) goPage(1); }
  else if(k==='ArrowUp'||k==='PageUp'){ e.preventDefault(); if(performance.now()>=lockUntil) goPage(-1); }
  else if(k==='Home'){ e.preventDefault(); setPage(0); }
  else if(k==='End'){ e.preventDefault(); setPage(pages.length-1); }
});
$('#toTop').addEventListener('click',function(){ setPage(0); });

/* ---------- WebGL depth tunnel: the camera travels one stop forward per page ---------- */
var gl=null;
function initGL(){
  if(!window.THREE) return null;
  var canvas=$('#gl'), renderer;
  try{ renderer=new THREE.WebGLRenderer({canvas:canvas, antialias:true, alpha:true, powerPreference:'high-performance'}); }catch(e){ return null; }
  var mobile=innerWidth<760, SP=18, N=pages.length;
  var scene=new THREE.Scene();
  var cam=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,200);
  var zEnd=-(N-1)*SP-60;

  /* drifting particles filling a long tube around the camera path */
  var count=mobile?1600:3600, pos=new Float32Array(count*3), psz=new Float32Array(count), seed=new Float32Array(count);
  for(var i=0;i<count;i++){
    var a=Math.random()*Math.PI*2, r=2.2+Math.pow(Math.random(),0.6)*16;
    pos[i*3]=Math.cos(a)*r; pos[i*3+1]=Math.sin(a)*r*0.75; pos[i*3+2]=12-Math.random()*(12-zEnd);
    psz[i]=0.35+Math.pow(Math.random(),4)*1.6; seed[i]=Math.random();
  }
  var pg=new THREE.BufferGeometry();
  pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
  pg.setAttribute('aSize',new THREE.BufferAttribute(psz,1));
  pg.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));
  var uni={uT:{value:0},uPR:{value:1},uA:{value:new THREE.Color()},uB:{value:new THREE.Color()},uC:{value:new THREE.Color()},uAlpha:{value:1},uMouse:{value:new THREE.Vector2()}};
  var pmat=new THREE.ShaderMaterial({uniforms:uni, transparent:true, depthWrite:false,
    vertexShader:[
      'uniform float uT,uPR; uniform vec2 uMouse; attribute float aSize,aSeed; varying float vA,vS;',
      'void main(){',
      '  vec3 p=position;',
      '  p.x+=sin(uT*0.3+aSeed*40.0)*0.35; p.y+=cos(uT*0.25+aSeed*31.0)*0.35;',
      '  vec4 mv=modelViewMatrix*vec4(p,1.0); float d=-mv.z;',
      '  gl_PointSize=aSize*uPR*(120.0/max(d,0.5));',
      '  vA=smoothstep(70.0,14.0,d)*smoothstep(2.0,9.0,d)*(0.35+0.65*sin(uT*1.4+aSeed*6.283))*0.8;',
      '  vS=aSeed; gl_Position=projectionMatrix*mv;',
      '}'].join('\n'),
    fragmentShader:[
      'uniform vec3 uA,uB,uC; uniform float uAlpha; varying float vA,vS;',
      'void main(){ float r=length(gl_PointCoord-0.5); if(r>0.5) discard;',
      '  vec3 col=vS<0.45?uA:(vS<0.9?uB:uC);',
      '  gl_FragColor=vec4(col, smoothstep(0.5,0.05,r)*vA*uAlpha); }'].join('\n')
  });
  var pts=new THREE.Points(pg,pmat); pts.frustumCulled=false; scene.add(pts);

  /* one ring and one wireframe shape for every page, waiting further down the path */
  var shapes=[
    new THREE.IcosahedronGeometry(1.7,1), new THREE.TorusKnotGeometry(1.1,0.32,90,10), new THREE.OctahedronGeometry(1.8,0),
    new THREE.DodecahedronGeometry(1.6,0), new THREE.TorusGeometry(1.4,0.45,10,40), new THREE.IcosahedronGeometry(1.7,0),
    new THREE.TorusKnotGeometry(1.1,0.3,90,10,3,5), new THREE.OctahedronGeometry(1.8,1)];
  var rings=[], objs=[];
  for(var k=0;k<N;k++){
    var circ=[]; for(var s=0;s<=96;s++){ var an=s/96*Math.PI*2; circ.push(new THREE.Vector3(Math.cos(an)*8.5,Math.sin(an)*5.6,0)); }
    var ring=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circ), new THREE.LineBasicMaterial({transparent:true, depthWrite:false}));
    ring.position.set(0,0,-k*SP-SP*0.55); ring.userData.c=k%3; scene.add(ring); rings.push(ring);
    var side=k%2?-1:1, o=new THREE.LineSegments(new THREE.EdgesGeometry(shapes[k%shapes.length],1), new THREE.LineBasicMaterial({transparent:true, depthWrite:false}));
    o.position.set(mobile?4.5:10, (k%3-1)*2.2, -k*SP-7); o.userData={c:(k+1)%3, sp:0.15+k*0.03, side:side}; scene.add(o); objs.push(o);
  }
  function blending(){ return css('--blend')==='additive'?THREE.AdditiveBlending:THREE.NormalBlending; }
  var cols=[];
  function theme(){
    cols=[new THREE.Color(css('--pA')),new THREE.Color(css('--pB')),new THREE.Color(css('--pC'))];
    uni.uA.value.copy(cols[0]); uni.uB.value.copy(cols[1]); uni.uC.value.copy(cols[2]);
    var b=blending(), add=b===THREE.AdditiveBlending; uni.uAlpha.value=add?0.85:0.7;
    pmat.blending=b; pmat.needsUpdate=true;
    rings.concat(objs).forEach(function(m){ m.material.color.copy(cols[m.userData.c]); m.material.blending=b; m.material.needsUpdate=true; });
  }
  function size(){
    var pr=Math.min(devicePixelRatio, mobile?1.5:2);
    renderer.setPixelRatio(pr); uni.uPR.value=pr;
    renderer.setSize(innerWidth,innerHeight,false);
    cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix();
  }
  theme(); size();
  var mx=0,my=0,cmx=0,cmy=0;
  addEventListener('pointermove',function(e){ mx=e.clientX/innerWidth*2-1; my=-(e.clientY/innerHeight*2-1); });
  /* each page's shape is only visible from its own page: it fades in as you arrive and out before the next one shows */
  function fade(z,camZ){ var d=camZ-z; return clamp((d-3)/6,0,1)*clamp((30-d)/10,0,1); }
  function fadeRing(z,camZ){ var d=camZ-z; return clamp((d-1)/5,0,1)*clamp((50-d)/30,0,1); }
  return {
    theme:theme, size:size,
    /* f is the page position, eased: 0 = intro, 1 = projects ... it moves the camera along the path */
    render:function(t,f){
      uni.uT.value=t;
      cmx+=(mx-cmx)*0.04; cmy+=(my-cmy)*0.04;
      var camZ=8-f*SP, bob=Math.sin(f*Math.PI*0.5)*1.4;
      cam.position.set(cmx*1.1, bob+cmy*0.6, camZ);
      cam.lookAt(cmx*0.3, bob*0.6, camZ-14);
      cam.rotation.z+=Math.sin(f*Math.PI)*0.04;
      var add=css('--blend')==='additive', base=add?0.55:0.4;
      rings.forEach(function(r,k){ r.rotation.z=t*0.04*(k%2?-1:1)+k; var sc=1+0.04*Math.sin(t*0.8+k); r.scale.set(sc,sc,1); r.material.opacity=fadeRing(r.position.z,camZ)*base*0.7; });
      objs.forEach(function(o){ o.rotation.x=t*o.userData.sp; o.rotation.y=t*o.userData.sp*1.3; o.position.y+=(Math.sin(t*0.6+o.position.z)*0.004); o.material.opacity=fade(o.position.z,camZ)*base*0.55; });
      renderer.render(scene,cam);
    }
  };
}

/* ---------- router & curtain ---------- */
var views={}; $$('.view').forEach(function(v){ views[v.dataset.view]=v; });
var here=$('#here'), curtain=$('#curtain'), curtainTxt=$('#curtain span');
var current=null, busy=false;
var clickX=innerWidth/2, clickY=innerHeight/2;
document.addEventListener('click',function(e){ clickX=e.clientX; clickY=e.clientY; },true);
function parse(){
  var h=location.hash.slice(1)||'home';
  if(PAGE[h]!==undefined) return {view:'home',page:PAGE[h]};
  if(views[h] && h!=='home') return {view:h};
  return {view:'home',page:0};
}
function labelFor(r){ return r.view==='home'? pages[r.page].dataset.label : views[r.view].dataset.label; }
function apply(r){
  var prev=current;
  Object.keys(views).forEach(function(k){ views[k].classList.toggle('active',k===r.view); views[k].classList.remove('shown'); });
  current=r.view; body.dataset.view=r.view;
  root.classList.toggle('paged',r.view==='home');
  document.title=views[r.view].dataset.title;
  window.scrollTo(0,0);
  if(r.view==='home'){
    /* coming back from a project: land on the page that holds its row */
    var card=prev && prev!=='home' ? $('.pc[href="#'+prev+'"]') : null;
    var page=card? pages.indexOf(card.closest('.pg')) : r.page;
    pi=-1; setPage(page,true); ps=p;
  } else {
    here.textContent='Projects'; markLinks('projects');
  }
  requestAnimationFrame(function(){ views[r.view].classList.add('shown'); onViewShown(r.view); });
  var h=r.view==='home'? pages[pi].querySelector('h1,h2') : views[r.view].querySelector('h1');
  if(h && !first) h.focus({preventScroll:true});
}
var first=true;
function route(){
  var r=parse();
  setMenu(false);
  if(first){ apply(r); first=false; return; }
  if(r.view===current){ if(r.view==='home') setPage(r.page); return; }
  if(reduce){ apply(r); return; }
  busy=true;
  curtain.style.setProperty('--cx',clickX+'px'); curtain.style.setProperty('--cy',clickY+'px');
  curtainTxt.textContent=labelFor(r);
  curtain.classList.add('cover');
  setTimeout(function(){
    apply(r);
    curtain.classList.add('reveal');
    setTimeout(function(){
      curtain.style.transition='none'; curtain.classList.remove('cover','reveal');
      void curtain.offsetWidth; curtain.style.transition=''; busy=false;
    },780);
  },720);
}
addEventListener('hashchange',route);
/* links to another landing page just slide there */
document.addEventListener('click',function(e){
  var a=e.target.closest('a[href^="#"]'); if(!a) return;
  var h=a.getAttribute('href').slice(1)||'home';
  if(current==='home' && PAGE[h]!==undefined){ e.preventDefault(); setMenu(false); setPage(PAGE[h]); }
});
/* keyboard on a project: Esc goes back, arrows step through projects */
document.addEventListener('keydown',function(e){
  if(current==='home'||busy||body.classList.contains('menu-open')) return;
  var v=views[current], to=null;
  if(e.key==='Escape') to='#projects';
  if(e.key==='ArrowLeft') to=v.querySelector('.pd-prev').getAttribute('href');
  if(e.key==='ArrowRight') to=v.querySelector('.pd-next').getAttribute('href');
  if(to){ clickX=innerWidth/2; clickY=innerHeight/2; location.hash=to; }
});

/* ---------- per-view setup ---------- */
function setPans(){
  $$('.fview').forEach(function(v){ var img=v.querySelector('img'); if(!img) return; var d=img.offsetHeight-v.offsetHeight; img.style.setProperty('--pan',(d>0?-d:0)+'px'); img.style.setProperty('--pt',clamp(d/160,4,18).toFixed(1)+'s'); img.style.setProperty('--pa',clamp(d/70,6,30).toFixed(1)+'s'); });
}
$$('.fview img').forEach(function(i){ i.addEventListener('load',setPans); });
function onViewShown(v){
  if(v==='home'){ fitPages(); setPans(); sizeSkills(); if(gl) gl.size(); }
  else { var pr=views[v].querySelector('.proj'); pr.classList.remove('in'); void pr.offsetWidth; pr.classList.add('in'); setPans(); }
}
if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ if(current==='home') fitPages(); });
addEventListener('resize',function(){ setPh(); fitPages(); if(current==='home') setPage(pi,true); setPans(); sizeSkills(); if(gl) gl.size(); });

/* ---------- skills deck ---------- */
var deck=$('#deck'), sks=$$('.sk',deck);
function openSk(s){ sks.forEach(function(k){ k.classList.toggle('on',k===s); k.setAttribute('aria-expanded',k===s?'true':'false'); }); }
sks.forEach(function(s){
  s.addEventListener('click',function(){ openSk(s); });
  s.addEventListener('focus',function(){ openSk(s); });
  s.addEventListener('pointerenter',function(e){ if(e.pointerType==='mouse') openSk(s); });
});
var skc=sks.map(function(s){ return {el:s, c:s.querySelector('canvas'), type:s.dataset.anim, st:{}}; });
function sizeCanvas(c){ var d=Math.min(devicePixelRatio,2), w=c.clientWidth, h=c.clientHeight; if(!w) return false; if(c.width!==Math.round(w*d)||c.height!==Math.round(h*d)){ c.width=Math.round(w*d); c.height=Math.round(h*d);} var x=c.getContext('2d'); x.setTransform(d,0,0,d,0,0); return {x:x,w:w,h:h}; }
function sizeSkills(){ skc.forEach(function(k){ k.g=sizeCanvas(k.c); }); }
function hexA(hex,a){ var h=hex.replace('#',''); if(h.length===3) h=h.split('').map(function(c){return c+c}).join(''); var n=parseInt(h,16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
var A={
  net:function(g,t,st,C){
    var x=g.x,w=g.w,h=g.h; var L=[3,5,5,3];
    if(!st.n||st.w!==w||st.h!==h){ st.w=w; st.h=h; st.n=L.map(function(c,i){ var a=[]; for(var j=0;j<c;j++) a.push({x:w*(0.22+i*0.56/(L.length-1)), y:h*0.14+ (h*0.46)*(j+0.5)/c, gl:0}); return a; }); st.p=[]; st.last=0; }
    if(t-st.last>0.12){ st.last=t; var li=Math.floor(Math.random()*(L.length-1)); st.p.push({l:li,a:Math.floor(Math.random()*L[li]),b:Math.floor(Math.random()*L[li+1]),k:0}); }
    x.lineWidth=1; x.strokeStyle=hexA(C.ink,0.08);
    for(var i=0;i<L.length-1;i++) st.n[i].forEach(function(a){ st.n[i+1].forEach(function(b){ x.beginPath(); x.moveTo(a.x,a.y); x.lineTo(b.x,b.y); x.stroke(); }); });
    st.p=st.p.filter(function(q){ q.k+=0.025; var a=st.n[q.l][q.a], b=st.n[q.l+1][q.b];
      x.strokeStyle=hexA(C.violet,0.6*(1-q.k)); x.lineWidth=1.6; x.beginPath(); x.moveTo(a.x,a.y); x.lineTo(a.x+(b.x-a.x)*q.k,a.y+(b.y-a.y)*q.k); x.stroke();
      if(q.k>=1){ b.gl=1; return false; } return true; });
    st.n.forEach(function(l,i){ l.forEach(function(n){ n.gl*=0.94; x.beginPath(); x.arc(n.x,n.y,6+n.gl*4,0,7); x.fillStyle=n.gl>0.1?hexA(i===L.length-1?C.cyan:C.violet,0.35+n.gl*0.65):hexA(C.ink,0.18); x.fill(); }); });
  },
  cv:function(g,t,st,C){
    var x=g.x,w=g.w,h=g.h;
    if(!st.o){ st.o=[{y:.22,s:.05,sz:.16,l:'car 0.97',ph:.1},{y:.4,s:.08,sz:.11,l:'plate 0.93',ph:.6},{y:.3,s:-.04,sz:.13,l:'bike 0.91',ph:.35}]; }
    x.fillStyle=hexA(C.ink,0.05); for(var gx=0;gx<w;gx+=18) for(var gy=0;gy<h*0.62;gy+=18){ x.fillRect(gx,gy,1.5,1.5); }
    st.o.forEach(function(o){
      var u=((o.ph+t*o.s)%1+1)%1, cx=-0.15*w+u*1.3*w, cy=o.y*h, s=o.sz*Math.min(w,h*1.4)+30;
      x.fillStyle=hexA(C.violet,0.18); x.beginPath(); x.roundRect? x.roundRect(cx-s/2,cy-s*0.35,s,s*0.7,8): x.rect(cx-s/2,cy-s*0.35,s,s*0.7); x.fill();
      var b=6; x.strokeStyle=C.cyan; x.lineWidth=2; var L=12, X0=cx-s/2-b, Y0=cy-s*0.35-b, X1=cx+s/2+b, Y1=cy+s*0.35+b;
      x.beginPath(); x.moveTo(X0,Y0+L);x.lineTo(X0,Y0);x.lineTo(X0+L,Y0); x.moveTo(X1-L,Y0);x.lineTo(X1,Y0);x.lineTo(X1,Y0+L); x.moveTo(X1,Y1-L);x.lineTo(X1,Y1);x.lineTo(X1-L,Y1); x.moveTo(X0+L,Y1);x.lineTo(X0,Y1);x.lineTo(X0,Y1-L); x.stroke();
      x.fillStyle=C.cyan; x.font='600 11px "IBM Plex Sans",sans-serif'; var tw=x.measureText(o.l).width+10; x.fillRect(X0,Y0-18,tw,16); x.fillStyle='#07060F'; x.fillText(o.l,X0+5,Y0-6);
    });
    var sy=((t*0.25)%1)*h*0.62; var gr=x.createLinearGradient(0,sy-30,0,sy); gr.addColorStop(0,hexA(C.cyan,0)); gr.addColorStop(1,hexA(C.cyan,0.25)); x.fillStyle=gr; x.fillRect(0,sy-30,w,30); x.fillStyle=hexA(C.cyan,0.8); x.fillRect(0,sy,w,1.5);
  },
  llm:function(g,t,st,C){
    var x=g.x,w=g.w,h=g.h, rows=7, lh=Math.min(30,h*0.07), top=h*0.1, left=w*0.1, maxw=w*0.8;
    if(!st.r||st.w!==w){ st.w=w; st.r=[]; for(var i=0;i<rows;i++){ var toks=[],acc=0; while(acc<maxw*(0.55+Math.random()*0.45)){ var tw=18+Math.random()*52; toks.push(tw); acc+=tw+6; } st.r.push(toks); } st.t0=t; st.hit=Math.floor(Math.random()*rows); }
    var el=(t-st.t0)*14, shown=0, total=0; st.r.forEach(function(r){ total+=r.length; });
    if(el>total+24){ st.r=null; return; }
    st.r.forEach(function(r,i){ var xx=left, y=top+i*(lh+10);
      if(i===st.hit && el>total){ x.fillStyle=hexA(C.violet,0.16); x.fillRect(left-8,y-4,maxw+16,lh+8); }
      r.forEach(function(tw){ if(shown<el){ x.fillStyle=(i===st.hit&&el>total)?C.violet:hexA(C.ink,0.22); x.beginPath(); x.roundRect? x.roundRect(xx,y,tw,lh*0.6,4):x.rect(xx,y,tw,lh*0.6); x.fill(); if(Math.floor(el)===shown){ if(Math.sin(t*12)>0){ x.fillStyle=C.cyan; x.fillRect(xx+tw+3,y-2,2.5,lh*0.6+4);} } } xx+=tw+6; shown++; });
    });
  },
  sig:function(g,t,st,C){
    var x=g.x,w=g.w,h=g.h, mid=h*0.2, amp=h*0.12;
    x.beginPath(); for(var i=0;i<=w;i+=2){ var u=i/w, d=((u*3-t*0.5)%1+1)%1, e=d<0.5?Math.exp(-d*9)*Math.sin(d*90):0; var y=mid-(e*0.9+(Math.random()-0.5)*0.12)*amp; i?x.lineTo(i,y):x.moveTo(i,y);} x.strokeStyle=C.violet; x.lineWidth=1.8; x.stroke();
    var cols=48, rowsN=14, cw=w/cols, top=h*0.36, ch=(h*0.26)/rowsN;
    if(!st.s){ st.s=[]; for(var c=0;c<cols;c++) st.s.push(new Array(rowsN).fill(0)); st.last=0; }
    if(t-st.last>0.06){ st.last=t; st.s.shift(); var col=[], burst=Math.sin(t*2.1)>0.3; for(var r=0;r<rowsN;r++){ col.push(clamp((burst?Math.exp(-Math.pow((r-4-Math.sin(t)*2)/2.5,2)):0)+Math.random()*0.18,0,1)); } st.s.push(col); }
    for(var c2=0;c2<cols;c2++) for(var r2=0;r2<rowsN;r2++){ var v=st.s[c2][r2]; x.fillStyle=v>0.5?hexA(C.cyan,v):hexA(C.violet,v*0.9+0.04); x.fillRect(c2*cw,top+(rowsN-1-r2)*ch,cw-1,ch-1); }
  },
  bi:function(g,t,st,C){
    var x=g.x,w=g.w,h=g.h, n=8, base=h*0.62, left=w*0.1, bw=(w*0.8)/n;
    if(!st.v){ st.v=[]; st.tg=[]; for(var i=0;i<n;i++){ st.v.push(0.2); st.tg.push(Math.random()); } st.last=t; }
    if(t-st.last>2){ st.last=t; for(var j=0;j<n;j++) st.tg[j]=0.15+Math.random()*0.85; }
    x.strokeStyle=hexA(C.ink,0.1); x.lineWidth=1; for(var k=1;k<=3;k++){ var gy=base-k*(h*0.14); x.beginPath(); x.moveTo(left,gy); x.lineTo(w-left,gy); x.stroke(); }
    var pts=[];
    for(var i2=0;i2<n;i2++){ st.v[i2]+=(st.tg[i2]-st.v[i2])*0.06; var bh=st.v[i2]*h*0.46, bx=left+i2*bw+bw*0.18;
      var gr=x.createLinearGradient(0,base-bh,0,base); gr.addColorStop(0,C.violet); gr.addColorStop(1,hexA(C.violet,0.15)); x.fillStyle=gr;
      x.beginPath(); x.roundRect? x.roundRect(bx,base-bh,bw*0.64,bh,[6,6,0,0]):x.rect(bx,base-bh,bw*0.64,bh); x.fill(); pts.push([bx+bw*0.32,base-bh-10]); }
    x.beginPath(); pts.forEach(function(q,i){ i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]); }); x.strokeStyle=C.cyan; x.lineWidth=2; x.stroke();
    pts.forEach(function(q){ x.beginPath(); x.arc(q[0],q[1],3.5,0,7); x.fillStyle=C.cyan; x.fill(); });
  },
  ship:function(g,t,st,C){
    var x=g.x,w=g.w,h=g.h, y=h*0.3, names=['build','test','deploy'], xs=[w*0.2,w*0.5,w*0.8], cyc=(t*0.33)%1.2;
    x.strokeStyle=hexA(C.ink,0.15); x.lineWidth=2; x.setLineDash([5,6]); x.lineDashOffset=-t*30; x.beginPath(); x.moveTo(xs[0],y); x.lineTo(xs[2],y); x.stroke(); x.setLineDash([]);
    xs.forEach(function(cx,i){ var pr=clamp((cyc-i*0.33)/0.3,0,1);
      x.beginPath(); x.arc(cx,y,26,0,7); x.fillStyle=hexA(C.ink,0.06); x.fill();
      x.beginPath(); x.arc(cx,y,26,-Math.PI/2,-Math.PI/2+pr*Math.PI*2); x.strokeStyle=i===2?C.cyan:C.violet; x.lineWidth=3; x.stroke();
      if(pr>=1){ x.strokeStyle=i===2?C.cyan:C.violet; x.lineWidth=3; x.beginPath(); x.moveTo(cx-9,y); x.lineTo(cx-2,y+7); x.lineTo(cx+10,y-7); x.stroke(); }
      x.fillStyle=hexA(C.ink,0.7); x.font='500 12px "IBM Plex Sans",sans-serif'; x.textAlign='center'; x.fillText(names[i],cx,y+48); x.textAlign='left';
    });
    var u=clamp(cyc/1,0,1), px=xs[0]+(xs[2]-xs[0])*u; x.beginPath(); x.arc(px,y-40,5,0,7); x.fillStyle=C.warm; x.fill();
  }
};
function drawSkills(t){
  var C={ink:css('--ink'),violet:css('--violet'),cyan:css('--cyan'),warm:css('--warm')};
  skc.forEach(function(k){ k.g=sizeCanvas(k.c); if(!k.g) return; k.g.x.clearRect(0,0,k.g.w,k.g.h); A[k.type](k.g,t,k.st,C); });
}

/* magnetic email */
var copyBtn=$('#copyMail');
copyBtn.addEventListener('click',function(){
  var addr='daschandrima2005@gmail.com', done=function(){ copyBtn.classList.add('ok'); copyBtn.firstChild.textContent='Copied'; setTimeout(function(){ copyBtn.classList.remove('ok'); copyBtn.firstChild.textContent='Copy'; },1800); };
  try{ if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(addr).then(done,function(){ fallback(); }); } else fallback(); }catch(e){ fallback(); }
  function fallback(){ var t=document.createElement('textarea'); t.value=addr; t.style.position='fixed'; t.style.opacity='0'; document.body.appendChild(t); t.select(); try{ document.execCommand('copy'); done(); }catch(e){} t.remove(); }
});

/* ---------- custom cursor ---------- */
var cur=$('#cursor'), cdot=$('.c-dot'), cring=$('.c-ring'), clab=$('.c-tag b');
var cx=-100,cy=-100,rx=-100,ry=-100;
if(fine && !reduce){
  body.classList.add('has-cursor');
  addEventListener('pointermove',function(e){ cx=e.clientX; cy=e.clientY; });
  document.addEventListener('pointerover',function(e){
    var l=e.target.closest('[data-cursor]'), h=e.target.closest('a,button,[role="button"],[data-cursor-hover]');
    cur.classList.toggle('label',!!l); cur.classList.toggle('hover',!l&&!!h); if(l) clab.textContent=l.dataset.cursor;
  });
  document.addEventListener('pointerleave',function(){ cx=cy=-100; });
}

/* ---------- loader ----------
   Two styles. A: boot log + progress bar + name typed behind a cursor.
   B: oscilloscope "signal lock" - a noisy trace settles into a clean signal, then the name slides up.
   Pick one with LOADER below, or preview with ?loader=a / ?loader=b */
var LOADER='b';
function startSite(){ body.classList.add('ready'); }
var loader=$('#loader');
function finishLoader(){
  loader.classList.add('complete','done');
  setTimeout(startSite,350);
  setTimeout(function(){ loader.remove(); },1100);
}
function loaderA(){
  var ldLog=$('#ldLog'), ldA=$('#ldA'), ldB=$('#ldB'), ldFill=$('#ldFill'), ldPct=$('#ldPct'), ldStat=$('#ldStat');
  var LINES=[['init','signal_pipeline'],['load','model_weights'],['fit','stft_features'],['render','portfolio_2026']];
  var NAME='Chandrima Das', caret=document.createElement('span'); caret.className='ld-caret';
  function typeName(f){
    var n=Math.round(f*NAME.length), a=NAME.slice(0,Math.min(n,9)), b=n>10?NAME.slice(10,n):'';
    ldA.textContent=a; ldB.textContent=b;
    (n>10?ldB:ldA).appendChild(caret);
  }
  var bootStart=0, DUR=1700, shown=0, finished=false;
  function frame(now){
    if(!bootStart) bootStart=now;
    var t=Math.min(1,(now-bootStart)/DUR), e=1-Math.pow(1-t,2.2);
    ldFill.style.transform='scaleX('+e+')';
    ldPct.textContent=('00'+Math.round(e*100)).slice(-3)+'%';
    while(shown<LINES.length && t>shown/LINES.length*0.9){
      var l=LINES[shown], row=document.createElement('p');
      row.innerHTML='<b>&gt;</b> '+l[0]+' <span>'+l[1]+'</span><em>ok</em>';
      ldLog.appendChild(row); requestAnimationFrame(function(r){ return function(){ r.classList.add('on'); }; }(row));
      ldStat.textContent=l[0]+' '+l[1]; shown++;
    }
    typeName(clamp((t-0.05)/0.38,0,1));
    if(t<1){ requestAnimationFrame(frame); return; }
    if(finished) return; finished=true;
    typeName(1); ldStat.textContent='ready'; finishLoader();
  }
  return frame;
}
function loaderB(){
  loader.classList.add('ldb');
  loader.innerHTML='<div class="ld-grid"></div>'+
    '<div class="ldb-box">'+
      '<div class="ldb-top"><span>signal acquisition</span><span id="lbSnr">SNR 00.0 dB</span></div>'+
      '<canvas id="lbScope"></canvas>'+
      '<div class="ldb-name"><span class="ln"><span>Chandrima</span></span><span class="ln das"><span>Das</span></span></div>'+
      '<div class="ldb-prog"><i id="lbFill"></i></div>'+
      '<div class="ldb-foot"><span id="lbStat">locking signal</span><span class="ldb-tag">noise is loud · signal is patient</span><span id="lbPct">000%</span></div>'+
    '</div>';
  var cv=$('#lbScope'), snr=$('#lbSnr'), stat=$('#lbStat'), nm=$('.ldb-name',loader), fill=$('#lbFill'), pct=$('#lbPct'), ctx=cv.getContext('2d'), DUR=1900, t0=0, done=false;
  var noise=[]; for(var i=0;i<400;i++) noise.push(Math.random()*2-1);
  function frame(now){
    if(!t0){ t0=now; loader.classList.add('started'); }
    var t=Math.min(1,(now-t0)/DUR), d=Math.min(devicePixelRatio,2), w=cv.clientWidth, h=cv.clientHeight;
    if(cv.width!==Math.round(w*d)){ cv.width=Math.round(w*d); cv.height=Math.round(h*d); }
    ctx.setTransform(d,0,0,d,0,0); ctx.clearRect(0,0,w,h);
    var vi=css('--violet'), cy=css('--cyan'), mid=h/2, lock=clamp((t-0.05)/0.9,0,1), ease=lock*lock*(3-2*lock);
    /* faint centre line and ticks */
    ctx.strokeStyle=hexA(css('--ink'),0.12); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,mid); ctx.lineTo(w,mid); ctx.stroke();
    for(var k=0;k<=10;k++){ var tx=w*k/10; ctx.beginPath(); ctx.moveTo(tx,mid-4); ctx.lineTo(tx,mid+4); ctx.stroke(); }
    /* the trace: noise fades out while a clean wave packet comes in */
    if(Math.random()<0.6){ for(var q=0;q<40;q++) noise[Math.floor(Math.random()*noise.length)]=Math.random()*2-1; }
    var g=ctx.createLinearGradient(0,0,w,0); g.addColorStop(0,vi); g.addColorStop(1,cy);
    ctx.strokeStyle=g; ctx.lineWidth=2; ctx.shadowColor=cy; ctx.shadowBlur=12*ease;
    ctx.beginPath();
    for(var x=0;x<=w;x+=2){
      var u=x/w, n=noise[Math.floor(u*(noise.length-1))]*(1-ease)*h*0.38,
          env=Math.exp(-Math.pow((u-0.5)/0.16,2)), wave=Math.sin(u*Math.PI*2*9-now*0.006)*env*h*0.36*ease;
      var y=mid-n-wave; x?ctx.lineTo(x,y):ctx.moveTo(x,y);
    }
    ctx.stroke(); ctx.shadowBlur=0;
    /* the name is there from the start, blurred like the noise, and comes into focus as the signal locks */
    nm.style.filter='blur('+((1-ease)*7).toFixed(2)+'px)'; nm.style.opacity=(0.35+0.65*ease).toFixed(3);
    fill.style.transform='scaleX('+t+')'; pct.textContent=('00'+Math.floor(t*100)).slice(-3)+'%';
    snr.textContent='SNR '+('0'+(3.2+ease*38.4).toFixed(1)).slice(-4)+' dB';
    if(lock>=1 && !loader.classList.contains('locked')){ loader.classList.add('locked'); stat.textContent='signal locked'; }
    if(t>=1){ pct.textContent='100%'; stat.textContent='opening portfolio'; }
    if(t<1){ requestAnimationFrame(frame); return; }
    if(done) return; done=true; finishLoader();
  }
  return frame;
}
if(reduce){ loader.remove(); startSite(); }
else{
  var pick=(location.search.match(/[?&]loader=([ab])/)||[])[1]||LOADER;
  var run=pick==='a'?loaderA():loaderB();
  var started=false, kick=function(){ if(!started){ started=true; requestAnimationFrame(run); } };
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(kick);
  setTimeout(kick,700);
}

/* ---------- boot ---------- */
gl=initGL();
route();

var t0g=performance.now();
function loop(now){
  var t=(now-t0g)/1000;
  if(current==='home'){
    ps+=(p-ps)*(reduce?1:0.045); if(Math.abs(p-ps)<0.0005) ps=p;
    if(gl) gl.render(t,ps);
    if(pages[pi] && pages[pi].id==='skills') drawSkills(t);
  }
  if(fine && !reduce){ rx+=(cx-rx)*0.18; ry+=(cy-ry)*0.18; cdot.style.transform='translate('+cx+'px,'+cy+'px)'; cring.style.transform='translate('+rx+'px,'+ry+'px)'; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
