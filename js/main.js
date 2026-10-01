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

/* ---------- smooth scroll ---------- */
var lenis=null;
if(window.Lenis && !reduce){
  try{ lenis=new Lenis({lerp:0.13, smoothWheel:true, wheelMultiplier:1}); }catch(e){lenis=null}
}
function scrollToY(y,immediate,dur){
  if(lenis){ lenis.scrollTo(y,{immediate:!!immediate, force:true, duration:dur||1.3, lock:!immediate}); }
  else window.scrollTo({top:y, behavior:immediate||reduce?'auto':'smooth'});
}

/* ---------- menu ---------- */
var menuBtn=$('#menuBtn'), menu=$('#menu'), menuTxt=$('#menuTxt');
function setMenu(open){
  body.classList.toggle('menu-open',open);
  menuBtn.setAttribute('aria-expanded',open?'true':'false');
  menu.setAttribute('aria-hidden',open?'false':'true');
  menuTxt.textContent=open?'Close':'Menu';
  if(lenis){ open?lenis.stop():lenis.start(); }
}
menuBtn.addEventListener('click',function(){ setMenu(!body.classList.contains('menu-open')); });
document.addEventListener('keydown',function(e){ if(e.key==='Escape') setMenu(false); });

/* ---------- journey (home + picker) ---------- */
var journey=$('#journey'), actIntro=$('#actIntro'), actSignal=$('#actSignal'), actPick=$('#actPick'), actFoot=$('#actFoot');
var dots=$$('#dots button'), PICK=0.33, anchors=[0,PICK,0.66,1];
var p=0, ps=0, lastScroll=0, snapping=0, userScrolled=false;
function stops(){
  var max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
  return [0, Math.min(actPick.offsetTop,max), Math.min(actSignal.offsetTop,max), max];
}
function yFor(a){
  var st=stops();
  for(var i=0;i<anchors.length-1;i++){ if(a<=anchors[i+1]){ var f=(a-anchors[i])/(anchors[i+1]-anchors[i]); return st[i]+f*(st[i+1]-st[i]); } }
  return st[st.length-1];
}
function readP(){
  var st=stops(), y=scrollY;
  for(var i=0;i<st.length-1;i++){ if(y<=st[i+1]){ var f=st[i+1]>st[i]?(y-st[i])/(st[i+1]-st[i]):1; p=anchors[i]+clamp(f,0,1)*(anchors[i+1]-anchors[i]); return; } }
  p=1;
}
dots.forEach(function(b){ b.addEventListener('click',function(){ scrollToY(yFor(anchors[+b.dataset.a]),false,1.6); }); });
$('#toTop').addEventListener('click',function(){ scrollToY(0,false,2.4); });
$('#toPick').addEventListener('click',function(){ scrollToY(yFor(PICK),false,2.2); });
function onScroll(){ lastScroll=performance.now(); userScrolled=true; }
if(lenis) lenis.on('scroll',onScroll); else addEventListener('scroll',onScroll,{passive:true});

function updateActs(){
  var idx=0,bd=9; anchors.forEach(function(a,k){ var d=Math.abs(ps-a); if(d<bd){bd=d; idx=k;} });
  dots.forEach(function(d,i){ d.classList.toggle('on',i===idx); });
}
var actIO=('IntersectionObserver' in window)? new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting) e.target.classList.add('on'); }); },{threshold:0.3}) : null;
[actPick,actSignal,actFoot].forEach(function(a){ if(actIO && !reduce) actIO.observe(a); else a.classList.add('on'); });
function maybeSnap(now){
  if(reduce||current!=='home'||!userScrolled||body.classList.contains('menu-open')) return;
  if(now<snapping||now-lastScroll<220) return;
  var best=anchors.reduce(function(a,b){ return Math.abs(b-p)<Math.abs(a-p)?b:a; });
  if(Math.abs(best-p)>0.015){ snapping=now+1500; scrollToY(yFor(best),false,1.1); }
}

