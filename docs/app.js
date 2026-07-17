/* digi2 essentials — silnik dokumentacji (router, drzewko Webflow, kreator, szukajka) */
(function(){
'use strict';
var D2 = window.D2DOCS;

/* ───────── ikony elementów Webflow ───────── */
var IC = {
  section:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="2.5" y="6" width="19" height="12" rx="1.5"/></svg>',
  container:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="5" y="5.5" width="14" height="13" rx="1.5"/><path d="M2.5 4v16M21.5 4v16"/></svg>',
  div:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M7 8.5h10M7 12h10M7 15.5h10"/></svg>',
  item:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 10h8M8 13.5h5"/></svg>',
  heading:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M6 4.5v15M18 4.5v15M6 12h12"/></svg>',
  text:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
  button:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3" y="8" width="18" height="8" rx="4"/><path d="M8 12h8"/></svg>',
  link:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M9.5 14.5 14.5 9.5M8 12l-2.2 2.2a3.5 3.5 0 0 0 5 5L13 17M16 12l2.2-2.2a3.5 3.5 0 0 0-5-5L11 7"/></svg>',
  image:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4.5 17 5-5 4 4 3-3 3 3"/></svg>',
  input:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="2.5" y="8" width="19" height="8" rx="2"/><path d="M6 12h.01"/></svg>',
  textarea:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M6.5 9.5h8M6.5 13h5"/></svg>',
  checkbox:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12.5 2.5 2.5 4.5-5.5"/></svg>',
  select:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="2.5" y="8" width="19" height="8" rx="2"/><path d="m15.5 11 2 2 2-2"/></svg>',
  form:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4"/></svg>',
  embed:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="m8 8-4.5 4L8 16M16 8l4.5 4L16 16"/></svg>',
  slider:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="5" y="6" width="14" height="12" rx="2"/><path d="m2 12 1.5 0M20.5 12l1.5 0"/></svg>',
  nav:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3" y="5" width="18" height="4.5" rx="1.5"/><path d="M6 7.2h.01M9 7.2h6"/></svg>',
  script:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="m9 9-3.5 3L9 15M15 9l3.5 3L15 15M13 5l-2 14"/></svg>',
  label:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M3.5 12.5v-7a2 2 0 0 1 2-2h7l8 8-9 9-8-8Z"/><circle cx="8.5" cy="8.5" r="1.2"/></svg>',
  radio:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>',
  video:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m10.5 9.5 4 2.5-4 2.5v-5Z"/></svg>',
  home:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="m3.5 11 8.5-7 8.5 7M6 9.5V20h12V9.5"/></svg>',
  loader:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>',
  popup:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="5" y="7" width="14" height="11" rx="2"/><path d="m16 4 4 0 0 4"/></svg>',
  toast:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M6.5 17h.01M10 17h7"/></svg>',
  tabs:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M3 9h18M3 9V6a2 2 0 0 1 2-2h4l2 3"/><rect x="3" y="9" width="18" height="11" rx="1.5"/></svg>',
  dropdown:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3" y="5" width="18" height="6" rx="1.5"/><path d="m15 7.5 1.5 1.5L18 7.5M5.5 14h9M5.5 17.5h6"/></svg>',
  animate:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M4 18c3-9 6-9 8-4s5 5 8-8"/></svg>',
  scroll:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="8" y="3" width="8" height="18" rx="4"/><path d="M12 7v4"/></svg>',
  lazy:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M8 12h8M12 8v8" opacity=".5"/></svg>',
  format:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M5 7h4M7 7v10M13 17l3-10 3 10M14.2 13.5h3.6"/></svg>',
  countdown:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2.5h6"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  cookies:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M21 12a9 9 0 1 1-9-9c0 2 1.5 3.5 3.5 3.5A3.5 3.5 0 0 0 19 10c.6.6 2 .6 2 2Z"/><path d="M9 10h.01M14 15h.01M9.5 15.5h.01"/></svg>',
  google:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v4M12 15.5h.01"/></svg>',
  ab:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M12 3v18M3 8l4 8M11 8 7 16M14 16v-8h3a2 2 0 1 1 0 4h-3h3.5a2 2 0 1 1 0 4H14Z"/></svg>',
  filter:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z"/></svg>',
  interactions:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="m8 5 9 7-4 1 2.5 5-2.5 1L10.5 14 8 17V5Z"/></svg>'
};
function ico(t){ return IC[t] || IC.div; }

/* ───────── helpers ───────── */
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function el(id){ return document.getElementById(id); }

function copyText(txt, node, cls){
  cls = cls || 'copied';
  function done(){
    if(!node) return;
    node.classList.add(cls);
    setTimeout(function(){ node.classList.remove(cls); }, 1300);
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(done, function(){ fallback(); });
  } else fallback();
  function fallback(){
    var ta = document.createElement('textarea');
    ta.value = txt; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); }catch(e){}
    document.body.removeChild(ta); done();
  }
}

