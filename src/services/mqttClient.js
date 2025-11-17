// src/services/mqttClient.js (V2.1 - Refatorado)

const mqtt = require('mqtt');
const { 
  saveReading, 
  getMaquinaPorUUID, 
  getCicloAtivo, 
  criarCiclo, 
  fecharCiclosAtivos, 
  salvarAlarme 
} = require('./database');

const brokerOptions = {
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASSWORD
};

// Tópico wildcard para capturar todos os tipos de mensagens
const topic = 'empresas/+/maquinas/+/#'; // Captura: dados, ciclo/start, ciclo/end, alarme

function initializeMqttClient(io) {
  console.log(`🔌 Tentando conectar ao broker MQTT em ${brokerOptions.host}...`);
  const client = mqtt.connect(`mqtt://${brokerOptions.host}`, brokerOptions);

  client.on('connect', () => {
    console.log('✅ Conectado com sucesso ao broker MQTT!');
    client.subscribe(topic, (err) => {
      if (!err) {
        console.log(`📰 Assinatura realizada com sucesso no tópico: "${topic}"`);
        console.log('📋 Tipos de mensagem suportados: dados, ciclo/start, ciclo/end, alarme');
      }
    });
  });

  client.on('message', async (receivedTopic, message) => {
    try {
      const messageStr = message.toString();
      console.log(`📥 Mensagem MQTT recebida no tópico "${receivedTopic}": ${messageStr}`);

      // Parsear o tópico: empresas/{empresa_id}/maquinas/{uuid_maquina}/{tipo}
      const topicParts = receivedTopic.split('/');
      
      // Validar formato do tópico
      if (topicParts.length < 5 || topicParts[0] !== 'empresas' || topicParts[2] !== 'maquinas') {
        console.warn('⚠️ Tópico mal formatado:', receivedTopic);
        return;
      }

      const empresaId = topicParts[1];
      const uuidMaquina = topicParts[3];
      const tipoMensagem = topicParts.slice(4).join('/'); // Pode ser 'ciclo/start', 'ciclo/end', etc

      console.log(`🔍 Processando: empresa=${empresaId}, maquina=${uuidMaquina}, tipo=${tipoMensagem}`);

      // 1. Validar se a máquina existe e pertence à empresa
      const maquina = await getMaquinaPorUUID(uuidMaquina);
      if (!maquina) {
        console.error(`❌ Máquina ${uuidMaquina} não encontrada no banco de dados.`);
        return;
      }

      if (maquina.empresa_id !== empresaId) {
        console.error(`❌ Máquina ${uuidMaquina} não pertence à empresa ${empresaId}.`);
        return;
      }

      const maquinaId = maquina.id;
      console.log(`✅ Máquina validada: ${maquina.nome} (${maquinaId})`);

      // 2. Processar mensagem baseado no tipo
      switch (tipoMensagem) {
        case 'dados':
          await processarDados(maquinaId, empresaId, messageStr, io, maquina.nome);
          break;
        
        case 'ciclo/start':
          await processarCicloStart(maquinaId, empresaId, messageStr);
          break;
        
        case 'ciclo/end':
          await processarCicloEnd(maquinaId, empresaId);
          break;
        
        case 'alarme':
          await processarAlarme(maquinaId, empresaId, messageStr, io, maquina.nome);
          break;
        
        default:
          console.warn(`⚠️ Tipo de mensagem não reconhecido: ${tipoMensagem}`);
      }

    } catch (error) {
      console.error('❌ Erro ao processar mensagem MQTT:', error);
    }
  });

  client.on('error', (err) => console.error('❌ Erro de conexão com o broker MQTT:', err));
  
  client.on('close', () => console.log('🔌 Conexão MQTT fechada'));
  
  client.on('reconnect', () => console.log('🔄 Tentando reconectar ao broker MQTT...'));
}

// ============================================
// FUNÇÕES DE PROCESSAMENTO DE MENSAGENS
// ============================================

// Cache para evitar spam de notificações (cooldown de 30 segundos)
const notificationCache = new Map();
const COOLDOWN_MS = 30 * 1000; // 30 segundos

function podeEnviarNotificacao(maquinaId, tipo, prioridade) {
  const key = `${maquinaId}_${tipo}_${prioridade}`;
  const lastTime = notificationCache.get(key);
  const now = Date.now();
  
  if (!lastTime || (now - lastTime) > COOLDOWN_MS) {
    notificationCache.set(key, now);
    return true;
  }
  
  return false;
}

