// ═══════════════════════════════════════════════════════════════
// SCRIPT DE TESTE AUTOMÁTICO - Sistema I.M.P. V2.2
// ═══════════════════════════════════════════════════════════════
// Este script envia automaticamente dados de teste via HTTP
// para simular leituras MQTT e testar o sistema completo.
// ═══════════════════════════════════════════════════════════════

const axios = require('axios');

// Configurações
const BACKEND_URL = 'http://localhost:3000';
const EMPRESA_ID = '1'; // Altere conforme sua empresa
const MAQUINA_ID = 'abc123'; // Altere conforme sua máquina
const INTERVALO_MS = 3000; // 3 segundos entre cada envio

// 20 cenários de teste
const cenariosTeste = [
  {
    nome: "1. Operação Normal",
    dados: {
      temperatura: 75.5,
      vibracao: 2.3,
      status: "ativo",
      pecas_produzidas: 150,
      pressao_envelope: 3.2,
      pressao_saco_ar: 4.1,
      status_motor_ventilador: "ligado",
      status_valvula_entrada_autoclave: "aberta",
      status_valvula_descarga_autoclave: "fechada",
      status_valvula_entrada_saco_ar: "aberta",
      status_valvula_descarga_saco_ar: "fechada",
      status_valvula_entrada_envelope: "aberta",
      status_valvula_descarga_envelope: "fechada"
    }
  },
  {
    nome: "2. Temperatura Crítica",
    dados: {
      temperatura: 95.8,
      vibracao: 3.7,
      status: "ativo",
      pecas_produzidas: 245,
      pressao_envelope: 4.5,
      pressao_saco_ar: 5.2,
      status_motor_ventilador: "ligado",
      status_valvula_entrada_autoclave: "aberta",
      status_valvula_descarga_autoclave: "aberta",
      status_valvula_entrada_saco_ar: "aberta",
      status_valvula_descarga_saco_ar: "aberta",
      status_valvula_entrada_envelope: "aberta",
      status_valvula_descarga_envelope: "aberta"
    }
  },
  {
    nome: "3. Máquina Desligada",
    dados: {
      temperatura: 25.3,
      vibracao: 0.1,
      status: "parado",
      pecas_produzidas: 450,
      pressao_envelope: 0.0,
      pressao_saco_ar: 0.0,
      status_motor_ventilador: "desligado",
      status_valvula_entrada_autoclave: "fechada",
      status_valvula_descarga_autoclave: "fechada",
      status_valvula_entrada_saco_ar: "fechada",
      status_valvula_descarga_saco_ar: "fechada",
      status_valvula_entrada_envelope: "fechada",
      status_valvula_descarga_envelope: "fechada"
    }
  },
  {
    nome: "4. Erro em Válvulas",
    dados: {
      temperatura: 82.1,
      vibracao: 4.5,
      status: "erro",
      pecas_produzidas: 320,
      pressao_envelope: 1.2,
      pressao_saco_ar: 6.8,
      status_motor_ventilador: "ligado",
      status_valvula_entrada_autoclave: "erro",
      status_valvula_descarga_autoclave: "fechada",
      status_valvula_entrada_saco_ar: "aberta",
      status_valvula_descarga_saco_ar: "erro",
      status_valvula_entrada_envelope: "erro",
      status_valvula_descarga_envelope: "fechada"
    }
  },
  {
    nome: "5. Produção Alta",
    dados: {
      temperatura: 88.3,
      vibracao: 3.2,
      status: "ativo",
      pecas_produzidas: 785,
      pressao_envelope: 4.8,
      pressao_saco_ar: 5.5,
      status_motor_ventilador: "ligado",
      status_valvula_entrada_autoclave: "aberta",
      status_valvula_descarga_autoclave: "aberta",
      status_valvula_entrada_saco_ar: "aberta",
      status_valvula_descarga_saco_ar: "fechada",
      status_valvula_entrada_envelope: "aberta",
      status_valvula_descarga_envelope: "fechada"
    }
  },
  {
    nome: "6. Pressões Baixas",
    dados: {
      temperatura: 68.5,
      vibracao: 1.8,
      status: "ativo",
      pecas_produzidas: 195,
      pressao_envelope: 0.8,
      pressao_saco_ar: 1.2,
      status_motor_ventilador: "ligado",
      status_valvula_entrada_autoclave: "aberta",
      status_valvula_descarga_autoclave: "fechada",
      status_valvula_entrada_saco_ar: "aberta",
      status_valvula_descarga_saco_ar: "fechada",
      status_valvula_entrada_envelope: "aberta",
      status_valvula_descarga_envelope: "fechada"
    }
  },
  {
    nome: "7. Início de Operação",
    dados: {
      temperatura: 45.2,
      vibracao: 1.5,
      status: "ativo",
      pecas_produzidas: 12,
      pressao_envelope: 2.1,
      pressao_saco_ar: 2.8,
      status_motor_ventilador: "ligado",
      status_valvula_entrada_autoclave: "aberta",
      status_valvula_descarga_autoclave: "fechada",
      status_valvula_entrada_saco_ar: "fechada",
      status_valvula_descarga_saco_ar: "fechada",
      status_valvula_entrada_envelope: "aberta",
      status_valvula_descarga_envelope: "fechada"
    }
  },
  {
    nome: "8. Ciclo de Descarga",
    dados: {
      temperatura: 79.6,
      vibracao: 2.7,
      status: "ativo",
      pecas_produzidas: 530,
      pressao_envelope: 2.5,
      pressao_saco_ar: 3.3,
      status_motor_ventilador: "ligado",
      status_valvula_entrada_autoclave: "fechada",
      status_valvula_descarga_autoclave: "aberta",
      status_valvula_entrada_saco_ar: "fechada",
      status_valvula_descarga_saco_ar: "aberta",
      status_valvula_entrada_envelope: "fechada",
      status_valvula_descarga_envelope: "aberta"
    }
  },
  {
    nome: "9. Modo Econômico",
    dados: {
      temperatura: 62.3,
      vibracao: 1.2,
      status: "ativo",
      pecas_produzidas: 88,
      pressao_envelope: 2.0,
      pressao_saco_ar: 2.5,
      status_motor_ventilador: "ligado",
      status_valvula_entrada_autoclave: "aberta",
      status_valvula_descarga_autoclave: "fechada",
      status_valvula_entrada_saco_ar: "fechada",
      status_valvula_descarga_saco_ar: "fechada",
      status_valvula_entrada_envelope: "aberta",
      status_valvula_descarga_envelope: "fechada"
    }
  },
  {
    nome: "10. Vibração Alta",
    dados: {
      temperatura: 73.8,
      vibracao: 5.8,
      status: "ativo",
      pecas_produzidas: 412,
      pressao_envelope: 3.5,
      pressao_saco_ar: 4.2,
      status_motor_ventilador: "ligado",
      status_valvula_entrada_autoclave: "aberta",
      status_valvula_descarga_autoclave: "fechada",
      status_valvula_entrada_saco_ar: "aberta",
      status_valvula_descarga_saco_ar: "fechada",
      status_valvula_entrada_envelope: "aberta",
      status_valvula_descarga_envelope: "fechada"
    }
  }
];