/* ───────── podświetlanie kodu ───────── */
function hi(code){
  var s = esc(code);
  var store = [];
  function stash(cls){ return function(m){ store.push('<span class="'+cls+'">'+m+'</span>'); return '\x00'+(store.length-1)+'\x00'; }; }
  s = s.replace(/&lt;!--[\s\S]*?--&gt;/g, stash('c'));
  s = s.replace(/\/\*[\s\S]*?\*\//g, stash('c'));
  s = s.replace(/(^|[^:])\/\/[^\n]*/g, function(m, p1){ store.push('<span class="c">'+m.slice(p1.length)+'</span>'); return p1+'\x00'+(store.length-1)+'\x00'; });
  s = s.replace(/"[^"\n]*"/g, stash('s'));
  s = s.replace(/'[^'\n]*'/g, stash('s'));
  s = s.replace(/\b(d2-[a-z0-9-]+|digi2-module)\b/g, '<span class="d2">$1</span>');
  s = s.replace(/(&lt;\/?)([a-zA-Z][a-zA-Z0-9-]*)/g, '$1<span class="tg">$2</span>');
  s = s.replace(/\b(digi2|const|var|let|function|return|if|else|new|window|document|true|false|null)\b/g, '<span class="k">$1</span>');
  s = s.replace(/\x00(\d+)\x00/g, function(m, i){ return store[+i]; });
  return s;
}

function codeBlock(code, lang, label){
  return '<div class="code"><div class="code-head"><span class="lang">'+(label||lang||'kod')+'</span>'+
    '<button class="copy-btn" data-copy="'+esc(code).replace(/"/g,'&quot;')+'">'+
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M15 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4"/></svg>'+
    '<span>Kopiuj</span></button></div><pre>'+hi(code)+'</pre></div>';
}

function chip(a, v){
  var full = v != null && v !== '' ? a+'="'+v+'"' : a;
  return '<span class="chip" data-copy="'+esc(full).replace(/"/g,'&quot;')+'" title="Kliknij, aby skopiować">'+esc(a)+
    (v != null && v !== '' ? '<span class="v">="'+esc(v)+'"</span>' : '')+'</span>';
}

/* ───────── drzewko Webflow (Navigator) ───────── */
function pills(attrs){
  if(!attrs || !attrs.length) return '';
  var out = '<span class="wf-pills">';
  attrs.forEach(function(p){
    var a = p[0], v = p.length > 1 ? p[1] : null;
    var full = (v != null && v !== '') ? a+'="'+v+'"' : a;
    out += '<span class="wf-pill" data-copy="'+esc(full).replace(/"/g,'&quot;')+'" title="Kliknij, aby skopiować">'+esc(a)+
      (v != null && v !== '' ? '<span class="v">="'+esc(v)+'"</span>' : '')+'</span>';
  });
  return out+'</span>';
}
function treeNodes(nodes){
  var out = '';
  (nodes||[]).forEach(function(n){
    var hasKids = n.c && n.c.length;
    out += '<div class="wf-node"><div class="wf-line">'+
      '<span class="wf-caret">'+(hasKids ? '▾' : '')+'</span>'+
      '<span class="wf-ico">'+ico(n.t)+'</span>'+
      '<span class="wf-label">'+n.l+'</span>'+
      pills(n.a)+
      (n.n ? '<span class="wf-note">'+esc(n.n)+'</span>' : '')+
      '</div>'+
      (hasKids ? '<div class="wf-kids">'+treeNodes(n.c)+'</div>' : '')+
      '</div>';
  });
  return out;
}
function tree(nodes, title){
  return '<div class="wf"><div class="wf-head"><span class="dots"><i></i><i></i><i></i></span>'+
    '<span class="t">'+esc(title||'Navigator — struktura w Webflow')+'</span>'+
    '<span class="hint">kliknij atrybut, aby skopiować</span></div>'+
    '<div class="wf-body">'+treeNodes(nodes)+'</div></div>';
}

/* kroki „krok po kroku" z drzewka */
function stepsFromTree(nodes){
  var steps = [];
  function walk(list){
    (list||[]).forEach(function(n){
      if(n.a && n.a.length){
        steps.push({ label: n.l.replace(/<[^>]+>/g,''), attrs: n.a });
      }
      walk(n.c);
    });
  }
  walk(nodes);
  var out = '<ol class="kr-steps">';
  steps.forEach(function(s, i){
    out += '<li><span class="n">'+(i+1)+'</span><div>Na elemencie <b>'+esc(s.label)+'</b> dodaj: ';
    s.attrs.forEach(function(p){ out += ' '+chip(p[0], p.length>1?p[1]:null); });
    out += '</div></li>';
  });
  return out+'</ol>';
}

/* ───────── loader script tag ───────── */
function loaderScript(flags){
  var attrs = (flags||[]).map(function(f){ return '  '+f; }).join('\n');
  return '<script\n  src="'+D2.cdn+'"\n'+attrs+'\n><\/script>';
}

/* ───────── sidebar ───────── */
function renderSidebar(current){
  var html = '';
  D2.categories.forEach(function(cat){
    html += '<div class="sb-cat">'+esc(cat.label)+'</div>';
    cat.items.forEach(function(key){
      var m = D2.modules[key];
      if(!m) return;
      html += '<a class="sb-link'+(key===current?' active':'')+'" href="#/m/'+key+'">'+
        '<span class="ic">'+ico(m.icon)+'</span>'+esc(m.short||m.name)+
        (m.flag ? '<span class="flag">'+esc(m.flag)+'</span>' : '')+'</a>';
    });
  });
  el('nav').innerHTML = html;
}

/* ───────── strona modułu ───────── */
function anchor(id, txt){ return '<h2 id="'+id+'">'+txt+' <a class="anchor" href="#/m/'+CUR+'#'+id+'" onclick="document.getElementById(\''+id+'\').scrollIntoView();return false;">#</a></h2>'; }

var CUR = 'start';

function pageModule(key){
  var m = D2.modules[key];
  if(!m){ location.hash = '#/'; return; }
  var c = '';
  var tocItems = [];

  c += '<div class="crumb">'+esc(m.cat||'Moduł')+'</div>';
  c += '<div class="page-head"><div class="page-ic">'+ico(m.icon)+'</div><div>';
  c += '<h1>'+esc(m.name)+'</h1><div class="page-meta">';
  if(m.flag) c += '<span class="badge flag">'+esc(m.flag)+'</span>';
  if(m.size) c += '<span class="badge">'+esc(m.size)+'</span>';
  c += m.auto ? '<span class="badge ok">działa bez JS — same atrybuty</span>' : '<span class="badge js">wymaga inicjalizacji w JS</span>';
  c += '</div></div></div>';
  c += '<p class="lead">'+m.desc+'</p>';
  if(m.warn) c += '<div class="warn">'+m.warn+'</div>';

  /* instalacja */
  tocItems.push(['instalacja','Instalacja']);
  c += anchor('instalacja','Instalacja');
  c += '<p class="sec-desc">Dodaj tag loadera w <b>Site Settings → Custom Code → Head</b> (raz na cały site) i włącz moduł flagą <code>'+esc(m.flag||'')+'</code>. Loader dociągnie tylko włączone moduły.</p>';
  c += codeBlock(m.install || loaderScript([m.flag]), 'html', 'Site Settings → Head');
  if(m.installNote) c += '<p class="note">'+m.installNote+'</p>';

  /* kreator */
  if(m.kreator){
    tocItems.push(['kreator','Kreator']);
    c += anchor('kreator','Kreator konfiguracji');
    c += '<p class="sec-desc">Ustaw opcje po lewej — po prawej na żywo buduje się drzewko elementów Webflow z atrybutami do wklejenia'+(m.kreator.hasJs?' oraz kod do Custom Code':'')+'. Kliknięcie atrybutu kopiuje go do schowka.</p>';
    c += '<div class="kreator"><div class="kr-head"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="m12 3 1.9 5.6L20 10l-6.1 1.4L12 17l-1.9-5.6L4 10l6.1-1.4L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></svg></div>'+
      '<div><b>Kreator — '+esc(m.short||m.name)+'</b><br><span>wyklikaj konfigurację, sklej z drzewka</span></div></div>'+
      '<div class="kr-grid"><div class="kr-form" id="krForm"></div><div class="kr-out" id="krOut"></div></div></div>';
  }

  /* struktury */
  if(m.structures && m.structures.length){
    tocItems.push(['struktura','Struktura w Webflow']);
    c += anchor('struktura','Struktura w Webflow');
    c += '<p class="sec-desc">Gotowe wzorce — dokładnie tak powinno wyglądać drzewko w Nawigatorze Webflow. Fioletowe pigułki to custom attributes (Element Settings → Custom attributes).</p>';
    if(m.structures.length > 1){
      c += '<div class="struct-tabs">';
      m.structures.forEach(function(s, i){
        c += '<button class="struct-tab'+(i===0?' active':'')+'" data-pane="'+i+'">'+esc(s.title)+'</button>';
      });
      c += '</div>';
    }
    m.structures.forEach(function(s, i){
      c += '<div class="struct-pane'+(i===0?' active':'')+'" data-pane="'+i+'">';
      if(s.desc) c += '<p class="pane-desc">'+s.desc+'</p>';
      c += tree(s.tree, s.title);
      c += '</div>';
    });
  }

  /* atrybuty */
  if(m.attrs && m.attrs.length){
    tocItems.push(['atrybuty','Atrybuty']);
    c += anchor('atrybuty','Wszystkie atrybuty');
    if(m.attrs.length > 10){
      c += '<div class="attr-tools"><input type="text" id="attrFilter" placeholder="Filtruj atrybuty…"><span class="cnt" id="attrCnt">'+m.attrs.length+' atrybutów</span></div>';
    }
    c += '<div class="attr-table"><div class="attr-row head"><div>Atrybut</div><div>Gdzie w Webflow</div><div>Co robi</div></div>';
    m.attrs.forEach(function(a){
      c += '<div class="attr-row" data-attr="'+esc(a.a)+'" data-search="'+esc((a.a+' '+(a.d||'')+' '+(a.el||'')).toLowerCase())+'">';
      c += '<div class="col-a">'+chip(a.a, a.v)+(a.req?'<span class="req">wymagany</span>':'')+(a.set?'<span class="set">ustawia moduł</span>':'')+'</div>';
      c += '<div class="el">'+esc(a.el||'—')+'</div>';
      c += '<div class="d">'+a.d+(a.n?'<span class="n">'+a.n+'</span>':'')+'</div>';
      c += '</div>';
    });
    c += '</div>';
  }

  /* API */
  if(m.api){
    tocItems.push(['api','API JavaScript']);
    c += anchor('api','API JavaScript');
    if(m.api.desc) c += '<p class="sec-desc">'+m.api.desc+'</p>';
    c += codeBlock(m.api.code, 'js', 'Custom Code → przed </body>');
  }

  /* przykłady */
  if(m.examples && m.examples.length){
    tocItems.push(['przyklady','Przykłady']);
    c += anchor('przyklady','Przykłady');
    m.examples.forEach(function(ex){
      c += '<div class="example-block"><h3>'+esc(ex.title)+'</h3>'+(ex.desc?'<p class="sec-desc">'+ex.desc+'</p>':'')+codeBlock(ex.code, ex.lang||'html', ex.lang||'html')+'</div>';
    });
  }

  if(m.extra) c += m.extra;

  el('content').innerHTML = c;
  renderToc(tocItems);
  if(m.kreator) mountKreator(m);
  bindStructTabs();
  bindAttrFilter(m);
}

function renderToc(items){
  var t = el('toc');
  if(!items || items.length < 2){ t.innerHTML=''; return; }
  var h = '<div class="t">Na tej stronie</div>';
  items.forEach(function(i){ h += '<a href="javascript:void(0)" data-to="'+i[0]+'">'+esc(i[1])+'</a>'; });
  t.innerHTML = h;
  t.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){
      var n = document.getElementById(a.getAttribute('data-to'));
      if(n) n.scrollIntoView({behavior:'smooth'});
    });
  });
}

