/* JackOS core JS (v4 1st May 2026 release)*/



/* JackOS version number global variable */

const JACKOS_VERSION = "4.2";

function ready(fn){ if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', fn); } else { try{ fn(); }catch(e){ console.warn('ready() error', e); } } }
// === Users storage (with roles) ===
function Users_all(){ try{ return JSON.parse(localStorage.getItem('jackosUsers')||'[]'); }catch(e){ return []; } }
function Users_save(list){ try{ localStorage.setItem('jackosUsers', JSON.stringify(list||[])); }catch(e){} }
function Users_hasAny(){ return Users_all().length>0; }
function Users_find(name){ return Users_all().find(u=>u && u.name===name); }
function Users_countAdmins(list){ return (list||Users_all()).filter(u=>u.role==='admin').length; }
function Users_migrate(){ const list=Users_all(); if(!Array.isArray(list) || !list.length) return; if(list.every(u=>!u.role)){ list[0].role='admin'; for(let i=1;i<list.length;i++) list[i].role='user'; Users_save(list); } }
// === Apps registry (all apps) ===
const APP_REGISTRY = {
  explorer:   { open: ()=>Explorer_open(),   close: ()=>Explorer_close?.() },
  browser:    { open: ()=>Browser_open(),    close: ()=>{ const w=document.getElementById('browserWin'); const f=document.getElementById('browserFrame'); if(w) w.style.display='none'; if(f) f.src='about:blank'; } },
  photos:     { open: ()=>Desktop_openPhotosApp(), close: ()=>Photos_close?.() },
  calculator: { open: ()=>Calculator_open(), close: ()=>Calculator_close() },
  camera:     { open: ()=>JCam_open(),       close: ()=>JCam_close?.() },
  settings:   { open: ()=>Settings_open(),   close: ()=>Settings_close?.() },
};
function Desktop_launch(appId){ const app = APP_REGISTRY[appId]; if(!app || !app.open) { console.warn('Unknown app:', appId); return; } Desktop_hideStartMenu(); app.open(); }
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
const SCREENS=['startup','setup','login','transition','desktop'];
function show(id, fade=false){ const target=document.getElementById(id); if(!target) return; if(fade){ const f=document.getElementById('fadeOverlay'); f.classList.add('show'); setTimeout(()=>{ SCREENS.forEach(s=>{const el=document.getElementById(s); if(el) el.classList.remove('active');}); target.classList.add('active'); setTimeout(()=>f.classList.remove('show'), 250); },220); } else { SCREENS.forEach(s=>{const el=document.getElementById(s); if(el) el.classList.remove('active');}); target.classList.add('active'); }
  if(id==='desktop'){ applySavedWallpaper(); }
  if(id==='login'){ Login_resetFields(); Login_applyUser(); applyLoginWallpaper(); }
  if(id==='setup'){ Setup_open(); applyWallpaperTo('setup', localStorage.getItem('jackosWallpaperData') || localStorage.getItem('jackosWallpaper') || 'Yo.png'); }
  if(id==='transition'){ applyWallpaperTo('transition', localStorage.getItem('jackosWallpaperData') || localStorage.getItem('jackosWallpaper') || 'Yo.png'); }
}
// Startup
const Startup_mainText=document.getElementById('main-text');
window.addEventListener('load', ()=>{ setTimeout(()=>Startup_mainText.style.opacity=1, 200); setTimeout(()=>{ Startup_mainText.style.opacity=0; setTimeout(()=>{ const activated = localStorage.getItem('jackosActivated')==='true'; Users_migrate(); if(activated){ if(Users_hasAny()) show('login', true); else show('setup', true); } else document.getElementById('popup').style.display='block'; }, 1200); }, 2200); });
function Startup_checkKey(){ const key=document.getElementById('activation-key').value.trim(); if(key==='GUES-TACT-IVAT-ION'){ localStorage.setItem('jackosActivated','true'); Users_migrate(); if(Users_hasAny()) show('login', true); else show('setup', true); } else alert('Invalid activation key.'); }
// Start menu & power
function Desktop_toggleStartMenu(){ const sm=document.getElementById('startMenu'); if(sm){ sm.classList.toggle('show'); } }
function Desktop_hideStartMenu(){ const sm=document.getElementById('startMenu'); if(sm){ sm.classList.remove('show'); } }
document.addEventListener('click', (e)=>{ const sm=document.getElementById('startMenu'); const btn=e.target.closest('.start-btn'); const insideMenu=e.target.closest('#startMenu'); if(sm && !btn && !insideMenu){ sm.classList.remove('show'); } });
function Desktop_lock(){ Desktop_hideStartMenu(); show('login', true); }
function Desktop_logout(){ Desktop_hideStartMenu(); show('login', true); }
function Desktop_showOverlay(text, cb){ const o=document.getElementById('overlay'); o.innerHTML=text; o.style.display='flex'; setTimeout(()=>{ o.style.display='none'; if(cb) cb(); },1600); }
function Desktop_shutdown(){ Desktop_hideStartMenu(); Desktop_showOverlay('⏼<br>Shutting Down...<br>Tap anywhere to power on', ()=>{ const sh=document.getElementById('shutdownOverlay'); sh.style.display='block'; const on=()=>{ sh.style.display='none'; show('login', true); }; ['click','keydown','touchstart'].forEach(evt=> sh.addEventListener(evt, on, {once:true})); }); }
function Desktop_restart(){ Desktop_hideStartMenu(); Desktop_showOverlay('🔄<br>Restarting...', ()=>{ show('login', true); }); }
function Desktop_sleep(){ Desktop_hideStartMenu(); const s=document.getElementById('sleepOverlay'); s.style.display='block'; const wake=()=>{ s.style.display='none'; show('login', true); }; ['click','keydown','touchstart'].forEach(evt=> s.addEventListener(evt, wake, {once:true})); }
// ===== Admin auth guards =====
let AdminPendingAction = null;
function currentUserObj(){ return Users_find(currentUser)||null; }
function isCurrentAdmin(){ const u=currentUserObj(); return !!(u && u.role==='admin'); }
function Admin_require(action){ // If current user is admin, allow instantly; else require admin creds
  if(isCurrentAdmin()){ action(); return; }
  AdminPendingAction = action; const dlg=document.getElementById('adminAuthDialog');
  document.getElementById('adminAuthName').value='';
  document.getElementById('adminAuthPass').value='';
  document.getElementById('adminAuthMsg').textContent='';
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
function Admin_verifyAndContinue(){ const name=(document.getElementById('adminAuthName').value||'').trim(); const pass=document.getElementById('adminAuthPass').value||''; const msg=document.getElementById('adminAuthMsg'); const u=Users_find(name); if(!u || u.role!=='admin'){ msg.textContent='Admin user not found'; return; } if(u.pass!==pass){ msg.textContent='Incorrect password'; return; } document.getElementById('adminAuthDialog').style.display='none'; const fn=AdminPendingAction; AdminPendingAction=null; try{ fn && fn(); }catch(e){ console.warn('Admin action error', e); }
}
// ===== Guarded Reset (always requires admin auth) =====
function Desktop_resetJackOS_guarded(){ Desktop_hideStartMenu(); Admin_requireStrict(async ()=>{ const ok=confirm('This will erase all JackOS data and cannot be undone. Continue?'); if(!ok) return; try{ localStorage.clear(); if(navigator.storage && navigator.storage.getDirectory){ const root = await navigator.storage.getDirectory(); try { await root.removeEntry('JackOSDrive', {recursive:true}); } catch(e){} } }catch(e){ console.warn('Reset error', e); } Desktop_showOverlay('🧹<br>Resetting JackOS…', ()=> location.reload()); }); }
// ===== Wallpaper helpers =====
function applyWallpaperTo(elId, url){ const el=document.getElementById(elId); if(!el) return; el.style.background = `url('${url}') no-repeat center center fixed`; el.style.backgroundSize = 'cover'; }
function applySavedWallpaper(){ const data=localStorage.getItem('jackosWallpaperData'); const saved=localStorage.getItem('jackosWallpaper'); const url = data || saved || 'Yo.png'; applyWallpaperTo('desktop', url); applyWallpaperTo('login', url); }
function applyLoginWallpaper(){ const data=localStorage.getItem('jackosWallpaperData'); const saved=localStorage.getItem('jackosWallpaper'); const url = data || saved || 'Yo.png'; applyWallpaperTo('login', url); }
function Desktop_setWallpaper(image){ localStorage.setItem('jackosWallpaper', image); localStorage.removeItem('jackosWallpaperData'); applySavedWallpaper(); }
function Desktop_setWallpaperFromData(dataUrl){ localStorage.setItem('jackosWallpaperData', dataUrl); applySavedWallpaper(); }
// Clock & Date
(function(){ const clock=document.getElementById('clock'); const dateEl=document.getElementById('date'); function updClock(){ const now=new Date(); clock.textContent=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`; } function updDate(){ const now=new Date(); const opts={ day:'numeric', month:'short', year:'numeric' }; dateEl.textContent = now.toLocaleDateString('en-GB', opts); } updClock(); updDate(); setInterval(updClock, 1000); setInterval(updDate, 60*1000); })();
// Volume
let audioCtx=null, gainNode=null;
function Volume_ensureCtx(){ try{ const AC = window.AudioContext || window.webkitAudioContext; if(!audioCtx || audioCtx.state==='closed'){ audioCtx = new AC(); gainNode = audioCtx.createGain(); gainNode.gain.value = (Number(document.getElementById('volSlider').value)||60)/100; gainNode.connect(audioCtx.destination); } if(audioCtx.state==='suspended'){ audioCtx.resume().catch(()=>{}); } }catch(e){ console.warn('AudioContext unavailable', e); } }
function Volume_init(){ const slider=document.getElementById('volSlider'); const percent=document.getElementById('volPercent'); if(!slider) return; const update=()=>{ const v=Number(slider.value)||0; percent.textContent = v+'%'; try{ Volume_ensureCtx(); if(gainNode && audioCtx){ gainNode.gain.setValueAtTime(v/100, audioCtx.currentTime); } }catch(e){} }; ['input','change'].forEach(evt=> slider.addEventListener(evt, update)); ['mousedown','touchstart','pointerdown','click'].forEach(evt=> slider.addEventListener(evt, ()=>{ Volume_ensureCtx(); })); update(); }
ready(Volume_init);
function Volume_testTone(){ Volume_ensureCtx(); try{ const osc = audioCtx.createOscillator(); osc.type='sine'; osc.frequency.setValueAtTime(880, audioCtx.currentTime); osc.connect(gainNode); osc.start(); osc.stop(audioCtx.currentTime + 0.25); }catch(e){ console.warn('Ping failed', e); } }
// ===== Login with Transition + ENTER-to-login =====
let currentUser = localStorage.getItem('jackosLastUser') || (Users_all()[0]?.name || '');
function Login_renderUserButtons(){ const cont=document.getElementById('userSwitch'); if(!cont) return; const users=Users_all(); cont.innerHTML=''; users.forEach(u=>{ const btn=document.createElement('button'); btn.className='user-btn'+(u.name===currentUser? ' active':''); btn.textContent=u.name; btn.dataset.user=u.name; btn.addEventListener('click', ()=> Login_switchUser(u.name)); cont.appendChild(btn); }); cont.style.display = users.length? 'flex':'none'; }
function Login_applyUser(){ const cu=document.getElementById('current-user'); if(!currentUser){ const list=Users_all(); if(list.length){ currentUser=list[0].name; } } if(cu) cu.textContent=currentUser || '--'; Login_renderUserButtons(); }
function Login_switchUser(u){ currentUser=u; localStorage.setItem('jackosLastUser', currentUser); Login_applyUser(); const m=document.getElementById('message'); if(m) m.textContent=''; const p=document.getElementById('password'); if(p){ p.value=''; try{ p.focus(); }catch(e){} } }
function Login_resetFields(){ const p=document.getElementById('password'); const m=document.getElementById('message'); if(p) p.value=''; if(m){ m.textContent=''; m.style.color=''; } }
function Login_login(){ const pwd=(document.getElementById('password')?.value)||''; const msg=document.getElementById('message'); const user=Users_find(currentUser);
  if(!user){ if(msg){ msg.style.color='salmon'; msg.textContent='No accounts yet -- run setup'; } show('setup', true); return; }
  if(pwd && user.pass===pwd){ const title=document.getElementById('transTitle'); if(title) title.textContent = 'Welcome '+currentUser; show('transition', true); setTimeout(()=>{ show('desktop', true); }, 1400); } else { if(msg){ msg.style.color='salmon'; msg.textContent='Incorrect password'; } } }
ready(()=>{ const pw=document.getElementById('password'); if(pw){ pw.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); Login_login(); } }); } });
ready(Login_applyUser);
// ===== Setup (first account admin) =====
const SetupState = { list: [] };
function Setup_open(){ const msg=document.getElementById('setupMsg'); if(msg) msg.textContent=''; const stored=Users_all(); SetupState.list = Array.isArray(stored)&&stored.length? [...stored] : []; Setup_render(); }
function Setup_clearInputs(){ ['su-name','su-pass','su-pass2'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.value=''; } }); const name=document.getElementById('su-name'); try{ name && name.focus(); }catch(e){} }
function Setup_addUser(){ const name=(document.getElementById('su-name')?.value||'').trim(); const pass=(document.getElementById('su-pass')?.value||''); const pass2=(document.getElementById('su-pass2')?.value||''); const msg=document.getElementById('setupMsg'); if(!name){ msg.textContent='Enter a name'; return; } if(!pass){ msg.textContent='Enter a password'; return; } if(pass!==pass2){ msg.textContent='Passwords don\'t match'; return; } if(SetupState.list.find(u=>u.name.toLowerCase()===name.toLowerCase())){ msg.textContent='That name already exists'; return; } const role = (SetupState.list.length===0)? 'admin' : 'user'; SetupState.list.push({name, pass, role}); msg.textContent='Added '+name+' ✓' + (role==='admin'?' (Admin)':''); Setup_clearInputs(); Setup_render(); }
function Setup_remove(idx){ SetupState.list.splice(idx,1); Setup_render(); }
function Setup_render(){ const list=document.getElementById('setupList'); const btn=document.getElementById('setupFinishBtn'); if(list){ list.innerHTML=''; if(!SetupState.list.length){ list.innerHTML='<div style="opacity:.8;">No accounts yet. Add at least one.</div>'; } else { SetupState.list.forEach((u,i)=>{ const row=document.createElement('div'); row.className='setup-user'; row.innerHTML = `<div>👤 <b>${u.name}</b> <span class="badge ${u.role}">${u.role}</span></div>`; const rm=document.createElement('button'); rm.className='btn danger'; rm.textContent='Remove'; rm.onclick=()=>Setup_remove(i); row.appendChild(rm); list.appendChild(row); }); } } if(btn){ btn.disabled = SetupState.list.length===0; } }
// ===== Setup with Security Questions Loop =====
let SetupSecQState = { accountIndex: 0, accountNames: [] };

function Setup_finish(){ 
  if(!SetupState.list.length){ 
    alert('Add at least one account'); 
    return; 
  } 
  if(SetupState.list.every(u=>u.role!=='admin')){ 
    SetupState.list[0].role='admin'; 
    for(let i=1;i<SetupState.list.length;i++) 
      SetupState.list[i].role='user'; 
  } 
  Users_save(SetupState.list); 
  currentUser = SetupState.list[0].name; 
  localStorage.setItem('jackosLastUser', currentUser); 
  Login_applyUser(); 
  
  // Initialize security questions setup for all accounts
  SetupSecQState.accountIndex = 0;
  SetupSecQState.accountNames = SetupState.list.map(u => u.name);
  Setup_promptSecurityQuestions();
}

function Setup_promptSecurityQuestions(){
  if(SetupSecQState.accountIndex < SetupSecQState.accountNames.length){
    const accountName = SetupSecQState.accountNames[SetupSecQState.accountIndex];
    alert(`Set up security questions for: ${accountName}`);
    SecQ_openSetupWizard(accountName);
  } else {
    // All accounts done
    show('login', true);
  }
}

function Setup_nextAccount(){
  SetupSecQState.accountIndex++;
  Setup_promptSecurityQuestions();
}

// ===== Settings (accounts + admin transfer) =====
// Open Settings: show the main settings menu by default
function Settings_open(){
  const win = document.getElementById('settingsWin');
  if(!win) return;
  // show main menu, hide accounts panel
  const main = document.getElementById('settingsMain');
  const accPanel = document.getElementById('settingsAccountsPanel');
  if(main) main.style.display = 'block';
  if(accPanel) accPanel.style.display = 'none';
  win.style.display = 'block';
}

// Close Settings (unchanged)
function Settings_close(){
  const win = document.getElementById('settingsWin');
  if(win) win.style.display = 'none';
}

// Show the Accounts panel (called when user clicks "Accounts" button)
function Settings_showAccounts(){
  const main = document.getElementById('settingsMain');
  const accPanel = document.getElementById('settingsAccountsPanel');
  if(main) main.style.display = 'none';
  if(accPanel){
    accPanel.style.display = 'block';
    // render the current accounts list into the panel
    Settings_renderAccList();
  }
}

// Show Data Panel (When user clicks "Data" button)
function Settings_showData(){
  const main = document.getElementById('settingsMain');
  const acc  = document.getElementById('settingsAccountsPanel');
  const data = document.getElementById('settingsDataPanel');

  if(main) main.style.display = 'none';
  if(acc)  acc.style.display  = 'none';
  if(data) data.style.display = 'block';
}

// Data Panel Buttons

function Data_openSystem(){
  alert(
    "System Import / Export\n\n" +
    "Exporting or importing system data will save or overwrite:\n" +
    "• Accounts\n• Passwords\n• Background\n• JackOS version"
  );

  showDataActions(
    "System",
    "Export or import system data including accounts, passwords, background and version."
  );

  setTimeout(() => {
    const exportBtn = document.getElementById("dataExportBtn");
    const importBtn = document.getElementById("dataImportBtn");

    if(exportBtn) exportBtn.onclick = System_export;
    if(importBtn) importBtn.onclick = System_import;
  }, 0);
}

function Data_openPhotos(){
  alert(
    "Photos Import / Export\n\n" +
    "This lets you back up or restore photos stored inside JackOS.\n" +
    "Photos are handled separately from system data."
  );

  showDataActions(
    "Photos",
    "Export or import photos stored inside JackOS."
  );

  setTimeout(() => {
    const exportBtn = document.getElementById("dataExportBtn");
    const importBtn = document.getElementById("dataImportBtn");

    if (exportBtn) exportBtn.onclick = Photos_exportAll;
    if (importBtn) importBtn.onclick = Photos_importAll;
  }, 0);
}

// ===== Data → Photos → Export =====
async function Photos_exportAll(){
  Admin_require(async () => {
    try{
      // Get OPFS root
      const root = await navigator.storage.getDirectory();

      // Open JackOSDrive/Photos
      const drive = await root.getDirectoryHandle("JackOSDrive");
      const photosDir = await drive.getDirectoryHandle("Photos");

      const files = [];

      for await (const entry of photosDir.values()){
        if(entry.kind === "file"){
          const file = await entry.getFile();
          files.push(file);
        }
      }

      if(files.length === 0){
        alert("No photos found to export.");
        return;
      }

      // iOS / Safari share sheet
      if(navigator.canShare && navigator.canShare({ files })){
        await navigator.share({
          files,
          title: "JackOS Photos"
        });
      } else {
        alert("This browser does not support photo export.");
      }

    } catch(e){
      alert("Photo export failed: " + e.message);
    }
  });
}
// ===== Data → Photos → Import =====
function Photos_importAll(){
  const input = document.getElementById("photosInput");
  if(!input){
    alert("Photos import is unavailable.");
    return;
  }
  input.click();
}
function Data_openDrive(){
  alert(
    "JackOSDrive Import / Export\n\n" +
    "Importing Drive will only add files to the drive.\n" +
    "Exporting will export the JackOSDrive files."
  );

  showDataActions(
    "JackOSDrive",
    "Importing Drive will only add files to the drive. Exporting will export the JackOSDrive files."
  );

  setTimeout(() => {
    const exportBtn = document.getElementById("dataExportBtn");
    const importBtn = document.getElementById("dataImportBtn");

    if (exportBtn) exportBtn.onclick = Drive_exportAll;
    if (importBtn) importBtn.onclick = Drive_importAll;
  }, 0);
}

// ===== Data -> JackOSDrive -> Import =====

function Drive_importAll(){
  Admin_requireStrict(() => {
    const input = document.getElementById("driveZipInput");
    if (!input) {
      alert("Drive ZIP import is unavailable.");
      return;
    }

    input.value = "";
    input.click();
  });
}




// ===== Data → JackOSDrive → Export (ZIP, admin-gated) =====
async function Drive_exportAll(){
  Admin_requireStrict(async () => {
    try {
      const zip = new JSZip();

      const root = await navigator.storage.getDirectory();
      const drive = await root.getDirectoryHandle("JackOSDrive", { create: true });

      await zipAddDirectory(zip, drive, "JackOSDrive");

      const blob = await zip.generateAsync({ type: "blob" });
      const file = new File([blob], "JackOSDrive.zip", {
        type: "application/zip"
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "JackOSDrive"
        });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      Desktop_showOverlay("JackOSDrive exported ✓");

    } catch (e) {
      alert("Drive export failed: " + e.message);
    }
  });
}
async function zipAddDirectory(zip, dirHandle, path){
  const folder = zip.folder(path);

  for await (const entry of dirHandle.values()){
    if(entry.kind === "file"){
      const file = await entry.getFile();
      folder.file(entry.name, await file.arrayBuffer());
    } else {
      await zipAddDirectory(
        folder,
        entry,
        entry.name
      );
    }
  }
}




async function copyDirRecursive(srcDir, destDir){
  for await (const entry of srcDir.values()){
    if(entry.kind === "file"){
      const file = await entry.getFile();
      const fh = await destDir.getFileHandle(entry.name, { create: true });
      const writable = await fh.createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();
    } else {
      const subDir = await destDir.getDirectoryHandle(entry.name, {
        create: true
      });
      await copyDirRecursive(entry, subDir);
    }
  }
}



// Back to main settings menu from all panels
function Settings_backToMain(){
  const main = document.getElementById('settingsMain');
  const acc  = document.getElementById('settingsAccountsPanel');
  const data = document.getElementById('settingsDataPanel');

  if(acc)  acc.style.display  = 'none';
  if(data) data.style.display = 'none';
  if(main) main.style.display = 'block';
}

// Helper

// ===== Settings → Data actions UI =====
function showDataActions(title, text){
  const box = document.getElementById("dataActions");
  if(!box) return;

  box.innerHTML = `
    <div style="margin-top:10px;">
      <h4 style="margin:0;">${title}</h4>
      <div style="margin:6px 0; font-size:13px; color:#bbb;">
        ${text}
      </div>
      <div class="set-actions" style="margin-top:6px;">
        <button class="explorer-btn" id="dataExportBtn">Export</button>
        <button class="explorer-btn ghost" id="dataImportBtn">Import</button>
      </div>
    </div>
  `;
}

function Settings_open(){ const win=document.getElementById('settingsWin'); if(win){ Settings_renderAccList(); win.style.display='block'; } }
function Settings_close(){ const win=document.getElementById('settingsWin'); if(win){ win.style.display='none'; } }
function Settings_renderAccList(){ const cont=document.getElementById('settingsAccList'); cont.innerHTML=''; const list=Users_all(); if(!list.length){ cont.innerHTML='<div style="opacity:.8;">No accounts yet.</div>'; return; }
  list.forEach(u=>{ const row=document.createElement('div'); row.className='acc-row'; const left=document.createElement('div'); left.innerHTML = `👤 <b>${u.name}</b> <span class="badge ${u.role}">${u.role}</span>`; const btnAdmin=document.createElement('button'); btnAdmin.className='explorer-btn'; btnAdmin.textContent = (u.role==='admin'? 'Admin' : 'Make Admin'); btnAdmin.disabled = (u.role==='admin'); btnAdmin.onclick = ()=> Settings_makeAdmin(u.name);
    const btnPw=document.createElement('button'); btnPw.className='explorer-btn'; btnPw.textContent='Change password'; btnPw.onclick=()=> Settings_changePassword(u.name);
    const btnRm=document.createElement('button'); btnRm.className='explorer-btn danger'; btnRm.textContent='Remove'; btnRm.onclick=()=> Settings_removeAccount(u.name);
    row.appendChild(left); row.appendChild(btnAdmin); row.appendChild(btnPw); row.appendChild(btnRm); cont.appendChild(row); });
}
// Add account
function Settings_addAccountUI(){ Admin_require(()=>{ const dlg=document.getElementById('addAccDialog'); document.getElementById('addAccName').value=''; document.getElementById('addAccPass').value=''; document.getElementById('addAccPass2').value=''; document.getElementById('addAccMsg').textContent=''; dlg.style.display='flex'; }); }
function AddAcc_cancel(){ document.getElementById('addAccDialog').style.display='none'; }
function AddAcc_save(){ const name=(document.getElementById('addAccName').value||'').trim(); const p1=document.getElementById('addAccPass').value||''; const p2=document.getElementById('addAccPass2').value||''; const msg=document.getElementById('addAccMsg'); if(!name){ msg.textContent='Enter a name'; return; } if(!p1){ msg.textContent='Enter a password'; return; } if(p1!==p2){ msg.textContent='Passwords don\'t match'; return; } const list=Users_all(); if(list.find(u=>u.name.toLowerCase()===name.toLowerCase())){ msg.textContent='That name already exists'; return; } list.push({name, pass:p1, role:'user'}); Users_save(list); document.getElementById('addAccDialog').style.display='none'; Settings_renderAccList(); Desktop_showOverlay('Account added ✓'); }
// Change password
let ChgPw_target=null;
function Settings_changePassword(name){ Admin_require(()=>{ ChgPw_target=name; document.getElementById('chgPwUser').value=name; document.getElementById('chgPw1').value=''; document.getElementById('chgPw2').value=''; document.getElementById('chgPwMsg').textContent=''; document.getElementById('chgPwDialog').style.display='flex'; }); }
function ChgPw_cancel(){ ChgPw_target=null; document.getElementById('chgPwDialog').style.display='none'; }
function ChgPw_save(){ const p1=document.getElementById('chgPw1').value||''; const p2=document.getElementById('chgPw2').value||''; const msg=document.getElementById('chgPwMsg'); if(!p1){ msg.textContent='Enter a new password'; return; } if(p1!==p2){ msg.textContent='Passwords don\'t match'; return; } const list=Users_all(); const u=list.find(x=>x.name===ChgPw_target); if(!u){ msg.textContent='User not found'; return; } u.pass=p1; Users_save(list); document.getElementById('chgPwDialog').style.display='none'; Desktop_showOverlay('Password changed ✓'); }
// Remove account (protect last admin)
let RmAcc_target=null;
function Settings_removeAccount(name){ Admin_require(()=>{ RmAcc_target=name; document.getElementById('rmAccMsg').textContent=''; document.getElementById('rmAccText').innerHTML = `Remove account <b>${name}</b>?`; document.getElementById('rmAccDialog').style.display='flex'; }); }
function RmAcc_cancel(){ RmAcc_target=null; document.getElementById('rmAccDialog').style.display='none'; }
function RmAcc_do(){ const list=Users_all(); const idx=list.findIndex(u=>u.name===RmAcc_target); const msg=document.getElementById('rmAccMsg'); if(idx<0){ msg.textContent='User not found'; return; } const target=list[idx]; const adminCount=Users_countAdmins(list); if(target.role==='admin' && adminCount<=1){ msg.textContent='You must keep at least one admin'; return; } list.splice(idx,1); Users_save(list); document.getElementById('rmAccDialog').style.display='none'; Settings_renderAccList(); Desktop_showOverlay('Account removed ✓'); if(currentUser===target.name){ show('login', true); } }
// Make Admin (transfer single admin role)
function Settings_makeAdmin(name){ Admin_require(()=>{ const list=Users_all(); const u=list.find(x=>x.name===name); if(!u){ alert('User not found'); return; } list.forEach(x=> x.role='user'); u.role='admin'; Users_save(list); Settings_renderAccList(); Desktop_showOverlay('Admin changed ✓'); }); }
// ===== Photos app =====
  async function Desktop_openPhotosApp(){ const app=document.getElementById('photosApp'); app.style.display='block'; await Photos_refreshGrid(); }
  function Photos_close(){ document.getElementById('photosApp').style.display='none'; }
  async function Photos_dir(){ const root=await navigator.storage.getDirectory(); const drive=await root.getDirectoryHandle('JackOSDrive', {create:true}); return await drive.getDirectoryHandle('Photos', {create:true}); }
  async function Photos_refreshGrid(){ try{ const grid=document.getElementById('photosBody'); grid.innerHTML=''; const dir=await Photos_dir(); for await(const entry of dir.values()){ if(entry.kind==='file'){ const file=await entry.getFile(); if(file.type && file.type.startsWith('image/')){ const url=URL.createObjectURL(file); const tile=document.createElement('div'); tile.className='photo-tile'; const img=document.createElement('img'); img.src=url; img.onload=()=>URL.revokeObjectURL(url); const actions=document.createElement('div'); actions.className='photo-actions'; const setBtn=document.createElement('button'); setBtn.className='explorer-btn'; setBtn.textContent='Set as background'; setBtn.onclick = ()=> Photos_setWallpaperByName(entry.name); const delBtn=document.createElement('button'); delBtn.className='explorer-btn'; delBtn.style.background='#a83434'; delBtn.textContent='Delete'; delBtn.onclick = ()=> Photos_deleteByName(entry.name); actions.appendChild(setBtn); actions.appendChild(delBtn); tile.appendChild(img); tile.appendChild(actions); grid.appendChild(tile); } } } }catch(e){ alert('Photos error: '+e.message); } }
  async function Photos_deleteByName(name){ try{ const ok=confirm('Delete photo "'+name+'"?'); if(!ok) return; const dir=await Photos_dir(); await dir.removeEntry(name); await Photos_refreshGrid(); Desktop_showOverlay?.('Deleted ✓'); }catch(e){ alert('Delete failed: '+e.message); } }
  async function Photos_setWallpaperByName(name){ try{ const dir=await Photos_dir(); const fh=await dir.getFileHandle(name); const file=await fh.getFile(); const reader=new FileReader(); reader.onload = ()=>{ Desktop_setWallpaperFromData(reader.result); Desktop_hideStartMenu(); }; reader.readAsDataURL(file); }catch(e){ alert('Set background failed: '+e.message); } }
  ready(()=>{ const input=document.getElementById('photosInput'); if(input){ input.addEventListener('change', async (e)=>{ const files=[...e.target.files||[]]; if(!files.length) return; try{ const dir=await Photos_dir(); for(const f of files){ const fh=await dir.getFileHandle(f.name, {create:true}); const w=await fh.createWritable(); await w.write(new Uint8Array(await f.arrayBuffer())); await w.close(); } await Photos_refreshGrid(); alert('Imported '+files.length+' photo(s)'); }catch(err){ alert('Import failed: '+err.message); } finally { input.value=''; } }); } });
// ===== Explorer (OPFS) =====
const ExplorerState={ files:[], driveRoot:null, driveCwd:null, cwdPath:[], selectedIndex:-1, multi:false, multiSet:new Set(), mode:'read' };
function Explorer_open(){ document.getElementById('explorer').style.display='block'; if(!ExplorerState.driveRoot) Explorer_openJackOSDrive(); }
function Explorer_close(){ document.getElementById('explorer').style.display='none'; Explorer_clearPreview(); Explorer_clearMulti(); }
function Explorer_setSelection(idx){ ExplorerState.selectedIndex=idx; const sel=ExplorerState.files[idx]; const inDrive=!!ExplorerState.driveCwd; document.getElementById('delete-btn').style.display=inDrive?'inline-block':'none'; document.getElementById('rename-btn').style.display=inDrive&&sel?'inline-block':'none'; const isFile=sel&&sel.kind==='file'; document.getElementById('move-btn').style.display=inDrive&&sel?'inline-block':'none'; document.getElementById('dup-btn').style.display=inDrive&&isFile?'inline-block':'none'; document.getElementById('save-to-drive-btn').style.display=(idx>=0)?'inline-block':'none'; document.getElementById('export-btn').style.display=inDrive&&isFile?'inline-block':'none'; }
function Explorer_renderList(){ const ul=document.getElementById('explorer-list'); ul.classList.toggle('multi', ExplorerState.multi); ul.innerHTML=''; ExplorerState.files.forEach((f,i)=>{ const li=document.createElement('li'); li.dataset.idx=i; const cb=document.createElement('input'); cb.type='checkbox'; cb.className='selbox'; cb.checked=ExplorerState.multiSet.has(i); cb.addEventListener('click', (e)=>{ e.stopPropagation(); Explorer_toggleItem(i); }); const tag=f.kind==='directory'? '<span class="tag">[DIR]</span>':''; const name=document.createElement('div'); name.className='namewrap'; name.innerHTML=`${tag}${f.name}`; const path=document.createElement('div'); path.style.cssText='color:#9dd0ff;font-family:ui-monospace,Menlo,monospace;font-size:12px;'; path.textContent=f.path||''; li.appendChild(cb); li.appendChild(name); li.appendChild(path); if(ExplorerState.multi){ li.addEventListener('click', ()=>Explorer_toggleItem(i)); } else { li.addEventListener('click', ()=>{ Explorer_setSelection(i); Explorer_showEntry(f); }); if(f.kind==='directory') li.ondblclick=()=>Explorer_enterFolder(i); } if(ExplorerState.multiSet.has(i)) li.classList.add('selected'); ul.appendChild(li); }); Explorer_updateMultiBar(); }
function Explorer_clearPreview(){ document.getElementById('explorer-info').textContent=''; document.querySelectorAll('#explorer .preview img').forEach(img=>img.remove()); document.getElementById('explorer-preview').style.display='none'; document.getElementById('explorer-editor').style.display='none'; document.getElementById('save-btn').style.display='none'; document.getElementById('set-wallpaper-btn').style.display='none'; }
async function Explorer_openJackOSDrive(){ try{ const root=await navigator.storage.getDirectory(); ExplorerState.driveRoot=await root.getDirectoryHandle('JackOSDrive', {create:true}); ExplorerState.driveCwd=ExplorerState.driveRoot; ExplorerState.cwdPath=[]; await Explorer_listDriveCwd(); }catch(e){ alert('OPFS unavailable: '+e.message); } }
async function Explorer_listDriveCwd(){ const arr=[]; for await(const entry of ExplorerState.driveCwd.values()){ if(entry.kind==='file'){ const f=await entry.getFile(); arr.push({name:entry.name, path:[...ExplorerState.cwdPath, entry.name].join('/'), file:f, handle:entry, kind:'file'}); } else { arr.push({name:entry.name, path:[...ExplorerState.cwdPath, entry.name].join('/')+'/', handle:entry, kind:'directory'}); } } arr.sort((a,b)=> (a.kind===b.kind? a.name.localeCompare(b.name) : (a.kind==='directory'?-1:1))); ExplorerState.files=arr; Explorer_renderList(); Explorer_renderBreadcrumb(); document.getElementById('explorer-info').textContent=`JackOS Drive: ${arr.length} item(s)`; }
function Explorer_renderBreadcrumb(){ const bc=document.getElementById('explorer-breadcrumb'); const parts=['JackOSDrive', ...ExplorerState.cwdPath]; bc.innerHTML=parts.map((p,i)=>`<span onclick=\"Explorer_breadcrumbClick(${i})\">${p}</span>`).join(' / '); }
async function Explorer_breadcrumbClick(i){ if(i===0){ ExplorerState.driveCwd=ExplorerState.driveRoot; ExplorerState.cwdPath=[]; await Explorer_listDriveCwd(); return; } let dir=ExplorerState.driveRoot; for(let d=1; d<=i; d++){ dir=await dir.getDirectoryHandle(ExplorerState.cwdPath[d-1]); } ExplorerState.driveCwd=dir; ExplorerState.cwdPath=ExplorerState.cwdPath.slice(0,i); await Explorer_listDriveCwd(); }
async function Explorer_enterFolder(idx){ const e=ExplorerState.files[idx]; if(e.kind!=='directory') return; ExplorerState.driveCwd=e.handle; ExplorerState.cwdPath.push(e.name); await Explorer_listDriveCwd(); }
async function Explorer_showEntry(entry){ Explorer_clearPreview(); const info=document.getElementById('explorer-info'); const pre=document.getElementById('explorer-preview'); const editor=document.getElementById('explorer-editor'); const pane=document.querySelector('#explorer .preview'); const setBtn=document.getElementById('set-wallpaper-btn'); if(entry.kind==='directory'){ info.textContent=`Folder: ${entry.path}`; return; } info.textContent=`${entry.path} (${entry.file.type||'unknown'})`; const isImage=entry.file.type && entry.file.type.startsWith('image/'); const isText=/\.(txt|md|json|css|html|js|csv|log)$/i.test(entry.name); if(isImage){ const url=URL.createObjectURL(entry.file); const img=document.createElement('img'); img.src=url; pane.insertBefore(img, pre); img.onload=()=>URL.revokeObjectURL(url); if(setBtn){ setBtn.style.display='inline-block'; } } if(isText){ const text=await entry.file.text(); editor.value=text||''; editor.style.display='block'; document.getElementById('save-btn').style.display='inline-block'; } }
async function Explorer_setWallpaperSelected(){ const idx=ExplorerState.selectedIndex; if(idx<0) return; const entry=ExplorerState.files[idx]; if(!entry || entry.kind!=='file' || !(entry.file.type||'').startsWith('image/')){ alert('Select an image file.'); return; } try{ const reader=new FileReader(); reader.onload = ()=>{ Desktop_setWallpaperFromData(reader.result); Desktop_hideStartMenu(); }; reader.readAsDataURL(entry.file); }catch(e){ alert('Set background failed: '+e.message); } }
async function Explorer_deleteSelected(){ try{ if(!ExplorerState.driveCwd){ alert('Delete is only in JackOS Drive.'); return; } const idx=ExplorerState.selectedIndex; if(idx<0){ alert('Select an item first.'); return; } const entry=ExplorerState.files[idx]; const ok=confirm(`Delete ${entry.kind==='directory'?'folder':'file'} "${entry.name}"?`); if(!ok) return; await ExplorerState.driveCwd.removeEntry(entry.name, {recursive: entry.kind==='directory'}); await Explorer_listDriveCwd(); Explorer_clearPreview(); alert('Deleted ✓'); }catch(e){ alert('Delete failed: '+e.message); } }
async function Explorer_rename(){ try{ if(!ExplorerState.driveCwd){ alert('Rename only works in JackOS Drive.'); return; } const idx=ExplorerState.selectedIndex; if(idx<0){ alert('Select an item first.'); return; } const entry=ExplorerState.files[idx]; const oldName=entry.name; let newName=prompt('Rename to:', oldName); if(!newName) return; newName=newName.trim(); if(!newName || newName===oldName || newName.includes('/')||newName==='.'||newName==='..'){ return; } const existsFile=await Explorer_existsFile(ExplorerState.driveCwd,newName); const existsDir=await Explorer_existsDir(ExplorerState.driveCwd,newName); if(entry.kind==='file'){ if(existsDir){ alert('A folder with that name exists.'); return;} if(existsFile){ const ok=confirm('A file with that name exists. Overwrite it?'); if(!ok) return; } await Explorer_copyFileHandleToDir(entry.handle, ExplorerState.driveCwd, newName); await ExplorerState.driveCwd.removeEntry(oldName); } else { if(existsFile){ alert('A file with that name exists.'); return;} if(existsDir){ const ok=confirm('A folder with that name exists. Merge/overwrite?'); if(!ok) return; } const newDir=await ExplorerState.driveCwd.getDirectoryHandle(newName,{create:true}); await Explorer_copyDirectoryRecursive(entry.handle,newDir); await ExplorerState.driveCwd.removeEntry(oldName,{recursive:true}); } await Explorer_listDriveCwd(); const idx2=ExplorerState.files.findIndex(f=>f.name===newName && f.kind===entry.kind); if(idx2>=0) Explorer_setSelection(idx2); alert('Renamed ✓'); }catch(e){ alert('Rename failed: '+e.message); } }
async function Explorer_exportSelected(){ try{ const idx=ExplorerState.selectedIndex; if(idx<0){ alert('Select a file first.'); return; } const entry=ExplorerState.files[idx]; if(entry.kind!=='file'){ alert('Export folders not supported yet.'); return; } await Export_files([entry]); }catch(e){ if(e && e.name==='AbortError') return; alert('Export failed: '+e.message); } }
async function Explorer_save(){ const idx=ExplorerState.selectedIndex; if(idx<0){ alert('Select a file first.'); return;} const entry=ExplorerState.selectedIndex>=0?ExplorerState.files[ExplorerState.selectedIndex]:null; if(!entry || !entry.handle || entry.kind!=='file'){ alert('Open a file from JackOS Drive to save.'); return; } try{ const w=await entry.handle.createWritable(); await w.write(document.getElementById('explorer-editor').value||''); await w.close(); alert('Saved to JackOS Drive ✓'); }catch(e){ alert('Save failed: '+e.message); } }
function Explorer_toggleMulti(){ ExplorerState.multi = !ExplorerState.multi; if(!ExplorerState.multi) ExplorerState.multiSet.clear(); document.getElementById('multiToggle').textContent = ExplorerState.multi? 'Cancel' : 'Select'; Explorer_renderList(); Explorer_updateMultiBar(); }
function Explorer_toggleItem(i){ if(ExplorerState.multiSet.has(i)) ExplorerState.multiSet.delete(i); else ExplorerState.multiSet.add(i); Explorer_renderList(); }
function Explorer_clearMulti(){ ExplorerState.multiSet.clear(); Explorer_renderList(); }
function Explorer_selectedEntries(){ return [...ExplorerState.multiSet].map(i=>ExplorerState.files[i]).filter(Boolean); }
function Explorer_updateMultiBar(){ const bar=document.getElementById('multiBar'); const n=ExplorerState.multiSet.size; if(ExplorerState.multi){ bar.classList.add('show'); } else { bar.classList.remove('show'); } document.getElementById('multiCount').textContent = n+ ' selected'; }
async function Explorer_manyDelete(){ try{ const entries=Explorer_selectedEntries(); if(!entries.length){ alert('Select items first.'); return; } const ok=confirm('Delete '+entries.length+' item(s)?'); if(!ok) return; for(const e of entries){ await ExplorerState.driveCwd.removeEntry(e.name, {recursive: e.kind==='directory'}); } await Explorer_listDriveCwd(); Explorer_clearMulti(); alert('Deleted '+entries.length+' ✓'); }catch(e){ alert('Delete failed: '+e.message); } }
async function Explorer_manyMove(){ const entries=Explorer_selectedEntries(); if(!entries.length){ alert('Select items first.'); return; } Explorer_openDestDialog('move-many'); }
async function Explorer_manyDuplicate(){ const entries=Explorer_selectedEntries(); if(!entries.length){ alert('Select items first.'); return; } Explorer_openDestDialog('duplicate-many'); }
async function Explorer_manyExport(){ const entries=Explorer_selectedEntries().filter(e=>e.kind==='file'); if(!entries.length){ alert('Select file(s) first.'); return; } try{ await Export_files(entries); }catch(e){ alert('Export failed: '+e.message); } }
const DestState={ mode:null, destRoot:null, destCwd:null, destPath:[], sourceEntry:null };
async function Explorer_openDestDialog(mode){ if(!ExplorerState.driveRoot){ await Explorer_openJackOSDrive(); if(!ExplorerState.driveRoot) return; } DestState.mode=mode; DestState.destRoot=ExplorerState.driveRoot; DestState.destCwd=ExplorerState.driveRoot; DestState.destPath=[]; const idx=ExplorerState.selectedIndex; DestState.sourceEntry = (mode==='move'||mode==='duplicate')? (idx>=0? ExplorerState.files[idx] : null) : null; const title=document.getElementById('destTitle'); const nameWrap=document.getElementById('destNameWrap'); if(mode==='move'){ title.textContent='Move to folder'; nameWrap.style.display='none'; } else if(mode==='duplicate'){ title.textContent='Duplicate to folder'; nameWrap.style.display='none'; } else if(mode==='move-many'){ title.textContent='Move selected to folder'; nameWrap.style.display='none'; } else if(mode==='duplicate-many'){ title.textContent='Duplicate selected to folder'; nameWrap.style.display='none'; } else { title.textContent='Save to JackOS Drive'; nameWrap.style.display='flex'; document.getElementById('destName').value = suggestSaveName(); }
  document.getElementById('destDialog').style.display='flex'; await Explorer_destList(); Explorer_destRenderBreadcrumb(); }
function Explorer_closeDest(){ document.getElementById('destDialog').style.display='none'; }
function Explorer_destRenderBreadcrumb(){ const bc=document.getElementById('destCrumbs'); const parts=['JackOSDrive', ...DestState.destPath]; bc.innerHTML=parts.map((p,i)=>`<span onclick=\"Explorer_destCrumb(${i})\">${p}</span>`).join(' / '); }
async function Explorer_destCrumb(i){ if(i===0){ DestState.destCwd=DestState.destRoot; DestState.destPath=[]; } else { let d=DestState.destRoot; for(let k=1;k<=i;k++){ d=await d.getDirectoryHandle(DestState.destPath[k-1]); } DestState.destCwd=d; DestState.destPath=DestState.destPath.slice(0,i); } await Explorer_destList(); Explorer_destRenderBreadcrumb(); }
async function Explorer_destList(){ const list=document.getElementById('destList'); list.innerHTML=''; for await(const entry of DestState.destCwd.values()){ if(entry.kind==='directory'){ const row=document.createElement('div'); row.textContent = entry.name + '/'; row.onclick = async()=>{ DestState.destCwd = entry; DestState.destPath.push(entry.name); await Explorer_destList(); Explorer_destRenderBreadcrumb(); }; list.appendChild(row); } } }
async function Explorer_destNewFolder(){ const name=prompt('New folder name:'); if(!name) return; await DestState.destCwd.getDirectoryHandle(name, {create:true}); await Explorer_destList(); }
async function Explorer_confirmDest(){ try{ const mode=DestState.mode; const destDir=DestState.destCwd; if(mode==='move'){ const src=DestState.sourceEntry; await Explorer_moveOne(src, destDir); } else if(mode==='duplicate'){ const src=DestState.sourceEntry; await Explorer_duplicateOne(src, destDir); } else if(mode==='move-many'){ const list=Explorer_selectedEntries(); for(const src of list){ await Explorer_moveOne(src, destDir); } Explorer_clearMulti(); } else if(mode==='duplicate-many'){ const list=Explorer_selectedEntries(); for(const src of list){ await Explorer_duplicateOne(src, destDir); } Explorer_clearMulti(); } else { const filename=document.getElementById('destName').value.trim()||'untitled.txt'; await Explorer_saveAsToDir(destDir, filename); } await Explorer_listDriveCwd(); Explorer_closeDest(); Desktop_showOverlay('Operation complete ✓'); }catch(e){ alert('Operation failed: '+e.message); } }
async function Explorer_moveOne(src, destDir){ if(!src) return; if(src.kind==='file'){ await Explorer_copyFileHandleToDir(src.handle, destDir, src.name); await ExplorerState.driveCwd.removeEntry(src.name); } else { const newDir=await destDir.getDirectoryHandle(src.name,{create:true}); await Explorer_copyDirectoryRecursive(src.handle, newDir); await ExplorerState.driveCwd.removeEntry(src.name, {recursive:true}); } }
async function Explorer_duplicateOne(src, destDir){ if(!src) return; if(src.kind==='file'){ const target = await Explorer_uniqueName(destDir, src.name); await Explorer_copyFileHandleToDir(src.handle, destDir, target); } else { const targetBase = await Explorer_uniqueName(destDir, src.name.replace(/\/$/, '')); const newDir=await destDir.getDirectoryHandle(targetBase, {create:true}); await Explorer_copyDirectoryRecursive(src.handle, newDir); } }
async function Explorer_uniqueName(dir, base){ let name=base; let i=1; const dot=base.lastIndexOf('.'); const stem = dot>0? base.slice(0,dot):base; const ext = dot>0? base.slice(dot):''; while(await Explorer_existsAny(dir, name)){ name = stem + ' ('+i+')' + ext; i++; if(i>9999) break; } return name; }
async function Explorer_existsAny(dir, name){ try{ await dir.getFileHandle(name); return true; }catch(e){} try{ await dir.getDirectoryHandle(name); return true; }catch(e){} return false; }
async function Explorer_copyFileHandleToDir(fileHandle, destDir, targetName){ const w=await (await destDir.getFileHandle(targetName, {create:true})).createWritable(); const file=await fileHandle.getFile(); await w.write(new Uint8Array(await file.arrayBuffer())); await w.close(); }
async function Explorer_copyDirectoryRecursive(srcDirHandle, destDirHandle){ for await(const entry of srcDirHandle.values()){ if(entry.kind==='file'){ await Explorer_copyFileHandleToDir(entry, destDirHandle, entry.name); } else { const sub=await destDirHandle.getDirectoryHandle(entry.name, {create:true}); await Explorer_copyDirectoryRecursive(entry, sub); } } }
async function Explorer_existsFile(dir, name){ try{ await dir.getFileHandle(name); return true; }catch(e){ return false; } }
async function Explorer_existsDir(dir, name){ try{ await dir.getDirectoryHandle(name); return true; }catch(e){ return false; } }
function suggestSaveName(){ const idx=ExplorerState.selectedIndex; if(idx>=0) return ExplorerState.files[idx].name; return 'untitled.txt'; }
async function Explorer_saveAsToDir(destDir, filename){ const idx=ExplorerState.selectedIndex; if(idx>=0){ const entry=ExplorerState.files[idx]; if(entry.kind==='file'){ const w=await (await destDir.getFileHandle(filename, {create:true})).createWritable(); await w.write(new Uint8Array(await entry.file.arrayBuffer())); await w.close(); return; } } const fh=await destDir.getFileHandle(filename, {create:true}); const w=await fh.createWritable(); await w.write(''); await w.close(); }
ready(()=>{ const input=document.getElementById('importInput'); if(input){ input.addEventListener('change', async (e)=>{ const files=[...e.target.files||[]]; if(!files.length) return; try{ if(!ExplorerState.driveCwd){ await Explorer_openJackOSDrive(); } for(const f of files){ const fh=await ExplorerState.driveCwd.getFileHandle(f.name, {create:true}); const w=await fh.createWritable(); await w.write(new Uint8Array(await f.arrayBuffer())); await w.close(); } await Explorer_listDriveCwd(); alert('Imported '+files.length+' file(s)'); }catch(err){ alert('Import failed: '+err.message); } finally { input.value=''; } }); } });
// ===== Export helper =====
async function Export_files(entries){ try{ const blobs = await Promise.all(entries.map(async e=> new File([await e.file.arrayBuffer()], e.name, {type: e.file.type || 'application/octet-stream'}))); if(blobs.length===1){ if('showSaveFilePicker' in window){ try{ const f=blobs[0]; const ext=(f.name.split('.').pop()||'dat'); const types=f.type?[{description:f.type, accept:{[f.type]:['.'+ext]}}]:undefined; const handle=await window.showSaveFilePicker({suggestedName:f.name, types}); const w=await handle.createWritable(); await w.write(await f.arrayBuffer()); await w.close(); Desktop_showOverlay('Exported ✓'); return; }catch(e){ if(e && e.name==='AbortError') return; } } if(navigator.canShare && navigator.canShare({files:blobs})) { try{ await navigator.share({files:blobs, title: blobs[0].name}); Desktop_showOverlay('Shared ✓'); return; }catch(e){} } const url=URL.createObjectURL(blobs[0]); const a=document.createElement('a'); a.href=url; a.download=blobs[0].name; document.body.append(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },1000); Desktop_showOverlay('Exported ✓'); return; } else { alert('Multi-file ZIP export trimmed in this build. Select one file.'); } }catch(e){ alert('Export failed: '+e.message); } }
// ===== Browser =====
const BROWSER_HOME = localStorage.getItem('jackosBrowserHome') || 'purplemash.com';
const browserState = { history: [], index: -1, frame: null, urlInput: null, fb: null, win: null };
function Browser_open(){ const win=document.getElementById('browserWin'); const frame=document.getElementById('browserFrame'); const fb=document.getElementById('browserFallback'); const url=document.getElementById('browserUrl'); browserState.frame=frame; browserState.urlInput=url; browserState.fb=fb; browserState.win=win; fb.style.display='none'; frame.src='about:blank'; win.style.display='block'; url.value = BROWSER_HOME; setTimeout(()=> Browser_navigate(url.value), 30); }
function Browser_sanitize(u){ u=(u||'').trim(); if(!u) return ''; if(!/^https?:\/_\/_\//i.test(u)){ if(/^[\w.-]+\.[A-Za-z]{2,}/.test(u)) return 'https://'+u; return 'https://www.google.com/search?q='+ encodeURIComponent(u); } return u; }
function Browser_navigate(u){ const url=Browser_sanitize(u); if(!url) return; browserState.fb.style.display='none'; browserState.frame.src='about:blank'; setTimeout(()=>{ try{ browserState.frame.src=url; }catch(e){} browserState.history = browserState.history.slice(0, browserState.index+1); browserState.history.push(url); browserState.index = browserState.history.length-1; browserState.urlInput.value=url; setTimeout(Browser_checkFallback, 1200); }, 10); }

function Browser_go(){ Browser_navigate(browserState.urlInput.value); }
function Browser_back(){ if(browserState.index>0){ browserState.index--; const u=browserState.history[browserState.index]; browserState.urlInput.value=u; Browser_navigate(u); } }
function Browser_forward(){ if(browserState.index<browserState.history.length-1){ browserState.index++; const u=browserState.history[browserState.index]; browserState.urlInput.value=u; Browser_navigate(u); } }
function Browser_refresh(){ if(browserState.index>=0){ Browser_navigate(browserState.history[browserState.index]); } }
function Browser_openExt(){ const u=browserState.urlInput.value||BROWSER_HOME; try{ window.open(u,'_blank','noopener'); }catch(e){} }
ready(()=>{ const q=(id)=>document.getElementById(id); q('browserBack').onclick=Browser_back; q('browserFwd').onclick=Browser_forward; q('browserRefresh').onclick=Browser_refresh; q('browserGo').onclick=Browser_go; q('browserOpenExt').onclick=Browser_openExt; q('browserOpenExt2').onclick=Browser_openExt; q('browserClose').onclick=()=>{ const w=document.getElementById('browserWin'); const f=document.getElementById('browserFrame'); if(w) w.style.display='none'; if(f) f.src='about:blank'; }; const url=q('browserUrl'); if(url){ url.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); Browser_go(); }}); } });
// ===== Calculator =====
const CalculatorState = { current: '0', prev: null, op: null, justEval: false };
function Calculator_open(){ const win=document.getElementById('calcApp'); if(win){ win.style.display='block'; } Calculator_render(); }
function Calculator_close(){ const win=document.getElementById('calcApp'); if(win){ win.style.display='none'; } }
function Calculator_displayEl(){ return document.getElementById('calcDisplay'); }
function Calculator_render(){ const el=Calculator_displayEl(); if(!el) return; el.textContent = CalculatorState.current; }
function Calculator_inputDigit(d){ if(CalculatorState.justEval){ CalculatorState.current='0'; CalculatorState.justEval=false; } if(CalculatorState.current==='0' && d!=='.'){ CalculatorState.current=String(d); } else { CalculatorState.current += String(d); } }
function Calculator_inputDot(){ if(CalculatorState.justEval){ CalculatorState.current='0'; CalculatorState.justEval=false; } if(!CalculatorState.current.includes('.')){ CalculatorState.current += '.'; } }
function Calculator_setOp(op){ if(CalculatorState.op && CalculatorState.prev!==null){ Calculator_compute(); CalculatorState.prev = parseFloat(CalculatorState.current); CalculatorState.justEval=false; } else { CalculatorState.prev = parseFloat(CalculatorState.current); } CalculatorState.op = op; CalculatorState.current='0'; }
function Calculator_compute(){ const a=CalculatorState.prev; const b=parseFloat(CalculatorState.current); let r=a; switch(CalculatorState.op){ case '+': r=a+b; break; case '-': r=a-b; break; case '×': case '*': r=a*b; break; case '÷': case '/': r = (b===0)? NaN : (a/b); break; default: r=b; } CalculatorState.current = (isFinite(r)? String(r) : 'Error'); CalculatorState.prev = null; CalculatorState.op = null; CalculatorState.justEval = true; }
function Calculator_clear(){ CalculatorState.current='0'; CalculatorState.prev=null; CalculatorState.op=null; CalculatorState.justEval=false; }
function Calculator_backspace(){ if(CalculatorState.justEval){ CalculatorState.current='0'; CalculatorState.justEval=false; return; } if(CalculatorState.current.length>1){ CalculatorState.current = CalculatorState.current.slice(0,-1); } else { CalculatorState.current='0'; } }
function Calculator_toggleSign(){ if(CalculatorState.current.startsWith('-')){ CalculatorState.current = CalculatorState.current.slice(1); } else if(CalculatorState.current!=='0'){ CalculatorState.current = '-' + CalculatorState.current; } }
function Calculator_percent(){ const v=parseFloat(CalculatorState.current||'0'); CalculatorState.current = String(v/100); }
ready(()=>{
  const grid=document.getElementById('calcGrid'); if(grid){ grid.addEventListener('click', (e)=>{ const btn=e.target.closest('button[data-key]'); if(!btn) return; const k=btn.dataset.key; if(/^[0-9]$/.test(k)){ Calculator_inputDigit(k); } else if(k==='.'){ Calculator_inputDot(); } else if(k==='+'||k==='-'||k==='×'||k==='÷'){ Calculator_setOp(k); } else if(k==='='){ Calculator_compute(); } else if(k==='C'){ Calculator_clear(); } else if(k==='back'){ Calculator_backspace(); } else if(k==='±'){ Calculator_toggleSign(); } else if(k==='%'){ Calculator_percent(); } Calculator_render(); }); }
  document.addEventListener('keydown', (e)=>{ const win=document.getElementById('calcApp'); if(!win || win.style.display==='none') return; const key=e.key; if(/^[0-9]$/.test(key)){ Calculator_inputDigit(key); } else if(key==='.'||key===','){ Calculator_inputDot(); } else if(key==='+'||key==='-'||key==='*'||key==='x'||key==='X'||key==='×'){ Calculator_setOp('+'.includes(key)? '+' : (key==='-'? '-' : (key==='*'||key==='x'||key==='X'||key==='×'? '×' : key))); } else if(key==='/'||key==='÷'){ Calculator_setOp('÷'); } else if(key==='Enter'||key==='='){ e.preventDefault(); Calculator_compute(); } else if(key==='Backspace'){ Calculator_backspace(); } else if(key.toLowerCase()==='c'){ Calculator_clear(); } Calculator_render(); });
});
// ===== JCam (camera) =====
  const JCamState = { stream:null, facing:null, video:null, canvas:null };
  function JCam_status(msg){ try{ const s=document.getElementById('jcamStatus'); if(s) s.textContent=msg||''; }catch(e){} }
  function JCam_httpsOkay(){ try{ return location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1'; }catch(e){ return false; } }
  function JCam_mediaSupported(){ try{ return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }catch(e){ return false; } }
  function JCam_buildConstraints(facing){ return { video:{ facingMode: facing? {ideal:facing}:undefined, width:{ideal:1920}, height:{ideal:1080} }, audio:false }; }
  function JCam_applyMirror(){ try{ if(!JCamState.video) return; JCamState.video.style.transform = (JCamState.facing==='user')? 'scaleX(-1)' : ''; }catch(e){} }
  function JCam_fit(){ try{ const app=document.getElementById('jcamApp'); if(!app) return; const maxH=Math.max(320,(window.visualViewport?.height||window.innerHeight)-8); const h=app.getBoundingClientRect().height; if(h>maxH){ app.style.height=Math.max(320,maxH)+'px'; } else { app.style.height=''; } }catch(e){} }
  window.addEventListener('resize', JCam_fit); window.addEventListener('orientationchange', JCam_fit);
  async function JCam_open(){ try{ const win=document.getElementById('jcamApp'); if(!win) return; JCamState.video=document.getElementById('jcamVideo')||null; JCamState.canvas=document.getElementById('jcamCanvas')||null; const saveBtn=document.getElementById('jcamSaveBtn'); const retakeBtn=document.getElementById('jcamRetakeBtn'); const shutter=document.getElementById('jcamShutterBtn'); if(saveBtn) saveBtn.style.display='none'; if(retakeBtn) retakeBtn.style.display='none'; if(shutter) shutter.style.display='inline-block'; const flip=document.getElementById('jcamFlipBtn'); if(flip) flip.disabled=false; if(!JCamState.facing){ try{ JCamState.facing=localStorage.getItem('jackosCameraFacing')||'user'; }catch(e){ JCamState.facing='user'; } } win.style.display='block'; JCam_status('Opening camera…'); JCam_fit(); if(!JCam_httpsOkay()){ JCam_status('Camera requires HTTPS or localhost'); return; } if(!JCam_mediaSupported()){ JCam_status('Camera not supported on this browser'); return; } await JCam_start(); } catch(err){ console.warn('JCam_open error', err); JCam_status('Unable to open: '+(err?.message||String(err))); } }
  async function JCam_close(){ try{ await JCam_stop(); }catch(e){} try{ const win=document.getElementById('jcamApp'); if(win) win.style.display='none'; }catch(e){} }
  async function JCam_start(){ const tryLists=[ JCam_buildConstraints(JCamState.facing), {video:true,audio:false}, {video:{facingMode:JCamState.facing},audio:false} ]; await JCam_stop().catch(()=>{}); for(let i=0;i<tryLists.length;i++){ try{ const stream=await navigator.mediaDevices.getUserMedia(tryLists[i]); JCamState.stream=stream; if(JCamState.video){ JCamState.video.srcObject=stream; try{ await JCamState.video.play(); }catch(e){} await new Promise(res=>{ let d=false; const done=()=>{ if(!d){ d=true; res(); } }; if(JCamState.video) JCamState.video.onloadedmetadata=done; setTimeout(done,500); }); JCam_applyMirror(); JCam_fit(); } JCam_status('Camera ready'); return; }catch(err){ console.warn('JCam_start attempt',i+1,'failed:', err?.message||err); } } if(!JCam_httpsOkay()) JCam_status('Camera requires HTTPS or localhost'); else JCam_status('Unable to open camera on this device/browser'); }
  async function JCam_stop(){ try{ if(JCamState.stream){ for(const t of JCamState.stream.getTracks()){ try{ t.stop(); }catch(e){} } } }catch(e){} finally{ JCamState.stream=null; try{ if(JCamState.video) JCamState.video.srcObject=null; }catch(e){} } }
  function JCam_flip(){ try{ JCamState.facing = (JCamState.facing==='environment')? 'user':'environment'; try{ localStorage.setItem('jackosCameraFacing', JCamState.facing); }catch(e){} JCam_start(); }catch(e){ console.warn('JCam_flip error', e); JCam_status('Flip failed'); } }
  function JCam_shoot(){ try{ const v=JCamState.video, c=JCamState.canvas; if(!v||!c) return; const w=v.videoWidth||v.clientWidth||1280, h=v.videoHeight||v.clientHeight||720; c.width=w; c.height=h; const ctx=c.getContext('2d'); ctx.save(); if(JCamState.facing==='user'){ ctx.translate(w,0); ctx.scale(-1,1); } ctx.drawImage(v,0,0,w,h); ctx.restore(); v.style.display='none'; c.style.display='block'; const saveBtn=document.getElementById('jcamSaveBtn'); const retakeBtn=document.getElementById('jcamRetakeBtn'); const shutter=document.getElementById('jcamShutterBtn'); if(saveBtn) saveBtn.style.display='inline-block'; if(retakeBtn) retakeBtn.style.display='inline-block'; if(shutter) shutter.style.display='none'; JCam_status('Preview • Ready to save'); JCam_fit(); }catch(e){ console.warn('JCam_shoot error', e); JCam_status('Failed to capture: '+(e?.message||String(e))); } }
  function JCam_retake(){ try{ const v=JCamState.video, c=JCamState.canvas; if(!v||!c) return; c.style.display='none'; v.style.display='block'; JCam_applyMirror(); const saveBtn=document.getElementById('jcamSaveBtn'); const retakeBtn=document.getElementById('jcamRetakeBtn'); const shutter=document.getElementById('jcamShutterBtn'); if(saveBtn) saveBtn.style.display='none'; if(retakeBtn) retakeBtn.style.display='none'; if(shutter) shutter.style.display='inline-block'; JCam_status('Ready'); JCam_fit(); }catch(e){} }
  function JCam_canvasToBlob(canvas,type='image/png',quality=0.92){ return new Promise((resolve,reject)=>{ try{ if(typeof canvas.toBlob==='function'){ canvas.toBlob(b=>resolve(b),type,quality); } else { const dataURL=canvas.toDataURL(type,quality); const arr=dataURL.split(','); const mime=(arr[0].match(/:(.*?);/)||[])[1]||'image/png'; const bstr=atob(arr[1]||''); let n=bstr.length; const u8=new Uint8Array(n); while(n--) u8[n]=bstr.charCodeAt(n); resolve(new Blob([u8],{type:mime})); } }catch(e){ reject(e); } }); }
  function JCam_ts(){ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`; }
  async function JCam_uniqueName(dir, base){ let name=base, i=1; const dot=base.lastIndexOf('.'); const stem=dot>0? base.slice(0,dot):base; const ext=dot>0? base.slice(dot):''; while(true){ try{ await dir.getFileHandle(name); name=`${stem} (${i})${ext}`; i++; if(i>9999) break; }catch(e){ break; } } return name; }
  async function JCam_save(){ try{ const c=JCamState.canvas; if(!c) return; const blob=await JCam_canvasToBlob(c,'image/png',0.92); const hasOPFS=!!(navigator.storage && navigator.storage.getDirectory); if(!hasOPFS || typeof Photos_dir!=='function'){ const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`Photo ${JCam_ts()}.png`; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },1000); Desktop_showOverlay?.('Saved (downloaded) ✓'); JCam_retake(); return; } const dir=await Photos_dir(); const baseName=`Photo ${JCam_ts()}.png`; const name=await JCam_uniqueName(dir, baseName); const fh=await dir.getFileHandle(name,{create:true}); const w=await fh.createWritable(); await w.write(blob); await w.close(); Desktop_showOverlay?.('Saved to Photos ✓'); try{ await Photos_refreshGrid(); }catch(e){} JCam_retake(); }catch(e){ console.warn('JCam_save error', e); alert('Save failed: '+(e?.message||String(e))); } }


// Security questions
window.SecQ_setupLater = function(){ 
  const d = document.getElementById('secqSetupDialog'); 
  if(d) d.style.display = 'none';
  // Clear the form for next account
  ['sqs_p1','sqs_p2','sqs_p3','sqs_a1','sqs_a2','sqs_a3'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const m = document.getElementById('sqs_msg'); if(m) m.textContent='';
  // Move to next account
  setTimeout(() => Setup_nextAccount(), 100);
}

window.SecQ_setupSave = function(){
  const d = document.getElementById('secqSetupDialog'); 
  const u = d?.dataset?.user || '';
  const q1 = document.getElementById('sqs_p1').value;
  const q2 = document.getElementById('sqs_p2').value;
  const q3 = document.getElementById('sqs_p3').value;
  const a1 = document.getElementById('sqs_a1').value;
  const a2 = document.getElementById('sqs_a2').value;
  const a3 = document.getElementById('sqs_a3').value;
  const m = document.getElementById('sqs_msg');
  
  if(new Set([q1,q2,q3]).size !== 3){ 
    if(m) m.textContent = 'Pick three different questions.'; 
    return; 
  }
  if(!a1 || !a2 || !a3){ 
    if(m) m.textContent = 'Please answer all three.'; 
    return; 
  }
  
  // Save to localStorage for THIS specific account
  SecQ_set3(u, q1, a1, q2, a2, q3, a3); 
  if(m) m.textContent = 'Saved ✓';
  
  try{ 
    localStorage.setItem('SecQ_prompted_' + u, 'true'); 
  }catch(e){}
  
  // Clear the form and dialog
  ['sqs_p1','sqs_p2','sqs_p3','sqs_a1','sqs_a2','sqs_a3'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  if(m) m.textContent='';
  
  // Wait then close dialog and move to next account
  setTimeout(() => { 
    if(d) d.style.display = 'none'; 
    Setup_nextAccount();
  }, 600);
}

// ===== Security Questions (stable; per-user keys) =====
// Storage helpers (one key per user: SecQ:<username>)
function SecQ_get(u){ try{ const raw=localStorage.getItem('SecQ:'+u); return raw? JSON.parse(raw): null; }catch(e){ return null; } }
function SecQ_set3(u,q1,a1,q2,a2,q3,a3){ const rec={q1:String(q1||''), a1:String(a1||''), q2:String(q2||''), a2:String(a2||''), q3:String(q3||''), a3:String(a3||'')}; try{ localStorage.setItem('SecQ:'+u, JSON.stringify(rec)); }catch(e){} }
function SecQ_users(){ try{ return (Users_all()||[]).map(u=>u.name); }catch(e){ return []; } }
function SecQ_match3(u,a1,a2,a3){ function norm(s){return String(s||'').trim().toLowerCase();} const d=SecQ_get(u); if(!d) return false; return norm(d.a1)===norm(a1)&&norm(d.a2)===norm(a2)&&norm(d.a3)===norm(a3); }

// 15 preset questions
const SECQ_BANK = [
  'What was your first school?','What city were you born in?','What is your favourite colour?','What is your favourite food?',
  'What is the name of your first pet?','What was the name of your first teacher?','What street did you grow up on?','What is the name of your best friend?',
  'What was your first video game?','What is your favourite movie?','What year were you born?','What is your dream job?',
  'What is your favourite sport?','What primary school did you attend?','What is the make of your first phone?'
];
function fillPresets(sel){ if(!sel) return; sel.innerHTML=''; SECQ_BANK.forEach(q=>{ const o=document.createElement('option'); o.value=q; o.textContent=q; sel.appendChild(o); }); }

// ===== Setup-time Wizard (per-user)
function SecQ_openSetupWizard(username){
  const dlg=document.getElementById('secqSetupDialog'); if(!dlg) return; dlg.style.display='flex';
  const s1=document.getElementById('sqs_p1'); const s2=document.getElementById('sqs_p2'); const s3=document.getElementById('sqs_p3');
  [s1,s2,s3].forEach(sel=>{ if(!sel) return; sel.innerHTML=''; SECQ_BANK.forEach(q=>{ const o=document.createElement('option'); o.value=q; o.textContent=q; sel.appendChild(o); }); });
  ['sqs_a1','sqs_a2','sqs_a3'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const m=document.getElementById('sqs_msg'); if(m) m.textContent='';
  dlg.dataset.user = username||'';
}

// Trigger wizard once when LOGIN screen becomes active after Setup (fallback)
ready(()=>{ try{ const login=document.getElementById('login'); if(!login) return; const obs=new MutationObserver(()=>{ if(login.classList.contains('active')){ try{ const u=(window.currentUser)||(Users_all()[0]?.name)||''; if(!u) return; const already = localStorage.getItem('SecQ_prompted_'+u)==='true'; const exists = !!SecQ_get(u); if(!already && !exists){ SecQ_openSetupWizard(u); } }catch(e){} } }); obs.observe(login,{attributes:true}); }catch(e){} });

// ===== Recovery (3 answers)
window.SecQ_openRecovery = function(){ const dlg=document.getElementById('secqRecover'); if(!dlg) return; const sel=document.getElementById('secqRecoverUser'); sel.innerHTML=''; SecQ_users().forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o); }); sel.onchange=SecQ_recoveryUpdate; SecQ_recoveryUpdate(); dlg.style.display='flex'; }
window.SecQ_closeRecovery = function(){ const d=document.getElementById('secqRecover'); if(d) d.style.display='none'; }
window.SecQ_recoveryUpdate = function(){ const u=document.getElementById('secqRecoverUser').value; const d=SecQ_get(u); const box=document.getElementById('secqRecoverQuestions'); if(!d){ box.innerHTML='<div>No security questions set for this user.</div>'; } else { box.innerHTML = `<div>Q1: ${d.q1||''}</div><div>Q2: ${d.q2||''}</div><div>Q3: ${d.q3||''}</div>`; } const m=document.getElementById('secqRecoverMsg'); if(m) m.textContent=''; ['secqAns1','secqAns2','secqAns3','secqNew1','secqNew2'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; }); }
window.SecQ_tryRecover = function(){ const u=document.getElementById('secqRecoverUser').value; const a1=document.getElementById('secqAns1').value, a2=document.getElementById('secqAns2').value, a3=document.getElementById('secqAns3').value; const np1=document.getElementById('secqNew1').value, np2=document.getElementById('secqNew2').value; const msg=document.getElementById('secqRecoverMsg'); const data=SecQ_get(u); if(!data){ msg.textContent='No security questions set for this user.'; return; } if(!a1||!a2||!a3){ msg.textContent='Please answer all three questions.'; return; } if(!SecQ_match3(u,a1,a2,a3)){ msg.textContent='One or more answers are incorrect.'; return; } if(!np1){ msg.textContent='Enter a new password.'; return; } if(np1!==np2){ msg.textContent='Passwords do not match.'; return; } const list=Users_all(); const idx=list.findIndex(x=>x && x.name===u); if(idx<0){ msg.textContent='User not found.'; return; } list[idx] = Object.assign({}, list[idx], {pass: np1}); Users_save(list); msg.style.color='#cfe9ff'; msg.textContent='Password reset \u2713'; setTimeout(()=>{ try{ SecQ_closeRecovery(); }catch(e){} }, 800); }

// ===== Settings: Manager button (Option C: Admin edits all; users edit only their own) =====
function SecQ_openSettings(target){
  try{
    if (isCurrentAdmin && isCurrentAdmin()) { SecQM_openFor(target); return; }
    if (typeof currentUser!=='undefined' && currentUser===target) { SecQM_openFor(target); return; }
    Desktop_showOverlay && Desktop_showOverlay('Only admin can edit other accounts');
  }catch(e){}
}

// Inject button into Accounts list if not already present
(function(){
  const orig = (typeof Settings_renderAccList==='function') ? Settings_renderAccList : null;
  if(!orig) return;
  Settings_renderAccList = function(){
    orig();
    try{
      const cont=document.getElementById('settingsAccList');
      cont.querySelectorAll('.acc-row').forEach(row=>{
        // If button already exists, skip
        if (row.querySelector('.btn-secq')) return;
        // Find the username from the left cell
        const nameMatch = row.querySelector('b');
        const uname = nameMatch ? nameMatch.textContent.trim() : '';
        const btn = document.createElement('button');
        btn.className = 'explorer-btn btn-secq';
        btn.textContent = 'Security questions';
        btn.onclick = ()=> SecQ_openSettings(uname);
        // Insert before the Remove button (last)
        const removeBtn = row.querySelector('button.explorer-btn.danger');
        if(removeBtn) row.insertBefore(btn, removeBtn);
        else row.appendChild(btn);
      });
    }catch(e){}
  }
})();

// ===== Security Questions Manager (Settings modal) =====
function SecQM_bank(){ return SECQ_BANK.slice(); }
function SecQM_fill(ids){ var B=SecQM_bank(); ids.forEach(function(id){ var el=document.getElementById(id); if(!el) return; el.innerHTML=''; B.forEach(function(q){ var o=document.createElement('option'); o.value=q; o.textContent=q; el.appendChild(o); }); }); }
window.SecQM_openFor = function(name){ var dlg=document.getElementById('secqManageDialog'); if(!dlg) return; dlg.style.display='flex'; dlg.dataset.user=name||''; var userSpan=document.getElementById('sqm_user'); if(userSpan) userSpan.textContent=name||''; SecQM_fill(['sqm_q1p','sqm_q2p','sqm_q3p']); var d=SecQ_get(name)||{}; if(d.q1) document.getElementById('sqm_q1p').value=d.q1; if(d.q2) document.getElementById('sqm_q2p').value=d.q2; if(d.q3) document.getElementById('sqm_q3p').value=d.q3; document.getElementById('sqm_a1').value=d.a1||''; document.getElementById('sqm_a2').value=d.a2||''; document.getElementById('sqm_a3').value=d.a3||''; var m=document.getElementById('sqm_msg'); if(m){ m.textContent=''; m.style.color=''; } }
window.SecQM_close = function(){ var d=document.getElementById('secqManageDialog'); if(d) d.style.display='none'; }
window.SecQM_save = function(){ var d=document.getElementById('secqManageDialog'); if(!d) return; var u=d.dataset.user||''; var q1=document.getElementById('sqm_q1p').value, q2=document.getElementById('sqm_q2p').value, q3=document.getElementById('sqm_q3p').value; var a1=document.getElementById('sqm_a1').value, a2=document.getElementById('sqm_a2').value, a3=document.getElementById('sqm_a3').value; var m=document.getElementById('sqm_msg'); if(new Set([q1,q2,q3]).size!==3){ if(m) m.textContent='Pick three different questions.'; return; } if(!a1||!a2||!a3){ if(m) m.textContent='Please answer all three.'; return; } SecQ_set3(u,q1,a1,q2,a2,q3,a3); if(m){ m.style.color='#cfe9ff'; m.textContent='Saved ✓'; } setTimeout(SecQM_close, 600); }
window.SecQM_remove = function(){ var d=document.getElementById('secqManageDialog'); if(!d) return; var u=d.dataset.user||''; var m=document.getElementById('sqm_msg'); try{ localStorage.removeItem('SecQ:'+u); if(m){ m.style.color='#cfe9ff'; m.textContent='Removed ✓'; } setTimeout(SecQM_close, 600); }catch(e){ if(m) m.textContent='Remove failed'; } }




// ===== Handles ZIP selection and extraction for JackOSDrive Import =====

ready(() => {
  const input = document.getElementById("driveZipInput");
  if (!input) return;

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const zip = await JSZip.loadAsync(file);

      const root = await navigator.storage.getDirectory();
      const driveRoot = await root.getDirectoryHandle("JackOSDrive", { create: true });

      let imported = 0;

      for (const zipPath in zip.files) {
        const entry = zip.files[zipPath];
        if (entry.dir) continue;

        // Remove leading JackOSDrive/ if present
        const cleanPath = zipPath.startsWith("JackOSDrive/")
          ? zipPath.slice("JackOSDrive/".length)
          : zipPath;

        if (!cleanPath) continue;

        await writeZipFileToDrive(driveRoot, cleanPath, entry);
        imported++;
      }

      Desktop_showOverlay(`Imported ${imported} file(s) ✓`);
    } catch (e) {
      alert("Drive import failed: " + e.message);
    }
  });
});

// Import Helper for JackOSDrive Import to safely write ZIP contents into OPFS 

async function writeZipFileToDrive(rootDir, relativePath, zipEntry){
  const parts = relativePath.split("/");
  const fileName = parts.pop();

  let dir = rootDir;
  for (const part of parts) {
    if (!part) continue;
    dir = await dir.getDirectoryHandle(part, { create: true });
  }

  let handle;
  try {
    handle = await dir.getFileHandle(fileName);
    const ok = confirm(`"${relativePath}" already exists.\nOverwrite?`);
    if (!ok) return;
  } catch {
    handle = await dir.getFileHandle(fileName, { create: true });
  }

  const data = await zipEntry.async("arraybuffer");
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

// System Export Stuff :D

function System_export(){
  Admin_requireStrict(async () => {
    const password = prompt(
      "Create a password for this JackOS system backup.\n\n" +
      "You will need this password to restore the system."
    );
    if(!password) return;

    try {
      const backup = await buildSystemBackup(password);

      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
      );

      // ✅ IMPORTANT: file name is .jkb (not .json)
      const file = new File([blob], "JackOS-System.jkb", {
        type: "application/octet-stream"
      });

      if(navigator.canShare && navigator.canShare({ files:[file] })){
        await navigator.share({
          files:[file],
          title:"JackOS System Backup"
        });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      Desktop_showOverlay("System backup exported ✓");
    } catch(e){
      alert("System export failed: " + e.message);
    }
  });
}
async function buildSystemBackup(password){
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await sha256(password + Array.from(salt).join("-"));

  return {
    jackos: "JackOS System Backup",
    version: JACKOS_VERSION,
    created: new Date().toISOString(),

    protection: {
      passwordHash,
      salt: Array.from(salt)
    },

    system: {
      users: Users_all(),
      wallpaper: exportWallpaperSettings(),
      securityQuestions: exportSecurityQuestions()
    }
  };
}
async function sha256(str){
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2,"0"))
    .join("");
}

// System Import Stuff

function System_import(){
  Admin_requireStrict(() => {
    const input = document.getElementById("systemImportInput");
    if(!input){
      alert("System import unavailable.");
      return;
    }
    input.value = "";
    input.click();
  });
}
ready(() => {
  const input = document.getElementById("systemImportInput");
  if(!input) return;

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if(!file) return;

    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      alert("Invalid JackOS system file.");
      return;
    }

    // ✅ VERSION CHECK (your exact requirement)
    if(data.version !== JACKOS_VERSION){
      alert(
        "ERROR!\n\n" +
        "The imported JackOS file is version: " + data.version + "\n\n" +
        "Current JackOS version is: " + JACKOS_VERSION + "\n\n" +
        "Make sure versions match before trying to import JackOS system files!"
      );
      return;
    }

    const password = prompt("Enter the system backup password:");
    if(!password) return;

    const hash = await sha256(
      password + data.protection.salt.join("-")
    );

    if(hash !== data.protection.passwordHash){
      alert("Incorrect system backup password.");
      return;
    }

    const ok = confirm(
      "This will overwrite ALL JackOS system data.\n\n" +
      "This cannot be undone.\n\nContinue?"
    );
    if(!ok) return;

    applySystemBackup(data.system);

    Desktop_showOverlay("System restored ✓", () => {
  applySavedWallpaper();
  location.reload();
});
  });
});

function applySystemBackup(system){
  // ✅ Preserve activation state
  const activated = localStorage.getItem('jackosActivated');

  localStorage.clear();

  // ✅ Restore activation
  if (activated === 'true') {
    localStorage.setItem('jackosActivated', 'true');
  }

  Users_save(system.users);
  importWallpaperSettings(system.wallpaper);
  importSecurityQuestions(system.securityQuestions);
}
// System Restore Helpers

// Export Wallpaper Settings

function exportWallpaperSettings(){
  return {
    wallpaper: localStorage.getItem('jackosWallpaper'),
    wallpaperData: localStorage.getItem('jackosWallpaperData')
  };
}


// Import Wallpaper Settings

function importWallpaperSettings(data){
  if(!data) return;

  if(data.wallpaper !== null){
    localStorage.setItem('jackosWallpaper', data.wallpaper);
  } else {
    localStorage.removeItem('jackosWallpaper');
  }

  if(data.wallpaperData !== null){
    localStorage.setItem('jackosWallpaperData', data.wallpaperData);
  } else {
    localStorage.removeItem('jackosWallpaperData');
  }
}


// Export Security Questions

function exportSecurityQuestions(){
  const out = {};
  const users = Users_all();

  users.forEach(u => {
    const key = 'SecQ:' + u.name;
    const val = localStorage.getItem(key);
    if(val){
      out[u.name] = JSON.parse(val);
    }
  });

  return out;
}

// Import Security Questions

function importSecurityQuestions(data){
  if(!data) return;

  Object.keys(data).forEach(username => {
    localStorage.setItem(
      'SecQ:' + username,
      JSON.stringify(data[username])
    );
  });
}
