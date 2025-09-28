const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const sessions = new Map();

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Cliente ${socket.id} entrou na sessão ${sessionId}`);
    
    // Notificar que um mobile conectou
    socket.to(sessionId).emit('mobile-connected');
  });

  socket.on('photo-captured', (data) => {
    const { sessionId, photo } = data;
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    sessions.get(sessionId).push(photo);
    
    socket.to(sessionId).emit('new-photo', photo);
    console.log(`Foto capturada na sessão ${sessionId}`);
  });

  socket.on('reset-session', (sessionId) => {
    sessions.delete(sessionId);
    socket.to(sessionId).emit('session-reset');
    console.log(`Sessão ${sessionId} reiniciada`);
  });

  socket.on('mobile-connected', (sessionId) => {
    socket.to(sessionId).emit('mobile-connected');
    console.log(`Celular conectado na sessão ${sessionId}`);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

app.get('/api/sessions/:sessionId/photos', (req, res) => {
  const { sessionId } = req.params;
  const sessionPhotos = sessions.get(sessionId) || [];
  res.json(sessionPhotos);
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', sessions: sessions.size });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 WebSocket pronto para conexões`);
});
