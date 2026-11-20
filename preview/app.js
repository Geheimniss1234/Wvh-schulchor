/* WvH Schulchor - geschuetzte Supabase-Testanwendung. Keine geheimen Schluessel im Browser. */
'use strict';
const CONFIG = Object.freeze({
  url: 'https://hflusfleveiozdbvkabw.supabase.co',
  publishableKey: 'sb_publishable_P_gQK1ulprApFntcknFB8A_b812Q40P'
});
const $ = (id) => document.getElementById(id);
const esc = (x) => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = (d) => d ? new Date(d).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'}) : '';
const errText = (e) => (e && e.message) ? e.message : String(e);
const humanDuration = sec => String(Math.floor(sec/60)).padStart(2,'0')+':'+String(Math.floor(sec%60)).padStart(2,'0');
const cleanFilename = s => String(s||'').replace(/[^a-z0-9_.-]/gi,'_').slice(0,70);
const allowedMimes = new Set(['audio/webm','audio/mp4','audio/mpeg','audio/wav','audio/x-wav','audio/ogg','video/mp4','video/webm']);
const maxUpload = 48 * 1024 * 1024;
let sb = null;
const state = {user:null,profile:null,page:'songs',songs:[],people:[],assignments:[],recs:[],counts:[],songId:null,
  pending:null,mediaUrl:null,mediaPath:null,mediaSongId:null,deviceId:'',recorder:null,videoRecorder:null,videoStream:null,videoPreview:false,stream:null,timer:null,started:0,countdownActive:false,
  trackFile:null,studioTracks:[],studioSources:[],audioContext:null,loading:false,initializing:false};

function notify(message,error=false){const el=$('message');el.hidden=false;el.className='toast'+(error?' error':'');el.textContent=message;}
function clearNotice(){$('message').hidden=true;}
function throwIfError(result){if(result.error)throw result.error;return result.data;}
function isTeacher(){return state.profile?.role==='teacher';}
function findSong(id=state.songId){return state.songs.find(x=>x.id===id);}
function canRecord(song){return song?.status==='active' && state.assignments.some(a=>a.student_id===state.user?.id && a.song_id===song.id);}
function myRecs(songId){return state.recs.filter(r=>r.student_id===state.user?.id && (!songId||r.song_id===songId));}
function counts(song){const n=state.counts.find(c=>c.song_id===song.id);return n ? `${n.submitted_count} Aufnahmen · ${n.singer_count} Singende` : 'Aufnahmezahl noch nicht verfügbar';}
function pill(song){const d={active:['Zum Einsingen',''],draft:['Entwurf','warn'],finished:['Abgeschlossen','done']}[song.status]||['Unbekannt',''];return `<span class="pill ${d[1]}">${d[0]}</span>`;}
function mediaIsVideo(path,mime){if(mime)return mime.startsWith('video/');return /\.(mp4|mov)$/i.test(path||'');}
function roleShell(content){const nav=isTeacher()?[
  ['songs','Lieder'],['people','Schülerkonten'],['submissions','Eingänge'],['studio','Tonstudio']
]:[['songs','Meine Lieder'],['record','Einsingen'],['mine','Meine Abgaben']];
  return `<div class="shell"><aside class="sidebar"><div class="identity"><b>${esc(state.profile?.display_name||state.profile?.username||'Schulchor')}</b><small>${isTeacher()?'Lehrkraft':'Schüler/in'}</small><small>${esc(state.user?.email||'')}</small></div><div class="nav-buttons">${nav.map(([key,label])=>`<button data-page="${key}" class="${state.page===key?'active':''}">${label}</button>`).join('')}</div><div class="logout-area"><button type="button" class="logout-button" data-action="logout" aria-label="Vom Schulchor abmelden"><span aria-hidden="true">↪</span> Abmelden</button></div></aside><div class="content">${content}</div></div>`;}
function loginView(){return `<section class="panel centered"><h2>Willkommen im Schulchor</h2><p class="muted">Melde dich mit deinen persönlichen Schulchor-Zugangsdaten an. Schüler und Lehrkräfte erhalten automatisch die passende Ansicht.</p><form id="loginForm" class="stack"><div><label for="loginEmail">E-Mail-Adresse</label><input type="email" id="loginEmail" name="email" required autocomplete="username" placeholder="name@schule.de"></div><div><label for="loginPassword">Schulchor-Passwort</label><input type="password" id="loginPassword" name="password" required autocomplete="current-password"></div><button class="button" type="submit">Anmelden</button></form><p class="tiny muted">Neue Konten erstellt Frau Nolte. Keine öffentliche Registrierung. Das Passwort ist ein eigenes Schulchor-Passwort, nicht das Microsoft-365-Passwort.</p></section>`;}
function songsView(){let songs=isTeacher()?state.songs:state.songs.filter(s=>state.assignments.some(a=>a.song_id===s.id&&a.student_id===state.user?.id));
  const intro=isTeacher()?`<div class="row between"><div><h2>Alle Lieder</h2><p class="muted">Neue Lieder erstellen, Begleitung hochladen und Schüler zuweisen.</p></div><button class="button" data-action="new-song">+ Neues Lied</button></div>`:
  `<h2>Meine Lieder</h2><p class="muted">Hier siehst du, was du noch einsingen sollst und was du bereits abgegeben hast.</p>`;
  return intro+`<div class="cards">${songs.map(s=>{const count=myRecs(s.id).length;const finished=s.status==='finished';const stateText=isTeacher()?counts(s):finished?'Abgeschlossen':count?`Schon ${count} Aufnahme(n) abgegeben`:'Noch nicht eingesungen';return `<article class="song-card">${pill(s)}<h3>${esc(s.title)}</h3><p class="muted">${esc(s.description||'Gemeinsam ein Lied aufnehmen.')}</p><p><b>${esc(stateText)}</b></p>${s.accompaniment_path?'<p class="tiny">♪ Begleitmusik/Video vorhanden</p>':'<p class="tiny muted">Noch keine Begleitung</p>'}<button class="button" data-open-song="${esc(s.id)}">${isTeacher()?'Verwalten':finished?'Ansehen':'Zum Lied'}</button></article>`}).join('')}</div>${songs.length?'':'<div class="panel">Noch keine zugewiesenen Lieder.</div>'}`;}
