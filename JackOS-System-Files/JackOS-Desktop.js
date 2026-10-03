//JackOS-Desktop.js
// ===== Desktop =====

const SCREENS=['startup','setup','login','transition','desktop'];
function show(id, fade=false){ const target=document.getElementById(id); if(!target) return; if(fade){ const f=document.getElementById('fadeOverlay'); f.classList.add('show'); setTimeout(()=>{ SCREENS.forEach(s=>{const el=document.getElementById(s); if(el) el.classList.remove('active');}); target.classList.add('active'); setTimeout(()=>f.classList.remove('show'), 250); },220); } else { SCREENS.forEach(s=>{const el=document.getElementById(s); if(el) el.classList.remove('active');}); target.classList.add('active'); }
  if(id==='desktop'){ applySavedWallpaper(); Desktop_UpdateEditionFeatures(); }
  if(id==='login'){ Login_resetFields(); Login_applyUser(); applyLoginWallpaper(); }
  if(id==='setup'){ Setup_open(); applyWallpaperTo('setup', localStorage.getItem('jackosWallpaperData') || localStorage.getItem('jackosWallpaper') || '#000'); }
  if(id==='transition'){ applyWallpaperTo('transition', localStorage.getItem('jackosWallpaperData') || localStorage.getItem('jackosWallpaper') || '#000'); }
}
// Startup
const Startup_mainText=document.getElementById('main-text');
window.addEventListener('load', ()=>{ setTimeout(()=>Startup_mainText.style.opacity=1, 200); setTimeout(()=>{ Startup_mainText.style.opacity=0; setTimeout(()=>{ const activated = localStorage.getItem('jackosActivated')==='true'; Users_migrate(); if(activated){ if(Users_hasAny()) show('login', true); else show('setup', true); } else document.getElementById('popup').style.display='block'; }, 1200); }, 2200); });
function Startup_checkKey(){ const key=document.getElementById('activation-key').value.trim(); 
if(key==='GUES-TACT-IVAT-ION'){
  localStorage.setItem(
  'jackosActivated',
  'true'
);

  localStorage.setItem("jackosEdition", "Home");
  JACKOS_EDITION = "Home";

  
  Users_migrate();
  const activatedUsers=Users_all(); activatedUsers.forEach(user=>{ user.edition='Home'; }); Users_save(activatedUsers);
 if(Users_hasAny()) show('login', true); else show('setup', true); } else alert('Invalid activation key.'); }
// Start menu & power
function Desktop_toggleStartMenu(){ const sm=document.getElementById('startMenu'); if(sm){ sm.classList.toggle('show'); } }
function Desktop_hideStartMenu(){ const sm=document.getElementById('startMenu'); if(sm){ sm.classList.remove('show'); } }
document.addEventListener('click', (e)=>{ const sm=document.getElementById('startMenu'); const btn=e.target.closest('.start-btn'); const insideMenu=e.target.closest('#startMenu'); if(sm && !btn && !insideMenu){ sm.classList.remove('show'); } });

function Desktop_lock(){

  Desktop_hideStartMenu();

  try{

    MusicState.audio?.pause();

  }catch(e){}

  show('login', true);

}
function Desktop_logout(){

  Desktop_hideStartMenu();

  Desktop_closeAllApps();

  show('login', true);

}

function Desktop_showOverlay(text, cb){ const o=document.getElementById('overlay'); o.innerHTML=text; o.style.display='flex'; setTimeout(()=>{ o.style.display='none'; if(cb) cb(); },1600); }
function Desktop_shutdown(){ Desktop_hideStartMenu(); Desktop_showOverlay('⏼<br>Shutting Down...<br>Tap anywhere to power on', ()=>{ const sh=document.getElementById('shutdownOverlay'); sh.style.display='block'; const on=()=>{ sh.style.display='none'; show('login', true); }; ['click','keydown','touchstart'].forEach(evt=> sh.addEventListener(evt, on, {once:true})); }); }
function Desktop_restart(){ Desktop_hideStartMenu(); Desktop_showOverlay('🔄<br>Restarting...', ()=>{ show('login', true); }); }
function Desktop_sleep(){ Desktop_hideStartMenu(); const s=document.getElementById('sleepOverlay'); s.style.display='block'; const wake=()=>{ s.style.display='none'; show('login', true); }; ['click','keydown','touchstart'].forEach(evt=> s.addEventListener(evt, wake, {once:true})); }