/**
 * Processar dados de telemetria (temperatura, vibração, etc)
 */
async function processarDados(maquinaId, empresaId, payloadStr, io, maquinaNome = null) {
  try {
    const dados = JSON.parse(payloadStr);
    
    // 1. Buscar o ciclo ativo para esta máquina
    const cicloAtivo = await getCicloAtivo(maquinaId);
    const cicloId = cicloAtivo ? cicloAtivo.id : null;
    
    if (!cicloId) {
      console.log(`⚠️ Nenhum ciclo ativo para máquina ${maquinaId}. Leitura será salva sem ciclo_id.`);
    }

    // 2. Salvar a leitura no banco de dados
    await saveReading(dados, empresaId, maquinaId, cicloId);
    
    // 3. Verificar thresholds e criar notificações automáticas
    await verificarThresholds(dados, maquinaId, empresaId, io, maquinaNome);
    
    // 4. Emitir via WebSocket para o room da empresa
    const roomName = `empresa_${empresaId}`;
    const mensagemWS = {
      ...dados,
      maquina_id: maquinaId,
      ciclo_id: cicloId,
      empresa_id: empresaId,
      timestamp: new Date().toISOString()
    };
    
    io.to(roomName).emit('mqtt_message', JSON.stringify(mensagemWS));
    console.log(`📤 Dados enviados para o room: ${roomName}`);
    
  } catch (err) {
    console.error('❌ Erro ao processar dados de telemetria:', err);
  }
}

/**
 * Verificar thresholds e criar notificações automáticas
 * 
 * ⚠️ IMPORTANTE: Estes limites devem estar SINCRONIZADOS com o frontend!
 * 
 * LIMITES PADRÃO (igual ao frontend - Configuracoes.jsx e DataCard.jsx):
 * - Temperatura: Atenção ≥ 90°C, Crítico ≥ 100°C
 * - Vibração: Atenção ≥ 5 mm/s, Crítico ≥ 8 mm/s
 * - Mínimos: Temp ≤ 0°C (crítico), ≤ 10°C (azul) | Vib ≤ 0.1 mm/s (crítico), ≤ 0.5 mm/s (azul)
 * 
 * ⚠️ LIMITAÇÃO ATUAL: Se o usuário alterar os limites no menu Configurações,
 * o backend ainda usará estes valores hardcoded, causando inconsistência.
 * 
 * SOLUÇÃO FUTURA: Armazenar limites personalizados no banco de dados por empresa/máquina
 * e consultá-los aqui, ou receber os limites via API/WebSocket do cliente.
 */