function newSongView(){return `<div class="row"><button class="button-secondary" data-page="songs">← Zurück</button></div><section class="panel"><h2>Neues Lied erstellen</h2><form id="songCreateForm" class="stack"><div><label for="songTitle">Liedtitel</label><input id="songTitle" name="title" required maxlength="150" placeholder="Titel des Liedes"></div><div><label for="songDesc">Hinweise für Schüler</label><textarea name="description" maxlength="1500" placeholder="Zum Beispiel: Kopfhörer verwenden"></textarea></div><div><label for="songStatus">Status</label><select name="status"><option value="draft">Entwurf – noch nicht sichtbar</option><option value="active">Aktiv – zum Einsingen</option></select></div><button class="button">Lied erstellen</button></form></section>`;}
function manageSongView(){const song=findSong();if(!song)return `<p>Lied nicht gefunden.</p>`;
  const assigned=new Set(state.assignments.filter(a=>a.song_id===song.id).map(a=>a.student_id));
  const opts=state.people.filter(p=>p.role==='student');
  return `<div class="row"><button class="button-secondary" data-page="songs">← Lieder</button></div><h2>${esc(song.title)}</h2><p class="muted">${esc(song.description||'')}</p><section class="panel"><h3>Veröffentlichung</h3><div class="row"><select id="songStatusEdit" class="song-select"><option value="draft" ${song.status==='draft'?'selected':''}>Entwurf</option><option value="active" ${song.status==='active'?'selected':''}>Zum Einsingen freigeben</option><option value="finished" ${song.status==='finished'?'selected':''}>Abgeschlossen</option></select><button class="button-secondary" data-action="save-song-status">Speichern</button></div></section>
  <section class="panel"><h3>Begleitmusik oder Video hochladen</h3><p class="muted">MP3, WAV, M4A, OGG, WEBM oder MP4. Schüler können die Begleitung beim Einsingen hören oder ein Video mitlesen. Dateien bis 48 MB. Größere Videos werden in unterstützten Browsern automatisch verkleinert; dies kann so lange wie das Video dauern.</p><div class="dropzone" id="uploadZone"><b>Datei hierherziehen</b><p>oder</p><input id="mediaFile" type="file" accept="audio/*,video/mp4,video/webm"><p id="mediaSelection" class="tiny muted">Noch keine Datei ausgewählt</p><button class="button" data-action="upload-media" type="button">Begleitung hochladen</button></div><div id="mediaArea">${song.accompaniment_path?'<p class="tiny">Gespeicherte Begleitung wird geladen …</p>':'<p class="muted">Noch keine Datei hochgeladen.</p>'}</div></section>
  <section class="panel"><h3>Schüler zuweisen</h3><p class="muted">Nur zugewiesene Schüler sehen dieses Lied.</p><div class="checkbox-list">${opts.length?opts.map(p=>`<div class="checkbox-row"><input type="checkbox" class="assignBox" id="assign_${esc(p.id)}" value="${esc(p.id)}" ${assigned.has(p.id)?'checked':''}><label for="assign_${esc(p.id)}">${esc(p.display_name||p.username||'Schüler')}</label></div>`).join(''):'Noch keine Schülerkonten. Lege sie unter „Schülerkonten“ an.'}</div><p><button class="button-secondary" data-action="save-assignments">Zuweisungen speichern</button></p></section>`;}
function peopleView(){const students=state.people.filter(p=>p.role==='student');return `<h2>Schülerkonten</h2><p class="muted">Frau Nolte verwaltet die Zugänge. Das Passwort wird sicher erzeugt und nur unmittelbar nach Erstellung oder Zurücksetzung angezeigt.</p><div class="two-col"><section class="panel"><h3>Schüler hinzufügen</h3><form id="createStudentForm" class="stack"><div><label for="newStudentName">Anzeigename</label><input id="newStudentName" name="name" required maxlength="70" placeholder="Vorname oder Kürzel"></div><div><label for="newStudentEmail">E-Mail-Adresse des Schülers</label><input id="newStudentEmail" name="email" type="email" required autocomplete="off" placeholder="schule@example.de"></div><button class="button">Zugang erstellen</button></form><p class="tiny muted">Für diese erste Version erfolgt die Anmeldung mit E-Mail + zugeteiltem Passwort. Für Benutzername-ohne-E-Mail wäre eine zusätzliche gesicherte Zuordnung nötig.</p><div id="studentCreated"></div></section><section class="panel"><h3>Vorhandene Konten (${students.length})</h3>${students.length?students.map(p=>`<div class="list-row"><b>${esc(p.display_name||p.username)}</b><div class="tiny muted">${esc(p.login_email||'')}</div><button class="button-secondary" data-reset-student="${esc(p.id)}">Passwort neu vergeben</button></div>`).join(''):'Noch keine Schülerkonten.'}</section></div>`;}
function studentSongView(){const song=findSong();if(!song)return `<p>Bitte wähle erst ein Lied.</p>`;const mine=myRecs(song.id).length;return `<div class="row"><button class="button-secondary" data-page="songs">← Meine Lieder</button></div><section class="panel"><h2>${esc(song.title)}</h2>${pill(song)}<p>${esc(song.description||'')}</p><p><b>${mine} eigene Abgabe(n)</b> · ${esc(counts(song))}</p>${song.accompaniment_path?'<p>Frau Nolte hat eine Begleitung bereitgestellt.</p>':'<div class="notice">Für dieses Lied wurde noch keine Begleitung hochgeladen.</div>'}<div class="row">${song.status==='active'?`<button class="button" data-action="go-record">Jetzt einsingen</button>`:''}<button class="button-secondary" data-page="mine">Meine Abgaben</button></div></section>`;}
function recordView(){let songs=state.songs.filter(s=>canRecord(s));let selected=songs.find(s=>s.id===state.songId)||songs[0];if(selected)state.songId=selected.id;
  return `<h2>Deine Stimme einsingen</h2><p class="muted">Drei Schritte: Begleitung anhören, aufnehmen, kontrollieren und abgeben.</p>${songs.length?`<section class="panel"><label for="recSongSelect">Welches Lied?</label><select id="recSongSelect" class="song-select">${songs.map(s=>`<option value="${esc(s.id)}" ${s.id===state.songId?'selected':''}>${esc(s.title)}</option>`).join('')}</select><div id="recMedia"><p class="muted">Begleitung wird geladen …</p></div><label for="micSelect">Mikrofon</label><div class="row"><select id="micSelect" class="song-select"><option value="">Standardmikrofon</option></select><button class="button-secondary" data-action="refresh-mics">Mikrofone anzeigen</button></div><div class="panel" style="margin:14px 0"><label><input type="checkbox" id="cameraEnabled"> Kamera mitaufnehmen (freiwillig)</label><p class="tiny muted">Wenn aktiviert, wird zusätzlich ein stummes Kameravideo aufgenommen, das du auf deinem PC speichern kannst. Deine Stimme wird separat aufgenommen und wie bisher an Frau Nolte gesendet. Das Video wird nicht hochgeladen.</p><video id="cameraPreview" autoplay muted playsinline style="display:none;width:100%;max-width:380px;border-radius:12px;background:#111" aria-label="Kameravorschau"></video></div><div class="mic-stage" id="micStage"><div id="recLive">Bereit zur Aufnahme</div><div class="timer" id="recTimer">00:00</div><p class="tiny muted">Nach dem Klick startet ein Countdown von 3 Sekunden. Benutze Kopfhörer.</p><button class="button" id="startRecording" data-action="start-record">● Aufnahme starten</button><button class="button-danger hidden" id="stopRecording" data-action="stop-record">■ Aufnahme beenden</button></div><div id="reviewArea"></div></section>`:'<div class="notice">Du hast gerade kein aktives Lied zum Einsingen. Frau Nolte kann dir eines zuweisen.</div>'}`;}
