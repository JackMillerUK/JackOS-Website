// Complete account backup and restore.
async function Backup_addDirectory(zip, dir, path){
  for await(const entry of dir.values()){
    const next=path+'/'+entry.name;
    if(entry.kind==='directory') await Backup_addDirectory(zip,entry,next);
    else zip.file(next,await (await entry.getFile()).arrayBuffer());
  }
}
function Backup_download(file){ const url=URL.createObjectURL(file); const link=document.createElement('a'); link.href=url; link.download=file.name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
function Backup_accountsForExport(){
  const panel=document.createElement('div'); panel.className='modal'; panel.style.display='flex';
  const shade=document.createElement('div'); shade.className='shade'; const box=document.createElement('div'); box.className='panel';
  box.innerHTML='<h3>Export account data</h3><p>Select the accounts and data to include.</p>'; const checks=document.createElement('div');
  Users_all().forEach(user=>{ const label=document.createElement('label'); label.style.display='block'; label.style.margin='8px 0'; const input=document.createElement('input'); input.type='checkbox'; input.checked=true; input.dataset.name=user.name; label.append(input,` ${user.name}${user.guest?' (Guest)':''}`); checks.append(label); });
  const adminTitle=document.createElement('h4'); adminTitle.textContent='Choose admins after import'; checks.append(adminTitle); Users_all().filter(user=>!user.guest).forEach(user=>{ const label=document.createElement('label'); label.style.display='block'; const input=document.createElement('input'); input.type='checkbox'; input.checked=user.role==='admin'; input.dataset.admin=user.name; label.append(input,` ${user.name} will be admin`); checks.append(label); });
  const actions=document.createElement('div'); actions.className='footer'; const cancel=document.createElement('button'); cancel.className='btn ghost'; cancel.textContent='Cancel'; const exportBtn=document.createElement('button'); exportBtn.className='btn'; exportBtn.textContent='Export ZIP'; actions.append(cancel,exportBtn); box.append(checks,actions); panel.append(shade,box); document.body.append(panel);
  const close=()=>panel.remove(); shade.onclick=close; cancel.onclick=close; 

  exportBtn.onclick = async()=>{

  const password = prompt(
    "Create a password for this JackOS backup.\n\n" +
    "You will need this password to restore it."
  );

  if(!password) return;

  const salt =
    crypto.getRandomValues(
      new Uint8Array(16)
    );

  const passwordHash =
    await Backup_sha256(
      password +
      Array.from(salt).join("-")
    );

  const selected =
    [...checks.querySelectorAll(
      'input[data-name]:checked'
    )]
      .map(input =>
        Users_find(input.dataset.name)
      )
      .filter(Boolean);

  const admins =
    new Set(
      [...checks.querySelectorAll(
        'input[data-admin]:checked'
      )]
      .map(input =>
        input.dataset.admin
      )
    );

  if(!selected.length){
    alert(
      "Select at least one account."
    );
    return;
  }

  if(
    !selected.some(
      user=>admins.has(user.name)
    )
  ){
    alert(
      "Select at least one admin included in the backup."
    );
    return;
  }

  close();

  await System_export(
    selected.map(user =>
      Object.assign(
        {},
        user,
        {
          role:
            admins.has(user.name)
              ? "admin"
              : "user"
        }
      )
    ),
    passwordHash,
    salt
  );
};

}
function System_exportPrompt(){ Admin_requireStrict(Backup_accountsForExport); }

async function System_export(
  accounts,
  passwordHash,
  salt
){
  try{

    const zip =
      new JSZip();

    const selectedNames =
      new Set(
        accounts.map(
          user=>user.name
        )
      );

    const questions = {};

    selectedNames.forEach(name=>{

      const value =
        localStorage.getItem(
          "SecQ:"+name
        );

      if(value){
        questions[name] =
          JSON.parse(value);
      }

    });

    const localStorageDump =
      {};

    for(
      let i=0;
      i<localStorage.length;
      i++
    ){
      const key =
        localStorage.key(i);

      localStorageDump[key] =
        localStorage.getItem(key);
    }

    const manifest = {

      jackos:
        "JackOS System Backup ZIP",

      version:
        JACKOS_VERSION,

      created:
        new Date()
          .toISOString(),

      edition:
        JACKOS_EDITION,

      protection:{
        passwordHash,
        salt:
          Array.from(salt)
      },

      wallpaper:
        exportWallpaperSettings(),

      securityQuestions:
        questions,

      accounts:
        accounts.map(user=>({

          name:user.name,

          pass:
            user.pass||"",

          role:
            user.guest
              ? "user"
              : user.role,

          guest:
            !!user.guest

        }))
    };

    zip.file(
      "manifest.json",
      JSON.stringify(
        manifest,
        null,
        2
      )
    );

    zip.file(
      "localstorage.json",
      JSON.stringify(
        localStorageDump,
        null,
        2
      )
    );

    for(
      const user of accounts
    ){

      const dir =
        await UserData_dir(
          user.name
        );

      await Backup_addDirectory(
        zip,
        dir,
        "accounts/"
        +
        UserData_key(
          user.name
        )
      );

    }

    const blob =
      await zip.generateAsync({
        type:"blob"
      });

    Backup_download(
      new File(
        [blob],
        "JackOS-System-Backup.zip",
        {
          type:
            "application/zip"
        }
      )
    );

    Desktop_showOverlay(
      "System backup exported ✓"
    );

  }catch(e){

    alert(
      "System export failed: "
      +
      e.message
    );

  }
}
function System_import(){ Admin_requireStrict(()=>document.getElementById('systemImportInput')?.click()); }
async function Backup_writeDirectory(zip, archivePath, destinationPath, root){ const parts=destinationPath.split('/').filter(Boolean); const fileName=parts.pop(); let dir=root; for(const part of parts) dir=await dir.getDirectoryHandle(part,{create:true}); const handle=await dir.getFileHandle(fileName,{create:true}); const writable=await handle.createWritable(); await writable.write(await zip.file(archivePath).async('arraybuffer')); await writable.close(); }
async function Backup_restore(file){
  const zip=await JSZip.loadAsync(file); const manifestPath=Object.keys(zip.files).find(path=>!zip.files[path].dir&&path.split('/').pop().toLowerCase()==='manifest.json'); const manifestFile=manifestPath&&zip.file(manifestPath); if(!manifestFile) throw new Error('This ZIP is not a JackOS system backup.'); const manifest=JSON.parse(await manifestFile.async('text'));


if(
  manifest.jackos !==
  "JackOS System Backup ZIP"
){
  throw new Error(
    "This ZIP is not a JackOS system backup."
  );
}

if(
  !Array.isArray(
    manifest.accounts
  )
){
  throw new Error(
    "Backup account data is missing."
  );
}



const archiveRoot =
  manifestPath.slice(
    0,
    manifestPath.lastIndexOf('/')+1
  );

  
  if(
  manifest.version
  !==
  JACKOS_VERSION
){

  alert(

    "Import cancelled.\n\n"

    +

    "The imported version is:\n\n"

    +

    manifest.version

    +

    "\n\nThe running version is:\n\n"

    +

    JACKOS_VERSION

    +

    "\n\nVersions must match."

  );

  return;
}
const importedEdition =
  manifest.edition || "Home";

const currentEdition =
  JACKOS_EDITION || "Home";

const currentRank =
  EDITION_ORDER[currentEdition] || 0;

const importRank =
  EDITION_ORDER[importedEdition] || 0;

if(importRank > currentRank){

  const ok = confirm(

    "About to upgrade edition.\n\n" +

    "Current edition: " +
    currentEdition +

    "\nImported edition: " +
    importedEdition +

    "\n\nThis backup will ADD:\n\n• " +

    Edition_features(
      importedEdition
    ).join("\n• ") +

    "\n\nContinue?"

  );

  if(!ok) return;
}
if(importRank < currentRank){

  const ok = confirm(

    "About to downgrade edition.\n\n" +

    "Current edition: " +
    currentEdition +

    "\nImported edition: " +
    importedEdition +

    "\n\nThis backup will REMOVE:\n\n• " +

    Edition_features(
      currentEdition
    ).join("\n• ") +

    "\n\nContinue?"

  );

  if(!ok) return;
}
const overwrite = confirm(

  "This will erase ALL data and replace it with the backup.\n\n" +

  "Continue?"

);

if(!overwrite) return;
const password =
  prompt(
    "Enter backup password:"
  );

if(!password) return;
const hash =
  await Backup_sha256(

    password +

    manifest.protection.salt.join("-")

  );

if(
  hash !==
  manifest.protection.passwordHash
){
  alert(
    "Incorrect backup password."
  );
  return;
}
if(
  !confirm(

    "Are you sure?\n\n" +

    "JackOS will be completely replaced."

  )
){
  return;
}
const localStorageFile =
  zip.file(
    archiveRoot +
    "localstorage.json"
  ) ||
  zip.file(
    "localstorage.json"
  );

if(!localStorageFile){

  throw new Error(
    "Backup contains no localstorage.json"
  );

}

const localData =
  JSON.parse(
    await localStorageFile.async(
      "text"
    )
  );


await Backup_clearOPFS();

try{
  await navigator.storage.persist?.();
}catch(e){}

/* Recreate JackOSDrive after wipe */
try{
  const root =
    await navigator.storage.getDirectory();

  await root.getDirectoryHandle(
    "JackOSDrive",
    { create:true }
  );
}catch(e){}

localStorage.clear();


for(
  const [key,value]
  of Object.entries(
    localData
  )
){
  localStorage.setItem(
    key,
    value
  );
}
JACKOS_EDITION =
  localStorage.getItem(
    "jackosEdition"
  );

Desktop_UpdateEditionFeatures?.();
for(const incoming of manifest.accounts){

  const root =
    await UserData_dir(
      incoming.name
    );

  const prefix =
    archiveRoot +
    "accounts/" +
    UserData_key(
      incoming.name
    ) +
    "/";

  for(
    const path
    of Object.keys(
      zip.files
    )
  ){

    if(
      path.startsWith(prefix)
      &&
      !zip.files[path].dir
    ){

      await Backup_writeDirectory(
        zip,
        path,
        path.slice(
          prefix.length
        ),
        root
      );

    }

  }

}



alert(
  "System restored.\n\nJackOS will restart."
);

location.reload();






  
  
}
ready(()=>{ const input=document.getElementById('systemImportInput'); if(input) input.addEventListener('change',async()=>{ const file=input.files?.[0]; input.value=''; if(!file) return; try{ await Backup_restore(file); }catch(e){ alert('System import failed: '+e.message); } }); });
function exportWallpaperSettings(){ return {wallpaper:localStorage.getItem('jackosWallpaper'),wallpaperData:localStorage.getItem('jackosWallpaperData')}; }
function importWallpaperSettings(data){ if(!data) return; if(data.wallpaper===null) localStorage.removeItem('jackosWallpaper'); else localStorage.setItem('jackosWallpaper',data.wallpaper); if(data.wallpaperData===null) localStorage.removeItem('jackosWallpaperData'); else localStorage.setItem('jackosWallpaperData',data.wallpaperData); }
function exportSecurityQuestions(){ const out={}; Users_all().forEach(user=>{ const value=localStorage.getItem('SecQ:'+user.name); if(value) out[user.name]=JSON.parse(value); }); return out; }
function importSecurityQuestions(data){ Object.entries(data||{}).forEach(([name,value])=>localStorage.setItem('SecQ:'+name,JSON.stringify(value))); }
function Edition_IsPro(){ return JACKOS_EDITION==='Pro'; }
function Edition_IsPrivateOrPro(){ return JACKOS_EDITION==='Private'||JACKOS_EDITION==='Pro'; }
function Desktop_UpdateEditionFeatures(){ const btn=document.getElementById('serverTestBtn'); if(btn) btn.style.display=Edition_IsPrivateOrPro()?'block':'none'; document.querySelectorAll('[data-app="music"]').forEach(item=>item.style.display=Edition_IsPrivateOrPro()?'':'none'); }
async function JackOS_TestConnection(){ if(!Edition_IsPrivateOrPro()) return; try{ const response=await fetch('../JackOS-Server-Files/connection.md'); if(!response.ok) throw new Error(); alert((await response.text()).trim()||'Connection seems to be offline.'); }catch(e){ alert('Connection seems to be offline.'); } }


// SHA-256 Helper

async function Backup_sha256(str){

  const buf =
    new TextEncoder()
      .encode(str);

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      buf
    );

  return Array
    .from(new Uint8Array(hash))
    .map(b =>
      b.toString(16)
        .padStart(2,"0")
    )
    .join("");
}
// Edition Helpers

const EDITION_ORDER = {

  Home:1,

  Private:2,

  Pro:3

};
function Edition_features(
  edition
){

  switch(edition){

    case "Private":

      return [

        "JackOS Server",

        "Music App"

      ];

    case "Pro":

      return [

        "JackOS Server",

        "Music App",

        "Pro Features"

      ];

    default:

      return [];

  }

}
// OPFS Wiper
async function Backup_clearOPFS(){

  const root =
    await navigator.storage
      .getDirectory();

  for await(
    const entry
    of root.values()
  ){

    try{

      await root.removeEntry(
        entry.name,
        {
          recursive:true
        }
      );

    }catch(e){}

  }

}


