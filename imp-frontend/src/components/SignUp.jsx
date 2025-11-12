import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Container, 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Alert, 
  Link, 
  Paper,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import { 
  Email as EmailIcon, 
  Lock as LockIcon,
  Business as BusinessIcon,
  Visibility,
  VisibilityOff,
  HowToReg as HowToRegIcon
} from '@mui/icons-material';

function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage('');

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          nome_empresa: empresa
        }
      }
    });

    if (authError) {
      setError(authError.message);
    } else if (authData.user) {
      setMessage('Cadastro realizado com sucesso! Você já pode fazer o login.');
      setTimeout(() => navigate('/login'), 2000);
    }
    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        py: 8,
        px: 2,
      }}
    >
      {/* Animated background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '15%',
          right: '10%',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'pulse 4.5s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          left: '10%',
          width: 450,
          height: 450,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'pulse 5.5s ease-in-out infinite',
          animationDelay: '1.5s',
        }}
      />

      <Container component="main" maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 7 },
            background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.98) 0%, rgba(30, 30, 30, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: 5,
            border: '2px solid rgba(100, 100, 100, 0.3)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
            animation: 'scaleIn 0.5s ease-out',
          }}
        >
          {/* Logo/Title Section */}
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 90,
                height: 90,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #505050 0%, #707070 100%)',
                mb: 3,
                animation: 'glow 3s ease-in-out infinite',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
              }}
            >
              <HowToRegIcon sx={{ fontSize: 48, color: '#ffffff' }} />
            </Box>
            
            <Typography 
              component="h1" 
              variant="h2"
              sx={{
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 900,
                mb: 1.5,
                color: '#ffffff',
                letterSpacing: '-0.03em',
                fontSize: '2.5rem',
              }}
            >
              Criar Conta
            </Typography>
            
            <Typography 
              variant="body1" 
              sx={{ 
                fontSize: '1.05rem', 
                fontWeight: 500,
                fontFamily: '"Poppins", sans-serif',
                color: '#94a3b8',
              }}
            >
              Comece a monitorar sua indústria agora
            </Typography>
          </Box>

          {/* SignUp Form */}
          <Box component="form" onSubmit={handleSignUp} noValidate>
            <TextField 
              margin="normal" 
              required 
              fullWidth 
              id="empresa" 
              label="Nome da Empresa" 
              name="empresa" 
              autoFocus
              value={empresa} 
              onChange={(e) => setEmpresa(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BusinessIcon sx={{ color: '#b0b0b0', fontSize: 24 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <TextField 
              margin="normal" 
              required 
              fullWidth 
              id="email" 
              label="Endereço de Email" 
              name="email"
              autoComplete="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: '#b0b0b0', fontSize: 24 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />
            
            <TextField 
              margin="normal" 
              required 
              fullWidth 
              name="password" 
              label="Senha" 
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: '#b0b0b0', fontSize: 24 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: '#b0b0b0' }}
                    >
                      {showPassword ? <VisibilityOff sx={{ fontSize: 24 }} /> : <Visibility sx={{ fontSize: 24 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 5 }}
            />

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  animation: 'fadeInUp 0.3s ease-out'
                }}
              >
                {error}
              </Alert>
            )}

            {message && (
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  animation: 'fadeInUp 0.3s ease-out'
                }}
              >
                {message}
              </Alert>
            )}

            <Button 
              type="submit" 
              fullWidth 
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.8,
                fontSize: '1.1rem',
                fontWeight: 700,
                mb: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                  transition: 'left 0.5s',
                },
                '&:hover::before': {
                  left: '100%',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : (
                'Criar Minha Conta'
              )}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Já tem uma conta?
              </Typography>
              <Link 
                component={RouterLink} 
                to="/login" 
                sx={{ 
                  fontSize: '1rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: '#ffffff',
                  '&:hover': {
                    textDecoration: 'underline',
                    color: '#e0e0e0',
                  },
                }}
              >
                Faça Login
              </Link>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default SignUp;