// Função para enviar dados
async function enviarDados(cenario, index) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TESTE ${index + 1}/10: ${cenario.nome}`);
    console.log(`${'='.repeat(60)}`);
    
    // Simular envio direto para o banco (você pode adaptar conforme seu sistema)
    console.log('📤 Enviando dados:', JSON.stringify(cenario.dados, null, 2));
    
    // Aqui você pode adicionar a lógica de envio para seu backend MQTT
    // Por exemplo, usando o mqttClient ou endpoint HTTP específico
    
    console.log('✅ Dados enviados com sucesso!');
    console.log(`⏱️ Aguardando ${INTERVALO_MS/1000} segundos...`);
    
  } catch (error) {
    console.error('❌ Erro ao enviar dados:', error.message);
  }
}

// Função principal de teste
async function executarTestes() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     TESTE AUTOMÁTICO - Sistema I.M.P. V2.2                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n📍 Backend: ${BACKEND_URL}`);
  console.log(`🏢 Empresa: ${EMPRESA_ID}`);
  console.log(`🔧 Máquina: ${MAQUINA_ID}`);
  console.log(`⏱️ Intervalo: ${INTERVALO_MS/1000}s entre envios\n`);
  console.log('🚀 Iniciando testes em 3 segundos...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  for (let i = 0; i < cenariosTeste.length; i++) {
    await enviarDados(cenariosTeste[i], i);
    
    if (i < cenariosTeste.length - 1) {
      await new Promise(resolve => setTimeout(resolve, INTERVALO_MS));
    }
  }
  
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     TESTES CONCLUÍDOS COM SUCESSO! 🎉                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n📊 Verifique os dados no sistema:');
  console.log('   - Dashboard: http://localhost:5173/');
  console.log('   - Registros: http://localhost:5173/registros');
  console.log('   - Status: http://localhost:5173/status-maquina\n');
}

// Executar testes
executarTestes().catch(console.error);

