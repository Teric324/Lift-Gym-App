// Builds one self-contained, clickable prototype page (fonts embedded as data URIs).
import { readFileSync, writeFileSync } from 'node:fs';
import { wordmark, boltIcon, sprite, ic } from './build.mjs';

const b64 = (path) => readFileSync(path).toString('base64');
const inter = b64('fonts/inter-latin-wght-normal.woff2');
const blackOps = b64('fonts-display/black-ops-one-latin-400-normal.woff2');

// tokens and component rules from the mockups, without their @font-face blocks
const strip = (css) => css.replace(/@font-face\s*{[^}]*}/g, '');
const tokens = strip(readFileSync('tokens.css', 'utf8'));
const mock = readFileSync('mock.css', 'utf8');

const css = `
@font-face{font-family:'Inter';font-style:normal;font-display:swap;font-weight:100 900;src:url(data:font/woff2;base64,${inter}) format('woff2');}
@font-face{font-family:'Black Ops One';font-style:normal;font-display:swap;font-weight:400;src:url(data:font/woff2;base64,${blackOps}) format('woff2');}
${tokens}
${mock}
html,body{height:100%;margin:0;background:var(--bg);overscroll-behavior:none}
body{padding-inline:0}
.stage{height:100%;display:grid;place-items:center;background:var(--bg)}
.phone.proto{width:min(100%,410px);height:100%;max-height:880px;min-height:0;border-radius:0;display:block}
@media (min-width:520px){.phone.proto{height:min(100%,860px);border-radius:36px;border:1px solid var(--line)}}
.proto .topbar{position:absolute;top:0;left:0;right:0;z-index:2;height:52px}
.proto .scroll{position:absolute;top:52px;left:0;right:0;bottom:83px;overflow-y:auto;-webkit-overflow-scrolling:touch}
.proto .page{padding-bottom:var(--space-6)}
.proto .tabbar{z-index:3;padding-bottom:20px}
:where(.proto) button{font:inherit;color:inherit}
.proto .tab{background:none;border:0;cursor:pointer}
.proto .btn,.proto .icon-btn,.proto .check,.proto .weight,.proto .reps .step,.proto .row-card,.proto .picker-list li{cursor:pointer;-webkit-tap-highlight-color:transparent}
.proto .btn:active{transform:scale(.99);filter:brightness(.92)}
.proto .check:active,.proto .weight:active{filter:brightness(1.2)}
.proto button.btn,.proto button.icon-btn,.proto button.check,.proto button.weight,.proto button.step,.proto button.row-card{border:0;text-align:inherit}
.proto button.btn--ghost{border:1px solid var(--line);background:transparent}
.proto button.btn--primary{background:var(--yellow);color:var(--on-yellow)}
.proto button.check{background:transparent;border:2px solid var(--line)}
.proto button.check.check--on{background:var(--yellow);border-color:var(--yellow);color:var(--on-yellow)}
.proto button.weight{display:flex;width:100%;border:0}
.proto button.step{background:none;border:0;height:52px;width:36px;color:var(--text-2);display:grid;place-items:center}
.proto .sheetwrap{position:absolute;inset:0;z-index:5}
.proto .sheet{max-height:82%;display:flex;flex-direction:column}
.proto .sheet .picker-list{overflow-y:auto;flex:1;min-height:0}
.proto .picker-list li{background:transparent;border-left:0;border-right:0;border-top:0;width:100%}
.proto input.field{width:100%;color:var(--text);font:inherit;font-size:18px;font-weight:700}
.proto .settings-item{display:flex;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid var(--line)}
.proto .toast{position:absolute;left:16px;right:16px;bottom:96px;z-index:6;padding:12px 16px;border-radius:14px;background:var(--yellow);color:var(--on-yellow);font-weight:800;text-align:center}
.proto .hint{margin:0 16px 8px;color:var(--text-2);font-size:12px}
.proto .back{background:none;border:0;color:var(--yellow);font-weight:700;padding:8px 0;display:inline-flex;align-items:center;gap:4px}
.proto .history-sets{list-style:none;margin:6px 0 0;padding:0}
.proto .history-sets li{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--line);font-weight:700}
`;