function bindStructTabs(){
  var tabs = document.querySelectorAll('.struct-tab');
  tabs.forEach(function(t){
    t.addEventListener('click', function(){
      tabs.forEach(function(x){ x.classList.remove('active'); });
      t.classList.add('active');
      document.querySelectorAll('.struct-pane').forEach(function(p){
        p.classList.toggle('active', p.getAttribute('data-pane') === t.getAttribute('data-pane'));
      });
    });
  });
}

function bindAttrFilter(m){
  var inp = el('attrFilter');
  if(!inp) return;
  inp.addEventListener('input', function(){
    var q = inp.value.toLowerCase().trim();
    var n = 0;
    document.querySelectorAll('.attr-row[data-search]').forEach(function(r){
      var show = !q || r.getAttribute('data-search').indexOf(q) !== -1;
      r.style.display = show ? '' : 'none';
      if(show) n++;
    });
    el('attrCnt').textContent = n + (q ? ' pasujących' : ' atrybutów');
  });
}

/* ───────── kreator ───────── */
function mountKreator(m){
  var K = m.kreator;
  var st = {};
  K.fields.forEach(function(f){ st[f.k] = f.def; });
  var form = el('krForm'), out = el('krOut');

  function fieldHTML(f){
    if(f.showIf && !f.showIf(st)) return '';
    var h = '';
    if(f.type === 'check'){
      h += '<label class="kr-check"><input type="checkbox" data-k="'+f.k+'"'+(st[f.k]?' checked':'')+'><span>'+esc(f.label)+'</span></label>';
      if(f.hint) h += '<div class="hint" style="margin-left:23px;font-size:11px;color:var(--text-3)">'+f.hint+'</div>';
    } else {
      h += '<div class="kr-field"><label>'+esc(f.label)+'</label>';
      if(f.type === 'select'){
        h += '<select data-k="'+f.k+'">';
        f.opts.forEach(function(o){ h += '<option value="'+esc(o[0])+'"'+(String(st[f.k])===String(o[0])?' selected':'')+'>'+esc(o[1])+'</option>'; });
        h += '</select>';
      } else {
        h += '<input type="'+(f.type==='number'?'number':(f.type==='datetime'?'datetime-local':'text'))+'" data-k="'+f.k+'" value="'+esc(st[f.k]==null?'':st[f.k])+'"'+(f.ph?' placeholder="'+esc(f.ph)+'"':'')+'>';
      }
      if(f.hint) h += '<div class="hint">'+f.hint+'</div>';
      h += '</div>';
    }
    return f.sub ? '<div class="kr-sub">'+h+'</div>' : h;
  }

  function renderForm(){
    var h = '';
    K.fields.forEach(function(f){ h += fieldHTML(f); });
    form.innerHTML = h;
    form.querySelectorAll('[data-k]').forEach(function(inp){
      var f = K.fields.filter(function(x){ return x.k === inp.getAttribute('data-k'); })[0];
      var evt = (inp.type === 'checkbox' || inp.tagName === 'SELECT') ? 'change' : 'input';
      inp.addEventListener(evt, function(){
        st[f.k] = inp.type === 'checkbox' ? inp.checked : (f.type === 'number' ? (inp.value === '' ? '' : +inp.value) : inp.value);
        if(evt === 'change'){ renderForm(); }
        renderOut();
      });
    });
  }

  function renderOut(){
    var r = K.build(st);
    var h = '';
    h += '<div class="kr-out-label">1 · Skrypt w Site Settings → Head</div>';
    h += codeBlock(r.script || loaderScript([m.flag]), 'html', 'head');
    if(r.tree){
      h += '<div class="kr-out-label">2 · Drzewko elementów w Webflow</div>';
      h += tree(r.tree, 'Navigator — Twoja konfiguracja');
      h += '<details class="kr-details"><summary>Pokaż jako listę kroków</summary>'+stepsFromTree(r.tree)+'</details>';
    }
    if(r.js){
      h += '<div class="kr-out-label">'+(r.tree?'3':'2')+' · Kod w Page Settings → przed &lt;/body&gt;</div>';
      h += codeBlock(r.js, 'js', 'custom code');
    }
    if(r.note) h += '<p class="note">'+r.note+'</p>';
    if(r.preview) h += r.preview;
    out.innerHTML = h;
  }

  renderForm();
  renderOut();
}

