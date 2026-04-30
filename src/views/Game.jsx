import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRuletas } from '../hooks/useRuletas';
import { socket } from '../services/socket';
import { ArrowLeft, Trophy } from 'lucide-react'; // <-- Agregamos Trophy

// Helper for string comparison
const strip = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export default function Game() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getRuletaById, saveRanking } = useRuletas();

  const [ruleta, setRuleta] = useState(() => getRuletaById(id) || null);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState('start'); // start | playing | gameover
  const [showRanking, setShowRanking] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // Game state variables
  const [questions, setQuestions] = useState(() => {
    const data = getRuletaById(id);
    return data ? data.preguntas.map(q => ({ ...q, estado: 0, passedRound: -1 })) : [];
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(240);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  
  // Input
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  
  // Timers and debouncers
  const timerRef = useRef(null);
  const lastActionTime = useRef(0);
  const isAdvancing = useRef(false);

  useEffect(() => {
    if (!ruleta) {
      alert("Ruleta no encontrada.");
      navigate('/');
    }
  }, [ruleta, navigate]);

  // Timer logic
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      endGame("¡Tiempo Agotado!");
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, timeLeft]);

  // Emitir actualizaciones al Host (Dashboard)
  useEffect(() => {
    if (gameState === 'playing') {
      socket.emit('player:update', {
        ruletaId: id,
        playerName: playerName.trim(),
        score,
        timeLeft,
        currentIndex
      });
    }
  }, [score, timeLeft, currentIndex, gameState, id, playerName]);

  useEffect(() => {
    if (gameState === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState, currentIndex]);

  const startGame = () => {
    if (!playerName.trim()) {
      alert("Por favor, ingresa tu nombre para el ranking.");
      return;
    }
    setGameState('playing');
    socket.emit('player:join', { ruletaId: id, playerName: playerName.trim() });
  };

  const endGame = (reason) => {
    setGameState('gameover');
    clearInterval(timerRef.current);
    const timeTaken = 240 - timeLeft;
    saveRanking(id, playerName.trim(), score, timeTaken);
    socket.emit('player:finished', { 
      ruletaId: id, 
      playerName: playerName.trim(), 
      score, 
      timeSeconds: timeTaken 
    });
  };

  const getNextPendingIndex = (current, currentRounds, currentQuestions) => {
    const total = currentQuestions.length;
    // Look ahead
    for (let i = current + 1; i < total; i++) {
      if (currentQuestions[i].estado === 0 || (currentQuestions[i].estado === 2 && currentQuestions[i].passedRound < currentRounds)) return i;
    }
    // Loop back from 0 to current
    for (let i = 0; i <= current; i++) {
      if (currentQuestions[i].estado === 0 || (currentQuestions[i].estado === 2 && currentQuestions[i].passedRound < currentRounds)) return i;
    }
    return -1;
  };

  const handleAnswer = () => {
    const now = Date.now();
    if (now - lastActionTime.current < 400 || isAdvancing.current) return;

    const userAns = strip(inputValue);
    if (!userAns) return;

    lastActionTime.current = now;
    isAdvancing.current = true;

    const currentQ = questions[currentIndex];
    const isCorrect = currentQ.respuesta.some(ans => strip(ans) === userAns);

    const newQuestions = [...questions];
    if (isCorrect) {
      newQuestions[currentIndex] = { ...currentQ, estado: 1 };
      setScore(s => s + 1);
    } else {
      newQuestions[currentIndex] = { ...currentQ, estado: -1 };
    }

    setQuestions(newQuestions);
    setInputValue('');

    let nextIndex = getNextPendingIndex(currentIndex, roundsCompleted, newQuestions);
    let nextRounds = roundsCompleted;

    if (nextIndex === -1) {
      const retry = getNextPendingIndex(currentIndex, roundsCompleted + 1, newQuestions);
      if (retry === -1) {
        setTimeout(() => {
          endGame("¡Juego Terminado!");
          isAdvancing.current = false;
        }, 500);
        return;
      }
      nextRounds = roundsCompleted + 1;
      nextIndex = retry;
    } else {
      if (nextIndex <= currentIndex) {
        nextRounds = roundsCompleted + 1;
      }
    }

    setTimeout(() => {
      if (gameState !== 'gameover') {
        setRoundsCompleted(nextRounds);
        setCurrentIndex(nextIndex);
      }
      isAdvancing.current = false;
    }, 600);
  };

  const handlePass = () => {
    const now = Date.now();
    if (now - lastActionTime.current < 400 || isAdvancing.current) return;
    lastActionTime.current = now;
    isAdvancing.current = true;

    const newQuestions = [...questions];
    newQuestions[currentIndex] = {
      ...newQuestions[currentIndex],
      estado: 2,
      passedRound: roundsCompleted
    };

    setQuestions(newQuestions);
    setInputValue('');

    let nextIndex = getNextPendingIndex(currentIndex, roundsCompleted, newQuestions);
    let nextRounds = roundsCompleted;

    if (nextIndex === -1) {
      const retry = getNextPendingIndex(currentIndex, roundsCompleted + 1, newQuestions);
      if (retry === -1) {
        setTimeout(() => {
          endGame("¡Juego Terminado!");
          isAdvancing.current = false;
        }, 500);
        return;
      }
      nextRounds = roundsCompleted + 1;
      nextIndex = retry;
    } else {
      if (nextIndex <= currentIndex) {
        nextRounds = roundsCompleted + 1;
      }
    }

    setTimeout(() => {
      if (gameState !== 'gameover') {
        setRoundsCompleted(nextRounds);
        setCurrentIndex(nextIndex);
      }
      isAdvancing.current = false;
    }, 600);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAnswer();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handlePass();
    }
  };

  // Helper de tiempo para el ranking
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderCircle = () => {
    if (questions.length === 0) return null;
    const total = questions.length;
    const radiusPct = 48; 
    
    return (
      <div className="relative w-full max-w-[320px] sm:max-w-[450px] lg:max-w-[500px] aspect-square flex items-center justify-center my-4 sm:my-8 mx-auto">
        {questions.map((q, i) => {
          const angle = (i * (360 / total) - 90) * (Math.PI / 180);
          const x = Math.cos(angle) * radiusPct;
          const y = Math.sin(angle) * radiusPct;
          
          let stateClass = 'letter-idle';
          if (q.estado === 1) stateClass = 'letter-correct';
          else if (q.estado === -1) stateClass = 'letter-incorrect';
          else if (q.estado === 2) stateClass = 'letter-passed';
          
          if (i === currentIndex && gameState === 'playing' && (q.estado === 0 || q.estado === 2)) {
            stateClass = 'letter-active';
          }

          return (
            <div 
              key={i}
              className={`letter-circle ${stateClass} sm:w-12 sm:h-12 sm:text-xl w-8 h-8 text-xs`}
              style={{ left: `calc(50% + ${x}%)`, top: `calc(50% + ${y}%)` }}
            >
              {q.letra}
            </div>
          );
        })}

        <div className="absolute inset-0 m-auto w-[68%] h-[68%] bg-dark-800/90 rounded-full border border-dark-600 shadow-2xl flex flex-col items-center justify-center p-3 sm:p-6 text-center z-0 backdrop-blur-md">
          {gameState === 'playing' ? (
            <>
              <span className="text-4xl sm:text-7xl font-extrabold text-primary-400 mb-1 sm:mb-3 drop-shadow-md">
                {questions[currentIndex]?.letra}
              </span>
              <p className="text-xs sm:text-xl text-slate-300 font-semibold line-clamp-3 sm:line-clamp-4">
                {questions[currentIndex]?.pista}
              </p>
              {questions[currentIndex]?.descripcion && (
                <p className="text-[10px] sm:text-sm text-slate-400 mt-1 sm:mt-3 line-clamp-2 sm:line-clamp-3 italic hidden sm:block">
                  {questions[currentIndex]?.descripcion}
                </p>
              )}
            </>
          ) : (
            <span className="text-sm sm:text-xl font-bold text-slate-400">Preparado...</span>
          )}
        </div>
      </div>
    );
  };

  if (!ruleta) return null;

  return (
    // Ampliamos el max-w general para que entren ambas columnas holgadamente
    <div className="py-4 max-w-7xl mx-auto flex flex-col items-center px-4">
      <h1 className="text-3xl font-bold text-white mb-2">{ruleta.titulo}</h1>

      {gameState === 'start' && (
        <div className="glass-panel p-8 w-full max-w-md text-center animate-in fade-in zoom-in duration-300 mt-8">
          <h2 className="text-xl font-bold text-white mb-6">Ingresa para jugar</h2>
          <input
            type="text"
            placeholder="Tu nombre completo"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="input-field text-center mb-6 text-lg py-3"
            onKeyDown={(e) => e.key === 'Enter' && startGame()}
          />
          <div className="flex flex-col gap-3">
            <button onClick={startGame} className="w-full btn-primary py-4 text-lg">
              Comenzar Juego
            </button>
            <button onClick={() => navigate('/')} className="w-full btn-secondary py-3 text-lg">
              Volver al Inicio
            </button>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="w-full mt-4 flex flex-col items-center">
          {/* Header Superior */}
          <div className="flex w-full max-w-5xl justify-between items-center mb-6 px-6 glass-panel py-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowExitConfirm(true)} 
                className="text-slate-400 hover:text-red-400 transition-colors p-1" 
                title="Abandonar Partida"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="font-bold text-slate-300 text-lg hidden sm:block">👤 {playerName}</div>
            </div>
            <div className={`font-bold text-3xl ${timeLeft <= 30 ? 'text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'text-primary-400'}`}>
              ⏱ {timeLeft}s
            </div>
            <div className="font-bold text-green-400 text-2xl drop-shadow-md">🏆 {score}</div>
          </div>

          {/* Contenedor Dividido: Ranking Izquierda, Ruleta Centro, Espaciador Derecha para Centrar */}
          <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr_300px] 2xl:grid-cols-[340px_1fr_340px] w-full gap-6 xl:gap-8 items-start justify-center">
            
            {/* --- SIDEBAR IZQUIERDO: RANKING --- */}
            <div className={`w-full order-2 xl:order-1 glass-panel p-0 overflow-hidden flex-col h-[400px] xl:h-[580px] mt-8 xl:mt-0 ${showRanking ? 'flex' : 'hidden xl:flex'}`}>
              <div className="bg-dark-800/80 p-4 border-b border-dark-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Trophy className="text-yellow-400" size={24} /> 
                  Top Ranking
                </h2>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                {!ruleta.ranking || ruleta.ranking.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Aún no hay partidas registradas.</p>
                ) : (
                  <ul className="space-y-3">
                    {ruleta.ranking.map((r, i) => (
                      <li key={i} className="flex justify-between items-center p-3 rounded-lg bg-dark-800/50 border border-dark-700">
                        <div className="flex items-center gap-3">
                          <span className={`font-bold w-6 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                            #{i + 1}
                          </span>
                          <span className="font-semibold truncate max-w-[120px]" title={r.playerName}>
                            {r.playerName}
                          </span>
                        </div>
                        <div className="text-right flex items-center gap-3 text-sm text-slate-300">
                          <span className="text-green-400 font-bold">{r.score} pts</span>
                          <span className="text-xs">⏱ {formatTime(r.timeSeconds)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* --- CENTRO: RULETA E INPUTS --- */}
            <div className="w-full order-1 xl:order-2 flex flex-col items-center justify-center">
              {renderCircle()}
              
              <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl p-4 sm:p-6 shadow-2xl border-primary-500/20 mt-2 sm:mt-4 bg-dark-800/60 backdrop-blur-md rounded-2xl border">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu respuesta y presiona ENTER"
                  className="input-field text-center text-xl sm:text-2xl py-4 sm:py-5 mb-4 shadow-inner"
                  autoComplete="off"
                />
                <div className="flex gap-2 sm:gap-4">
                  <button onClick={handleAnswer} className="flex-1 btn-primary py-3 sm:py-4 text-lg sm:text-xl">
                    ✔️ <span className="hidden min-[440px]:inline">Responder</span>
                  </button>
                  <button onClick={handlePass} className="flex-1 btn-secondary py-3 sm:py-4 text-lg sm:text-xl">
                    ➡️ <span className="hidden min-[440px]:inline">Pasapalabra</span>
                  </button>
                </div>
                <p className="text-center text-slate-500 text-xs sm:text-sm mt-4 font-medium tracking-wide">
                  PISTAS: <strong className="text-slate-300">ENTER</strong> = Responder &nbsp;&bull;&nbsp; <strong className="text-slate-300">TAB</strong> = Pasapalabra
                </p>
                
                {/* Botón para mostrar ranking en móviles/tablets (solo visible < 1280px) */}
                <div className="mt-6 pt-4 border-t border-dark-600 xl:hidden">
                  <button 
                    onClick={() => setShowRanking(!showRanking)}
                    className="w-full btn-secondary py-2 text-sm flex items-center justify-center gap-2"
                  >
                    <Trophy size={16} className="text-yellow-400" />
                    {showRanking ? 'Ocultar Ranking' : 'Ver Ranking'}
                  </button>
                </div>
              </div>
            </div>

            {/* --- COLUMNA DERECHA (Vacía, para mantener la ruleta centrada en el layout grid) --- */}
            <div className="hidden xl:block order-3"></div>

          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="glass-panel p-10 w-full max-w-lg text-center animate-in fade-in zoom-in duration-500 mt-12 border-primary-500/30">
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400 mb-2">¡Partida Finalizada!</h2>
          <div className="text-7xl my-8 drop-shadow-xl animate-bounce">🏆</div>
          <p className="text-2xl text-slate-300 mb-4">Jugador: <strong className="text-white">{playerName}</strong></p>
          <p className="text-3xl font-bold text-green-400 mb-4 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">Aciertos: {score} / {questions.length}</p>
          <p className="text-xl text-slate-400 mb-10">Tiempo: <span className="text-white font-semibold">{240 - timeLeft} segundos</span></p>

          <button onClick={() => navigate('/')} className="w-full btn-primary py-4 text-xl">
            Volver al Inicio
          </button>
        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel p-6 max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-4">¿Abandonar Partida?</h2>
            <p className="text-slate-300 mb-6">¿Estás seguro de que deseas abandonar la partida? Tu progreso no se guardará en el ranking.</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setShowExitConfirm(false)} className="btn-secondary py-2 px-6">
                Cancelar
              </button>
              <button 
                onClick={() => navigate('/')} 
                className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50 py-2 px-6 rounded-lg font-bold transition-all"
              >
                Abandonar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}