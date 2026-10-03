//JackOS-Settings.js
// ===== Settings (accounts + admin transfer) =====
// Show the Accounts panel (called when user clicks "Accounts" button)
function Settings_showAccounts(){

if(
  Users_find(currentUser)?.guest
){
  return;
}

  ['settingsMain','settingsDataPanel','settingsSandboxPanel','settingsApplicationsPanel','settingsTaskbarPanel'].forEach(id=>{ const panel=document.getElementById(id); if(panel) panel.style.display='none'; });
  const accPanel=document.getElementById('settingsAccountsPanel'); if(accPanel){ accPanel.style.display='block'; Settings_renderAccList(); }
}

// Show Data Panel (When user clicks "Data" button)
function Settings_showData(){


if(
  Users_find(currentUser)?.guest
){
  return;
}

  const main = document.getElementById('settingsMain');
  const acc  = document.getElementById('settingsAccountsPanel');
  const data = document.getElementById('settingsDataPanel');
  const apps = document.getElementById('settingsApplicationsPanel');
  const taskbar = document.getElementById('settingsTaskbarPanel');

  if(main) main.style.display = 'none';
  if(acc)  acc.style.display  = 'none';
  if(apps) apps.style.display = 'none';
  if(taskbar) taskbar.style.display = 'none';
  if(data) data.style.display = 'block';
}
function Settings_showApplications(){

if(
  Users_find(currentUser)?.guest
){
  return;
}

  ['settingsMain','settingsAccountsPanel','settingsDataPanel','settingsSandboxPanel'].forEach(id=>{ const panel=document.getElementById(id); if(panel) panel.style.display='none'; });
  const panel=document.getElementById('settingsApplicationsPanel');
  if(panel) panel.style.display='block';
  InstalledApps_scan().then(Settings_renderApplications);
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
    "Export or import system data including accounts, passwords, background and version.",
    System_exportPrompt,
    System_import
  );
}

function Data_openPhotos(){
  alert(
    "Photos Import / Export\n\n" +
    "This lets you back up or restore photos stored inside JackOS.\n" +
    "Photos are handled separately from system data."
  );

  showDataActions(
    "Photos",
    "Export or import photos stored inside JackOS.",
    Photos_exportAll,
    Photos_importAll
  );
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
    "Importing Drive will only add files to the drive. Exporting will export the JackOSDrive files.",
    Drive_exportAll,
    Drive_importAll
  );
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
        setTimeout(()=>URL.revokeObjectURL(url),1000);
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

  const main =
    document.getElementById(
      'settingsMain'
    );

  const acc =
    document.getElementById(
      'settingsAccountsPanel'
    );

  const data =
    document.getElementById(
      'settingsDataPanel'
    );

  const sandbox =
    document.getElementById(
      'settingsSandboxPanel'
    );

  const apps = document.getElementById('settingsApplicationsPanel');
  const taskbar = document.getElementById('settingsTaskbarPanel');

  if(acc)
    acc.style.display='none';

  if(data)
    data.style.display='none';

  if(sandbox)
    sandbox.style.display='none';

  if(apps)
    apps.style.display='none';
  if(taskbar)
    taskbar.style.display='none';

  if(main)
    main.style.display='block';

}

function Settings_showTaskbar(){
  ['settingsMain','settingsAccountsPanel','settingsDataPanel','settingsSandboxPanel','settingsApplicationsPanel'].forEach(id=>{ const panel=document.getElementById(id); if(panel) panel.style.display='none'; });
  const panel=document.getElementById('settingsTaskbarPanel'); if(panel) panel.style.display='block';
  const compact=document.getElementById('taskbarCompact'); if(compact) compact.checked=localStorage.getItem('jackosTaskbarCompact')==='true';
  const list=document.getElementById('taskbarPinList'); if(!list) return; list.innerHTML=''; const pinned=JSON.parse(localStorage.getItem('jackosTaskbarPins')||'[]');
  DesktopWindows.ids.slice(0,9).forEach(id=>{ const label=document.createElement('label'); label.style.display='block'; const input=document.createElement('input'); input.type='checkbox'; input.dataset.app=id; input.checked=pinned.includes(id); label.append(input,' '+DesktopWindows.names[id]); list.append(label); });
}
function Settings_saveTaskbar(){ const compact=document.getElementById('taskbarCompact'); localStorage.setItem('jackosTaskbarCompact',String(!!compact?.checked)); const pins=[...document.querySelectorAll('#taskbarPinList input:checked')].map(input=>input.dataset.app); localStorage.setItem('jackosTaskbarPins',JSON.stringify(pins)); document.getElementById('settingsTaskbarPanel')?.style.setProperty('display','block'); Desktop_showOverlay('Taskbar saved ✓'); }


