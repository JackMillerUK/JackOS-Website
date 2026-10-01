// ===== Explorer (OPFS) =====
const ExplorerState={ files:[], driveRoot:null, driveCwd:null, cwdPath:[], virtualPath:[], selectedIndex:-1, multi:false, multiSet:new Set(), mode:'read' };


function Explorer_open(){ document.getElementById('explorer').style.display='block'; if(ExplorerState.virtualPath.length){ ExplorerState.virtualPath=[]; ExplorerState.cwdPath=[]; Explorer_listDriveCwd(); } if(!ExplorerState.driveRoot) Explorer_showHome(); }


function Explorer_close(){

  document.getElementById(
    'explorer'
  ).style.display='none';

  Explorer_clearPreview();
  Explorer_clearMulti();

  ExplorerState.virtualPath=[];
  ExplorerState.cwdPath=[];

}

// Applications Folder Read Only Helper //

function Explorer_isApplicationsFolder(){

  return (
    ExplorerState.cwdPath.length === 1 &&
    ExplorerState.cwdPath[0] === 'Applications'
  );

}



function Explorer_setSelection(idx){

  ExplorerState.selectedIndex=idx;

}
function Explorer_fileIcon(name,isDir){

  if(isDir)
    return '📁';

  const ext=
    name.split('.')
      .pop()
      .toLowerCase();

  switch(ext){

    case 'zip':
      return '📦';

    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
    case 'gif':
      return '🖼';

    case 'mp3':
    case 'wav':
    case 'aac':
    case 'm4a':
      return '🎵';

    case 'html':
      return '🌐';

    case 'js':
      return '📜';

    case 'json':
      return '⚙';

    default:
      return '📄';

  }

}
function Explorer_closeContextMenu(){

  const m =
    document.getElementById(
      'explorerContextMenu'
    );

  if(m)
    m.style.display='none';

}
function Explorer_showContextMenu(
  x,
  y,
  html
){

  const m =
    document.getElementById(
      'explorerContextMenu'
    );

  m.innerHTML = html;

  m.style.left =
    x + 'px';

  m.style.top =
    y + 'px';

  m.style.display =
    'block';

}

document.addEventListener(
  'click',
  Explorer_closeContextMenu
);

function Explorer_renderList(){ const ul=document.getElementById('explorer-list'); ul.classList.toggle('multi', ExplorerState.multi); ul.innerHTML=''; ExplorerState.files.forEach((f,i)=>{ const li=document.createElement('li'); li.dataset.idx=i; const cb=document.createElement('input'); cb.type='checkbox'; cb.className='selbox'; cb.checked=ExplorerState.multiSet.has(i); cb.addEventListener('click', (e)=>{ e.stopPropagation(); Explorer_toggleItem(i); }); 



const icon =
  Explorer_fileIcon(
    f.name,
    f.kind === 'directory'
  );

const name=document.createElement('div');

name.className='namewrap';

name.innerHTML=`${icon} ${f.name}`;

const path=document.createElement('div'); path.style.cssText='color:#9dd0ff;font-family:ui-monospace,Menlo,monospace;font-size:12px;'; path.textContent=f.path||''; li.appendChild(cb); li.appendChild(name); li.appendChild(path); if(ExplorerState.multi){ li.addEventListener('click', ()=>Explorer_toggleItem(i)); } else { li.addEventListener('click', ()=>{ Explorer_setSelection(i); Explorer_showEntry(f); }); if(f.kind==='directory') li.ondblclick=()=>Explorer_enterFolder(i); } 


li.addEventListener(
  'contextmenu',
  e=>{

    e.preventDefault();

    Explorer_setSelection(i);

    const menuHtml =
      Explorer_isApplicationsFolder()

      ? `

      <div class="context-item"
        onclick="Explorer_exportSelected()">
        📤 Export
      </div>

      <div class="context-item"
        onclick="Explorer_deleteSelected()">
        🗑 Delete
      </div>

      `

      : `

      <div class="context-item"
        onclick="Explorer_showEntry(
          ExplorerState.files[${i}]
        )">
        📂 Open
      </div>

      <div class="context-item"
        onclick="Explorer_rename()">
        ✏ Rename
      </div>

      <div class="context-item"
        onclick="Explorer_openDestDialog(
          'duplicate'
        )">
        📋 Duplicate
      </div>

      <div class="context-item"
        onclick="Explorer_exportSelected()">
        📤 Export
      </div>

      <div class="context-item"
        onclick="Explorer_deleteSelected()">
        🗑 Delete
      </div>

      `;

    Explorer_showContextMenu(
      e.pageX,
      e.pageY,
      menuHtml
    );

  }
);

if(ExplorerState.multiSet.has(i)) li.classList.add('selected'); ul.appendChild(li); }); Explorer_updateMultiBar(); }
function Explorer_clearPreview(){ document.getElementById('explorer-info').textContent=''; document.querySelectorAll('#explorer .preview img').forEach(img=>img.remove()); document.getElementById('explorer-preview').style.display='none'; document.getElementById('explorer-editor').style.display='none'; document.getElementById('save-btn').style.display='none'; document.getElementById('set-wallpaper-btn').style.display='none'; }