/* ---------- WebGL signal terrain ---------- */
var gl=null;
function initGL(){
  if(!window.THREE) return null;
  var canvas=$('#gl'), renderer;
  try{ renderer=new THREE.WebGLRenderer({canvas:canvas, antialias:true, alpha:true, powerPreference:'high-performance'}); }catch(e){ return null; }
  var mobile=innerWidth<760;
  var R=mobile?48:74, C=mobile?120:210, X0=-17, X1=17, Z0=-28, Z1=5;
  var scene=new THREE.Scene();
  var cam=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,120);
  var pos=new Float32Array(R*C*3), idx=[];
  for(var r=0;r<R;r++){ var z=Z0+(Z1-Z0)*r/(R-1); for(var c=0;c<C;c++){ var k=(r*C+c)*3; pos[k]=X0+(X1-X0)*c/(C-1); pos[k+1]=0; pos[k+2]=z; if(c<C-1) idx.push(r*C+c, r*C+c+1); } }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setIndex(idx);
  var uni={uT:{value:0},uE1:{value:0},uE2:{value:0},uMouse:{value:new THREE.Vector2(999,999)},
    uA:{value:new THREE.Color()},uB:{value:new THREE.Color()},uC:{value:new THREE.Color()},uAlpha:{value:1}};
  var mat=new THREE.ShaderMaterial({uniforms:uni, transparent:true, depthWrite:false,
    vertexShader:[
      'uniform float uT,uE1,uE2; uniform vec2 uMouse;',
      'varying float vD; varying float vA; varying float vH;',
      'void main(){',
      '  float x=position.x, z=position.z;',
      '  float n=sin(x*0.85+uT*1.2+z*0.65)*0.38+sin(x*2.2-uT*1.8+z*1.6)*0.2+sin(x*4.9+uT*2.6-z*2.7)*0.09+sin(z*0.45-uT*0.7)*0.32;',
      '  float y=n*mix(1.15,0.14,uE1);',
      '  float d=x+2.5; float pul=0.0; if(d>0.0) pul=exp(-d*0.33)*sin(d*2.3-uT*0.6*0.0); float d2=x+8.0; if(d2>0.0) pul+=0.3*exp(-d2*0.8)*sin(d2*3.8);',
      '  float ridge=pul*2.6*exp(-pow((z+8.0)/2.4,2.0))*(1.0+0.05*sin(uT*1.6));',
      '  y+=ridge*uE1*(1.0-uE2);',
      '  float rr=length(vec2(x*0.9,z+8.0)); float rip=sin(rr*1.2-uT*2.0)*0.55*exp(-rr*0.085)+n*0.08;',
      '  y=mix(y,rip,uE2);',
      '  vec2 dm=vec2(x,z)-uMouse; y+=1.25*exp(-dot(dm,dm)/5.0)*(1.0-uE2*0.5);',
      '  vH=y;',
      '  vD=clamp((z+28.0)/33.0,0.0,1.0);',
      '  vA=smoothstep(0.0,0.4,vD)*(0.3+0.7*vD)*(1.0-smoothstep(12.0,17.0,abs(x)));',
      '  gl_Position=projectionMatrix*modelViewMatrix*vec4(x,y-2.6,z,1.0);',
      '}'].join('\n'),
    fragmentShader:[
      'uniform vec3 uA,uB,uC; uniform float uAlpha,uE1,uE2; varying float vD; varying float vA; varying float vH;',
      'void main(){ vec3 col=mix(uB,uA,vD);',
      '  col=mix(col,uC,clamp((vH-0.8)*0.7,0.0,1.0)*uE1*(1.0-uE2));',
      '  col+=clamp(vH,0.0,1.5)*0.12;',
      '  gl_FragColor=vec4(col, vA*uAlpha*(0.55+clamp(vH*0.35,0.0,0.45))); }'].join('\n')
  });
  var lines=new THREE.LineSegments(g,mat); lines.frustumCulled=false; scene.add(lines);
  function theme(){
    uni.uA.value.set(css('--pA')); uni.uB.value.set(css('--pB')); uni.uC.value.set(css('--pC'));
    var add=css('--blend')==='additive';
    mat.blending=add?THREE.AdditiveBlending:THREE.NormalBlending; uni.uAlpha.value=add?1.0:0.8; mat.needsUpdate=true;
  }
  function size(){
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile?1.5:2));
    renderer.setSize(innerWidth,innerHeight,false);
    cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix();
  }
  theme(); size();
  var mx=0,my=0,cmx=0,cmy=0,hasMouse=false;
  addEventListener('pointermove',function(e){ mx=e.clientX/innerWidth*2-1; my=-(e.clientY/innerHeight*2-1); hasMouse=true; });
  var ray=new THREE.Raycaster(), plane=new THREE.Plane(new THREE.Vector3(0,1,0),2.6), hit=new THREE.Vector3(), ndc=new THREE.Vector2();
  var portrait=function(){ return cam.aspect<1; };
  return {
    theme:theme, size:size,
    render:function(t,prog){
      uni.uT.value=t;
      var e2=smooth(0.1,0.3,prog)*(1-smooth(0.38,0.55,prog)), e1=smooth(0.42,0.62,prog);
      uni.uE1.value=e1; uni.uE2.value=e2;
      cmx+=(mx-cmx)*0.05; cmy+=(my-cmy)*0.05;
      var back=portrait()?4:0;
      cam.position.set(cmx*0.8, 2.3+cmy*0.35+e2*1.6, 9+back-e1*1.2+e2*0.6);
      cam.lookAt(0,2.0-e1*0.4-e2*0.3,-7);
      if(hasMouse && fine){ ndc.set(mx,my); ray.setFromCamera(ndc,cam); if(ray.ray.intersectPlane(plane,hit)) uni.uMouse.value.set(hit.x,hit.z); }
      else uni.uMouse.value.set(999,999);
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
function parse(){ var h=location.hash.slice(1)||'home'; if(h==='explore') return {view:'home',spot:'explore'}; if(!views[h]) return {view:'home',spot:'home'}; return {view:h,spot:h}; }
function apply(r){
  Object.keys(views).forEach(function(k){ views[k].classList.toggle('active',k===r.view); views[k].classList.remove('shown'); });
  current=r.view; body.dataset.view=r.view; resetReturn();
  document.title=views[r.view].dataset.title;
  here.textContent=r.spot==='explore'?'Choose a section':views[r.view].dataset.label;
  $$('[data-link]').forEach(function(a){ if(a.dataset.link===r.spot) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  if(lenis) lenis.resize();
  if(r.view==='home'){
    var y=r.spot==='explore'?yFor(PICK):0;
    scrollToY(y,true); window.scrollTo(0,y); readP(); ps=p; userScrolled=false;
  } else { scrollToY(0,true); window.scrollTo(0,0); }
  requestAnimationFrame(function(){ views[r.view].classList.add('shown'); onViewShown(r.view); });
  var h=r.spot==='explore'?$('#pickH'):views[r.view].querySelector('h1');
  if(h && !first) h.focus({preventScroll:true});
}
var first=true;
function route(){
  var r=parse();
  setMenu(false);
  if(first){ apply(r); first=false; return; }
  if(r.view===current){
    if(r.view==='home'){ here.textContent=r.spot==='explore'?'Choose a section':'Home'; scrollToY(r.spot==='explore'?yFor(PICK):0,false,1.8); }
    else scrollToY(0,false,1);
    $$('[data-link]').forEach(function(a){ if(a.dataset.link===r.spot) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    return;
  }
  if(reduce){ apply(r); return; }
  busy=true;
  curtain.style.setProperty('--cx',clickX+'px'); curtain.style.setProperty('--cy',clickY+'px');
  curtainTxt.textContent=r.spot==='explore'?'Choose a section':views[r.view].dataset.label;
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

/* ---------- per-view setup ---------- */
var revealIO=('IntersectionObserver' in window)? new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); revealIO.unobserve(e.target);} }); },{threshold:0.18, rootMargin:'0px 0px -6% 0px'}) : null;
function arm(sel,ctx){ $$(sel,ctx).forEach(function(el){ if(revealIO && !reduce){ el.classList.remove('in'); revealIO.observe(el);} else el.classList.add('in'); }); }
function setPans(){
  $$('.fview').forEach(function(v){ var img=v.querySelector('img'); if(!img) return; var d=img.offsetHeight-v.offsetHeight; img.style.setProperty('--pan',(d>0?-d:0)+'px'); });
}
$$('.fview img').forEach(function(i){ i.addEventListener('load',setPans); });
function onViewShown(v){
  if(v==='projects'){ arm('.proj',views.projects); arm('.rv',views.projects); setPans(); }
  if(v==='experience'){ arm('.rv',views.experience); arm('.proj',views.experience); arm('.pub-card',views.experience); }
  if(v==='skills'){ sizeSkills(); arm('.rv',views.skills); }
  if(v==='contact'){ sizeRadar(); arm('.rv',views.contact); }
  if(v==='home' && gl) gl.size();
}
addEventListener('resize',function(){ setPans(); sizeSkills(); sizeRadar(); if(gl) gl.size(); if(lenis) lenis.resize(); });

/* timeline fill */
var tline=$('#tline'), tfill=tline?tline.querySelector('.tfill'):null, tItems=tline?$$('.tl-item',tline):[];
function updateTL(){
  if(current!=='experience'||!tline) return;
  var r=tline.getBoundingClientRect(), mid=innerHeight*0.6;
  tfill.style.setProperty('--f',clamp((mid-r.top)/r.height,0,1));
  tItems.forEach(function(li){ if(li.hidden) return; li.classList.toggle('lit', li.querySelector('.tl-dot').getBoundingClientRect().top<mid); });
}
$$('.tl-card').forEach(function(c){ c.addEventListener('pointermove',function(e){ var r=c.getBoundingClientRect(); c.style.setProperty('--mx',(e.clientX-r.left)+'px'); c.style.setProperty('--my',(e.clientY-r.top)+'px'); }); });
$$('.tfilter button').forEach(function(b){ b.addEventListener('click',function(){
  $$('.tfilter button').forEach(function(x){ x.classList.toggle('on',x===b); });
  var f=b.dataset.f, n=0;
  tItems.forEach(function(li){ var show=f==='all'||li.dataset.type===f; li.hidden=!show; if(show){ li.classList.remove('l','r'); li.classList.add(n%2?'r':'l'); li.classList.remove('in'); void li.offsetWidth; li.classList.add('in'); n++; } });
  if(lenis) lenis.resize();
}); });

/* ---------- picker tilt & spotlight ---------- */
$$('.pick').forEach(function(el){
  el.addEventListener('pointermove',function(e){
    var r=el.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
    el.style.setProperty('--mx',(x*100)+'%'); el.style.setProperty('--my',(y*100)+'%');
    if(fine && !reduce) el.style.transform='perspective(700px) rotateX('+((0.5-y)*14)+'deg) rotateY('+((x-0.5)*16)+'deg) translateZ(10px)';
  });
  el.addEventListener('pointerleave',function(){ el.style.transform=''; });
});

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


/* ---------- experience canvases ---------- */
var X={
  dash:function(g,t,st,C){
    var x=g.x,w=g.w,h=g.h, pad=w*0.05, gw=(w-pad*3)/2;
    function card(X0,Y0,W,H){ x.fillStyle=hexA(C.ink,0.05); x.strokeStyle=hexA(C.ink,0.08); x.beginPath(); x.roundRect?x.roundRect(X0,Y0,W,H,10):x.rect(X0,Y0,W,H); x.fill(); x.stroke(); }
    var kh=h*0.2, labels=['Active users','Retention','Tickets closed'], vals=[12480,87,342];
    var kw=(w-pad*4)/3;
    for(var i=0;i<3;i++){ var X0=pad+i*(kw+pad), Y0=pad; card(X0,Y0,kw,kh);
      var k=clamp((t-0.2*i)%8/1.6,0,1), v=Math.round(vals[i]*(0.6+0.4*k)+Math.sin(t+i)*vals[i]*0.01);
      x.fillStyle=hexA(C.ink,0.55); x.font='500 '+Math.max(10,kh*0.17)+'px "IBM Plex Sans",sans-serif'; x.fillText(labels[i],X0+12,Y0+kh*0.36);
      x.fillStyle=i===1?C.cyan:C.ink; x.font='700 '+Math.max(14,kh*0.36)+'px "Bricolage Grotesque",sans-serif'; x.fillText(v.toLocaleString()+(i===1?'%':''),X0+12,Y0+kh*0.8); }
    var Y1=pad*2+kh, H1=h-Y1-pad; card(pad,Y1,gw*1.25,H1);
    x.beginPath(); for(var j=0;j<=40;j++){ var u=j/40, yy=Y1+H1*0.8-(0.3+0.45*u+0.12*Math.sin(u*9+t*1.2))*H1*0.65; var xx=pad+14+u*(gw*1.25-28); j?x.lineTo(xx,yy):x.moveTo(xx,yy);} x.strokeStyle=C.violet; x.lineWidth=2.5; x.stroke();
    x.lineTo(pad+gw*1.25-14,Y1+H1*0.85); x.lineTo(pad+14,Y1+H1*0.85); x.closePath(); var gr=x.createLinearGradient(0,Y1,0,Y1+H1); gr.addColorStop(0,hexA(C.violet,0.3)); gr.addColorStop(1,hexA(C.violet,0)); x.fillStyle=gr; x.fill();
    var X2=pad*2+gw*1.25, W2=w-X2-pad; card(X2,Y1,W2,H1);
    var cxx=X2+W2/2, cyy=Y1+H1/2, rr=Math.min(W2,H1)*0.32, parts=[0.42,0.28,0.18,0.12], cols=[C.violet,C.cyan,C.warm,hexA(C.ink,0.3)], a0=-Math.PI/2+t*0.15;
    parts.forEach(function(pp,i){ var a1=a0+pp*Math.PI*2*clamp((t%8)/1.5,0,1); x.beginPath(); x.arc(cxx,cyy,rr,a0,a1); x.strokeStyle=cols[i]; x.lineWidth=rr*0.38; x.stroke(); a0=a1+0.04; });
  },
  bubble:function(g,t,st,C){
    var x=g.x,w=g.w,h=g.h, vx=w*0.08, vy=h*0.12, vw=w*0.34, vh=h*0.76;
    x.strokeStyle=hexA(C.ink,0.3); x.lineWidth=2; x.beginPath(); x.roundRect?x.roundRect(vx,vy,vw,vh,[8,8,28,28]):x.rect(vx,vy,vw,vh); x.stroke();
    var lg=x.createLinearGradient(0,vy,0,vy+vh); lg.addColorStop(0,hexA(C.violet,0.06)); lg.addColorStop(1,hexA(C.violet,0.22)); x.fillStyle=lg; x.fillRect(vx+2,vy+vh*0.18,vw-4,vh*0.8);
    x.fillStyle=hexA(C.ink,0.5); x.font='500 11px "IBM Plex Sans",sans-serif'; x.fillText('superheated liquid',vx,vy-8);
    if(!st.b){ st.b=[]; st.last=0; st.trace=[]; st.kind='n'; }
    if(t-st.last>1.6){ st.last=t; st.kind=Math.random()<0.5?'n':'γ'; st.b.push({x:vx+vw*(0.25+Math.random()*0.5), y:vy+vh*0.85, r:1, k:st.kind}); st.t0=t; }
    st.b=st.b.filter(function(b){ b.y-=0.9; b.r=Math.min(b.r+0.25,10); x.beginPath(); x.arc(b.x+Math.sin(b.y*0.08)*2,b.y,b.r,0,7); x.strokeStyle=b.k==='n'?C.warm:C.cyan; x.lineWidth=1.8; x.stroke(); return b.y>vy+vh*0.2; });
    var gx=w*0.5, gy=h*0.22, gw2=w*0.44, gh=h*0.5, mid=gy+gh/2, dt=t-(st.t0||0);
    x.strokeStyle=hexA(C.ink,0.1); x.lineWidth=1; x.strokeRect(gx,gy,gw2,gh);
    x.beginPath(); for(var i=0;i<=gw2;i+=2){ var u=i/gw2, e=0, d=u-0.2; if(d>0 && dt<1.6){ var A=st.kind==='n'?1:0.45, f=st.kind==='n'?40:95; e=A*Math.exp(-d*6)*Math.sin(d*f)*clamp(dt*3,0,1); } var y=mid-(e+(Math.random()-0.5)*0.05)*gh*0.42; i?x.lineTo(gx+i,y):x.moveTo(gx+i,y);} x.strokeStyle=st.kind==='n'?C.warm:C.cyan; x.lineWidth=1.8; x.stroke();
    x.font='700 '+Math.max(16,h*0.09)+'px "Bricolage Grotesque",sans-serif'; x.fillStyle=st.kind==='n'?C.warm:C.cyan; x.fillText(st.kind==='n'?'neutron':'gamma',gx,gy+gh+h*0.12);
    x.font='500 11px "IBM Plex Sans",sans-serif'; x.fillStyle=hexA(C.ink,0.55); x.fillText('acoustic pulse',gx,gy-8);
  },
  chat:function(g,t,st,C){
    var x=g.x,w=g.w,h=g.h, msgs=[[0,0.5],[1,0.62],[0,0.38],[1,0.7],[0,0.44]], cyc=t%10, lh=h*0.14, y=h*0.1;
    msgs.forEach(function(m,i){ var at=i*1.5; if(cyc<at) return; var k=clamp((cyc-at)/0.4,0,1), bw=w*m[1]*0.8, bx=m[0]?w-bw-w*0.07:w*0.07, yy=y+i*(lh+h*0.04)+(1-k)*10;
      x.globalAlpha=k; x.fillStyle=m[0]?hexA(C.violet,0.9):hexA(C.ink,0.08); x.beginPath(); x.roundRect?x.roundRect(bx,yy,bw,lh,[14,14,m[0]?4:14,m[0]?14:4]):x.rect(bx,yy,bw,lh); x.fill();
      var typing=m[0] && cyc-at<1.0;
      if(typing){ for(var d=0;d<3;d++){ x.beginPath(); x.arc(bx+20+d*12,yy+lh/2+Math.sin(t*8+d)*2,3,0,7); x.fillStyle='#fff'; x.fill(); } }
      else { x.fillStyle=m[0]?'rgba(255,255,255,.75)':hexA(C.ink,0.3); var lw=(bw-28); x.fillRect(bx+14,yy+lh*0.32,lw*0.9,lh*0.12); x.fillRect(bx+14,yy+lh*0.58,lw*0.55,lh*0.12); }
      x.globalAlpha=1; });
  },
  arm:function(g,t,st,C){
    var x=g.x,w=g.w,h=g.h, bx=w*0.5, by=h*0.92, L1=h*0.36, L2=h*0.3;
    var tx=bx+Math.sin(t*0.9)*w*0.24, ty=h*0.38+Math.sin(t*1.7)*h*0.14;
    if(!st.tr) st.tr=[]; st.tr.push([tx,ty]); if(st.tr.length>70) st.tr.shift();
    x.beginPath(); st.tr.forEach(function(q,i){ i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]); }); x.strokeStyle=hexA(C.cyan,0.5); x.lineWidth=2; x.setLineDash([3,5]); x.stroke(); x.setLineDash([]);
    var dx=tx-bx, dy=ty-by, D=Math.min(Math.hypot(dx,dy),L1+L2-1), a2=Math.acos(clamp((D*D-L1*L1-L2*L2)/(2*L1*L2),-1,1)), a1=Math.atan2(dy,dx)-Math.atan2(L2*Math.sin(a2),L1+L2*Math.cos(a2));
    var ex=bx+Math.cos(a1)*L1, ey=by+Math.sin(a1)*L1, hx=ex+Math.cos(a1+a2)*L2, hy=ey+Math.sin(a1+a2)*L2;
    x.fillStyle=hexA(C.ink,0.15); x.fillRect(bx-w*0.08,by-6,w*0.16,12);
    x.lineCap='round'; x.strokeStyle=C.violet; x.lineWidth=h*0.06; x.beginPath(); x.moveTo(bx,by); x.lineTo(ex,ey); x.stroke();
    x.strokeStyle=hexA(C.violet,0.75); x.lineWidth=h*0.045; x.beginPath(); x.moveTo(ex,ey); x.lineTo(hx,hy); x.stroke(); x.lineCap='butt';
    [[bx,by],[ex,ey]].forEach(function(q){ x.beginPath(); x.arc(q[0],q[1],h*0.035,0,7); x.fillStyle=C.ink; x.fill(); });
    x.beginPath(); x.arc(hx,hy,h*0.03,0,7); x.fillStyle=C.cyan; x.fill();
    x.beginPath(); x.arc(tx,ty,h*0.06+Math.sin(t*6)*2,0,7); x.strokeStyle=hexA(C.cyan,0.8); x.lineWidth=1.5; x.stroke();
  },
  circuit:function(g,t,st,C){
    var x=g.x,w=g.w,h=g.h;
    if(!st.p||st.w!==w){ st.w=w; st.p=[]; var rows=6; for(var i=0;i<rows;i++){ var y=h*(0.15+i*0.14), pts=[[0,y]], xx=0, yy=y; while(xx<w){ xx+=w*(0.08+Math.random()*0.14); if(Math.random()<0.4){ var ny=clamp(yy+(Math.random()<0.5?-1:1)*h*0.07,h*0.08,h*0.92); pts.push([xx,yy]); xx+=Math.abs(ny-yy); yy=ny; } pts.push([Math.min(xx,w),yy]); } st.p.push({pts:pts,sp:0.1+Math.random()*0.15,off:Math.random()}); } }
    st.p.forEach(function(tr,i){ x.beginPath(); tr.pts.forEach(function(q,j){ j?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]); }); x.strokeStyle=hexA(C.ink,0.14); x.lineWidth=2; x.stroke();
      tr.pts.forEach(function(q,j){ if(j%3===2){ x.beginPath(); x.arc(q[0],q[1],3.5,0,7); x.fillStyle=hexA(C.cyan,0.5); x.fill(); } });
      var L=0, seg=[]; for(var j=1;j<tr.pts.length;j++){ var d=Math.hypot(tr.pts[j][0]-tr.pts[j-1][0],tr.pts[j][1]-tr.pts[j-1][1]); seg.push(d); L+=d; }
      var pos=((t*tr.sp+tr.off)%1)*L, acc=0;
      for(var k=0;k<seg.length;k++){ if(acc+seg[k]>=pos){ var f=(pos-acc)/seg[k], a=tr.pts[k], b=tr.pts[k+1], px=a[0]+(b[0]-a[0])*f, py=a[1]+(b[1]-a[1])*f; var gr=x.createRadialGradient(px,py,0,px,py,14); gr.addColorStop(0,hexA(i%2?C.violet:C.cyan,0.9)); gr.addColorStop(1,hexA(i%2?C.violet:C.cyan,0)); x.fillStyle=gr; x.beginPath(); x.arc(px,py,14,0,7); x.fill(); break; } acc+=seg[k]; }
    });
    var cw=w*0.18, ch=h*0.34; x.fillStyle=css('--solid'); x.strokeStyle=hexA(C.ink,0.35); x.lineWidth=1.5; x.beginPath(); x.roundRect?x.roundRect(w/2-cw/2,h/2-ch/2,cw,ch,6):x.rect(w/2-cw/2,h/2-ch/2,cw,ch); x.fill(); x.stroke();
    for(var q=0;q<5;q++){ x.fillStyle=hexA(C.ink,0.35); x.fillRect(w/2-cw/2-6,h/2-ch/2+8+q*(ch-16)/4-1.5,6,3); x.fillRect(w/2+cw/2,h/2-ch/2+8+q*(ch-16)/4-1.5,6,3); }
    x.fillStyle=C.violet; x.font='700 12px "Bricolage Grotesque",sans-serif'; x.textAlign='center'; x.fillText('ECE',w/2,h/2+4); x.textAlign='left';
  }
};
var xcs=$$('canvas[data-anim]',views.experience).map(function(c){ return {c:c,type:c.dataset.anim,st:{},vis:false}; });
if('IntersectionObserver' in window){ var xio=new IntersectionObserver(function(es){ es.forEach(function(e){ xcs.forEach(function(k){ if(k.c===e.target) k.vis=e.isIntersecting; }); }); }); xcs.forEach(function(k){ xio.observe(k.c); }); } else xcs.forEach(function(k){ k.vis=true; });
function drawExp(t){
  var C={ink:css('--ink'),violet:css('--violet'),cyan:css('--cyan'),warm:css('--warm')};
  xcs.forEach(function(k){ if(!k.vis) return; var g2=sizeCanvas(k.c); if(!g2) return; g2.x.clearRect(0,0,g2.w,g2.h); X[k.type](g2,t,k.st,C); });
}