function submissionsView(own=false){let arr=own?myRecs():state.recs;return `<h2>${own?'Meine Abgaben':'Eingegangene Aufnahmen'}</h2><p class="muted">${own?'Deine Abgaben liegen geschützt im Schulchor-Speicher.':'Nur berechtigte Lehrkräfte können die eingereichten Stimmen aller Schüler abrufen.'}</p><section class="panel">${arr.length?arr.map(r=>{let s=state.songs.find(x=>x.id===r.song_id),p=state.people.find(x=>x.id===r.student_id);return `<div class="list-row"><div class="row between"><div><b>${esc(s?.title||'Lied')}</b> · ${esc(p?.display_name||p?.username||(own?'Du':'Schüler'))}<div class="tiny muted">${fmtDate(r.created_at)}</div></div><span class="pill">${r.status==='accepted'?'Angenommen':r.status==='rejected'?'Noch einmal einsingen':'Eingegangen'}</span></div><div class="row"><button class="button-secondary" data-listen="${esc(r.id)}">Anhören</button>${!own?`<select class="song-select" data-rec-status="${esc(r.id)}"><option value="submitted" ${r.status==='submitted'?'selected':''}>Eingegangen</option><option value="accepted" ${r.status==='accepted'?'selected':''}>Angenommen</option><option value="rejected" ${r.status==='rejected'?'selected':''}>Bitte erneut</option></select><button class="button-secondary" data-save-rec-status="${esc(r.id)}">Status speichern</button>`:''}</div><div id="audio_${esc(r.id)}"></div></div>`}).join(''):'Hier sind noch keine Aufnahmen.'}</section>`;}
function studioView(){let songs=state.songs.filter(s=>state.recs.some(r=>r.song_id===s.id));let song=songs.find(s=>s.id===state.songId)||songs[0];if(song)state.songId=song.id;let tracks=state.recs.filter(r=>r.song_id===state.songId);return `<h2>Tonstudio</h2><div class="notice"><b>Zeitliche Ausrichtung:</b> Aufnahmen mit Begleitmusik erhalten eine automatische Startzeit-Korrektur. Zusätzlich kannst du Spuren manuell verschieben. Geräte-Latenz und musikalische Einsätze werden noch nicht automatisch analysiert.</div><section class="panel">${songs.length?`<label for="studioSong">Lied</label><select id="studioSong" class="song-select">${songs.map(s=>`<option value="${esc(s.id)}" ${s.id===state.songId?'selected':''}>${esc(s.title)}</option>`).join('')}</select><h3 style="margin-top:20px">Stimmen (${tracks.length})</h3><div id="mixerTracks">${tracks.map(r=>{let p=state.people.find(x=>x.id===r.student_id);return `<div class="mixer-track"><div><b>${esc(p?.display_name||p?.username||'Schüler')}</b><div class="tiny muted">${fmtDate(r.created_at)}</div></div><div><label for="gain_${esc(r.id)}">Lautstärke <span id="gainlabel_${esc(r.id)}">80 %</span></label><input id="gain_${esc(r.id)}" type="range" min="0" max="150" value="80" data-gain="${esc(r.id)}"></div><div><label for="offset_${esc(r.id)}">Manuelle Korrektur (ms) · Auto: ${-Number(r.reference_lead_ms||0)} ms</label><input id="offset_${esc(r.id)}" type="number" min="-10000" max="10000" step="10" value="0" data-offset="${esc(r.id)}"></div></div>`}).join('')}</div><p class="tiny muted">Die gespeicherte automatische Startkorrektur wird zusätzlich zur manuellen Eingabe berücksichtigt. Positive manuelle Werte starten später; negative schneiden den Anfang ab. Die Korrektur schätzt nur den Beginn der Begleitmusik, nicht die Mikrofon-Latenz.</p><div class="row"><button class="button" data-action="play-mix">▶ Mix anhören</button><button class="button-secondary" data-action="stop-mix">■ Stopp</button><button class="button-secondary" data-action="export-mix">Mix als WAV herunterladen</button></div><p id="studioStatus" class="muted"></p>`:'Noch keine eingereichten Aufnahmen.'}</section>`;}
function render(){if(!state.user){$('app').innerHTML=loginView();return;}if(!state.profile){$('app').innerHTML='<section class="panel"><h2>Profil nicht gefunden</h2><p>Für dieses Konto ist noch kein Schulchor-Profil eingerichtet. Bitte Frau Nolte benachrichtigen.</p><button class="button" data-action="logout">Abmelden</button></section>';return;}
  const teacher=isTeacher();if(!teacher&&!['songs','song','record','mine'].includes(state.page))state.page='songs';let body='';
  switch(state.page){case 'songs':body=songsView();break;case 'song':body=teacher?manageSongView():studentSongView();break;case 'new-song':body=teacher?newSongView():songsView();break;case 'people':body=teacher?peopleView():songsView();break;case 'record':body=recordView();break;case 'mine':body=submissionsView(true);break;case 'submissions':body=submissionsView(false);break;case 'studio':body=studioView();break;default:body=songsView()}
  $('app').innerHTML=roleShell(body);
  if(state.page==='song'&&teacher)setupMediaDrop();
  if((state.page==='song'&&teacher||state.page==='record')&&findSong())loadMedia(findSong(),state.page==='record'?'recMedia':'mediaArea').catch(e=>notify('Begleitung konnte nicht geladen werden: '+errText(e),true));
  if(state.page==='record')refreshMics(false).catch(()=>{});
  if(state.page==='record'&&state.pending?.songId===state.songId)renderReview();
  if(state.page==='studio')state.studioTracks=[];
}
async function refresh(){if(!state.user)return;state.loading=true;try{
  state.profile=throwIfError(await sb.from('profiles').select('id,username,display_name,role,login_email').eq('id',state.user.id).single());
  let [songs,assign,records,people,counts]=await Promise.all([
    sb.from('songs').select('*').order('created_at',{ascending:false}),
    sb.from('assignments').select('id,song_id,student_id'),
    sb.from('recordings').select('*').order('created_at',{ascending:false}),
    isTeacher()?sb.from('profiles').select('id,username,display_name,role,login_email').order('created_at',{ascending:true}):Promise.resolve({data:[state.profile]}),
    sb.rpc('song_submission_counts')
  ]);
  state.songs=throwIfError(songs)||[];state.assignments=throwIfError(assign)||[];state.recs=throwIfError(records)||[];state.people=throwIfError(people)||[];
  state.counts=counts.error?[]:(counts.data||[]);
  if(counts.error)console.warn('Song counts RPC fehlt:',counts.error.message);
  if(state.songId&&!state.songs.some(s=>s.id===state.songId))state.songId=null;
  if(!state.songId&&state.songs.length)state.songId=state.songs[0].id;
  render();
}catch(e){notify('Daten konnten nicht geladen werden: '+errText(e),true);$('app').innerHTML=`<section class="panel"><h2>Verbindung fehlgeschlagen</h2><p>${esc(errText(e))}</p><button class="button" data-action="retry">Erneut versuchen</button> <button class="button-secondary" data-action="logout">Abmelden</button></section>`;}finally{state.loading=false;}}
async function enterSession(session){const old=state.user?.id||null,now=session?.user?.id||null;if(old===now&&old!==null)return;stopMix();stopRecorder();clearPending();state.user=session?.user||null;state.profile=null;state.page='songs';state.songs=[];state.people=[];state.assignments=[];state.recs=[];state.counts=[];state.songId=null;if(now){$('app').innerHTML='<section class="panel centered">Daten werden geladen …</section>';await refresh();}else render();}
async function login(form){const email=form.elements.email.value.trim(),password=form.elements.password.value;const btn=form.querySelector('button[type="submit"]');btn.disabled=true;try{const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;form.elements.password.value='';clearNotice();}catch(e){notify('Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.',true);}finally{btn.disabled=false;}}
async function createSong(form){let title=form.elements.title.value.trim(),description=form.elements.description.value.trim(),status=form.elements.status.value;if(!title)throw Error('Titel fehlt');let {data,error}=await sb.from('songs').insert({title,description,status}).select('id').single();if(error)throw error;state.songId=data.id;state.page='song';await refresh();notify('Lied wurde erstellt.');}
async function saveSongStatus(){let s=findSong();if(!s)return;const status=$('songStatusEdit')?.value;throwIfError(await sb.from('songs').update({status}).eq('id',s.id));await refresh();notify('Liedstatus gespeichert.');}
async function saveAssignments(){const s=findSong();if(!s)return;const want=new Set(Array.from(document.querySelectorAll('.assignBox:checked')).map(el=>el.value));const existing=state.assignments.filter(a=>a.song_id===s.id);const old=new Set(existing.map(a=>a.student_id));let remove=existing.filter(a=>!want.has(a.student_id)).map(a=>a.id);let add=Array.from(want).filter(id=>!old.has(id)).map(student_id=>({song_id:s.id,student_id}));if(remove.length)throwIfError(await sb.from('assignments').delete().in('id',remove));if(add.length)throwIfError(await sb.from('assignments').insert(add));await refresh();notify('Zuweisungen gespeichert.');}
function mediaMarkup(url,path,mime){let attr=esc(url);return mediaIsVideo(path,mime)?`<video class="media" controls playsinline preload="metadata" src="${attr}"></video>`:`<audio class="media" controls preload="metadata" src="${attr}"></audio>`;}
async function loadMedia(song,area){const target=$(area);if(!target)return;if(!song.accompaniment_path){target.innerHTML='<p class="muted">Noch keine Begleitung bereitgestellt. Die Aufnahme funktioniert auch ohne Begleitdatei.</p>';return;}
  const path=song.accompaniment_path;const {data,error}=await sb.storage.from('accompaniments').createSignedUrl(path,900);
  if(error)throw error;if(state.page==='record'&&state.songId!==song.id)return;
  target.innerHTML=`<p><b>Begleitung</b> · <span class="tiny muted">Privater Speicher, zeitlich begrenzter Link</span></p>${mediaMarkup(data.signedUrl,path,song.accompaniment_mime)}<p class="tiny muted">Die Wiedergabe startet bei einer Aufnahme automatisch von Anfang an. Kopfhörer verwenden.</p>`;
  state.mediaUrl=data.signedUrl;state.mediaPath=path;state.mediaSongId=song.id;
}
function setupMediaDrop(){const zone=$('uploadZone'),input=$('mediaFile');if(!zone||!input)return;
  for(let ev of ['dragenter','dragover'])zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add('dragging');});
  for(let ev of ['dragleave','drop'])zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove('dragging');});
  zone.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(f){state.trackFile=f;$('mediaSelection').textContent=f.name+' ('+(f.size/1048576).toFixed(1)+' MB)';}});
  input.addEventListener('change',()=>{state.trackFile=input.files[0]||null;$('mediaSelection').textContent=state.trackFile?state.trackFile.name:'Keine Datei ausgewählt';});
}

