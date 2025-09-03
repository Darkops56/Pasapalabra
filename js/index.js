const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const strip = s => s
  .toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .trim();

const capitalizeName = (name) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";
//#region ¡Preguntas! 
const QUESTIONS = [
  {letra: "A", respuesta: ["algoritmo", "algorithm"], pista: "Conjunto de instrucciones que ofrecen una solución"},
  {letra: "B", respuesta: ["bug"], pista: "Error en un programa."},
  {letra: "C", respuesta: ["codigo", "code"], pista: "Instrucciones para que la computadora entienda."},
  {letra: "D", respuesta: ["dato", "datos", "data"], pista: "Información que usamos en la computadora."},
  {letra: "E", respuesta: ["error"], pista: "Lo que aparece cuando algo está mal en el programa."},
  {letra: "F", respuesta: ["funcion", "function"], pista: "Bloque de código que realiza una tarea."},
  {letra: "G", respuesta: ["gigabyte", "gb"], pista: "Unidad para medir memoria, más grande que MB."},
  {letra: "H", respuesta: ["hardware", "hw"], pista: "Partes físicas de la computadora."},
  {letra: "I", respuesta: ["internet"], pista: "Red gigante que conecta computadoras."},
  {letra: "J", respuesta: ["javascript", "js"], pista: "Lenguaje muy usado en páginas web."},
  {letra: "K", respuesta: ["kilobyte", "kb"], pista: "Unidad inferior a MegaByte."},
  {letra: "L", respuesta: ["lenguaje", "languaje"], pista: "Manera o forma de comunicarse con la computadora o personas."},
  {letra: "M", respuesta: ["monitor"], pista: "Pantalla de la computadora."},
  {letra: "N", respuesta: ["nube", "cloud"], pista: "Lugar en internet donde guardamos archivos."},
  {letra: "O", respuesta: ["ordenador", "computer"], pista: "Otra forma de decir computadora."},
  {letra: "P", respuesta: ["programa", "program"], pista: "Conjunto de instrucciones de la computadora."},
  {letra: "Q", respuesta: ["query", "consulta"], pista: "Palabra usada en bases de datos para solicitar informacion."},
  {letra: "R", respuesta: ["robot"], pista: "Máquina que puede seguir instrucciones."},
  {letra: "S", respuesta: ["software","sw"], pista: "Programas que hacen funcionar la computadora."},
  {letra: "T", respuesta: ["teclado", "keyboard"], pista: "Hardware que permite escribir en la computadora."},
  {letra: "U", respuesta: ["usuario", "user"], pista: "Persona que usa un programa."},
  {letra: "V", respuesta: ["variable"], pista: "Caja imaginaria para guardar un valor."},
  {letra: "W", respuesta: ["web"], pista: "Conjunto de páginas en internet."},
  {letra: "X", respuesta: ["xml"], pista: "Lenguaje para organizar/guardar datos."},
  {letra: "Y", respuesta: ["youtube","yt"], pista: "Plataforma de videos en internet."},
  {letra: "Z", respuesta: ["zip"], pista: "Archivo comprimido."}
].map(q => ({ ...q, estado: 0, passedRound: -1 }));
//#endregion

//#region Variables/Constantes usadas a lo largo del codigo

let idx = 0;
let score = 0;
let seconds = 240;
let timerId = null;
let playerName = "";
let ranking = JSON.parse(localStorage.getItem("ranking") || "[]");

let roundsCompleted = 0;
let gameOver = false;

const startScreen = $("#start-screen");
const gameScreen  = $("#game-screen");
const rankingList = $("#ranking-list");
const playerInput = $("#player-name");
const playBtn     = $("#play-btn");

const rosco       = $("#rosco");
const clueBox     = $("#clue");
const answerInput = $("#answer");
const timerBox    = $("#timer");
const scoreBox    = $("#score");
const playerLabel = $("#player-label");
const backBtn     = $("#back-to-start");
const endActions  = $("#end-actions");

const soundCorrect = new Audio("Asset\correcto.mp3");
const soundWrong   = new Audio("Asset\incorrecto.mp3");

let lastTabTime = 0;
let lastEnterTime = 0
const TAB_DELAY = 400;
const ENTER_DELAY = 400; 
const PASS_FEEDBACK_DELAY = 300;
let isAdvancing = false;

//#endregion