async function verificarThresholds(dados, maquinaId, empresaId, io, maquinaNome) {
  try {
    const notificacoes = [];
    
    // ⚠️ LIMITES HARDCODED - Devem estar sincronizados com Configuracoes.jsx e DataCard.jsx
    const THRESHOLDS = {
      temperatura: {
        minimo_critico: 0,      // Crítico baixo: ≤ 0°C (VERMELHO no card)
        minimo_atencao: 10,     // Atenção baixo: ≤ 10°C (AZUL no card)
        maximo_atencao: 90,     // Atenção alto: ≥ 90°C (LARANJA no card) - PADRÃO: 90
        maximo_critico: 100     // Crítico alto: ≥ 100°C (VERMELHO no card) - PADRÃO: 100
      },
      vibracao: {
        minimo_critico: 0.1,    // Crítico baixo: ≤ 0.1 mm/s (VERMELHO no card - máquina parada?)
        minimo_atencao: 0.5,    // Atenção baixo: ≤ 0.5 mm/s (AZUL no card)
        maximo_atencao: 5,      // Atenção alto: ≥ 5 mm/s (LARANJA no card) - PADRÃO: 5
        maximo_critico: 8       // Crítico alto: ≥ 8 mm/s (VERMELHO no card) - PADRÃO: 8
      }
    };
    
    // Verificar temperatura
    if (dados.temperatura !== undefined && dados.temperatura !== null) {
      const temp = parseFloat(dados.temperatura);
      
      // Verificar MÁXIMOS
      if (temp >= THRESHOLDS.temperatura.maximo_critico) {
        notificacoes.push({
          mensagem: `🔥 TEMPERATURA CRÍTICA ALTA: ${temp}°C (limite máximo: ${THRESHOLDS.temperatura.maximo_critico}°C)`,
          prioridade: 'critica',
          tipo: 'temperatura',
          tipoLimite: 'max'
        });
      } else if (temp >= THRESHOLDS.temperatura.maximo_atencao) {
        notificacoes.push({
          mensagem: `⚠️ Temperatura elevada: ${temp}°C (atenção: > ${THRESHOLDS.temperatura.maximo_atencao}°C)`,
          prioridade: 'alta',
          tipo: 'temperatura',
          tipoLimite: 'max'
        });
      }
      
      // Verificar MÍNIMOS
      if (temp <= THRESHOLDS.temperatura.minimo_critico) {
        notificacoes.push({
          mensagem: `❄️ TEMPERATURA CRÍTICA BAIXA: ${temp}°C (limite mínimo: ${THRESHOLDS.temperatura.minimo_critico}°C)`,
          prioridade: 'critica',
          tipo: 'temperatura',
          tipoLimite: 'min'
        });
      } else if (temp <= THRESHOLDS.temperatura.minimo_atencao) {
        notificacoes.push({
          mensagem: `🔵 Temperatura muito baixa: ${temp}°C (atenção: < ${THRESHOLDS.temperatura.minimo_atencao}°C)`,
          prioridade: 'alta',
          tipo: 'temperatura',
          tipoLimite: 'min'
        });
      }
    }
    
    // Verificar vibração
    if (dados.vibracao !== undefined && dados.vibracao !== null) {
      const vib = parseFloat(dados.vibracao);
      
      // Verificar MÁXIMOS
      if (vib >= THRESHOLDS.vibracao.maximo_critico) {
        notificacoes.push({
          mensagem: `🔥 VIBRAÇÃO CRÍTICA ALTA: ${vib} mm/s (limite máximo: ${THRESHOLDS.vibracao.maximo_critico} mm/s)`,
          prioridade: 'critica',
          tipo: 'vibracao',
          tipoLimite: 'max'
        });
      } else if (vib >= THRESHOLDS.vibracao.maximo_atencao) {
        notificacoes.push({
          mensagem: `⚠️ Vibração elevada: ${vib} mm/s (atenção: > ${THRESHOLDS.vibracao.maximo_atencao} mm/s)`,
          prioridade: 'alta',
          tipo: 'vibracao',
          tipoLimite: 'max'
        });
      }
      
      // Verificar MÍNIMOS
      if (vib <= THRESHOLDS.vibracao.minimo_critico) {
        notificacoes.push({
          mensagem: `⚠️ VIBRAÇÃO CRÍTICA BAIXA: ${vib} mm/s - Máquina parada? (limite mínimo: ${THRESHOLDS.vibracao.minimo_critico} mm/s)`,
          prioridade: 'critica',
          tipo: 'vibracao',
          tipoLimite: 'min'
        });
      } else if (vib <= THRESHOLDS.vibracao.minimo_atencao) {
        notificacoes.push({
          mensagem: `🔵 Vibração muito baixa: ${vib} mm/s (atenção: < ${THRESHOLDS.vibracao.minimo_atencao} mm/s)`,
          prioridade: 'alta',
          tipo: 'vibracao',
          tipoLimite: 'min'
        });
      }
    }
    
    // Verificar status de erro
    if (dados.status && (dados.status.toLowerCase() === 'erro' || dados.status.toLowerCase() === 'error')) {
      notificacoes.push({
        mensagem: `❌ Máquina reportou status de ERRO`,
        prioridade: 'critica',
        tipo: 'status',
        tipoLimite: 'max'
      });
    }
    
    // Criar e emitir notificações (com cooldown para evitar spam)
    for (const notif of notificacoes) {
      // Verificar se pode enviar notificação (cooldown de 5 min)
      if (!podeEnviarNotificacao(maquinaId, notif.tipo, notif.prioridade)) {
        console.log(`⏳ Notificação em cooldown: ${notif.tipo} (${notif.prioridade}) - Máquina ${maquinaId}`);
        continue;
      }
      
      const novoAlarme = await salvarAlarme({
        maquina_id: maquinaId,
        empresa_id: empresaId,
        mensagem: notif.mensagem,
        prioridade: notif.prioridade
      });
      
      if (novoAlarme) {
        console.log(`🚨 NOTIFICAÇÃO AUTOMÁTICA: ${notif.mensagem}`);
        console.log(`   Prioridade: ${notif.prioridade} | Tipo: ${notif.tipo}`);
        
        // Emitir notificação via WebSocket
        const roomName = `empresa_${empresaId}`;
        const notificationData = {
          id: novoAlarme.id,
          maquina_id: maquinaId,
          maquina_nome: maquinaNome || `Máquina ${maquinaId}`,
          mensagem: novoAlarme.mensagem,
          prioridade: novoAlarme.prioridade,
          tipo: notif.tipo,
          tipoLimite: notif.tipoLimite || 'max', // 'max' ou 'min'
          created_at: novoAlarme.created_at,
          auto_gerada: true
        };
        
        io.to(roomName).emit('novo_alarme', notificationData);
        io.to(roomName).emit('new_notification', notificationData);
        
        console.log(`📤 Notificação automática enviada para room: ${roomName}`);
      }
    }
    
  } catch (err) {
    console.error('❌ Erro ao verificar thresholds:', err);
  }
}