async function compressLargeVideo(original){
  const outMime=['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm'].find(t=>window.MediaRecorder?.isTypeSupported(t));
  if(!outMime||!HTMLCanvasElement.prototype.captureStream||!(window.AudioContext||window.webkitAudioContext))
    throw Error('Automatische Videokomprimierung wird hier nicht unterstützt. Bitte Chrome oder Edge am Computer verwenden.');
  const video=document.createElement('video'), url=URL.createObjectURL(original);
  video.src=url;video.preload='auto';video.playsInline=true;
  video.style.cssText='position:fixed;left:-10000px;top:0;width:2px;height:2px;pointer-events:none';
  document.body.appendChild(video);
  let audio=null,stream=null,recorder=null,interval=null,frame=null;
  try{
    await new Promise((ok,fail)=>{
      if(video.readyState>=1)return ok();
      video.addEventListener('loadedmetadata',ok,{once:true});
      video.addEventListener('error',()=>fail(Error('Videodatei konnte nicht gelesen werden.')),{once:true});
      video.load();
    });
    const duration=video.duration;
    if(!Number.isFinite(duration)||duration<=0||duration>1200)throw Error('Das Video muss zwischen 1 Sekunde und 20 Minuten lang sein.');
    const canvas=document.createElement('canvas');
    const scale=Math.min(1,960/Math.max(1,video.videoWidth),540/Math.max(1,video.videoHeight));
    canvas.width=Math.max(2,Math.round(video.videoWidth*scale/2)*2);
    canvas.height=Math.max(2,Math.round(video.videoHeight*scale/2)*2);
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)throw Error('Videokomprimierung nicht verfügbar.');
    const draw=()=>{if(video.readyState>=2)ctx.drawImage(video,0,0,canvas.width,canvas.height);frame=requestAnimationFrame(draw);};
    draw();
    stream=canvas.captureStream(20);
    audio=new (window.AudioContext||window.webkitAudioContext)();
    const source=audio.createMediaElementSource(video),dest=audio.createMediaStreamDestination();
    source.connect(dest);
    dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
    await audio.resume();
    const videoRate=Math.max(160000,Math.min(1100000,Math.floor(40*1024*1024*8/duration)-96000));
    recorder=new MediaRecorder(stream,{mimeType:outMime,videoBitsPerSecond:videoRate,audioBitsPerSecond:96000});
    const chunks=[];
    const finished=new Promise((ok,fail)=>{
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
      recorder.onerror=e=>fail(Error('Komprimierung fehlgeschlagen.'));
      recorder.onstop=()=>{const b=new Blob(chunks,{type:'video/webm'});b.size?ok(new File([b],original.name.replace(/\.[^.]+$/,'')+'-klein.webm',{type:'video/webm'})):fail(Error('Das Video konnte nicht verarbeitet werden.'));};
    });
    video.addEventListener('ended',()=>{if(recorder.state!=='inactive')recorder.stop();},{once:true});
    recorder.start(1000);
    try{await video.play();}catch{throw Error('Videowiedergabe blockiert. Bitte Chrome oder Edge am Computer verwenden.');}
    interval=setInterval(()=>notify('Video wird verkleinert: '+Math.min(99,Math.round(video.currentTime/duration*100))+' %. Bitte Tab offen lassen.'),1000);
    const result=await finished;
    if(result.size>maxUpload)throw Error('Das verkleinerte Video ist weiterhin größer als 48 MB.');
    return result;
  }finally{
    if(interval)clearInterval(interval);
    if(frame)cancelAnimationFrame(frame);
    video.pause();
    if(recorder&&recorder.state!=='inactive')try{recorder.stop();}catch{}
    if(stream)stream.getTracks().forEach(t=>t.stop());
    if(audio)await audio.close().catch(()=>{});
    video.removeAttribute('src');video.load();video.remove();URL.revokeObjectURL(url);
  }
}

