import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import SignUp from './components/SignUp';
import DashboardOverview from './components/DashboardOverview';
import Dashboard from './components/Dashboard';
import Ciclos from './components/Ciclos';
import Notificacoes from './components/Notificacoes';
import Configuracoes from './components/Configuracoes';
import Registros from './components/Registros';
import StatusMaquina from './components/StatusMaquina';
import Maquinas from './components/Maquinas';
import CicloMonitor from './components/CicloMonitor';
import { Box, CircularProgress } from '@mui/material';
import theme from './theme';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={!session ? <Navigate to="/login" /> : <DashboardOverview />} />
        <Route path="/dashboard/:maquinaId" element={!session ? <Navigate to="/login" /> : <Dashboard />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/signup" element={!session ? <SignUp /> : <Navigate to="/" />} />
        <Route path="/ciclos" element={!session ? <Navigate to="/login" /> : <Ciclos />} />
        <Route path="/notificacoes" element={!session ? <Navigate to="/login" /> : <Notificacoes />} />
        <Route path="/configuracoes" element={!session ? <Navigate to="/login" /> : <Configuracoes />} />
        <Route path="/registros" element={!session ? <Navigate to="/login" /> : <Registros />} />
        <Route path="/status-maquina" element={!session ? <Navigate to="/login" /> : <StatusMaquina />} />
        <Route path="/maquinas" element={!session ? <Navigate to="/login" /> : <Maquinas />} />
        <Route path="/ciclo/:id" element={!session ? <Navigate to="/login" /> : <CicloMonitor />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;