/* ───────── strona startowa ───────── */
function pageStart(){
  var m = D2.start;
  var c = '<div class="hero"><div class="crumb">digi2 essentials</div>'+
    '<h1>Atrybuty, które robią robotę w Webflow.</h1>'+
    '<p class="lead">'+m.lead+'</p></div>';

  /* builder instalacji */
  c += '<h2 id="builder">Kreator instalacji</h2>';
  c += '<p class="sec-desc">Zaznacz moduły, których potrzebujesz — tag loadera składa się sam. Wklej go raz w <b>Site Settings → Custom Code → Head</b>.</p>';
  c += '<div class="builder"><div class="builder-head"><b>Wybierz moduły</b><span style="font-size:12px;color:var(--text-3)">loader dociągnie tylko to, co zaznaczysz</span></div><div class="builder-grid" id="bGrid"></div>'+
    '<div class="gtm-row" id="gtmRow"><label style="font-size:12.5px;font-weight:700">ID kontenera GTM:</label><input id="gtmId" type="text" placeholder="GTM-XXXXXXX" value="GTM-XXXXXXX"></div>'+
    '<div class="out" id="bOut"></div></div>';

  /* kroki */
  c += '<h2 id="jak">Jak to działa</h2><div class="steps">';
  m.steps.forEach(function(s, i){
    c += '<div class="step"><div class="num">'+(i+1)+'</div><div><h3>'+esc(s.t)+'</h3><p>'+s.d+'</p></div></div>';
  });
  c += '</div>';

  c += '<p class="note">'+m.responsiveNote+'</p>';

  /* kafelki modułów */
  c += '<h2 id="moduly">Moduły</h2><div class="tiles">';
  D2.categories.forEach(function(cat){
    cat.items.forEach(function(key){
      if(key === 'start') return;
      var mm = D2.modules[key];
      c += '<a class="tile" href="#/m/'+key+'"><div class="ti"><div class="ic">'+ico(mm.icon)+'</div><b>'+esc(mm.short||mm.name)+'</b></div>'+
        '<p>'+esc(mm.tagline||'')+'</p>'+(mm.flag?'<span class="fl">'+esc(mm.flag)+'</span>':'')+'</a>';
    });
  });
  c += '</div>';

  el('content').innerHTML = c;
  renderToc([['builder','Kreator instalacji'],['jak','Jak to działa'],['moduly','Moduły']]);
  mountBuilder();
}

