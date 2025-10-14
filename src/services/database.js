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

async function saveReading(data) {
  const insertQuery = `
    INSERT INTO leituras_maquina(temperatura, vibracao, status, pecas_produzidas) 
    VALUES($1, $2, $3, $4)
  `;
  const values = [data.temperatura, data.vibracao, data.status, data.pecas_produzidas];

  try {
    await pool.query(insertQuery, values);
    console.log('💾 Dados salvos com sucesso no banco de dados!');
  } catch (err) {
    console.error('❌ Erro ao salvar dados no banco de dados:', err.stack);
  }
}

// [MODIFICADO] Função para buscar leituras recentes com timestamp formatado
async function getRecentReadings(limit = 50) {
  const selectQuery = `
    SELECT
      id,
      to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
      temperatura,
      vibracao,
      status,
      pecas_produzidas
    FROM (
      SELECT * FROM leituras_maquina ORDER BY created_at DESC LIMIT $1
    ) sub
    ORDER BY created_at ASC;
  `;
  try {
    const res = await pool.query(selectQuery, [limit]);
    return res.rows;
  } catch (err) {
    console.error('❌ Erro ao buscar dados históricos:', err.stack);
    return [];
  }
}

module.exports = { saveReading, getRecentReadings };


