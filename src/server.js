// src/server.js (Backend) - Versão final com CORS

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { initializeMqttClient } = require('./services/mqttClient');
const { getRecentReadings } = require('./services/database');

// [NOVO] Importa a biblioteca cors
const cors = require('cors');

// --- CONFIGURAÇÃO DO SERVIDOR WEB E WEBSOCKET ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
const PORT = 3000;

// [NOVO] Habilita o CORS para todas as requisições HTTP.
// Esta linha deve vir antes da definição das suas rotas (app.get).
app.use(cors());

// --- INICIALIZAÇÃO DO CLIENTE MQTT VIA SERVIÇO ---
initializeMqttClient(io);

io.on('connection', (socket) => {
    console.log('💻 Novo cliente conectado via WebSocket:', socket.id);
    socket.on('disconnect', () => console.log('🔌 Cliente desconectado:', socket.id));
});

// --- ROTAS DA API ---
// Endpoint para dados históricos
app.get('/api/leituras', async (req, res) => {
  const readings = await getRecentReadings(50); // Busca as últimas 50 leituras
  res.json(readings);
});

// Rota principal
app.get('/', (req, res) => res.send('Arquiteto I.M.P. Backend: Online! (Refatorado)'));


// --- INICIALIZAÇÃO DO SERVIDOR ---
server.listen(PORT, () => console.log(`🚀 Servidor backend rodando na porta http://localhost:${PORT}`));