//Start Menu Power Clean Up Helpers


function Desktop_closeAllApps(){

  document.querySelectorAll(
    '#explorer,\
#browserWin,\
#calcApp,\
#jcamApp,\
#settingsWin,\
#photosApp,\
#musicApp,\
#gamesApp,\
#appStoreApp,\
#flappyApp,\
#tetrisApp,\
#snakeApp,\
#installedAppRuntime'
  ).forEach(win => {

    win.style.display='none';

    win.classList.remove(
      'window-minimized',
      'window-maximized'
    );

  });

  DesktopMinimisedApps.clear();

  try{

    Music_close();

  }catch(e){}

  Explorer_clearPreview();

  Desktop_refreshTaskbar();

}









// ===== Admin/Account auth guards =====
let AdminPendingAction = null;
let AccountPendingAction = null;

function currentUserObj(){ return Users_find(currentUser)||null; }
function isCurrentAdmin(){ const u=currentUserObj(); return !!(u && u.role==='admin'); }
function Admin_require(action){

  AdminPendingAction = action;

  const dlg =
    document.getElementById(
      'adminAuthDialog'
    );

  document.getElementById(
    'adminAuthName'
  ).value='';

  document.getElementById(
    'adminAuthPass'
  ).value='';

  document.getElementById(
    'adminAuthMsg'
  ).textContent='';

  dlg.style.display='flex';

}
function Admin_requireStrict(action){ // Always prompt for admin credentials (used by Reset)
  AdminPendingAction = action; const dlg=document.getElementById('adminAuthDialog');
  document.getElementById('adminAuthName').value='';
  document.getElementById('adminAuthPass').value='';
  document.getElementById('adminAuthMsg').textContent='';
  dlg.style.display='flex';
}
function Admin_cancel(){ AdminPendingAction=null; document.getElementById('adminAuthDialog').style.display='none'; }

function Account_require(action){

  AccountPendingAction =
    action;

  document.getElementById(
    'accountAuthName'
  ).value='';

  document.getElementById(
    'accountAuthPass'
  ).value='';

  document.getElementById(
    'accountAuthMsg'
  ).textContent='';

  document.getElementById(
    'accountAuthDialog'
  ).style.display='flex';

}

function Account_cancel(){

  AccountPendingAction =
    null;

  document.getElementById(
    'accountAuthDialog'
  ).style.display='none';

}

function Account_verifyAndContinue(){

  const name =
    document.getElementById(
      'accountAuthName'
    ).value.trim();

  const pass =
    document.getElementById(
      'accountAuthPass'
    ).value;

  const msg =
    document.getElementById(
      'accountAuthMsg'
    );

  const user =
    Users_find(currentUser);

  if(
    name !== currentUser ||
    !user ||
    user.pass !== pass
  ){

    msg.textContent =
      'Incorrect Credentials.';

    return;

  }

  document.getElementById(
    'accountAuthDialog'
  ).style.display='none';

  const fn =
    AccountPendingAction;

  AccountPendingAction =
    null;

  if(fn)
    fn();

}


