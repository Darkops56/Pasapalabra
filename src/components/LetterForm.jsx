export default function LetterForm({ letter, data, onChange }) {
  // data = { pista: '', descripcion: '', respuesta: '' }

  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(letter, { ...data, [name]: value });
  };

  return (
    <div className="glass-panel p-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-2xl font-bold text-white shadow-lg border-2 border-primary-400">
          {letter}
        </div>
        <h2 className="text-2xl font-bold text-white">Configurar Letra</h2>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Tipo</label>
          <select
            name="tipo"
            value={data.tipo || 'comienza'}
            onChange={handleChange}
            className="input-field appearance-none bg-dark-800"
          >
            <option value="comienza">Comienza con la letra:</option>
            <option value="contiene">Contiene la letra:</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Pregunta / Pista</label>
          <input 
            type="text" 
            name="pista"
            value={data.pista || ''}
            onChange={handleChange}
            placeholder="Ej: Programa que usás en tu celular..."
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Descripción Adicional (Opcional)</label>
          <textarea 
            name="descripcion"
            value={data.descripcion || ''}
            onChange={handleChange}
            placeholder="Detalles extra sobre la palabra..."
            className="input-field min-h-[80px] resize-y"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Respuestas (separadas por coma)</label>
          <input 
            type="text" 
            name="respuesta"
            value={data.respuesta || ''}
            onChange={handleChange}
            placeholder="Ej: app, aplicacion, aplicaciones"
            className="input-field"
          />
          <p className="text-xs text-slate-500 mt-2">
            El jugador podrá acertar si escribe cualquiera de las respuestas ingresadas.
          </p>
        </div>
      </div>
    </div>
  );
}
