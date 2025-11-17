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

// --- NOVAS ROTAS V2.1 (MÁQUINAS, CICLOS E ALARMES) ---

const { 
  getMaquinasPorEmpresa, 
  buscarCiclosPorData, 
  getLeiturasPorCiclo,
  buscarAlarmes,
  reconhecerAlarme
} = require('./services/database');

// Endpoint para listar máquinas da empresa
app.get('/api/maquinas', async (req, res) => {
  console.log('🔍 Requisição para /api/maquinas recebida');
  
  if (!req.user) {
    console.log('❌ Usuário não autenticado');
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    // Buscar a empresa_id do usuário
    const { data: vinculo, error: vinculoError } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', req.user.id)
      .single();

    if (vinculoError || !vinculo) {
      console.log('❌ Usuário não vinculado a nenhuma empresa');
      return res.status(403).json({ error: 'Usuário não vinculado a empresa' });
    }

    // Buscar as máquinas da empresa
    const maquinas = await getMaquinasPorEmpresa(vinculo.empresa_id);
    
    console.log(`✅ ${maquinas.length} máquina(s) encontrada(s) para empresa ${vinculo.empresa_id}`);
    res.json(maquinas);
  } catch (err) {
    console.log('❌ Erro na requisição:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para buscar ciclos com filtros
app.get('/api/ciclos', async (req, res) => {
  console.log('🔍 Requisição para /api/ciclos recebida');
  
  if (!req.user) {
    console.log('❌ Usuário não autenticado');
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const { maquina_id, data_inicio, data_fim } = req.query;
    
    // Buscar a empresa_id do usuário
    const { data: vinculo, error: vinculoError } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', req.user.id)
      .single();

    if (vinculoError || !vinculo) {
      console.log('❌ Usuário não vinculado a nenhuma empresa');
      return res.status(403).json({ error: 'Usuário não vinculado a empresa' });
    }

    // Se maquina_id foi fornecido, validar se pertence à empresa do usuário
    if (maquina_id) {
      const maquinas = await getMaquinasPorEmpresa(vinculo.empresa_id);
      const maquinaValida = maquinas.find(m => m.id === maquina_id);
      
      if (!maquinaValida) {
        console.log('❌ Máquina não pertence à empresa do usuário');
        return res.status(403).json({ error: 'Máquina não pertence à sua empresa' });
      }
    }

    // Buscar os ciclos
    const ciclos = await buscarCiclosPorData(
      vinculo.empresa_id, 
      maquina_id, 
      data_inicio, 
      data_fim
    );
    
    console.log(`✅ ${ciclos.length} ciclo(s) encontrado(s)`);
    res.json(ciclos);
  } catch (err) {
    console.log('❌ Erro na requisição:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para buscar leituras de um ciclo específico
app.get('/api/ciclos/:id/leituras', async (req, res) => {
  console.log('🔍 Requisição para /api/ciclos/:id/leituras recebida');
  
  if (!req.user) {
    console.log('❌ Usuário não autenticado');
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const { id } = req.params;
    
    // Buscar a empresa_id do usuário
    const { data: vinculo, error: vinculoError } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', req.user.id)
      .single();

    if (vinculoError || !vinculo) {
      console.log('❌ Usuário não vinculado a nenhuma empresa');
      return res.status(403).json({ error: 'Usuário não vinculado a empresa' });
    }

    // Validar se o ciclo pertence à empresa do usuário
    const ciclos = await buscarCiclosPorData(vinculo.empresa_id);
    const cicloValido = ciclos.find(c => c.id === id);
    
    if (!cicloValido) {
      console.log('❌ Ciclo não encontrado ou não pertence à empresa');
      return res.status(404).json({ error: 'Ciclo não encontrado' });
    }

    // Buscar as leituras do ciclo
    const leituras = await getLeiturasPorCiclo(id, vinculo.empresa_id);
    
    console.log(`✅ ${leituras.length} leitura(s) encontrada(s) para ciclo ${id}`);
    res.json(leituras);
  } catch (err) {
    console.log('❌ Erro na requisição:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para buscar alarmes
app.get('/api/alarmes', async (req, res) => {
  console.log('🔍 Requisição para /api/alarmes recebida');
  
  if (!req.user) {
    console.log('❌ Usuário não autenticado');
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const { maquina_id, reconhecido, prioridade } = req.query;
    
    // Buscar a empresa_id do usuário
    const { data: vinculo, error: vinculoError } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', req.user.id)
      .single();

    if (vinculoError || !vinculo) {
      console.log('❌ Usuário não vinculado a nenhuma empresa');
      return res.status(403).json({ error: 'Usuário não vinculado a empresa' });
    }

    // Preparar filtros
    const filtros = {};
    if (maquina_id) filtros.maquina_id = maquina_id;
    if (reconhecido !== undefined) filtros.reconhecido = reconhecido === 'true';
    if (prioridade) filtros.prioridade = prioridade;

    // Buscar os alarmes
    const alarmes = await buscarAlarmes(vinculo.empresa_id, filtros);
    
    console.log(`✅ ${alarmes.length} alarme(s) encontrado(s)`);
    res.json(alarmes);
  } catch (err) {
    console.log('❌ Erro na requisição:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para reconhecer um alarme
app.post('/api/alarmes/:id/reconhecer', async (req, res) => {
  console.log('🔍 Requisição para reconhecer alarme recebida');
  
  if (!req.user) {
    console.log('❌ Usuário não autenticado');
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const { id } = req.params;
    
    // Buscar a empresa_id do usuário
    const { data: vinculo, error: vinculoError } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', req.user.id)
      .single();

    if (vinculoError || !vinculo) {
      console.log('❌ Usuário não vinculado a nenhuma empresa');
      return res.status(403).json({ error: 'Usuário não vinculado a empresa' });
    }

    // Reconhecer o alarme
    const alarmeAtualizado = await reconhecerAlarme(id, req.user.id, vinculo.empresa_id);
    
    if (!alarmeAtualizado) {
      console.log('❌ Alarme não encontrado ou não pertence à empresa');
      return res.status(404).json({ error: 'Alarme não encontrado' });
    }
    
    console.log(`✅ Alarme ${id} reconhecido por usuário ${req.user.id}`);
    res.json(alarmeAtualizado);
  } catch (err) {
    console.log('❌ Erro na requisição:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
server.listen(PORT, () => console.log(`🚀 Servidor backend rodando na porta http://localhost:${PORT}`));