function Explorer_showHome(){

  document.getElementById(
    'explorer-list'
  ).innerHTML = `

    <li onclick="Explorer_openJackOSDrive()">
      📁 JackOS Drive
    </li>

    <li onclick="alert('JackOS Cloud coming soon')">
      ☁ JackOS Cloud
    </li>

    <li onclick="alert('Network coming soon')">
      🛜 Network
    </li>

    <li onclick="alert('External Drives coming soon')">
      💾 External Drives
    </li>

    <li onclick="alert('Recents coming soon')">
      🕒 Recents
    </li>

    <li onclick="alert('Favourites coming soon')">
      ⭐ Favourites
    </li>

    <li onclick="alert('Tags coming soon')">
      🏷 Tags
    </li>

    <li onclick="Explorer_openRecycleBin()">
      🗑 Recycle Bin
    </li>

  `;

}

async function Explorer_openRecycleBin(){

  if(!ExplorerState.driveRoot)
    await Explorer_openJackOSDrive();

  const bin =
    await ExplorerState.driveRoot
      .getDirectoryHandle(
  'Recycle Bin',
  {create:true}
);

  ExplorerState.driveCwd =
    bin;

  ExplorerState.cwdPath =
    ['Recycle Bin'];

  ExplorerState.virtualPath =
    [];

  await Explorer_listDriveCwd();

}

async function Explorer_openJackOSDrive(){ try{ ExplorerState.driveRoot=await UserData_dir(); ExplorerState.driveCwd=ExplorerState.driveRoot; ExplorerState.cwdPath=[]; ExplorerState.virtualPath=[]; await Explorer_listDriveCwd(); }catch(e){ alert('OPFS unavailable: '+e.message); } }

async function Explorer_openApplications(){

  try{

    if(!ExplorerState.driveRoot){
      await Explorer_openJackOSDrive();
    }

    const apps =
      await ExplorerState.driveRoot
        .getDirectoryHandle("Applications");

    ExplorerState.driveCwd =
      apps;

    ExplorerState.cwdPath =
      ["Applications"];

    ExplorerState.virtualPath =
      [];

    await Explorer_listDriveCwd();

  }
  catch(e){

    alert(
      'Applications folder not found.'
    );

  }

}

async function Explorer_openPhotos(){

  try{

    if(!ExplorerState.driveRoot){
      await Explorer_openJackOSDrive();
    }

    const photos =
      await ExplorerState.driveRoot
        .getDirectoryHandle("Photos");

    ExplorerState.driveCwd =
      photos;

    ExplorerState.cwdPath =
      ["Photos"];

    ExplorerState.virtualPath =
      [];

    await Explorer_listDriveCwd();

  }
  catch(e){

    alert(
      'Photos folder not found.'
    );

  }

}

