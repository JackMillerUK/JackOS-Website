/* JackOS core JS (v4 1st May 2026 release)*/



/* JackOS version number global variable and JackOS Edition global variable */

const JACKOS_VERSION = "5.0 Beta 2";
let JACKOS_EDITION = localStorage.getItem("jackosEdition");





function ready(fn){ if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', fn); } else { try{ fn(); }catch(e){ console.warn('ready() error', e); } } }
// === Users storage (with roles) ===
function Users_all(){ try{ return JSON.parse(localStorage.getItem('jackosUsers')||'[]'); }catch(e){ return []; } }
function Users_save(list){ try{ localStorage.setItem('jackosUsers', JSON.stringify(list||[])); }catch(e){} }
function Users_hasAny(){ return Users_all().length>0; }
function Users_find(name){ return Users_all().find(u=>u && u.name===name); }
function Users_countAdmins(list){ return (list||Users_all()).filter(u=>u.role==='admin').length; }
function Users_migrate(){ const list=Users_all(); if(!Array.isArray(list) || !list.length) return; let changed=false; if(list.every(u=>!u.role)){ list[0].role='admin'; for(let i=1;i<list.length;i++) list[i].role='user'; changed=true; } list.forEach(u=>{ if(u.guest){ u.role='user'; u.pass=''; changed=true; } }); if(changed) Users_save(list); }
function Users_guest(){ return Users_all().find(u=>u && u.guest) || null; }
function Users_addGuest(){ if(Users_guest()) return false; const list=Users_all(); list.push({name:'Guest', pass:'', role:'user', guest:true}); Users_save(list); return true; }
function UserData_key(name=currentUser){ return encodeURIComponent(String(name||'Guest')).replace(/%/g,'_'); }
function UserData_resetRuntime(){ try{ ExplorerState.driveRoot=null; ExplorerState.driveCwd=null; ExplorerState.cwdPath=[]; ExplorerState.virtualPath=[]; }catch(e){} InstalledApps_scan?.(); }
async function UserData_dir(name=currentUser){ const root=await navigator.storage.getDirectory(); const users=await root.getDirectoryHandle('Users',{create:true}); const dir=await users.getDirectoryHandle(UserData_key(name),{create:true}); if(name===Users_all()[0]?.name && !localStorage.getItem('jackosLegacyStorageMigrated')){ const copy=async(source,target)=>{ for await(const entry of source.values()){ if(entry.kind==='directory'){ const child=await target.getDirectoryHandle(entry.name,{create:true}); await copy(entry,child); } else { const file=await entry.getFile(); const writable=await (await target.getFileHandle(entry.name,{create:true})).createWritable(); await writable.write(await file.arrayBuffer()); await writable.close(); } } }; for(const legacyName of ['JackOSDrive','Applications']){ try{ const legacy=await root.getDirectoryHandle(legacyName); const target=legacyName==='Applications'?await dir.getDirectoryHandle('Applications',{create:true}):dir; await copy(legacy,target); }catch(e){} } localStorage.setItem('jackosLegacyStorageMigrated','true'); } return dir; }
// === Apps registry (all apps) ===
const APP_REGISTRY = {
  explorer:   { open: ()=>Explorer_open(),   close: ()=>Explorer_close?.() },
  browser:    { open: ()=>Browser_open(),    close: ()=>{ const w=document.getElementById('browserWin'); const f=document.getElementById('browserFrame'); if(w) w.style.display='none'; if(f) f.src='about:blank'; } },
  photos:     { open: ()=>Desktop_openPhotosApp(), close: ()=>Photos_close?.() },
  calculator: { open: ()=>Calculator_open(), close: ()=>Calculator_close() },
  camera:     { open: ()=>JCam_open(),       close: ()=>JCam_close?.() },
  settings:   { open: ()=>Settings_open(),   close: ()=>Settings_close?.() },
  music:      { open: ()=>Music_open(),      close: ()=>Music_close?.() },
  games:      { open: ()=>Games_open(),      close: ()=>Games_close?.() },
  flappy:     { open: ()=>Flappy_open(),     close: ()=>Flappy_close() },
  tetris:     { open: ()=>Tetris_open(),     close: ()=>Tetris_close() },
  snake:      { open: ()=>Snake_open(),      close: ()=>Snake_close() },
  appstore:   { open: ()=>AppStore_open(),  close: ()=>AppStore_close() },
};
function Desktop_launch(appId){
  if(appId==='music' && !Edition_IsPrivateOrPro()) return;
  if(typeof appId==='string' && appId.startsWith('installed:')){ InstalledApps_launch(appId.slice(10)); return; }
  const app = APP_REGISTRY[appId];
  if(!app || !app.open) { console.warn('Unknown app:', appId); return; }
  Desktop_hideStartMenu(); app.open();
}

// ZIP applications use the Applications directory as their registry.
const APP_STORE_ROOTS = ['../../JackOS.com/JackOS-Server-Files/App-Store/Apps/','../../JackOS.com/JackOS-Server/Files/App-Store/Apps/'];
const InstalledAppsState = { apps: [], byFile: new Map() };
let installedAppRuntime = null;

async function Applications_dir(){
  const user=await UserData_dir();
  return user.getDirectoryHandle('Applications', {create:true});
}
async function Applications_writeZip(name, data){
  const dir = await Applications_dir();
  const handle = await dir.getFileHandle(name, {create:true});
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}
function AppStore_isImportAllowed(){ return JACKOS_EDITION === 'Pro' || JACKOS_EDITION === 'Elite'; }
function AppStore_safeName(name){ return String(name || '').replace(/[^a-zA-Z0-9._-]/g, '_') || 'App.zip'; }
async function AppPackage_read(file){
  try{
    const zip = await JSZip.loadAsync(file);
    const manifestPath = Object.keys(zip.files).find(path=>{
      const normalized=String(path||'').replace(/^\/+/, '');
      return !zip.files[path].dir && normalized.split('/').pop()==='manifest.json';
    });
    if(!manifestPath) return null;
    const rootPath = manifestPath.slice(0, manifestPath.lastIndexOf('/')+1);
    const manifestFile = zip.file(manifestPath);
    const manifest = JSON.parse(await manifestFile.async('text'));
    if(!manifest || !manifest.name || !manifest.entry) return null;
    return { zip, manifest, file, manifestPath, rootPath };
  }catch(e){ return null; }
}
function AppPackage_path(pkg, path){
  const value=String(path||'').replace(/^\/+/, '');
  const parts=(pkg.rootPath+value).split('/');
  const clean=[];
  parts.forEach(part=>{
    if(!part || part==='.') return;
    if(part==='..') clean.pop();
    else clean.push(part);
  });
  return clean.join('/');
}
async function AppPackage_fromBytes(bytes, name){ return AppPackage_read(new File([bytes], name, {type:'application/zip'})); }
async function InstalledApps_scan(){
  InstalledAppsState.apps=[]; InstalledAppsState.byFile.clear();
  try{
    const dir = await Applications_dir();
    for await(const entry of dir.values()){
      if(entry.kind !== 'file' || !entry.name.toLowerCase().endsWith('.zip')) continue;
      const file = await entry.getFile();
      const pkg = await AppPackage_read(file);
      if(!pkg) continue;
      const app = Object.assign({}, pkg.manifest, {fileName:entry.name, fileSize:file.size, installDate:localStorage.getItem('jackosAppInstall:'+UserData_key()+':'+entry.name)||'', pkg});
      InstalledAppsState.apps.push(app); InstalledAppsState.byFile.set(entry.name, app);
    }
  }catch(e){ console.warn('Applications scan failed:', e); }
  InstalledAppsState.apps.sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  InstalledApps_refreshUI();
  return InstalledAppsState.apps;
}
function InstalledApps_icon(app){
  const icon = document.createElement('div'); icon.className='icon-box'; icon.textContent='📦'; icon.setAttribute('aria-hidden','true');
  const iconPath = app.pkg?.manifest?.icon && AppPackage_path(app.pkg, app.pkg.manifest.icon);
  if(iconPath && app.pkg.zip.file(iconPath)){
    app.pkg.zip.file(iconPath).async('blob').then(blob=>{
      icon.textContent='';
      icon.style.backgroundImage=`url('${URL.createObjectURL(blob)}')`;
      icon.style.backgroundSize='cover';
      icon.style.backgroundPosition='center';
    }).catch(()=>{});
  }
  return icon;
}
function InstalledApps_addLaunchHandlers(icon, fileName){
  icon.style.cursor='pointer';
  icon.addEventListener('click', ()=>Desktop_launch('installed:'+fileName));
  icon.addEventListener('contextmenu', e=>{ e.preventDefault(); InstalledApps_delete(fileName); });
}
function InstalledApps_refreshUI(){
  document.querySelectorAll('[data-installed-app="true"]').forEach(el=>el.remove());
  const desktop=document.querySelector('#desktop .desktop');
  const menu=document.querySelector('#startMenu .menu-section');
  InstalledAppsState.apps.forEach(app=>{
    if(desktop){ const icon=document.createElement('div'); icon.className='icon'; icon.dataset.installedApp='true'; icon.append(InstalledApps_icon(app)); const label=document.createElement('div'); label.textContent=app.name; icon.append(label); InstalledApps_addLaunchHandlers(icon,app.fileName); desktop.append(icon); }
    if(menu){ const item=document.createElement('div'); item.className='menu-item'; item.dataset.app='installed:'+app.fileName; item.dataset.installedApp='true'; const ico=document.createElement('span'); ico.className='mi-ico'; ico.textContent='📦'; const name=document.createElement('span'); name.textContent=app.name; item.append(ico,name); menu.append(item); }
  });
}
async function InstalledApps_getPackage(fileName){
  const dir=await Applications_dir(); const handle=await dir.getFileHandle(fileName); return AppPackage_read(await handle.getFile());
}
function InstalledApps_delete(fileName){
  const app=InstalledAppsState.byFile.get(fileName); if(!app) return;
  if(!confirm(`Delete ${app.name}?\n\nThis application will be removed from JackOS.\n\nAny files or data created by this application will remain on JackOS Drive.\n\nThis application can be reinstalled later.`)) return;
  Applications_dir().then(dir=>dir.removeEntry(fileName)).then(()=>{ localStorage.removeItem('jackosAppInstall:'+UserData_key()+':'+fileName); InstalledApps_scan(); AppStore_render(); Settings_renderApplications(); }).catch(e=>alert('Delete failed: '+e.message));
}
async function InstalledApps_export(fileName){
  try{
    const dir=await Applications_dir(); const handle=await dir.getFileHandle(fileName); const file=await handle.getFile();
    await Export_files([{name:fileName,file}]);
  }catch(e){ alert('Export failed: '+e.message); }
}
async function InstalledApps_launch(fileName){
  try{
    const pkg=await InstalledApps_getPackage(fileName); if(!pkg) throw new Error('Invalid application package');
    if(!installedAppRuntime){
      installedAppRuntime=document.createElement('div'); installedAppRuntime.id='installedAppRuntime'; installedAppRuntime.innerHTML='<div class="app-window-header"><strong id="installedAppTitle"></strong><button class="explorer-btn ghost" id="installedAppClose">Close</button></div><iframe sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"></iframe>'; document.querySelector('#desktop .desktop').append(installedAppRuntime); document.getElementById('installedAppClose').onclick=()=>{ installedAppRuntime.style.display='none'; };
    }
    const frame=installedAppRuntime.querySelector('iframe'); const entryPath=AppPackage_path(pkg, pkg.manifest.entry); const files=new Map();
    for(const key of Object.keys(pkg.zip.files)){ const item=pkg.zip.files[key]; if(!item.dir) files.set(String(key).replace(/^\/+/, ''), URL.createObjectURL(await item.async('blob'))); }
    let html=await pkg.zip.file(entryPath)?.async('text'); if(html===undefined) throw new Error('Entry file not found: '+entryPath);
    const resolveUrl=(value)=>{ if(!value || /^(data:|blob:|https?:|#|javascript:)/i.test(value)) return value; const base=entryPath.includes('/')?entryPath.slice(0,entryPath.lastIndexOf('/')+1):''; const parts=(base+value).split('/'); const clean=[]; parts.forEach(part=>{ if(part==='..') clean.pop(); else if(part && part!=='.') clean.push(part); }); return files.get(clean.join('/')) || value; };
    html=html.replace(/(src|href)=(['"])([^'"]+)\2/gi,(match,attr,quote,value)=>`${attr}=${quote}${resolveUrl(value)}${quote}`);
    html=html.replace(/url\((['"]?)([^)'" ]+)\1\)/gi,(match,quote,value)=>`url(${quote}${resolveUrl(value)}${quote})`);
    document.getElementById('installedAppTitle').textContent=pkg.manifest.name;
    frame.srcdoc=html; installedAppRuntime.style.display='block';
  }catch(e){ alert('Unable to launch application: '+e.message); }
}
async function AppStore_serverZipNames(){
  for(const root of APP_STORE_ROOTS){
    try{
      const response=await fetch(root,{cache:'no-store'}); if(!response.ok) continue;
      const text=await response.text(); const doc=new DOMParser().parseFromString(text,'text/html');
      const names=[...doc.querySelectorAll('a')].map(a=>decodeURIComponent(a.getAttribute('href')||'')).filter(name=>name.toLowerCase().endsWith('.zip')).map(name=>name.split('/').pop());
      return {root,names};
    }catch(e){}
  }
  throw new Error('App Store unavailable');
}
async function AppStore_serverPackages(){
  const source=await AppStore_serverZipNames(); const packages=[];
  for(const name of source.names){ try{ const response=await fetch(source.root+encodeURIComponent(name),{cache:'no-store'}); if(response.ok){ const pkg=await AppPackage_read(await response.blob()); if(pkg) packages.push(Object.assign({},pkg.manifest,{fileName:name,pkg})); } }catch(e){} }
  return packages;
}
async function AppStore_installPackage(name, pkg){
  const bytes=await pkg.zip.generateAsync({type:'uint8array'}); await Applications_writeZip(name, bytes); localStorage.setItem('jackosAppInstall:'+UserData_key()+':'+name, new Date().toISOString()); await InstalledApps_scan(); AppStore_render();
}
async function AppStore_open(){
  const app=document.getElementById('appStoreApp'); if(!app) return; app.style.display='block'; document.getElementById('appStoreImportLabel').style.display=AppStore_isImportAllowed()?'inline-block':'none'; AppStore_render('loading'); await InstalledApps_scan(); try{ AppStoreState.catalogue=await AppStore_serverPackages(); AppStore_render(); }catch(e){ AppStore_render('offline'); }
}
function AppStore_close(){ const app=document.getElementById('appStoreApp'); if(app) app.style.display='none'; }
const AppStoreState={catalogue:[], view:'store', detail:null};
function AppStore_render(state){
  const body=document.getElementById('appStoreBody'); if(!body) return; if(state==='loading'){ body.textContent='Loading App Store...'; return; } if(state==='offline'){ body.textContent='Unable to load App Store. Check your connection.'; return; }
  body.innerHTML=''; const heading=document.createElement('h3'); heading.textContent=AppStoreState.view==='settings'?'Installed Apps':'Available Apps'; body.append(heading);
  if(AppStoreState.view==='settings' && AppStoreState.detail){
    const app=InstalledAppsState.byFile.get(AppStoreState.detail);
    if(!app){ AppStoreState.detail=null; } else {
      const back=document.createElement('button'); back.className='explorer-btn ghost'; back.textContent='Back to Installed Apps'; back.onclick=AppStore_backToInstalledApps; body.append(back);
      const title=document.createElement('h4'); title.textContent=app.name; body.append(title);
      const details=document.createElement('p'); details.className='app-store-detail-text'; details.textContent=`Developer: ${app.author||'Unknown developer'}\nVersion: ${app.version||'Unknown version'}\nDescription: ${app.description||'No description.'}`; body.append(details);
      const actions=document.createElement('div'); actions.className='app-store-card-actions app-store-detail-actions';
      const check=document.createElement('button'); check.className='explorer-btn'; check.textContent='Check For Updates'; check.onclick=()=>AppStore_checkAppUpdates(app.fileName);
      const latest=AppStoreState.catalogue.find(item=>item.fileName===app.fileName);
      const update=document.createElement('button'); update.className='explorer-btn'; update.textContent='Update'; update.disabled=!latest||latest.version===app.version; update.onclick=()=>AppStore_installPackage(app.fileName,latest.pkg);
      const remove=document.createElement('button'); remove.className='explorer-btn danger'; remove.textContent='Delete'; remove.onclick=()=>InstalledApps_delete(app.fileName);
      actions.append(check,update,remove); body.append(actions); return;
    }
  }
  if(AppStoreState.view==='settings'){
    const tools=document.createElement('div'); tools.className='set-actions';
    const usage=document.createElement('span'); usage.className='app-store-usage'; usage.textContent=`Storage Usage: ${Math.round(InstalledAppsState.apps.reduce((total,app)=>total+app.fileSize,0)/1024)} KB`; tools.append(usage); body.append(tools);
  }
  const list=AppStoreState.view==='settings'?InstalledAppsState.apps:AppStoreState.catalogue;
  if(!list.length){ const empty=document.createElement('p'); empty.textContent=AppStoreState.view==='settings'?'No installed applications.':'No apps are available.'; body.append(empty); return; }
  list.forEach(app=>{ const card=document.createElement('article'); card.className='app-store-card'; const icon=document.createElement('div'); icon.className='app-store-icon'; icon.textContent='📦'; const iconPath=app.pkg?.manifest?.icon && AppPackage_path(app.pkg, app.pkg.manifest.icon); if(iconPath && app.pkg.zip.file(iconPath)){ app.pkg.zip.file(iconPath).async('blob').then(blob=>{ icon.textContent=''; icon.style.backgroundImage=`url('${URL.createObjectURL(blob)}')`; }); } const content=document.createElement('div'); content.className='app-store-card-content'; const title=document.createElement('h4'); title.textContent=app.name; const details=document.createElement('p'); details.textContent=`${app.author||'Unknown developer'} | ${app.version||'Unknown version'} | ${app.description||'No description.'}`; content.append(title,details); if(AppStoreState.view==='settings'){ content.onclick=()=>AppStore_showInstalledDetail(app.fileName); content.title='Open app details'; } card.append(icon,content); const actions=document.createElement('div'); actions.className='app-store-card-actions'; if(AppStoreState.view==='settings'){ const check=document.createElement('button'); check.className='explorer-btn ghost'; check.textContent='Check For Updates'; check.onclick=()=>AppStore_checkAppUpdates(app.fileName); const latest=AppStoreState.catalogue.find(item=>item.fileName===app.fileName); const update=document.createElement('button'); update.className='explorer-btn'; update.textContent='Update'; update.disabled=!latest||latest.version===app.version; update.onclick=()=>AppStore_installPackage(app.fileName,latest.pkg); const remove=document.createElement('button'); remove.className='explorer-btn danger'; remove.textContent='Delete'; remove.onclick=()=>InstalledApps_delete(app.fileName); actions.append(check,update,remove); } else { const installed=InstalledAppsState.byFile.get(app.fileName); const button=document.createElement('button'); button.className='explorer-btn'; button.textContent=installed?(installed.version!==app.version?'Update':'Installed'):'Install'; button.disabled=!!installed && installed.version===app.version; button.onclick=()=>AppStore_installPackage(app.fileName,app.pkg); actions.append(button); } card.append(actions); body.append(card); });
}
function AppStore_showSettings(){ AppStoreState.view='settings'; AppStoreState.detail=null; AppStore_render(); }
function AppStore_showStore(){ AppStoreState.view='store'; AppStore_render(); }
function AppStore_showInstalledDetail(fileName){ AppStoreState.view='settings'; AppStoreState.detail=fileName; AppStore_render(); }
function AppStore_backToInstalledApps(){ AppStoreState.detail=null; AppStore_render(); }
async function AppStore_checkAppUpdates(fileName){
  try{
    const latest=await AppStore_serverPackages();
    AppStoreState.catalogue=latest;
    const installed=InstalledAppsState.byFile.get(fileName);
    const available=latest.find(app=>app.fileName===fileName);
    AppStoreState.view='settings';
    AppStoreState.detail=fileName;
    AppStore_render();
    if(!installed || !available){ alert('This application is no longer available in the JackOS App Store.'); return; }
    alert(available.version!==installed.version ? `${installed.name} update available: ${available.version}` : `${installed.name} is up to date.`);
  }catch(e){ alert('Cannot check for updates. This application does not currently exist in the JackOS App Store.'); }
}
async function AppStore_checkUpdates(){
  try{
    const latest=await AppStore_serverPackages();
    AppStoreState.catalogue=latest;
    const updates=InstalledAppsState.apps.filter(app=>{ const server=latest.find(item=>item.fileName===app.fileName); return server && server.version!==app.version; });
    AppStoreState.view='settings'; AppStore_render();
    alert(updates.length ? `${updates.length} update(s) available.` : 'All installed applications are up to date.');
  }catch(e){ alert('Cannot check for updates. This application does not currently exist in the JackOS App Store.'); }
}
function Settings_renderApplications(){ const box=document.getElementById('settingsApplicationsList'); if(!box) return; box.innerHTML=''; InstalledAppsState.apps.forEach(app=>{ const row=document.createElement('div'); row.className='acc-row'; const text=document.createElement('div'); text.textContent=`${app.name} | ${app.version||'Unknown'} | ${Math.round(app.fileSize/1024)} KB`; const exportBtn=document.createElement('button'); exportBtn.className='explorer-btn'; exportBtn.textContent='Export'; exportBtn.onclick=()=>InstalledApps_export(app.fileName); const button=document.createElement('button'); button.className='explorer-btn danger'; button.textContent='Delete Application'; button.onclick=()=>InstalledApps_delete(app.fileName); row.append(text,exportBtn,button); box.append(row); }); if(!InstalledAppsState.apps.length) box.textContent='No installed applications.'; }
ready(()=>{ InstalledApps_scan(); const input=document.getElementById('appStoreImportInput'); if(input) input.addEventListener('change',async()=>{ const file=input.files?.[0]; input.value=''; if(!file||!AppStore_isImportAllowed()) return; const pkg=await AppPackage_read(file); if(!pkg){ alert('This ZIP does not contain a valid JackOS application.'); return; } try{ await AppStore_installPackage(AppStore_safeName(file.name),pkg); }catch(e){ alert('Import failed: '+e.message); } }); });
// Wire desktop icons & Start menu items
ready(()=>{
  document.querySelectorAll('#desktop .icon[data-app]').forEach(icon=>{
    icon.style.cursor = 'pointer';
    icon.addEventListener('dblclick', ()=> Desktop_launch(icon.dataset.app));
    icon.addEventListener('click',    ()=> Desktop_launch(icon.dataset.app));
  });
  const sm=document.getElementById('startMenu');
  if(sm){ sm.addEventListener('click', (e)=>{ const item=e.target.closest('.menu-item[data-app]'); if(item){ e.stopPropagation(); Desktop_launch(item.dataset.app); } }); }
});