const markup = `
<div class="stage"><div class="phone proto" id="app">
  <div class="topbar">${wordmark({ variant: 'A', height: 22 })}</div>
  <div class="scroll" id="view"></div>
  <nav class="tabbar" id="tabs">
    <button class="tab" data-tab="workouts">${ic('bolt')}<span>Workouts</span></button>
    <button class="tab" data-tab="history">${ic('history')}<span>History</span></button>
    <button class="tab" data-tab="exercises">${ic('list')}<span>Exercises</span></button>
    <button class="tab" data-tab="settings">${ic('sliders')}<span>Settings</span></button>
  </nav>
  <div class="sheetwrap" id="sheet" hidden></div>
  <div class="toast" id="toast" hidden></div>
</div></div>`;

const iconBig = boltIcon(120, { radius: 27 });

const script = `
(function(){
  var ICON = ${JSON.stringify(iconBig)};
  var kgText = function(v){ return String(Math.round(v*100)/100); };
  var S = {
    tab:'workouts', screen:'list', active:true, sheet:null, query:'', detail:null,
    ex:[
      {name:'Bench press', step:2.5, sets:[{kg:80,r:5,d:true},{kg:82.5,r:4,d:true},{kg:82.5,r:4,d:false},{kg:80,r:6,d:false}]},
      {name:'Incline dumbbell press', step:2, instead:'Cable fly', sets:[{kg:30,r:10,d:true},{kg:30,r:10,d:false}]},
      {name:'Triceps pushdown', step:2.5, sets:[{kg:35,r:12,d:false},{kg:35,r:12,d:false}]}
    ],
    history:[
      {d:12,wd:'MON',mon:'October 2026',name:'Push',time:'18:00 – 19:05',ex:[['Bench press',[[105,3],[90,8]]],['Cable fly',[[25,12],[25,12]]]]},
      {d:9,wd:'FRI',mon:'October 2026',name:'Pull',time:'17:40 – 18:52',ex:[['Lat pulldown',[[65,10],[65,9],[60,10]]],['Barbell row',[[70,8],[70,8]]]]},
      {d:7,wd:'WED',mon:'October 2026',name:'Legs',time:'09:00 – 10:10',ex:[['Squat',[[140,5],[140,5],[135,6]]]]},
      {d:30,wd:'WED',mon:'September 2026',name:'Pull',time:'18:10 – 19:20',ex:[['Lat pulldown',[[62.5,10],[62.5,10]]]]}
    ],
    exercises:[['Bench press',2.5,'Mon 12 Oct'],['Cable fly',2.5,'Mon 12 Oct'],['Incline dumbbell press',2,'Fri 9 Oct'],['Lat pulldown',5,'Fri 9 Oct'],['Squat',2.5,'Wed 7 Oct'],['Triceps pushdown',2.5,null],['Barbell row',2.5,'Fri 9 Oct']]
  };
  var $ = function(s){ return document.querySelector(s); };
  var esc = function(t){ return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  var toastTimer;
  function toast(msg){ var t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(function(){t.hidden=true;},1800); }
  function counts(){ var done=0,total=0; S.ex.forEach(function(e){ e.sets.forEach(function(s){ total++; if(s.d) done++; }); }); return {done:done,total:total}; }

  function setRow(ei, i, s){
    return '<div class="set '+(s.d?'set--done':'')+'"><span class="n">'+(i+1)+'</span>'+
      '<button class="weight num" data-act="weight" data-ex="'+ei+'" data-i="'+i+'" aria-label="Weight">'+kgText(s.kg)+'<small>kg</small></button>'+
      '<span class="reps num"><button class="step" data-act="rminus" data-ex="'+ei+'" data-i="'+i+'" aria-label="One rep less">${ic('minus')}</button><span>'+s.r+'</span><button class="step" data-act="rplus" data-ex="'+ei+'" data-i="'+i+'" aria-label="One rep more">${ic('plus')}</button></span>'+
      '<button class="check '+(s.d?'check--on':'')+'" data-act="check" data-ex="'+ei+'" data-i="'+i+'" aria-label="Mark set">${ic('check')}</button></div>';
  }

  function viewWorkouts(){
    var c = counts();
    var banner = S.active ? '<div class="banner"><svg class="bolt" viewBox="0 0 100 100"><path d="M46 0H78L58 36H88L30 100L44 58H14Z"/></svg><div class="grow"><strong>Workout in progress</strong><span class="meta">Push · '+c.done+' of '+c.total+' sets done</span></div><button class="btn btn--primary btn--small" data-act="resume">Resume</button></div>' : '';
    function card(n, ex, last, names){ return '<article class="card"><h2>'+n+'</h2><div class="meta" style="margin:2px 0 10px">'+ex+' · Last done '+last+'</div><div class="meta" style="color:var(--text-3)">'+names+'</div><button class="btn btn--primary" style="margin-top:12px" data-act="start" data-name="'+n+'">Start</button></article>'; }
    return '<div class="page"><h1 class="title">Workouts</h1><p class="sub">Your routines. Tap Start to train.</p>'+banner+
      card('Push','5 exercises','Mon 12 Oct','Bench press, Incline press, Cable fly +2')+
      card('Pull','6 exercises','Fri 9 Oct','Lat pulldown, Barbell row, Biceps curl +3')+
      '<button class="btn btn--ghost" style="margin-top:4px" data-act="noop">${ic('plus')} New workout</button></div>';
  }

  function viewWorkout(){
    var c = counts(), pct = c.total ? Math.round(100*c.done/c.total) : 0;
    var cards = S.ex.map(function(e, ei){
      var rows = e.sets.map(function(s,i){ return setRow(ei,i,s); }).join('');
      return '<article class="card"><div class="ex-head"><div><h2>'+esc(e.name)+'</h2><span class="chip" style="margin-top:6px">'+kgText(e.step)+' kg step</span>'+(e.instead?'<div class="meta" style="margin-top:6px">Instead of '+e.instead+'</div>':'')+'</div><div class="acts"><button class="icon-btn" data-act="up" data-ex="'+ei+'" aria-label="Move up">${ic('up')}</button><button class="icon-btn" data-act="down" data-ex="'+ei+'" aria-label="Move down">${ic('down')}</button></div></div>'+rows+
        '<button class="btn btn--ghost add-set" data-act="addset" data-ex="'+ei+'">${ic('plus')} Add set</button></article>';
    }).join('');
    return '<div class="page"><button class="back" data-act="leave">${ic('chev')} Workouts</button><h1 class="title">Push</h1><p class="sub">Thu 15 Oct · started 18:05</p>'+
      '<div class="meta" style="display:flex;justify-content:space-between"><span>'+c.done+' of '+c.total+' sets done</span><span class="num">'+pct+'%</span></div><div class="progress"><span style="width:'+pct+'%"></span></div>'+cards+
      '<button class="btn btn--ghost" data-act="noop">${ic('plus')} Add exercise</button><button class="btn btn--primary" style="margin-top:12px" data-act="finish">Finish workout</button></div>';
  }

  function viewHistory(){
    if (S.detail !== null){
      var h = S.history[S.detail];
      var blocks = h.ex.map(function(e){ return '<article class="card"><h2>'+esc(e[0])+'</h2><ol class="history-sets">'+e[1].map(function(s,i){ return '<li><span style="width:1.5rem;color:var(--text-2)">'+(i+1)+'</span><span class="num">'+kgText(s[0])+' kg × '+s[1]+'</span></li>'; }).join('')+'</ol></article>'; }).join('');
      return '<div class="page"><button class="back" data-act="hback">${ic('chev')} History</button><h1 class="title">'+h.name+'</h1><p class="sub">'+h.wd.charAt(0)+h.wd.slice(1).toLowerCase()+' '+h.d+' · '+h.time+'</p>'+blocks+'<button class="btn btn--ghost" data-act="noop">Edit</button></div>';
    }
    var out = '<div class="page"><h1 class="title">History</h1><p class="sub">Your finished workouts, newest first.</p>', last = '';
    S.history.forEach(function(h, i){
      if (h.mon !== last){ out += '<div class="caption">'+h.mon+'</div>'; last = h.mon; }
      var sets = h.ex.reduce(function(a,e){ return a + e[1].length; },0);
      out += '<button class="row-card" style="width:100%" data-act="hopen" data-i="'+i+'"><div class="date-tile"><b class="num">'+h.d+'</b><span>'+h.wd+'</span></div><div class="main"><strong>'+h.name+'</strong><span class="meta">'+h.ex.length+' exercise'+(h.ex.length>1?'s':'')+' · '+sets+' sets</span><br><span class="meta" style="color:var(--text-3)">'+h.time+'</span></div>${ic('chev', 'chev')}</button>';
    });
    return out + '</div>';
  }

  function viewExercises(){
    var q = S.query.toLowerCase();
    var rows = S.exercises.filter(function(e){ return !q || e[0].toLowerCase().indexOf(q) >= 0; }).map(function(e){
      return '<div class="row-card"><div class="main"><strong>'+e[0]+'</strong><span class="meta">'+(e[2] ? 'Step '+kgText(e[1])+' kg · Last done '+e[2] : 'Not done yet')+'</span></div>${ic('chev', 'chev')}</div>';
    }).join('');
    return '<div class="page"><div class="title-row"><h1 class="title">Exercises</h1><button class="btn btn--primary btn--small" style="margin-bottom:6px" data-act="noop">${ic('plus')} Add</button></div><p class="sub">Every exercise exists once. History and records belong to the exercise.</p>'+
      '<label class="search">${ic('search')}<input id="q" class="field" style="border:0;background:transparent;padding:0;height:auto;font-weight:600" placeholder="Search exercises" value="'+esc(S.query)+'" autocomplete="off"></label>'+rows+'</div>';
  }

  function viewSettings(){
    return '<div class="page"><h1 class="title">Settings</h1><p class="sub">Backup and app information.</p>'+
      '<article class="card" style="display:flex;gap:16px;align-items:center"><div style="flex:none;border-radius:27px;overflow:hidden">'+ICON+'</div><div><h2>Lift</h2><div class="meta">App icon: a flat black bolt on yellow.</div></div></article>'+
      '<div class="caption">Backup</div><div class="card"><div class="settings-item"><span>Last backup</span><b>today</b></div><div class="settings-item"><span>Storage</span><b>Protected</b></div><button class="btn btn--primary" style="margin-top:12px" data-act="export">Export backup</button><button class="btn btn--ghost" style="margin-top:8px" data-act="noop">Choose backup file…</button></div></div>';
  }

  function stepsAround(center, step){
    var k = Math.max(1, Math.round(center/step)), from = Math.max(1, k-30), to = Math.min(Math.floor(500/step), k+30), v=[];
    for (var i=from;i<=to;i++) v.push(Math.round(i*step*100)/100);
    return v;
  }

  function renderSheet(){
    var host = $('#sheet');
    if (!S.sheet){ host.hidden = true; host.innerHTML=''; return; }
    var e = S.ex[S.sheet.ex], s = e.sets[S.sheet.i], list = stepsAround(S.sheet.center, e.step);
    host.hidden = false;
    host.innerHTML = '<div class="dim" data-act="sheetclose"></div><div class="sheet"><div class="grabber"></div>'+
      '<div class="sheet-head"><div><h3>Weight · set '+(S.sheet.i+1)+'</h3><div class="meta">'+esc(e.name)+' · '+kgText(e.step)+' kg step · current '+kgText(s.kg)+' kg</div></div><button class="btn btn--primary btn--small" data-act="sheetclose">Done</button></div>'+
      '<label class="field" style="margin-top:12px"><input class="field" id="typed" style="border:0;background:transparent;padding:0;height:auto" inputmode="decimal" placeholder="Type a weight" autocomplete="off"><span class="suffix">kg</span></label>'+
      '<div class="chips-row"><button class="btn btn--small btn--ghost" data-act="pick" data-kg="0">0 kg</button><button class="btn btn--small" data-act="jump" data-d="-25">−25</button><button class="btn btn--small" data-act="jump" data-d="-10">−10</button><button class="btn btn--small" data-act="jump" data-d="10">+10</button><button class="btn btn--small" data-act="jump" data-d="25">+25</button></div>'+
      '<ul class="picker-list" id="plist">'+list.map(function(v){ var now = v===s.kg; return '<li class="'+(now?'now':'')+' num" data-act="pick" data-kg="'+v+'" '+(v===S.sheet.center?'data-center="1"':'')+'><span>'+kgText(v)+' kg</span>'+(now?'<span class="tag">NOW</span>':'')+'</li>'; }).join('')+'</ul></div>';
    var c = host.querySelector('[data-center]'), pl = $('#plist');
    if (c && pl) pl.scrollTop = c.offsetTop - pl.clientHeight/2 + c.offsetHeight/2 - pl.offsetTop;
  }

  function render(){
    var v = $('#view'), top = v.scrollTop;
    var html = S.tab==='workouts' ? (S.screen==='workout' ? viewWorkout() : viewWorkouts())
      : S.tab==='history' ? viewHistory() : S.tab==='exercises' ? viewExercises() : viewSettings();
    v.innerHTML = html; v.scrollTop = top;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function(t){ t.classList.toggle('tab--on', t.dataset.tab===S.tab); });
    renderSheet();
  }

  document.addEventListener('click', function(ev){
    var t = ev.target.closest('[data-act],[data-tab]'); if (!t) return;
    if (t.dataset.tab){ S.tab = t.dataset.tab; S.detail = null; if (S.tab!=='workouts') S.screen='list'; $('#view').scrollTop = 0; render(); return; }
    var a = t.dataset.act, ei = +t.dataset.ex, i = +t.dataset.i;
    if (a==='start'||a==='resume'){ S.active = true; S.screen='workout'; $('#view').scrollTop = 0; }
    else if (a==='leave'){ S.screen='list'; }
    else if (a==='check'){ var s=S.ex[ei].sets[i]; s.d=!s.d; }
    else if (a==='rminus'){ var m=S.ex[ei].sets[i]; m.r=Math.max(1,m.r-1); }
    else if (a==='rplus'){ var p=S.ex[ei].sets[i]; p.r=Math.min(100,p.r+1); }
    else if (a==='addset'){ var L=S.ex[ei].sets, l=L[L.length-1]||{kg:20,r:10}; L.push({kg:l.kg,r:l.r,d:false}); }
    else if (a==='up'&&ei>0){ var x=S.ex.splice(ei,1)[0]; S.ex.splice(ei-1,0,x); }
    else if (a==='down'&&ei<S.ex.length-1){ var y=S.ex.splice(ei,1)[0]; S.ex.splice(ei+1,0,y); }
    else if (a==='weight'){ var w=S.ex[ei].sets[i]; var st=S.ex[ei].step; S.sheet={ex:ei,i:i,center:Math.max(st,Math.round(w.kg/st)*st)}; }
    else if (a==='sheetclose'){ S.sheet=null; }
    else if (a==='jump'){ var e2=S.ex[S.sheet.ex]; S.sheet.center=Math.min(500,Math.max(e2.step,Math.round((S.sheet.center+(+t.dataset.d))/e2.step)*e2.step)); }
    else if (a==='pick'){ S.ex[S.sheet.ex].sets[S.sheet.i].kg=+t.dataset.kg; S.sheet=null; }
    else if (a==='finish'){ S.active=false; S.screen='list'; S.tab='history'; var n=counts(); S.history.unshift({d:15,wd:'THU',mon:'October 2026',name:'Push',time:'18:05 – 19:10',ex:S.ex.map(function(e){ return [e.name,e.sets.filter(function(s){return s.d;}).map(function(s){return [s.kg,s.r];})]; }).filter(function(e){return e[1].length;})}); toast(n.done+' sets saved to History'); }
    else if (a==='hopen'){ S.detail=i; $('#view').scrollTop=0; }
    else if (a==='hback'){ S.detail=null; }
    else if (a==='export'){ toast('Backup saved (example)'); }
    else if (a==='noop'){ toast('Not part of this prototype'); }
    render();
  });
  document.addEventListener('input', function(ev){
    if (ev.target.id==='q'){ S.query=ev.target.value; var v=$('#view'); var pos=ev.target.selectionStart; render(); var q=$('#q'); if(q){ q.focus(); q.setSelectionRange(pos,pos);} }
    if (ev.target.id==='typed' && S.sheet){ var val=parseFloat(String(ev.target.value).replace(',','.')); if(isFinite(val)&&val>=0&&val<=10000){ S.ex[S.sheet.ex].sets[S.sheet.i].kg=Math.round(val*100)/100; var row=$('#view'); var pos2=ev.target.selectionStart; var top=row.scrollTop; row.innerHTML = viewWorkout(); row.scrollTop=top; } }
  });
  render();
})();
`;

const html = `<title>Lift Prototype</title>
<style>${css}</style>
${sprite}
${markup}
<script>${script}</script>`;
writeFileSync('lift-prototype.html', html);
console.log('prototype written', Math.round(html.length / 1024), 'KB');
