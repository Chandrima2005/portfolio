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
/* the six project tiles are squares: pick the biggest square that lets all of them fit the space
   (3 x 2 on wide screens, 2 x 3 on tablets; phones keep their slim rows) */
function squareGrid(){
  var g=$('.pgrid'); if(!g) return;
  g.style.gridTemplateColumns=''; g.style.gridTemplateRows='';
  if(innerWidth<=640) return;
  var cols=innerWidth<=1000?2:3, rows=Math.ceil(6/cols), gap=parseFloat(getComputedStyle(g).columnGap)||16;
  var sq=Math.floor(Math.min((g.clientWidth-gap*(cols-1))/cols, (g.clientHeight-gap*(rows-1))/rows));
  if(sq<120) return;
  g.style.gridTemplateColumns='repeat('+cols+','+sq+'px)'; g.style.gridTemplateRows='repeat('+rows+','+sq+'px)';
}
/* pages never scroll inside, so on a short screen a page's content shrinks until it fits */
function fitPages(){
  pages.forEach(function(pg){
    var w=pg.querySelector(':scope > .wrap'); if(!w) return;
    pg.classList.add('measure'); w.style.zoom='';
    if(pg.id==='projects') squareGrid();
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
  if(here) here.textContent=pages[i].dataset.label;
  markLinks(id);
  /* the address bar follows the page: /, /projects, /experience ... */
  var path=id==='home'?'/':'/'+id;
  if(current==='home' && location.pathname!==path) history.replaceState(null,'',path+location.search);
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

/* ---------- WebGL flowing contour field ----------
   A full-screen liquid gradient in the theme colours with thin glowing contour lines drifting
   through it, like a living topographic map of a signal. Each page turn shifts the flow and the
   colour balance; the mouse gently bends the currents. Same interface: theme(), size(), render(t,f). */
var gl=null;
function initGL(){
  if(!window.THREE) return null;
  var canvas=$('#gl'), renderer;
  try{ renderer=new THREE.WebGLRenderer({canvas:canvas, antialias:false, alpha:true, powerPreference:'high-performance'}); }catch(e){ return null; }
  var mobile=innerWidth<760;
  var scene=new THREE.Scene(), cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  var uni={uT:{value:0}, uRes:{value:new THREE.Vector2(1,1)}, uMouse:{value:new THREE.Vector2(0,0)}, uPage:{value:0},
           uA:{value:new THREE.Color()}, uB:{value:new THREE.Color()}, uC:{value:new THREE.Color()}, uDark:{value:0}};
  var mat=new THREE.ShaderMaterial({uniforms:uni, transparent:true, depthWrite:false, depthTest:false,
    vertexShader:'void main(){ gl_Position=vec4(position.xy,0.,1.); }',
    fragmentShader:[
      'precision highp float;',
      'uniform float uT,uPage,uDark; uniform vec2 uRes,uMouse; uniform vec3 uA,uB,uC;',
      'float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
      'float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);',
      '  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }',
      'float fbm(vec2 p){ float v=0., a=.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<4;i++){ v+=a*n(p); p=m*p; a*=.5; } return v; }',
      'void main(){',
      '  vec2 uv=gl_FragCoord.xy/uRes; vec2 p=(uv-.5)*vec2(uRes.x/uRes.y,1.)*1.15;',
      '  p+=uMouse*vec2(.18,.12);',
      '  float t=uT*.045+uPage*.55;',
      /* domain warping: the field flows into itself, which gives the liquid look */
      '  vec2 q=vec2(fbm(p+vec2(0.,t)), fbm(p+vec2(5.2,1.3)-t));',
      '  vec2 r=vec2(fbm(p+3.*q+vec2(1.7,9.2)+t*1.4), fbm(p+3.*q+vec2(8.3,2.8)-t*1.1));',
      '  float f=fbm(p+2.6*r);',
      /* colour: violet to cyan by the flow, the warm accent where the currents twist */
      '  float shift=.5+.5*sin(uPage*1.1);',
      '  vec3 col=mix(uA,uB,smoothstep(.36,.7,f+(shift-.5)*.18));  /* keep colours mostly pure: a quick handover, not a long grey mix */',
      '  col=mix(col,uC,clamp(length(q-.5)*1.3-.25,0.,1.)*.55);',
      '  float body=smoothstep(.18,.82,f);',
      /* thin contour lines, anti-aliased with screen-space derivatives of the field */
      /* distance to the nearest contour, measured in pixels so every line stays about one pixel thin */
      '  float lv=f*9., line=clamp(1.-abs(fract(lv)-.5)*2./max(fwidth(lv)*1.2,.0001),0.,1.);',
      '  float mv=f*3., major=clamp(1.-abs(fract(mv)-.5)*2./max(fwidth(mv)*1.4,.0001),0.,1.);',
      '  float edge=smoothstep(.0,.35,uv.y)*smoothstep(1.,.65,uv.y)*.35+.65;',
      '  float a=(uDark>.5? .5 : .38)*body + line*(uDark>.5? .3 : .2)*(.4+body) + major*(uDark>.5? .4 : .26)*(.3+body);',
      '  a*=edge;',
      '  float g=(h(gl_FragCoord.xy+fract(uT))-.5)*.035;',          /* a whisper of film grain */
      '  gl_FragColor=vec4(col+g, clamp(a,0.,1.));',
      '}'].join('\n'),
    extensions:{derivatives:true}
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat));
  function theme(){
    uni.uA.value.set(css('--pA')); uni.uB.value.set(css('--pB')); uni.uC.value.set(css('--pC'));
    uni.uDark.value=css('--blend')==='additive'?1:0;
  }
  function size(){
    /* a smooth field needs little resolution: render a bit below screen pixels to stay light */
    var pr=Math.min(devicePixelRatio,1.5)*(mobile?.6:1);
    renderer.setPixelRatio(pr); renderer.setSize(innerWidth,innerHeight,false);
    uni.uRes.value.set(innerWidth*pr, innerHeight*pr);
  }
  theme(); size();
  var mx=0,my=0,cmx=0,cmy=0;
  addEventListener('pointermove',function(e){ mx=e.clientX/innerWidth*2-1; my=-(e.clientY/innerHeight*2-1); },{passive:true});
  return {
    theme:theme, size:size,
    render:function(t,f){
      cmx+=(mx-cmx)*.03; cmy+=(my-cmy)*.03;
      uni.uT.value=t; uni.uPage.value=f; uni.uMouse.value.set(cmx,cmy);
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
  /* old links used #projects or #gradient-atlas: turn them into paths */
  var h=location.hash.slice(1);
  if(h){
    var to=h==='projects-more'?'/projects': PAGE[h]!==undefined?(h==='home'?'/':'/'+h) : (views[h]&&h!=='home'?'/projects/'+h:null);
    if(to) history.replaceState(null,'',to+location.search);
  }
  var parts=location.pathname.replace(/\/+$/,'').split('/').filter(Boolean);
  if(parts[0]==='projects' && parts[1] && views[parts[1]] && parts[1]!=='home') return {view:parts[1]};
  if(parts.length===1 && PAGE[parts[0]]!==undefined) return {view:'home',page:PAGE[parts[0]]};
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
    var card=prev && prev!=='home' ? $('.card h3 a[href="/projects/'+prev+'"]') : null;
    var page=card? pages.indexOf(card.closest('.pg')) : r.page;
    pi=-1; setPage(page,true); ps=p;
  } else {
    if(here) here.textContent='Projects'; markLinks('projects');
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
function go(path){ if(path!==location.pathname) history.pushState(null,'',path+location.search); route(); }
addEventListener('popstate',route);
/* internal links change the path without reloading; a link to another landing page just slides there */
document.addEventListener('click',function(e){
  if(e.defaultPrevented || e.button!==0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  var a=e.target.closest('a[href^="/"]'); if(!a || a.target==='_blank') return;
  e.preventDefault(); if(typeof closePeek==='function') closePeek();
  var href=a.getAttribute('href'), id=href.replace(/^\/+|\/+$/g,'')||'home';
  if(current==='home' && PAGE[id]!==undefined){ setMenu(false); setPage(PAGE[id]); return; }
  go(href);
});
/* keyboard on a project: Esc goes back, arrows step through projects */
document.addEventListener('keydown',function(e){
  if(current==='home'||busy||body.classList.contains('menu-open')) return;
  var v=views[current], to=null;
  if(e.key==='Escape') to='/projects';
  if(e.key==='ArrowLeft') to=v.querySelector('.pd-prev').getAttribute('href');
  if(e.key==='ArrowRight') to=v.querySelector('.pd-next').getAttribute('href');
  if(to){ clickX=innerWidth/2; clickY=innerHeight/2; go(to); }
});

/* ---------- per-view setup ---------- */
function setPans(){
  $$('.fview').forEach(function(v){ var img=v.querySelector('img'); if(!img) return; var d=img.offsetHeight-v.offsetHeight; img.style.setProperty('--pan',(d>0?-d:0)+'px'); img.style.setProperty('--pt',clamp(d/160,4,18).toFixed(1)+'s'); img.style.setProperty('--pa',clamp(d/70,6,30).toFixed(1)+'s'); });
}
$$('.fview img').forEach(function(i){ i.addEventListener('load',setPans); });
/* ---------- peek: hovering a project card opens it big, in a box in the middle of the screen ----------
   The box zooms out of the card, shows the live preview scrolling plus the project's details (taken from
   its detail page), and shrinks back into the card when the mouse leaves both, on scroll, or on Esc. */
var peek=$('#peek'), pkBox=$('#pkBox'), pkImg=$('#pkImg'), peekCard=null, openT=0, closeT=0;
var canPeek=matchMedia('(hover:hover) and (min-width:1001px)');
function fillPeek(card){
  var slug=card.querySelector('h3 a').getAttribute('href').split('/').pop(), v=views[slug]; if(!v) return false;
  var pr=v.querySelector('.proj'), links=pr.querySelectorAll('.plinks a'), img=card.querySelector('.fview img');
  ['--glow','--glowtxt'].forEach(function(k){ pkBox.style.setProperty(k,card.style.getPropertyValue(k)); });
  $('#pkKind').textContent=pr.querySelector('.kind').textContent;
  $('#pkName').textContent=pr.querySelector('h1').textContent;
  $('#pkTag').textContent=pr.querySelector('.tagline').textContent;
  $('#pkDesc').textContent=pr.querySelector('.desc').textContent;
  $('#pkFacts').innerHTML=pr.querySelector('.facts').innerHTML;
  $('#pkUrl').textContent=pr.querySelector('.fbar span').textContent;
  $('#pkShot').href=links[0].href; $('#pkGo').href=links[0].href; $('#pkSrc').href=links[1].href;
  $('#pkMore').setAttribute('href','/projects/'+slug);
  if(pkImg.getAttribute('src')!==img.getAttribute('src')) pkImg.src=img.getAttribute('src');
  pkImg.alt=img.alt;
  return true;
}
/* the box zooms in place, in the middle of the screen: from 90% to full size while fading in,
   leaning a little from the side of the card you hovered. Small scale changes stay sharp and cheap. */
function lean(card){
  var c=card.getBoundingClientRect(), dx=(c.left+c.width/2-innerWidth/2)*.06, dy=(c.top+c.height/2-innerHeight/2)*.06;
  return 'translate3d('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px,0) scale(.9)';
}
function openPeek(card){
  if(!fillPeek(card)) return;
  clearTimeout(closePeek.t); clearTimeout(openPeek.t); clearTimeout(closeT);
  if(peekCard && peekCard!==card) peekCard.classList.remove('peeked');
  peekCard=card; card.classList.add('peeked');
  card.parentNode.classList.add('used');  /* the visitor has found the preview: retire the "Hover to preview" tag */
  /* wait until the screenshot is decoded, so the zoom never stalls on it */
  var ready=pkImg.decode? pkImg.decode().catch(function(){}) : Promise.resolve();
  ready.then(function(){
    if(peekCard!==card) return;
    /* if the box is still fading out, carry on from where it is instead of jumping */
    var leaving=peek.classList.contains('leaving'), curT=leaving?getComputedStyle(pkBox).transform:'', curO=leaving?getComputedStyle(pkBox).opacity:'0';
    peek.classList.remove('shown','leaving');
    peek.classList.add('open'); peek.setAttribute('aria-hidden','false');
    if(reduce){ pkBox.style.transition='none'; pkBox.style.transform='none'; pkBox.style.opacity='1'; peek.classList.add('shown'); setPans(); return; }
    pkBox.style.transition='none'; pkBox.style.transform=leaving&&curT!=='none'?curT:lean(card); pkBox.style.opacity=curO;
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      if(peekCard!==card) return;
      pkBox.style.transition='transform .5s cubic-bezier(.22,1,.36,1), opacity .3s ease-out';
      pkBox.style.transform='translate3d(0,0,0) scale(1)'; pkBox.style.opacity='1';
      openPeek.t=setTimeout(function(){ if(peekCard===card){ peek.classList.add('shown'); setPans(); } },200);
    }); });
  });
}
function closePeek(){
  clearTimeout(openT); clearTimeout(closeT); clearTimeout(openPeek.t); openT=0;
  var card=peekCard; if(!card) return;
  peekCard=null; card.classList.remove('peeked'); peek.setAttribute('aria-hidden','true'); peek.classList.remove('shown');
  if(reduce){ peek.classList.remove('open'); return; }
  /* a gentle reverse of the opening: the text fades first, then the box eases back toward its card
     while the dim fades with it; cards underneath can be hovered again straight away */
  peek.classList.add('leaving');
  pkBox.style.transition='transform .55s cubic-bezier(.33,1,.68,1), opacity .45s cubic-bezier(.33,1,.68,1) .05s';
  pkBox.style.transform=lean(card); pkBox.style.opacity='0';
  closePeek.t=setTimeout(function(){ if(!peekCard) peek.classList.remove('open','leaving'); },600);
}
/* hovering a card, or simply moving over it again after the box closed, opens it */
function armPeek(card,e){
  if(e.pointerType!=='mouse' || !canPeek.matches || busy || peekCard || openT) return;
  openT=setTimeout(function(){ openT=0; openPeek(card); },180);
}
$$('.pgrid > .card:not(.card-more)').forEach(function(card){
  card.addEventListener('pointerenter',function(e){ armPeek(card,e); });
  card.addEventListener('pointermove',function(e){ armPeek(card,e); });
  card.addEventListener('pointerleave',function(){ if(!peekCard){ clearTimeout(openT); openT=0; } });
  /* clicking anywhere on a tile (outside its own links) opens the project page */
  card.addEventListener('click',function(e){
    if(e.target.closest('a')) return;
    var a=card.querySelector('h3 a'); if(a) a.click();
  });
});
/* while open, the box stays as long as the mouse is over it or over the card it came from */
peek.addEventListener('pointermove',function(e){
  if(!peekCard) return;
  var r=peekCard.getBoundingClientRect(), inCard=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
  clearTimeout(closeT);
  if(!pkBox.contains(e.target) && !inCard) closeT=setTimeout(closePeek,260);
});
/* leaving the window closes it; a box that is already fading out ignores this, so it can't close the next one */
peek.addEventListener('pointerleave',function(){ if(!peekCard || peek.classList.contains('leaving')) return; clearTimeout(closeT); closeT=setTimeout(closePeek,200); });
peek.addEventListener('click',function(e){ if(!pkBox.contains(e.target)) closePeek(); });
addEventListener('wheel',function(){ if(peekCard) closePeek(); },{passive:true});
document.addEventListener('keydown',function(e){ if(peekCard && /^(Escape|Arrow|Page|Home|End| )/.test(e.key)) closePeek(); });
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


/* ---------- "Currently" panel: the highlight moves row to row; hovering a row holds it there ---------- */
(function(){
  var box=$('#now'), rows=$$('.now-row',box), k=0, timer=0, DUR=4200;
  if(!box || rows.length<2) return;
  box.style.setProperty('--nd',DUR+'ms');
  function show(i,hold){
    k=i;
    rows.forEach(function(r,j){ r.classList.toggle('on',j===i); r.classList.remove('tick','held'); });
    void rows[i].offsetWidth;
    rows[i].classList.add(hold?'held':'tick');
  }
  function run(){ clearTimeout(timer); timer=setTimeout(function(){ if(current==='home') show((k+1)%rows.length,false); run(); },DUR); }
  if(reduce){ rows[0].classList.add('on'); return; }
  show(0,false); run();
  rows.forEach(function(r,i){ r.addEventListener('pointerenter',function(){ clearTimeout(timer); show(i,true); }); });
  box.addEventListener('pointerleave',function(){ show(k,false); run(); });
})();

/* ---------- loader ----------
   Five styles. A: boot log + progress bar + name typed behind a cursor.
   B: oscilloscope "signal lock" - a noisy trace settles into a clean signal, then the name slides up.
   C: big 0-100 counter, skills flicking past, then the screen lifts away.
   D: the name drawn as a glowing outline, then filled.
   E: particles fly in and form the name, then burst as the site appears.
   Pick one with LOADER below, or preview with ?loader=a ... ?loader=e */
var LOADER='e';
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
/* C: counter. A big 0-100 counter, a line growing across, skills flicking past; at 100 the screen lifts away */
function loaderC(){
  loader.classList.add('ldc');
  loader.innerHTML='<div class="ldc-top"><span>Chandrima Das</span><span>Portfolio &middot; 2026</span></div>'+
    '<div class="ldc-mid"><div class="ldc-words" id="lcW"><span>Machine learning</span><span>Signal processing</span><span>Computer vision</span><span>Data science</span></div></div>'+
    '<div class="ldc-bot"><div class="ldc-num"><span id="lcNum">0</span><i>%</i></div><div class="ldc-line"><i id="lcFill"></i></div></div>';
  var num=$('#lcNum'), fill=$('#lcFill'), words=$$('#lcW span'), DUR=2100, t0=0, done=false, wi=-1;
  function frame(now){
    if(!t0) t0=now;
    var t=Math.min(1,(now-t0)/DUR), e=t<.5? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
    num.textContent=Math.round(e*100); fill.style.transform='scaleX('+e.toFixed(4)+')';
    var k=Math.min(words.length-1,Math.floor(t*words.length));
    if(k!==wi){ words.forEach(function(w,j){ w.classList.toggle('on',j===k); w.classList.toggle('past',j<k); }); wi=k; }
    if(t<1){ requestAnimationFrame(frame); return; }
    if(done) return; done=true;
    setTimeout(function(){ loader.classList.add('lift'); setTimeout(startSite,300); setTimeout(function(){ loader.remove(); },1100); },180);
  }
  return frame;
}

/* shared 0-100% indicator for loaders D and E: a thin glowing line, a status word and a percentage */
function progressUI(words){
  var el=document.createElement('div'); el.className='ldp';
  el.innerHTML='<div class="ldp-line"><i></i></div><div class="ldp-meta"><span class="ldp-stat"></span><span class="ldp-pct">000%</span></div>';
  loader.appendChild(el);
  var line=el.querySelector('.ldp-line i'), pct=el.querySelector('.ldp-pct'), stat=el.querySelector('.ldp-stat'), last=-1;
  return function(f){
    f=clamp(f,0,1); var n=Math.floor(f*100); if(n===last) return; last=n;
    line.style.transform='scaleX('+f.toFixed(4)+')'; pct.textContent=('00'+n).slice(-3)+'%';
    stat.textContent=n>=100?'ready':words[Math.min(words.length-1,Math.floor(f*words.length))];
    el.classList.toggle('full',n>=100);
  };
}

/* D: signature. The name is drawn as a glowing outline, stroke by stroke, then fills with the gradient */
function loaderD(){
  loader.classList.add('ldd');
  var two=innerWidth<700;
  loader.innerHTML='<div class="ld-grid"></div>'+
    '<svg class="ldd-svg" viewBox="0 0 1200 '+(two?420:260)+'" aria-hidden="true"><defs><linearGradient id="lddG" x1="0" x2="1"><stop offset="0" style="stop-color:var(--violet)"/><stop offset="1" style="stop-color:var(--cyan)"/></linearGradient></defs>'+
    /* each word twice: a filled copy that fades in underneath, and the outline that draws itself on top */
    (two? ['ldd-f','ldd-t'].map(function(c){ return '<text x="600" y="190" text-anchor="middle" class="'+c+'">Chandrima</text><text x="600" y="380" text-anchor="middle" class="'+c+' ldd-t2">Das</text>'; }).join('')
        : ['ldd-f','ldd-t'].map(function(c){ return '<text x="600" y="190" text-anchor="middle" textLength="1120" lengthAdjust="spacingAndGlyphs" class="'+c+'">Chandrima Das</text>'; }).join(''))+
    '</svg><p class="ldd-sub">Data science &middot; Machine learning &middot; Signal processing</p>';
  var prog=progressUI(['drawing outline','tracing letters','filling colour']), t0=0, DUR=2300, done=false;
  function frame(now){
    if(!t0){ t0=now; loader.classList.add('go'); }
    var f=(now-t0)/DUR; prog(1-Math.pow(1-clamp(f,0,1),1.6));
    if(f<1){ requestAnimationFrame(frame); return; }
    if(done) return; done=true; setTimeout(finishLoader,200);
  }
  return frame;
}

/* E: particles. A glowing scan line sweeps across the name carrying the percentage; dots behind it
   fly into place and light up, dots ahead still float faintly. At 100% the name is whole, then it bursts. */
function loaderE(){
  loader.classList.add('lde');
  loader.innerHTML='<canvas id="leCv"></canvas><p class="lde-sub">Portfolio &middot; 2026</p>';
  var cv=$('#leCv'), x=cv.getContext('2d'), d=Math.min(devicePixelRatio,2), W=innerWidth, H=innerHeight;
  cv.width=Math.round(W*d); cv.height=Math.round(H*d); x.setTransform(d,0,0,d,0,0);
  function rgb(hex){ var h=hex.replace('#',''); if(h.length===3) h=h.split('').map(function(c){return c+c}).join(''); var n=parseInt(h,16); return [n>>16&255,n>>8&255,n&255]; }
  var A=rgb(css('--violet')||'#6B35C9'), B=rgb(css('--cyan')||'#0A869E'), INK=rgb(css('--muted')||'#5D587A'), CY=css('--cyan')||'#0A869E', TX=css('--ink')||'#16132B';
  var pts=[], minX=0, maxX=1, minY=0, maxY=1;
  function build(){
    var off=document.createElement('canvas'), o=off.getContext('2d'); off.width=W; off.height=H;
    o.fillStyle='#000'; o.textAlign='center'; o.textBaseline='middle';
    var fs;
    if(W<700){ fs=Math.min(W*.2,H*.16); o.font='800 '+fs+'px "Bricolage Grotesque", sans-serif'; o.fillText('Chandrima',W/2,H/2-fs*.55); o.fillText('Das',W/2,H/2+fs*.6); }
    else { fs=Math.min(W*.125,H*.24); o.font='800 '+fs+'px "Bricolage Grotesque", sans-serif'; o.fillText('Chandrima Das',W/2,H/2); }
    var data=o.getImageData(0,0,W,H).data, step=Math.max(3,Math.round(fs/30)), all=[];
    for(var yy=0;yy<H;yy+=step) for(var xx=0;xx<W;xx+=step) if(data[(yy*W+xx)*4+3]>128) all.push([xx,yy]);
    for(var i=all.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), tmp=all[i]; all[i]=all[j]; all[j]=tmp; }
    all=all.slice(0,Math.min(all.length,W<700?1100:2200));
    minX=Infinity; maxX=-Infinity; minY=Infinity; maxY=-Infinity;
    all.forEach(function(q){ minX=Math.min(minX,q[0]); maxX=Math.max(maxX,q[0]); minY=Math.min(minY,q[1]); maxY=Math.max(maxY,q[1]); });
    all.forEach(function(q){
      var u=(q[0]-minX)/Math.max(1,maxX-minX), a=Math.random()*Math.PI*2, rr=60+Math.random()*Math.max(W,H)*.35;
      pts.push({tx:q[0], ty:q[1], u:u, sx:q[0]+Math.cos(a)*rr, sy:q[1]+Math.sin(a)*rr*.7, ph:Math.random()*6.283, r:step*.42+Math.random()*step*.2,
        c:'rgb('+Math.round(A[0]+(B[0]-A[0])*u)+','+Math.round(A[1]+(B[1]-A[1])*u)+','+Math.round(A[2]+(B[2]-A[2])*u)+')',
        vx:(q[0]-W/2)*(.6+Math.random()), vy:(q[1]-H/2)*(.6+Math.random())-80*Math.random()});
    });
  }
  var t0=0, out=false, START=.2, SWEEP=1.5, HOLD=2.05, END=2.75, FLY=.45;
  function ease(v){ return 1-Math.pow(1-v,3); }
  var grey='rgba('+INK[0]+','+INK[1]+','+INK[2]+',';
  function frame(now){
    if(!t0){ t0=now; build(); }
    var t=(now-t0)/1000; x.clearRect(0,0,W,H);
    var f=clamp((t-START)/SWEEP,0,1), sweepU=1-Math.pow(1-f,1.4), scanX=minX+sweepU*(maxX-minX);
    if(t>HOLD && !out){ out=true; loader.classList.add('out'); startSite(); }
    for(var i=0;i<pts.length;i++){
      var p=pts[i], px, py, al, col;
      if(t<HOLD){
        /* each dot starts flying as the line approaches it and lands as the line passes */
        var land=START+SWEEP*(1-Math.pow(1-p.u,1/1.4)), e=ease(clamp((t-(land-FLY))/FLY,0,1));
        var fx=p.sx+Math.sin(t*1.3+p.ph)*10, fy=p.sy+Math.cos(t*1.1+p.ph)*10;
        px=fx+(p.tx-fx)*e; py=fy+(p.ty-fy)*e;
        if(e>=1){ al=1; col=p.c; } else { al=.18+.5*e; col=null; }
      } else { var b=(t-HOLD)/(END-HOLD), eb=b*b; px=p.tx+p.vx*eb; py=p.ty+p.vy*eb; al=1-b; col=p.c; }
      if(al<=0) continue;
      x.fillStyle=col? col : grey+al.toFixed(2)+')'; x.globalAlpha=col?al:1;
      x.beginPath(); x.arc(px,py,p.r,0,6.283); x.fill();
    }
    x.globalAlpha=1;
    /* the scan line with the percentage riding on top */
    if(t<HOLD){
      var top=minY-46, bot=maxY+34, la=t<START+.1?(t/(START+.1)):1;
      var g=x.createLinearGradient(0,top,0,bot); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(.2,CY); g.addColorStop(.8,CY); g.addColorStop(1,'rgba(0,0,0,0)');
      x.globalAlpha=la; x.shadowColor=CY; x.shadowBlur=16; x.fillStyle=g; x.fillRect(scanX-1,top,2,bot-top); x.shadowBlur=0;
      var label=f>=1?'READY':('00'+Math.floor(sweepU*100)).slice(-3)+'%';
      x.font='500 13px "IBM Plex Mono", ui-monospace, monospace'; x.textAlign='center'; x.textBaseline='bottom';
      x.fillStyle=f>=1?CY:TX; x.fillText(label,clamp(scanX,minX+24,maxX-24),top-6);
      x.globalAlpha=1;
    }
    if(t<END){ requestAnimationFrame(frame); return; }
    loader.remove();
  }
  return frame;
}
if(reduce){ loader.remove(); startSite(); }
else{
  var pick=(location.search.match(/[?&]loader=([a-e])/)||[])[1]||LOADER;
  var run=({a:loaderA,b:loaderB,c:loaderC,d:loaderD,e:loaderE}[pick]||loaderB)();
  var started=false, kick=function(){ if(!started){ started=true; requestAnimationFrame(run); } };
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(kick);
  setTimeout(kick,700);
}

/* ---------- boot ---------- */
/* a refresh always starts again from the intro; opening a shared link (e.g. /projects) still goes straight there */
try{
  var navEntry=performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  var reloaded=navEntry? navEntry.type==='reload' : (performance.navigation && performance.navigation.type===1);
  if(reloaded && (location.pathname!=='/' || location.hash)) history.replaceState(null,'','/'+location.search);
}catch(e){}
gl=initGL();
route();

var t0g=performance.now();
function loop(now){
  var t=(now-t0g)/1000;
  if(current==='home'){
    ps+=(p-ps)*(reduce?1:0.045); if(Math.abs(p-ps)<0.0005) ps=p;
    if(gl && !peekCard) gl.render(t,ps);  /* the box covers the scene, so skip drawing it */
    if(pages[pi] && pages[pi].id==='skills') drawSkills(t);
  }
  if(fine && !reduce){ rx+=(cx-rx)*0.18; ry+=(cy-ry)*0.18; cdot.style.transform='translate('+cx+'px,'+cy+'px)'; cring.style.transform='translate('+rx+'px,'+ry+'px)'; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