async function Explorer_createFile(){
  try{
    if(!ExplorerState.driveCwd || ExplorerState.virtualPath.length){ alert('Create files in JackOS Drive.'); return; }
    const name=(prompt('File name:', 'untitled.txt')||'').trim();
    if(!name || name==='.' || name==='..' || name.includes('/')) return;
    if(await Explorer_existsAny(ExplorerState.driveCwd,name)){ alert('An item with that name already exists.'); return; }
    const handle=await ExplorerState.driveCwd.getFileHandle(name,{create:true});
    const writable=await handle.createWritable();
    await writable.write('');
    await writable.close();
    await Explorer_listDriveCwd();
  }catch(e){ alert('Create file failed: '+e.message); }
}
async function Explorer_createFolder(){
  try{
    if(!ExplorerState.driveCwd || ExplorerState.virtualPath.length){ alert('Create folders in JackOS Drive.'); return; }
    const name=(prompt('Folder name:', 'New Folder')||'').trim();
    if(!name || name==='.' || name==='..' || name.includes('/')) return;
    if(await Explorer_existsAny(ExplorerState.driveCwd,name)){ alert('An item with that name already exists.'); return; }
    await ExplorerState.driveCwd.getDirectoryHandle(name,{create:true});
    await Explorer_listDriveCwd();
  }catch(e){ alert('Create folder failed: '+e.message); }
}
function Explorer_virtualFile(name, path, text, type='text/plain'){ return {name, path, kind:'file', virtual:true, file:new File([text||''], name, {type})}; }
function Explorer_virtualEntries(){
  const path=ExplorerState.virtualPath;
  const library=Music_defaultLibrary();
  if(path.length===1) return [{name:'Music', path:'LocalStorage/Music/', kind:'directory', virtual:true, virtualPath:['LocalStorage','Music']}];
  if(path.length===2) return [
    {name:'Songs', path:'LocalStorage/Music/Songs/', kind:'directory', virtual:true, virtualPath:['LocalStorage','Music','Songs']},
    {name:'Song-Files', path:'LocalStorage/Music/Song-Files/', kind:'directory', virtual:true, virtualPath:['LocalStorage','Music','Song-Files']},
    Explorer_virtualFile('Library.jks','LocalStorage/Music/Library.jks',JSON.stringify(library,null,2),'application/json')
  ];
  if(path[2]==='Songs') return library.map(song=>Explorer_virtualFile(song.audioPath.split('/').pop() || `${Music_id(song)}.audio`,`LocalStorage/Music/Songs/${song.audioPath.split('/').pop() || `${Music_id(song)}.audio`}`,song.audioData,'application/octet-stream'));
  if(path[2]==='Song-Files') return library.map(song=>Explorer_virtualFile(`${Music_id(song)}.jks`,`LocalStorage/Music/Song-Files/${Music_id(song)}.jks`,song.definitionJks || JSON.stringify(song,null,2),'application/json'));
  return [];
}
async function Explorer_listDriveCwd(){
  const arr=[];
  if(!ExplorerState.virtualPath.length){
    for await(const entry of ExplorerState.driveCwd.values()){
      if(entry.name==='Music' || entry.name===GAME_SCORE_FILE) continue;
      if(entry.kind==='file'){ const f=await entry.getFile(); arr.push({name:entry.name, path:[...ExplorerState.cwdPath, entry.name].join('/'), file:f, handle:entry, parent:ExplorerState.driveCwd, kind:'file'}); }
      else arr.push({name:entry.name, path:[...ExplorerState.cwdPath, entry.name].join('/')+'/', handle:entry, parent:ExplorerState.driveCwd, kind:'directory'});
    }
  } else arr.push(...Explorer_virtualEntries());
  ExplorerState.selectedIndex=-1;
  ExplorerState.multiSet.clear();
  [
 'set-wallpaper-btn',
 'save-btn'
].forEach(id=>{
    const button=document.getElementById(id);
    if(button) button.style.display='none';
  });
  arr.sort((a,b)=> (a.kind===b.kind? a.name.localeCompare(b.name) : (a.kind==='directory'?-1:1)));
  ExplorerState.files=arr; Explorer_renderList(); Explorer_renderBreadcrumb(); document.getElementById('explorer-info').textContent=`${ExplorerState.virtualPath.length?'LocalStorage':'JackOS Drive'}: ${arr.length} item(s)`;
}
function Explorer_renderBreadcrumb(){ const bc=document.getElementById('explorer-breadcrumb'); const parts=['JackOSDrive', ...ExplorerState.virtualPath.slice(0,1), ...ExplorerState.virtualPath.slice(1), ...ExplorerState.cwdPath]; bc.innerHTML=parts.map((p,i)=>`<span onclick="Explorer_breadcrumbClick(${i})">${p}</span>`).join(' / '); }
async function Explorer_breadcrumbClick(i){
  if(i===0){ ExplorerState.driveCwd=ExplorerState.driveRoot; ExplorerState.cwdPath=[]; ExplorerState.virtualPath=[]; await Explorer_listDriveCwd(); return; }
  if(ExplorerState.virtualPath.length){ ExplorerState.virtualPath=ExplorerState.virtualPath.slice(0,i); ExplorerState.cwdPath=[]; await Explorer_listDriveCwd(); return; }
  let dir=ExplorerState.driveRoot; for(let d=1; d<=i; d++){ dir=await dir.getDirectoryHandle(ExplorerState.cwdPath[d-1]); } ExplorerState.driveCwd=dir; ExplorerState.cwdPath=ExplorerState.cwdPath.slice(0,i); await Explorer_listDriveCwd();
}
async function Explorer_enterFolder(idx){ const e=ExplorerState.files[idx]; if(e.kind!=='directory') return; if(e.virtual){ ExplorerState.virtualPath=e.virtualPath; ExplorerState.cwdPath=[]; await Explorer_listDriveCwd(); return; } ExplorerState.driveCwd=e.handle; ExplorerState.cwdPath.push(e.name); await Explorer_listDriveCwd(); }
async function Explorer_showEntry(entry){ Explorer_clearPreview(); const info=document.getElementById('explorer-info'); const pre=document.getElementById('explorer-preview'); const editor=document.getElementById('explorer-editor'); const pane=document.querySelector('#explorer .preview'); const setBtn=document.getElementById('set-wallpaper-btn'); if(entry.kind==='directory'){ info.textContent=`Folder: ${entry.path}`; return; } info.textContent=`${entry.path} (${entry.file.type||'unknown'})`; const isImage=entry.file.type && entry.file.type.startsWith('image/'); const isText=/\.(txt|md|json|css|html|js|csv|log)$/i.test(entry.name); if(isImage){ const url=URL.createObjectURL(entry.file); const img=document.createElement('img'); img.src=url; pane.insertBefore(img, pre); img.onload=()=>URL.revokeObjectURL(url); if(setBtn){ setBtn.style.display='inline-block'; } } if(isText){ const text=await entry.file.text(); editor.value=text||''; editor.style.display='block'; document.getElementById('save-btn').style.display='inline-block'; } }
async function Explorer_setWallpaperSelected(){ const idx=ExplorerState.selectedIndex; if(idx<0) return; const entry=ExplorerState.files[idx]; if(!entry || entry.kind!=='file' || !(entry.file.type||'').startsWith('image/')){ alert('Select an image file.'); return; } try{ const reader=new FileReader(); reader.onload = ()=>{ Desktop_setWallpaperFromData(reader.result); Desktop_hideStartMenu(); }; reader.readAsDataURL(entry.file); }catch(e){ alert('Set background failed: '+e.message); } }
async function Explorer_deleteSelected(){ try{ if(!ExplorerState.driveCwd){ alert('Delete is only in JackOS Drive.'); return; } const idx=ExplorerState.selectedIndex; if(idx<0){ alert('Select an item first.'); return; } const entry=ExplorerState.files[idx]; const ok=confirm(`Delete ${entry.kind==='directory'?'folder':'file'} "${entry.name}"?`); if(!ok) return;


const recycleBin =
  await ExplorerState.driveRoot
    .getDirectoryHandle(
      'Recycle Bin',
      {create:true}
    );

if(entry.kind==='file'){

  await Explorer_copyFileHandleToDir(
    entry.handle,
    recycleBin,
    entry.name
  );

}
else{

  const restoreDir =
    await recycleBin
      .getDirectoryHandle(
        entry.name,
        {create:true}
      );

  await Explorer_copyDirectoryRecursive(
    entry.handle,
    restoreDir
  );

}

await ExplorerState.driveCwd.removeEntry(
  entry.name,
  {
    recursive:
      entry.kind==='directory'
  }
);

await Explorer_listDriveCwd(); Explorer_clearPreview(); alert('Moved to Recycle Bin ✓'); }catch(e){ alert('Delete failed: '+e.message); } }
async function Explorer_rename(){ try{ if(!ExplorerState.driveCwd){ alert('Rename only works in JackOS Drive.'); return; } const idx=ExplorerState.selectedIndex; if(idx<0){ alert('Select an item first.'); return; } const entry=ExplorerState.files[idx]; const oldName=entry.name; let newName=prompt('Rename to:', oldName); if(!newName) return; newName=newName.trim(); if(!newName || newName===oldName || newName.includes('/')||newName==='.'||newName==='..'){ return; } const existsFile=await Explorer_existsFile(ExplorerState.driveCwd,newName); const existsDir=await Explorer_existsDir(ExplorerState.driveCwd,newName); if(entry.kind==='file'){ if(existsDir){ alert('A folder with that name exists.'); return;} if(existsFile){ const ok=confirm('A file with that name exists. Overwrite it?'); if(!ok) return; } await Explorer_copyFileHandleToDir(entry.handle, ExplorerState.driveCwd, newName); await ExplorerState.driveCwd.removeEntry(oldName); } else { if(existsFile){ alert('A file with that name exists.'); return;} if(existsDir){ const ok=confirm('A folder with that name exists. Merge/overwrite?'); if(!ok) return; } const newDir=await ExplorerState.driveCwd.getDirectoryHandle(newName,{create:true}); await Explorer_copyDirectoryRecursive(entry.handle,newDir); await ExplorerState.driveCwd.removeEntry(oldName,{recursive:true}); } await Explorer_listDriveCwd(); const idx2=ExplorerState.files.findIndex(f=>f.name===newName && f.kind===entry.kind); if(idx2>=0) Explorer_setSelection(idx2); alert('Renamed ✓'); }catch(e){ alert('Rename failed: '+e.message); } }
async function Explorer_exportSelected(){ try{ const idx=ExplorerState.selectedIndex; if(idx<0){ alert('Select a file first.'); return; } const entry=ExplorerState.files[idx]; if(entry.kind!=='file'){ alert('Export folders not supported yet.'); return; } await Export_files([entry]); }catch(e){ if(e && e.name==='AbortError') return; alert('Export failed: '+e.message); } }
async function Explorer_save(){ const idx=ExplorerState.selectedIndex; if(idx<0){ alert('Select a file first.'); return;} const entry=ExplorerState.selectedIndex>=0?ExplorerState.files[ExplorerState.selectedIndex]:null; if(!entry || !entry.handle || entry.kind!=='file'){ alert('Open a file from JackOS Drive to save.'); return; } try{ const w=await entry.handle.createWritable(); await w.write(document.getElementById('explorer-editor').value||''); await w.close(); alert('Saved to JackOS Drive ✓'); }catch(e){ alert('Save failed: '+e.message); } }
function Explorer_toggleMulti(){ ExplorerState.multi = !ExplorerState.multi; if(!ExplorerState.multi) ExplorerState.multiSet.clear(); document.getElementById('multiToggle').textContent = ExplorerState.multi? 'Cancel' : 'Select'; Explorer_renderList(); Explorer_updateMultiBar(); }
function Explorer_toggleItem(i){ if(ExplorerState.multiSet.has(i)) ExplorerState.multiSet.delete(i); else ExplorerState.multiSet.add(i); Explorer_renderList(); }
function Explorer_clearMulti(){ ExplorerState.multiSet.clear(); Explorer_renderList(); }
function Explorer_selectedEntries(){ return [...ExplorerState.multiSet].map(i=>ExplorerState.files[i]).filter(Boolean); }
function Explorer_updateMultiBar(){ const bar=document.getElementById('multiBar'); const n=ExplorerState.multiSet.size; if(ExplorerState.multi){ bar.classList.add('show'); } else { bar.classList.remove('show'); } document.getElementById('multiCount').textContent = n+ ' selected'; }
async function Explorer_manyDelete(){ try{ const entries=Explorer_selectedEntries(); if(!entries.length){ alert('Select items first.'); return; } const ok=confirm('Delete '+entries.length+' item(s)?'); if(!ok) return;


const recycleBin =
  await ExplorerState.driveRoot
    .getDirectoryHandle(
      'Recycle Bin',
      {create:true}
    );

for(const e of entries){

  if(e.kind === 'file'){

    await Explorer_copyFileHandleToDir(
      e.handle,
      recycleBin,
      e.name
    );

  }
  else{

    const restoreDir =
      await recycleBin
        .getDirectoryHandle(
          e.name,
          {create:true}
        );

    await Explorer_copyDirectoryRecursive(
      e.handle,
      restoreDir
    );

  }

  await ExplorerState.driveCwd.removeEntry(
    e.name,
    {
      recursive:
        e.kind === 'directory'
    }
  );

}

await Explorer_listDriveCwd(); Explorer_clearMulti(); 

alert(
  entries.length +
  ' item(s) moved to Recycle Bin ✓'
);

}catch(e){ alert('Delete failed: '+e.message); } }
async function Explorer_manyMove(){ const entries=Explorer_selectedEntries(); if(!entries.length){ alert('Select items first.'); return; } Explorer_openDestDialog('move-many'); }
async function Explorer_manyDuplicate(){ const entries=Explorer_selectedEntries(); if(!entries.length){ alert('Select items first.'); return; } Explorer_openDestDialog('duplicate-many'); }
async function Explorer_manyExport(){ const entries=Explorer_selectedEntries().filter(e=>e.kind==='file'); if(!entries.length){ alert('Select file(s) first.'); return; } try{ await Export_files(entries); }catch(e){ alert('Export failed: '+e.message); } }
const DestState={ mode:null, destRoot:null, destCwd:null, destPath:[], sourceEntry:null };
async function Explorer_openDestDialog(mode){ if(!ExplorerState.driveRoot){ await Explorer_openJackOSDrive(); if(!ExplorerState.driveRoot) return; } DestState.mode=mode; DestState.destRoot=ExplorerState.driveRoot; DestState.destCwd=ExplorerState.driveRoot; DestState.destPath=[]; const idx=ExplorerState.selectedIndex; DestState.sourceEntry = (mode==='move'||mode==='duplicate')? (idx>=0? ExplorerState.files[idx] : null) : null; const title=document.getElementById('destTitle'); const nameWrap=document.getElementById('destNameWrap'); if(mode==='move'){ title.textContent='Move to folder'; nameWrap.style.display='none'; } else if(mode==='duplicate'){ title.textContent='Duplicate to folder'; nameWrap.style.display='none'; } else if(mode==='move-many'){ title.textContent='Move selected to folder'; nameWrap.style.display='none'; } else if(mode==='duplicate-many'){ title.textContent='Duplicate selected to folder'; nameWrap.style.display='none'; } else { title.textContent='Save to JackOS Drive'; nameWrap.style.display='flex'; document.getElementById('destName').value = suggestSaveName(); }
  document.getElementById('destDialog').style.display='flex'; await Explorer_destList(); Explorer_destRenderBreadcrumb(); }