function renderRanking() {
  ranking.sort((a, b) => b.score - a.score);
  const top5 = ranking.slice(0, 5);
  rankingList.innerHTML = "";
  top5.forEach((r, i) => {
    const li = document.createElement("li");
    if (i === 0) li.classList.add("gold");
    else if (i === 1) li.classList.add("silver");
    else if (i === 2) li.classList.add("bronze");
    const medal = i === 0 ? "🥇 - Senior" : i === 1 ? "🥈 - Middle" : i === 2 ? "🥉 - Junior" : "Trainee";
    li.innerHTML = `ok
      <span class="rank-name">${medal} ${r.name}</span>
      <span class="rank-score">${r.score} pts</span>`;
    rankingList.appendChild(li);
  });
}

function saveRanking(name, points) {
  name = capitalizeName(name);
  let i = ranking.findIndex(x => x.name === name);
  if (i >= 0) {
    if (points > ranking[i].score) ranking[i].score = points;
  } else {
    ranking.push({ name: name, score: points });
  }
  ranking.sort((a, b) => b.score - a.score);
  ranking = ranking.slice(0, 5);
  localStorage.setItem("ranking", JSON.stringify(ranking));
  renderRanking();
}

function drawRosco(){
  rosco.querySelectorAll(".letter").forEach(n=>n.remove());
  const total = QUESTIONS.length;
  const r = Math.min(rosco.clientWidth, rosco.clientHeight)/2 - 36;
  const cx = rosco.clientWidth/2;
  const cy = rosco.clientHeight/2;

  QUESTIONS.forEach((q,i)=>{
     const ang = (2*Math.PI*i)/total - Math.PI/2;
    const x = cx + r*Math.cos(ang) - 22;
    const y = cy + r*Math.sin(ang) - 22;
    const d = document.createElement("div");
    d.className = "letter";
    d.style.left = `${x}px`;
    d.style.top  = `${y}px`;
    d.textContent = q.letra;
    d.id = `letter-${i}`;
    rosco.appendChild(d);
  });
}

function setCurrentLetter(i){
  $$(".letter.current").forEach(el=>el.classList.remove("current"));
  const el = $(`#letter-${i}`);
  if(el) el.classList.add("current");
}

function startGame(){
  const name = playerInput.value.trim();
  if(!name) { alert("Por favor, ingresa tu nombre."); return; }
  playerName = capitalizeName(name);

  QUESTIONS.forEach(q=>{ q.estado=0; q.passedRound = -1; });
  idx = 0; score = 0; seconds = 240;
  roundsCompleted = 0;
  gameOver = false;
  answerInput.disabled = false;
  scoreBox.textContent = `Puntaje: ${score}`;
  timerBox.textContent = `⏱ ${seconds}`;
  playerLabel.textContent = `Jugador: ${playerName}`;
  endActions.classList.add("hidden");
  answerInput.value = "";

  startScreen.classList.remove("active");
  gameScreen.classList.add("active");
  drawRosco();
  setCurrentLetter(idx);
  showClue();
  answerInput.focus();
  startTimer();
}

function startTimer(){
  clearInterval(timerId);
  timerId = setInterval(()=>{
    seconds--;
    timerBox.textContent = `⏱ ${seconds}`;
    if(seconds<=0){
      clearInterval(timerId);
      endGame("Fin del Juego");
    }
  },1000);
}

function showClue(){
  const q = QUESTIONS[idx];
  clueBox.textContent = `Con la ${q.letra}: ${q.pista}`;
}

function feedback(type){ // "ok" | "ko" | "pass"
  const span = document.createElement("span");
  span.className = `feedback ${type}`;
  span.textContent = type==="ok" ? "✅" : type==="ko" ? "❌" : "PASA";
  clueBox.innerHTML = "";
  clueBox.appendChild(span);

  if(type === "ok"){
    soundCorrect.currentTime = 0;
    soundCorrect.play();
  }else if(type === "ko"){
    soundWrong.currentTime = 0;
    soundWrong.play();
  }
}

function nextPendingIndex(from){
  const n = QUESTIONS.length;
  for(let step=1; step<=n; step++){
    const j = (from + step) % n;
    const q = QUESTIONS[j];
    if(q.estado===0) return j;
    if(q.estado===2 && typeof q.passedRound === "number" && q.passedRound < roundsCompleted) return j;
  }
  return -1;
}

