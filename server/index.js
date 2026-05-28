import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

import fs from 'fs';
import path from 'path';

// Archivos de almacenamiento
const DB_PATH = path.join(process.cwd(), 'ruletasPasswords.json');
const RULETAS_DATA_PATH = path.join(process.cwd(), 'ruletasData.json');
const DEFAULT_RANKING_PATH = path.join(process.cwd(), 'defaultRanking.json');

let ruletasPasswords = {}; 
let ruletasData = [];
let defaultRanking = [];

// Inicializar ruletasPasswords
if (fs.existsSync(DB_PATH)) {
  try {
    ruletasPasswords = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (e) {
    console.error("Error leyendo ruletasPasswords.json", e);
  }
} else {
  ruletasPasswords['default-1'] = '1234';
  fs.writeFileSync(DB_PATH, JSON.stringify(ruletasPasswords));
}

// Inicializar ruletasData
if (fs.existsSync(RULETAS_DATA_PATH)) {
  try {
    ruletasData = JSON.parse(fs.readFileSync(RULETAS_DATA_PATH, 'utf-8'));
  } catch (e) {
    console.error("Error leyendo ruletasData.json", e);
  }
}

// Inicializar defaultRanking
if (fs.existsSync(DEFAULT_RANKING_PATH)) {
  try {
    defaultRanking = JSON.parse(fs.readFileSync(DEFAULT_RANKING_PATH, 'utf-8'));
  } catch (e) {
    console.error("Error leyendo defaultRanking.json", e);
  }
}

// Endpoints REST
app.get('/api/ruletas', (req, res) => {
  res.json({ ruletas: ruletasData });
});

app.get('/api/ruletas/default-ranking', (req, res) => {
  res.json({ ranking: defaultRanking });
});

app.post('/api/ruletas/new', (req, res) => {
  const { ruleta, password } = req.body;
  ruletasData.push(ruleta);
  fs.writeFileSync(RULETAS_DATA_PATH, JSON.stringify(ruletasData));
  
  ruletasPasswords[ruleta.id] = password;
  fs.writeFileSync(DB_PATH, JSON.stringify(ruletasPasswords));
  
  res.json({ success: true });
});

app.delete('/api/ruletas/:id', (req, res) => {
  const { id } = req.params;
  ruletasData = ruletasData.filter(r => r.id !== id);
  fs.writeFileSync(RULETAS_DATA_PATH, JSON.stringify(ruletasData));
  
  delete ruletasPasswords[id];
  fs.writeFileSync(DB_PATH, JSON.stringify(ruletasPasswords));
  
  res.json({ success: true });
});

app.post('/api/ruletas/:id/ranking', (req, res) => {
  const { id } = req.params;
  const { playerName, score, timeSeconds } = req.body;
  
  const newRank = { playerName, score, timeSeconds };
  
  if (id === 'default-1') {
    defaultRanking.push(newRank);
    defaultRanking.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeSeconds - b.timeSeconds;
    });
    fs.writeFileSync(DEFAULT_RANKING_PATH, JSON.stringify(defaultRanking));
  } else {
    const ruleta = ruletasData.find(r => r.id === id);
    if (ruleta) {
      if (!ruleta.ranking) ruleta.ranking = [];
      ruleta.ranking.push(newRank);
      ruleta.ranking.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.timeSeconds - b.timeSeconds;
      });
      fs.writeFileSync(RULETAS_DATA_PATH, JSON.stringify(ruletasData));
    }
  }
  
  res.json({ success: true });
});

app.post('/api/verify-host', (req, res) => {
  const { id, password } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, message: 'ID no proporcionado en el body' });
  }
  
  if (ruletasPasswords[id] === password) {
    res.json({ success: true });
  } else {
    if (!ruletasPasswords[id]) {
      res.status(401).json({ success: false, message: `La ruleta con id ${id} no tiene contraseña registrada en el servidor.` });
    } else {
      res.status(401).json({ success: false, message: `Contraseña incorrecta para la ruleta ${id}` });
    }
  }
});

// Estructura para rastrear jugadores por sala y validar nombres únicos
const roomPlayers = {};

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);

  // --- Lógica del Jugador ---
  socket.on('player:join', ({ ruletaId, playerName }, callback) => {
    if (!roomPlayers[ruletaId]) {
      roomPlayers[ruletaId] = {};
    }

    // Validar nombre único ignorando espacios y mayúsculas
    const normalizedNewName = playerName.replace(/\s+/g, '').toLowerCase();
    const isTaken = Object.values(roomPlayers[ruletaId]).some(
      p => p.playerName.replace(/\s+/g, '').toLowerCase() === normalizedNewName && p.status !== 'abandoned'
    );

    if (isTaken) {
      if (typeof callback === 'function') {
        callback({ success: false, message: 'El nombre de usuario ya está en uso en esta partida.' });
      }
      return;
    }

    roomPlayers[ruletaId][socket.id] = { playerName, status: 'playing', ruletaId };
    socket.ruletaId = ruletaId; // Guardar referencia en el socket para el disconnect

    socket.join(ruletaId);
    console.log(`Jugador ${playerName} entró a la ruleta ${ruletaId}`);
    io.to(`host-${ruletaId}`).emit('host:player_joined', { playerName, socketId: socket.id, status: 'playing' });

    if (typeof callback === 'function') {
      callback({ success: true });
    }
  });

  socket.on('player:status', ({ ruletaId, status }) => {
    if (roomPlayers[ruletaId] && roomPlayers[ruletaId][socket.id]) {
      roomPlayers[ruletaId][socket.id].status = status;
      io.to(`host-${ruletaId}`).emit('host:player_status', { socketId: socket.id, status });
    }
  });

  socket.on('player:update', ({ ruletaId, playerName, score, timeLeft, currentIndex }) => {
    io.to(`host-${ruletaId}`).emit('host:player_update', {
      socketId: socket.id,
      playerName,
      score,
      timeLeft,
      currentIndex
    });
  });

  socket.on('player:finished', ({ ruletaId, playerName, score, timeSeconds }) => {
    if (roomPlayers[ruletaId] && roomPlayers[ruletaId][socket.id]) {
      roomPlayers[ruletaId][socket.id].status = 'finished';
    }
    
    io.to(`host-${ruletaId}`).emit('host:player_finished', {
      socketId: socket.id,
      playerName,
      score,
      timeSeconds,
      status: 'finished'
    });
  });

  // --- Lógica del Host (Dashboard) ---
  socket.on('host:join', ({ ruletaId }) => {
    socket.join(`host-${ruletaId}`);
    console.log(`Host unido al dashboard de la ruleta ${ruletaId}`);
  });

  socket.on('host:kick_player', ({ ruletaId, socketId }) => {
    if (roomPlayers[ruletaId] && roomPlayers[ruletaId][socketId]) {
      // Remover de la lista del backend
      delete roomPlayers[ruletaId][socketId];
      // Informar al jugador que fue expulsado
      io.to(socketId).emit('player:kicked');
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    if (socket.ruletaId && roomPlayers[socket.ruletaId] && roomPlayers[socket.ruletaId][socket.id]) {
      // Emitir que abandonó
      io.to(`host-${socket.ruletaId}`).emit('host:player_status', { socketId: socket.id, status: 'abandoned' });
      delete roomPlayers[socket.ruletaId][socket.id];
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Servidor Socket.IO corriendo en el puerto ${PORT}`);
});