function mountBuilder(){
  var grid = el('bGrid'), outEl = el('bOut'), gtmRow = el('gtmRow'), gtmInp = el('gtmId');
  var sel = { forms:true, cms:true };
  var flags = D2.start.builderFlags;
  var h = '';
  flags.forEach(function(f){
    h += '<label class="mod-check'+(sel[f.key]?' on':'')+'" data-key="'+f.key+'"><input type="checkbox"'+(sel[f.key]?' checked':'')+'><span class="nm">'+esc(f.label)+'</span><span class="fl">'+esc(f.flag)+'</span></label>';
  });
  grid.innerHTML = h;
  function render(){
    var fl = [];
    flags.forEach(function(f){
      if(!sel[f.key]) return;
      fl.push(f.key === 'google' ? 'd2-gtm="'+(gtmInp.value||'GTM-XXXXXXX')+'"' : f.flag);
    });
    gtmRow.classList.toggle('show', !!sel.google);
    outEl.innerHTML = codeBlock(loaderScript(fl), 'html', 'Site Settings → Head');
  }
  grid.querySelectorAll('.mod-check').forEach(function(l){
    l.addEventListener('change', function(){
      var k = l.getAttribute('data-key');
      sel[k] = l.querySelector('input').checked;
      l.classList.toggle('on', sel[k]);
      render();
    });
  });
  gtmInp.addEventListener('input', render);
  render();
}

