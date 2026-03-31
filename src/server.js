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

const allowedOrigins = process.env.FRONTEND_URL
  ? [
      ...process.env.FRONTEND_URL.split(',').map(u => u.trim()),
      'http://localhost:5173'
    ]
  : '*';

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] }
});
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: allowedOrigins }));

// Middleware para parse de JSON
app.use(express.json());

// Middleware para extrair o usuário do token
app.use(async (req, res, next) => {
  if (req.headers.authorization) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const { data: { user } } = await supabase.auth.getUser(token);
      req.user = user;
    } catch (err) {
      console.error('❌ Erro ao validar token:', err.message);
    }
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

    // 2. Buscar leituras filtradas por empresa (obrigatório) e parâmetros opcionais
    const limit       = parseInt(req.query.limit)  || 500;
    const offset      = parseInt(req.query.offset) || 0;
    const maquina_id  = req.query.maquina_id  || null;
    const data_inicio = req.query.data_inicio || null;
    const data_fim    = req.query.data_fim    || null;

    console.log(`🔍 Leituras — empresa: ${vinculo.empresa_id} | maquina: ${maquina_id ?? 'todas'} | de: ${data_inicio ?? '-'} até: ${data_fim ?? '-'} | limit: ${limit}`);

    let query = supabase
      .from('leituras_maquina')
      .select('*')
      .eq('empresa_id', vinculo.empresa_id);

    if (maquina_id)  query = query.eq('maquina_id', maquina_id);
    if (data_inicio) query = query.gte('created_at', data_inicio);
    if (data_fim)    query = query.lte('created_at', data_fim);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.log('❌ Erro ao buscar dados:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ ${data?.length ?? 0} registros retornados`);
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
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const { data, error } = await supabase
      .from('leituras_maquina')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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
  reconhecerAlarme,
  getResumoMaquinas,
  // V2.3 - Rastreabilidade de pneus
  vincularPneus,
  encerrarCiclo,
  buscarCicloPorPneu,
  getPneusDoCiclo,
  getCiclosAtivos,
  getCicloById
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

// Endpoint resumo: todas as máquinas com sua última leitura
app.get('/api/maquinas/resumo', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado' });
  try {
    const { data: vinculo, error: vinculoError } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', req.user.id)
      .single();
    if (vinculoError || !vinculo) return res.status(403).json({ error: 'Usuário não vinculado a empresa' });
    const resumo = await getResumoMaquinas(vinculo.empresa_id);
    res.json(resumo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para criar uma nova máquina
app.post('/api/maquinas', async (req, res) => {
  console.log('🔍 Requisição para criar máquina recebida');

  if (!req.user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const { data: vinculo, error: vinculoError } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id, role')
      .eq('user_id', req.user.id)
      .single();

    if (vinculoError || !vinculo) {
      return res.status(403).json({ error: 'Usuário não vinculado a empresa' });
    }

    const { nome, modelo, uuid_maquina } = req.body;

    if (!nome || !uuid_maquina) {
      return res.status(400).json({ error: 'Nome e UUID da máquina são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('maquinas')
      .insert([{ nome, modelo, uuid_maquina, empresa_id: vinculo.empresa_id, ativa: true }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'UUID da máquina já está em uso' });
      }
      console.log('❌ Erro ao criar máquina:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Máquina criada: ${data.nome} (${data.id})`);
    res.status(201).json(data);
  } catch (err) {
    console.log('❌ Erro na requisição:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para atualizar uma máquina
app.put('/api/maquinas/:id', async (req, res) => {
  console.log('🔍 Requisição para atualizar máquina recebida');

  if (!req.user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const { id } = req.params;

    const { data: vinculo, error: vinculoError } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', req.user.id)
      .single();

    if (vinculoError || !vinculo) {
      return res.status(403).json({ error: 'Usuário não vinculado a empresa' });
    }

    const { nome, modelo, uuid_maquina, ativa } = req.body;

    const { data, error } = await supabase
      .from('maquinas')
      .update({ nome, modelo, uuid_maquina, ativa })
      .eq('id', id)
      .eq('empresa_id', vinculo.empresa_id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'UUID da máquina já está em uso' });
      }
      console.log('❌ Erro ao atualizar máquina:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Máquina não encontrada' });
    }

    console.log(`✅ Máquina atualizada: ${data.nome}`);
    res.json(data);
  } catch (err) {
    console.log('❌ Erro na requisição:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para excluir uma máquina
app.delete('/api/maquinas/:id', async (req, res) => {
  console.log('🔍 Requisição para excluir máquina recebida');

  if (!req.user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const { id } = req.params;

    const { data: vinculo, error: vinculoError } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', req.user.id)
      .single();

    if (vinculoError || !vinculo) {
      return res.status(403).json({ error: 'Usuário não vinculado a empresa' });
    }

    const { error } = await supabase
      .from('maquinas')
      .delete()
      .eq('id', id)
      .eq('empresa_id', vinculo.empresa_id);

    if (error) {
      console.log('❌ Erro ao excluir máquina:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Máquina ${id} excluída`);
    res.json({ success: true });
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

// --- ROTAS V2.3 - RASTREABILIDADE DE PNEUS (estáticas, devem vir antes de /:id) ---

// Helper: busca empresa_id do usuário autenticado
async function getEmpresaId(userId) {
  const { data: vinculo, error } = await supabase
    .from('usuarios_empresas')
    .select('empresa_id')
    .eq('user_id', userId)
    .single();
  if (error || !vinculo) return null;
  return vinculo.empresa_id;
}

// Buscar ciclos ativos da empresa
app.get('/api/ciclos/ativos', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado' });
  try {
    const empresaId = await getEmpresaId(req.user.id);
    if (!empresaId) return res.status(403).json({ error: 'Usuário não vinculado a empresa' });
    const ciclos = await getCiclosAtivos(empresaId);
    res.json(ciclos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar ciclo(s) por código de pneu
app.get('/api/ciclos/buscar-pneu', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado' });
  try {
    const { codigo } = req.query;
    if (!codigo) return res.status(400).json({ error: 'Parâmetro "codigo" é obrigatório' });

    const empresaId = await getEmpresaId(req.user.id);
    if (!empresaId) return res.status(403).json({ error: 'Usuário não vinculado a empresa' });

    const ciclos = await buscarCicloPorPneu(codigo, empresaId);
    res.json(ciclos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vincular pneus a um ciclo ativo (operador registra pneus de um ciclo aberto pelo CLP)
app.post('/api/ciclos/:id/pneus', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado' });
  try {
    const { id } = req.params;
    const { codigos } = req.body; // array de strings

    if (!codigos || !Array.isArray(codigos) || codigos.length === 0) {
      return res.status(400).json({ error: 'Campo "codigos" deve ser um array não vazio' });
    }

    const empresaId = await getEmpresaId(req.user.id);
    if (!empresaId) return res.status(403).json({ error: 'Usuário não vinculado a empresa' });

    const inseridos = await vincularPneus(id, empresaId, codigos);
    console.log(`✅ ${inseridos.length} pneu(s) vinculado(s) ao ciclo ${id}`);
    res.status(201).json(inseridos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar um ciclo específico pelo ID
app.get('/api/ciclos/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado' });
  try {
    const { id } = req.params;
    const empresaId = await getEmpresaId(req.user.id);
    if (!empresaId) return res.status(403).json({ error: 'Usuário não vinculado a empresa' });
    const ciclo = await getCicloById(id, empresaId);
    if (!ciclo) return res.status(404).json({ error: 'Ciclo não encontrado' });
    res.json(ciclo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para buscar leituras de um ciclo específico
app.get('/api/ciclos/:id/leituras', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado' });
  try {
    const { id } = req.params;
    const empresaId = await getEmpresaId(req.user.id);
    if (!empresaId) return res.status(403).json({ error: 'Usuário não vinculado a empresa' });

    const cicloValido = await getCicloById(id, empresaId);
    if (!cicloValido) return res.status(404).json({ error: 'Ciclo não encontrado' });

    const leituras = await getLeiturasPorCiclo(id, empresaId);
    res.json(leituras);
  } catch (err) {
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

// Encerrar ciclo específico
app.put('/api/ciclos/:id/encerrar', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado' });
  try {
    const { id } = req.params;
    const empresaId = await getEmpresaId(req.user.id);
    if (!empresaId) return res.status(403).json({ error: 'Usuário não vinculado a empresa' });

    const ciclo = await encerrarCiclo(id, empresaId);
    if (!ciclo) {
      return res.status(404).json({ error: 'Ciclo não encontrado ou já encerrado' });
    }

    console.log(`✅ Ciclo ${id} encerrado`);
    res.json(ciclo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar pneus de um ciclo específico
app.get('/api/ciclos/:id/pneus', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado' });
  try {
    const { id } = req.params;
    const empresaId = await getEmpresaId(req.user.id);
    if (!empresaId) return res.status(403).json({ error: 'Usuário não vinculado a empresa' });

    const pneus = await getPneusDoCiclo(id, empresaId);
    res.json(pneus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ERROR HANDLER GLOBAL (sempre retorna JSON, nunca HTML) ---
app.use((err, req, res, next) => {
  console.error('❌ Erro não tratado:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor' });
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
server.listen(PORT, () => console.log(`🚀 Servidor backend rodando na porta http://localhost:${PORT}`));