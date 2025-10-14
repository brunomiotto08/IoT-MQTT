// src/services/mqttClient.js

const mqtt = require('mqtt');
const { saveReading } = require('./database');

const brokerOptions = {
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASSWORD
};
const topic = 'mvp/maquina_teste/dados';

function initializeMqttClient(io) {
  console.log(`🔌 Tentando conectar ao broker MQTT em ${brokerOptions.host}...`);
  const client = mqtt.connect(`mqtt://${brokerOptions.host}`, brokerOptions);

  client.on('connect', () => {
    console.log('✅ Conectado com sucesso ao broker MQTT!');
    client.subscribe(topic, (err) => {
      if (!err) console.log(`📰 Assinatura realizada com sucesso no tópico: "${topic}"`);
    });
  });

  client.on('message', (receivedTopic, message) => {
    const messageStr = message.toString();
    console.log(`📥 Mensagem MQTT recebida: ${messageStr}`);

    io.emit('mqtt_message', messageStr);

    try {
      const data = JSON.parse(messageStr);
      saveReading(data);
    } catch (err) {
      console.error('❌ Erro ao processar mensagem JSON:', err);
    }
  });

  client.on('error', (err) => console.error('❌ Erro de conexão com o broker MQTT:', err));
}

module.exports = { initializeMqttClient };


