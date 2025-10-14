// src/App.jsx

// Importa os "Hooks" do React que vamos usar: useState e useEffect
import { useState, useEffect } from 'react';
// Importa a biblioteca socket.io-client que instalamos
import io from 'socket.io-client';

// Estabelece a conexão com nosso backend.
// ATENÇÃO: O endereço deve ser o do seu backend, que está rodando em localhost na porta 3000.
const socket = io('http://localhost:3000');

function App() {
  // Cria um "estado" chamado 'data' para armazenar a última mensagem recebida.
  // 'setData' é a função que usamos para atualizar esse estado.
  const [data, setData] = useState(null);

  // useEffect é um Hook que executa "efeitos colaterais" em componentes funcionais.
  // Conectar a um socket é um efeito colateral.
  // O array vazio [] no final faz com que este efeito execute apenas UMA VEZ,
  // quando o componente é montado pela primeira vez.
  useEffect(() => {
    // Liga um "ouvinte" para o evento 'mqtt_message'.
    // Este nome de evento ('mqtt_message') DEVE ser o mesmo que o backend usa no 'io.emit()'.
    socket.on('mqtt_message', (message) => {
      console.log('Nova mensagem recebida do backend:', message);
      // Quando uma mensagem chega, nós a salvamos no nosso estado 'data'.
      // Como a mensagem é uma string JSON, nós a convertemos para um objeto JavaScript.
      setData(JSON.parse(message));
    });

    // Função de "limpeza": será executada quando o componente for "desmontado".
    // Isso é uma boa prática para evitar conexões duplicadas.
    return () => {
      socket.off('mqtt_message');
    };
  }, []); // O array vazio significa: execute este efeito apenas uma vez.

  return (
    <div>
      <h1>Plataforma de Monitoramento Industrial (I.M.P.)</h1>
      <h2>Dados da Máquina em Tempo Real</h2>
      {/* Exibimos os dados recebidos. Usamos uma verificação para garantir que 'data' não é nulo. */}
      {data ? (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p>Aguardando dados...</p>
      )}
    </div>
  );
}

export default App;