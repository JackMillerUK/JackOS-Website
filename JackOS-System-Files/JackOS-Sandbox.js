// JackOS Sandbox Emulator FOR PRO AND ELITE ONLY
let SE_CURRENT_VERSION = null;

function SE_makeReadOnlySandboxGuard(){
  return `
    <script>
      (function(){
        try {
          const protectStorage = (storage, fallback) => {
            const base = storage || fallback;
            return {
              getItem(key){
                try { return base.getItem(key); }
                catch(e) { return null; }
              },
              setItem(){ return undefined; },
              removeItem(){ return undefined; },
              clear(){ return undefined; },
              key(index){
                try { return base.key(index); }
                catch(e) { return null; }
              },
              get length(){
                try { return base.length || 0; }
                catch(e) { return 0; }
              }
            };
          };

          const liveLocal = window.localStorage || null;
          const liveSession = window.sessionStorage || null;

          const readOnlyLS = protectStorage(liveLocal, {
            getItem(){ return null; },
            setItem(){ return undefined; },
            removeItem(){ return undefined; },
            clear(){ return undefined; },
            key(){ return null; },
            get length(){ return 0; }
          });

          const readOnlySS = protectStorage(liveSession, {
            getItem(){ return null; },
            setItem(){ return undefined; },
            removeItem(){ return undefined; },
            clear(){ return undefined; },
            key(){ return null; },
            get length(){ return 0; }
          });

          Object.defineProperty(window, 'localStorage', {
            configurable: true,
            get: () => readOnlyLS
          });

          Object.defineProperty(window, 'sessionStorage', {
            configurable: true,
            get: () => readOnlySS
          });

          if (Storage && Storage.prototype) {
            const noWrite = function(){ return undefined; };
            Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value: noWrite });
            Object.defineProperty(Storage.prototype, 'removeItem', { configurable: true, value: noWrite });
            Object.defineProperty(Storage.prototype, 'clear', { configurable: true, value: noWrite });
          }
        } catch(e) {}

        try {
          const wrapHandle = (realHandle) => {
            const entry = {
              kind: (realHandle && realHandle.kind) || 'file',
              name: (realHandle && realHandle.name) || '',
              async getFile(){
                if (!realHandle || !realHandle.getFile) return new Blob();
                return await realHandle.getFile();
              },
              async createWritable(){
                return {
                  async write(){},
                  async truncate(){},
                  async seek(){},
                  async close(){},
                  async abort(){}
                };
              },
              async removeEntry(){ return undefined; },
              async getDirectoryHandle(name, options = {}) {
                try {
                  if (!realHandle || !realHandle.getDirectoryHandle) throw new Error('No directory handle');
                  const child = await realHandle.getDirectoryHandle(name, options);
                  return wrapHandle(child);
                } catch(e) {
                  if (options && options.create) {
                    return wrapHandle({
                      kind: 'directory',
                      name,
                      async values(){ return []; },
                      async getDirectoryHandle(){ throw new DOMException('Sandbox write blocked', 'NotAllowedError'); },
                      async getFileHandle(){ throw new DOMException('Sandbox write blocked', 'NotAllowedError'); }
                    });
                  }
                  throw e;
                }
              },
              async getFileHandle(name, options = {}) {
                try {
                  if (!realHandle || !realHandle.getFileHandle) throw new Error('No file handle');
                  const child = await realHandle.getFileHandle(name, options);
                  return wrapHandle(child);
                } catch(e) {
                  if (options && options.create) {
                    return wrapHandle({
                      kind: 'file',
                      name,
                      async getFile(){ return new Blob(); },
                      async createWritable(){
                        return {
                          async write(){},
                          async truncate(){},
                          async seek(){},
                          async close(){},
                          async abort(){}
                        };
                      }
                    });
                  }
                  throw e;
                }
              },
              async *values() {
                if (!realHandle || !realHandle.values) return;
                for await (const child of realHandle.values()) {
                  yield wrapHandle(child);
                }
              }
            };
            return entry;
          };

          if (navigator.storage && navigator.storage.getDirectory) {
            const realGetDirectory = navigator.storage.getDirectory.bind(navigator.storage);
            navigator.storage.getDirectory = async function(){
              const root = await realGetDirectory();
              return wrapHandle(root);
            };
          }
        } catch(e) {}
      })();
    </script>
  `;
}

