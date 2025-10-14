import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
// [NOVO] Importa o BrowserRouter
import { BrowserRouter } from 'react-router-dom';

const theme = createTheme({ palette: { mode: 'dark' } });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* [NOVO] Envolve a aplicação com o roteador */}
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);