/* ---------- scroll past the end to go back to the choices ---------- */
var RT={p:0,last:0,fired:false,ty:null,base:0};
function retBox(){ return current && current!=='home' ? views[current].querySelector('.return') : null; }
function atEnd(){ return innerHeight+scrollY >= document.documentElement.scrollHeight-3; }
function feed(amount){
  if(current==='home'||busy||RT.fired||body.classList.contains('menu-open')) return;
  if(!atEnd()) return;
  RT.p=clamp(RT.p+amount,0,1); RT.last=performance.now();
}
addEventListener('wheel',function(e){ if(e.deltaY>0) feed(Math.min(e.deltaY,120)/900); },{passive:true});
addEventListener('touchstart',function(e){ RT.ty=e.touches[0].clientY; RT.base=RT.p; },{passive:true});
addEventListener('touchmove',function(e){ if(RT.ty===null) return; var dy=RT.ty-e.touches[0].clientY; if(dy>0 && atEnd()){ RT.p=clamp(RT.base+dy/320,0,1); RT.last=performance.now(); } },{passive:true});
addEventListener('touchend',function(){ RT.ty=null; },{passive:true});
function updateReturn(now){
  var b=retBox(); if(!b) return;
  if(!RT.fired && now-RT.last>380) RT.p*=0.92;
  if(RT.p<0.002) RT.p=0;
  b.style.setProperty('--rp',RT.p.toFixed(3));
  b.classList.toggle('hot',RT.p>0.05);
  if(RT.p>=1 && !RT.fired){
    RT.fired=true; b.classList.add('done');
    var r=b.querySelector('.ret-ring').getBoundingClientRect(); clickX=r.left+r.width/2; clickY=r.top+r.height/2;
    setTimeout(function(){ location.hash='explore'; },350);
  }
}
function resetReturn(){ RT.p=0; RT.fired=false; $$('.return').forEach(function(b){ b.classList.remove('done','hot'); b.style.setProperty('--rp',0); }); }

