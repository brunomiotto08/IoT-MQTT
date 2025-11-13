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

// Middleware para parse de JSON
app.use(express.json());

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
    
    // Aguardar o cliente informar sua empresa
    socket.on('join_empresa', (empresaId) => {
      if (empresaId) {
        const roomName = `empresa_${empresaId}`;
        socket.join(roomName);
        console.log(`✅ Cliente ${socket.id} entrou no room: ${roomName}`);
        socket.emit('connected', { message: 'Conectado com sucesso!', empresa_id: empresaId });
      } else {
        console.log('⚠️ Cliente conectou sem empresa_id');
        socket.emit('connected', { message: 'Conectado, mas sem empresa definida' });
      }
    });
    
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
    // 1. Buscar a empresa_id do usuário logado
    console.log('🔍 Buscando empresa do usuário:', req.user.id);
    const { data: vinculo, error: vinculoError } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', req.user.id)
      .single();

    if (vinculoError || !vinculo) {
      console.log('❌ Usuário não está vinculado a nenhuma empresa');
      return res.status(403).json({ error: 'Usuário não vinculado a empresa' });
    }

    console.log('🏢 Empresa do usuário:', vinculo.empresa_id);

    // 2. Buscar APENAS as leituras da empresa do usuário
    console.log('🔍 Buscando leituras da empresa:', vinculo.empresa_id);
    const { data, error } = await supabase
      .from('leituras_maquina')
      .select('*')
      .eq('empresa_id', vinculo.empresa_id)  // ✅ FILTRO EXPLÍCITO POR EMPRESA!
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.log('❌ Erro ao buscar dados:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Dados encontrados:', data ? data.length : 0, 'registros da empresa', vinculo.empresa_id);
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

// --- ENDPOINTS DE GERENCIAMENTO DE EMPRESAS ---

// Buscar informações da empresa do usuário
app.get('/api/empresa', async (req, res) => {
  console.log('🔍 Requisição para /api/empresa recebida');
  
  if (!req.user) {
    console.log('❌ Usuário não autenticado');
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const { data, error } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id, email, role, empresas(*)')
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      console.log('❌ Erro ao buscar empresa:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Empresa encontrada:', data.empresas.nome);
    res.json(data);
  } catch (err) {
    console.log('❌ Erro na requisição:', err);
    res.status(500).json({ error: err.message });
  }
});

// Listar usuários da empresa (apenas admin)
app.get('/api/empresa/usuarios', async (req, res) => {
  console.log('🔍 Requisição para /api/empresa/usuarios recebida');
  
  if (!req.user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    // Verificar se o usuário é admin da empresa
    const { data: userEmpresa, error: userError } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id, role')
      .eq('user_id', req.user.id)
      .single();

    if (userError || !userEmpresa) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (userEmpresa.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem ver esta informação' });
    }

    // Buscar todos os usuários da mesma empresa
    const { data, error } = await supabase
      .from('usuarios_empresas')
      .select('id, email, role, created_at')
      .eq('empresa_id', userEmpresa.empresa_id);

    if (error) {
      console.log('❌ Erro ao buscar usuários:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Usuários encontrados:', data.length);
    res.json(data);
  } catch (err) {
    console.log('❌ Erro na requisição:', err);
    res.status(500).json({ error: err.message });
  }
});

// Atualizar informações da empresa (apenas admin)
app.put('/api/empresa', async (req, res) => {
  console.log('🔍 Requisição para atualizar empresa recebida');
  
  if (!req.user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    // Verificar se o usuário é admin da empresa
    const { data: userEmpresa, error: userError } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id, role')
      .eq('user_id', req.user.id)
      .single();

    if (userError || !userEmpresa) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (userEmpresa.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem atualizar a empresa' });
    }

    // Atualizar a empresa
    const { nome } = req.body;
    const { data, error } = await supabase
      .from('empresas')
      .update({ nome })
      .eq('id', userEmpresa.empresa_id)
      .select()
      .single();

    if (error) {
      console.log('❌ Erro ao atualizar empresa:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Empresa atualizada:', data.nome);
    res.json(data);
  } catch (err) {
    console.log('❌ Erro na requisição:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
server.listen(PORT, () => console.log(`🚀 Servidor backend rodando na porta http://localhost:${PORT}`));