async function uploadMedia(){let file=state.trackFile;const song=findSong();if(!song||!file)throw Error('Bitte zuerst eine Audio- oder Videodatei auswählen.');let mime=file.type.split(';')[0];if(!allowedMimes.has(mime))throw Error('Nicht unterstützter Dateityp: '+(mime||'unbekannt'));if(file.size>maxUpload){if(!mime.startsWith('video/'))throw Error('Audiodateien müssen kleiner als 48 MB sein.');notify('Großes Video wird automatisch verkleinert. Dies dauert etwa so lange wie das Video.');file=await compressLargeVideo(file);mime=file.type;}let ext=(file.name.split('.').pop()||'').toLowerCase();if(!/^(mp3|wav|m4a|mp4|ogg|webm)$/.test(ext))throw Error('Dateiendung nicht unterstützt.');let path=`${song.id}/${crypto.randomUUID()}.${ext}`;notify('Begleitung wird hochgeladen …');throwIfError(await sb.storage.from('accompaniments').upload(path,file,{contentType:mime,upsert:false}));let result=await sb.from('songs').update({accompaniment_path:path,accompaniment_mime:mime}).eq('id',song.id);if(result.error)throw result.error;state.trackFile=null;await refresh();notify('Begleitung für zugewiesene Schüler bereitgestellt.');}
async function refreshMics(ask=true){const select=$('micSelect');if(!select||!navigator.mediaDevices?.enumerateDevices)return;
  let temp=null;if(ask){temp=await navigator.mediaDevices.getUserMedia({audio:true});}
  try{const devices=(await navigator.mediaDevices.enumerateDevices()).filter(x=>x.kind==='audioinput');select.innerHTML='<option value="">Standardmikrofon</option>'+devices.map((d,i)=>`<option value="${esc(d.deviceId)}" ${d.deviceId===state.deviceId?'selected':''}>${esc(d.label||'Mikrofon '+(i+1))}</option>`).join('');}finally{temp?.getTracks().forEach(t=>t.stop());}}
