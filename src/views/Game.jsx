import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRuletas } from '../hooks/useRuletas';
import { ArrowLeft } from 'lucide-react';

// Helper for string comparison
const strip = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export default function Game() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getRuletaById, saveRanking } = useRuletas();

  const [ruleta, setRuleta] = useState(() => getRuletaById(id) || null);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState('start'); // start | playing | gameover
  
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
  };

  const endGame = (reason) => {
    setGameState('gameover');
    clearInterval(timerRef.current);
    const timeTaken = 240 - timeLeft;
    saveRanking(id, playerName.trim(), score, timeTaken);
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

    // Pre-calcular el siguiente índice para evitar problemas de cierre léxico en setTimeout
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
    }, 600); // 600ms permite al usuario ver si acertó o falló claramente
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

  const renderCircle = () => {
    if (questions.length === 0) return null;
    const total = questions.length;
    // Usamos porcentaje en lugar de píxeles para el radio, haciéndolo 100% responsivo
    const radiusPct = 55; 
    
    return (
      <div className="relative w-full max-w-[320px] sm:max-w-[500px] aspect-square flex items-center justify-center my-8 mx-auto">
        {questions.map((q, i) => {
          const angle = (i * (360 / total) - 90) * (Math.PI / 180);
          const x = Math.cos(angle) * radiusPct;
          const y = Math.sin(angle) * radiusPct;
          
          let stateClass = 'letter-idle';
          if (q.estado === 1) stateClass = 'letter-correct';
          else if (q.estado === -1) stateClass = 'letter-incorrect';
          else if (q.estado === 2) stateClass = 'letter-passed';
          
          // Solo marcamos como activa si estamos parados ahí y NO acabamos de responder/pasar en los ultimos milisegundos
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

        {/* Center Clue */}
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
    <div className="py-4 max-w-5xl mx-auto flex flex-col items-center">
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
          <div className="flex w-full max-w-3xl justify-between items-center mb-4 px-6 glass-panel py-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  if(window.confirm("¿Estás seguro de que deseas abandonar la partida? Tu progreso no se guardará en el ranking.")) {
                    navigate('/');
                  }
                }} 
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

          <div className="w-full max-w-3xl p-6">
            {renderCircle()}
          </div>

          <div className="w-full max-w-2xl  p-6 shadow-2xl border-primary-500/20">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu respuesta y presiona ENTER"
              className="input-field text-center text-2xl py-5 mb-4 shadow-inner"
              autoComplete="off"
            />
            <div className="flex gap-4">
              <button onClick={handleAnswer} className="flex-1 btn-primary py-4 text-xl">
                ✔️ Responder
              </button>
              <button onClick={handlePass} className="flex-1 btn-secondary py-4 text-xl">
                ➡️ Pasapalabra
              </button>
            </div>
            <p className="text-center text-slate-500 text-sm mt-4 font-medium tracking-wide">
              PISTAS: <strong className="text-slate-300">ENTER</strong> = Responder &nbsp;&bull;&nbsp; <strong className="text-slate-300">TAB</strong> = Pasapalabra
            </p>
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
    </div>
  );
}
