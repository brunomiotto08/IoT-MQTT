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
import soundManager from '../utils/soundManager';

// Configurações padrão
const DEFAULT_CONFIG = {
  temperatura: {
    minimo: 0,
    atenção: 90,
    critico: 100,
    maximo: 150
  },
  vibracao: {
    minimo: 0,
    atenção: 5,
    critico: 8,
    maximo: 15
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
        setConfig(JSON.parse(savedConfig));
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
      if (config.vibracao.atenção >= config.vibracao.critico) {
        setError('Vibração de atenção deve ser menor que a crítica');
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

  const updateVibracao = (field, value) => {
    setConfig(prev => ({
      ...prev,
      vibracao: {
        ...prev.vibracao,
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

        {/* Vibração */}
        <Card elevation={3} sx={{ mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <VibrationIcon sx={{ fontSize: 40, mr: 2, color: 'secondary.main' }} />
              <Typography variant="h5" fontWeight="bold">
                Limites de Vibração
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Mínimo (mm/s)"
                  type="number"
                  value={config.vibracao.minimo}
                  onChange={(e) => updateVibracao('minimo', e.target.value)}
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Atenção (mm/s)"
                  type="number"
                  value={config.vibracao.atenção}
                  onChange={(e) => updateVibracao('atenção', e.target.value)}
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
                  label="Crítico (mm/s)"
                  type="number"
                  value={config.vibracao.critico}
                  onChange={(e) => updateVibracao('critico', e.target.value)}
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
                  label="Máximo (mm/s)"
                  type="number"
                  value={config.vibracao.maximo}
                  onChange={(e) => updateVibracao('maximo', e.target.value)}
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
            • Quando um valor ultrapassa o limite de "Atenção", um alerta laranja é exibido
            <br />
            • Quando um valor ultrapassa o limite "Crítico", um alerta vermelho é exibido
            <br />
            • O sistema envia notificações automáticas quando os limites são ultrapassados
            <br />
            • O cooldown evita spam de notificações do mesmo tipo
          </Typography>
        </Paper>
      </Container>

      {/* 🎉 TOAST PREMIUM - Centralizado e Ultra Moderno */}
      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbar-root': {
            top: '50% !important',
            transform: 'translateY(-50%)',
          }
        }}
      >
        <Box
          sx={{
            minWidth: 450,
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.98) 0%, rgba(5, 150, 105, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: 5,
            border: '3px solid rgba(16, 185, 129, 0.8)',
            boxShadow: '0 25px 70px rgba(16, 185, 129, 0.6), 0 0 100px rgba(16, 185, 129, 0.5)',
            position: 'relative',
            overflow: 'hidden',
            animation: 'popIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55), float 3s ease-in-out infinite',
            '@keyframes popIn': {
              '0%': {
                transform: 'scale(0) rotate(-180deg)',
                opacity: 0,
              },
              '100%': {
                transform: 'scale(1) rotate(0deg)',
                opacity: 1,
              }
            },
            '@keyframes float': {
              '0%, 100%': {
                transform: 'translateY(0px)',
              },
              '50%': {
                transform: 'translateY(-10px)',
              }
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '5px',
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent)',
              animation: 'slide 2s ease-in-out infinite',
            },
            '@keyframes slide': {
              '0%': { transform: 'translateX(-100%)' },
              '100%': { transform: 'translateX(100%)' }
            }
          }}
        >
          <Box sx={{ p: 4, position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {/* Ícone Premium */}
              <Avatar
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.25)',
                  border: '3px solid rgba(255, 255, 255, 0.5)',
                  width: 70,
                  height: 70,
                  fontSize: '2rem',
                  animation: 'spin 2s ease-in-out infinite',
                  boxShadow: '0 0 30px rgba(255, 255, 255, 0.5)',
                  '@keyframes spin': {
                    '0%, 100%': { transform: 'rotate(0deg) scale(1)' },
                    '50%': { transform: 'rotate(180deg) scale(1.1)' }
                  }
                }}
              >
                ✓
              </Avatar>

              {/* Conteúdo */}
              <Box sx={{ flex: 1 }}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: 900,
                    color: '#ffffff',
                    textShadow: '0 3px 15px rgba(0, 0, 0, 0.4)',
                    mb: 0.5,
                    letterSpacing: 1
                  }}
                >
                  Configurações Salvas!
                </Typography>
                
                <Typography 
                  variant="body1"
                  sx={{ 
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.95)',
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  Suas preferências foram aplicadas com sucesso ✨
                </Typography>
              </Box>

              {/* Botão Fechar */}
              <IconButton
                size="small"
                onClick={() => setSaved(false)}
                sx={{
                  color: 'rgba(255, 255, 255, 0.95)',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                    transform: 'rotate(90deg) scale(1.1)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                }}
              >
                ✕
              </IconButton>
            </Box>
          </Box>

          {/* Confetti Effect */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
              animation: 'expand 1s ease-out',
              pointerEvents: 'none',
              '@keyframes expand': {
                '0%': {
                  width: '0%',
                  height: '0%',
                  opacity: 1
                },
                '100%': {
                  width: '200%',
                  height: '200%',
                  opacity: 0
                }
              }
            }}
          />

          {/* Decorative gradient orbs */}
          <Box
            sx={{
              position: 'absolute',
              bottom: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%)',
              filter: 'blur(15px)',
              pointerEvents: 'none',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: -20,
              left: -20,
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%)',
              filter: 'blur(15px)',
              pointerEvents: 'none',
              animation: 'pulse 2s ease-in-out infinite 1s',
            }}
          />
        </Box>
      </Snackbar>
    </Box>
  );
}

export default Configuracoes;