/* ───────── wyszukiwarka ───────── */
var INDEX = [];
function buildIndex(){
  D2.categories.forEach(function(cat){
    cat.items.forEach(function(key){
      var m = D2.modules[key];
      if(!m) return;
      INDEX.push({ type:'mod', key:key, a:m.short||m.name, d:m.tagline||'', s:((m.short||'')+' '+m.name+' '+(m.flag||'')).toLowerCase() });
      (m.attrs||[]).forEach(function(a){
        INDEX.push({ type:'attr', key:key, a:a.a, d:a.d.replace(/<[^>]+>/g,''), s:(a.a+' '+a.d.replace(/<[^>]+>/g,'')).toLowerCase() });
      });
    });
  });
}
function bindSearch(){
  var inp = el('search'), pop = el('searchPop');
  inp.addEventListener('input', function(){
    var q = inp.value.toLowerCase().trim();
    if(q.length < 2){ pop.classList.remove('open'); return; }
    var res = INDEX.filter(function(i){ return i.s.indexOf(q) !== -1; }).slice(0, 14);
    var h = '';
    res.forEach(function(r){
      h += '<a class="sp-item" href="#/m/'+r.key+(r.type==='attr'?'@'+encodeURIComponent(r.a):'')+'">'+
        '<span class="sp-attr">'+esc(r.a)+'</span> <span class="sp-mod">· '+esc(D2.modules[r.key].short||D2.modules[r.key].name)+'</span>'+
        '<span class="sp-desc">'+esc(r.d)+'</span></a>';
    });
    pop.innerHTML = h || '<div class="sp-empty">Brak wyników dla „'+esc(q)+'”</div>';
    pop.classList.add('open');
  });
  document.addEventListener('click', function(e){
    if(!e.target.closest('.sb-search')) pop.classList.remove('open');
    if(e.target.closest('.sp-item')){ pop.classList.remove('open'); inp.value=''; }
  });
  document.addEventListener('keydown', function(e){
    if(e.key === '/' && document.activeElement !== inp && !e.target.closest('input,textarea,select')){ e.preventDefault(); inp.focus(); }
    if(e.key === 'Escape'){ pop.classList.remove('open'); inp.blur(); }
  });
}