function Explorer_closeDest(){ document.getElementById('destDialog').style.display='none'; }
function Explorer_destRenderBreadcrumb(){ const bc=document.getElementById('destCrumbs'); const parts=['JackOSDrive', ...DestState.destPath]; bc.innerHTML=parts.map((p,i)=>`<span onclick=\"Explorer_destCrumb(${i})\">${p}</span>`).join(' / '); }
async function Explorer_destCrumb(i){ if(i===0){ DestState.destCwd=DestState.destRoot; DestState.destPath=[]; } else { let d=DestState.destRoot; for(let k=1;k<=i;k++){ d=await d.getDirectoryHandle(DestState.destPath[k-1]); } DestState.destCwd=d; DestState.destPath=DestState.destPath.slice(0,i); } await Explorer_destList(); Explorer_destRenderBreadcrumb(); }
async function Explorer_destList(){ const list=document.getElementById('destList'); list.innerHTML=''; for await(const entry of DestState.destCwd.values()){
  
  if(entry.name === 'Music')
  continue;
  
  
  if(entry.kind==='directory'){ const row=document.createElement('div'); row.textContent = entry.name + '/'; row.onclick = async()=>{ DestState.destCwd = entry; DestState.destPath.push(entry.name); await Explorer_destList(); Explorer_destRenderBreadcrumb(); }; list.appendChild(row); } } }
