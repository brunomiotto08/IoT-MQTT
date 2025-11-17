// src/services/database.js

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_CONNECTION_STRING,
});

pool.connect((err, client, release) => {
    if (err) {
      return console.error('❌ Erro ao adquirir cliente do pool de conexões', err.stack);
    }
    console.log('✅ Conectado com sucesso ao banco de dados Supabase!');
    client.release();
});

async function saveReading(data, empresaId, maquinaId = null, cicloId = null) {
  const insertQuery = `INSERT INTO leituras_maquina(
    temperatura, 
    vibracao, 
    status, 
    pecas_produzidas, 
    empresa_id, 
    maquina_id, 
    ciclo_id,
    pressao_envelope,
    pressao_saco_ar,
    status_motor_ventilador,
    status_valvula_entrada_autoclave,
    status_valvula_descarga_autoclave,
    status_valvula_entrada_saco_ar,
    status_valvula_descarga_saco_ar,
    status_valvula_entrada_envelope,
    status_valvula_descarga_envelope
  ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`;
  
  const values = [
    data.temperatura, 
    data.vibracao, 
    data.status, 
    data.pecas_produzidas, 
    empresaId, 
    maquinaId, 
    cicloId,
    data.pressao_envelope || null,
    data.pressao_saco_ar || null,
    data.status_motor_ventilador || null,
    data.status_valvula_entrada_autoclave || null,
    data.status_valvula_descarga_autoclave || null,
    data.status_valvula_entrada_saco_ar || null,
    data.status_valvula_descarga_saco_ar || null,
    data.status_valvula_entrada_envelope || null,
    data.status_valvula_descarga_envelope || null
  ];
  
  try {
    await pool.query(insertQuery, values);
    console.log(`💾 Dados salvos para a empresa ${empresaId}${maquinaId ? ` - Máquina ${maquinaId}` : ''}${cicloId ? ` - Ciclo ${cicloId}` : ''}!`);
  } catch (err) {
    console.error('❌ Erro ao salvar dados no banco de dados:', err.stack);
  }
}

async function getRecentReadings(limit = 50) {
  // A RLS fará a filtragem por empresa, então não precisamos mais de WHERE aqui.
  // A consulta precisa ser executada por um cliente autenticado.
  const selectQuery = `SELECT * FROM leituras_maquina ORDER BY created_at ASC LIMIT $1`;
  // Esta função será chamada pelo server.js, que usará o cliente Supabase autenticado.
}

// ============================================
// NOVAS FUNÇÕES PARA V2.1
// ============================================

/**
 * Buscar uma máquina pelo seu UUID MQTT
 * @param {string} uuid - UUID da máquina usado no tópico MQTT
 * @returns {object|null} Objeto da máquina ou null se não encontrada
 */
async function getMaquinaPorUUID(uuid) {
  const selectQuery = `SELECT * FROM maquinas WHERE uuid_maquina = $1 LIMIT 1`;
  try {
    const result = await pool.query(selectQuery, [uuid]);
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  } catch (err) {
    console.error('❌ Erro ao buscar máquina por UUID:', err.stack);
    return null;
  }
}

/**
 * Buscar o ciclo ativo de uma máquina
 * @param {string} maquinaId - UUID da máquina
 * @returns {object|null} Objeto do ciclo ativo ou null se não houver
 */
async function getCicloAtivo(maquinaId) {
  const selectQuery = `SELECT * FROM ciclos_producao WHERE maquina_id = $1 AND status = 'ativo' ORDER BY start_time DESC LIMIT 1`;
  try {
    const result = await pool.query(selectQuery, [maquinaId]);
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  } catch (err) {
    console.error('❌ Erro ao buscar ciclo ativo:', err.stack);
    return null;
  }
}

/**
 * Criar um novo ciclo de produção
 * @param {object} dados - { maquina_id, empresa_id, contagem_producao }
 * @returns {object|null} Objeto do ciclo criado ou null em caso de erro
 */
