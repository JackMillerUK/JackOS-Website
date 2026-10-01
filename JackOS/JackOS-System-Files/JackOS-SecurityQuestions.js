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
ready(()=>{ try{ const login=document.getElementById('login'); if(!login) return; const obs=new MutationObserver(()=>{ if(login.classList.contains('active')){ try{ const u=(window.currentUser)||(Users_all()[0]?.name)||''; if(!u || Users_find(u)?.guest) return; const already = localStorage.getItem('SecQ_prompted_'+u)==='true'; const exists = !!SecQ_get(u); if(!already && !exists){ SecQ_openSetupWizard(u); } }catch(e){} } }); obs.observe(login,{attributes:true}); }catch(e){} });

// ===== Recovery (3 answers)
window.SecQ_openRecovery = function(){ const dlg=document.getElementById('secqRecover'); if(!dlg) return; const sel=document.getElementById('secqRecoverUser'); sel.innerHTML=''; SecQ_users().filter(n=>{ const u=Users_find(n); return !u?.guest; }).forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o); }); if(!sel.options.length){ alert('Guest accounts do not use password recovery.'); return; } sel.onchange=SecQ_recoveryUpdate; SecQ_recoveryUpdate(); dlg.style.display='flex'; }
window.SecQ_closeRecovery = function(){ const d=document.getElementById('secqRecover'); if(d) d.style.display='none'; }
window.SecQ_recoveryUpdate = function(){ const u=document.getElementById('secqRecoverUser').value; const d=SecQ_get(u); const box=document.getElementById('secqRecoverQuestions'); if(!d){ box.innerHTML='<div>No security questions set for this user.</div>'; } else { box.innerHTML = `<div>Q1: ${d.q1||''}</div><div>Q2: ${d.q2||''}</div><div>Q3: ${d.q3||''}</div>`; } const m=document.getElementById('secqRecoverMsg'); if(m) m.textContent=''; ['secqAns1','secqAns2','secqAns3','secqNew1','secqNew2'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; }); }
window.SecQ_tryRecover = function(){ const u=document.getElementById('secqRecoverUser').value; const a1=document.getElementById('secqAns1').value, a2=document.getElementById('secqAns2').value, a3=document.getElementById('secqAns3').value; const np1=document.getElementById('secqNew1').value, np2=document.getElementById('secqNew2').value; const msg=document.getElementById('secqRecoverMsg'); const data=SecQ_get(u); if(!data){ msg.textContent='No security questions set for this user.'; return; } if(!a1||!a2||!a3){ msg.textContent='Please answer all three questions.'; return; } if(!SecQ_match3(u,a1,a2,a3)){ msg.textContent='One or more answers are incorrect.'; return; } if(!np1){ msg.textContent='Enter a new password.'; return; } if(np1!==np2){ msg.textContent='Passwords do not match.'; return; } const list=Users_all(); const idx=list.findIndex(x=>x && x.name===u); if(idx<0){ msg.textContent='User not found.'; return; } list[idx] = Object.assign({}, list[idx], {pass: np1}); Users_save(list); msg.style.color='#cfe9ff'; msg.textContent='Password reset \u2713'; setTimeout(()=>{ try{ SecQ_closeRecovery(); }catch(e){} }, 800); }

// ===== Settings: Manager button (Option C: Admin edits all; users edit only their own) =====
function SecQ_openSettings(
  target
){

  try{

    if(
      Users_find(target)?.guest
    ){
      return;
    }

    // Editing own questions
    if(
      typeof currentUser!=='undefined' &&
      currentUser===target
    ){

      Account_require(
        ()=>SecQM_openFor(target)
      );

      return;

    }

    // Editing another user
    if(
      isCurrentAdmin &&
      isCurrentAdmin()
    ){

      Admin_require(
        ()=>SecQM_openFor(target)
      );

      return;

    }

    Desktop_showOverlay(
      'Only admin can edit other accounts'
    );

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

// ===== Setup security questions for each account =====
let SetupSecQState = { accountIndex: 0, accountNames: [] };
function Setup_promptSecurityQuestions(){
  if(SetupSecQState.accountIndex < SetupSecQState.accountNames.length){
    const accountName = SetupSecQState.accountNames[SetupSecQState.accountIndex];
    alert(`Set up security questions for: ${accountName}`);
    SecQ_openSetupWizard(accountName);
  } else {
    show('login', true);
  }
}
function Setup_nextAccount(){
  SetupSecQState.accountIndex++;
  Setup_promptSecurityQuestions();
}




