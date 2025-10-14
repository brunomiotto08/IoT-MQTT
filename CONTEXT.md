# Contexto do Projeto: Plataforma de Monitoramento Industrial (I.M.P.)

## 1. Objetivo do MVP
Criar uma plataforma web simples (sem login de usuários) que se conecta a um broker MQTT para receber dados de uma única máquina industrial simulada. Os dados devem ser armazenados em um banco de dados e exibidos em um dashboard em tempo real.

## 2. Fluxo de Dados Essencial
[Máquina Simulada via MQTT.fx] -> [Publica dados via MQTT] -> [Broker Mosquitto na VPS] -> [Backend Node.js escuta o tópico] -> [Backend salva no DB Supabase] -> [Backend envia dados via WebSocket] -> [Frontend React recebe e exibe no Dashboard].

## 3. Stack Tecnológica Definida (Usar EXCLUSIVAMENTE esta stack)

### Infraestrutura e Serviços
- **Servidor:** VPS com Ubuntu 22.04 LTS
- **Broker MQTT:** Mosquitto (já configurado e rodando na VPS)

### Backend
- **Linguagem/Framework:** Node.js com Express.js
- **Gerenciador de Pacotes:** npm
- **Cliente MQTT:** biblioteca `mqtt.js`
- **Comunicação em Tempo Real:** biblioteca `socket.io`
- **Driver do Banco de Dados:** biblioteca `pg` (para conectar ao Supabase)

### Frontend
- **Biblioteca:** React.js (usando Vite para setup do projeto)
- **Comunicação em Tempo Real:** `socket.io-client`
- **Requisições HTTP:** `axios`
- **Gráficos:** `ApexCharts`
- **Componentes de UI:** Material-UI (MUI)

### Banco de Dados
- **Plataforma:** Supabase (que utiliza PostgreSQL)

### Ferramentas de Desenvolvimento e Teste
- **Editor de Código:** Cursor
- **Simulador de Máquina:** MQTT.fx
- **Versionamento:** Git e GitHub

## 4. Decisões de Arquitetura e Cenário
- **Foco no MVP:** Priorizar a funcionalidade mínima viável. Evitar complexidades como autenticação de usuários nesta fase.
- **Desenvolvimento Local:** O Backend e o Frontend são desenvolvidos na máquina local.
- **Broker Remoto:** A aplicação local se conecta ao Broker Mosquitto que está na VPS pública.
- **Visão de Longo Prazo:** A arquitetura deve permitir a evolução para um SaaS multi-tenant com autenticação, alertas, etc.