/* WvH Schulchor: isolierter Vorschau-Modus mit ausschließlich erfundenen Beispieldaten.
   Keine Authentifizierung, kein Supabase-Aufruf, keine echten Aufnahmen oder Uploads. */
(() => {
  'use strict';
  const trigger = document.getElementById('demoNote');
  if (!trigger) return;
  const layer = document.createElement('div');
  layer.id = 'demoLayer';
  layer.className = 'demo-layer';
  layer.hidden = true;
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-labelledby', 'demoTitle');
  document.body.appendChild(layer);
  const demo = {role:'student', page:'songs', song:'winter', recorded:false, submitted:false, review:'Eingegangen', mix:false};
  const songs = [
    {id:'winter',title:'Winter Wonderland',description:'Beispielprojekt für die nächste Chorprobe',status:'Zum Einsingen'},
    {id:'probe',title:'Unsere Chorprobe',description:'Fiktives Testlied ohne echte Begleitdatei',status:'Entwurf'}
  ];
  const e = x => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function currentSong(){return songs.find(s=>s.id===demo.song)||songs[0];}
  function button(action,label,kind=''){return '<button type="button" class="demo-btn '+kind+'" data-demo="'+action+'">'+label+'</button>';}
  function studentContent(){
    if(demo.page==='songs')return '<h3>Meine Lieder</h3><p class="demo-muted">Zwei erfundene Beispielprojekte zum Ausprobieren.</p><div class="demo-cards">'+songs.map(s=>'<article class="demo-card"><div class="demo-pill">'+e(s.status)+'</div><h4>'+e(s.title)+'</h4><p>'+e(s.description)+'</p><button type="button" class="demo-btn" data-demo="song" data-id="'+e(s.id)+'">Lied ansehen</button></article>').join('')+'</div>';
    if(demo.page==='song')return '<h3>'+e(currentSong().title)+'</h3><p class="demo-muted">'+e(currentSong().description)+'</p><div class="demo-card"><h4>Begleitmusik</h4><p>In der Demo wird keine echte Datei geladen. Im richtigen Konto kannst du hier die Begleitung abspielen.</p></div>'+button('record-page','Einsingen ausprobieren');
    if(demo.page==='record')return '<h3>Einsingen – Demo</h3><p>Hier kannst du den Ablauf ausprobieren. <strong>Das Mikrofon wird nicht aktiviert.</strong> Die Aufnahme wird nur simuliert.</p><div class="demo-card"><h4>'+e(currentSong().title)+'</h4><p>'+(demo.recorded?'Beispielaufnahme ist bereit.':'Noch keine Beispielaufnahme vorhanden.')+'</p><div class="demo-actions">'+(!demo.recorded?button('simulate-record','Aufnahme simulieren'):button('simulate-reset','Neu beginnen','demo-secondary'))+(demo.recorded&&!demo.submitted?button('simulate-submit','Abgabe simulieren'):'')+'</div></div>'+(demo.submitted?'<p class="demo-success">Demo-Abgabe erfolgreich simuliert. Es wurde nichts hochgeladen.</p>':'');
    if(demo.page==='mine')return '<h3>Meine Abgaben</h3><div class="demo-card"><h4>Winter Wonderland</h4><p>'+(demo.submitted?'Beispielaufnahme · Abgegeben (nur Demo)':'Noch keine Demo-Abgabe.')+'</p></div>'+button('record-page','Zur Demo-Aufnahme');
    return '';
  }
  function teacherContent(){
    if(demo.page==='songs')return '<h3>Lieder verwalten</h3><p class="demo-muted">Alle Angaben sind erfunden. Hier kannst du die Lehreransicht kennenlernen.</p><div class="demo-cards">'+songs.map(s=>'<article class="demo-card"><div class="demo-pill">'+e(s.status)+'</div><h4>'+e(s.title)+'</h4><p>'+e(s.description)+'</p></article>').join('')+'</div><p>Im echten Lehrerbereich können Lieder erstellt, Dateien hochgeladen und Schüler zugewiesen werden.</p>';
    if(demo.page==='people')return '<h3>Schülerkonten</h3><div class="demo-card"><h4>Beispiel-Schüler</h4><p>Fiktives Konto – nur zur Darstellung.</p><p>Im echten Lehrerbereich werden Schülerkonten mit persönlichen Zugangsdaten angelegt.</p></div>';
    if(demo.page==='submissions')return '<h3>Eingänge</h3><div class="demo-card"><h4>Winter Wonderland</h4><p>Beispielaufnahme · Status: <strong>'+e(demo.review)+'</strong></p><div class="demo-actions">'+button('review-accepted','Als angenommen markieren')+button('review-rejected','Als zurückgestellt markieren','demo-secondary')+'</div><p class="demo-muted">Die Statusänderung betrifft nur die Demo.</p></div>';
    if(demo.page==='studio')return '<h3>Tonstudio</h3><div class="demo-card"><h4>Beispiel-Mischpult</h4><p>Spur 1 · Beispielstimme</p><div class="demo-track"><span>♫</span><span>▮▮▮▮ ▮▮▮ ▮▮▮▮▮ ▮▮▮</span></div><p>'+(demo.mix?'Beispiel-Mischung wurde simuliert.':'Hier werden später mehrere echte Choraufnahmen gemischt.')+'</p>'+button('simulate-mix','Mischung simulieren')+'</div>';
    return '';
  }
  function renderChoice(){
    layer.innerHTML='<div class="demo-dialog demo-chooser"><div class="demo-top"><div><span class="demo-eyebrow">WvH SCHULCHOR · LEHRKRAFT</span><h2 id="demoTitle">Lehrerkonto</h2></div><button type="button" class="demo-close" data-demo="close" aria-label="Schließen">×</button></div><div class="demo-choice-grid demo-teacher-only"><button class="demo-choice demo-choice-real" type="button" data-demo="choose-teacher-login"><span aria-hidden="true">♬</span><strong>Frau Noltes Konto</strong><small>Zur echten, passwortgeschützten Anmeldung für Lehrkräfte</small></button></div><p class="demo-choice-note">Die Anmeldung erfolgt ausschließlich mit den von Frau Nolte freigegebenen Zugangsdaten. Es werden keine Passwörter im Webseiten-Code gespeichert.</p></div>';
  }
  function render(){
    const teacher=demo.role==='teacher';
    const nav=teacher?[['songs','Lieder'],['people','Schülerkonten'],['submissions','Eingänge'],['studio','Tonstudio']]:[['songs','Meine Lieder'],['record','Einsingen'],['mine','Meine Abgaben']];
    layer.innerHTML='<div class="demo-dashboard"><div class="demo-dashboard-header"><div><span class="demo-eyebrow">WILHELM-VON-HUMBOLDT-SCHULE</span><h2 id="demoTitle">Unser Schulchor</h2><p>Gemeinsam singen. Auch wenn wir nicht im selben Raum sind.</p></div><span class="demo-notes" aria-hidden="true">♫ ♪ ♬</span></div><div class="demo-disclosure"><strong>TESTANSICHT</strong> · '+(teacher?'Lehrkraft':'Schüler/in')+' · Nur Beispieldaten, keine echte Anmeldung und keine gespeicherten Änderungen</div><div class="demo-dashboard-layout"><aside class="demo-sidebar"><div class="demo-identity"><strong>'+(teacher?'Beispiel-Lehrkraft':'Beispiel-Schüler/in')+'</strong><small>Testkonto · kein echter Benutzer</small></div><nav class="demo-nav" aria-label="Demo-Navigation">'+nav.map(([key,label])=>'<button type="button" data-demo="page" data-page="'+key+'" class="'+(demo.page===key?'selected':'')+'">'+label+'</button>').join('')+'</nav><div class="demo-sidebar-footer"><button type="button" class="demo-btn demo-secondary" data-demo="switch-role">Ansicht wechseln</button><button type="button" class="demo-btn demo-secondary" data-demo="close">Demo verlassen</button></div></aside><main class="demo-main">'+(teacher?teacherContent():studentContent())+'</main></div></div>';
  }
  function open(){
    renderChoice();layer.hidden=false;document.body.classList.add('demo-open');
    layer.querySelector('.demo-close')?.focus();
  }
  function close(){
    layer.hidden=true;document.body.classList.remove('demo-open');trigger.focus();
  }
  window.openWvhDemo = open;
  layer.addEventListener('click',ev=>{
    const target=ev.target.closest('button[data-demo]');
    if(!target)return;
    const action=target.dataset.demo;
    if(action==='close'){close();return;}
    if(action==='switch-role'){renderChoice();return;}
    if(action==='choose-login'||action==='choose-teacher-login'){
      close();
      if(action==='choose-teacher-login' && !document.getElementById('loginEmail')){
        alert('Du bist bereits angemeldet. Für ein anderes echtes Konto musst du dich erst regulär abmelden. Das Lehrerkonto benötigt eigene, von Frau Nolte freigegebene Zugangsdaten.');
        return;
      }
      const email=document.getElementById('loginEmail');
      if(email){email.scrollIntoView({behavior:'smooth',block:'center'});email.focus();}
      else document.querySelector('.identity')?.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    if(action==='choose-student'||action==='choose-teacher'){
      demo.role=action==='choose-teacher'?'teacher':'student';
      demo.page='songs';
      render();
      return;
    }
    if(action==='student'||action==='teacher'){demo.role=action;demo.page='songs';}
    if(action==='page')demo.page=target.dataset.page;
    if(action==='song'){demo.song=target.dataset.id;demo.page='song';}
    if(action==='record-page')demo.page='record';
    if(action==='simulate-record'){demo.recorded=true;demo.submitted=false;}
    if(action==='simulate-reset'){demo.recorded=false;demo.submitted=false;}
    if(action==='simulate-submit'&&demo.recorded)demo.submitted=true;
    if(action==='review-accepted')demo.review='Angenommen';
    if(action==='review-rejected')demo.review='Zurückgestellt';
    if(action==='simulate-mix')demo.mix=true;
    render();
  });
  layer.addEventListener('click',ev=>{if(ev.target===layer)close();});
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!layer.hidden){ev.preventDefault();close();}});
})();