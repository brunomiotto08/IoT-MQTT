// src/server.js (Backend) - Versão final com CORS

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { initializeMqttClient } = require('./services/mqttClient');
const { supabase } = require('./services/supabaseClient'); // Cliente supabase do backend

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

// Middleware para extrair o usuário do token
app.use(async (req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    req.user = user;
  }
  next();
});

// --- INICIALIZAÇÃO DO CLIENTE MQTT VIA SERVIÇO ---
initializeMqttClient(io);

io.on('connection', (socket) => {
    console.log('💻 Novo cliente conectado via WebSocket:', socket.id);
    
    // Enviar confirmação de conexão
    socket.emit('connected', { message: 'Conectado com sucesso!' });
    
    socket.on('disconnect', () => console.log('🔌 Cliente desconectado:', socket.id));
});

// --- ROTAS DA API ---
// Endpoint para dados históricos
app.get('/api/leituras', async (req, res) => {
  console.log('🔍 Requisição para /api/leituras recebida');
  console.log('👤 Usuário:', req.user ? 'Autenticado' : 'Não autenticado');
  
  if (!req.user) {
    console.log('❌ Usuário não autenticado');
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    // Cria um cliente supabase específico para este usuário
    const { createClient } = require('@supabase/supabase-js');
    const userSupabase = createClient(process.env.VITE_SUPABASE_URL, req.headers.authorization.split(' ')[1]);
    
    console.log('🔍 Buscando dados históricos...');
    const { data, error } = await userSupabase
      .from('leituras_maquina')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.log('❌ Erro ao buscar dados:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Dados encontrados:', data ? data.length : 0, 'registros');
    res.json(data);
  } catch (err) {
    console.log('❌ Erro na requisição:', err);
    res.status(500).json({ error: err.message });
  }
});

// Rota principal
app.get('/', (req, res) => res.send('Arquiteto I.M.P. Backend: Online! (Refatorado)'));

// Endpoint temporário para testar dados sem autenticação
app.get('/api/leituras-test', async (req, res) => {
  console.log('🔍 Teste: Buscando dados sem autenticação...');
  
  try {
    const { data, error } = await supabase
      .from('leituras_maquina')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.log('❌ Erro ao buscar dados:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Dados encontrados (teste):', data ? data.length : 0, 'registros');
    res.json(data);
  } catch (err) {
    console.log('❌ Erro na requisição (teste):', err);
    res.status(500).json({ error: err.message });
  }
});


// --- INICIALIZAÇÃO DO SERVIDOR ---
server.listen(PORT, () => console.log(`🚀 Servidor backend rodando na porta http://localhost:${PORT}`));