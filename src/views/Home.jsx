import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, ChevronLeft, ChevronRight, X, Trophy } from 'lucide-react';
import { useRuletas } from '../hooks/useRuletas';
import RuletaCard from '../components/RuletaCard';

export default function Home() {
  const { ruletas, deleteRuleta } = useRuletas();
  const [currentPage, setCurrentPage] = useState(1);
  const [rankingModal, setRankingModal] = useState(null);
  
  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.ceil(ruletas.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = ruletas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleDelete = (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta ruleta?")) {
      deleteRuleta(id);
      if (currentItems.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="py-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">
            Pasapalabra ET12
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Elige una de las ruletas para empezar a jugar o crea tu propia ruleta.</p>
        </div>
        <Link to="/crear">
          <button className="btn-primary py-3 px-6 text-lg">
            <PlusCircle size={20} /> Crear Ruleta
          </button>
        </Link>
      </div>

      {ruletas.length === 0 ? (
        <div className="text-center py-20 glass-panel">
          <p className="text-slate-400 text-xl">No hay ruletas disponibles.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {currentItems.map(ruleta => (
              <RuletaCard 
                key={ruleta.id} 
                ruleta={ruleta} 
                onDelete={handleDelete}
                onShowRanking={(r) => setRankingModal(r)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-full bg-dark-800 text-slate-300 disabled:opacity-50 hover:bg-dark-700 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <span className="text-slate-400 font-medium">
                Página {currentPage} de {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-full bg-dark-800 text-slate-300 disabled:opacity-50 hover:bg-dark-700 transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Ranking */}
      {rankingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel p-0 max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-dark-800/80 p-4 border-b border-dark-700 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="text-yellow-400" size={24} /> 
                Ranking: {rankingModal.titulo}
              </h2>
              <button onClick={() => setRankingModal(null)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {!rankingModal.ranking || rankingModal.ranking.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Aún no hay partidas registradas en esta ruleta.</p>
              ) : (
                <ul className="space-y-3">
                  {rankingModal.ranking.map((r, i) => (
                    <li key={i} className="flex justify-between items-center p-3 rounded-lg bg-dark-800/50 border border-dark-700">
                      <div className="flex items-center gap-3">
                        <span className={`font-bold w-6 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                          #{i + 1}
                        </span>
                        <span className="font-semibold">{r.playerName}</span>
                      </div>
                      <div className="text-right flex items-center gap-4 text-sm text-slate-300">
                        <span className="text-green-400 font-bold">{r.score} pts</span>
                        <span>⏱ {formatTime(r.timeSeconds)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
