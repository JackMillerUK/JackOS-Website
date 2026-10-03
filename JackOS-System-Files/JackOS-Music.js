//JackOS-Music.js
// ===== Music =====
const JACKOS_SERVER_ROOT = '../JackOS-Server-Files/';
const MusicState = {
  mode: 'home',
  catalogue: [],
  library: [],
  currentIndex: -1,
  currentSong: null,
  offline: false,
  audio: null,
  artworkUrls: new Map()
};
function Music_libraryKey(){ return 'jackosMusicLibraryJks:'+UserData_key(); }

function Music_defaultLibrary(){
  try{
    const raw = localStorage.getItem(Music_libraryKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  }catch(e){ return []; }
}
function Music_saveLibrary(list){
  const serialized=JSON.stringify(list || []);
  try{ localStorage.setItem(Music_libraryKey(), serialized); }catch(e){}
  return Music_writeLibraryFile(serialized);
}
async function Music_directory(){
  const root=await navigator.storage.getDirectory();
  const drive=await UserData_dir();
  return await drive.getDirectoryHandle('Music',{create:true});
}
async function Music_readLibraryFile(){
  try{
    const directory=await Music_directory();
    const handle=await directory.getFileHandle('Library.jks');
    const parsed=JSON.parse(await (await handle.getFile()).text());
    return Array.isArray(parsed) ? parsed : [];
  }catch(e){ return null; }
}
async function Music_writeLibraryFile(serialized){
  try{
    const directory=await Music_directory();
    const handle=await directory.getFileHandle('Library.jks',{create:true});
    const writable=await handle.createWritable();
    await writable.write(serialized);
    await writable.close();
  }catch(e){}
}
async function Music_loadStoredLibrary(){
  const stored=await Music_readLibraryFile();
  if(stored) {
    await Music_saveLibrary(stored);
    return stored;
  }
  const fallback=Music_defaultLibrary();
  if(fallback.length) await Music_saveLibrary(fallback);
  return fallback;
}
let musicLibraryQueue=Promise.resolve();
function Music_parseJks(text){
  const value=(text||'').trim();
  if(!value) return {};
  try{
    const parsed=JSON.parse(value);
    if(parsed && typeof parsed==='object') return parsed;
  }catch(e){}
  const result={};
  value.split(/\r?\n/).forEach(line=>{
    const match=line.match(/^\s*([^:=#]+?)\s*[:=]\s*(.*?)\s*$/);
    if(match) result[match[1].trim().toLowerCase().replace(/[\s-]+/g,'_')]=match[2].trim();
  });
  return result;
}
function Music_pick(obj, keys, fallback=''){
  for(const key of keys){ if(obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return String(obj[key]); }
  return fallback;
}
function Music_normalizeSong(raw, id){
  const song=raw || {};
  const fallbackName=String(song.fileName || song.filename || id || '').split('/').pop();
  return {
    id: String(song.id || song.slug || song.file || song.filename || id || ''),
    title: Music_pick(song,['title','song_title','name'],fallbackName || 'Untitled song'),
    artist: Music_pick(song,['artist','artist_name'],fallbackName || 'Unknown artist'),
    album: Music_pick(song,['album','album_name'],'Unknown album'),
    artworkPath: Music_pick(song,['artworkPath','artwork','albumArtwork','album_artwork','cover'],''),
    audioPath: Music_pick(song,['audioPath','audio','audioFile','audio_file','filePath','file_path'],'')
  };
}
function Music_catalogueEntries(raw){
  if(Array.isArray(raw)) return raw;
  if(raw && Array.isArray(raw.songs)) return raw.songs;
  if(raw && Array.isArray(raw.files)) return raw.files;
  if(typeof raw==='string') return raw.split(/\r?\n/).map(line=>line.trim()).filter(line=>line && !line.startsWith('#'));
  return [];
}
function Music_path(path, folder){
  const clean=String(path||'').trim().replace(/^\.\//,'');
  if(!clean) return '';
  if(/^(https?:|data:|blob:|\/)/i.test(clean)) return clean;
  if(clean.startsWith('Music/')) return JACKOS_SERVER_ROOT + clean;
  return JACKOS_SERVER_ROOT + (folder ? `Music/${folder}/${clean}` : `Music/${clean}`);
}
function Music_id(song){ return song.id || `${song.title}|${song.artist}|${song.album}`; }
async function Music_fetchJsonOrText(path){
  const response=await fetch(path, {cache:'no-store'});
  if(!response.ok) throw new Error(`Unable to load ${path}`);
  return await response.text();
}
async function Music_loadCatalogue(){

  const response = await fetch(
    `${JACKOS_SERVER_ROOT}Music/Song-Files/Song-List.json`,
    { cache:'no-store' }
  );

  if(!response.ok){
    throw new Error(
      'Music catalogue unavailable, showing your library instead.'
    );
  }

  const entries =
    await response.json();

  const songs=[];

  for(const entry of entries){

    const definitionPath=
      typeof entry==='string'
        ? entry
        : (
            entry.file
            || entry.path
            || entry.songFile
            || entry.song_file
            || ''
          );

    if(!definitionPath)
      continue;

    const path=
      definitionPath.startsWith(
        'Music/'
      )
        ? JACKOS_SERVER_ROOT
            + definitionPath
        : `${JACKOS_SERVER_ROOT}Music/Song-Files/${definitionPath}`;

    try{

      const definitionText=
        await Music_fetchJsonOrText(
          path
        );

      const definition=
        Music_parseJks(
          definitionText
        );

      const song=
        Music_normalizeSong(
          typeof entry==='string'
            ? definition
            : Object.assign(
                {},
                entry,
                definition
              ),
          definitionPath
        );

      song.definitionPath=path;
      song.definitionJks=definitionText;
      song.audioUrl=Music_path(
        song.audioPath,
        'Songs'
      );

      songs.push(song);

    }catch(e){

      console.warn(
        'Music song definition skipped:',
        path
      );

    }

  }

  return songs;

}
async function Music_ensureSystem(){
  if(localStorage.getItem(Music_libraryKey()) === null) Music_saveLibrary([]);
  if(navigator.storage?.getDirectory){
    try{
      const music=await Music_directory();
      await music.getDirectoryHandle('Songs',{create:true});
      await music.getDirectoryHandle('Song-Files',{create:true});
      const libraryHandle=await music.getFileHandle('Library.jks',{create:true});
      const libraryText=await (await libraryHandle.getFile()).text();
      if(!libraryText.trim()) await libraryHandle.createWritable().then(async writable=>{ await writable.write(localStorage.getItem(Music_libraryKey())||'[]'); await writable.close(); });
    }catch(e){ /* The localStorage library remains the portable fallback. */ }
  }
}
function Music_artworkUrl(song){
  if(song.artworkData) return song.artworkData;
  return Music_path(song.artworkPath,'');
}
function Music_revokeArtworkUrls(){
  for(const url of MusicState.artworkUrls.values()) URL.revokeObjectURL(url);
  MusicState.artworkUrls.clear();
}
function Music_render(){
  const list=document.getElementById('musicList');
  if(!list) return;
  Music_revokeArtworkUrls();
  const songs=MusicState.mode==='library' ? MusicState.library : MusicState.catalogue;
  list.innerHTML='';
  if(!songs.length){
    list.innerHTML=`<div class="music-empty">${MusicState.mode==='library'?'Your library is empty.':'No music is available yet.'}</div>`;
    return;
  }
  songs.forEach((song,index)=>{
    const card=document.createElement('article'); card.className='music-card';
    const artwork=document.createElement('img'); artwork.className='music-artwork'; artwork.alt=`${song.album} artwork`; artwork.src=Music_artworkUrl(song) || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"%3E%3Crect width="80" height="80" fill="%232b2b35"/%3E%3Ccircle cx="40" cy="40" r="18" fill="%23ff8fbe"/%3E%3C/svg%3E';
    const meta=document.createElement('div'); meta.className='music-meta';
    const title=document.createElement('strong'); title.textContent=song.title;
    const artist=document.createElement('span'); artist.textContent=`${song.artist} · ${song.album}`;
    meta.append(title,artist);
    const actions=document.createElement('div'); actions.className='music-actions';
    const play=document.createElement('button'); play.className='explorer-btn'; play.textContent='▶'; play.title='Play'; play.onclick=()=>Music_play(index);
    actions.appendChild(play);
    if(MusicState.mode==='home'){
      const added=MusicState.library.some(item=>Music_id(item)===Music_id(song));
      const add=document.createElement('button'); add.className='explorer-btn ghost'; add.textContent=added?'Added to library':'Add to library'; add.title=added?'Already in library':'Add to library'; add.disabled=added; add.onclick=()=>Music_addToLibrary(song,add); actions.appendChild(add);
    } else {
      const remove=document.createElement('button'); remove.className='explorer-btn danger'; remove.textContent='−'; remove.title='Remove from library'; remove.onclick=()=>Music_removeFromLibrary(song); actions.appendChild(remove);
    }
    card.append(artwork,meta,actions); list.appendChild(card);
  });
}
async function Music_removeFromLibrary(song){
  if(!confirm('This will remove this song from your library.\n\nThis song cannot be re-added if it is no longer available.\n\nIf this was an imported song, it must be imported again before it can be played.')) return;
  musicLibraryQueue=musicLibraryQueue.then(async()=>{
    const library=(await Music_readLibraryFile()) || Music_defaultLibrary();
    const next=library.filter(item=>Music_id(item)!==Music_id(song));
    if(next.length===library.length) return;
    await Music_saveLibrary(next);
    MusicState.library=next;
    if(MusicState.currentSong && Music_id(MusicState.currentSong)===Music_id(song)){
      MusicState.currentSong=null;
      MusicState.currentIndex=-1;
      MusicState.audio?.pause();
    }
    Music_render();
  });
  try{ await musicLibraryQueue; }catch(e){ alert('Could not remove this song from your library.'); }
}
function Music_setMode(mode){
  MusicState.mode=mode;
  document.querySelectorAll('.music-tab').forEach(tab=>{
    const active=tab.dataset.musicMode===mode; tab.classList.toggle('active',active); tab.classList.toggle('ghost',!active);
  });
  Music_render();
}
async function Music_addToLibrary(song, button){
  if(!song.audioUrl){ alert('This song has no audio file.'); return; }
  try{
    const audioResponse=await fetch(song.audioUrl); if(!audioResponse.ok) throw new Error('Audio unavailable');
    const audioBlob=await audioResponse.blob();
    const audioData=await new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(audioBlob); });
    let artworkData='';
    if(song.artworkPath){ try{ const art=await fetch(Music_artworkUrl(song)); if(art.ok){ const blob=await art.blob(); artworkData=await new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(blob); }); } }catch(e){} }
    const savedSong=Object.assign({},song,{audioData,artworkData});
    musicLibraryQueue=musicLibraryQueue.then(async()=>{
      const library=(await Music_readLibraryFile()) || Music_defaultLibrary();
      if(library.some(item=>Music_id(item)===Music_id(savedSong))){
        MusicState.library=library;
        if(button){ button.textContent='Added to library'; button.title='Already in library'; button.disabled=true; }
        return;
      }
      library.push(savedSong);
      await Music_saveLibrary(library);
      MusicState.library=library;
      Music_render();
    });
    await musicLibraryQueue;
  }catch(e){ alert('Could not add this song to your library.'); }
}
async function Music_play(index){
  const songs=MusicState.mode==='library' ? MusicState.library : MusicState.catalogue;
  const song=songs[index]; if(!song || !MusicState.audio) return;
  MusicState.currentIndex=index; MusicState.currentSong=song;
  MusicState.audio.src=MusicState.mode==='library' ? song.audioData : song.audioUrl;
  MusicState.audio.load();
  document.getElementById('musicPlayerTitle').textContent=song.title;
  document.getElementById('musicPlayerArtist').textContent=`${song.artist} · ${song.album}`;
  const artwork=document.getElementById('musicPlayerArtwork'); artwork.src=Music_artworkUrl(song) || '';
  try{ await MusicState.audio.play(); }catch(e){}
  document.getElementById('musicPlayPause').textContent=MusicState.audio.paused?'▶':'⏸';
}


function Music_togglePlay(){

  if(!MusicState.audio)
    return;

  if(!MusicState.currentSong){

    if(
      (
        MusicState.mode==='library'
          ? MusicState.library
          : MusicState.catalogue
      ).length
    ){
      Music_play(0);
    }

    return;

  }

  const btn =
    document.getElementById(
      'musicPlayPause'
    );

  if(MusicState.audio.paused){

    MusicState.audio.play();

    if(btn)
      btn.textContent='⏸';

  }else{

    MusicState.audio.pause();

    if(btn)
      btn.textContent='▶';

  }

}

function Music_skip(offset){ const songs=MusicState.mode==='library' ? MusicState.library : MusicState.catalogue; if(!songs.length) return; const next=(MusicState.currentIndex+offset+songs.length)%songs.length; Music_play(next); }
async function Music_open(){
  if(!Edition_IsPrivateOrPro()) return;
  const app=document.getElementById('musicApp'); if(!app) return;
  app.style.display='block'; MusicState.audio=document.getElementById('musicAudio');
  await Music_ensureSystem(); MusicState.library=await Music_loadStoredLibrary();
  const notice=document.getElementById('musicNotice'); if(notice) notice.textContent='Loading catalogue...';
  try{ MusicState.catalogue=await Music_loadCatalogue(); MusicState.offline=false; if(notice) notice.textContent=''; Music_setMode('home'); }
  catch(e){ MusicState.offline=true; 
    
    if(notice)
    notice.textContent =
        'Music catalogue unavailable, showing your library instead.';

    Music_setMode('library'); }
}
function Music_close(){

  const app =
    document.getElementById(
      'musicApp'
    );

  const audio =
    document.getElementById(
      'musicAudio'
    );

  const playBtn =
    document.getElementById(
      'musicPlayPause'
    );

  if(audio){

    audio.pause();

    audio.currentTime = 0;

  }

  if(playBtn){

    playBtn.textContent =
      '▶';

  }

  Music_revokeArtworkUrls();

  if(app)
    app.style.display='none';

}
ready(()=>{
  document.querySelectorAll('.music-tab').forEach(tab=>tab.addEventListener('click',()=>Music_setMode(tab.dataset.musicMode)));
  const audio=document.getElementById('musicAudio'); if(!audio) return; MusicState.audio=audio;
  audio.addEventListener('timeupdate',()=>{ const progress=document.getElementById('musicProgress'); if(progress && audio.duration) progress.value=(audio.currentTime/audio.duration)*100; });
  audio.addEventListener('ended',()=>Music_skip(1));

audio.addEventListener(
  'play',
  ()=>{
    const btn =
      document.getElementById(
        'musicPlayPause'
      );

    if(btn)
      btn.textContent='⏸';
  }
);

audio.addEventListener(
  'pause',
  ()=>{
    const btn =
      document.getElementById(
        'musicPlayPause'
      );

    if(btn)
      btn.textContent='▶';
  }
);


  document.getElementById('musicPlayPause')?.addEventListener('click',Music_togglePlay);
  document.getElementById('musicPrevious')?.addEventListener('click',()=>Music_skip(-1));
  document.getElementById('musicNext')?.addEventListener('click',()=>Music_skip(1));
  document.getElementById('musicVolume')?.addEventListener('input',e=>{ audio.volume=Number(e.target.value); });
  document.getElementById('musicProgress')?.addEventListener('input',e=>{ if(audio.duration) audio.currentTime=(Number(e.target.value)/100)*audio.duration; });
  const input=document.getElementById('musicInput');
  input?.addEventListener('change',async()=>{
    const files=[...(input.files||[])]; input.value=''; if(!files.length) return;
    try{
      const library=(await Music_readLibraryFile()) || Music_defaultLibrary();
      for(const file of files){
        const audioData=await new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(file); });
        const song=Music_normalizeSong({id:`import:${file.name}:${file.lastModified}`,fileName:file.name,title:file.name,artist:file.name,audioData},file.name);
        song.audioData=audioData; song.artworkData=''; song.imported=true;
        if(!library.some(item=>Music_id(item)===Music_id(song))) library.push(song);
      }
      await Music_saveLibrary(library); MusicState.library=library; Music_setMode('library');
    }catch(e){ alert('Music import failed: '+e.message); }
  });
});


