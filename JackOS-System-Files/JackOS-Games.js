//JackOS-Games.js
// ===== Games =====
const GAME_SCORE_KEY = 'jackos_game_scores_v1';
const GAME_SCORE_FILE = 'jackos-scores.json';

function JackOS_isTypingTarget(target){
  if(!target) return false;
  if(target.isContentEditable) return true;
  const tag = target.tagName && target.tagName.toLowerCase();
  return !!(tag && ['input','textarea','select'].includes(tag));
}

function JackOS_shouldIgnoreGlobalKey(e){
  if(!e || typeof e.target === 'undefined') return false;
  const target = e.target;
  if(target && target.closest && target.closest('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]')) return true;
  const active = document.activeElement;
  return !!(active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable));
}

function JackOS_normalizeScoreObject(obj){
  const safe = { flappy: 0, tetris: 0 };
  if(!obj || typeof obj !== 'object') return safe;
  safe.flappy = Number(obj.flappy) || 0;
  safe.tetris = Number(obj.tetris) || 0;
  if(!Number.isFinite(safe.flappy)) safe.flappy = 0;
  if(!Number.isFinite(safe.tetris)) safe.tetris = 0;
  return safe;
}

async function JackOS_gameScoresDir(){
  if(!(navigator.storage && navigator.storage.getDirectory)) return null;
  try{
    return await UserData_dir();
  }catch(e){ return null; }
}

async function JackOS_readStoredScores(){
  let merged = { flappy: 0, tetris: 0 };
  try{
    const raw = localStorage.getItem(GAME_SCORE_KEY+':'+UserData_key());
    if(raw){ merged = JackOS_normalizeScoreObject(JSON.parse(raw)); }
  }catch(e){}

  try{
    const dir = await JackOS_gameScoresDir();
    if(!dir) return merged;
    try{
      const fileHandle = await dir.getFileHandle(GAME_SCORE_FILE, { create: false });
      const file = await fileHandle.getFile();
      const text = await file.text();
      const parsed = JackOS_normalizeScoreObject(JSON.parse(text));
      merged.flappy = Math.max(merged.flappy, parsed.flappy);
      merged.tetris = Math.max(merged.tetris, parsed.tetris);
    }catch(e){}
  }catch(e){}

  return merged;
}

async function JackOS_writeStoredScores(data){
  const safe = JackOS_normalizeScoreObject(data);
  try{ localStorage.setItem(GAME_SCORE_KEY+':'+UserData_key(), JSON.stringify(safe)); }catch(e){}
  try{
    const dir = await JackOS_gameScoresDir();
    if(!dir) return safe;
    const fileHandle = await dir.getFileHandle(GAME_SCORE_FILE, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(safe));
    await writable.close();
  }catch(e){ console.warn('Game score save failed', e); }
  return safe;
}

const GAMES=[
  {id:'flappy', name:'Flappy Bird', icon:'🐦', open:Flappy_open},
  {id:'tetris', name:'Tetris', icon:'🧩', open:Tetris_open},
  {id:'snake', name:'Snake', icon:'🐍', open:Snake_open}
];
function Games_open(){ const app=document.getElementById('gamesApp'); if(!app) return; app.style.display='block'; Games_render(); }
function Games_close(){ const app=document.getElementById('gamesApp'); if(app) app.style.display='none'; }
function Games_render(){ const list=document.getElementById('gamesList'); if(!list) return; list.innerHTML=''; GAMES.forEach(game=>{ const row=document.createElement('div'); row.className='game-launch-row'; row.innerHTML=`<span class="game-launch-icon">${game.icon}</span><span class="game-launch-name">${game.name}</span>`; const run=document.createElement('button'); run.className='explorer-btn'; run.textContent='Run'; run.onclick=()=>{ Games_close(); game.open(); }; row.appendChild(run); list.appendChild(row); }); }