async function SE_run(path){

  const version =
    window.SE_Data.versions.find(
      v => v.pathway === path
    );

  if(!version) return;

  SE_CURRENT_VERSION = version;

  const sandboxWindow =
    document.getElementById(
      "sandboxWindow"
    );

  const loader =
    document.getElementById(
      "sandboxLoader"
    );

  const loaderText =
    document.getElementById(
      "sandboxLoaderText"
    );

  if(loaderText)
    loaderText.textContent =
      "Launching " +
      version.version +
      "...";

  if(loader)
    loader.style.display =
      "flex";

  if(sandboxWindow)
    sandboxWindow.style.display =
      "block";

  const oldFrame =
    document.getElementById(
      "sandboxFrame"
    );

  const freshFrame =
    document.createElement(
      "iframe"
    );

  freshFrame.id =
    "sandboxFrame";

  freshFrame.setAttribute(
    "sandbox",
    "allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
  );

  freshFrame.setAttribute(
    "referrerpolicy",
    "no-referrer"
  );

  freshFrame.src =
    "about:blank";

  if(oldFrame && oldFrame.parentNode)
    oldFrame.parentNode.replaceChild(
      freshFrame,
      oldFrame
    );
  else if(sandboxWindow)
    sandboxWindow.appendChild(
      freshFrame
    );

  const pageUrl =
    "../JackOS-Server-Files/Sandbox-Emulator/" +
    path;

  try{

    const response =
      await fetch(pageUrl);

    const html =
      await response.text();

    freshFrame.srcdoc =
      SE_makeReadOnlySandboxGuard() +
      html;

  }catch(err){

    freshFrame.src =
      pageUrl;

  }

  setTimeout(()=>{

    if(loader)
      loader.style.display =
        "none";

    if(sandboxWindow)
      sandboxWindow.style.display =
        "block";

  },2500);

}


async function Settings_showSandbox(){

  const main =
    document.getElementById(
      "settingsMain"
    );

  const sandbox =
    document.getElementById(
      "settingsSandboxPanel"
    );

  if(main)
    main.style.display = "none";

  if(sandbox)
    sandbox.style.display = "block";

  await SE_open();

}

async function SE_open(){

  const content =
    document.getElementById(
      "sandboxContent"
    );

  if(content)
    content.innerHTML =
      "Loading versions...";

  try{

    const response =
      await fetch(
        "../JackOS-Server-Files/Sandbox-Emulator/JackOS-Versions.jkv"
      );

    if(!response.ok){

      content.innerHTML =
        "Failed to load version list.";

      return;
    }

    const text =
  await response.text();



const data =
  JSON.parse(text);


    let html =
      "<h4>Available Versions</h4>";

    data.versions.forEach(
      version => {

        html += `
          <button
            class="explorer-btn"
            style="display:block;margin-bottom:8px;"
            onclick="SE_showVersion('${version.version}')"
          >
            ${version.version}
          </button>
        `;

      }
    );

    content.innerHTML = html;

    window.SE_Data = data;

 }catch(err){

  content.innerHTML =
    "Failed to load Sandbox Emulator. Servers may be offline or JackOS isn't connected to the internet. Please try again later.";

  console.error(err);

}



}

function SE_showVersion(name){

  const version =
    window.SE_Data.versions.find(
      v => v.version === name
    );

  if(!version)
    return;

  const content =
    document.getElementById(
      "sandboxContent"
    );

  content.innerHTML = `

    <button
      class="explorer-btn ghost"
      onclick="SE_open()"
    >
      ← Back
    </button>

    <h3>${version.version}</h3>

    <p>
      ${version.description}
    </p>

    <p>
      Release Date:
      ${version.releaseDate}
    </p>

    <p style="
      color:#ffd66b;
      font-size:13px;
    ">
      Sandbox Notice:<br><br>

      Running old versions is safe.

      Changes made inside the
      Sandbox Emulator are not
      saved and will not affect
      your current JackOS
      installation.
    </p>

    <button
      class="explorer-btn"
      onclick="SE_run('${version.pathway}')"
    >
      Run
    </button>
  `;

}
// Sandbox Emulator Helpers

function SE_close(){

  document.getElementById(
    "sandboxLoaderText"
  ).textContent =
    "Closing " +
    (
      SE_CURRENT_VERSION
      ? SE_CURRENT_VERSION.version
      : "Sandbox"
    ) +
    "...";

  document.getElementById(
    "sandboxLoader"
  ).style.display =
    "flex";

  setTimeout(()=>{
document.getElementById(
  "sandboxLoader"
).style.display = "flex";

console.log("Loader shown");
    const frame =
      document.getElementById(
        "sandboxFrame"
      );

    frame.src =
      "about:blank";

    document.getElementById(
      "sandboxWindow"
    ).style.display =
      "none";

    document.getElementById(
      "sandboxLoader"
    ).style.display =
      "none";

    document.getElementById(
      "settingsWin"
    ).style.display =
      "block";

    if(SE_CURRENT_VERSION){

      SE_showVersion(
        SE_CURRENT_VERSION.version
      );

      SE_CURRENT_VERSION = null;
    }

  },2500);
}