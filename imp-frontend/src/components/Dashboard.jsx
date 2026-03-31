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
  Tabs,
  Tab,
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
import TableChartIcon from '@mui/icons-material/TableChart';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { supabase } from '../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';

import DataCard from './DataCard';
import GaugeChart from './GaugeChart';
import LineChart from './LineChart';
import soundManager from '../utils/soundManager';

function SectionLabel({ label }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
      <Typography sx={{
        fontSize: '0.65rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: '#3a3a3a',
        fontFamily: '"Outfit", sans-serif',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: '#1c1c1c' }} />
    </Box>
  );
}

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function Dashboard() {
  const navigate = useNavigate();
  const { maquinaId } = useParams();
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
  
  // Estados para máquinas e filtro
  const [maquinas, setMaquinas] = useState([]);
  const [maquinaSelecionada, setMaquinaSelecionada] = useState(maquinaId || '');
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
        
        // Definir o dado mais recente como liveData para mostrar nos cards
        // Como os dados agora vêm em ordem descendente (mais recentes primeiro),
        // o primeiro elemento é o mais recente
        if (historicalArray.length > 0) {
          const lastData = historicalArray[0]; // Primeiro elemento = mais recente
          setLiveData(lastData);
          console.log('📊 Dado mais recente definido como liveData:', lastData);
        }
        
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Erro ao buscar dados históricos:', error);
        
        // Fallback para o endpoint de teste se houver erro
        try {
          const fallbackResponse = await axios.get(`${API_URL}/api/leituras-test`);
          const fallbackArray = fallbackResponse.data || [];
          setHistoricalData(fallbackArray);
          
          // Definir o dado mais recente como liveData
          if (fallbackArray.length > 0) {
            const lastData = fallbackArray[0]; // Primeiro elemento = mais recente
            setLiveData(lastData);
            console.log('📊 Dado mais recente (fallback) definido como liveData:', lastData);
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
      const historicalArray = response.data || [];
      setHistoricalData(historicalArray);
      
      // Atualizar liveData com o mais recente
      if (historicalArray.length > 0) {
        setLiveData(historicalArray[0]);
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      
      // Fallback para o endpoint de teste
      try {
        const fallbackResponse = await axios.get(`${API_URL}/api/leituras-test`);
        const fallbackArray = fallbackResponse.data || [];
        setHistoricalData(fallbackArray);
        
        // Atualizar liveData com o mais recente
        if (fallbackArray.length > 0) {
          setLiveData(fallbackArray[0]);
        }
        
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
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const lista = response.data || [];
      setMaquinas(lista);
      console.log('✅ Máquinas carregadas:', lista.length);

      // Se veio maquinaId na URL, selecionar; caso contrário, selecionar a primeira
      if (maquinaId && lista.find(m => m.id === maquinaId)) {
        setMaquinaSelecionada(maquinaId);
      } else if (!maquinaSelecionada && lista.length > 0) {
        setMaquinaSelecionada(lista[0].id);
        navigate(`/dashboard/${lista[0].id}`, { replace: true });
      }
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
  
  // Reverter ordem para gráfico (mais antigo ao mais recente)
  const sortedData = [...filteredData].sort((a, b) => 
    new Date(a.created_at) - new Date(b.created_at)
  );
  
  const lineSeries = [{
    name: 'Temperatura',
    data: sortedData.map((d) => ([
      d.created_at ? new Date(d.created_at).getTime() : Date.now(),
      d.temperatura != null ? parseFloat(d.temperatura) : 0
    ]))
  }];
  
  const vibrationSeries = [{
    name: 'Pressão',
    data: sortedData.map((d) => ([
      d.created_at ? new Date(d.created_at).getTime() : Date.now(),
      d.vibracao != null ? parseFloat(d.vibracao) : 0
    ]))
  }];
  
  const productionSeries = [{
    name: 'Peças Produzidas',
    data: sortedData.map((d) => ([
      d.created_at ? new Date(d.created_at).getTime() : Date.now(),
      d.pecas_produzidas != null ? parseInt(d.pecas_produzidas) : 0
    ]))
  }];
  
  const pressureSeries = [
    {
      name: 'Pressão Envelope',
      data: sortedData.map((d) => ([
        d.created_at ? new Date(d.created_at).getTime() : Date.now(),
        d.pressao_envelope != null ? parseFloat(d.pressao_envelope) : 0
      ]))
    },
    {
      name: 'Pressão Saco de Ar',
      data: sortedData.map((d) => ([
        d.created_at ? new Date(d.created_at).getTime() : Date.now(),
        d.pressao_saco_ar != null ? parseFloat(d.pressao_saco_ar) : 0
      ]))
    }
  ];

  const maquinaAtual = maquinas.find(m => m.id === maquinaSelecionada);

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#0f0f0f', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#111', borderBottom: '1px solid #1e1e1e' }}>
        <Toolbar sx={{ px: 4, minHeight: '56px !important', gap: 1 }}>
          {/* Logo / breadcrumb */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: 4 }}>
            <img src="/habilita_logo.svg" alt="Habilita" style={{ height: 28, width: 'auto' }} />
            <Typography sx={{ color: '#2a2a2a', fontSize: '0.875rem' }}>/</Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#888' }}>
              {maquinaAtual?.nome || 'Dashboard'}
            </Typography>
          </Box>

          {/* Nav */}
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 0.5 }}>
            {[
              { label: 'Visão Geral', icon: <DashboardIcon sx={{ fontSize: 15 }} />, onClick: () => navigate('/') },
              { label: 'Status', icon: <MonitorHeartIcon sx={{ fontSize: 15 }} />, onClick: () => navigate('/status-maquina') },
              { label: 'Máquinas', icon: <PrecisionManufacturingIcon sx={{ fontSize: 15 }} />, onClick: () => navigate('/maquinas') },
              { label: 'Ciclos', icon: <HistoryIcon sx={{ fontSize: 15 }} />, onClick: () => navigate('/ciclos') },
              { label: 'Registros', icon: <TableChartIcon sx={{ fontSize: 15 }} />, onClick: () => navigate('/registros') },
              { label: 'Notificações', icon: <NotificationsActiveIcon sx={{ fontSize: 15 }} />, onClick: () => navigate('/notificacoes') },
            ].map(({ label, icon, onClick }) => (
              <Button key={label} variant="text" startIcon={icon} onClick={onClick}
                sx={{ color: '#666', fontWeight: 500, fontSize: '0.8125rem', px: 1.5, py: 0.75, minWidth: 0, borderBottom: '2px solid transparent', borderRadius: 0, '&:hover': { color: '#e2e2e2', background: 'transparent', borderBottomColor: '#3a3a3a' } }}>
                {label}
              </Button>
            ))}
          </Box>

          {/* Direita */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, bgcolor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: connectionStatus === 'connected' ? '#22c55e' : '#444' }} />
              <Typography variant="caption" sx={{ color: connectionStatus === 'connected' ? '#22c55e' : '#555', fontWeight: 600, fontSize: '0.7rem' }}>
                {connectionStatus === 'connected' ? 'Online' : connectionStatus === 'connecting' ? 'Conectando' : 'Offline'}
              </Typography>
            </Box>
            {lastUpdate && (
              <Typography variant="caption" sx={{ color: '#444', fontSize: '0.7rem' }}>
                {lastUpdate.toLocaleTimeString()}
              </Typography>
            )}
            <IconButton size="small" onClick={handleRefresh} disabled={isLoading} sx={{ color: '#555', '&:hover': { color: '#aaa' } }}>
              <RefreshOutlined sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" onClick={() => navigate('/configuracoes')} sx={{ color: '#555', '&:hover': { color: '#aaa' } }}>
              <SettingsIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <Box sx={{ width: 1, height: 24, bgcolor: '#2a2a2a', mx: 0.5 }} />
            <Button size="small" startIcon={<LogoutOutlined sx={{ fontSize: 14 }} />} onClick={handleLogout}
              sx={{ color: '#555', fontSize: '0.75rem', fontWeight: 600, px: 1.5, '&:hover': { color: '#aaa' } }}>
              Sair
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Loading Indicator */}
      {isLoading && <LinearProgress sx={{ height: 3 }} />}

      {/* Tabs de máquinas */}
      {maquinas.length > 0 && (
        <Box sx={{ bgcolor: '#111', borderBottom: '1px solid #1e1e1e', px: 4 }}>
          <Tabs
            value={maquinaSelecionada || false}
            onChange={(_, val) => { setMaquinaSelecionada(val); navigate(`/dashboard/${val}`); }}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{ style: { background: '#3b82f6', height: 2 } }}
            sx={{
              minHeight: 44,
              '& .MuiTab-root': {
                color: '#555',
                fontWeight: 600,
                fontSize: '0.8125rem',
                textTransform: 'none',
                minHeight: 44,
                px: 2,
                '&.Mui-selected': { color: '#e2e2e2' },
                '&:hover': { color: '#aaa' },
              },
            }}
          >
            {maquinas.map((m) => (
              <Tab key={m.id} value={m.id} label={m.nome} />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 3.5, px: { xs: 2, md: 4 } }}>

        {/* ── Seção 1: KPIs ─────────────────────────────────── */}
        <SectionLabel label="Leitura em Tempo Real" />
        <Grid container spacing={2} sx={{ mb: 3.5 }}>
          <Grid item xs={6} sm={3} sx={{ display: 'flex' }}>
            <DataCard
              title="Temperatura"
              value={liveData ? liveData.temperatura?.toFixed(1) : null}
              unit="°C"
              icon={<ThermostatOutlined />}
              threshold={true}
            />
          </Grid>
          <Grid item xs={6} sm={3} sx={{ display: 'flex' }}>
            <DataCard
              title="Pressão"
              value={liveData ? liveData.vibracao?.toFixed(2) : null}
              unit="Pa"
              icon={<SpeedOutlined />}
              threshold={true}
            />
          </Grid>
          <Grid item xs={6} sm={3} sx={{ display: 'flex' }}>
            <DataCard
              title="Status da Máquina"
              value={liveData ? liveData.status : null}
              icon={<CheckCircleOutlined />}
              isStatus={true}
            />
          </Grid>
          <Grid item xs={6} sm={3} sx={{ display: 'flex' }}>
            <DataCard
              title="Peças Produzidas"
              value={liveData ? liveData.pecas_produzidas : null}
              unit="un"
              icon={<ProductionQuantityLimitsOutlined />}
            />
          </Grid>
        </Grid>

        {/* ── Seção 2: Gauge + Temperatura ──────────────────── */}
        <SectionLabel label="Temperatura" />
        <Grid container spacing={2} sx={{ mb: 3.5 }} alignItems="stretch">
          <Grid item xs={12} md={4} lg={3} sx={{ display: 'flex' }}>
            <GaugeChart series={gaugeSeries} />
          </Grid>
          <Grid item xs={12} md={8} lg={9} sx={{ display: 'flex' }}>
            <LineChart series={lineSeries} title="Histórico de Temperatura" unit="°C" color="#3b82f6" />
          </Grid>
        </Grid>

        {/* ── Seção 3: Pressão + Produção (igual) ───────────── */}
        <SectionLabel label="Pressão e Produção" />
        <Grid container spacing={2} sx={{ mb: 3.5 }} alignItems="stretch">
          <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
            <LineChart series={vibrationSeries} title="Pressão" unit="Pa" color="#6366f1" />
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
            <LineChart series={productionSeries} title="Produção Acumulada" unit="un" color="#22c55e" />
          </Grid>
        </Grid>

        {/* ── Seção 4: Pressões envelope e saco de ar ───────── */}
        <SectionLabel label="Pressões — Envelope e Saco de Ar" />
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sx={{ display: 'flex' }}>
            <LineChart series={pressureSeries} title="Pressões — Envelope e Saco de Ar" unit="bar" />
          </Grid>
        </Grid>

      </Container>
      
      {/* Notificação */}
      <Snackbar
        open={notificationOpen}
        autoHideDuration={8000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Box sx={{
          minWidth: 320,
          bgcolor: '#1a1a1a',
          border: '1px solid',
          borderColor: (() => {
            const p = notificationData?.prioridade;
            if (p === 'critica') return 'rgba(239,68,68,0.5)';
            if (p === 'alta') return notificationData?.tipoLimite === 'min' ? 'rgba(59,130,246,0.5)' : 'rgba(245,158,11,0.5)';
            return '#2a2a2a';
          })(),
          borderRadius: '8px',
          p: 2,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
        }}>
          <Box sx={{ width: 3, alignSelf: 'stretch', borderRadius: 1, flexShrink: 0, bgcolor: (() => {
            const p = notificationData?.prioridade;
            if (p === 'critica') return '#ef4444';
            if (p === 'alta') return notificationData?.tipoLimite === 'min' ? '#3b82f6' : '#f59e0b';
            if (p === 'media') return '#f59e0b';
            return '#555';
          })() }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#d0d0d0', mb: 0.25 }}>
              {notificationData?.maquina_nome || 'Alerta'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#888' }}>
              {notificationData?.mensagem}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleCloseNotification} sx={{ color: '#555', '&:hover': { color: '#aaa' }, p: 0.5 }}>
            ✕
          </IconButton>
        </Box>
      </Snackbar>
    </Box>
  );
}

export default Dashboard;
