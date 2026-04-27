import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';

/* stagger config */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden:  { opacity: 0 },
  show:    { opacity: 1, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
};

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) { setError(authError.message); setLoading(false); return; }
      if (!authData.user) { setError('Erro ao fazer login. Tente novamente.'); setLoading(false); return; }

      const { data: vinculoData, error: vinculoError } = await supabase
        .from('usuarios_empresas')
        .select('empresa_id, email, role, empresas(id, nome, ativa)')
        .eq('user_id', authData.user.id)
        .single();

      if (vinculoError || !vinculoData) {
        setError('Usuário não está vinculado a nenhuma empresa. Contate o administrador.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (!vinculoData.empresas.ativa) {
        setError('Empresa inativa. Contate o administrador.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      localStorage.setItem('empresa_id', vinculoData.empresa_id);
      localStorage.setItem('empresa_nome', vinculoData.empresas.nome);
      localStorage.setItem('user_role', vinculoData.role);

    } catch (err) {
      console.error('Erro no login:', err);
      setError('Erro inesperado ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2,
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Subtle grid background */}
      <Box sx={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)
        `,
        backgroundSize: '44px 44px',
        pointerEvents: 'none',
      }} />

      {/* Ambient blue glow */}
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -55%)',
        width: 560,
        height: 360,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        >
          <Box sx={{
            background: 'rgba(16,16,16,0.88)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            p: { xs: 3.5, sm: 4.5 },
            boxShadow: '0 24px 64px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}>

            <motion.div variants={container} initial="hidden" animate="show">

              {/* Logo */}
              <motion.div variants={item}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <img
                    src="/habilita_logo.svg"
                    alt="Habilita"
                    style={{ height: 68, width: 'auto', display: 'inline-block' }}
                  />
                </Box>
              </motion.div>

              {/* Heading */}
              <motion.div variants={item}>
                <Typography sx={{
                  fontWeight: 700,
                  fontSize: '1.1875rem',
                  color: '#e2e2e2',
                  fontFamily: '"Outfit", sans-serif',
                  textAlign: 'center',
                  mb: 0.5,
                  letterSpacing: '-0.01em',
                }}>
                  Bem-vindo de volta
                </Typography>
                <Typography sx={{
                  color: '#3a3a3a',
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  mb: 3.5,
                }}>
                  Acesse o painel de monitoramento
                </Typography>
              </motion.div>

              {/* Form */}
              <Box component="form" onSubmit={handleLogin} noValidate>
                <motion.div variants={item}>
                  <TextField
                    margin="dense"
                    required
                    fullWidth
                    label="Email"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlinedIcon sx={{ color: '#333', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 1.5 }}
                  />
                </motion.div>

                <motion.div variants={item}>
                  <TextField
                    margin="dense"
                    required
                    fullWidth
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon sx={{ color: '#333', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                            sx={{ color: '#444', '&:hover': { color: '#888' } }}
                          >
                            {showPassword
                              ? <VisibilityOffOutlined sx={{ fontSize: 18 }} />
                              : <VisibilityOutlined sx={{ fontSize: 18 }} />
                            }
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2.5 }}
                  />
                </motion.div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Alert severity="error" sx={{ mb: 2.5, fontSize: '0.8125rem' }}>
                      {error}
                    </Alert>
                  </motion.div>
                )}

                <motion.div variants={item}>
                  <motion.div whileTap={{ scale: 0.985 }}>
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={loading}
                      sx={{ py: 1.375, fontWeight: 700, fontSize: '0.9375rem', mb: 2.5 }}
                    >
                      {loading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <CircularProgress size={15} sx={{ color: 'rgba(255,255,255,0.7)' }} />
                          <span>Entrando...</span>
                        </Box>
                      ) : 'Entrar'}
                    </Button>
                  </motion.div>
                </motion.div>

                <motion.div variants={item}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#333' }}>
                      Não tem conta?{' '}
                    </Typography>
                    <Link
                      component={RouterLink}
                      to="/signup"
                      sx={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#3b82f6',
                        textDecoration: 'none',
                        transition: 'color 0.15s ease',
                        '&:hover': { color: '#60a5fa' },
                      }}
                    >
                      Cadastre-se
                    </Link>
                  </Box>
                </motion.div>
              </Box>

            </motion.div>
          </Box>
        </motion.div>

        {/* Footer label */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography sx={{ color: '#1e1e1e', fontSize: '0.7rem', fontFamily: '"Outfit", sans-serif', letterSpacing: '0.06em' }}>
            SISTEMA DE MONITORAMENTO INDUSTRIAL
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default Login;
