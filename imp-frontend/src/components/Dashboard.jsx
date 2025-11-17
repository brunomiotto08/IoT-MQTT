import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { 
  Container, 
  Grid,
  Typography, 
  Box, 
  Button, 
  AppBar, 
  Toolbar, 
  IconButton,
  Chip,
  Avatar,
  LinearProgress,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import RefreshOutlined from '@mui/icons-material/RefreshOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import SpeedOutlined from '@mui/icons-material/SpeedOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ProductionQuantityLimitsOutlined from '@mui/icons-material/ProductionQuantityLimitsOutlined';
import ThermostatOutlined from '@mui/icons-material/ThermostatOutlined';
import HistoryIcon from '@mui/icons-material/History';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

import DataCard from './DataCard';
import GaugeChart from './GaugeChart';
import LineChart from './LineChart';
import soundManager from '../utils/soundManager';

const socket = io('http://localhost:3000');
const API_URL = 'http://localhost:3000';

function Dashboard() {
  const navigate = useNavigate();
  const [liveData, setLiveData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [empresaNome, setEmpresaNome] = useState('');
  const [userRole, setUserRole] = useState('');
  
  // Estados para notificações Toast
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationData, setNotificationData] = useState(null);
  
  // Estados para filtros
  const [maquinas, setMaquinas] = useState([]);
  const [maquinaSelecionada, setMaquinaSelecionada] = useState('');
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Sessão obtida:', session);
      setSession(session);
      
      if (!session) return;
      
      // Verificar se empresa_id existe no localStorage
      let empresaId = localStorage.getItem('empresa_id');
      
      if (!empresaId) {
        console.log('⚠️ empresa_id não encontrado no localStorage, buscando do banco...');
        
        try {
          const { data: vinculoData, error: vinculoError } = await supabase
            .from('usuarios_empresas')
            .select('empresa_id, empresas(nome)')
            .eq('user_id', session.user.id)
            .single();

          if (vinculoError || !vinculoData) {
            console.error('❌ Erro ao buscar empresa do usuário:', vinculoError);
            return;
          }

          empresaId = vinculoData.empresa_id.toString();
          localStorage.setItem('empresa_id', empresaId);
          
          if (vinculoData.empresas?.nome) {
            localStorage.setItem('empresa_nome', vinculoData.empresas.nome);
            setEmpresaNome(vinculoData.empresas.nome);
          }
          
          console.log('✅ empresa_id recuperado do banco e salvo:', empresaId);
        } catch (err) {
          console.error('❌ Erro ao buscar dados da empresa:', err);
        }
      }
      
      // Carregar dados da empresa do localStorage
      const empresaNomeLS = localStorage.getItem('empresa_nome');
      const userRoleLS = localStorage.getItem('user_role');
      
      if (empresaNomeLS) setEmpresaNome(empresaNomeLS);
      if (userRoleLS) setUserRole(userRoleLS);
    };
    getSession();
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!session) return;
      
      try {
        console.log('Buscando dados históricos...');
        setIsLoading(true);
        
        // Usar o endpoint com autenticação
        const response = await axios.get(`${API_URL}/api/leituras`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        console.log('Dados históricos recebidos:', response.data);
        const historicalArray = response.data || [];
        setHistoricalData(historicalArray);
        
        // Definir o último dado como liveData para mostrar nos cards
        if (historicalArray.length > 0) {
          const lastData = historicalArray[historicalArray.length - 1];
          setLiveData(lastData);
          console.log('📊 Último dado histórico definido como liveData:', lastData);
        }
        
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Erro ao buscar dados históricos:', error);
        
        // Fallback para o endpoint de teste se houver erro
        try {
          const fallbackResponse = await axios.get(`${API_URL}/api/leituras-test`);
          const fallbackArray = fallbackResponse.data || [];
          setHistoricalData(fallbackArray);
          
          // Definir o último dado como liveData
          if (fallbackArray.length > 0) {
            const lastData = fallbackArray[fallbackArray.length - 1];
            setLiveData(lastData);
            console.log('📊 Último dado histórico (fallback) definido como liveData:', lastData);
          }
          
          setLastUpdate(new Date());
        } catch (fallbackError) {
          console.error('Erro no fallback:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
    fetchMaquinas();

    // DEBUG: Testar se este código está rodando
    console.log('🚀 DASHBOARD: useEffect do WebSocket executado!');
    console.log('🚀 Socket existe?', socket ? 'SIM' : 'NÃO');
    console.log('🚀 Socket conectado?', socket.connected);

    // Socket connection status
    socket.on('connect', () => {
      console.log('✅ Socket conectado! ID:', socket.id);
      
      // Entrar no room da empresa
      const empresaId = localStorage.getItem('empresa_id');
      console.log('🔍 Empresa ID do localStorage:', empresaId);
      
      if (empresaId) {
        console.log('🔐 Entrando no room da empresa:', empresaId);
        socket.emit('join_empresa', empresaId);
      } else {
        console.error('❌ empresa_id não encontrado no localStorage');
      }
      
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket desconectado');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.log('Erro de conexão do socket:', error);
      setConnectionStatus('disconnected');
    });

    socket.on('connected', (data) => {
      console.log('✅ Confirmação de conexão recebida do servidor:', data);
      if (data.empresa_id) {
        console.log('✅ Conectado ao room da empresa:', data.empresa_id);
      }
      setConnectionStatus('connected');
    });

    // Aguardar um pouco para garantir que o empresa_id foi recuperado
    const checkAndJoinRoom = () => {
      const empresaId = localStorage.getItem('empresa_id');
      
      if (empresaId) {
        console.log('✅ empresa_id encontrado:', empresaId);
        if (socket.connected) {
          console.log('🔐 Socket conectado, entrando no room:', empresaId);
          socket.emit('join_empresa', empresaId);
          setConnectionStatus('connected');
        } else {
          console.log('⏳ Socket ainda não está conectado, aguardando...');
          setConnectionStatus('connecting');
        }
      } else {
        console.warn('⚠️ empresa_id ainda não disponível, tentando novamente em 500ms...');
        setTimeout(checkAndJoinRoom, 500);
      }
    };
    
    // Tentar entrar no room após um pequeno delay
    const joinTimeout = setTimeout(checkAndJoinRoom, 300);

    socket.on('mqtt_message', (message) => {
      try {
        // Parsear a mensagem (pode vir como string ou já parseada)
        const parsed = typeof message === 'string' ? JSON.parse(message) : message;
        console.log('📊 Dados recebidos no Dashboard:', parsed);
        
        // Garantir que created_at existe
        if (!parsed.created_at) {
          parsed.created_at = new Date().toISOString();
        }
        
        setLiveData(parsed);
        setLastUpdate(new Date());

        setHistoricalData((current) => {
          const updated = [...current, parsed];
          return updated.length > 50 ? updated.slice(1) : updated;
        });
      } catch (error) {
        console.error('❌ Erro ao processar mensagem MQTT:', error);
      }
    });
    
    // Listener para notificações/alarmes
    socket.on('new_notification', (notification) => {
      try {
        console.log('🔔 Nova notificação recebida:', notification);
        
        // Tocar som baseado na prioridade e tipo de limite
        const prioridade = notification.prioridade || 'media';
        const tipoLimite = notification.tipoLimite || 'max'; // 'max' ou 'min'
        soundManager.play(prioridade, tipoLimite);
        
        setNotificationData(notification);
        setNotificationOpen(true);
      } catch (error) {
        console.error('❌ Erro ao processar notificação:', error);
      }
    });

    return () => {
      clearTimeout(joinTimeout);
      socket.off('mqtt_message');
      socket.off('new_notification');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connected');
    };
  }, [session]);

  const handleLogout = async () => {
    // Limpar dados do localStorage
    localStorage.removeItem('empresa_id');
    localStorage.removeItem('empresa_nome');
    localStorage.removeItem('user_role');
    
    await supabase.auth.signOut();
  };
  
  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotificationOpen(false);
  };

  const handleRefresh = async () => {
    if (!session) return;
    
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/leituras`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      setHistoricalData(response.data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      
      // Fallback para o endpoint de teste
      try {
        const fallbackResponse = await axios.get(`${API_URL}/api/leituras-test`);
        setHistoricalData(fallbackResponse.data || []);
        setLastUpdate(new Date());
      } catch (fallbackError) {
        console.error('Erro no fallback:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchMaquinas = async () => {
    if (!session) return;
    
    try {
      const response = await axios.get(`${API_URL}/api/maquinas`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      setMaquinas(response.data || []);
      console.log('✅ Máquinas carregadas:', response.data?.length || 0);
    } catch (error) {
      console.error('Erro ao buscar máquinas:', error);
    }
  };
  
  // Filtrar dados quando máquina ou dados históricos mudarem
  useEffect(() => {
    if (maquinaSelecionada) {
      const filtered = historicalData.filter(d => d.maquina_id == maquinaSelecionada);
      setFilteredData(filtered);
      
      // Atualizar liveData com o último dado filtrado
      if (filtered.length > 0) {
        setLiveData(filtered[filtered.length - 1]);
      }
      
      console.log(`✅ Dados filtrados para máquina ${maquinaSelecionada}:`, filtered.length);
    } else {
      setFilteredData(historicalData);
    }
  }, [maquinaSelecionada, historicalData]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'ativo':
      case 'running':
        return 'success';
      case 'parado':
      case 'stopped':
        return 'warning';
      case 'erro':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'disconnected':
        return 'error';
      default:
        return 'default';
    }
  };

  const gaugeSeries = [liveData ? parseFloat(liveData.temperatura) : 0];
  
  const lineSeries = [{
    name: 'Temperatura',
    data: filteredData.map((d) => ([
      d.created_at ? new Date(d.created_at).getTime() : Date.now(),
      d.temperatura != null ? parseFloat(d.temperatura) : 0
    ]))
  }];
  
  const vibrationSeries = [{
    name: 'Vibração',
    data: filteredData.map((d) => ([
      d.created_at ? new Date(d.created_at).getTime() : Date.now(),
      d.vibracao != null ? parseFloat(d.vibracao) : 0
    ]))
  }];
  
  const productionSeries = [{
    name: 'Peças Produzidas',
    data: filteredData.map((d) => ([
      d.created_at ? new Date(d.created_at).getTime() : Date.now(),
      d.pecas_produzidas != null ? parseInt(d.pecas_produzidas) : 0
    ]))
  }];

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: 'background.default', minHeight: '100vh' }}>
      {/* Modern Header */}
      <AppBar 
        position="static" 
        elevation={0} 
        sx={{ 
          background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.98) 0%, rgba(30, 30, 30, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '2px solid',
          borderColor: 'rgba(80, 80, 80, 0.3)',
          animation: 'fadeInUp 0.6s ease-out',
        }}
      >
        <Toolbar sx={{ py: 3, px: 5 }}>
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
              <ThermostatOutlined sx={{ fontSize: 36, color: '#ffffff' }} />
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
                Dashboard I.M.P.
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
                {empresaNome ? `${empresaNome} • ` : ''}Monitoramento Industrial em Tempo Real
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Botões de navegação */}
            <Button
              variant="text"
              startIcon={<DashboardIcon />}
              sx={{
                color: '#ffffff',
                fontWeight: 700,
                px: 2,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              Dashboard
            </Button>
            
            <Button
              variant="text"
              startIcon={<HistoryIcon />}
              onClick={() => navigate('/historico')}
              sx={{
                color: '#ffffff',
                fontWeight: 700,
                px: 2,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              Histórico
            </Button>
            
            <Button
              variant="text"
              startIcon={<NotificationsActiveIcon />}
              onClick={() => navigate('/notificacoes')}
              sx={{
                color: '#ffffff',
                fontWeight: 700,
                px: 2,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              Notificações
            </Button>
            
            <Button
              variant="text"
              startIcon={<SettingsIcon />}
              onClick={() => navigate('/configuracoes')}
              sx={{
                color: '#ffffff',
                fontWeight: 700,
                px: 2,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              Configurações
            </Button>

            <Box sx={{ width: 2, height: 40, bgcolor: 'rgba(255, 255, 255, 0.2)', mx: 1 }} />
            
            <Chip 
              label={connectionStatus === 'connected' ? 'Conectado' : 
                     connectionStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
              color={getConnectionColor()}
              size="medium"
              variant="filled"
              icon={
                <Box 
                  sx={{ 
                    width: 10, 
                    height: 10, 
                    borderRadius: '50%', 
                    bgcolor: 'white',
                    animation: connectionStatus === 'connected' ? 'pulse 2s ease-in-out infinite' : 'none',
                    marginLeft: '8px',
                  }} 
                />
              }
              sx={{ 
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 800,
                px: 3,
                py: 3,
                fontSize: '0.95rem',
                color: '#ffffff',
                '& .MuiChip-label': {
                  color: '#ffffff',
                },
              }}
            />
            
            {lastUpdate && (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 600,
                  fontFamily: '"Poppins", sans-serif',
                  color: '#94a3b8',
                }}
              >
                {lastUpdate.toLocaleTimeString()}
              </Typography>
            )}
            
            <IconButton 
              onClick={handleRefresh} 
              disabled={isLoading} 
              sx={{ 
                width: 52, 
                height: 52,
                border: '3px solid',
                borderColor: 'rgba(120, 120, 120, 0.4)',
                color: '#ffffff',
                '&:hover': {
                  borderColor: '#b0b0b0',
                  background: 'rgba(80, 80, 80, 0.2)',
                  transform: 'rotate(180deg)',
                },
                transition: 'all 0.4s ease',
              }}
            >
              <RefreshOutlined sx={{ fontSize: 26, color: '#ffffff' }} />
            </IconButton>
            
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
          </Box>
        </Toolbar>
      </AppBar>

      {/* Loading Indicator */}
      {isLoading && <LinearProgress sx={{ height: 3 }} />}

      {/* Filtros */}
      <Container maxWidth="xl" sx={{ pt: 4, px: 6 }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 3,
          alignItems: 'center',
          mb: 3,
          animation: 'fadeInDown 0.5s ease-out'
        }}>
          <FormControl sx={{ minWidth: 280 }} size="small">
            <InputLabel id="maquina-select-label">Filtrar por Máquina</InputLabel>
            <Select
              labelId="maquina-select-label"
              id="maquina-select"
              value={maquinaSelecionada}
              label="Filtrar por Máquina"
              onChange={(e) => setMaquinaSelecionada(e.target.value)}
              sx={{
                backgroundColor: 'background.paper',
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(100, 100, 100, 0.3)',
                  borderWidth: 2
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(150, 150, 150, 0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                }
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
          
          {maquinaSelecionada && (
            <Chip
              label={`Filtrando: ${maquinas.find(m => m.id == maquinaSelecionada)?.nome || ''}`}
              onDelete={() => setMaquinaSelecionada('')}
              color="primary"
              variant="outlined"
              sx={{ 
                fontWeight: 600,
                fontSize: '0.9rem',
                animation: 'fadeIn 0.3s ease-out'
              }}
            />
          )}
        </Box>
      </Container>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 3, px: 6 }}>
        <Box>
          {/* Status Overview Cards */}
          <Grid 
            container 
            spacing={4} 
            sx={{ mb: 7 }}
            justifyContent="center"
            alignItems="stretch"
          >
            <Grid 
              item 
              xs={12} 
              sm={6} 
              md={3}
              sx={{ 
                animation: 'fadeInUp 0.6s ease-out',
                animationDelay: '0.1s',
                animationFillMode: 'both',
                display: 'flex',
              }}
            >
              <DataCard 
                title="Temperatura" 
                value={liveData ? liveData.temperatura?.toFixed(1) : null} 
                unit="°C"
                icon={<ThermostatOutlined />}
                color="primary"
                threshold={true}
              />
            </Grid>
            <Grid 
              item 
              xs={12} 
              sm={6} 
              md={3}
              sx={{ 
                animation: 'fadeInUp 0.6s ease-out',
                animationDelay: '0.2s',
                animationFillMode: 'both',
                display: 'flex',
              }}
            >
              <DataCard 
                title="Vibração" 
                value={liveData ? liveData.vibracao?.toFixed(2) : null} 
                unit="mm/s"
                icon={<SpeedOutlined />}
                color="secondary"
                threshold={true}
              />
            </Grid>
            <Grid 
              item 
              xs={12} 
              sm={6} 
              md={3}
              sx={{ 
                animation: 'fadeInUp 0.6s ease-out',
                animationDelay: '0.3s',
                animationFillMode: 'both',
                display: 'flex',
              }}
            >
              <DataCard 
                title="Status" 
                value={liveData ? liveData.status : null} 
                unit=""
                icon={<CheckCircleOutlined />}
                color={getStatusColor(liveData?.status)}
                isStatus={true}
              />
            </Grid>
            <Grid 
              item 
              xs={12} 
              sm={6} 
              md={3}
              sx={{ 
                animation: 'fadeInUp 0.6s ease-out',
                animationDelay: '0.4s',
                animationFillMode: 'both',
                display: 'flex',
              }}
            >
              <DataCard 
                title="Peças Produzidas" 
                value={liveData ? liveData.pecas_produzidas : null} 
                unit=""
                icon={<ProductionQuantityLimitsOutlined />}
                color="success"
              />
            </Grid>
          </Grid>

          {/* Charts Section */}
          <Grid 
            container 
            spacing={5}
            justifyContent="center"
            alignItems="stretch"
          >
            {/* Primeira linha - Gauge e Temperatura */}
            <Grid 
              item 
              xs={12} 
              md={5}
              sx={{ 
                animation: 'fadeInUp 0.6s ease-out',
                animationDelay: '0.5s',
                animationFillMode: 'both',
                display: 'flex',
              }}
            >
              <GaugeChart series={gaugeSeries} />
            </Grid>
            <Grid 
              item 
              xs={12} 
              md={7}
              sx={{ 
                animation: 'fadeInUp 0.6s ease-out',
                animationDelay: '0.6s',
                animationFillMode: 'both',
                display: 'flex',
              }}
            >
              <LineChart series={lineSeries} />
            </Grid>
            
            {/* Segunda linha - Vibração e Peças Produzidas */}
            <Grid 
              item 
              xs={12} 
              md={6}
              sx={{ 
                animation: 'fadeInUp 0.6s ease-out',
                animationDelay: '0.7s',
                animationFillMode: 'both',
                display: 'flex',
              }}
            >
              <LineChart 
                series={vibrationSeries} 
                title="Vibração" 
                unit="mm/s"
                color="#ff9800"
              />
            </Grid>
            <Grid 
              item 
              xs={12} 
              md={6}
              sx={{ 
                animation: 'fadeInUp 0.6s ease-out',
                animationDelay: '0.8s',
                animationFillMode: 'both',
                display: 'flex',
              }}
            >
              <LineChart 
                series={productionSeries} 
                title="Produção Acumulada" 
                unit="unidades"
                color="#4caf50"
              />
            </Grid>
          </Grid>
        </Box>
      </Container>
      
      {/* 🎨 NOTIFICAÇÃO PREMIUM - Ultra moderna com cores dinâmicas */}
      <Snackbar
        open={notificationOpen}
        autoHideDuration={8000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionProps={{
          enter: true,
          exit: true,
        }}
        sx={{
          '& .MuiSnackbar-root': {
            top: '24px !important',
          }
        }}
      >
        <Box
          sx={{
            minWidth: 420,
            maxWidth: 500,
            background: (() => {
              const tipoLimite = notificationData?.tipoLimite || 'max';
              const prioridade = notificationData?.prioridade;
              
              // VERMELHO (Crítico - max ou min)
              if (prioridade === 'critica') {
                return 'linear-gradient(135deg, rgba(239, 68, 68, 0.98) 0%, rgba(220, 38, 38, 0.98) 100%)';
              }
              // LARANJA (Alto - max)
              if (prioridade === 'alta' && tipoLimite === 'max') {
                return 'linear-gradient(135deg, rgba(245, 158, 11, 0.98) 0%, rgba(217, 119, 6, 0.98) 100%)';
              }
              // AZUL (Alto - min)
              if (prioridade === 'alta' && tipoLimite === 'min') {
                return 'linear-gradient(135deg, rgba(59, 130, 246, 0.98) 0%, rgba(37, 99, 235, 0.98) 100%)';
              }
              // AMARELO (Médio)
              if (prioridade === 'media') {
                return 'linear-gradient(135deg, rgba(251, 191, 36, 0.98) 0%, rgba(245, 158, 11, 0.98) 100%)';
              }
              // CINZA (Baixo/Info)
              return 'linear-gradient(135deg, rgba(100, 116, 139, 0.98) 0%, rgba(71, 85, 105, 0.98) 100%)';
            })(),
            backdropFilter: 'blur(20px)',
            borderRadius: 4,
            border: '2px solid',
            borderColor: (() => {
              const tipoLimite = notificationData?.tipoLimite || 'max';
              const prioridade = notificationData?.prioridade;
              
              if (prioridade === 'critica') return 'rgba(239, 68, 68, 0.8)';
              if (prioridade === 'alta' && tipoLimite === 'max') return 'rgba(245, 158, 11, 0.8)';
              if (prioridade === 'alta' && tipoLimite === 'min') return 'rgba(59, 130, 246, 0.8)';
              if (prioridade === 'media') return 'rgba(251, 191, 36, 0.8)';
              return 'rgba(100, 116, 139, 0.8)';
            })(),
            boxShadow: (() => {
              const tipoLimite = notificationData?.tipoLimite || 'max';
              const prioridade = notificationData?.prioridade;
              
              if (prioridade === 'critica') {
                return '0 20px 60px rgba(239, 68, 68, 0.6), 0 0 80px rgba(239, 68, 68, 0.4)';
              }
              if (prioridade === 'alta' && tipoLimite === 'max') {
                return '0 20px 60px rgba(245, 158, 11, 0.6), 0 0 80px rgba(245, 158, 11, 0.4)';
              }
              if (prioridade === 'alta' && tipoLimite === 'min') {
                return '0 20px 60px rgba(59, 130, 246, 0.6), 0 0 80px rgba(59, 130, 246, 0.4)';
              }
              if (prioridade === 'media') {
                return '0 20px 60px rgba(251, 191, 36, 0.6), 0 0 80px rgba(251, 191, 36, 0.4)';
              }
              return '0 20px 60px rgba(100, 116, 139, 0.5), 0 0 60px rgba(100, 116, 139, 0.3)';
            })(),
            position: 'relative',
            overflow: 'hidden',
            animation: 'slideInRight 0.5s cubic-bezier(0.4, 0, 0.2, 1), pulse 2s ease-in-out infinite',
            '@keyframes slideInRight': {
              '0%': {
                transform: 'translateX(100%)',
                opacity: 0,
              },
              '100%': {
                transform: 'translateX(0)',
                opacity: 1,
              }
            },
            '@keyframes pulse': {
              '0%, 100%': {
                transform: 'scale(1)',
              },
              '50%': {
                transform: 'scale(1.02)',
              }
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'rgba(255, 255, 255, 0.4)',
              animation: 'shimmer 2s ease-in-out infinite',
            },
            '@keyframes shimmer': {
              '0%, 100%': { opacity: 0.4 },
              '50%': { opacity: 1 }
            }
          }}
        >
          <Box sx={{ p: 3, position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              {/* Ícone Premium */}
              <Avatar
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  width: 56,
                  height: 56,
                  animation: 'iconPulse 1.5s ease-in-out infinite',
                  '@keyframes iconPulse': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.1)' }
                  }
                }}
              >
                {notificationData?.prioridade === 'critica' ? '🔥' : 
                 notificationData?.tipoLimite === 'min' ? '❄️' : 
                 notificationData?.prioridade === 'alta' ? '⚠️' : '🔔'}
              </Avatar>

              {/* Conteúdo */}
              <Box sx={{ flex: 1 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: 900,
                    color: '#ffffff',
                    textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                    mb: 1,
                    letterSpacing: 0.5
                  }}
                >
                  {notificationData?.maquina_nome || 'Nova Notificação'}
                </Typography>
                
                <Typography 
                  variant="body1"
                  sx={{ 
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.95)',
                    textShadow: '0 1px 5px rgba(0, 0, 0, 0.2)',
                    lineHeight: 1.6
                  }}
                >
                  {notificationData?.mensagem || ''}
                </Typography>
                
                {/* Badge de Prioridade */}
                <Chip
                  label={
                    notificationData?.prioridade === 'critica' ? 'CRÍTICO' :
                    notificationData?.prioridade === 'alta' ? 'ALTO' :
                    notificationData?.prioridade === 'media' ? 'MÉDIO' : 'INFO'
                  }
                  size="small"
                  sx={{
                    mt: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.25)',
                    color: '#ffffff',
                    fontWeight: 800,
                    letterSpacing: 1,
                    fontSize: '0.7rem',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(10px)'
                  }}
                />
              </Box>

              {/* Botão Fechar */}
              <IconButton
                size="small"
                onClick={handleCloseNotification}
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.25)',
                    transform: 'rotate(90deg)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                ✕
              </IconButton>
            </Box>
          </Box>

          {/* Decorative gradient orb */}
          <Box
            sx={{
              position: 'absolute',
              bottom: -30,
              right: -30,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
              filter: 'blur(20px)',
              pointerEvents: 'none',
            }}
          />
        </Box>
      </Snackbar>
    </Box>
  );
}

export default Dashboard;
