// src/server.js (Backend)

// [NOVO] Carrega as variáveis de ambiente do arquivo .env.
// DEVE SER A PRIMEIRA LINHA DO CÓDIGO!
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { initializeMqttClient } = require('./services/mqttClient');
// [NOVO] Importa a função do banco de dados
const { getRecentReadings } = require('./services/database');

// --- CONFIGURAÇÃO DO SERVIDOR WEB E WEBSOCKET ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
const PORT = 3000;

// --- INICIALIZAÇÃO DO CLIENTE MQTT VIA SERVIÇO ---
initializeMqttClient(io);

io.on('connection', (socket) => {
    console.log('💻 Novo cliente conectado via WebSocket:', socket.id);
    socket.on('disconnect', () => console.log('🔌 Cliente desconectado:', socket.id));
});

// --- ROTAS E INICIALIZAÇÃO DO SERVIDOR ---
// --- [NOVO] ENDPOINT DE API PARA DADOS HISTÓRICOS ---
app.get('/api/leituras', async (req, res) => {
  const readings = await getRecentReadings(50); // Busca as últimas 50 leituras
  res.json(readings);
});

app.get('/', (req, res) => res.send('Arquiteto I.M.P. Backend: Online! (Refatorado)'));

server.listen(PORT, () => console.log(`🚀 Servidor backend rodando na porta http://localhost:${PORT}`));