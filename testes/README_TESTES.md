# 🧪 Guia de Testes - Sistema I.M.P. V2.2

Este diretório contém todos os arquivos necessários para testar o sistema completo com diferentes cenários de dados.

---

## 📁 Arquivos Disponíveis

### 1. **`dados_mqtt_exemplos.json`**
Arquivo JSON estruturado com 20 cenários de teste completos, incluindo descrição e dados.

**Uso:** Referência completa e documentada de todos os cenários.

### 2. **`JSONS_PARA_TESTAR.txt`**
Arquivo de texto com os 20 JSONs prontos para copiar e colar.

**Uso:** Copie diretamente qualquer JSON e use para testes manuais.

### 3. **`teste_automatico.js`**
Script Node.js que envia automaticamente 10 cenários de teste.

**Uso:** Testes automatizados em sequência.

---

## 🚀 Como Testar

### Método 1: Teste Manual (Recomendado para início)

1. **Abra o arquivo:** `JSONS_PARA_TESTAR.txt`

2. **Copie um JSON** (exemplo: JSON 1 - Operação Normal)

3. **Escolha um método de envio:**

#### Opção A: Via Cliente MQTT
```bash
# Instale um cliente MQTT (ex: mosquitto)
mosquitto_pub -h localhost -t "empresas/1/maquinas/abc123/sensores" -m '{
  "temperatura": 75.5,
  "vibracao": 2.3,
  ...
}'
```

#### Opção B: Via Script Node.js Simples
Crie um arquivo `enviar.js`:
```javascript
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

const dados = {
  "temperatura": 75.5,
  "vibracao": 2.3,
  // ... resto dos dados
};

client.on('connect', () => {
  client.publish('empresas/1/maquinas/abc123/sensores', JSON.stringify(dados));
  console.log('Dados enviados!');
  client.end();
});
```

Execute:
```bash
node enviar.js
```

#### Opção C: Via Backend Diretamente
No arquivo `src/services/database.js`, adicione uma função temporária:
```javascript
// Adicione esta função temporária para testes
async function testeSalvarDados() {
  const dadosTeste = {
    temperatura: 75.5,
    vibracao: 2.3,
    status: "ativo",
    // ... resto dos campos
  };
  
  await saveReading(dadosTeste, '1', 'abc123', null);
  console.log('✅ Dados de teste salvos!');
}

// Chame a função
testeSalvarDados();
```

---

### Método 2: Teste Automatizado

1. **Instale as dependências** (se necessário):
```bash
npm install axios
```

2. **Execute o script de teste:**
```bash
cd testes
node teste_automatico.js
```

3. **Observe os resultados:**
   - O script enviará 10 cenários diferentes
   - Intervalo de 3 segundos entre cada envio
   - Logs detalhados no terminal

---

## 📊 Cenários de Teste Disponíveis

| # | Nome | Descrição | Ideal Para Testar |
|---|------|-----------|-------------------|
| 1 | Operação Normal | Funcionamento padrão | Dashboard básico |
| 2 | Temperatura Crítica | Sistema em alerta | Alarmes de temperatura |
| 3 | Máquina Desligada | Tudo desligado | Status "parado" |
| 4 | Erro em Válvulas | Falhas múltiplas | Detecção de erros |
| 5 | Produção Alta | Alta performance | Pico de produção |
| 6 | Pressões Baixas | Possível vazamento | Alarmes de pressão |
| 7 | Início de Operação | Aquecimento | Transição de estados |
| 8 | Ciclo de Descarga | Descarga ativa | Inversão de válvulas |
| 9 | Modo Econômico | Baixo consumo | Eficiência |
| 10 | Vibração Alta | Desbalanceamento | Alarmes de vibração |
| 11 | Teste de Limite | Máximo operacional | Limites do sistema |
| 12 | Resfriamento | Pós-operação | Transição para parado |
| 13 | Motor em Falha | Motor com erro | Falha crítica |
| 14 | Operação Noturna | Turno noite | Regime reduzido |
| 15 | Ciclo Completo | Todas válvulas abertas | Modo especial |
| 16 | Standby | Modo espera | Estado de repouso |
| 17 | Teste de Qualidade | Inspeção | Baixa produção |
| 18 | Sobrecarga | Sistema estressado | Stress test |
| 19 | Operação Ideal | Condições perfeitas | Referência ótima |
| 20 | Emergência | Parada de emergência | Situação crítica |

---

## 🎯 Sequências de Teste Recomendadas

### Teste Básico (5 minutos)
Envie na ordem:
1. **JSON 1** - Operação Normal
2. **JSON 7** - Início de Operação
3. **JSON 5** - Produção Alta
4. **JSON 3** - Máquina Desligada

**O que verificar:**
- ✅ Dados aparecem no Dashboard
- ✅ Gráficos se atualizam
- ✅ Cards mudam de cor
- ✅ Registros salvam corretamente

### Teste de Alarmes (10 minutos)
Envie na ordem:
1. **JSON 1** - Operação Normal
2. **JSON 2** - Temperatura Crítica
3. **JSON 4** - Erro em Válvulas
4. **JSON 13** - Motor em Falha
5. **JSON 20** - Emergência