function stopRecorder(){state.countdownActive=false;if(state.videoRecorder?.state==='recording'){try{state.videoRecorder.stop()}catch{}}if(state.recorder?.state==='recording'){try{state.recorder.stop()}catch{}}state.recorder=null;state.videoRecorder=null;state.videoStream?.getTracks().forEach(t=>t.stop());state.videoStream=null;state.stream?.getTracks().forEach(t=>t.stop());state.stream=null;if(state.timer)clearInterval(state.timer);state.timer=null;}
function clearPending(){if(state.pending?.url)URL.revokeObjectURL(state.pending.url);if(state.pending?.videoUrl)URL.revokeObjectURL(state.pending.videoUrl);state.pending=null;}
function recordingUi(live){const s=$('micStage'),go=$('startRecording'),stop=$('stopRecording');if(!s)return;s.classList.toggle('recording-live',live);if(go)go.classList.toggle('hidden',live);if(stop)stop.classList.toggle('hidden',!live);}
function setRecordingStatus(message){if($('recLive'))$('recLive').innerHTML=message;}
async function startRecord(){
  if(state.recorder?.state==='recording'||state.countdownActive)return;
  const song=findSong();
  if(!song||!canRecord(song))throw Error('Dieses Lied ist nicht zum Einsingen freigegeben.');
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Dein Browser unterstützt hier keine Aufnahme.');
  clearPending();
  const area=$('reviewArea');if(area)area.innerHTML='';
  const start=$('startRecording');if(start)start.disabled=true;
  let recorder=null;
  try{
    const id=$('micSelect')?.value||state.deviceId;
    state.deviceId=id;state.countdownActive=true;
    const useCamera=!!$('cameraEnabled')?.checked;
    // Die Gesangsaufnahme bleibt bewusst identisch zur bewährten Audio-only-Version.
    state.stream=await navigator.mediaDevices.getUserMedia({audio:id?{deviceId:{ideal:id},echoCancellation:false,noiseSuppression:false,autoGainControl:false}:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    const preferred=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
    const chunks=[];let referenceLead=0,videoBlob=null;
    recorder=new MediaRecorder(state.stream,preferred?{mimeType:preferred}:undefined);
    state.recorder=recorder;
    recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
    recorder.onstop=()=>{
      state.stream?.getTracks().forEach(t=>t.stop());state.stream=null;
      state.videoStream?.getTracks().forEach(t=>t.stop());state.videoStream=null;state.videoRecorder=null;
      const cp=$('cameraPreview');if(cp){cp.srcObject=null;cp.style.display='none';}
      if(state.timer)clearInterval(state.timer);state.timer=null;recordingUi(false);
      const media=$('recMedia')?.querySelector('audio,video');if(media)media.pause();
      const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});
      if(!blob.size){setRecordingStatus('Aufnahme war leer. Bitte erneut versuchen.');return;}
      const url=URL.createObjectURL(blob);
      state.pending={songId:song.id,blob,url,remotePath:null,referenceLeadMs:referenceLead};
      if(videoBlob?.size){state.pending.videoUrl=URL.createObjectURL(videoBlob);state.pending.videoMime=videoBlob.type;}
      setRecordingStatus('Aufnahme beendet. Bitte anhören und erst dann abgeben.');renderReview();
    };
    if(useCamera){
      try{
        // Eigenständiger Video-only-Stream: keine zweite gleichzeitige Mikrofonkodierung.
        state.videoStream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:24}},audio:false});
        const preview=$('cameraPreview');
        if(preview){preview.srcObject=state.videoStream;preview.style.display='block';preview.play().catch(()=>{});}
        const videoType=['video/webm;codecs=vp8','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
        const vc=[];
        const vr=new MediaRecorder(state.videoStream,videoType?{mimeType:videoType}:undefined);
        state.videoRecorder=vr;
        vr.ondataavailable=e=>{if(e.data?.size)vc.push(e.data);};
        vr.onstop=()=>{
          videoBlob=new Blob(vc,{type:vr.mimeType||'video/webm'});
          if(state.pending?.songId===song.id&&videoBlob.size){
            if(state.pending.videoUrl)URL.revokeObjectURL(state.pending.videoUrl);
            state.pending.videoUrl=URL.createObjectURL(videoBlob);
            state.pending.videoMime=videoBlob.type;
            renderReview();
          }
        };
      }catch(cameraError){
        console.warn('Kamera nicht verfügbar:',cameraError);
        state.videoStream?.getTracks().forEach(t=>t.stop());state.videoStream=null;state.videoRecorder=null;
        notify('Kamera nicht verfügbar. Die Gesangsaufnahme funktioniert weiterhin ohne Video.',true);
      }
    }
    for(let n=3;n>0;n--){
      setRecordingStatus(`<b>Aufnahme startet in ${n} …</b>`);
      await new Promise(r=>setTimeout(r,950));
    }
    if(state.recorder!==recorder)return;
    state.countdownActive=false;
    recorder.start(300);
    if(state.videoRecorder){
      try{state.videoRecorder.start(300);}
      catch(videoError){
        console.warn('Kameraaufnahme konnte nicht starten:',videoError);
        state.videoRecorder=null;state.videoStream?.getTracks().forEach(t=>t.stop());state.videoStream=null;
        const preview=$('cameraPreview');if(preview){preview.srcObject=null;preview.style.display='none';}
        notify('Kameraaufnahme fehlgeschlagen. Gesang wird trotzdem aufgenommen.',true);
      }
    }
    const localStart=performance.now();state.started=Date.now();
    setRecordingStatus('<strong><span class="mic-dot"></span>AUFNAHME LÄUFT</strong>');recordingUi(true);
    const media=$('recMedia')?.querySelector('audio,video');
    if(media){
      try{media.pause();media.currentTime=0;await media.play();referenceLead=Math.min(120000,Math.max(0,Math.round(performance.now()-localStart)));}
      catch(e){notify('Begleitung konnte nicht automatisch gestartet werden: '+errText(e),true);referenceLead=0;}
    }
    if($('recTimer'))$('recTimer').textContent='00:00';
    state.timer=setInterval(()=>{if($('recTimer'))$('recTimer').textContent=humanDuration((Date.now()-state.started)/1000);},250);
  }catch(e){
    stopRecorder();recordingUi(false);setRecordingStatus('Aufnahme konnte nicht starten.');
    throw e;
  }finally{if(start)start.disabled=false;}
}
function finishRecord(){if(state.recorder?.state==='recording'){if(state.videoRecorder?.state==='recording')state.videoRecorder.stop();state.recorder.stop();setRecordingStatus('Aufnahme wird vorbereitet …');}}
function renderReview(){const p=state.pending,area=$('reviewArea');if(!area||!p||p.songId!==state.songId)return;
  area.innerHTML=`<div class="success-box"><h3>Aufnahme anhören</h3><p>Erst anhören. Wenn du zufrieden bist, gib sie an Frau Nolte ab.</p><audio controls class="media" src="${esc(p.url)}"></audio>${p.videoUrl?`<h4>Dein Kameravideo</h4><video controls playsinline class="media" src="${esc(p.videoUrl)}"></video><p class="tiny muted">Stummes Kameravideo nur auf diesem Gerät. Deine Stimme ist in der separaten Gesangsaufnahme. Das Video wird nicht an Frau Nolte hochgeladen.</p><a class="button-secondary" href="${esc(p.videoUrl)}" download="schulchor-kamera.${p.videoMime?.includes("mp4")?"mp4":"webm"}">Video auf diesem PC speichern</a>`:""}<div class="row"><button class="button" data-action="submit-record" ${p.submitting?'disabled':''}>✓ An Frau Nolte abgeben</button><button class="button-secondary" data-action="discard-record">Neu aufnehmen</button></div><p id="submitStatus" class="tiny">Noch nicht abgegeben.</p></div>`;}