async function criarCiclo(dados) {
  const insertQuery = `
    INSERT INTO ciclos_producao(maquina_id, empresa_id, status, contagem_producao) 
    VALUES($1, $2, 'ativo', $3) 
    RETURNING *
  `;
  const values = [dados.maquina_id, dados.empresa_id, dados.contagem_producao || 0];
  try {
    const result = await pool.query(insertQuery, values);
    console.log(`✅ Ciclo criado: ${result.rows[0].id} para máquina ${dados.maquina_id}`);
    return result.rows[0];
  } catch (err) {
    console.error('❌ Erro ao criar ciclo:', err.stack);
    return null;
  }
}

/**
 * Fechar todos os ciclos ativos de uma máquina
 * @param {string} maquinaId - UUID da máquina
 * @returns {object|null} Objeto do ciclo fechado ou null
 */
async function fecharCiclosAtivos(maquinaId) {
  const updateQuery = `
    UPDATE ciclos_producao 
    SET status = 'concluido', end_time = NOW() 
    WHERE maquina_id = $1 AND status = 'ativo'
    RETURNING *
  `;
  try {
    const result = await pool.query(updateQuery, [maquinaId]);
    if (result.rows.length > 0) {
      console.log(`✅ Ciclo(s) fechado(s) para máquina ${maquinaId}: ${result.rows.length} ciclo(s)`);
      return result.rows[0]; // Retorna o primeiro (geralmente só há um ativo)
    }
    console.log(`⚠️ Nenhum ciclo ativo encontrado para fechar na máquina ${maquinaId}`);
    return null;
  } catch (err) {
    console.error('❌ Erro ao fechar ciclos ativos:', err.stack);
    return null;
  }
}

/**
 * Salvar um alarme no log
 * @param {object} dados - { maquina_id, empresa_id, mensagem, prioridade }
 * @returns {object|null} Objeto do alarme criado ou null
 */
async function salvarAlarme(dados) {
  const insertQuery = `
    INSERT INTO alarmes_log(maquina_id, empresa_id, mensagem, prioridade) 
    VALUES($1, $2, $3, $4) 
    RETURNING *
  `;
  const values = [
    dados.maquina_id, 
    dados.empresa_id, 
    dados.mensagem, 
    dados.prioridade || 'media'
  ];
  try {
    const result = await pool.query(insertQuery, values);
    console.log(`🚨 Alarme salvo: ${result.rows[0].id} - ${dados.mensagem}`);
    return result.rows[0];
  } catch (err) {
    console.error('❌ Erro ao salvar alarme:', err.stack);
    return null;
  }
}

/**
 * Buscar máquinas de uma empresa (usado pela API)
 * @param {string} empresaId - UUID da empresa
 * @returns {array} Array de máquinas
 */
async function getMaquinasPorEmpresa(empresaId) {
  const selectQuery = `SELECT * FROM maquinas WHERE empresa_id = $1 ORDER BY nome ASC`;
  try {
    const result = await pool.query(selectQuery, [empresaId]);
    return result.rows;
  } catch (err) {
    console.error('❌ Erro ao buscar máquinas por empresa:', err.stack);
    return [];
  }
}

/**
 * Buscar ciclos com filtros de data e máquina
 * @param {string} empresaId - UUID da empresa
 * @param {string} maquinaId - UUID da máquina (opcional)
 * @param {string} dataInicio - Data de início (ISO string)
 * @param {string} dataFim - Data de fim (ISO string)
 * @returns {array} Array de ciclos
 */