async function Explorer_destNewFolder(){ const name=prompt('New folder name:'); if(!name) return; await DestState.destCwd.getDirectoryHandle(name, {create:true}); await Explorer_destList(); }
async function Explorer_confirmDest(){ try{ const mode=DestState.mode; const destDir=DestState.destCwd; if(mode==='move'){ const src=DestState.sourceEntry; await Explorer_moveOne(src, destDir); } else if(mode==='duplicate'){ const src=DestState.sourceEntry; await Explorer_duplicateOne(src, destDir); } else if(mode==='move-many'){ const list=Explorer_selectedEntries(); for(const src of list){ await Explorer_moveOne(src, destDir); } Explorer_clearMulti(); } else if(mode==='duplicate-many'){ const list=Explorer_selectedEntries(); for(const src of list){ await Explorer_duplicateOne(src, destDir); } Explorer_clearMulti(); } else { const filename=document.getElementById('destName').value.trim()||'untitled.txt'; await Explorer_saveAsToDir(destDir, filename); } await Explorer_listDriveCwd(); Explorer_closeDest(); Desktop_showOverlay('Operation complete ✓'); }catch(e){ alert('Operation failed: '+e.message); } }
async function Explorer_moveOne(src, destDir){ if(!src || !src.handle || src.virtual) return; if(src.parent===destDir) return; if(src.kind==='file'){ await Explorer_copyFileHandleToDir(src.handle, destDir, src.name); await src.parent.removeEntry(src.name); } else { const newDir=await destDir.getDirectoryHandle(src.name,{create:true}); await Explorer_copyDirectoryRecursive(src.handle, newDir); await src.parent.removeEntry(src.name, {recursive:true}); } }
async function Explorer_duplicateOne(src, destDir){ if(!src) return; if(src.kind==='file'){ const target = await Explorer_uniqueName(destDir, src.name); await Explorer_copyFileHandleToDir(src.handle, destDir, target); } else { const targetBase = await Explorer_uniqueName(destDir, src.name.replace(/\/$/, '')); const newDir=await destDir.getDirectoryHandle(targetBase, {create:true}); await Explorer_copyDirectoryRecursive(src.handle, newDir); } }
async function Explorer_uniqueName(dir, base){ let name=base; let i=1; const dot=base.lastIndexOf('.'); const stem = dot>0? base.slice(0,dot):base; const ext = dot>0? base.slice(dot):''; while(await Explorer_existsAny(dir, name)){ name = stem + ' ('+i+')' + ext; i++; if(i>9999) break; } return name; }
async function Explorer_existsAny(dir, name){ try{ await dir.getFileHandle(name); return true; }catch(e){} try{ await dir.getDirectoryHandle(name); return true; }catch(e){} return false; }
async function Explorer_copyFileHandleToDir(fileHandle, destDir, targetName){ const w=await (await destDir.getFileHandle(targetName, {create:true})).createWritable(); const file=await fileHandle.getFile(); await w.write(new Uint8Array(await file.arrayBuffer())); await w.close(); }
async function Explorer_copyDirectoryRecursive(srcDirHandle, destDirHandle){ for await(const entry of srcDirHandle.values()){ if(entry.kind==='file'){ await Explorer_copyFileHandleToDir(entry, destDirHandle, entry.name); } else { const sub=await destDirHandle.getDirectoryHandle(entry.name, {create:true}); await Explorer_copyDirectoryRecursive(entry, sub); } } }
async function Explorer_existsFile(dir, name){ try{ await dir.getFileHandle(name); return true; }catch(e){ return false; } }
async function Explorer_existsDir(dir, name){ try{ await dir.getDirectoryHandle(name); return true; }catch(e){ return false; } }
function suggestSaveName(){ const idx=ExplorerState.selectedIndex; if(idx>=0) return ExplorerState.files[idx].name; return 'untitled.txt'; }
async function Explorer_saveAsToDir(destDir, filename){ const idx=ExplorerState.selectedIndex; if(idx>=0){ const entry=ExplorerState.files[idx]; if(entry.kind==='file'){ const w=await (await destDir.getFileHandle(filename, {create:true})).createWritable(); await w.write(new Uint8Array(await entry.file.arrayBuffer())); await w.close(); return; } } const fh=await destDir.getFileHandle(filename, {create:true}); const w=await fh.createWritable(); await w.write(''); await w.close(); }
ready(()=>{
  
  document
  .querySelector(
    '#explorer .body'
  )
  .addEventListener(
    'contextmenu',
    e=>{

      if(
        e.target.closest('li')
      ) return;

      e.preventDefault();

      Explorer_showContextMenu(

        e.pageX,

        e.pageY,

        `

        <div
          class="context-item"
          onclick="
            Explorer_createFile()
          "
        >
          📄 New File
        </div>

        <div
          class="context-item"
          onclick="
            Explorer_createFolder()
          "
        >
          📁 New Folder
        </div>

        `

      );

    }
  );

  const input=document.getElementById('importInput'); if(input){ input.addEventListener('change', async (e)=>{ const files=[...e.target.files||[]]; if(!files.length) return; try{ if(!ExplorerState.driveCwd){ await Explorer_openJackOSDrive(); } for(const f of files){ const fh=await ExplorerState.driveCwd.getFileHandle(f.name, {create:true}); const w=await fh.createWritable(); await w.write(new Uint8Array(await f.arrayBuffer())); await w.close(); } await Explorer_listDriveCwd(); alert('Imported '+files.length+' file(s)'); }catch(err){ alert('Import failed: '+err.message); } finally { input.value=''; } }); } });
