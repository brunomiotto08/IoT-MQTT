# 🔧 Troubleshooting - Tela Branca

## Problema: Tela branca ao carregar o frontend

### Solução Rápida

**Opção 1: Página de Limpeza de Cache**
1. Acesse: `http://localhost:5173/clear-cache.html`
2. Clique em "Limpar Todas as Configurações"
3. Aguarde o redirecionamento automático

**Opção 2: Console do Navegador**
1. Abra o Console do navegador (F12)
2. Cole e execute o seguinte código:

```javascript
// Limpar todas as configurações
localStorage.clear();
sessionStorage.clear();
console.log('✅ Cache limpo!');
location.reload();
```

**Opção 3: Manualmente**
1. Abra o DevTools (F12)
2. Vá em Application > Storage
3. Clique em "Clear site data"
4. Recarregue a página (Ctrl+Shift+R)

---

## Causas Comuns

### 1. Configurações Antigas (vibracao → pressao)
**Problema:** Após a atualização, o sistema espera `pressao` mas o localStorage tem `vibracao`.

**Solução Automática:** O sistema agora faz migração automática. Se ainda houver problemas, limpe o cache.

### 2. Erro no Console
**Como verificar:**
1. Abra o Console (F12)
2. Veja se há mensagens de erro em vermelho
3. Anote o erro e reporte

### 3. Conflito de Versão
**Solução:**
```bash
# Limpar cache do Vite
cd imp-frontend
rm -rf node_modules/.vite
rm -rf dist
npm run dev
```

---

## Verificações Adicionais

### Verificar se o servidor está rodando
```bash
# Backend
cd Habilita_IMP
node src/index.js

# Frontend
cd imp-frontend
npm run dev
```

### Verificar erros no console
Procure por:
- ❌ `Cannot read property 'vibracao' of undefined`
- ❌ `Cannot read property 'pressao' of undefined`
- ❌ `Uncaught TypeError`
- ❌ `Failed to fetch`

### Verificar configurações salvas
```javascript
// No console do navegador
console.log('Configurações:', localStorage.getItem('imp_thresholds'));
```

---

## Migração Manual (se necessário)

Se a migração automática falhar, execute no console:

```javascript
const config = JSON.parse(localStorage.getItem('imp_thresholds'));
if (config && config.vibracao) {
  config.pressao = config.vibracao;
  delete config.vibracao;
  localStorage.setItem('imp_thresholds', JSON.stringify(config));
  console.log('✅ Migração concluída!');
  location.reload();
}
```

---

## Ainda com problemas?

### 1. Verifique os arquivos modificados
- `Dashboard.jsx`
- `Configuracoes.jsx`
- `Registros.jsx`
- `DataCard.jsx`
- `StatusMaquina.jsx`
- `Ciclos.jsx`

### 2. Execute os linters
```bash
npm run lint
```

### 3. Reinicie completamente
```bash
# Pare tudo (Ctrl+C)
# Backend
cd Habilita_IMP
node src/index.js

# Frontend (novo terminal)
cd imp-frontend
npm run dev
```

### 4. Modo Hard Refresh
- Chrome: Ctrl+Shift+R
- Firefox: Ctrl+F5
- Edge: Ctrl+Shift+R

---

## Contato

Se o problema persistir, forneça:
1. Screenshot do erro no console (F12)
2. Conteúdo do localStorage: `localStorage.getItem('imp_thresholds')`
3. Versão do navegador

