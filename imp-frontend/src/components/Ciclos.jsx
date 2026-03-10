import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import {
  Container,
  Box,
  Typography,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';

const API_URL = 'http://localhost:3000';

function Ciclos() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [maquinas, setMaquinas] = useState([]);
  const [maquinaSelecionada, setMaquinaSelecionada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [ciclos, setCiclos] = useState([]);
  const [cicloSelecionado, setCicloSelecionado] = useState(null);
  const [leiturasCiclo, setLeiturasCiclo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMaquinas, setLoadingMaquinas] = useState(true);
  const [error, setError] = useState('');

  // Buscar sessão ao montar
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) {
        navigate('/login');
      }
    };
    getSession();
  }, [navigate]);

  // Buscar máquinas ao carregar
  useEffect(() => {
    const fetchMaquinas = async () => {
      if (!session) return;

      try {
        setLoadingMaquinas(true);
        const response = await axios.get(`${API_URL}/api/maquinas`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        setMaquinas(response.data);
      } catch (err) {
        console.error('Erro ao buscar máquinas:', err);
        setError('Erro ao carregar máquinas');
      } finally {
        setLoadingMaquinas(false);
      }
    };

    fetchMaquinas();
  }, [session]);

  // Buscar ciclos
  const handleBuscarCiclos = async () => {
    if (!session) return;

    try {
      setLoading(true);
      setError('');
      setCiclos([]);
      setCicloSelecionado(null);
      setLeiturasCiclo([]);

      const params = {};
      if (maquinaSelecionada) params.maquina_id = maquinaSelecionada;
      if (dataInicio) params.data_inicio = new Date(dataInicio).toISOString();
      if (dataFim) params.data_fim = new Date(dataFim).toISOString();

      const response = await axios.get(`${API_URL}/api/ciclos`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        params
      });

      setCiclos(response.data);
      if (response.data.length === 0) {
        setError('Nenhum ciclo encontrado para os filtros selecionados');
      }
    } catch (err) {
      console.error('Erro ao buscar ciclos:', err);
      setError('Erro ao buscar ciclos: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Selecionar um ciclo e buscar suas leituras
  const handleSelecionarCiclo = async (ciclo) => {
    if (!session) return;

    try {
      setLoading(true);
      setError('');
      setCicloSelecionado(ciclo);

      const response = await axios.get(`${API_URL}/api/ciclos/${ciclo.id}/leituras`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      setLeiturasCiclo(response.data);
      if (response.data.length === 0) {
        setError('Nenhuma leitura encontrada para este ciclo');
      }
    } catch (err) {
      console.error('Erro ao buscar leituras do ciclo:', err);
      setError('Erro ao buscar leituras: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Formatar duração em minutos para horas e minutos
  const formatarDuracao = (minutos) => {
    if (!minutos) return 'N/A';
    const horas = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    return `${horas}h ${mins}min`;
  };

  // Formatar data
  const formatarData = (dataStr) => {
    if (!dataStr) return 'N/A';
    const data = new Date(dataStr);
    return data.toLocaleString('pt-BR');
  };

  // Status chip color
  const getStatusColor = (status) => {
    switch (status) {
      case 'ativo':
        return 'primary';
      case 'concluido':
        return 'success';
      case 'falha':
        return 'error';
      default:
        return 'default';
    }
  };

  // Preparar dados para o gráfico
  const chartOptions = {
    chart: {
      type: 'line',
      height: 450,
      background: 'transparent',
      foreColor: '#ffffff',
      fontFamily: '"Poppins", sans-serif',
      zoom: {
        enabled: true
      },
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      }
    },
    theme: {
      mode: 'dark'
    },
    stroke: {
      curve: 'smooth',
      width: 4
    },
    grid: {
      show: true,
      borderColor: 'rgba(30, 64, 175, 0.2)',
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        format: 'HH:mm:ss',
        style: {
          colors: '#cbd5e1',
          fontSize: '13px',
          fontWeight: 600
        }
      },
      axisBorder: {
        show: true,
        color: 'rgba(30, 64, 175, 0.3)'
      },
      axisTicks: {
        show: true,
        color: 'rgba(30, 64, 175, 0.3)'
      }
    },
    yaxis: [
      {
        title: {
          text: 'Temperatura (°C)',
          style: {
            color: '#f97316',
            fontSize: '14px',
            fontWeight: 700
          }
        },
        labels: {
          style: {
            colors: '#f97316',
            fontSize: '13px',
            fontWeight: 600
          }
        },
        seriesName: 'Temperatura'
      },
      {
        opposite: true,
        title: {
          text: 'Pressão (Pa)',
          style: {
            color: '#1e40af',
            fontSize: '14px',
            fontWeight: 700
          }
        },
        labels: {
          style: {
            colors: '#1e40af',
            fontSize: '13px',
            fontWeight: 600
          }
        },
        seriesName: 'Pressão'
      }
    ],
    tooltip: {
      theme: 'dark',
      x: {
        format: 'dd/MM HH:mm:ss'
      },
      y: {
        formatter: (value, { seriesIndex }) => {
          if (seriesIndex === 0) {
            return `${value.toFixed(1)}°C`;
          }
          return `${value.toFixed(2)} mm/s`;
        }
      },
      style: {
        fontSize: '13px'
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      fontSize: '14px',
      fontWeight: 700,
      labels: {
        colors: '#ffffff'
      },
      markers: {
        width: 12,
        height: 12,
        radius: 6
      }
    },
    markers: {
      size: 0,
      hover: {
        size: 7
      }
    },
    colors: ['#f97316', '#1e40af']
  };

  const chartSeries = [
    {
      name: 'Temperatura',
      data: leiturasCiclo.map(l => ({
        x: new Date(l.created_at).getTime(),
        y: l.temperatura || 0
      }))
    },
    {
      name: 'Pressão',
      data: leiturasCiclo.map(l => ({
        x: new Date(l.created_at).getTime(),
        y: l.vibracao || 0
      }))
    }
  ];

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ 
        background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.98) 0%, rgba(30, 30, 30, 0.98) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '2px solid',
        borderColor: 'rgba(80, 80, 80, 0.3)'
      }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <HistoryIcon sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 900 }}>
            Ciclos
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Filtros */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filtros de Pesquisa
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Máquina</InputLabel>
                <Select
                  value={maquinaSelecionada}
                  label="Máquina"
                  onChange={(e) => setMaquinaSelecionada(e.target.value)}
                  disabled={loadingMaquinas}
                >
                  <MenuItem value="">
                    <em>Todas as máquinas</em>
                  </MenuItem>
                  {maquinas.map((maquina) => (
                    <MenuItem key={maquina.id} value={maquina.id}>
                      {maquina.nome} {maquina.modelo && `(${maquina.modelo})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Data Início"
                type="datetime-local"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Data Fim"
                type="datetime-local"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<SearchIcon />}
                onClick={handleBuscarCiclos}
                disabled={loading}
                sx={{ height: 56 }}
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Mensagem de erro */}
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Tabela de Ciclos */}
        {ciclos.length > 0 && (
          <Paper elevation={3} sx={{ mb: 3 }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">
                Ciclos Encontrados ({ciclos.length})
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Máquina</strong></TableCell>
                    <TableCell><strong>Início</strong></TableCell>
                    <TableCell><strong>Fim</strong></TableCell>
                    <TableCell><strong>Duração</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Produção</strong></TableCell>
                    <TableCell><strong>Ação</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ciclos.map((ciclo) => (
                    <TableRow 
                      key={ciclo.id}
                      hover
                      selected={cicloSelecionado?.id === ciclo.id}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{ciclo.maquina_nome}</TableCell>
                      <TableCell>{formatarData(ciclo.start_time)}</TableCell>
                      <TableCell>{formatarData(ciclo.end_time)}</TableCell>
                      <TableCell>{formatarDuracao(ciclo.duracao_minutos)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={ciclo.status} 
                          color={getStatusColor(ciclo.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{ciclo.contagem_producao} peças</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleSelecionarCiclo(ciclo)}
                        >
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Gráfico */}
        {cicloSelecionado && leiturasCiclo.length > 0 && (
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)',
              border: '2px solid rgba(30, 64, 175, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 800, 
                    mb: 1,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  📊 Dados do Ciclo: {cicloSelecionado.maquina_nome}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#94a3b8',
                    fontSize: '0.95rem',
                    fontWeight: 500
                  }}
                >
                  🕐 {formatarData(cicloSelecionado.start_time)} até {formatarData(cicloSelecionado.end_time)}
                </Typography>
              </Box>
            </Box>
            <Box 
              sx={{ 
                mt: 3,
                p: 3,
                borderRadius: 2,
                background: 'rgba(15, 15, 25, 0.5)',
                border: '1px solid rgba(30, 64, 175, 0.2)'
              }}
            >
              <ReactApexChart
                options={chartOptions}
                series={chartSeries}
                type="line"
                height={450}
              />
            </Box>
          </Paper>
        )}

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default Ciclos;

