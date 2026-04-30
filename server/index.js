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

// Mock de base de datos en memoria para guardar las contraseñas de las ruletas.
const ruletasPasswords = {}; 

app.post('/api/ruletas', (req, res) => {
  const { id, password } = req.body;
  ruletasPasswords[id] = password;
  res.json({ success: true });
});

app.post('/api/verify-host', (req, res) => {
  const { id, password } = req.body;
  if (ruletasPasswords[id] === password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: `Contraseña incorrecta ${ruletasPasswords[id]}, ${password}` });
  }
});

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);

  // --- Lógica del Jugador ---
  socket.on('player:join', ({ ruletaId, playerName }) => {
    socket.join(ruletaId);
    console.log(`Jugador ${playerName} entró a la ruleta ${ruletaId}`);
    io.to(`host-${ruletaId}`).emit('host:player_joined', { playerName, socketId: socket.id, status: 'playing' });
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

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Servidor Socket.IO corriendo en http://localhost:${PORT}`);
});
