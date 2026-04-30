import { Link } from 'react-router-dom';
import { Play, Trash2, Trophy, Activity } from 'lucide-react';

export default function RuletaCard({ ruleta, onDelete, onShowRanking, onLiveDashboard }) {
  return (
    <div className="glass-panel p-6 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300 group">
      <div className="flex-1">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">
          {ruleta.titulo}
        </h3>
        <p className="text-slate-400 text-sm line-clamp-2 mb-4" title={ruleta.descripcion}>
          {ruleta.descripcion || "Sin descripción."}
        </p>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-dark-700/50">
        <Link to={`/jugar/${ruleta.id}`} className="flex-1">
          <button className="w-full btn-primary py-2 text-sm">
            <Play size={16} /> Jugar
          </button>
        </Link>
        <button 
          onClick={() => onShowRanking(ruleta)}
          className="btn-secondary py-2 px-3 text-sm"
          title="Ver Ranking"
        >
          <Trophy size={16} />
        </button>
        <button 
          onClick={() => onLiveDashboard(ruleta)}
          className="btn-secondary py-2 px-3 text-sm !border-green-500/50 hover:!bg-green-500/20 text-green-400"
          title="Dashboard en Vivo"
        >
          <Activity size={16} />
        </button>
        {!ruleta.isDefault && (
          <button 
            onClick={() => onDelete(ruleta.id)}
            className="btn-danger py-2 px-3 text-sm"
            title="Eliminar Ruleta"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