async function submitRecord(){const p=state.pending;if(!p||p.songId!==state.songId)throw Error('Keine Aufnahme zum Abgeben vorhanden.');if(p.submitting)return;p.submitting=true;renderReview();const song=findSong();if(!song||!canRecord(song))throw Error('Das Lied ist nicht mehr zum Einsingen freigegeben.');
  if(p.blob.size>maxUpload)throw Error('Die Aufnahme ist größer als 48 MB. Bitte kürzer aufnehmen.');
  let ext=p.blob.type.includes('mp4')?'m4a':p.blob.type.includes('ogg')?'ogg':'webm';
  let mime=p.blob.type.split(';')[0];try{notify('Aufnahme wird sicher hochgeladen …');if(!p.remotePath){let path=`${state.user.id}/${song.id}/${crypto.randomUUID()}.${ext}`;
      throwIfError(await sb.storage.from('recordings').upload(path,p.blob,{contentType:mime,upsert:false}));p.remotePath=path;
    }
    throwIfError(await sb.from('recordings').insert({song_id:song.id,student_id:state.user.id,audio_path:p.remotePath,status:'submitted',reference_lead_ms:p.referenceLeadMs||0}));
    clearPending();state.page='mine';await refresh();notify('Erfolgreich abgegeben! Frau Nolte kann die Aufnahme jetzt sehen.');
  }catch(e){if($('submitStatus'))$('submitStatus').textContent='Abgabe nicht abgeschlossen. Bitte erneut versuchen.';throw e;}finally{if(state.pending){state.pending.submitting=false;renderReview();}}
}
async function listenRecord(id){const r=state.recs.find(r=>r.id===id);if(!r)throw Error('Aufnahme nicht gefunden.');const el=$('audio_'+r.id);if(!el)return;el.innerHTML='<p class="muted tiny">Lade die Aufnahme …</p>';const {data,error}=await sb.storage.from('recordings').createSignedUrl(r.audio_path,900);if(error)throw error;el.innerHTML=`<audio class="media" controls preload="metadata" src="${esc(data.signedUrl)}"></audio>`;}
async function saveRecStatus(id){const s=document.querySelector(`[data-rec-status="${CSS.escape(id)}"]`);if(!s)return;throwIfError(await sb.from('recordings').update({status:s.value}).eq('id',id));await refresh();notify('Aufnahmestatus geändert.');}
async function createStudent(form){const name=form.elements.name.value.trim(),email=form.elements.email.value.trim();if(!name||!email)throw Error('Name und E-Mail sind erforderlich.');const {data,error}=await sb.functions.invoke('manage-students',{body:{action:'create_student',name,email}});if(error)throw error;if(!data?.ok)throw Error(data?.error||'Konto konnte nicht erstellt werden.');
  await refresh();state.page='people';render();showOneTimeCredentials(data.email,data.password,data.name);notify('Schülerkonto erstellt. Zugangsdaten jetzt sicher weitergeben.');}
async function resetStudent(id){const p=state.people.find(p=>p.id===id);if(!p||p.role!=='student')throw Error('Ungültiges Konto');if(!confirm('Neues Passwort für '+(p.display_name||p.username)+' erzeugen? Das alte Passwort wird ungültig.'))return;
  const {data,error}=await sb.functions.invoke('manage-students',{body:{action:'reset_password',userId:id}});if(error)throw error;if(!data?.ok)throw Error(data?.error||'Passwortänderung fehlgeschlagen.');showOneTimeCredentials(p.login_email||data.email,data.password,p.display_name||p.username);notify('Neues Passwort erzeugt.');}
function showOneTimeCredentials(email,password,name){const host=$('studentCreated');if(!host)return;const message=`WvH-Schulchor – persönliche Anmeldedaten\n\nHallo ${name},\n\nhier sind deine Zugangsdaten für den Schulchor:\nWebseite: https://geheimniss1234.github.io/Wvh-schulchor/preview/\nE-Mail: ${email}\nPasswort: ${password}\n\nBitte gib diese Daten nicht an andere weiter. Die Webseite wird erst nach unserem gemeinsamen Abschlusstest freigeschaltet.\n\nViele Grüße\nFrau Nolte`;
  host.innerHTML=`<div class="success-box"><h4>Zugangsdaten – nur jetzt sichtbar!</h4><p><b>E-Mail:</b> ${esc(email)}<br><b>Passwort:</b> <code>${esc(password)}</code></p><button type="button" class="button" id="copyInvite">Einladungstext kopieren</button><p class="tiny">Das Passwort wird nicht in unserer Profiltabelle gespeichert. Bitte den Text nur einzeln und geschützt an den betreffenden Schüler weitergeben.</p></div>`;
  $('copyInvite').onclick=async()=>{await navigator.clipboard.writeText(message);notify('Einladungstext kopiert.');};}
