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
  Card,
  CardContent,
  CardActions,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000';

function Notificacoes() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [maquinas, setMaquinas] = useState([]);
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filtros
  const [maquinaSelecionada, setMaquinaSelecionada] = useState('');
  const [prioridadeSelecionada, setPrioridadeSelecionada] = useState('');
  const [reconhecidoFiltro, setReconhecidoFiltro] = useState('todos');

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

  // Buscar máquinas e notificações ao carregar
  useEffect(() => {
    if (session) {
      fetchMaquinas();
      fetchNotificacoes();
    }
  }, [session]);

  // Buscar máquinas
  const fetchMaquinas = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/maquinas`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      setMaquinas(response.data);
    } catch (err) {
      console.error('Erro ao buscar máquinas:', err);
    }
  };

  // Buscar notificações (endpoint ainda usa /alarmes no backend)
  const fetchNotificacoes = async () => {
    if (!session) return;

    try {
      setLoading(true);
      setError('');

      const params = {};
      if (maquinaSelecionada) params.maquina_id = maquinaSelecionada;
      if (prioridadeSelecionada) params.prioridade = prioridadeSelecionada;
      if (reconhecidoFiltro !== 'todos') {
        params.reconhecido = reconhecidoFiltro === 'reconhecido';
      }

      const response = await axios.get(`${API_URL}/api/alarmes`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        params
      });

      setNotificacoes(response.data);
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
      setError('Erro ao carregar notificações: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Reconhecer notificação
  const handleReconhecer = async (notificacaoId) => {
    if (!session) return;

    try {
      await axios.post(
        `${API_URL}/api/alarmes/${notificacaoId}/reconhecer`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      // Atualizar lista de notificações
      fetchNotificacoes();
    } catch (err) {
      console.error('Erro ao reconhecer notificação:', err);
      setError('Erro ao reconhecer notificação: ' + (err.response?.data?.error || err.message));
    }
  };

  // Atualizar notificações quando filtros mudarem
  useEffect(() => {
    if (session) {
      fetchNotificacoes();
    }
  }, [maquinaSelecionada, prioridadeSelecionada, reconhecidoFiltro, session]);

  // Cores por prioridade
  const getPrioridadeColor = (prioridade) => {
    switch (prioridade) {
      case 'baixa':
        return '#4caf50';
      case 'media':
        return '#ff9800';
      case 'alta':
        return '#f44336';
      case 'critica':
        return '#d32f2f';
      default:
        return '#757575';
    }
  };

  // Ícone por prioridade
  const getPrioridadeIcon = (prioridade) => {
    switch (prioridade) {
      case 'baixa':
        return <InfoIcon />;
      case 'media':
        return <WarningIcon />;
      case 'alta':
        return <ErrorIcon />;
      case 'critica':
        return <ErrorIcon />;
      default:
        return <NotificationsActiveIcon />;
    }
  };

  // Formatar data
  const formatarData = (dataStr) => {
    if (!dataStr) return 'N/A';
    const data = new Date(dataStr);
    return data.toLocaleString('pt-BR');
  };

  // Contar notificações não reconhecidas
  const notificacoesNaoReconhecidas = notificacoes.filter(n => !n.reconhecido).length;

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
          <Badge badgeContent={notificacoesNaoReconhecidas} color="error" sx={{ mr: 2 }}>
            <NotificationsActiveIcon sx={{ fontSize: 32 }} />
          </Badge>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 900 }}>
            Gerenciamento de Notificações
          </Typography>
          {notificacoesNaoReconhecidas > 0 && (
            <Chip 
              label={`${notificacoesNaoReconhecidas} não reconhecida${notificacoesNaoReconhecidas > 1 ? 's' : ''}`}
              color="error"
              variant="filled"
            />
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Filtros */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filtros
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Máquina</InputLabel>
                <Select
                  value={maquinaSelecionada}
                  label="Máquina"
                  onChange={(e) => setMaquinaSelecionada(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Todas as máquinas</em>
                  </MenuItem>
                  {maquinas.map((maquina) => (
                    <MenuItem key={maquina.id} value={maquina.id}>
                      {maquina.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  value={prioridadeSelecionada}
                  label="Prioridade"
                  onChange={(e) => setPrioridadeSelecionada(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Todas as prioridades</em>
                  </MenuItem>
                  <MenuItem value="baixa">Baixa</MenuItem>
                  <MenuItem value="media">Média</MenuItem>
                  <MenuItem value="alta">Alta</MenuItem>
                  <MenuItem value="critica">Crítica</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={reconhecidoFiltro}
                  label="Status"
                  onChange={(e) => setReconhecidoFiltro(e.target.value)}
                >
                  <MenuItem value="todos">Todos</MenuItem>
                  <MenuItem value="nao_reconhecido">Não reconhecidos</MenuItem>
                  <MenuItem value="reconhecido">Reconhecidos</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Mensagem de erro */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Lista de Notificações */}
        {!loading && notificacoes.length === 0 && (
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Nenhuma notificação encontrada
            </Typography>
          </Paper>
        )}

        {!loading && notificacoes.length > 0 && (
          <Grid container spacing={2}>
            {notificacoes.map((notificacao) => (
              <Grid item xs={12} md={6} key={notificacao.id}>
                <Card 
                  elevation={3}
                  sx={{
                    borderLeft: 6,
                    borderColor: getPrioridadeColor(notificacao.prioridade),
                    opacity: notificacao.reconhecido ? 0.7 : 1
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ 
                        color: getPrioridadeColor(notificacao.prioridade),
                        mr: 2 
                      }}>
                        {getPrioridadeIcon(notificacao.prioridade)}
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="div">
                          {notificacao.maquina_nome}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatarData(notificacao.created_at)}
                        </Typography>
                      </Box>
                      <Chip
                        label={notificacao.prioridade}
                        size="small"
                        sx={{
                          backgroundColor: getPrioridadeColor(notificacao.prioridade),
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>

                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {notificacao.mensagem}
                    </Typography>

                    {notificacao.reconhecido && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                        <CheckCircleIcon sx={{ fontSize: 16, mr: 1, color: 'success.main' }} />
                        <Typography variant="caption" color="success.main">
                          Reconhecido em {formatarData(notificacao.reconhecido_em)}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>

                  <CardActions>
                    {!notificacao.reconhecido && (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleReconhecer(notificacao.id)}
                      >
                        Reconhecer
                      </Button>
                    )}
                    {notificacao.reconhecido && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Reconhecido"
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}

export default Notificacoes;