function handleAnswer() {
  const q = QUESTIONS[idx];
  const user = strip(answerInput.value);
  const letterEl = $(`#letter-${idx}`);
  const tiempoActual = Date.now();

  if (tiempoActual - lastEnterTime < ENTER_DELAY) {
    clueBox.textContent = "⏳ Espera un momento antes de responder de nuevo.";
    setTimeout(() => { if (!gameOver) showClue(); }, 400);
    return;
  }
  lastEnterTime = tiempoActual;

  if (user === "") { 
    clueBox.textContent = "Escribí una respuesta o presioná Tab para pasar.";
    setTimeout(() => { if (!gameOver) showClue(); }, 400);
    return; 
  }

  if (isAdvancing) return;
  isAdvancing = true;
  
  let ok = false;
  for (const answer of q.respuesta) {
    if (strip(answer) === user) ok = true;
  }
  
  if (ok){
    q.estado = 1;
    letterEl.classList.remove("passed");
    letterEl.classList.add("correct");
    score++;
    scoreBox.textContent = `Puntaje: ${score}`;
    feedback("ok");
  } else {
    q.estado = -1;
    letterEl.classList.remove("passed");
    letterEl.classList.add("incorrect");
    feedback("ko");
  } 

  answerInput.value = "";

  setTimeout(() => {
    if (gameOver) return; // 👈 Corta si terminó el juego

    const next = nextPendingIndexAfterPass(idx);
    if (next === -1){
      roundsCompleted++;
      const retry = nextPendingIndexAfterPass(idx);
      if (retry === -1) { endGame("¡Juego terminado!"); return; }
      idx = retry;
    } else {
      if (next <= idx) roundsCompleted++;
      idx = next;
    }

    if (!gameOver) {
      setCurrentLetter(idx);
      showClue();
      answerInput.focus();
    }
    isAdvancing = false;
  }, 300);
}


function handlePass() {
  const tiempoActual = Date.now();
  if (tiempoActual - lastTabTime < TAB_DELAY) {
    clueBox.textContent = "⏳ Espera un momento antes de pasar de nuevo.";
    setTimeout(() => { if (!gameOver) showClue(); }, 400);
    return;
  }
  lastTabTime = tiempoActual;

  if (isAdvancing) return;
  isAdvancing = true;

  const q = QUESTIONS[idx];
  q.estado = 2;
  q.passedRound = roundsCompleted;
  $(`#letter-${idx}`).classList.add("passed");
  feedback("pass");

  const next = nextPendingIndexAfterPass(idx); // 👈 Estaba faltando

  setTimeout(() => {
    if (gameOver) return; // 👈 corta si ya terminó

    if (next === -1) {
      roundsCompleted++;
      const retry = nextPendingIndexAfterPass(idx);
      if (retry === -1) {
        endGame("¡Juego terminado!");
        isAdvancing = false;
        return;
      }
      idx = retry;
    } else {
      if (next <= idx) roundsCompleted++;
      idx = next;
    }

    if (!gameOver) {
      setCurrentLetter(idx);
      showClue(); // 👈 Ahora muestra la pista de la siguiente letra
      answerInput.focus();
    }
    isAdvancing = false;
  }, PASS_FEEDBACK_DELAY);
}


function endGame(message){
  clearInterval(timerId);
  gameOver = true;
  answerInput.disabled = true;
  clueBox.textContent = `${message}  |  Aciertos: ${score}/${QUESTIONS.length}`;
  answerInput.blur();
  answerInput.value = "";
  endActions.classList.remove("hidden");
  saveRanking(playerName, score);
  return;
}

//#region Escucha Clicks, Enter y Tab para interactuar con el Juego


playBtn.addEventListener("click", startGame);

  answerInput.addEventListener("keydown", (e)=>{
    

    if (gameOver) { 
      e.preventDefault(); 
      return; 
    } 

    if (e.key === "Enter") {
      e.preventDefault();
      
      handleAnswer();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      handlePass();
      return;
    }
  });
  document.addEventListener("DOMContentLoaded", () => {
  const answerInput = document.getElementById("answer");
  const btnEnter = document.getElementById("btnEnter");
  const btnTab = document.getElementById("btnTab");

  // Botón "Responder" = Enter
  btnEnter.addEventListener("click", () => {
    const event = new KeyboardEvent("keydown", { key: "Enter" });
    answerInput.dispatchEvent(event);
  });

  // Botón "Pasapalabra" = Tab
  btnTab.addEventListener("click", () => {
    const event = new KeyboardEvent("keydown", { key: "Tab" });
    answerInput.dispatchEvent(event);
  });
});

  //#endregion

function nextPendingIndexAfterPass(current) {
  const total = QUESTIONS.length;

  for (let i = current + 1; i < total; i++) {
    if (QUESTIONS[i].estado === 0 || QUESTIONS[i].estado === 2) {
      return i;
    }
  }
  
  for (let i = 0; i <= current; i++) {
    if (QUESTIONS[i].estado === 0 || QUESTIONS[i].estado === 2) {
      return i;
    }
  }

  return -1; 
}

backBtn.addEventListener("click", ()=>{
  gameScreen.classList.remove("active");
  startScreen.classList.add("active");
  renderRanking();
  playerInput.focus();
  answerInput.disabled = false;
});