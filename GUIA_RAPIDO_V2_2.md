# 🚀 Guia Rápido - Atualização V2.2

## ⚡ Instalação Rápida (5 minutos)

### 1️⃣ Banco de Dados (1 min)
```bash
# Acesse: https://supabase.com/dashboard
# Vá em: SQL Editor
# Cole e execute: supabase/migration_v2_2_novos_campos.sql
# Aguarde a mensagem de sucesso
```

### 2️⃣ Backend (1 min)
```bash
# Nenhuma mudança necessária!
# O código já está atualizado
# Apenas reinicie o servidor:
node src/server.js
```

### 3️⃣ Frontend (1 min)
```bash
cd imp-frontend
npm install  # Se necessário
npm run dev
```

### 4️⃣ Testar (2 min)
```
1. Acesse: http://localhost:5173
2. Faça login
3. No Dashboard, clique em "Registros" ou "Status"
4. Observe os novos gráficos de pressão no Dashboard
```

---

## 📋 O que foi adicionado?

### ✅ Novos Dados
- Pressão Envelope
- Pressão Saco de Ar
- Status Motor Ventilador
- Status de 6 Válvulas (Entrada/Descarga)

### ✅ Novas Telas
1. **Registros** (`/registros`) - Tabela completa com todos os dados
2. **Status da Máquina** (`/status-maquina`) - Visualização em tempo real

### ✅ Dashboard Melhorado
- Novo gráfico de Pressões (Envelope + Saco de Ar)
- Botões de navegação para as novas telas

---

## 📡 Formato MQTT

### Envie dados no formato:
```json
{
  "temperatura": 75.5,
  "vibracao": 2.3,
  "status": "ativo",
  "pecas_produzidas": 150,
  "pressao_envelope": 3.2,
  "pressao_saco_ar": 4.1,
  "status_motor_ventilador": "ligado",
  "status_valvula_entrada_autoclave": "aberta",
  "status_valvula_descarga_autoclave": "fechada",
  "status_valvula_entrada_saco_ar": "aberta",
  "status_valvula_descarga_saco_ar": "fechada",
  "status_valvula_entrada_envelope": "aberta",
  "status_valvula_descarga_envelope": "fechada"
}
```

### Tópico:
```
empresas/{empresa_id}/maquinas/{maquina_id}/sensores
```

---

## 🎯 Valores Aceitos

### Status Motor:
- `ligado`
- `desligado`
- `erro`

### Status Válvulas:
- `aberta`
- `fechada`
- `erro`

### Status Geral:
- `ativo` / `running`
- `parado` / `stopped`
- `erro` / `error`

---

## 🎨 Resultado Visual

### Dashboard
```
┌─────────────────────────────────────────────┐
│  [Dashboard] [Histórico] [Notificações]     │
│  [Configurações] [Registros] [Status] 🔴    │
└─────────────────────────────────────────────┘

┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│Temp. │ │Vibr. │ │Status│ │Peças │
│75.5°C│ │2.3mm │ │Ativo │ │150   │
└──────┘ └──────┘ └──────┘ └──────┘

┌────────────────────────────────────────────┐
│  📊 Gráfico Temperatura                    │
└────────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐
│ Vibração     │ │ Produção     │
└──────────────┘ └──────────────┘

┌─────────────────────────────────────────────┐
│  📊 Pressões (Envelope + Saco de Ar) NOVO! │
└─────────────────────────────────────────────┘
```

### Tela de Registros
```
┌─────────────────────────────────────────────┐
│  📋 Registros de Leituras                   │
│  [Filtrar Máquina ▼] [Data Início] [Fim]   │
└─────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ Data/Hora │ Temp │ Vib │ P.Env │ P.Saco │  │
├───────────┼──────┼─────┼───────┼────────┤  │
│ 17/11 14h │ 75.5 │ 2.3 │ 3.2   │ 4.1    │  │
│ 17/11 13h │ 74.2 │ 2.1 │ 3.1   │ 4.0    │  │
│ ...       │ ...  │ ... │ ...   │ ...    │  │
└────────────────────────────────────────────┘
```

### Tela de Status
```
┌─────────────────────────────────────────────┐
│  💚 Status da Máquina                       │
│  [Selecionar Máquina ▼]                     │
└─────────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ⚡ Máquina   │ │ 💨 Motor     │ │ 🔩 V.Ent.Auto│
│              │ │              │ │              │
│   ✅ ATIVO   │ │  ✅ LIGADO   │ │  ✅ ABERTA   │
└──────────────┘ └──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🔩 V.Desc.   │ │ 📦 V.Saco E. │ │ 📦 V.Saco D. │
│    Auto      │ │              │ │              │
│  ⚠️ FECHADA  │ │  ✅ ABERTA   │ │  ⚠️ FECHADA  │
└──────────────┘ └──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 📧 V.Env. E. │ │ 📧 V.Env. D. │ │ ℹ️ Info       │
│              │ │              │ │              │
│  ✅ ABERTA   │ │  ⚠️ FECHADA  │ │ Temp: 75.5°C │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## ✅ Checklist de Verificação

Depois de instalar, verifique:

- [ ] Migração SQL executada sem erros
- [ ] Backend reiniciado e sem erros
- [ ] Frontend rodando sem erros
- [ ] Login funcionando
- [ ] Dashboard mostra gráfico de pressões
- [ ] Botão "Registros" aparece no menu
- [ ] Botão "Status" aparece no menu
- [ ] Tela de Registros abre corretamente
- [ ] Tela de Status abre corretamente
- [ ] Dados MQTT chegam em tempo real

---

## 🐛 Problemas Comuns

### Erro: "Column does not exist"
**Solução:** Execute a migração SQL novamente

### Erro: "Cannot read property of undefined"
**Solução:** Limpe o cache do navegador (Ctrl+Shift+R)

### Gráficos vazios
**Solução:** Verifique se há dados no banco ou envie via MQTT

### WebSocket não conecta
**Solução:** Verifique se o backend está rodando na porta 3000

---

## 📞 Ajuda Rápida

```bash
# Ver logs do backend
node src/server.js

# Ver erros do frontend
# Pressione F12 no navegador
# Aba Console

# Testar conexão com banco
# SQL Editor: SELECT * FROM leituras_maquina LIMIT 1;
```

---

## 🎉 Pronto!

O sistema agora possui:
- ✅ 9 novos campos de dados
- ✅ 2 novas telas completas
- ✅ 1 novo gráfico no Dashboard
- ✅ Navegação aprimorada
- ✅ Design moderno e responsivo

**Aproveite o novo sistema! 🚀**