function Admin_verifyAndContinue(){

  const name =
    (
      document.getElementById(
        'adminAuthName'
      ).value || ''
    ).trim();

  const pass =
    document.getElementById(
      'adminAuthPass'
    ).value || '';

  const msg =
    document.getElementById(
      'adminAuthMsg'
    );

  const user =
    Users_find(name);

  if(
    !user ||
    user.role!=='admin'
  ){

    msg.textContent =
      'Admin user not found';

    return;

  }

  if(isCurrentAdmin()){

    if(name !== currentUser){

      msg.textContent =
        'The logged in Admin\'s credentials are required to proceed.';

      return;

    }

    if(user.pass !== pass){

      msg.textContent =
        'Incorrect Credentials.';

      return;

    }

  }else{

    if(user.pass !== pass){

      msg.textContent =
        'Incorrect Credentials.';

      return;

    }

  }

  document.getElementById(
    'adminAuthDialog'
  ).style.display='none';

  const fn =
    AdminPendingAction;

  AdminPendingAction =
    null;

  if(fn)
    fn();

}
// ===== Guarded Reset (always requires admin auth) =====
function Desktop_resetJackOS_guarded(){ Desktop_hideStartMenu(); Admin_requireStrict(async ()=>{ const ok=confirm('This will erase all JackOS data and cannot be undone. Continue?'); if(!ok) return; try{ localStorage.clear(); if(navigator.storage && navigator.storage.getDirectory){ const root = await navigator.storage.getDirectory(); for(const name of ['JackOSDrive','Applications','Users','JackOSDrive']){ try { await root.removeEntry(name, {recursive:true}); } catch(e){} } } }catch(e){ console.warn('Reset error', e); } Desktop_showOverlay('🧹<br>Resetting JackOS…', ()=> location.reload()); }); }
// ===== Wallpaper helpers =====
function applyWallpaperTo(elId, url){ const el=document.getElementById(elId); if(!el) return; const value=url || '#000'; el.style.background = value.startsWith('#') ? value : `url('${value}') no-repeat center center fixed`; el.style.backgroundSize = value.startsWith('#') ? 'auto' : 'cover'; }
function applySavedWallpaper(){ const data=localStorage.getItem('jackosWallpaperData'); const saved=localStorage.getItem('jackosWallpaper'); const url = data || saved || '#000'; applyWallpaperTo('desktop', url); applyWallpaperTo('login', url); }
function applyLoginWallpaper(){ const data=localStorage.getItem('jackosWallpaperData'); const saved=localStorage.getItem('jackosWallpaper'); const url = data || saved || '#000'; applyWallpaperTo('login', url); }
function Desktop_setWallpaper(image){ localStorage.setItem('jackosWallpaper', image); localStorage.removeItem('jackosWallpaperData'); applySavedWallpaper(); }
function Desktop_setWallpaperFromData(dataUrl){ localStorage.setItem('jackosWallpaperData', dataUrl); applySavedWallpaper(); }
// Clock & Date
(function(){ const clock=document.getElementById('clock'); const dateEl=document.getElementById('date'); function updClock(){ const now=new Date(); clock.textContent=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`; } function updDate(){ const now=new Date(); const opts={ day:'numeric', month:'short', year:'numeric' }; dateEl.textContent = now.toLocaleDateString('en-GB', opts); } updClock(); updDate(); setInterval(updClock, 1000); setInterval(updDate, 60*1000); })();
// ===== Login with Transition + ENTER-to-login =====
let currentUser = localStorage.getItem('jackosLastUser') || (Users_all().find(u=>!u.guest)?.name || '');
function Login_renderUserButtons(){ const cont=document.getElementById('userSwitch'); if(!cont) return; const users=Users_all().filter(u=>!u.guest); cont.innerHTML=''; users.forEach(u=>{ const btn=document.createElement('button'); btn.className='user-btn'+(u.name===currentUser? ' active':''); btn.textContent=u.name; btn.dataset.user=u.name; btn.addEventListener('click', ()=> Login_switchUser(u.name)); cont.appendChild(btn); }); cont.style.display = users.length? 'flex':'none'; const guestBtn=document.getElementById('guestLoginBtn'); if(guestBtn) guestBtn.style.display=Users_guest()?'block':'none'; }
function Login_applyUser(){ const cu=document.getElementById('current-user'); if(!currentUser || Users_find(currentUser)?.guest){ const user=Users_all().find(u=>!u.guest); currentUser=user?.name||''; } if(cu) cu.textContent=currentUser || '--'; Login_renderUserButtons(); }
function Login_switchUser(u){ currentUser=u; localStorage.setItem('jackosLastUser', currentUser); Login_applyUser(); const m=document.getElementById('message'); if(m) m.textContent=''; const p=document.getElementById('password'); if(p){ p.value=''; try{ p.focus(); }catch(e){} } }
function Login_resetFields(){ const p=document.getElementById('password'); const m=document.getElementById('message'); if(p) p.value=''; if(m){ m.textContent=''; m.style.color=''; } }
function Login_guest(){ const guest=Users_guest(); if(!guest) return; currentUser=guest.name; localStorage.setItem('jackosLastUser', currentUser); Login_enterDesktop(); }
function Login_enterDesktop(){ UserData_resetRuntime(); const title=document.getElementById('transTitle'); if(title) title.textContent = 'Welcome '+currentUser; show('transition', true); setTimeout(()=>{ show('desktop', true); Desktop_UpdateEditionFeatures(); }, 1400); }
function Login_login(){ const pwd=(document.getElementById('password')?.value)||''; const msg=document.getElementById('message'); const user=Users_find(currentUser);
  if(!user){ if(msg){ msg.style.color='salmon'; msg.textContent='No accounts yet -- run setup'; } show('setup', true); return; }
  if(user.guest && pwd===''){ Login_enterDesktop(); } else if(pwd && user.pass===pwd){ Login_enterDesktop(); } else { if(msg){ msg.style.color='salmon'; msg.textContent='Incorrect password'; } } }
ready(()=>{ const pw=document.getElementById('password'); if(pw){ pw.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); Login_login(); } }); } });
ready(Login_applyUser);

function Desktop_windowAppId(id){

  return ({
    browserWin:'browser',
    calcApp:'calculator',
    jcamApp:'camera',
    settingsWin:'settings',
    photosApp:'photos',
    musicApp:'music',
    gamesApp:'games',
    appStoreApp:'appstore',
    flappyApp:'flappy',
    tetrisApp:'tetris',
    snakeApp:'snake'
  })[id] || id;

}

function Desktop_appAvailable(id){ const appId=Desktop_windowAppId(id); return appId!=='music'||Edition_IsPrivateOrPro(); }



function Desktop_appIcon(id){

 if(
    id === 'installedAppRuntime' &&
    InstalledAppActive
  ){
    return InstalledApps_icon(
      InstalledAppActive
    );
  }

  const source =
    document.querySelector(
      `#desktop .icon[data-app="${Desktop_windowAppId(id)}"] .icon-box`
    );

  if(source)
    return source.cloneNode(true);

  const icon =
    document.createElement('span');

  icon.textContent='▣';

  return icon;

}


function Desktop_appName(id){

  const names = {
    browser: 'Browser',
    calculator: 'Calculator',
    camera: 'Camera',
    settings: 'Settings',
    photos: 'Photos',
    music: 'Music',
    games: 'Games',
    flappy: 'Flappy Bird',
    tetris: 'Tetris',
    snake: 'Snake',
    appstore: 'App Store'
  };

  return names[id] || String(id);

}

//Bug Fix

const DesktopMinimisedApps = new Set();


// Desktop Windows Fix


const DesktopWindows = {

  z: 100,

  ids: [
    'browserWin',
    'calcApp',
    'jcamApp',
    'settingsWin',
    'photosApp',
    'musicApp',
    'gamesApp',
    'appStoreApp',
    'flappyApp',
    'tetrisApp',
    'snakeApp',
    'installedAppRuntime'
  ],

  names: {

    browserWin: 'Browser',
    calcApp: 'Calculator',
    jcamApp: 'Camera',
    settingsWin: 'Settings',
    photosApp: 'Photos',
    musicApp: 'Music',
    gamesApp: 'Games',
    appStoreApp: 'App Store',

    flappyApp: 'Flappy Bird',
    tetrisApp: 'Tetris',
    snakeApp: 'Snake',

    installedAppRuntime: 'App'

  }

};



function Desktop_refreshTaskbar(){ const bar=document.getElementById('taskbarApps'); if(!bar) return; bar.innerHTML=''; let pinned=[]; try{ pinned=JSON.parse(localStorage.getItem('jackosTaskbarPins')||'[]'); }catch(e){} 

const open=DesktopWindows.ids.filter(id=>{

  const win =
    document.getElementById(id);

  return (

    win &&

    (
      getComputedStyle(win).display
      !== 'none'

      ||

      DesktopMinimisedApps.has(id)
    )

  );

});




const ids=[...new Set([
  ...pinned.filter(Desktop_appAvailable),
  ...open.map(id => Desktop_windowAppId(id))
])];

ids.forEach(id=>{
  let win=document.getElementById(id);

  if(!win){

  if(id==='games')
    win=document.getElementById('gamesApp');

  else if(id==='browser')
    win=document.getElementById('browserWin');

  else if(id==='calculator')
    win=document.getElementById('calcApp');

  else if(id==='camera')
    win=document.getElementById('jcamApp');

  else if(id==='settings')
    win=document.getElementById('settingsWin');

  else if(id==='photos')
    win=document.getElementById('photosApp');

  else if(id==='music')
    win=document.getElementById('musicApp');

  else if(id==='appstore')
    win=document.getElementById('appStoreApp');

  else if(id==='flappy')
    win=document.getElementById('flappyApp');

  else if(id==='tetris')
    win=document.getElementById('tetrisApp');

  else if(id==='snake')
    win=document.getElementById('snakeApp');

}

  if(!win||!Desktop_appAvailable(id)) return; 
  
  
  const button =
  document.createElement(
    'button'
  );

const active =
  open.includes(id) ||
  open.includes(
    id + 'App'
  );

button.className =
  'taskbar-app' +
  (
    active
      ? ' active'
      : ''
  );

button.setAttribute(
  'aria-label',
  Desktop_appName(id)
);

button.append(Desktop_appIcon(id)); 
  
  
  button.onclick=()=>{

  DesktopMinimisedApps.delete(id);

  win.style.display='block';

  win.classList.remove(
    'window-minimized'
  );

  win.style.zIndex=
    ++DesktopWindows.z;

  Desktop_refreshTaskbar();
};
  button.addEventListener('mouseenter',()=>{

  const tip =
    document.getElementById(
      'taskbarTooltip'
    );

  if(!tip) return;

tip.textContent =
  id === 'installedAppRuntime' &&
  InstalledAppActive
    ? InstalledAppActive.name
    : Desktop_appName(id);

  tip.style.display='block';

  const rect =
    button.getBoundingClientRect();

  requestAnimationFrame(()=>{

    const tipRect =
      tip.getBoundingClientRect();

    tip.style.left =
      (
        rect.left +
        rect.width/2 -
        tipRect.width/2
      ) + 'px';

    tip.style.top =
      (
        rect.top -
        tipRect.height -
        12
      ) + 'px';

  });

});

button.addEventListener('mouseleave',()=>{

  const tip =
    document.getElementById(
      'taskbarTooltip'
    );

  if(tip)
    tip.style.display='none';

});
  bar.append(button); }); const user=document.getElementById('taskbarUser'); if(user) user.textContent=currentUser||'--'; document.querySelector('#desktop .taskbar')?.classList.toggle('compact',localStorage.getItem('jackosTaskbarCompact')==='true'); }



function Desktop_searchApps(value){

  const results =
    document.getElementById(
      'taskbarSearchResults'
    );

  if(!results)
    return;

  results.innerHTML='';

  const query =
    value.trim().toLowerCase();

  if(!query){
    results.classList.remove('show');
    return;
  }

 // Built-in apps
DesktopWindows.ids
  .filter(id =>

    id !== 'installedAppRuntime' &&

    Desktop_appAvailable(id) &&

    DesktopWindows.names[id]
      ?.toLowerCase()
      .includes(query)

  )
    .forEach(id => {

      const item =
        document.createElement('button');

      item.className =
        'taskbar-search-result';

      item.append(
        Desktop_appIcon(id),
        DesktopWindows.names[id]
      );

      item.onclick = () => {

        Desktop_launch(
          Desktop_windowAppId(id)
        );

        results.classList.remove('show');

        document.getElementById(
          'taskbarSearch'
        ).value='';

      };
      

      results.append(item);

    });

  // Installed apps
InstalledAppsState.apps
  .filter(app =>
    app.name
      ?.toLowerCase()
      .includes(query)
  )
  .forEach(app => {

    const item =
      document.createElement('button');

    item.className =
      'taskbar-search-result';

    const icon =
      InstalledApps_icon(app);

    const name =
      document.createElement('span');

    name.textContent =
      app.name;

    item.append(
      icon,
      name
    );

    item.onclick = () => {

      Desktop_hideStartMenu();

      Desktop_launch(
        'installed:' +
        app.fileName
      );

      results.classList.remove('show');

      document.getElementById(
        'taskbarSearch'
      ).value='';

    };

    results.append(item);

  });

  results.classList.toggle(
    'show',
    results.children.length > 0
  );

}



  function Desktop_initWindows(){ DesktopWindows.z=100;
  
  
  DesktopWindows.ids.forEach(id=>{ const win=document.getElementById(id); if(!win||win.dataset.windowReady) return; win.dataset.windowReady='true'; const header=win.querySelector('.header,.game-header,.app-window-header,#browserBar,#calcHeader,#jcamHeader,#settingsHeader,#photosHeader,#musicHeader'); if(!header) return; const controls=document.createElement('div'); controls.className='window-controls'; const min=document.createElement('button'); min.className='window-control'; min.textContent='−'; min.title='Minimize'; const max=document.createElement('button'); max.className='window-control'; max.textContent='□'; max.title='Maximize'; const close=document.createElement('button'); close.className='window-control close'; close.textContent='×'; close.title='Close'; controls.append(min,max,close); header.append(controls); const focus=()=>{ win.style.zIndex=++DesktopWindows.z; Desktop_refreshTaskbar(); }; win.addEventListener('pointerdown',focus); 



min.onclick=e=>{
  e.stopPropagation();

  DesktopMinimisedApps.add(id);

  win.style.display='none';

  Desktop_refreshTaskbar();
};


max.onclick=e=>{ e.stopPropagation(); win.classList.toggle('window-maximized'); focus(); };
 

close.onclick=e=>{

  e.stopPropagation();

  DesktopMinimisedApps.delete(id);

  const appId =
    Desktop_windowAppId(id);

  const app =
    APP_REGISTRY[appId];

  if(app?.close){

    app.close();

  }else{

    win.style.display='none';

  }

  Desktop_refreshTaskbar();

};
 
 let drag=null; 


  
  
header.addEventListener('pointerdown',e=>{

  if(e.target.closest('button,input'))
    return;

  const rect = win.getBoundingClientRect();

  // convert centred window into fixed pixel position
  win.style.left = rect.left + 'px';
  win.style.top = rect.top + 'px';
  win.style.transform = 'none';

  drag = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };

});

 header.addEventListener('pointermove',e=>{
  if(!drag || win.classList.contains('window-maximized'))
    return;

  win.style.left =
    Math.max(4, e.clientX - drag.x) + 'px';

  win.style.top =
    Math.max(4, e.clientY - drag.y) + 'px';
});

const stopDrag = ()=>{
  drag = null;
};

header.addEventListener(
  'pointerup',
  stopDrag
);

header.addEventListener(
  'pointercancel',
  stopDrag
);

document.addEventListener(
  'pointerup',
  stopDrag
);


 
 ['n','s','e','w','nw','ne','sw','se'].forEach(direction=>{ const handle=document.createElement('div'); handle.className='window-resize-handle '+direction; win.append(handle); let resize=null; handle.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); resize={direction,startX:e.clientX,startY:e.clientY,left:win.offsetLeft,top:win.offsetTop,width:win.offsetWidth,height:win.offsetHeight}; handle.setPointerCapture(e.pointerId); }); handle.addEventListener('pointermove',e=>{ if(!resize||win.classList.contains('window-maximized')) return; const dx=e.clientX-resize.startX, dy=e.clientY-resize.startY, minW=260, minH=180; let width=resize.width,height=resize.height,left=resize.left,top=resize.top; if(resize.direction.includes('e')) width=Math.max(minW,resize.width+dx); if(resize.direction.includes('s')) height=Math.max(minH,resize.height+dy); if(resize.direction.includes('w')){ width=Math.max(minW,resize.width-dx); left=resize.left+resize.width-width; } if(resize.direction.includes('n')){ height=Math.max(minH,resize.height-dy); top=resize.top+resize.height-height; } win.style.width=width+'px'; win.style.height=height+'px'; win.style.left=Math.max(4,left)+'px'; win.style.top=Math.max(4,top)+'px'; win.style.transform='none'; }); handle.addEventListener('pointerup',()=>{ resize=null; }); }); }); }