// Helper

// ===== Settings → Data actions UI =====
function showDataActions(title, text, onExport, onImport){
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
  const exportBtn=document.getElementById("dataExportBtn");
  const importBtn=document.getElementById("dataImportBtn");
  if(exportBtn) exportBtn.onclick=onExport || null;
  if(importBtn) importBtn.onclick=onImport || null;
}

function Settings_open(){

  const win =
    document.getElementById(
      'settingsWin'
    );

  if(!win) return;

  Settings_renderAccList();
  ['settingsAccountsPanel','settingsDataPanel','settingsSandboxPanel','settingsApplicationsPanel','settingsTaskbarPanel'].forEach(id=>{ const panel=document.getElementById(id); if(panel) panel.style.display='none'; });
  const main=document.getElementById('settingsMain'); if(main) main.style.display='block';

const guest =
  Users_find(currentUser)?.guest;

const buttons =
  main?.querySelectorAll(
    '.explorer-btn'
  );

if(buttons){

  buttons.forEach(btn=>{

    const text =
      btn.textContent.trim();

    if(
      text==='Accounts' ||
      text==='Data' ||
      text==='Applications'
    ){

      btn.style.display =
        guest
          ? 'none'
          : 'inline-block';

    }

  });

}

const sandboxBtn =
  document.getElementById(
    'sandboxBtn'
  );


 if(sandboxBtn){

  sandboxBtn.style.display =
    Edition_IsPro()
      ? 'inline-block'
      : 'none';

}


  win.style.display='block';
}



function Settings_close(){ 
  
  document.getElementById(
  "systemImportArea"
).style.display = "none";
  
  const win=document.getElementById('settingsWin'); if(win){ win.style.display='none'; } 

}
function Settings_renderAccList(){ const cont=document.getElementById('settingsAccList'); cont.innerHTML=''; const list=Users_all(); if(!list.length){ cont.innerHTML='<div style="opacity:.8;">No accounts yet.</div>'; return; }
  list.forEach(u=>{ const row=document.createElement('div'); row.className='acc-row'; const left=document.createElement('div'); left.innerHTML = `👤 <b>${u.name}</b> <span class="badge ${u.role}">${u.guest?'Guest':u.role}</span>`; const btnAdmin=document.createElement('button'); btnAdmin.className='explorer-btn'; btnAdmin.textContent = (u.role==='admin'? 'Remove Admin' : 'Make Admin'); btnAdmin.disabled = !!u.guest || (u.role==='admin' && Users_countAdmins(list)<=1); btnAdmin.onclick = ()=> Settings_makeAdmin(u.name);
    const btnPw=document.createElement('button'); btnPw.className='explorer-btn'; btnPw.textContent='Change password'; btnPw.onclick=()=> Settings_changePassword(u.name);
    const btnRm=document.createElement('button'); btnRm.className='explorer-btn danger'; btnRm.textContent='Remove'; btnRm.onclick=()=> Settings_removeAccount(u.name);
    btnPw.disabled=!!u.guest; row.appendChild(left); row.appendChild(btnAdmin); row.appendChild(btnPw); row.appendChild(btnRm); cont.appendChild(row); });
  const guestBtn=document.createElement('button'); guestBtn.className='explorer-btn'; guestBtn.textContent='Add Guest account'; guestBtn.onclick=Settings_addGuest; guestBtn.disabled=!!Users_guest(); cont.appendChild(guestBtn);
}
// Add account
function Settings_addAccountUI(){ Admin_require(()=>{ const dlg=document.getElementById('addAccDialog'); document.getElementById('addAccName').value=''; document.getElementById('addAccPass').value=''; document.getElementById('addAccPass2').value=''; document.getElementById('addAccMsg').textContent=''; dlg.style.display='flex'; }); }
function Settings_addGuest(){ Admin_require(()=>{ if(Users_addGuest()){ Settings_renderAccList(); Desktop_showOverlay('Guest account added ✓'); } else alert('A Guest account already exists.'); }); }
function AddAcc_cancel(){ document.getElementById('addAccDialog').style.display='none'; }
function AddAcc_save(){ const name=(document.getElementById('addAccName').value||'').trim(); const p1=document.getElementById('addAccPass').value||''; const p2=document.getElementById('addAccPass2').value||''; const msg=document.getElementById('addAccMsg'); if(!name){ msg.textContent='Enter a name'; return; } if(!p1){ msg.textContent='Enter a password'; return; } if(p1!==p2){ msg.textContent='Passwords don\'t match'; return; } const list=Users_all(); if(list.find(u=>u.name.toLowerCase()===name.toLowerCase())){ msg.textContent='That name already exists'; return; } list.push({name, pass:p1, role:'user'}); Users_save(list); document.getElementById('addAccDialog').style.display='none'; Settings_renderAccList(); Desktop_showOverlay('Account added ✓'); }
// Change password
let ChgPw_target=null;