**O que verificar:**
- ✅ Notificações aparecem
- ✅ Sons de alarme tocam
- ✅ Cores mudam para vermelho
- ✅ Alarmes salvos no banco

### Teste Completo (30 minutos)
Envie todos os 20 JSONs em sequência com intervalo de 1-2 minutos.

**O que verificar:**
- ✅ Todos os dados salvam corretamente
- ✅ Gráficos mostram variações
- ✅ Tabela de Registros popula
- ✅ Status da Máquina atualiza
- ✅ Filtros funcionam
- ✅ Paginação funciona
- ✅ WebSocket conecta e desconecta

### Teste de Stress (opcional)
Envie rapidamente (< 1 segundo de intervalo) 50-100 leituras.

**O que verificar:**
- ✅ Sistema não trava
- ✅ Banco aguenta carga
- ✅ WebSocket não desconecta
- ✅ Frontend mantém performance

---

## ✅ Checklist de Verificação

Após enviar dados, verifique:

### Dashboard (`/`)
- [ ] Cards de status atualizaram
- [ ] Gráfico de temperatura mostra dados
- [ ] Gráfico de vibração mostra dados
- [ ] Gráfico de produção mostra dados
- [ ] **NOVO:** Gráfico de pressões mostra 2 linhas
- [ ] Cores dos cards correspondem ao status
- [ ] Horário de atualização aparece

### Registros (`/registros`)
- [ ] Nova linha aparece na tabela
- [ ] Data/hora corretos
- [ ] Todas as 14 colunas preenchidas
- [ ] **NOVOS:** Campos de pressão aparecem
- [ ] **NOVOS:** Status de válvulas aparecem
- [ ] **NOVOS:** Status motor aparece
- [ ] Chips coloridos funcionam
- [ ] Filtros funcionam
- [ ] Paginação funciona

### Status da Máquina (`/status-maquina`)
- [ ] Card de Status Geral atualiza
- [ ] Card de Motor Ventilador atualiza
- [ ] 6 cards de válvulas atualizam
- [ ] Card de Info adicional atualiza
- [ ] Cores mudam conforme status:
  - 🟢 Verde para "ligado"/"aberta"/"ativo"
  - 🟡 Amarelo para "desligado"/"fechada"/"parado"
  - 🔴 Vermelho para "erro"/"falha"
- [ ] Valores de pressão aparecem nos cards
- [ ] Filtro por máquina funciona

### Notificações (`/notificacoes`)
- [ ] Alarmes aparecem (se houver)
- [ ] Som toca (se configurado)
- [ ] Prioridades corretas (alta/média/baixa)
- [ ] Reconhecimento funciona

### Banco de Dados
Execute no SQL Editor:
```sql
-- Ver últimas 10 leituras
SELECT * FROM leituras_maquina ORDER BY created_at DESC LIMIT 10;

-- Verificar novos campos
SELECT 
  temperatura,
  pressao_envelope,
  pressao_saco_ar,
  status_motor_ventilador,
  status_valvula_entrada_autoclave
FROM leituras_maquina 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🐛 Problemas Comuns

### Dados não aparecem no Dashboard
**Solução:**
1. Verifique se o backend está rodando
2. Verifique se o WebSocket está conectado (ícone verde no Dashboard)
3. Limpe o cache do navegador (Ctrl+Shift+R)
4. Verifique o console do navegador (F12)

### Erro ao salvar no banco
**Solução:**
1. Confirme que a migração V2.2 foi executada
2. Verifique se todos os campos estão no JSON
3. Veja os logs do backend para detalhes do erro

### Gráficos vazios
**Solução:**
1. Envie pelo menos 3-5 leituras para popular os gráficos
2. Verifique se o filtro de máquina não está bloqueando dados
3. Atualize a página

### WebSocket não conecta
**Solução:**
1. Verifique se o backend está na porta 3000
2. Verifique se `empresa_id` está no localStorage
3. Limpe cookies e localStorage do navegador

---

## 📞 Comandos Úteis

```bash
# Ver logs do backend
node src/server.js

# Ver estrutura da tabela
# No SQL Editor do Supabase:
\d leituras_maquina

# Limpar dados de teste
DELETE FROM leituras_maquina WHERE temperatura > 90;

# Contar registros
SELECT COUNT(*) FROM leituras_maquina;

# Ver últimos 10 status
SELECT created_at, status, status_motor_ventilador 
FROM leituras_maquina 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🎉 Teste Bem-Sucedido?

Se tudo funcionou:
- ✅ Dashboard atualiza em tempo real
- ✅ Gráficos mostram dados corretos
- ✅ Registros salvam no banco
- ✅ Status da Máquina mostra cores corretas
- ✅ Todos os 9 novos campos aparecem

**Parabéns! O sistema está funcionando perfeitamente! 🚀**

---

## 📝 Dicas Finais

1. **Teste gradualmente:** Comece com 1 JSON, depois vá aumentando
2. **Use diferentes cenários:** Teste operação normal E erros
3. **Observe em múltiplas telas:** Abra Dashboard, Registros e Status simultaneamente
4. **Monitore o banco:** Use queries SQL para confirmar os dados
5. **Registre problemas:** Anote qualquer comportamento estranho

---

**Boa sorte com os testes! 🧪✨**