// ===== Export helper =====
async function Export_files(entries){ try{ const blobs = await Promise.all(entries.map(async e=> new File([await e.file.arrayBuffer()], e.name, {type: e.file.type || 'application/octet-stream'}))); if(blobs.length===1){ if('showSaveFilePicker' in window){ try{ const f=blobs[0]; const ext=(f.name.split('.').pop()||'dat'); const types=f.type?[{description:f.type, accept:{[f.type]:['.'+ext]}}]:undefined; const handle=await window.showSaveFilePicker({suggestedName:f.name, types}); const w=await handle.createWritable(); await w.write(await f.arrayBuffer()); await w.close(); Desktop_showOverlay('Exported ✓'); return; }catch(e){ if(e && e.name==='AbortError') return; } } if(navigator.canShare && navigator.canShare({files:blobs})) { try{ await navigator.share({files:blobs, title: blobs[0].name}); Desktop_showOverlay('Shared ✓'); return; }catch(e){} } const url=URL.createObjectURL(blobs[0]); const a=document.createElement('a'); a.href=url; a.download=blobs[0].name; document.body.append(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },1000); Desktop_showOverlay('Exported ✓'); return; } else { alert('Multi-file ZIP export trimmed in this build. Select one file.'); } }catch(e){ alert('Export failed: '+e.message); } }
