// src/server.js

const express = require('express');
const mqtt = require('mqtt');
// [NOVO] Importa as bibliotecas http e socket.io
const http = require('http');
const { Server } = require("socket.io");

// --- CONFIGURAÇÃO DO SERVIDOR WEB ---
const app = express();
// [NOVO] Cria um servidor HTTP a partir do nosso app Express.
// Isso é necessário para que possamos "anexar" o socket.io a ele.
const server = http.createServer(app);
// [NOVO] Cria uma instância do socket.io, anexada ao servidor HTTP.
const io = new Server(server, {
  cors: {
    origin: "*", // Em um ambiente de produção, restrinja isso!
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

// --- CONFIGURAÇÃO DO CLIENTE MQTT ---
const brokerOptions = {
  host: '165.227.199.114',
  port: 1883,
  username: 'admin',
  password: '1234' // ATENÇÃO: Coloque sua senha!
};
const topic = 'mvp/maquina_teste/dados';

console.log(`🔌 Tentando conectar ao broker MQTT em ${brokerOptions.host}...`);
const client = mqtt.connect(`mqtt://${brokerOptions.host}`, brokerOptions);

// --- LÓGICA DE EVENTOS MQTT ---
client.on('connect', () => {
  console.log('✅ Conectado com sucesso ao broker MQTT!');
  client.subscribe(topic, (err) => {
    if (!err) {
      console.log(`📰 Assinatura realizada com sucesso no tópico: "${topic}"`);
    }
  });
});

// [MODIFICADO] Evento de recebimento de mensagem
client.on('message', (receivedTopic, message) => {
  const messageStr = message.toString();
  console.log(`📥 Mensagem MQTT recebida: ${messageStr}`); // Mantemos o log para depuração
  
  // [NOVO] Transmite a mensagem para todos os clientes conectados via WebSocket
  // O evento se chamará 'mqtt_message'. O frontend irá "ouvir" por este nome.
  io.emit('mqtt_message', messageStr);
});

client.on('error', (err) => {
  console.error('❌ Erro de conexão com o broker MQTT:', err);
});

// --- [NOVO] LÓGICA DE EVENTOS SOCKET.IO ---
io.on('connection', (socket) => {
  console.log('💻 Novo cliente conectado via WebSocket:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});


// --- ROTAS E INICIALIZAÇÃO DO SERVIDOR ---
app.get('/', (req, res) => {
  res.send('Arquiteto I.M.P. Backend: Online e com WebSockets ativos!');
});

// [MODIFICADO] Usamos 'server.listen' em vez de 'app.listen'
server.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando na porta http://localhost:${PORT}`);
});