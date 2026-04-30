import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { useRuletas } from '../hooks/useRuletas';
import LetterForm from '../components/LetterForm';

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function Creator() {
  const navigate = useNavigate();
  const { addRuleta } = useRuletas();

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activeLetter, setActiveLetter] = useState('A');
  const [lettersData, setLettersData] = useState({});

  const handleLetterChange = (letter, data) => {
    setLettersData(prev => ({
      ...prev,
      [letter]: data
    }));
  };

  const handleSave = () => {
    if (!titulo.trim()) {
      alert("Por favor, ingresa un título para la ruleta.");
      return;
    }

    // Transform lettersData into array of questions
    const preguntas = ALPHABET.map(letra => {
      const data = lettersData[letra] || {};
      const respuestasArr = data.respuesta 
        ? data.respuesta.split(',').map(r => r.trim()).filter(Boolean)
        : [];
        
      return {
        letra,
        pista: data.pista || "",
        descripcion: data.descripcion || "",
        respuesta: respuestasArr,
      };
    });

    const hasContent = preguntas.some(p => p.pista && p.respuesta.length > 0);
    if (!hasContent) {
      alert("Debes configurar al menos una letra con pista y respuesta.");
      return;
    }

    const newRuleta = {
      id: "ruleta-" + Date.now(),
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      isDefault: false,
      preguntas,
      ranking: []
    };

    addRuleta(newRuleta);
    navigate('/');
  };

  // Determinar si una letra ya tiene datos mínimos (pista y respuesta)
  const isLetterConfigured = (letter) => {
    const d = lettersData[letter];
    return d && d.pista?.trim() && d.respuesta?.trim();
  };

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/">
          <button className="p-2 bg-dark-800 text-slate-300 rounded-full hover:bg-dark-700 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-white">Crear Nueva Ruleta</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold text-white mb-4">Información General</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Título de la Ruleta</label>
                <input 
                  type="text" 
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Historia Universal"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Descripción General</label>
                <textarea 
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="De qué trata esta ruleta..."
                  className="input-field min-h-[100px] resize-y"
                />
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            className="w-full btn-primary py-4 text-lg"
          >
            <Save size={20} /> Guardar Ruleta
          </button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold text-white mb-4">Abecedario</h2>
            <div className="flex flex-wrap gap-2">
              {ALPHABET.map(letter => {
                const isActive = activeLetter === letter;
                const isConfigured = isLetterConfigured(letter);
                return (
                  <button
                    key={letter}
                    onClick={() => setActiveLetter(letter)}
                    className={`
                      relative w-10 h-10 rounded-lg font-bold text-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-primary-600 text-white ring-2 ring-primary-400 ring-offset-2 ring-offset-dark-900 scale-110 z-10 shadow-lg shadow-primary-500/50' 
                        : 'bg-dark-700 text-slate-300 hover:bg-dark-600 hover:text-white border border-dark-600'
                      }
                    `}
                  >
                    {letter}
                    {isConfigured && !isActive && (
                      <span className="absolute -top-1 -right-1 text-green-400">
                        <CheckCircle2 size={12} className="fill-dark-900" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <LetterForm 
            letter={activeLetter}
            data={lettersData[activeLetter] || {}}
            onChange={handleLetterChange}
          />
        </div>
      </div>
    </div>
  );
}
