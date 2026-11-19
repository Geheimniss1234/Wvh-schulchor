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
    layer.innerHTML='<div class="demo-dialog demo-chooser"><div class="demo-top"><div><span class="demo-eyebrow">WvH SCHULCHOR · AUSWAHL</span><h2 id="demoTitle">Wie möchtest du die Webseite ansehen?</h2></div><button type="button" class="demo-close" data-demo="close" aria-label="Auswahl schließen">×</button></div><div class="demo-choice-grid"><button class="demo-choice" type="button" data-demo="choose-student"><span aria-hidden="true">♫</span><strong>Schüler-Demo</strong><small>Aufnehmen und Abgeben mit Beispieldaten ausprobieren</small></button><button class="demo-choice" type="button" data-demo="choose-teacher"><span aria-hidden="true">♬</span><strong>Lehrer-Demo</strong><small>Lieder, Schülerverwaltung und Tonstudio mit Beispieldaten ansehen</small></button><button class="demo-choice demo-choice-real" type="button" data-demo="choose-login"><span aria-hidden="true">♩</span><strong>Echte Anmeldung</strong><small>Mit deinem eigenen Schüler- oder Lehrerkonto anmelden</small></button></div><p class="demo-choice-note">Die beiden Demos sind öffentlich und enthalten keine echten Schülerdaten. Zugriff auf das echte Lehrerkonto gibt es ausschließlich mit dem zugehörigen Passwort.</p></div>';
  }
  function render(){
    const teacher=demo.role==='teacher';
    const nav=teacher?[['songs','Lieder'],['people','Schülerkonten'],['submissions','Eingänge'],['studio','Tonstudio']]:[['songs','Meine Lieder'],['record','Einsingen'],['mine','Meine Abgaben']];
    layer.innerHTML='<div class="demo-dialog"><div class="demo-top"><div><span class="demo-eyebrow">WvH SCHULCHOR · UNVERBINDLICHE VORSCHAU</span><h2 id="demoTitle">Demo-Modus</h2></div><button type="button" class="demo-close" data-demo="close" aria-label="Demo schließen">×</button></div><div class="demo-banner"><strong>Nur zum Ausprobieren:</strong> Alle Konten, Lieder und Aufnahmen hier sind Beispiele. Es gibt keinen Zugriff auf echte Daten, keine echte Anmeldung und keinen Upload.</div><div class="demo-role"><span>Ansicht:</span><button type="button" class="'+(!teacher?'selected':'')+'" data-demo="student">Schüler</button><button type="button" class="'+(teacher?'selected':'')+'" data-demo="teacher">Lehrkraft</button></div><div class="demo-layout"><nav class="demo-nav" aria-label="Demo-Navigation">'+nav.map(([key,label])=>'<button type="button" data-demo="page" data-page="'+key+'" class="'+(demo.page===key?'selected':'')+'">'+label+'</button>').join('')+'</nav><div class="demo-main">'+(teacher?teacherContent():studentContent())+'</div></div><div class="demo-bottom">Die echte Schulchor-Anmeldung bleibt unverändert. '+button('close','Zurück zur echten Webseite','demo-secondary')+'</div></div>';
  }
  function open(){
    renderChoice();layer.hidden=false;document.body.classList.add('demo-open');
    layer.querySelector('.demo-close')?.focus();
  }
  function close(){
    layer.hidden=true;document.body.classList.remove('demo-open');trigger.focus();
  }
  trigger.addEventListener('click',open);
  layer.addEventListener('click',ev=>{
    const target=ev.target.closest('button[data-demo]');
    if(!target)return;
    const action=target.dataset.demo;
    if(action==='close'){close();return;}
    if(action==='choose-login'){
      close();
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