function mixSettings(){return state.recs.filter(r=>r.song_id===state.songId).map(r=>({r,volume:Number($('gain_'+r.id)?.value||80)/100,offset:(Number($('offset_'+r.id)?.value||0)-Number(r.reference_lead_ms||0))/1000}));}
async function getMixerTracks(){let settings=mixSettings();if(!settings.length)throw Error('Keine Stimmen für dieses Lied.');if(settings.length>24)throw Error('Bitte höchstens 24 Stimmen auf einmal mischen.');
  const ctx=state.audioContext||(state.audioContext=new (window.AudioContext||window.webkitAudioContext)());await ctx.resume();
  let tracks=await Promise.all(settings.map(async t=>{const {data,error}=await sb.storage.from('recordings').createSignedUrl(t.r.audio_path,900);if(error)throw error;const resp=await fetch(data.signedUrl);if(!resp.ok)throw Error('Audiodatei konnte nicht geladen werden');const buf=await ctx.decodeAudioData(await resp.arrayBuffer());return {...t,buffer:buf};}));return tracks;
}
function stopMix(){state.studioSources.forEach(s=>{try{s.stop()}catch(e){}});state.studioSources=[];}
async function playMix(){stopMix();const status=$('studioStatus');if(status)status.textContent='Spuren werden geladen …';let tracks=await getMixerTracks();const ctx=state.audioContext,start=ctx.currentTime+.15,headroom=Math.max(1,Math.sqrt(tracks.length));tracks.forEach(t=>{const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=t.buffer;gain.gain.value=t.volume/headroom;src.connect(gain).connect(ctx.destination);src.start(start+Math.max(0,t.offset),Math.max(0,-t.offset));state.studioSources.push(src);});if(status)status.textContent='Mix wird abgespielt.';}
function wavFromBuffer(buffer){let n=buffer.numberOfChannels,frames=buffer.length,bytes=new ArrayBuffer(44+frames*n*2),dv=new DataView(bytes),pos=0;const str=s=>{for(const ch of s)dv.setUint8(pos++,ch.charCodeAt(0));},u16=v=>{dv.setUint16(pos,v,true);pos+=2;},u32=v=>{dv.setUint32(pos,v,true);pos+=4;};str('RIFF');u32(36+frames*n*2);str('WAVE');str('fmt ');u32(16);u16(1);u16(n);u32(buffer.sampleRate);u32(buffer.sampleRate*n*2);u16(n*2);u16(16);str('data');u32(frames*n*2);let channels=Array.from({length:n},(_,i)=>buffer.getChannelData(i));for(let i=0;i<frames;i++)for(let j=0;j<n;j++){let v=Math.max(-1,Math.min(1,channels[j][i]));dv.setInt16(pos,v<0?v*32768:v*32767,true);pos+=2;}return new Blob([bytes],{type:'audio/wav'});}
async function exportMix(){const status=$('studioStatus');if(status)status.textContent='Spuren werden geladen …';let tracks=await getMixerTracks(),rate=44100;let duration=Math.max(...tracks.map(t=>Math.max(0,t.offset)+Math.max(0,t.buffer.duration-Math.max(0,-t.offset))));if(duration>600)throw Error('Maximal 10 Minuten Mixdauer in dieser Version.');let out=new OfflineAudioContext(2,Math.max(1,Math.ceil(duration*rate)),rate),headroom=Math.max(1,Math.sqrt(tracks.length));for(let t of tracks){let source=out.createBufferSource(),g=out.createGain();source.buffer=t.buffer;g.gain.value=t.volume/headroom;source.connect(g).connect(out.destination);source.start(Math.max(0,t.offset),Math.max(0,-t.offset));}if(status)status.textContent='WAV wird erstellt …';let mixed=await out.startRendering();const blob=wavFromBuffer(mixed),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=cleanFilename(findSong()?.title||'Schulchor')+'-Mix.wav';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);if(status)status.textContent='WAV-Datei heruntergeladen.';}

async function handleAction(button){const action=button.dataset.action;switch(action){case 'retry':await refresh();break;
  case 'logout':if(!confirm('Möchtest du dich wirklich abmelden?\n\nTippe auf „OK“, um die Abmeldung zu bestätigen. Mit „Abbrechen“ bleibst du angemeldet.'))break;await sb.auth.signOut();await enterSession(null);break;
  case 'new-song':state.page='new-song';render();break;
  case 'save-song-status':await saveSongStatus();break;
  case 'save-assignments':await saveAssignments();break;
  case 'upload-media':await uploadMedia();break;
  case 'go-record':state.page='record';render();break;
  case 'refresh-mics':await refreshMics();notify('Mikrofone aktualisiert.');break;
  case 'start-record':await startRecord();break;
  case 'stop-record':finishRecord();break;
  case 'discard-record':clearPending();renderReview();const el=$('reviewArea');if(el)el.innerHTML='';notify('Aufnahme verworfen. Du kannst neu aufnehmen.');break;
  case 'submit-record':await submitRecord();break;
  case 'play-mix':await playMix();break;
  case 'stop-mix':stopMix();if($('studioStatus'))$('studioStatus').textContent='Wiedergabe gestoppt.';break;
  case 'export-mix':await exportMix();break;
}}
async function onClick(e){const button=e.target.closest('button');if(!button)return;
  try{if(button.dataset.page){if(state.countdownActive||state.recorder?.state==='recording')throw Error('Bitte zuerst die Aufnahme beenden.');stopMix();state.page=button.dataset.page;render();return;}
    if(button.dataset.openSong){state.songId=button.dataset.openSong;state.page='song';render();return;}
    if(button.dataset.listen){await listenRecord(button.dataset.listen);return;}
    if(button.dataset.saveRecStatus){await saveRecStatus(button.dataset.saveRecStatus);return;}
    if(button.dataset.resetStudent){await resetStudent(button.dataset.resetStudent);return;}
    if(button.dataset.action){button.disabled=true;try{await handleAction(button);}finally{if(button.isConnected)button.disabled=false;}}
  }catch(e){console.error(e);notify(errText(e),true);}}
async function onSubmit(e){const form=e.target;if(!['loginForm','songCreateForm','createStudentForm'].includes(form.id))return;e.preventDefault();try{
  if(form.id==='loginForm')await login(form);if(form.id==='songCreateForm')await createSong(form);if(form.id==='createStudentForm')await createStudent(form);
}catch(err){notify(errText(err),true);}}
function onChange(e){const el=e.target;if(el.id==='recSongSelect'){if(state.countdownActive||state.recorder?.state==='recording'){el.value=state.songId;notify('Aufnahme erst beenden.',true);return;}clearPending();state.songId=el.value;render();}else if(el.id==='studioSong'){stopMix();state.songId=el.value;render();}else if(el.dataset.gain){const lab=$('gainlabel_'+el.dataset.gain);if(lab)lab.textContent=el.value+' %';}}
async function main(){if(!window.supabase?.createClient){$('app').innerHTML='<section class="panel centered"><h2>Verbindung nicht verfügbar</h2><p>Die Supabase-Bibliothek konnte nicht geladen werden. Bitte Internetverbindung und Browser-Sperren prüfen.</p></section>';return;}
  sb=window.supabase.createClient(CONFIG.url,CONFIG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  $('app').addEventListener('click',onClick);$('app').addEventListener('submit',onSubmit);$('app').addEventListener('change',onChange);
  const {data,error}=await sb.auth.getSession();if(error)notify(errText(error),true);await enterSession(data?.session||null);
  sb.auth.onAuthStateChange((event,session)=>{if(event==='INITIAL_SESSION')return;setTimeout(()=>{enterSession(session).catch(err=>notify(errText(err),true));},0);});
}
main().catch(err=>{console.error(err);notify('Start fehlgeschlagen: '+errText(err),true);});