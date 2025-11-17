import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { 
  Container, 
  Box, 
  Typography, 
  Paper,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Avatar,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import AirIcon from '@mui/icons-material/Air';
import CompressIcon from '@mui/icons-material/Compress';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import InventoryIcon from '@mui/icons-material/Inventory';
import MailIcon from '@mui/icons-material/Mail';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';
import ThermostatOutlined from '@mui/icons-material/ThermostatOutlined';
import SpeedOutlined from '@mui/icons-material/SpeedOutlined';
import ProductionQuantityLimitsOutlined from '@mui/icons-material/ProductionQuantityLimitsOutlined';

const socket = io('http://localhost:3000');
const API_URL = 'http://localhost:3000';

function StatusMaquina() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [empresaNome, setEmpresaNome] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Filtros
  const [maquinas, setMaquinas] = useState([]);
  const [maquinaSelecionada, setMaquinaSelecionada] = useState('');
  
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        const empresaNomeLS = localStorage.getItem('empresa_nome');
        if (empresaNomeLS) setEmpresaNome(empresaNomeLS);
        
        fetchMaquinas(session);
        fetchLatestData(session);
      }
    };
    getSession();
  }, []);
  
  useEffect(() => {
    if (!session) return;
    
    // Socket connection
    socket.on('connect', () => {
      console.log('✅ Socket conectado para Status da Máquina');
      
      const empresaId = localStorage.getItem('empresa_id');
      if (empresaId) {
        socket.emit('join_empresa', empresaId);
      }
    });
    
    socket.on('mqtt_message', (message) => {
      try {
        const parsed = typeof message === 'string' ? JSON.parse(message) : message;
        console.log('📊 Dados recebidos no Status da Máquina:', parsed);
        
        // Filtrar por máquina se selecionada
        if (maquinaSelecionada && parsed.maquina_id !== maquinaSelecionada) {
          return; // Ignorar dados de outras máquinas
        }
        
        setLiveData(parsed);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('❌ Erro ao processar mensagem MQTT:', error);
      }
    });
    
    return () => {
      socket.off('mqtt_message');
      socket.off('connect');
    };
  }, [session, maquinaSelecionada]);
  
  const fetchMaquinas = async (session) => {
    try {
      const response = await axios.get(`${API_URL}/api/maquinas`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      setMaquinas(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar máquinas:', error);
    }
  };
  
  const fetchLatestData = async (sessionParam) => {
    const currentSession = sessionParam || session;
    if (!currentSession) return;
    
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/leituras`, {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`
        }
      });
      
      const data = response.data || [];
      
      // Filtrar por máquina se selecionada
      let filteredData = data;
      if (maquinaSelecionada) {
        filteredData = data.filter(d => d.maquina_id == maquinaSelecionada);
      }
      
      if (filteredData.length > 0) {
        const lastData = filteredData[0]; // Primeiro elemento = mais recente
        setLiveData(lastData);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      
      // Fallback
      try {
        const fallbackResponse = await axios.get(`${API_URL}/api/leituras-test`);
        const fallbackData = fallbackResponse.data || [];
        
        if (fallbackData.length > 0) {
          const lastData = fallbackData[0]; // Primeiro elemento = mais recente
          setLiveData(lastData);
          setLastUpdate(new Date());
        }
      } catch (fallbackError) {
        console.error('Erro no fallback:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    localStorage.removeItem('empresa_id');
    localStorage.removeItem('empresa_nome');
    localStorage.removeItem('user_role');
    await supabase.auth.signOut();
  };
  
  const getStatusInfo = (status) => {
    if (!status) {
      return { 
        icon: <ErrorIcon sx={{ fontSize: 48 }} />, 
        color: '#6b7280', 
        label: 'Desconhecido',
        bgColor: 'rgba(107, 114, 128, 0.1)'
      };
    }
    
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'ligado' || statusLower === 'aberta' || statusLower === 'ativo' || statusLower === 'running') {
      return { 
        icon: <CheckCircleIcon sx={{ fontSize: 48 }} />, 
        color: '#10b981', 
        label: status,
        bgColor: 'rgba(16, 185, 129, 0.1)'
      };
    } else if (statusLower === 'desligado' || statusLower === 'fechada' || statusLower === 'parado' || statusLower === 'stopped') {
      return { 
        icon: <CancelIcon sx={{ fontSize: 48 }} />, 
        color: '#f59e0b', 
        label: status,
        bgColor: 'rgba(245, 158, 11, 0.1)'
      };
    } else if (statusLower === 'erro' || statusLower === 'falha' || statusLower === 'error') {
      return { 
        icon: <ErrorIcon sx={{ fontSize: 48 }} />, 
        color: '#ef4444', 
        label: status,
        bgColor: 'rgba(239, 68, 68, 0.1)'
      };
    }
    
    return { 
      icon: <ErrorIcon sx={{ fontSize: 48 }} />, 
      color: '#6b7280', 
      label: status,
      bgColor: 'rgba(107, 114, 128, 0.1)'
    };
  };
  
  const StatusCard = ({ title, icon, status, value = null, unit = '', category = '' }) => {
    const statusInfo = getStatusInfo(status);
    
    return (
      <Card 
        elevation={3}
        sx={{
          borderRadius: 3,
          background: `linear-gradient(135deg, ${statusInfo.bgColor} 0%, rgba(40, 40, 40, 0.95) 100%)`,
          border: `3px solid ${statusInfo.color}`,
          transition: 'all 0.3s ease',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: `0 16px 48px ${statusInfo.color}60`,
            borderColor: statusInfo.color,
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: statusInfo.color,
          }
        }}
      >
        <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Categoria no topo */}
          {category && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#94a3b8',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                mb: 1
              }}
            >
              {category}
            </Typography>
          )}
          
          {/* Título e Ícone */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar 
              sx={{ 
                bgcolor: `${statusInfo.color}30`,
                border: `2px solid ${statusInfo.color}`,
                color: statusInfo.color,
                width: 56,
                height: 56,
              }}
            >
              {icon}
            </Avatar>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 800,
                color: '#ffffff',
                fontSize: '1.1rem',
                lineHeight: 1.3,
                flex: 1
              }}
            >
              {title}
            </Typography>
          </Box>
          
          {/* Valor (se houver) - centralizado */}
          {value !== null && (
            <Box sx={{ textAlign: 'center', mb: 2, py: 1 }}>
              <Typography 
                variant="h3" 
                sx={{ 
                  color: statusInfo.color,
                  fontWeight: 900,
                  fontSize: '2.5rem',
                  textShadow: `0 0 20px ${statusInfo.color}40`,
                }}
              >
                {value}
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#94a3b8',
                  fontWeight: 600,
                  mt: 0.5
                }}
              >
                {unit}
              </Typography>
            </Box>
          )}
          
          {/* Status Badge - ocupa toda a largura */}
          <Box 
            sx={{ 
              mt: 'auto',
              pt: 2,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', fontSize: 28, color: statusInfo.color }}>
                {statusInfo.icon}
              </Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                STATUS ATUAL
              </Typography>
            </Box>
            <Chip 
              label={statusInfo.label}
              sx={{
                bgcolor: statusInfo.color,
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.9rem',
                width: '100%',
                height: 40,
                borderRadius: 2,
                '& .MuiChip-label': {
                  padding: 0,
                }
              }}
            />
          </Box>
        </CardContent>
      </Card>
    );
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
          borderColor: 'rgba(80, 80, 80, 0.3)',
        }}
      >
        <Toolbar sx={{ py: 3, px: 5 }}>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Avatar 
              sx={{ 
                background: 'linear-gradient(135deg, #505050 0%, #707070 100%)',
                mr: 3,
                width: 64,
                height: 64,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
              }}
            >
              <SettingsIcon sx={{ fontSize: 36, color: '#ffffff' }} />
            </Avatar>
            <Box sx={{ ml: 1 }}>
              <Typography 
                variant="h5" 
                component="div" 
                sx={{ 
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 900, 
                  fontSize: '2rem',
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                }}
              >
                Status da Máquina
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontSize: '1rem', 
                  fontWeight: 500,
                  fontFamily: '"Poppins", sans-serif',
                  color: '#94a3b8',
                }}
              >
                {empresaNome ? `${empresaNome} • ` : ''}Monitoramento em Tempo Real dos Componentes
              </Typography>
            </Box>
          </Box>
          
          {lastUpdate && (
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 600,
                fontFamily: '"Poppins", sans-serif',
                color: '#94a3b8',
                mr: 3
              }}
            >
              Última atualização: {lastUpdate.toLocaleTimeString()}
            </Typography>
          )}
          
          <Button 
            variant="outlined" 
            startIcon={<LogoutOutlined sx={{ fontSize: 22 }} />}
            onClick={handleLogout}
            size="large"
            sx={{ 
              px: 4,
              py: 2,
              borderRadius: 3,
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 800,
              borderWidth: 2,
              fontSize: '1rem',
              color: '#ffffff',
            }}
          >
            Sair
          </Button>
        </Toolbar>
      </AppBar>
      
      {/* Filtro de Máquina */}
      <Container maxWidth="xl" sx={{ pt: 4, px: 6 }}>
        <Box sx={{ mb: 3 }}>
          <FormControl sx={{ minWidth: 280 }} size="small">
            <InputLabel>Selecionar Máquina</InputLabel>
            <Select
              value={maquinaSelecionada}
              label="Selecionar Máquina"
              onChange={(e) => {
                setMaquinaSelecionada(e.target.value);
                fetchLatestData();
              }}
              sx={{
                backgroundColor: 'background.paper',
                borderRadius: 2,
              }}
            >
              <MenuItem value="">
                <em>Todas as máquinas</em>
              </MenuItem>
              {maquinas.map((maquina) => (
                <MenuItem key={maquina.id} value={maquina.id}>
                  {maquina.nome} - {maquina.modelo}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Container>
      
      {/* Status Cards */}
      <Container maxWidth="xl" sx={{ py: 3, px: 6 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
            <CircularProgress size={60} />
          </Box>
        ) : !liveData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
            <Typography variant="h6" sx={{ color: '#94a3b8' }}>
              Aguardando dados da máquina...
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* Seção 1: Status Geral - Paper agrupado */}
            <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3, background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(40, 40, 40, 0.95) 100%)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 2, borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                <PowerSettingsNewIcon sx={{ fontSize: 32, color: '#3b82f6' }} />
                <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 800 }}>
                  Status Geral
                </Typography>
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <StatusCard 
                    category="Sistema"
                    title="Status da Máquina"
                    icon={<PowerSettingsNewIcon />}
                    status={liveData.status}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <StatusCard 
                    category="Motor"
                    title="Motor Ventilador"
                    icon={<AirIcon />}
                    status={liveData.status_motor_ventilador}
                  />
                </Grid>
              </Grid>
            </Paper>
            
            {/* Seção 2: Autoclave - Paper agrupado */}
            <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3, background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(40, 40, 40, 0.95) 100%)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 2, borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                <CompressIcon sx={{ fontSize: 32, color: '#f59e0b' }} />
                <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 800 }}>
                  Autoclave
                </Typography>
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <StatusCard 
                    category="Autoclave"
                    title="Válvula de Entrada"
                    icon={<CompressIcon />}
                    status={liveData.status_valvula_entrada_autoclave}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <StatusCard 
                    category="Autoclave"
                    title="Válvula de Descarga"
                    icon={<CompressIcon />}
                    status={liveData.status_valvula_descarga_autoclave}
                  />
                </Grid>
              </Grid>
            </Paper>
            
            {/* Seção 3: Saco de Ar - Paper agrupado */}
            <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3, background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(40, 40, 40, 0.95) 100%)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 2, borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                <InventoryIcon sx={{ fontSize: 32, color: '#10b981' }} />
                <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 800 }}>
                  Saco de Ar
                </Typography>
                <Chip 
                  label={`${liveData.pressao_saco_ar != null ? parseFloat(liveData.pressao_saco_ar).toFixed(2) : 0} bar`} 
                  sx={{ 
                    ml: 'auto', 
                    fontWeight: 800, 
                    fontSize: '1rem',
                    bgcolor: '#10b981',
                    color: '#ffffff',
                    px: 2,
                    py: 2.5
                  }} 
                />
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <StatusCard 
                    category="Saco de Ar"
                    title="Válvula de Entrada"
                    icon={<InventoryIcon />}
                    status={liveData.status_valvula_entrada_saco_ar}
                    value={liveData.pressao_saco_ar}
                    unit="bar"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <StatusCard 
                    category="Saco de Ar"
                    title="Válvula de Descarga"
                    icon={<InventoryIcon />}
                    status={liveData.status_valvula_descarga_saco_ar}
                    value={liveData.pressao_saco_ar}
                    unit="bar"
                  />
                </Grid>
              </Grid>
            </Paper>
            
            {/* Seção 4: Envelope - Paper agrupado */}
            <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3, background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(40, 40, 40, 0.95) 100%)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 2, borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                <MailIcon sx={{ fontSize: 32, color: '#8b5cf6' }} />
                <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 800 }}>
                  Envelope
                </Typography>
                <Chip 
                  label={`${liveData.pressao_envelope != null ? parseFloat(liveData.pressao_envelope).toFixed(2) : 0} bar`} 
                  sx={{ 
                    ml: 'auto', 
                    fontWeight: 800, 
                    fontSize: '1rem',
                    bgcolor: '#8b5cf6',
                    color: '#ffffff',
                    px: 2,
                    py: 2.5
                  }} 
                />
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <StatusCard 
                    category="Envelope"
                    title="Válvula de Entrada"
                    icon={<MailIcon />}
                    status={liveData.status_valvula_entrada_envelope}
                    value={liveData.pressao_envelope}
                    unit="bar"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <StatusCard 
                    category="Envelope"
                    title="Válvula de Descarga"
                    icon={<MailIcon />}
                    status={liveData.status_valvula_descarga_envelope}
                    value={liveData.pressao_envelope}
                    unit="bar"
                  />
                </Grid>
              </Grid>
            </Paper>
            
            {/* Seção 5: Informações Adicionais - Paper agrupado */}
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3, background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(40, 40, 40, 0.95) 100%)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 2, borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 800 }}>
                  📊 Informações Adicionais
                </Typography>
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card 
                    elevation={3} 
                    sx={{ 
                      borderRadius: 3, 
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(40, 40, 40, 0.95) 100%)', 
                      border: '3px solid #f59e0b',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 16px 48px rgba(245, 158, 11, 0.4)',
                      }
                    }}
                  >
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <ThermostatOutlined sx={{ fontSize: 48, color: '#f59e0b', mb: 2 }} />
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, letterSpacing: 1.5, display: 'block', mb: 2 }}>
                        TEMPERATURA
                      </Typography>
                      <Typography variant="h2" sx={{ color: '#f59e0b', fontWeight: 900, mb: 1, textShadow: '0 0 20px rgba(245, 158, 11, 0.4)' }}>
                        {liveData.temperatura != null ? parseFloat(liveData.temperatura).toFixed(1) : '-'}
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                        °C
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card 
                    elevation={3} 
                    sx={{ 
                      borderRadius: 3, 
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(40, 40, 40, 0.95) 100%)', 
                      border: '3px solid #10b981',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 16px 48px rgba(16, 185, 129, 0.4)',
                      }
                    }}
                  >
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <SpeedOutlined sx={{ fontSize: 48, color: '#10b981', mb: 2 }} />
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, letterSpacing: 1.5, display: 'block', mb: 2 }}>
                        VIBRAÇÃO
                      </Typography>
                      <Typography variant="h2" sx={{ color: '#10b981', fontWeight: 900, mb: 1, textShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}>
                        {liveData.vibracao != null ? parseFloat(liveData.vibracao).toFixed(2) : '-'}
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                        mm/s
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card 
                    elevation={3} 
                    sx={{ 
                      borderRadius: 3, 
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(40, 40, 40, 0.95) 100%)', 
                      border: '3px solid #3b82f6',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 16px 48px rgba(59, 130, 246, 0.4)',
                      }
                    }}
                  >
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <ProductionQuantityLimitsOutlined sx={{ fontSize: 48, color: '#3b82f6', mb: 2 }} />
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, letterSpacing: 1.5, display: 'block', mb: 2 }}>
                        PEÇAS PRODUZIDAS
                      </Typography>
                      <Typography variant="h2" sx={{ color: '#3b82f6', fontWeight: 900, mb: 1, textShadow: '0 0 20px rgba(59, 130, 246, 0.4)' }}>
                        {liveData.pecas_produzidas || '-'}
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                        unidades
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default StatusMaquina;

