// ═══════════════════════════════════════════════════════════════
// SCRIPT DE DIAGNÓSTICO - Sistema I.M.P. V2.2
// ═══════════════════════════════════════════════════════════════
// Este script verifica se os dados estão sendo salvos corretamente
// e identifica problemas de configuração
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_CONNECTION_STRING,
});

async function diagnosticar() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         DIAGNÓSTICO DO SISTEMA I.M.P. V2.2                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Verificar conexão
    console.log('📡 1. Testando conexão com o banco de dados...');
    const testConnection = await pool.query('SELECT NOW()');
    console.log('   ✅ Conexão OK - Hora do servidor:', testConnection.rows[0].now);

    // 2. Verificar se a tabela existe e tem os novos campos
    console.log('\n📋 2. Verificando estrutura da tabela leituras_maquina...');
    const tableCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'leituras_maquina' 
      AND column_name IN (
        'pressao_envelope', 
        'pressao_saco_ar', 
        'status_motor_ventilador',
        'status_valvula_entrada_autoclave'
      )
      ORDER BY column_name
    `);
    
    if (tableCheck.rows.length === 4) {
      console.log('   ✅ Todos os novos campos existem:');
      tableCheck.rows.forEach(row => {
        console.log(`      - ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('   ❌ PROBLEMA: Faltam campos! Encontrados:', tableCheck.rows.length);
      console.log('   🔧 SOLUÇÃO: Execute a migração V2.2!');
      console.log('      Arquivo: supabase/migration_v2_2_novos_campos.sql');
    }

    // 3. Verificar quantas empresas existem
    console.log('\n🏢 3. Verificando empresas cadastradas...');
    const empresas = await pool.query('SELECT id, nome FROM empresas ORDER BY id');
    if (empresas.rows.length === 0) {
      console.log('   ❌ PROBLEMA: Nenhuma empresa cadastrada!');
      console.log('   🔧 SOLUÇÃO: Cadastre uma empresa no banco.');
    } else {
      console.log(`   ✅ ${empresas.rows.length} empresa(s) encontrada(s):`);
      empresas.rows.forEach(emp => {
        console.log(`      - ID: ${emp.id} | Nome: ${emp.nome}`);
      });
    }

    // 4. Verificar máquinas cadastradas
    console.log('\n🔧 4. Verificando máquinas cadastradas...');
    const maquinas = await pool.query(`
      SELECT m.id, m.nome, m.uuid_maquina, m.empresa_id, e.nome as empresa_nome
      FROM maquinas m
      LEFT JOIN empresas e ON m.empresa_id = e.id
      ORDER BY m.empresa_id, m.nome
    `);
    
    if (maquinas.rows.length === 0) {
      console.log('   ❌ PROBLEMA: Nenhuma máquina cadastrada!');
      console.log('   🔧 SOLUÇÃO: Cadastre uma máquina no banco.');
      console.log('      Exemplo SQL:');
      console.log('      INSERT INTO maquinas (empresa_id, nome, modelo, uuid_maquina)');
      console.log('      VALUES (\'10\', \'Autoclave 001\', \'Modelo X\', \'autoclave-001\');');
    } else {
      console.log(`   ✅ ${maquinas.rows.length} máquina(s) encontrada(s):`);
      maquinas.rows.forEach(maq => {
        console.log(`      - UUID: ${maq.uuid_maquina}`);
        console.log(`        Nome: ${maq.nome}`);
        console.log(`        Empresa: ${maq.empresa_nome} (ID: ${maq.empresa_id})`);
      });
    }

    // 5. Verificar leituras no banco
    console.log('\n📊 5. Verificando leituras salvas...');
    const totalLeituras = await pool.query('SELECT COUNT(*) FROM leituras_maquina');
    console.log(`   Total de leituras no banco: ${totalLeituras.rows[0].count}`);

    if (parseInt(totalLeituras.rows[0].count) === 0) {
      console.log('   ⚠️ ATENÇÃO: Nenhuma leitura encontrada!');
      console.log('   Isso é normal se você ainda não enviou dados via MQTT.');
    } else {
      // Mostrar últimas 5 leituras
      const ultimasLeituras = await pool.query(`
        SELECT 
          id,
          temperatura,
          pressao_envelope,
          pressao_saco_ar,
          status,
          empresa_id,
          maquina_id,
          created_at
        FROM leituras_maquina 
        ORDER BY created_at DESC 
        LIMIT 5
      `);

      console.log('\n   📋 Últimas 5 leituras:');
      ultimasLeituras.rows.forEach((leitura, index) => {
        console.log(`\n   ${index + 1}. Leitura ID: ${leitura.id}`);
        console.log(`      Empresa ID: ${leitura.empresa_id}`);
        console.log(`      Máquina ID: ${leitura.maquina_id || 'null'}`);
        console.log(`      Temperatura: ${leitura.temperatura}°C`);
        console.log(`      Pressão Envelope: ${leitura.pressao_envelope || 'null'} bar`);
        console.log(`      Pressão Saco Ar: ${leitura.pressao_saco_ar || 'null'} bar`);
        console.log(`      Status: ${leitura.status}`);
        console.log(`      Data: ${new Date(leitura.created_at).toLocaleString('pt-BR')}`);
      });

      // Agrupar por empresa
      const porEmpresa = await pool.query(`
        SELECT empresa_id, COUNT(*) as total
        FROM leituras_maquina
        GROUP BY empresa_id
        ORDER BY empresa_id
      `);

      console.log('\n   📊 Leituras por empresa:');
      porEmpresa.rows.forEach(row => {
        console.log(`      Empresa ${row.empresa_id}: ${row.total} leituras`);
      });
    }

    // 6. Verificar usuários e vínculos
    console.log('\n👥 6. Verificando usuários e vínculos com empresas...');
    const usuarios = await pool.query(`
      SELECT 
        ue.email,
        ue.empresa_id,
        e.nome as empresa_nome,
        ue.role
      FROM usuarios_empresas ue
      LEFT JOIN empresas e ON ue.empresa_id = e.id
      ORDER BY ue.empresa_id
    `);

    if (usuarios.rows.length === 0) {
      console.log('   ❌ PROBLEMA: Nenhum usuário cadastrado!');
      console.log('   🔧 SOLUÇÃO: Faça login no sistema para criar um usuário.');
    } else {
      console.log(`   ✅ ${usuarios.rows.length} usuário(s) encontrado(s):`);
      usuarios.rows.forEach(user => {
        console.log(`      - Email: ${user.email}`);
        console.log(`        Empresa: ${user.empresa_nome} (ID: ${user.empresa_id})`);
        console.log(`        Role: ${user.role}`);
      });
    }

    // 7. DIAGNÓSTICO CRÍTICO: Compatibilidade de IDs
    console.log('\n🔍 7. DIAGNÓSTICO CRÍTICO - Verificando compatibilidade...');
    
    const primeiroUsuario = usuarios.rows[0];
    const primeiraMaquina = maquinas.rows[0];
    
    if (primeiroUsuario && primeiraMaquina) {
      console.log(`\n   Usuário logado está vinculado à Empresa ID: ${primeiroUsuario.empresa_id}`);
      console.log(`   Máquina cadastrada pertence à Empresa ID: ${primeiraMaquina.empresa_id}`);
      
      if (primeiroUsuario.empresa_id === primeiraMaquina.empresa_id) {
        console.log('   ✅ IDs COMPATÍVEIS! Os dados devem aparecer.');
      } else {
        console.log('   ❌ PROBLEMA ENCONTRADO! IDs INCOMPATÍVEIS!');
        console.log('\n   🔧 SOLUÇÃO:');
        console.log('   Opção 1: Use o tópico MQTT com a empresa correta:');
        console.log(`   empresas/${primeiroUsuario.empresa_id}/maquinas/autoclave-001/dados`);
        console.log('\n   Opção 2: Atualize o vínculo do usuário:');
        console.log(`   UPDATE usuarios_empresas SET empresa_id = '${primeiraMaquina.empresa_id}' WHERE email = '${primeiroUsuario.email}';`);
        console.log('\n   Opção 3: Atualize a empresa da máquina:');
        console.log(`   UPDATE maquinas SET empresa_id = '${primeiroUsuario.empresa_id}' WHERE uuid_maquina = '${primeiraMaquina.uuid_maquina}';`);
      }
    }

    // 8. Verificar tipos de dados
    console.log('\n📝 8. Verificando tipos de dados de empresa_id...');
    const tipoEmpresaId = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'empresas' AND column_name = 'id'
    `);
    console.log(`   Tipo de empresa_id: ${tipoEmpresaId.rows[0]?.data_type || 'não encontrado'}`);
    
    if (tipoEmpresaId.rows[0]?.data_type === 'uuid') {
      console.log('   ℹ️ Empresas usam UUID - certifique-se de usar UUIDs válidos!');
    } else if (tipoEmpresaId.rows[0]?.data_type === 'bigint') {
      console.log('   ℹ️ Empresas usam BIGINT - use números inteiros!');
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              DIAGNÓSTICO CONCLUÍDO                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ ERRO DURANTE O DIAGNÓSTICO:', error);
    console.error('\nDetalhes:', error.message);
  } finally {
    await pool.end();
  }
}

// Executar diagnóstico
diagnosticar();

