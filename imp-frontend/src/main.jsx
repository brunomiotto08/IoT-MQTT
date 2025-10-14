// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// [NOVO] Importações necessárias do Material-UI
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// [NOVO] Criação de um tema básico. Podemos customizar isso mais tarde.
// O tema 'dark' é ótimo para dashboards industriais.
const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* [NOVO] Envolvemos toda a aplicação com o ThemeProvider */}
    <ThemeProvider theme={theme}>
      {/* [NOVO] CssBaseline reseta o CSS e aplica o tema base. É o "funcionário" que causou o erro. */}
      <CssBaseline />
      <App /> {/* Nosso componente principal agora vive dentro do contexto do MUI */}
    </ThemeProvider>
  </React.StrictMode>
);