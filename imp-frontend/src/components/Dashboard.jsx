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
                Monitoramento Industrial em Tempo Real
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
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

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 6, px: 6 }}>
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
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}

export default Dashboard;
