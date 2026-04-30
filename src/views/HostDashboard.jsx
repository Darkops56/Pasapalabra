import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRuletas } from '../hooks/useRuletas';
import { socket } from '../services/socket';
import { ArrowLeft, Users, Activity } from 'lucide-react';

export default function HostDashboard() {
  const { id } = useParams();
  const { getRuletaById, loading } = useRuletas();
  
  const [players, setPlayers] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');

  const ruleta = getRuletaById(id);

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

    const handlePlayerStatus = (data) => {
      setPlayers(prev => {
        if (!prev[data.socketId]) return prev;
        return {
          ...prev,
          [data.socketId]: { ...prev[data.socketId], status: data.status }
        };
      });
    };

    socket.on('host:player_joined', handlePlayerJoined);
    socket.on('host:player_update', handlePlayerUpdate);
    socket.on('host:player_finished', handlePlayerFinished);
    socket.on('host:player_status', handlePlayerStatus);

    return () => {
      socket.off('host:player_joined', handlePlayerJoined);
      socket.off('host:player_update', handlePlayerUpdate);
      socket.off('host:player_finished', handlePlayerFinished);
      socket.off('host:player_status', handlePlayerStatus);
    };
  }, [id]);

  const handleRemovePlayer = (socketId) => {
    // Lo borramos de la vista del dashboard
    setPlayers(prev => {
      const newPlayers = { ...prev };
      delete newPlayers[socketId];
      return newPlayers;
    });
    // Informamos al servidor para que expulse si sigue conectado y lo quite de roomPlayers
    socket.emit('host:kick_player', { ruletaId: id, socketId });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Cargando dashboard...</div>
      </div>
    );
  }

  if (!ruleta) {
    return <div className="text-center text-white py-20">Ruleta no encontrada</div>;
  }

  const activePlayers = Object.values(players);
  
  const filteredAndSortedPlayers = activePlayers
    .filter(p => filterStatus === 'all' || p.status === filterStatus)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.timeLeft - a.timeLeft;
    });

  return (
    <div className="min-h-screen bg-dark-900 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <Link to="/" className="inline-flex items-center text-primary-400 hover:text-primary-300 font-bold mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver al inicio
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black text-white">Dashboard de Control</h1>
            <p className="text-slate-400 mt-2">Ruleta: {ruleta.titulo}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field py-2 px-4 bg-dark-800"
            >
              <option value="all">Todos los estados</option>
              <option value="playing">Jugando</option>
              <option value="absent">Ausente</option>
              <option value="abandoned">Abandonó</option>
              <option value="finished">Terminado</option>
            </select>
            <div className="glass-panel px-6 py-3 flex items-center gap-3">
              <Users className="w-5 h-5 text-primary-400" />
              <span className="text-xl font-bold text-white">{activePlayers.length}</span>
              <span className="text-slate-400 text-sm">Jugadores</span>
            </div>
          </div>
        </div>

        {filteredAndSortedPlayers.length === 0 ? (
          <div className="glass-panel p-12 text-center flex flex-col items-center">
            <Activity className="w-12 h-12 text-slate-500 mb-4" />
            <p className="text-xl font-bold text-white mb-2">Esperando jugadores...</p>
            <p className="text-slate-400">Comparte el ID de la ruleta para que otros se unan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedPlayers.map((player) => (
              <div key={player.socketId} className="bg-dark-800/80 border border-dark-700 rounded-xl p-5 relative overflow-hidden">
                {player.status === 'finished' && (
                  <div className="absolute top-0 right-0 bg-yellow-500/20 text-yellow-400 text-xs font-bold px-3 py-1 rounded-bl-lg">
                    Terminado
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-white truncate pr-16">{player.playerName}</h3>
                  {player.status !== 'finished' && (
                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                      player.status === 'playing' ? 'bg-green-500/20 text-green-400 animate-pulse' 
                      : player.status === 'absent' ? 'bg-orange-500/20 text-orange-400' 
                      : player.status === 'abandoned' ? 'bg-red-500/20 text-red-400'
                      : 'bg-slate-700 text-slate-300'
                    }`}>
                      {player.status === 'playing' ? 'Jugando' : player.status === 'absent' ? 'Ausente' : player.status === 'abandoned' ? 'Abandonó' : 'Desconocido'}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
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

                <div className="mt-4 pt-3 border-t border-dark-700/50 flex justify-end">
                  <button
                    onClick={() => handleRemovePlayer(player.socketId)}
                    className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 py-1.5 px-3 rounded font-bold transition-colors"
                  >
                    {player.status === 'playing' || player.status === 'absent' ? 'Expulsar' : 'Remover Carta'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
