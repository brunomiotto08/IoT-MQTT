import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AnimatePresence, motion } from 'framer-motion';
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

/* ─── Page transition wrapper ─────────────────────────────────
   Wraps each page in a smooth blur + fade + slight-slide enter/exit.
   The layout of every page stays untouched.
─────────────────────────────────────────────────────────────── */
function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(8px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(6px)' }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      style={{ willChange: 'opacity, filter' }}
    >
      {children}
    </motion.div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

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
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        bgcolor: '#0f0f0f',
        gap: 3,
      }}>
        <img src="/habilita_logo.svg" alt="Habilita" style={{ height: 44, opacity: 0.7 }} />
        <CircularProgress size={22} sx={{ color: '#3b82f6', opacity: 0.6 }} />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={!session
            ? <Navigate to="/login" />
            : <PageTransition><DashboardOverview /></PageTransition>}
          />
          <Route path="/dashboard/:maquinaId" element={!session
            ? <Navigate to="/login" />
            : <PageTransition><Dashboard /></PageTransition>}
          />
          <Route path="/login" element={!session
            ? <PageTransition><Login /></PageTransition>
            : <Navigate to="/" />}
          />
          <Route path="/signup" element={!session
            ? <PageTransition><SignUp /></PageTransition>
            : <Navigate to="/" />}
          />
          <Route path="/ciclos" element={!session
            ? <Navigate to="/login" />
            : <PageTransition><Ciclos /></PageTransition>}
          />
          <Route path="/notificacoes" element={!session
            ? <Navigate to="/login" />
            : <PageTransition><Notificacoes /></PageTransition>}
          />
          <Route path="/configuracoes" element={!session
            ? <Navigate to="/login" />
            : <PageTransition><Configuracoes /></PageTransition>}
          />
          <Route path="/registros" element={!session
            ? <Navigate to="/login" />
            : <PageTransition><Registros /></PageTransition>}
          />
          <Route path="/status-maquina" element={!session
            ? <Navigate to="/login" />
            : <PageTransition><StatusMaquina /></PageTransition>}
          />
          <Route path="/maquinas" element={!session
            ? <Navigate to="/login" />
            : <PageTransition><Maquinas /></PageTransition>}
          />
          <Route path="/ciclo/:id" element={!session
            ? <Navigate to="/login" />
            : <PageTransition><CicloMonitor /></PageTransition>}
          />
        </Routes>
      </AnimatePresence>
    </ThemeProvider>
  );
}

export default App;