/* ───────── kopiowanie (delegacja) ───────── */
document.addEventListener('click', function(e){
  var t = e.target.closest('[data-copy]');
  if(!t) return;
  copyText(t.getAttribute('data-copy'), t);
  var lbl = t.querySelector('span:last-child');
  if(t.classList.contains('copy-btn') && lbl){
    var old = lbl.textContent; lbl.textContent = 'Skopiowano!';
    setTimeout(function(){ lbl.textContent = old; }, 1300);
  }
});

/* ───────── router ───────── */
function route(){
  var h = location.hash || '#/';
  var attr = null;
  var mMatch = h.match(/^#\/m\/([a-z0-9-]+)(?:@(.+))?$/);
  if(mMatch){
    CUR = mMatch[1];
    attr = mMatch[2] ? decodeURIComponent(mMatch[2]) : null;
    pageModule(CUR);
  } else {
    CUR = 'start';
    pageStart();
  }
  renderSidebar(CUR);
  el('sidebar').classList.remove('open');
  el('overlay').classList.remove('show');
  window.scrollTo(0, 0);
  if(attr){
    setTimeout(function(){
      var row = document.querySelector('.attr-row[data-attr="'+attr.replace(/"/g,'\\"')+'"]');
      if(row){ row.scrollIntoView({behavior:'smooth', block:'center'}); row.classList.add('flash'); setTimeout(function(){ row.classList.remove('flash'); }, 1800); }
    }, 60);
  }
}

/* ───────── mobile ───────── */
el('burger') && el('burger').addEventListener('click', function(){
  el('sidebar').classList.add('open');
  el('overlay').classList.add('show');
});
el('overlay').addEventListener('click', function(){
  el('sidebar').classList.remove('open');
  el('overlay').classList.remove('show');
});

/* ───────── boot ───────── */
el('footVer').textContent = ' · ' + D2.version;
buildIndex();
bindSearch();
window.addEventListener('hashchange', route);
route();
})();