function Settings_changePassword(name) {

  const openDialog=()=>{

    ChgPw_target=name;

    document.getElementById(
      'chgPwUser'
    ).value=name;

    document.getElementById(
      'chgPw1'
    ).value='';

    document.getElementById(
      'chgPw2'
    ).value='';

    document.getElementById(
      'chgPwMsg'
    ).textContent='';

    document.getElementById(
      'chgPwDialog'
    ).style.display='flex';

  };

  if(name===currentUser){

    Account_require(
      openDialog
    );

  }else{

    Admin_require(
      openDialog
    );

  }

}


function ChgPw_cancel(){ ChgPw_target=null; document.getElementById('chgPwDialog').style.display='none'; }
function ChgPw_save(){ const p1=document.getElementById('chgPw1').value||''; const p2=document.getElementById('chgPw2').value||''; const msg=document.getElementById('chgPwMsg'); if(!p1){ msg.textContent='Enter a new password'; return; } if(p1!==p2){ msg.textContent='Passwords don\'t match'; return; } const list=Users_all(); const u=list.find(x=>x.name===ChgPw_target); if(!u){ msg.textContent='User not found'; return; } u.pass=p1; Users_save(list); document.getElementById('chgPwDialog').style.display='none'; Desktop_showOverlay('Password changed ✓'); }
// Remove account (protect last admin)
let RmAcc_target=null;
function Settings_removeAccount(name){ Admin_require(()=>{ RmAcc_target=name; document.getElementById('rmAccMsg').textContent=''; document.getElementById('rmAccText').innerHTML = `Remove account <b>${name}</b>?`; document.getElementById('rmAccDialog').style.display='flex'; }); }
function RmAcc_cancel(){ RmAcc_target=null; document.getElementById('rmAccDialog').style.display='none'; }
function RmAcc_do(){ const list=Users_all(); const idx=list.findIndex(u=>u.name===RmAcc_target); const msg=document.getElementById('rmAccMsg'); if(idx<0){ msg.textContent='User not found'; return; } const target=list[idx]; const adminCount=Users_countAdmins(list); if(target.role==='admin' && adminCount<=1){ msg.textContent='You must keep at least one admin'; return; } list.splice(idx,1); Users_save(list); document.getElementById('rmAccDialog').style.display='none'; Settings_renderAccList(); Desktop_showOverlay('Account removed ✓'); if(currentUser===target.name){ show('login', true); } }
// Make Admin (transfer single admin role)
function Settings_makeAdmin(name){ Admin_requireStrict(()=>{ const list=Users_all(); const u=list.find(x=>x.name===name); if(!u || u.guest){ alert('Guest cannot be an admin.'); return; } if(u.role==='admin'){ if(Users_countAdmins(list)<=1){ alert('You must keep at least one admin.'); return; } u.role='user'; } else u.role='admin'; Users_save(list); Settings_renderAccList(); Desktop_showOverlay('Admin settings changed ✓'); }); }
