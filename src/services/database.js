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

async function saveReading(data, empresaId) {
  const insertQuery = `INSERT INTO leituras_maquina(temperatura, vibracao, status, pecas_produzidas, empresa_id) VALUES($1, $2, $3, $4, $5)`;
  const values = [data.temperatura, data.vibracao, data.status, data.pecas_produzidas, empresaId];
  try {
    await pool.query(insertQuery, values);
    console.log(`💾 Dados salvos para a empresa ${empresaId}!`);
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

module.exports = { saveReading, getRecentReadings };