/**
 * Processar início de ciclo de produção
 */
async function processarCicloStart(maquinaId, empresaId, payloadStr) {
  try {
    const dados = JSON.parse(payloadStr);
    
    // Opcional: Fechar qualquer ciclo que tenha ficado aberto
    const ciclosAbertos = await getCicloAtivo(maquinaId);
    if (ciclosAbertos) {
      console.log(`⚠️ Existe um ciclo ativo para máquina ${maquinaId}. Fechando antes de criar novo...`);
      await fecharCiclosAtivos(maquinaId);
    }
    
    // Criar o novo ciclo
    const novoCiclo = await criarCiclo({
      maquina_id: maquinaId,
      empresa_id: empresaId,
      contagem_producao: dados.contagem_producao || 0
    });
    
    if (novoCiclo) {
      console.log(`✅ Ciclo ${novoCiclo.id} iniciado para máquina ${maquinaId}`);
      console.log(`   Start time: ${novoCiclo.start_time}`);
      console.log(`   Contagem inicial: ${novoCiclo.contagem_producao}`);
    }
    
  } catch (err) {
    console.error('❌ Erro ao processar início de ciclo:', err);
  }
}

/**
 * Processar fim de ciclo de produção
 */
async function processarCicloEnd(maquinaId, empresaId) {
  try {
    // Encontrar e fechar o ciclo ativo
    const cicloFechado = await fecharCiclosAtivos(maquinaId);
    
    if (cicloFechado) {
      const duracao = new Date(cicloFechado.end_time) - new Date(cicloFechado.start_time);
      const duracaoMinutos = Math.round(duracao / 1000 / 60);
      
      console.log(`✅ Ciclo ${cicloFechado.id} finalizado para máquina ${maquinaId}`);
      console.log(`   Duração: ${duracaoMinutos} minutos`);
      console.log(`   Contagem final: ${cicloFechado.contagem_producao}`);
    } else {
      console.log(`⚠️ Nenhum ciclo ativo encontrado para fechar na máquina ${maquinaId}`);
    }
    
  } catch (err) {
    console.error('❌ Erro ao processar fim de ciclo:', err);
  }
}

/**
 * Processar alarme
 */
async function processarAlarme(maquinaId, empresaId, payloadStr, io, maquinaNome = null) {
  try {
    const dados = JSON.parse(payloadStr);
    
    // Salvar o alarme no banco de dados
    const novoAlarme = await salvarAlarme({
      maquina_id: maquinaId,
      empresa_id: empresaId,
      mensagem: dados.mensagem || 'Alarme sem descrição',
      prioridade: dados.prioridade || 'media'
    });
    
    if (novoAlarme) {
      console.log(`🚨 Alarme registrado: ${novoAlarme.id}`);
      console.log(`   Prioridade: ${novoAlarme.prioridade}`);
      console.log(`   Mensagem: ${novoAlarme.mensagem}`);
      
      // Emitir eventos via WebSocket
      const roomName = `empresa_${empresaId}`;
      const notificationData = {
        id: novoAlarme.id,
        maquina_id: maquinaId,
        maquina_nome: maquinaNome || `Máquina ${maquinaId}`,
        mensagem: novoAlarme.mensagem,
        prioridade: novoAlarme.prioridade,
        created_at: novoAlarme.created_at
      };
      
      // Emitir evento de alarme (mantém compatibilidade)
      io.to(roomName).emit('novo_alarme', notificationData);
      
      // Emitir evento de notificação (novo formato para toast)
      io.to(roomName).emit('new_notification', notificationData);
      
      console.log(`📤 Eventos 'novo_alarme' e 'new_notification' enviados para o room: ${roomName}`);
    }
    
  } catch (err) {
    console.error('❌ Erro ao processar alarme:', err);
  }
}

module.exports = { initializeMqttClient };