/* ---------- contact radar ---------- */
var radar=$('#radar'), rg=null;
function sizeRadar(){ rg=sizeCanvas(radar); }
function drawRadar(t){
  if(!rg) sizeRadar(); if(!rg) return; var x=rg.x,w=rg.w,h=rg.h, cx=w*0.78, cy=h*0.42, R=Math.max(w,h)*0.55;
  x.clearRect(0,0,w,h); var vi=css('--violet'), cy2=css('--cyan');
  for(var i=1;i<=5;i++){ x.beginPath(); x.arc(cx,cy,R*i/5,0,7); x.strokeStyle=hexA(css('--ink'),0.06); x.lineWidth=1; x.stroke(); }
  var a=t*0.6; var gr=x.createConicGradient? x.createConicGradient(a-0.8,cx,cy):null;
  if(gr){ gr.addColorStop(0,hexA(vi,0)); gr.addColorStop(0.12,hexA(vi,0.22)); gr.addColorStop(0.13,hexA(vi,0)); gr.addColorStop(1,hexA(vi,0)); x.fillStyle=gr; x.beginPath(); x.arc(cx,cy,R,0,7); x.fill(); }
  var blips=[[0.3,1.2],[0.55,2.6],[0.8,4.3],[0.42,5.4]]; blips.forEach(function(b){ var ang=b[1], d=(( a - ang)%(Math.PI*2)+Math.PI*2)%(Math.PI*2), s=Math.max(0,1-d/2.5); x.beginPath(); x.arc(cx+Math.cos(ang)*R*b[0],cy+Math.sin(ang)*R*b[0],3+s*4,0,7); x.fillStyle=hexA(cy2,0.15+s*0.8); x.fill(); });
}
/* magnetic email */
var copyBtn=$('#copyMail');
copyBtn.addEventListener('click',function(){
  var addr='daschandrima2005@gmail.com', done=function(){ copyBtn.classList.add('ok'); copyBtn.firstChild.textContent='Copied'; setTimeout(function(){ copyBtn.classList.remove('ok'); copyBtn.firstChild.textContent='Copy'; },1800); };
  try{ if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(addr).then(done,function(){ fallback(); }); } else fallback(); }catch(e){ fallback(); }
  function fallback(){ var t=document.createElement('textarea'); t.value=addr; t.style.position='fixed'; t.style.opacity='0'; document.body.appendChild(t); t.select(); try{ document.execCommand('copy'); done(); }catch(e){} t.remove(); }
});
if(views.contact) {}

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

