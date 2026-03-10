import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Card,
  CardContent,
  Alert,
  Switch,
  FormControlLabel,
  Snackbar,
  Avatar
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import VibrationIcon from '@mui/icons-material/Vibration';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CompressIcon from '@mui/icons-material/Compress';
import InventoryIcon from '@mui/icons-material/Inventory';
import soundManager from '../utils/soundManager';

// Configurações padrão
const DEFAULT_CONFIG = {
  temperatura: {
    minimo: 0,
    atenção: 90,
    critico: 100,
    maximo: 150
  },
  pressao: {
    minimo: 0,
    atenção: 5,
    critico: 8,
    maximo: 15
  },
  pressao_envelope: {
    minimo: 0,
    atenção: 4,
    critico: 6,
    maximo: 10
  },
  pressao_saco_ar: {
    minimo: 0,
    atenção: 4,
    critico: 6,
    maximo: 10
  },
  notificacoes: {
    som: true,
    cooldown: 30 // segundos
  }
};

function Configuracoes() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) {
        navigate('/login');
      }
    };
    getSession();
    
    // Carregar configurações salvas
    loadConfig();
  }, [navigate]);

  const loadConfig = () => {
    try {
      const savedConfig = localStorage.getItem('imp_thresholds');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        
        // Migração automática: vibracao -> pressao
        if (config.vibracao && !config.pressao) {
          config.pressao = config.vibracao;
          delete config.vibracao;
          localStorage.setItem('imp_thresholds', JSON.stringify(config));
        }
        
        setConfig(config);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    }
  };

  const handleSave = () => {
    try {
      // Validações
      if (config.temperatura.atenção >= config.temperatura.critico) {
        setError('Temperatura de atenção deve ser menor que a crítica');
        return;
      }
      if (config.pressao.atenção >= config.pressao.critico) {
        setError('Pressão de atenção deve ser menor que a crítica');
        return;
      }
      if (config.pressao_envelope.atenção >= config.pressao_envelope.critico) {
        setError('Pressão Envelope de atenção deve ser menor que a crítica');
        return;
      }
      if (config.pressao_saco_ar.atenção >= config.pressao_saco_ar.critico) {
        setError('Pressão Saco de Ar de atenção deve ser menor que a crítica');
        return;
      }

      // Salvar no localStorage
      localStorage.setItem('imp_thresholds', JSON.stringify(config));
      
      // Atualizar estado do som
      soundManager.enabled = config.notificacoes.som;
      
      setSaved(true);
      setError('');
      
      setTimeout(() => setSaved(false), 3000);
      
      console.log('✅ Configurações salvas:', config);
    } catch (err) {
      setError('Erro ao salvar configurações: ' + err.message);
      console.error('Erro:', err);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem('imp_thresholds');
    setSaved(false);
    setError('');
  };

  const updateTemperatura = (field, value) => {
    setConfig(prev => ({
      ...prev,
      temperatura: {
        ...prev.temperatura,
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const updatePressao = (field, value) => {
    setConfig(prev => ({
      ...prev,
      pressao: {
        ...prev.pressao,
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const updatePressaoEnvelope = (field, value) => {
    setConfig(prev => ({
      ...prev,
      pressao_envelope: {
        ...prev.pressao_envelope,
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const updatePressaoSacoAr = (field, value) => {
    setConfig(prev => ({
      ...prev,
      pressao_saco_ar: {
        ...prev.pressao_saco_ar,
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const updateNotificacoes = (field, value) => {
    setConfig(prev => ({
      ...prev,
      notificacoes: {
        ...prev.notificacoes,
        [field]: value
      }
    }));
  };

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar 
        position="static" 
        elevation={0} 
        sx={{ 
          background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.98) 0%, rgba(30, 30, 30, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '2px solid',
          borderColor: 'rgba(80, 80, 80, 0.3)'
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <SettingsIcon sx={{ fontSize: 32, mr: 2 }} />
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 900 }}>
            Configurações do Sistema
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Temperatura */}
        <Card elevation={3} sx={{ mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <ThermostatIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <Typography variant="h5" fontWeight="bold">
                Limites de Temperatura
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Mínimo (°C)"
                  type="number"
                  value={config.temperatura.minimo}
                  onChange={(e) => updateTemperatura('minimo', e.target.value)}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Atenção (°C)"
                  type="number"
                  value={config.temperatura.atenção}
                  onChange={(e) => updateTemperatura('atenção', e.target.value)}
                  helperText="Alerta amarelo"
                  InputProps={{ inputProps: { min: 0 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': {
                        borderColor: 'warning.main',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Crítico (°C)"
                  type="number"
                  value={config.temperatura.critico}
                  onChange={(e) => updateTemperatura('critico', e.target.value)}
                  helperText="Alerta vermelho"
                  InputProps={{ inputProps: { min: 0 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': {
                        borderColor: 'error.main',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Máximo (°C)"
                  type="number"
                  value={config.temperatura.maximo}
                  onChange={(e) => updateTemperatura('maximo', e.target.value)}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Pressão */}
        <Card elevation={3} sx={{ mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <VibrationIcon sx={{ fontSize: 40, mr: 2, color: 'secondary.main' }} />
              <Typography variant="h5" fontWeight="bold">
                Limites de Pressão
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Mínimo (Pa)"
                  type="number"
                  value={config.pressao.minimo}
                  onChange={(e) => updatePressao('minimo', e.target.value)}
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Atenção (Pa)"
                  type="number"
                  value={config.pressao.atenção}
                  onChange={(e) => updatePressao('atenção', e.target.value)}
                  helperText="Alerta amarelo"
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': {
                        borderColor: 'warning.main',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Crítico (Pa)"
                  type="number"
                  value={config.pressao.critico}
                  onChange={(e) => updatePressao('critico', e.target.value)}
                  helperText="Alerta vermelho"
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': {
                        borderColor: 'error.main',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Máximo (Pa)"
                  type="number"
                  value={config.pressao.maximo}
                  onChange={(e) => updatePressao('maximo', e.target.value)}
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Pressão Envelope */}
        <Card elevation={3} sx={{ mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <CompressIcon sx={{ fontSize: 40, mr: 2, color: '#8b5cf6' }} />
              <Typography variant="h5" fontWeight="bold">
                Limites de Pressão - Envelope
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Mínimo (bar)"
                  type="number"
                  value={config.pressao_envelope.minimo}
                  onChange={(e) => updatePressaoEnvelope('minimo', e.target.value)}
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Atenção (bar)"
                  type="number"
                  value={config.pressao_envelope.atenção}
                  onChange={(e) => updatePressaoEnvelope('atenção', e.target.value)}
                  helperText="Alerta amarelo"
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': {
                        borderColor: 'warning.main',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Crítico (bar)"
                  type="number"
                  value={config.pressao_envelope.critico}
                  onChange={(e) => updatePressaoEnvelope('critico', e.target.value)}
                  helperText="Alerta vermelho"
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': {
                        borderColor: 'error.main',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Máximo (bar)"
                  type="number"
                  value={config.pressao_envelope.maximo}
                  onChange={(e) => updatePressaoEnvelope('maximo', e.target.value)}
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Pressão Saco de Ar */}
        <Card elevation={3} sx={{ mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <InventoryIcon sx={{ fontSize: 40, mr: 2, color: '#10b981' }} />
              <Typography variant="h5" fontWeight="bold">
                Limites de Pressão - Saco de Ar
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Mínimo (bar)"
                  type="number"
                  value={config.pressao_saco_ar.minimo}
                  onChange={(e) => updatePressaoSacoAr('minimo', e.target.value)}
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Atenção (bar)"
                  type="number"
                  value={config.pressao_saco_ar.atenção}
                  onChange={(e) => updatePressaoSacoAr('atenção', e.target.value)}
                  helperText="Alerta amarelo"
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': {
                        borderColor: 'warning.main',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Crítico (bar)"
                  type="number"
                  value={config.pressao_saco_ar.critico}
                  onChange={(e) => updatePressaoSacoAr('critico', e.target.value)}
                  helperText="Alerta vermelho"
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': {
                        borderColor: 'error.main',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Máximo (bar)"
                  type="number"
                  value={config.pressao_saco_ar.maximo}
                  onChange={(e) => updatePressaoSacoAr('maximo', e.target.value)}
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card elevation={3} sx={{ mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <NotificationsActiveIcon sx={{ fontSize: 40, mr: 2, color: 'info.main' }} />
              <Typography variant="h5" fontWeight="bold">
                Configurações de Notificações
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.notificacoes.som}
                      onChange={(e) => updateNotificacoes('som', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Habilitar sons de notificação"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: 1 }}>
                  Sons diferentes para cada prioridade (crítico, alto, médio, baixo)
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Cooldown entre notificações (segundos)"
                  type="number"
                  value={config.notificacoes.cooldown}
                  onChange={(e) => updateNotificacoes('cooldown', parseInt(e.target.value))}
                  helperText="Tempo mínimo entre notificações do mesmo tipo"
                  InputProps={{ inputProps: { min: 5, max: 300 } }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<RestartAltIcon />}
            onClick={handleReset}
            sx={{ px: 4 }}
          >
            Restaurar Padrão
          </Button>
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            sx={{ px: 6 }}
          >
            Salvar Configurações
          </Button>
        </Box>

        {/* Informações */}
        <Paper elevation={0} sx={{ mt: 4, p: 3, bgcolor: 'rgba(100, 100, 100, 0.1)' }}>
          <Typography variant="body2" color="text.secondary">
            <strong>ℹ️ Informações:</strong>
            <br />
            • As configurações são salvas localmente no navegador
            <br />
            • Valores configurados aplicam-se a: <strong>Temperatura, Pressão, Pressão Envelope e Pressão Saco de Ar</strong>
            <br />
            • Quando um valor ultrapassa o limite de "Atenção", um alerta amarelo é exibido
            <br />
            • Quando um valor ultrapassa o limite "Crítico", um alerta vermelho é exibido
            <br />
            • O sistema envia notificações automáticas quando os limites são ultrapassados
            <br />
            • O cooldown evita spam de notificações do mesmo tipo
            <br />
            • As cores são aplicadas automaticamente nos cards do Dashboard e na tabela de Registros
          </Typography>
        </Paper>
      </Container>

      {/* Toast de Confirmação - Minimalista */}
      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Paper
          elevation={3}
          sx={{
            minWidth: 380,
            background: 'rgba(16, 185, 129, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
            animation: 'fadeInDown 0.3s ease-out',
            '@keyframes fadeInDown': {
              '0%': {
                opacity: 0,
                transform: 'translateY(-20px)',
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)',
              }
            },
          }}
        >
          <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Ícone Simples */}
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                color: '#ffffff',
              }}
            >
              ✓
            </Box>

            {/* Conteúdo */}
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 600,
                  color: '#ffffff',
                  mb: 0.25,
                }}
              >
                Configurações Salvas
              </Typography>
              <Typography 
                variant="body2"
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                }}
              >
                Alterações aplicadas com sucesso
              </Typography>
            </Box>

            {/* Botão Fechar */}
            <IconButton
              size="small"
              onClick={() => setSaved(false)}
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              ✕
            </IconButton>
          </Box>
        </Paper>
      </Snackbar>
    </Box>
  );
}

export default Configuracoes;