// ===== Flappy Bird =====
const FlappyState = { canvas: null, ctx: null, bird: { x: 80, y: 220, size: 16, velocity: 0 }, pipes: [], score: 0, best: 0, started: false, running: true, gameOver: false, lastTime: 0, spawnTimer: 0 };
function Flappy_updateScoreLabel(){ const el=document.getElementById('flappyScore'); if(!el) return; el.textContent='Score: '+FlappyState.score+' • Best: '+FlappyState.best; }
async function Flappy_loadHighScore(){ const scores=await JackOS_readStoredScores(); FlappyState.best = Math.max(0, Number(scores.flappy)||0); Flappy_updateScoreLabel(); }
function Flappy_commitHighScore(){ const nextBest=Math.max(FlappyState.best, FlappyState.score); FlappyState.best = nextBest; Flappy_updateScoreLabel(); void JackOS_writeStoredScores({ flappy: FlappyState.best, tetris: TetrisState.best || 0 }); }
function Flappy_open(){ const win=document.getElementById('flappyApp'); if(win) win.style.display='block'; Flappy_reset(); }
function Flappy_close(){ const win=document.getElementById('flappyApp'); if(win) win.style.display='none'; FlappyState.running=false; }
function Flappy_reset(){ const state=FlappyState; state.bird.x=80; state.bird.y=220; state.bird.velocity=0; state.pipes=[]; state.score=0; state.started=false; state.running=true; state.gameOver=false; state.spawnTimer=0; Flappy_updateScoreLabel(); Flappy_draw(); }
function Flappy_jump(){ const state=FlappyState; if(state.gameOver){ Flappy_reset(); } if(!state.started){ state.started=true; } state.running=true; state.bird.velocity=-6.5; }
function Flappy_drawCloud(ctx,x,y,scale){ ctx.fillStyle='rgba(255,255,255,.72)'; ctx.beginPath(); ctx.arc(x,y,18*scale,0,Math.PI*2); ctx.arc(x+22*scale,y-8*scale,24*scale,0,Math.PI*2); ctx.arc(x+50*scale,y,17*scale,0,Math.PI*2); ctx.fill(); }
function Flappy_drawBird(ctx,state){ const tilt=Math.max(-0.45,Math.min(0.7,state.bird.velocity*.055)); ctx.save(); ctx.translate(state.bird.x,state.bird.y); ctx.rotate(tilt); ctx.shadowColor='rgba(0,0,0,.25)'; ctx.shadowBlur=5; ctx.fillStyle='#f6c945'; ctx.beginPath(); ctx.ellipse(0,0,18,14,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; ctx.fillStyle='#e7aa24'; ctx.beginPath(); ctx.ellipse(-4,7,11,6+Math.abs(Math.sin(performance.now()/100))*3,-.25,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(9,-7,6,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#1e2430'; ctx.beginPath(); ctx.arc(11,-7,2.5,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#f07b43'; ctx.beginPath(); ctx.moveTo(16,-1); ctx.lineTo(29,3); ctx.lineTo(16,7); ctx.closePath(); ctx.fill(); ctx.strokeStyle='#c57d20'; ctx.lineWidth=1.5; ctx.stroke(); ctx.restore(); }
function Flappy_drawPipe(ctx,canvas,pipe){ const gradient=ctx.createLinearGradient(pipe.x,0,pipe.x+pipe.width,0); gradient.addColorStop(0,'#43a447'); gradient.addColorStop(.45,'#83d45b'); gradient.addColorStop(1,'#277638'); ctx.fillStyle=gradient; ctx.fillRect(pipe.x,0,pipe.width,pipe.top); ctx.fillRect(pipe.x,pipe.bottomY,pipe.width,canvas.height-pipe.bottomY); ctx.fillStyle='#9bea69'; ctx.fillRect(pipe.x-5,pipe.top-15,pipe.width+10,15); ctx.fillRect(pipe.x-5,pipe.bottomY,pipe.width+10,15); ctx.strokeStyle='rgba(18,83,39,.7)'; ctx.lineWidth=2; ctx.strokeRect(pipe.x,0,pipe.width,pipe.top); ctx.strokeRect(pipe.x,pipe.bottomY,pipe.width,canvas.height-pipe.bottomY); }
function Flappy_draw(){ const state=FlappyState; const ctx=state.ctx; const canvas=state.canvas; if(!ctx || !canvas) return; ctx.clearRect(0,0,canvas.width,canvas.height); const sky=ctx.createLinearGradient(0,0,0,canvas.height); sky.addColorStop(0,'#57b9ed'); sky.addColorStop(.72,'#c9f1ff'); sky.addColorStop(1,'#efffc9'); ctx.fillStyle=sky; ctx.fillRect(0,0,canvas.width,canvas.height); Flappy_drawCloud(ctx,58,74,0.8); Flappy_drawCloud(ctx,268,126,0.55); state.pipes.forEach(pipe=>Flappy_drawPipe(ctx,canvas,pipe)); ctx.fillStyle='#d7ffb0'; ctx.fillRect(0,canvas.height-70,canvas.width,70); ctx.fillStyle='#9ed45e'; ctx.fillRect(0,canvas.height-70,canvas.width,6); ctx.fillStyle='#72bd49'; for(let x=0;x<canvas.width;x+=18){ ctx.beginPath(); ctx.moveTo(x,canvas.height-64); ctx.lineTo(x+9,canvas.height-70); ctx.lineTo(x+18,canvas.height-64); ctx.fill(); } Flappy_drawBird(ctx,state); if(!state.started){ ctx.fillStyle='rgba(0,0,0,0.46)'; ctx.fillRect(70,165,220,110); ctx.fillStyle='#fff'; ctx.font='bold 24px sans-serif'; ctx.fillText('Tap to start',96,225); } if(state.gameOver){ ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#fff'; ctx.font='bold 26px sans-serif'; ctx.fillText('Game Over',100,185); ctx.font='18px sans-serif'; ctx.fillText('Score: '+state.score,110,220); ctx.fillText('High: '+state.best,110,248); } }
function Flappy_step(dt){ const state=FlappyState; if(!state.running || !state.started) return; state.bird.velocity += 0.42 * dt; state.bird.y += state.bird.velocity * dt; state.spawnTimer += dt; if(state.spawnTimer > 76){ state.spawnTimer = 0; const gap = 85 + Math.random()*85 + (state.score > 10 ? 10 : 0); const top = 30 + Math.random()*140 + (Math.random() > 0.5 ? 25 : -20); const safeTop = Math.max(24, Math.min(top, 250)); state.pipes.push({ x: 360, width: 54, top: safeTop, bottomY: safeTop + gap }); } for(let i=state.pipes.length-1;i>=0;i--){ const pipe=state.pipes[i]; pipe.x -= 2.9 * dt; if(pipe.x + pipe.width < 0){ state.pipes.splice(i,1); state.score += 1; Flappy_updateScoreLabel(); continue; } const insideX = state.bird.x + state.bird.size > pipe.x && state.bird.x - state.bird.size < pipe.x + pipe.width; const hitsTop = state.bird.y - state.bird.size < pipe.top; const hitsBottom = state.bird.y + state.bird.size > pipe.bottomY; if(insideX && (hitsTop || hitsBottom)){ state.running = false; state.gameOver = true; Flappy_commitHighScore(); return; } } if(state.bird.y - state.bird.size < 0 || state.bird.y + state.bird.size > 430){ state.running = false; state.gameOver = true; Flappy_commitHighScore(); return; } }
function Flappy_loop(ts){ const win=document.getElementById('flappyApp'); if(!win || win.style.display === 'none'){ requestAnimationFrame(Flappy_loop); return; } const dt = Math.min((ts - (FlappyState.lastTime || ts))/16.666, 2); FlappyState.lastTime = ts; Flappy_step(dt); Flappy_draw(); requestAnimationFrame(Flappy_loop); }
ready(()=>{
  const canvas=document.getElementById('flappyCanvas'); if(!canvas) return;
  FlappyState.canvas=canvas; FlappyState.ctx=canvas.getContext('2d');
  canvas.addEventListener('pointerdown', Flappy_jump);
  document.addEventListener('keydown', (e)=>{ const app=document.getElementById('flappyApp'); if(!app || app.style.display==='none') return; if(JackOS_shouldIgnoreGlobalKey(e)) return; if([' ', 'ArrowUp', 'w', 'W'].includes(e.key)){ e.preventDefault(); Flappy_jump(); } });
  Flappy_loadHighScore();
  Flappy_draw();
  requestAnimationFrame(Flappy_loop);
});

// ===== Tetris =====
const TETROMINOES = [
  { color: '#7ee2ff', matrix: [[1,1,1,1]] },
  { color: '#f8d35a', matrix: [[1,1],[1,1]] },
  { color: '#ff7f7f', matrix: [[1,1,0],[0,1,1]] },
  { color: '#8af7a2', matrix: [[0,1,1],[1,1,0]] },
  { color: '#c88dff', matrix: [[1,0,0],[1,1,1]] },
  { color: '#ff97d4', matrix: [[0,0,1],[1,1,1]] },
  { color: '#ffbd69', matrix: [[0,1,0],[1,1,1]] }
];
const TetrisState = { canvas: null, ctx: null, board: [], piece: null, score: 0, best: 0, gameOver: false, dropTimer: 0, lastTime: 0 };
function Tetris_refreshScore(){ const el=document.getElementById('tetrisScore'); if(!el) return; el.textContent='Score: '+TetrisState.score+' • Best: '+TetrisState.best; }
async function Tetris_loadHighScore(){ const scores=await JackOS_readStoredScores(); TetrisState.best = Math.max(0, Number(scores.tetris)||0); Tetris_refreshScore(); }
function Tetris_commitHighScore(){ const nextBest=Math.max(TetrisState.best, TetrisState.score); TetrisState.best = nextBest; Tetris_refreshScore(); void JackOS_writeStoredScores({ flappy: FlappyState.best || 0, tetris: TetrisState.best }); }
function Tetris_open(){ const win=document.getElementById('tetrisApp'); if(win) win.style.display='block'; Tetris_restart(); }
function Tetris_close(){ const win=document.getElementById('tetrisApp'); if(win) win.style.display='none'; }
function Tetris_restart(){ const state=TetrisState; state.board=Array.from({length:20},()=>Array(10).fill(0)); state.score=0; state.gameOver=false; state.dropTimer=0; Tetris_refreshScore(); Tetris_spawn(); Tetris_draw(); }
function Tetris_spawn(){ const piece = TETROMINOES[Math.floor(Math.random()*TETROMINOES.length)]; TetrisState.piece = { x: 3, y: 0, color: piece.color, matrix: piece.matrix.map(row => row.slice()) }; if(!Tetris_canMove(0,0,TetrisState.piece.matrix)){ TetrisState.gameOver=true; Tetris_commitHighScore(); } }
function Tetris_canMove(dx, dy, matrix = TetrisState.piece?.matrix){ const piece=TetrisState.piece; if(!piece || !matrix) return false; for(let y=0;y<matrix.length;y++){ for(let x=0;x<matrix[y].length;x++){ if(!matrix[y][x]) continue; const nx = piece.x + x + dx; const ny = piece.y + y + dy; if(nx < 0 || nx >= 10 || ny >= 20) return false; if(ny >= 0 && TetrisState.board[ny][nx]) return false; } } return true; }
function Tetris_rotate(){ const state=TetrisState; if(!state.piece || state.gameOver) return; const rotated = state.piece.matrix[0].map((_, idx) => state.piece.matrix.map(row => row[idx]).reverse()); if(Tetris_canMove(0,0,rotated)){ state.piece.matrix = rotated; } }
function Tetris_move(dx, dy){ const state=TetrisState; if(!state.piece || state.gameOver) return; if(Tetris_canMove(dx, dy)){ state.piece.x += dx; state.piece.y += dy; return true; } if(dy > 0){ Tetris_merge(); } return false; }
function Tetris_merge(){ const state=TetrisState; if(!state.piece) return; for(let y=0;y<state.piece.matrix.length;y++){ for(let x=0;x<state.piece.matrix[y].length;x++){ if(!state.piece.matrix[y][x]) continue; const boardY = state.piece.y + y; const boardX = state.piece.x + x; if(boardY >= 0) state.board[boardY][boardX] = state.piece.color; } } let cleared = 0; for(let y=state.board.length-1; y>=0; y--){ if(state.board[y].every(Boolean)){ state.board.splice(y,1); state.board.unshift(Array(10).fill(0)); cleared += 1; y++; } } if(cleared){ state.score += cleared * 100; Tetris_commitHighScore(); } Tetris_spawn(); }
function Tetris_draw(){ const state=TetrisState; const ctx=state.ctx; const canvas=state.canvas; if(!ctx || !canvas) return; ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#111827'; ctx.fillRect(0,0,canvas.width,canvas.height); for(let y=0;y<state.board.length;y++){ for(let x=0;x<state.board[y].length;x++){ if(state.board[y][x]){ ctx.fillStyle=state.board[y][x]; ctx.fillRect(x*30+1, y*30+1, 28, 28); } } } if(state.piece){ for(let y=0;y<state.piece.matrix.length;y++){ for(let x=0;x<state.piece.matrix[y].length;x++){ if(!state.piece.matrix[y][x]) continue; const px = (state.piece.x + x) * 30; const py = (state.piece.y + y) * 30; ctx.fillStyle=state.piece.color; ctx.fillRect(px+1, py+1, 28, 28); } } } if(state.gameOver){ ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#fff'; ctx.font='bold 24px sans-serif'; ctx.fillText('Game Over', 70, 260); ctx.font='18px sans-serif'; ctx.fillText('Score: '+state.score, 95, 292); ctx.fillText('High: '+state.best, 95, 318); } }
function Tetris_step(dt){ const state=TetrisState; if(state.gameOver) return; state.dropTimer += dt; if(state.dropTimer >= 26){ state.dropTimer = 0; Tetris_move(0,1); } }
function Tetris_loop(ts){ const win=document.getElementById('tetrisApp'); if(!win || win.style.display === 'none'){ requestAnimationFrame(Tetris_loop); return; } const dt = Math.min((ts - (TetrisState.lastTime || ts))/16.666, 2); TetrisState.lastTime = ts; Tetris_step(dt); Tetris_draw(); requestAnimationFrame(Tetris_loop); }
ready(()=>{
  const canvas=document.getElementById('tetrisCanvas'); if(!canvas) return; TetrisState.canvas=canvas; TetrisState.ctx=canvas.getContext('2d'); Tetris_loadHighScore(); Tetris_restart(); document.addEventListener('keydown', (e)=>{ const app=document.getElementById('tetrisApp'); if(!app || app.style.display==='none') return; if(JackOS_shouldIgnoreGlobalKey(e)) return; const key=e.key; if(key==='ArrowLeft' || key==='a' || key==='A'){ Tetris_move(-1,0); } else if(key==='ArrowRight' || key==='d' || key==='D'){ Tetris_move(1,0); } else if(key==='ArrowDown' || key==='s' || key==='S'){ Tetris_move(0,1); } else if(key==='ArrowUp' || key==='w' || key==='W'){ Tetris_rotate(); } else if(key===' '){ e.preventDefault(); Tetris_move(0,1); } Tetris_draw(); }); requestAnimationFrame(Tetris_loop); });

// ===== Snake =====
const SnakeState = { canvas: null, ctx: null, grid: 18, snake: [], dir: {x:1,y:0}, nextDir: {x:1,y:0}, food: {x:8,y:8}, score: 0, running: true, lastTime: 0, accumulator: 0, tickMs: 140 };
function Snake_open(){ const win=document.getElementById('snakeApp'); if(win) win.style.display='block'; Snake_restart(); }
function Snake_close(){ const win=document.getElementById('snakeApp'); if(win) win.style.display='none'; }
function Snake_restart(){ SnakeState.snake = [{x:7,y:9},{x:6,y:9},{x:5,y:9}]; SnakeState.dir={x:1,y:0}; SnakeState.nextDir={x:1,y:0}; SnakeState.score=0; SnakeState.running=true; SnakeState.accumulator=0; SnakeState.food = { x: 12, y: 8 }; const score=document.getElementById('snakeScore'); if(score) score.textContent='Score: 0'; Snake_draw(); }
function Snake_draw(){ const state=SnakeState; const ctx=state.ctx; const canvas=state.canvas; if(!ctx || !canvas) return; ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#0c1b10'; ctx.fillRect(0,0,canvas.width,canvas.height); for(const seg of state.snake){ ctx.fillStyle='#8cf79d'; ctx.fillRect(seg.x*state.grid+2, seg.y*state.grid+2, state.grid-4, state.grid-4); } ctx.fillStyle='#ff5f5f'; ctx.fillRect(state.food.x*state.grid+3, state.food.y*state.grid+3, state.grid-6, state.grid-6); if(!state.running){ ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#fff'; ctx.font='bold 22px sans-serif'; ctx.fillText('Game Over', 96, 185); } }
function Snake_step(){ const state=SnakeState; if(!state.running) return; state.dir = state.nextDir; const head = { x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y }; const outside = head.x < 0 || head.y < 0 || head.x >= 20 || head.y >= 20; const selfHit = state.snake.some(seg => seg.x === head.x && seg.y === head.y); if(outside || selfHit){ state.running = false; Snake_draw(); return; } state.snake.unshift(head); if(head.x === state.food.x && head.y === state.food.y){ state.score += 10; const score=document.getElementById('snakeScore'); if(score) score.textContent='Score: '+state.score; state.food = { x: Math.floor(Math.random()*20), y: Math.floor(Math.random()*20) }; } else { state.snake.pop(); } }
function Snake_loop(ts){ const win=document.getElementById('snakeApp'); if(!win || win.style.display === 'none'){ requestAnimationFrame(Snake_loop); return; } if(!SnakeState.lastTime){ SnakeState.lastTime = ts; } const delta = ts - SnakeState.lastTime; SnakeState.lastTime = ts; SnakeState.accumulator += delta; while(SnakeState.accumulator >= SnakeState.tickMs && SnakeState.running){ Snake_step(); SnakeState.accumulator -= SnakeState.tickMs; } Snake_draw(); requestAnimationFrame(Snake_loop); }
ready(()=>{
  const canvas=document.getElementById('snakeCanvas'); if(!canvas) return; SnakeState.canvas=canvas; SnakeState.ctx=canvas.getContext('2d'); Snake_restart(); document.addEventListener('keydown', (e)=>{ const app=document.getElementById('snakeApp'); if(!app || app.style.display==='none') return; if(JackOS_shouldIgnoreGlobalKey(e)) return; const key=e.key.toLowerCase(); if(['arrowup','w'].includes(key)){ e.preventDefault(); if(!(SnakeState.dir.y === 1 && SnakeState.dir.x === 0)) SnakeState.nextDir={x:0,y:-1}; } else if(['arrowdown','s'].includes(key)){ e.preventDefault(); if(!(SnakeState.dir.y === -1 && SnakeState.dir.x === 0)) SnakeState.nextDir={x:0,y:1}; } else if(['arrowleft','a'].includes(key)){ e.preventDefault(); if(!(SnakeState.dir.x === 1 && SnakeState.dir.y === 0)) SnakeState.nextDir={x:-1,y:0}; } else if(['arrowright','d'].includes(key)){ e.preventDefault(); if(!(SnakeState.dir.x === -1 && SnakeState.dir.y === 0)) SnakeState.nextDir={x:1,y:0}; } else if(key===' '){ e.preventDefault(); Snake_restart(); } }); requestAnimationFrame(Snake_loop); });