async function buscarCiclosPorData(empresaId, maquinaId, dataInicio, dataFim) {
  let query = `
    SELECT 
      c.*,
      m.nome as maquina_nome,
      m.modelo as maquina_modelo,
      EXTRACT(EPOCH FROM (COALESCE(c.end_time, NOW()) - c.start_time)) / 60 as duracao_minutos
    FROM ciclos_producao c
    JOIN maquinas m ON c.maquina_id = m.id
    WHERE c.empresa_id = $1
  `;
  const values = [empresaId];
  let paramCount = 1;

  if (maquinaId) {
    paramCount++;
    query += ` AND c.maquina_id = $${paramCount}`;
    values.push(maquinaId);
  }

  if (dataInicio) {
    paramCount++;
    query += ` AND c.start_time >= $${paramCount}`;
    values.push(dataInicio);
  }

  if (dataFim) {
    paramCount++;
    query += ` AND c.start_time <= $${paramCount}`;
    values.push(dataFim);
  }

  query += ` ORDER BY c.start_time DESC`;

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('❌ Erro ao buscar ciclos por data:', err.stack);
    return [];
  }
}

/**
 * Buscar leituras de um ciclo específico
 * @param {string} cicloId - UUID do ciclo
 * @param {string} empresaId - UUID da empresa (validação de segurança)
 * @returns {array} Array de leituras
 */
async function getLeiturasPorCiclo(cicloId, empresaId) {
  const selectQuery = `
    SELECT * FROM leituras_maquina 
    WHERE ciclo_id = $1 AND empresa_id = $2 
    ORDER BY created_at ASC
  `;
  try {
    const result = await pool.query(selectQuery, [cicloId, empresaId]);
    return result.rows;
  } catch (err) {
    console.error('❌ Erro ao buscar leituras por ciclo:', err.stack);
    return [];
  }
}

/**
 * Buscar alarmes com filtros
 * @param {string} empresaId - UUID da empresa
 * @param {object} filtros - { maquina_id, reconhecido, prioridade }
 * @returns {array} Array de alarmes
 */
async function buscarAlarmes(empresaId, filtros = {}) {
  let query = `
    SELECT 
      a.*,
      m.nome as maquina_nome,
      m.modelo as maquina_modelo
    FROM alarmes_log a
    JOIN maquinas m ON a.maquina_id = m.id
    WHERE a.empresa_id = $1
  `;
  const values = [empresaId];
  let paramCount = 1;

  if (filtros.maquina_id) {
    paramCount++;
    query += ` AND a.maquina_id = $${paramCount}`;
    values.push(filtros.maquina_id);
  }

  if (filtros.reconhecido !== undefined) {
    paramCount++;
    query += ` AND a.reconhecido = $${paramCount}`;
    values.push(filtros.reconhecido);
  }

  if (filtros.prioridade) {
    paramCount++;
    query += ` AND a.prioridade = $${paramCount}`;
    values.push(filtros.prioridade);
  }

  query += ` ORDER BY a.created_at DESC LIMIT 100`;

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('❌ Erro ao buscar alarmes:', err.stack);
    return [];
  }
}

/**
 * Reconhecer um alarme
 * @param {string} alarmeId - UUID do alarme
 * @param {string} userId - UUID do usuário que reconheceu
 * @param {string} empresaId - UUID da empresa (validação de segurança)
 * @returns {object|null} Alarme atualizado ou null
 */
async function reconhecerAlarme(alarmeId, userId, empresaId) {
  const updateQuery = `
    UPDATE alarmes_log 
    SET reconhecido = true, reconhecido_por_user_id = $1, reconhecido_em = NOW()
    WHERE id = $2 AND empresa_id = $3
    RETURNING *
  `;
  try {
    const result = await pool.query(updateQuery, [userId, alarmeId, empresaId]);
    if (result.rows.length > 0) {
      console.log(`✅ Alarme ${alarmeId} reconhecido por usuário ${userId}`);
      return result.rows[0];
    }
    return null;
  } catch (err) {
    console.error('❌ Erro ao reconhecer alarme:', err.stack);
    return null;
  }
}

module.exports = { 
  saveReading, 
  getRecentReadings,
  // Novas funções V2.1
  getMaquinaPorUUID,
  getCicloAtivo,
  criarCiclo,
  fecharCiclosAtivos,
  salvarAlarme,
  getMaquinasPorEmpresa,
  buscarCiclosPorData,
  getLeiturasPorCiclo,
  buscarAlarmes,
  reconhecerAlarme
};


