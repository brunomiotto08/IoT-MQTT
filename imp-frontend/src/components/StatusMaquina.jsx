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

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
        elevation={0}
        sx={{
          borderRadius: '10px',
          background: '#161616',
          border: `1.5px solid ${statusInfo.color}55`,
          transition: 'all 0.25s ease',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 12px 36px ${statusInfo.color}30`,
            borderColor: `${statusInfo.color}99`,
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
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
                color: '#4a4a4a',
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                mb: 1.5,
                display: 'block',
              }}
            >
              {category}
            </Typography>
          )}
          
          {/* Título e Ícone */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
            <Avatar 
              sx={{ 
                bgcolor: `${statusInfo.color}18`,
                border: `1.5px solid ${statusInfo.color}55`,
                color: statusInfo.color,
                width: 48,
                height: 48,
              }}
            >
              {icon}
            </Avatar>
            <Typography 
              sx={{ 
                fontWeight: 700,
                color: '#d0d0d0',
                fontSize: '1rem',
                lineHeight: 1.3,
                flex: 1,
                fontFamily: '"Outfit", sans-serif',
              }}
            >
              {title}
            </Typography>
          </Box>
          
          {/* Valor (se houver) */}
          {value !== null && (
            <Box sx={{ textAlign: 'center', mb: 2.5, py: 0.5 }}>
              <Typography 
                sx={{ 
                  color: statusInfo.color,
                  fontWeight: 700,
                  fontSize: '2.625rem',
                  lineHeight: 1,
                  fontFamily: '"Outfit", sans-serif',
                  letterSpacing: '-0.02em',
                }}
              >
                {value}
              </Typography>
              <Typography 
                sx={{ 
                  color: '#444',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  mt: 0.75,
                }}
              >
                {unit}
              </Typography>
            </Box>
          )}
          
          {/* Status Badge */}
          <Box 
            sx={{ 
              mt: 'auto',
              pt: 2,
              borderTop: '1px solid #1e1e1e',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', color: statusInfo.color, '& svg': { fontSize: 22 } }}>
                {statusInfo.icon}
              </Box>
              <Typography sx={{ color: '#3a3a3a', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Status Atual
              </Typography>
            </Box>
            <Chip 
              label={statusInfo.label}
              sx={{
                bgcolor: `${statusInfo.color}20`,
                color: statusInfo.color,
                border: `1px solid ${statusInfo.color}55`,
                fontWeight: 700,
                fontSize: '0.85rem',
                width: '100%',
                height: 36,
                borderRadius: '6px',
                '& .MuiChip-label': { padding: 0 },
              }}
            />
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#0f0f0f', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ px: 4, minHeight: '56px !important', gap: 1 }}>
          <IconButton edge="start" size="small" onClick={() => navigate('/')} sx={{ color: '#666', mr: 1.5, '&:hover': { color: '#aaa' } }}>
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <img src="/habilita_logo.svg" alt="Habilita" style={{ height: 26, width: 'auto', marginRight: 12 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Typography sx={{ color: '#2a2a2a', fontSize: '0.875rem' }}>/</Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#e2e2e2' }}>
              Status da Máquina
            </Typography>
          </Box>
          {lastUpdate && (
            <Typography variant="caption" sx={{ color: '#444', mr: 1 }}>
              {lastUpdate.toLocaleTimeString()}
            </Typography>
          )}
          <Button size="small" startIcon={<LogoutOutlined sx={{ fontSize: 14 }} />} onClick={handleLogout}
            sx={{ color: '#555', fontSize: '0.75rem', fontWeight: 600, px: 1.5, '&:hover': { color: '#aaa' } }}>
            Sair
          </Button>
        </Toolbar>
      </AppBar>
      
      {/* Filtro de Máquina */}
      <Container maxWidth="xl" sx={{ pt: 3.5, px: { xs: 2, md: 4 } }}>
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
      <Container maxWidth="xl" sx={{ py: 3, px: { xs: 2, md: 4 } }}>
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
            {/* Seção 1: Status Geral */}
            <Paper elevation={0} sx={{ p: 3.5, mb: 3, borderRadius: '10px', bgcolor: '#111', border: '1px solid #1e1e1e' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, pb: 2, borderBottom: '1px solid #1e1e1e' }}>
                <PowerSettingsNewIcon sx={{ fontSize: 22, color: '#3b82f6' }} />
                <Typography sx={{ color: '#d0d0d0', fontWeight: 700, fontSize: '0.9rem', fontFamily: '"Outfit", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Status Geral
                </Typography>
              </Box>
              <Grid container spacing={2.5}>
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
            
            {/* Seção 2: Autoclave */}
            <Paper elevation={0} sx={{ p: 3.5, mb: 3, borderRadius: '10px', bgcolor: '#111', border: '1px solid #1e1e1e' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, pb: 2, borderBottom: '1px solid #1e1e1e' }}>
                <CompressIcon sx={{ fontSize: 22, color: '#f59e0b' }} />
                <Typography sx={{ color: '#d0d0d0', fontWeight: 700, fontSize: '0.9rem', fontFamily: '"Outfit", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Autoclave
                </Typography>
              </Box>
              <Grid container spacing={2.5}>
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
            
            {/* Seção 3: Saco de Ar */}
            <Paper elevation={0} sx={{ p: 3.5, mb: 3, borderRadius: '10px', bgcolor: '#111', border: '1px solid #1e1e1e' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, pb: 2, borderBottom: '1px solid #1e1e1e' }}>
                <InventoryIcon sx={{ fontSize: 22, color: '#10b981' }} />
                <Typography sx={{ color: '#d0d0d0', fontWeight: 700, fontSize: '0.9rem', fontFamily: '"Outfit", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Saco de Ar
                </Typography>
                <Box sx={{ ml: 'auto', px: 1.5, py: 0.5, bgcolor: '#10b98118', border: '1px solid #10b98155', borderRadius: '6px' }}>
                  <Typography sx={{ color: '#10b981', fontWeight: 700, fontSize: '0.875rem', fontFamily: '"Outfit", sans-serif' }}>
                    {liveData.pressao_saco_ar != null ? parseFloat(liveData.pressao_saco_ar).toFixed(2) : '0'} bar
                  </Typography>
                </Box>
              </Box>
              <Grid container spacing={2.5}>
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
            
            {/* Seção 4: Envelope */}
            <Paper elevation={0} sx={{ p: 3.5, mb: 3, borderRadius: '10px', bgcolor: '#111', border: '1px solid #1e1e1e' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, pb: 2, borderBottom: '1px solid #1e1e1e' }}>
                <MailIcon sx={{ fontSize: 22, color: '#8b5cf6' }} />
                <Typography sx={{ color: '#d0d0d0', fontWeight: 700, fontSize: '0.9rem', fontFamily: '"Outfit", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Envelope
                </Typography>
                <Box sx={{ ml: 'auto', px: 1.5, py: 0.5, bgcolor: '#8b5cf618', border: '1px solid #8b5cf655', borderRadius: '6px' }}>
                  <Typography sx={{ color: '#8b5cf6', fontWeight: 700, fontSize: '0.875rem', fontFamily: '"Outfit", sans-serif' }}>
                    {liveData.pressao_envelope != null ? parseFloat(liveData.pressao_envelope).toFixed(2) : '0'} bar
                  </Typography>
                </Box>
              </Box>
              <Grid container spacing={2.5}>
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
            
            {/* Seção 5: Informações Adicionais */}
            <Paper elevation={0} sx={{ p: 3.5, borderRadius: '10px', bgcolor: '#111', border: '1px solid #1e1e1e' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, pb: 2, borderBottom: '1px solid #1e1e1e' }}>
                <Typography sx={{ color: '#d0d0d0', fontWeight: 700, fontSize: '0.9rem', fontFamily: '"Outfit", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Informações Adicionais
                </Typography>
              </Box>
              <Grid container spacing={2.5}>
                <Grid item xs={12} md={4}>
                  <Card elevation={0} sx={{ borderRadius: '10px', bgcolor: '#161616', border: '1px solid #f59e0b44', transition: 'all 0.25s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(245,158,11,0.2)', borderColor: '#f59e0b88' } }}>
                    <CardContent sx={{ p: 3, textAlign: 'center' }}>
                      <ThermostatOutlined sx={{ fontSize: 36, color: '#f59e0b', mb: 1.5 }} />
                      <Typography sx={{ color: '#4a4a4a', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.14em', display: 'block', mb: 1.5 }}>
                        Temperatura
                      </Typography>
                      <Typography sx={{ color: '#f59e0b', fontWeight: 700, fontSize: '2.875rem', lineHeight: 1, fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.02em' }}>
                        {liveData.temperatura != null ? parseFloat(liveData.temperatura).toFixed(1) : '-'}
                      </Typography>
                      <Typography sx={{ color: '#3a3a3a', fontWeight: 600, fontSize: '0.875rem', mt: 0.75 }}>
                        °C
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card elevation={0} sx={{ borderRadius: '10px', bgcolor: '#161616', border: '1px solid #10b98144', transition: 'all 0.25s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(16,185,129,0.2)', borderColor: '#10b98188' } }}>
                    <CardContent sx={{ p: 3, textAlign: 'center' }}>
                      <SpeedOutlined sx={{ fontSize: 36, color: '#10b981', mb: 1.5 }} />
                      <Typography sx={{ color: '#4a4a4a', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.14em', display: 'block', mb: 1.5 }}>
                        Pressão
                      </Typography>
                      <Typography sx={{ color: '#10b981', fontWeight: 700, fontSize: '2.875rem', lineHeight: 1, fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.02em' }}>
                        {liveData.vibracao != null ? parseFloat(liveData.vibracao).toFixed(2) : '-'}
                      </Typography>
                      <Typography sx={{ color: '#3a3a3a', fontWeight: 600, fontSize: '0.875rem', mt: 0.75 }}>
                        Pa
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card elevation={0} sx={{ borderRadius: '10px', bgcolor: '#161616', border: '1px solid #3b82f644', transition: 'all 0.25s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(59,130,246,0.2)', borderColor: '#3b82f688' } }}>
                    <CardContent sx={{ p: 3, textAlign: 'center' }}>
                      <ProductionQuantityLimitsOutlined sx={{ fontSize: 36, color: '#3b82f6', mb: 1.5 }} />
                      <Typography sx={{ color: '#4a4a4a', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.14em', display: 'block', mb: 1.5 }}>
                        Peças Produzidas
                      </Typography>
                      <Typography sx={{ color: '#3b82f6', fontWeight: 700, fontSize: '2.875rem', lineHeight: 1, fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.02em' }}>
                        {liveData.pecas_produzidas || '-'}
                      </Typography>
                      <Typography sx={{ color: '#3a3a3a', fontWeight: 600, fontSize: '0.875rem', mt: 0.75 }}>
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

