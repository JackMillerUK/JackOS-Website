//JackOS-Browser.js
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
ready(()=>{ const q=(id)=>document.getElementById(id); q('browserBack').onclick=Browser_back; q('browserFwd').onclick=Browser_forward; q('browserRefresh').onclick=Browser_refresh; { const w=document.getElementById('browserWin'); const f=document.getElementById('browserFrame'); if(w) w.style.display='none'; if(f) f.src='about:blank'; }; const url=q('browserUrl'); if(url){ url.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); Browser_go(); }}); } });
