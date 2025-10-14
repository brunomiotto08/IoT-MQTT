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
  LinearProgress
} from '@mui/material';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import RefreshOutlined from '@mui/icons-material/RefreshOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import SpeedOutlined from '@mui/icons-material/SpeedOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ProductionQuantityLimitsOutlined from '@mui/icons-material/ProductionQuantityLimitsOutlined';
import ThermostatOutlined from '@mui/icons-material/ThermostatOutlined';
import { supabase } from '../supabaseClient';

import DataCard from './DataCard';
import GaugeChart from './GaugeChart';
import LineChart from './LineChart';

const socket = io('http://localhost:3000');
const API_URL = 'http://localhost:3000';

function Dashboard() {
  const [liveData, setLiveData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Sessão obtida:', session);
      setSession(session);
    };
    getSession();
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        console.log('Buscando dados históricos...');
        setIsLoading(true);
        const response = await axios.get(`${API_URL}/api/leituras-test`);
        console.log('Dados históricos recebidos:', response.data);
        setHistoricalData(response.data || []);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Erro ao buscar dados históricos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();

    // Socket connection status
    socket.on('connect', () => {
      console.log('Socket conectado');
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
      console.log('Confirmação de conexão recebida:', data);
      setConnectionStatus('connected');
    });

    // Verificar status inicial da conexão
    if (socket.connected) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('connecting');
      // Timeout para verificar se conecta
      const timeout = setTimeout(() => {
        if (!socket.connected) {
          console.log('Socket não conectou em 5 segundos');
          setConnectionStatus('disconnected');
        }
      }, 5000);
      
      return () => {
        clearTimeout(timeout);
      };
    }

    socket.on('mqtt_message', (message) => {
      const parsed = JSON.parse(message);
      parsed.created_at = new Date().toISOString();
      setLiveData(parsed);
      setLastUpdate(new Date());

      setHistoricalData((current) => {
        const updated = [...current, parsed];
        return updated.length > 50 ? updated.slice(1) : updated;
      });
    });

    return () => {
      socket.off('mqtt_message');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/leituras-test`);
      setHistoricalData(response.data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
    data: historicalData.map((d) => ([
      d.created_at ? new Date(d.created_at).getTime() : Date.now(),
      d.temperatura != null ? parseFloat(d.temperatura) : 0
    ]))
  }];

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: 'background.default', minHeight: '100vh' }}>
      {/* Modern Header */}
      <AppBar position="static" elevation={0} sx={{ backgroundColor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 4, width: 52, height: 52 }}>
              <ThermostatOutlined sx={{ fontSize: 30 }} />
            </Avatar>
            <Box sx={{ ml: 1 }}>
              <Typography variant="h5" component="div" sx={{ fontWeight: 600, fontSize: '1.5rem' }}>
                Dashboard I.M.P.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>
                Monitoramento Industrial em Tempo Real
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Chip 
              label={connectionStatus === 'connected' ? 'Conectado' : 
                     connectionStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
              color={getConnectionColor()}
              size="small"
              variant="outlined"
            />
            
            {lastUpdate && (
              <Typography variant="caption" color="text.secondary">
                Última atualização: {lastUpdate.toLocaleTimeString()}
              </Typography>
            )}
            
            <IconButton 
              onClick={handleRefresh} 
              disabled={isLoading} 
              color="primary"
              sx={{ 
                width: 52, 
                height: 52,
                mr: 2
              }}
            >
              <RefreshOutlined sx={{ fontSize: 26 }} />
            </IconButton>
            
            <Button 
              variant="outlined" 
              startIcon={<LogoutOutlined />}
              onClick={handleLogout}
              size="medium"
              sx={{ 
                ml: 2,
                px: 4,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Sair
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Loading Indicator */}
      {isLoading && <LinearProgress />}

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 4, px: 3 }}>
        <Box>
          {/* Status Overview Cards */}
          <Grid container spacing={4} sx={{ mb: 5 }}>
            <Grid item xs={12} sm={6} md={3}>
              <DataCard 
                title="Temperatura" 
                value={liveData ? liveData.temperatura?.toFixed(1) : null} 
                unit="°C"
                icon={<ThermostatOutlined />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DataCard 
                title="Vibração" 
                value={liveData ? liveData.vibracao?.toFixed(2) : null} 
                unit="mm/s"
                icon={<SpeedOutlined />}
                color="secondary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DataCard 
                title="Status" 
                value={liveData ? liveData.status : null} 
                unit=""
                icon={<CheckCircleOutlined />}
                color={getStatusColor(liveData?.status)}
                isStatus={true}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
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
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <GaugeChart series={gaugeSeries} />
            </Grid>
            <Grid item xs={12} md={8}>
              <LineChart series={lineSeries} />
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}

export default Dashboard;
