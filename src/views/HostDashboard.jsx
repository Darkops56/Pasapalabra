import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRuletas } from '../hooks/useRuletas';
import { socket } from '../services/socket';
import { ArrowLeft, Users, Activity } from 'lucide-react';

export default function HostDashboard() {
  const { id } = useParams();
  const { getRuletaById } = useRuletas();
  const ruleta = getRuletaById(id);
  
  const [players, setPlayers] = useState({});

  useEffect(() => {
    // Join the host room
    socket.emit('host:join', { ruletaId: id });

    const handlePlayerJoined = (data) => {
      setPlayers(prev => ({
        ...prev,
        [data.socketId]: { ...data, score: 0, timeLeft: 300, currentIndex: 0 }
      }));
    };

    const handlePlayerUpdate = (data) => {
      setPlayers(prev => ({
        ...prev,
        [data.socketId]: { ...prev[data.socketId], ...data }
      }));
    };

    const handlePlayerFinished = (data) => {
      setPlayers(prev => ({
        ...prev,
        [data.socketId]: { ...prev[data.socketId], ...data, status: 'finished' }
      }));
    };

    socket.on('host:player_joined', handlePlayerJoined);
    socket.on('host:player_update', handlePlayerUpdate);
    socket.on('host:player_finished', handlePlayerFinished);

    return () => {
      socket.off('host:player_joined', handlePlayerJoined);
      socket.off('host:player_update', handlePlayerUpdate);
      socket.off('host:player_finished', handlePlayerFinished);
    };
  }, [id]);

  if (!ruleta) {
    return <div className="text-center text-white py-20">Ruleta no encontrada</div>;
  }

  const activePlayers = Object.values(players);

  return (
    <div className="py-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/">
          <button className="p-2 bg-dark-800 text-slate-300 rounded-full hover:bg-dark-700 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
            <Activity className="text-green-400" />
            Dashboard en Vivo
          </h1>
          <p className="text-slate-400 text-lg mt-1">{ruleta.titulo}</p>
        </div>
      </div>

      <div className="glass-panel p-6 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Users className="text-primary-400" size={24} />
          <h2 className="text-xl font-bold text-white">Jugadores Activos ({activePlayers.length})</h2>
        </div>

        {activePlayers.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-dark-700 rounded-lg">
            <div className="animate-pulse flex justify-center mb-4">
              <Activity className="text-green-500/50" size={48} />
            </div>
            <p className="text-slate-400 text-lg">Esperando a que los jugadores se unan a la partida...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activePlayers.map((player) => (
              <div key={player.socketId} className="bg-dark-800/80 border border-dark-700 rounded-xl p-5 relative overflow-hidden">
                {player.status === 'finished' && (
                  <div className="absolute top-0 right-0 bg-yellow-500/20 text-yellow-400 text-xs font-bold px-3 py-1 rounded-bl-lg">
                    Terminado
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-white truncate pr-16">{player.playerName}</h3>
                  <div className={`px-2 py-1 rounded text-xs font-bold ${player.status === 'playing' ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-slate-700 text-slate-300'}`}>
                    {player.status === 'playing' ? 'Jugando' : 'Finalizado'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dark-900/50 p-3 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Puntuación</p>
                    <p className="text-2xl font-bold text-white">{player.score}</p>
                  </div>
                  <div className="bg-dark-900/50 p-3 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Tiempo Restante</p>
                    <p className={`text-2xl font-bold ${player.timeLeft < 30 ? 'text-red-400' : 'text-white'}`}>
                      {player.timeLeft !== undefined ? `${Math.floor(player.timeLeft / 60)}:${(player.timeLeft % 60).toString().padStart(2, '0')}` : '0:00'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-dark-700">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Progreso (Letras)</span>
                    <span className="text-primary-400 font-bold">{player.currentIndex !== undefined ? player.currentIndex : 0} / 26</span>
                  </div>
                  <div className="w-full bg-dark-900 rounded-full h-2">
                    <div 
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${((player.currentIndex || 0) / 26) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
