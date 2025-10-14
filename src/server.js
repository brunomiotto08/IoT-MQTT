// src/server.js (Backend)

const express = require('express');
const mqtt = require('mqtt');
const http = require('http');
const { Server } = require("socket.io");
// [NOVO] Importa a classe Pool da biblioteca 'pg'
const { Pool } = require('pg');

// --- CONFIGURAÇÃO DO SERVIDOR WEB E WEBSOCKET ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
const PORT = 3000;

// --- [NOVO] CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE) ---
const connectionString = 'postgresql://postgres.nwifacoufwbjltsmpxdf:fwzI9s3pNs1fZdVo@aws-1-sa-east-1.pooler.supabase.com:6543/postgres';

// Cria um pool de conexões. O pool gerencia as conexões com o banco de forma eficiente.
const pool = new Pool({
  connectionString: connectionString,
});

// Testando a conexão com o banco de dados ao iniciar
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Erro ao adquirir cliente do pool de conexões', err.stack);
  }
  console.log('✅ Conectado com sucesso ao banco de dados Supabase!');
  client.release(); // Libera o cliente de volta para o pool
});

// --- CONFIGURAÇÃO DO CLIENTE MQTT ---
const brokerOptions = {
  host: '165.227.199.114',
  port: 1883,
  username: 'admin',
  password: '1234'
};
const topic = 'mvp/maquina_teste/dados';

console.log(`🔌 Tentando conectar ao broker MQTT em ${brokerOptions.host}...`);
const client = mqtt.connect(`mqtt://${brokerOptions.host}`, brokerOptions);

// --- LÓGICA DE EVENTOS MQTT ---
client.on('connect', () => {
  console.log('✅ Conectado com sucesso ao broker MQTT!');
  client.subscribe(topic, (err) => {
    if (!err) console.log(`📰 Assinatura realizada com sucesso no tópico: "${topic}"`);
  });
});

// [MODIFICADO] Evento de recebimento de mensagem agora com lógica de BD
client.on('message', async (receivedTopic, message) => {
  const messageStr = message.toString();
  console.log(`📥 Mensagem MQTT recebida: ${messageStr}`);
  
  // Transmite a mensagem para todos os clientes via WebSocket
  io.emit('mqtt_message', messageStr);

  // [NOVO] Salva a mensagem no banco de dados
  try {
    const data = JSON.parse(messageStr);
    
    // Define o texto da nossa query SQL
    const insertQuery = `
      INSERT INTO leituras_maquina(temperatura, vibracao, status, pecas_produzidas) 
      VALUES($1, $2, $3, $4)
    `;
    
    // Define os valores que substituirão $1, $2, $3, $4
    const values = [data.temperatura, data.vibracao, data.status, data.pecas_produzidas];

    // Executa a query
    await pool.query(insertQuery, values);
    console.log('💾 Dados salvos com sucesso no banco de dados!');

  } catch (err) {
    console.error('❌ Erro ao salvar dados no banco de dados:', err.stack);
  }
});

client.on('error', (err) => console.error('❌ Erro de conexão com o broker MQTT:', err));

// --- LÓGICA DE EVENTOS SOCKET.IO ---
io.on('connection', (socket) => {
  console.log('💻 Novo cliente conectado via WebSocket:', socket.id);
  socket.on('disconnect', () => console.log('🔌 Cliente desconectado:', socket.id));
});

// --- ROTAS E INICIALIZAÇÃO DO SERVIDOR ---
app.get('/', (req, res) => res.send('Arquiteto I.M.P. Backend: Online, com WebSockets e conectado ao Supabase!'));

server.listen(PORT, () => console.log(`🚀 Servidor backend rodando na porta http://localhost:${PORT}`));