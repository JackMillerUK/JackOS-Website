//JackOS-Calculator.js
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
  document.addEventListener('keydown', (e)=>{ const win=document.getElementById('calcApp'); if(!win || win.style.display==='none') return; if(JackOS_shouldIgnoreGlobalKey(e)) return; const key=e.key; if(/^[0-9]$/.test(key)){ Calculator_inputDigit(key); } else if(key==='.'||key===','){ Calculator_inputDot(); } else if(key==='+'||key==='-'||key==='*'||key==='x'||key==='X'||key==='×'){ Calculator_setOp('+'.includes(key)? '+' : (key==='-'? '-' : (key==='*'||key==='x'||key==='X'||key==='×'? '×' : key))); } else if(key==='/'||key==='÷'){ Calculator_setOp('÷'); } else if(key==='Enter'||key==='='){ e.preventDefault(); Calculator_compute(); } else if(key==='Backspace'){ Calculator_backspace(); } else if(key.toLowerCase()==='c'){ Calculator_clear(); } Calculator_render(); });
});