ready(()=>{ Desktop_initWindows(); const search=document.getElementById('taskbarSearch'); search?.addEventListener('input',()=>Desktop_searchApps(search.value)); const desktop=document.querySelector('#desktop .desktop'); desktop?.addEventListener('click',()=>setTimeout(Desktop_refreshTaskbar,0)); 
});
// ===== Setup (first account admin) =====
const SetupState = { list: [] };
function Setup_open(){ const msg=document.getElementById('setupMsg'); if(msg) msg.textContent=''; const stored=Users_all(); SetupState.list = Array.isArray(stored)&&stored.length? [...stored] : []; Setup_render(); }
function Setup_clearInputs(){ ['su-name','su-pass','su-pass2'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.value=''; } }); const name=document.getElementById('su-name'); try{ name && name.focus(); }catch(e){} }
function Setup_addGuest(){ if(Users_guest() || SetupState.list.some(u=>u.guest)){ const msg=document.getElementById('setupMsg'); if(msg) msg.textContent='A Guest account already exists'; return; } SetupState.list.push({name:'Guest', pass:'', role:'user', guest:true}); Setup_render(); }
function Setup_addUser(){ const name=(document.getElementById('su-name')?.value||'').trim(); const pass=(document.getElementById('su-pass')?.value||''); const pass2=(document.getElementById('su-pass2')?.value||''); const msg=document.getElementById('setupMsg'); if(!name){ msg.textContent='Enter a name'; return; } if(!pass){ msg.textContent='Enter a password'; return; } if(pass!==pass2){ msg.textContent='Passwords don\'t match'; return; } if(SetupState.list.find(u=>u.name.toLowerCase()===name.toLowerCase())){ msg.textContent='That name already exists'; return; } const role = (SetupState.list.length===0)? 'admin' : 'user'; SetupState.list.push({name, pass, role}); msg.textContent='Added '+name+' ✓' + (role==='admin'?' (Admin)':''); Setup_clearInputs(); Setup_render(); }
function Setup_remove(idx){ SetupState.list.splice(idx,1); Setup_render(); }
function Setup_render(){ const list=document.getElementById('setupList'); const btn=document.getElementById('setupFinishBtn'); if(list){ list.innerHTML=''; if(!SetupState.list.length){ list.innerHTML='<div style="opacity:.8;">No accounts yet. Add at least one.</div>'; } else { SetupState.list.forEach((u,i)=>{ const row=document.createElement('div'); row.className='setup-user'; const label=document.createElement('label'); label.innerHTML=`👤 <b>${u.name}</b> `; if(!u.guest){ const admin=document.createElement('input'); admin.type='checkbox'; admin.checked=u.role==='admin'; admin.setAttribute('aria-label',`Make ${u.name} admin`); admin.onchange=()=>{ u.role=admin.checked?'admin':'user'; if(!SetupState.list.some(x=>x.role==='admin')){ admin.checked=true; u.role='admin'; } Setup_render(); }; label.appendChild(admin); label.append(' Admin'); } else label.append(' Guest'); row.appendChild(label); const rm=document.createElement('button'); rm.className='btn danger'; rm.textContent='Remove'; rm.onclick=()=>Setup_remove(i); row.appendChild(rm); list.appendChild(row); }); } } if(btn){ btn.disabled = SetupState.list.length===0; } }
function Setup_finish(){ 
  if(!SetupState.list.length){ 
    alert('Add at least one account'); 
    return; 
  } 
  if(!SetupState.list.some(u=>!u.guest && u.role==='admin')){ alert('Choose at least one non-Guest admin.'); return; }
  Users_save(SetupState.list); 
  currentUser = SetupState.list[0].name; 
  localStorage.setItem('jackosLastUser', currentUser); 
  Login_applyUser(); 
  
  // Initialize security questions setup for all accounts
  SetupSecQState.accountIndex = 0;
  SetupSecQState.accountNames = SetupState.list.filter(u=>!u.guest).map(u => u.name);
  Setup_promptSecurityQuestions();
}