/* ---------- loader: falling letters ---------- */
function startSite(){ body.classList.add('ready'); }
var loader=$('#loader');
if(reduce){ loader.remove(); startSite(); }
else{
  var ra=$('#ldA'), rb=$('#ldB'), cap=$('#ldCap');
  function letter(row,ch,cls,delay){ var sp=document.createElement('span'); sp.className='ld-l'; sp.textContent=ch; sp.style.setProperty('--r',((Math.random()*2-1)*45)+'deg'); sp.style.animationDelay=delay+'s'; sp.dataset.cls=cls; row.appendChild(sp); return sp; }
  var all=[];
  'Chandrima'.split('').forEach(function(ch,i){ all.push(letter(ra,ch,'fall',0.05+i*0.09)); });
  var dBase=0.05+9*0.09+0.12;
  all.push(letter(rb,'D','left',dBase), letter(rb,'a','fall',dBase+0.14), letter(rb,'s','right',dBase+0.06));
  var go=function(){
    all.forEach(function(sp){ sp.classList.add(sp.dataset.cls); });
    var end=(dBase+0.14+1.0)*1000;
    setTimeout(function(){ cap.classList.add('on'); ra.classList.add('wave'); ra.querySelectorAll('.ld-l').forEach(function(sp,i){ sp.style.animationDelay=(i*0.04)+'s'; }); },end);
    setTimeout(function(){ loader.classList.add('done'); },end+900);
    setTimeout(startSite,end+1250);
    setTimeout(function(){ loader.remove(); },end+2000);
  };
  var started=false, kick=function(){ if(!started){ started=true; go(); } };
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(kick);
  setTimeout(kick,900);
}

/* ---------- boot ---------- */
gl=initGL();
route();

var t0g=performance.now();
function loop(now){
  if(lenis) lenis.raf(now);
  var t=(now-t0g)/1000;
  if(current==='home'){
    readP(); ps+= (p-ps)*(reduce?1:0.14); if(Math.abs(p-ps)<0.0005) ps=p;
    updateActs();
    if(gl) gl.render(t,ps);
  }
  if(current==='skills') drawSkills(t);
  if(current==='contact') drawRadar(t);
  if(current==='experience'){ updateTL(); drawExp(t); }
  if(current!=='home') updateReturn(now);
  if(fine && !reduce){ rx+=(cx-rx)*0.18; ry+=(cy-ry)*0.18; cdot.style.transform='translate('+cx+'px,'+cy+'px)'; cring.style.transform='translate('+rx+'px,'+ry+'px)'; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
