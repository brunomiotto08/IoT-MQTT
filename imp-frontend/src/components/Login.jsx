import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  Visibility,
  VisibilityOff,
  Login as LoginIcon
} from '@mui/icons-material';

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
      // 1. Fazer login no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Erro ao fazer login. Tente novamente.');
        setLoading(false);
        return;
      }

      // 2. Buscar a empresa vinculada ao usuário
      const { data: vinculoData, error: vinculoError } = await supabase
        .from('usuarios_empresas')
        .select('empresa_id, email, role, empresas(id, nome, ativa)')
        .eq('user_id', authData.user.id)
        .single();

      if (vinculoError || !vinculoData) {
        console.error('Erro ao buscar empresa:', vinculoError);
        setError('Usuário não está vinculado a nenhuma empresa. Contate o administrador.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Verificar se a empresa está ativa
      if (!vinculoData.empresas.ativa) {
        setError('Empresa inativa. Contate o administrador.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // 3. Armazenar dados da empresa no localStorage para uso posterior
      localStorage.setItem('empresa_id', vinculoData.empresa_id);
      localStorage.setItem('empresa_nome', vinculoData.empresas.nome);
      localStorage.setItem('user_role', vinculoData.role);

      console.log('✅ Login realizado com sucesso!');
      console.log('👤 Usuário:', authData.user.email);
      console.log('🏢 Empresa:', vinculoData.empresas.nome);
      console.log('👔 Papel:', vinculoData.role);

    } catch (err) {
      console.error('Erro no login:', err);
      setError('Erro inesperado ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
      <Container component="main" maxWidth="xs">
        <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, bgcolor: '#161616', border: '1px solid #2a2a2a', borderRadius: '10px' }}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, bgcolor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 2, mb: 2 }}>
              <LoginIcon sx={{ fontSize: 22, color: '#555' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#e2e2e2', fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.01em' }}>
              I.M.P.
            </Typography>
            <Typography variant="caption" sx={{ color: '#555' }}>
              Monitoramento Industrial
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleLogin} noValidate>
            <TextField
              margin="dense"
              required fullWidth
              label="Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: '#444', fontSize: 18 }} /></InputAdornment> }}
              sx={{ mb: 1.5 }}
            />
            <TextField
              margin="dense"
              required fullWidth
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#444', fontSize: 18 }} /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" sx={{ color: '#555' }}>
                      {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2.5 }}
            />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Button type="submit" fullWidth variant="contained" disabled={loading}
              sx={{ py: 1.25, fontWeight: 700, bgcolor: '#2a2a2a', color: '#e2e2e2', border: '1px solid #3a3a3a', mb: 2, '&:hover': { bgcolor: '#333' } }}>
              {loading ? <CircularProgress size={20} sx={{ color: '#aaa' }} /> : 'Entrar'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#555' }}>Não tem conta? </Typography>
              <Link component={RouterLink} to="/signup" sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#888', textDecoration: 'none', '&:hover': { color: '#ccc' } }}>
                Cadastre-se
              </Link>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default Login;
