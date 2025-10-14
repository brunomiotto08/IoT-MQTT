import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Container, Box, TextField, Button, Typography, Alert, Link, Grid } from '@mui/material';

function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage('');

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      setError(error.message);
    } else if (data.user) {
      setMessage('Cadastro realizado com sucesso! Você já pode fazer o login.');
      setTimeout(() => navigate('/login'), 2000); // Redireciona para o login após 2s
    }
    setLoading(false);
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">Cadastro</Typography>
        <Box component="form" onSubmit={handleSignUp} noValidate sx={{ mt: 1 }}>
          <TextField 
            margin="normal" 
            required 
            fullWidth 
            id="email" 
            label="Endereço de Email" 
            name="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
          <TextField 
            margin="normal" 
            required 
            fullWidth 
            name="password" 
            label="Senha" 
            type="password" 
            id="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <Button 
            type="submit" 
            fullWidth 
            variant="contained" 
            sx={{ mt: 3, mb: 2 }} 
            disabled={loading}
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </Button>
          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}
          <Grid container justifyContent="flex-end">
            <Grid item>
              <Link component={RouterLink} to="/login" variant="body2">
                Já tem uma conta? Faça o login
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
}

export default SignUp;
