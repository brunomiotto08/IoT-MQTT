import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import {
  Container,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Card,
  CardContent,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  CircularProgress,
  Alert,
  Paper,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

  // Marcar todas como lidas
  const handleMarcarTodasComoLidas = async () => {
    if (!session) return;
    
    const naoReconhecidas = notificacoes.filter(n => !n.reconhecido);
    
    if (naoReconhecidas.length === 0) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Reconhecer todas as notificações não reconhecidas
      await Promise.all(
        naoReconhecidas.map(notificacao =>
          axios.post(
            `${API_URL}/api/alarmes/${notificacao.id}/reconhecer`,
            {},
            {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            }
          )
        )
      );
      
      // Atualizar lista
      await fetchNotificacoes();
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
      setError('Erro ao marcar todas como lidas: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
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
      case 'baixa':   return <InfoOutlinedIcon sx={{ fontSize: 22 }} />;
      case 'media':   return <WarningAmberIcon sx={{ fontSize: 22 }} />;
      case 'alta':    return <ErrorOutlineIcon sx={{ fontSize: 22 }} />;
      case 'critica': return <ErrorOutlineIcon sx={{ fontSize: 22 }} />;
      default:        return <NotificationsNoneIcon sx={{ fontSize: 22 }} />;
    }
  };

  // Label por prioridade
  const getPrioridadeLabel = (p) =>
    ({ baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' }[p] ?? p ?? '—');

  // Formatar data
  const formatarData = (dataStr) => {
    if (!dataStr) return 'N/A';
    const data = new Date(dataStr);
    return data.toLocaleString('pt-BR');
  };

  // Contar notificações não reconhecidas
  const notificacoesNaoReconhecidas = notificacoes.filter(n => !n.reconhecido).length;

  // Estilo comum dos Select no tema escuro
  const selectSx = {
    fontSize: '0.875rem',
    color: '#d0d0d0',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2a2a2a' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3a3a3a' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
    '& .MuiSvgIcon-root': { color: '#555' },
    bgcolor: '#111',
  };

  const labelSx = {
    color: '#555',
    fontSize: '0.875rem',
    '&.Mui-focused': { color: '#888' },
    '&.MuiFormLabel-filled': { color: '#888' },
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#0f0f0f', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#111', borderBottom: '1px solid #1e1e1e' }}>
        <Toolbar sx={{ px: 4, minHeight: '56px !important' }}>
          <IconButton edge="start" size="small" onClick={() => navigate('/')} sx={{ color: '#666', mr: 1.5, '&:hover': { color: '#aaa' } }}>
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <img src="/habilita_logo.svg" alt="Habilita" style={{ height: 26, width: 'auto', marginRight: 12 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Typography sx={{ color: '#2a2a2a', fontSize: '0.875rem' }}>/</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#e2e2e2', fontFamily: '"Outfit", sans-serif' }}>
              Notificações
            </Typography>
            {notificacoesNaoReconhecidas > 0 && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.125, bgcolor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px' }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444' }}>
                  {notificacoesNaoReconhecidas} pendente{notificacoesNaoReconhecidas > 1 ? 's' : ''}
                </Typography>
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>

        {/* ── Filtros ───────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 3, bgcolor: '#161616', border: '1px solid #222', borderRadius: '10px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterListIcon sx={{ fontSize: 16, color: '#444' }} />
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#3a3a3a', fontFamily: '"Outfit", sans-serif' }}>
                Filtros
              </Typography>
              <Box sx={{ width: 80, height: '1px', bgcolor: '#1e1e1e' }} />
            </Box>

            {notificacoesNaoReconhecidas > 0 && (
              <Button
                size="small"
                startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 15 }} />}
                onClick={handleMarcarTodasComoLidas}
                disabled={loading}
                sx={{
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.3)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  px: 2,
                  '&:hover': { borderColor: '#22c55e', bgcolor: 'rgba(34,197,94,0.05)' },
                }}
              >
                Marcar todas como lidas ({notificacoesNaoReconhecidas})
              </Button>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Máquina */}
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel sx={labelSx}>Máquina</InputLabel>
              <Select value={maquinaSelecionada} label="Máquina" onChange={(e) => setMaquinaSelecionada(e.target.value)} sx={selectSx}>
                <MenuItem value=""><em style={{ color: '#666' }}>Todas as máquinas</em></MenuItem>
                {maquinas.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Prioridade */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel sx={labelSx}>Prioridade</InputLabel>
              <Select value={prioridadeSelecionada} label="Prioridade" onChange={(e) => setPrioridadeSelecionada(e.target.value)} sx={selectSx}>
                <MenuItem value=""><em style={{ color: '#666' }}>Todas</em></MenuItem>
                {[
                  { v: 'baixa',   label: 'Baixa',   color: '#4caf50' },
                  { v: 'media',   label: 'Média',   color: '#ff9800' },
                  { v: 'alta',    label: 'Alta',    color: '#f44336' },
                  { v: 'critica', label: 'Crítica', color: '#d32f2f' },
                ].map(({ v, label, color }) => (
                  <MenuItem key={v} value={v}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                      {label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Status */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel sx={labelSx}>Status</InputLabel>
              <Select value={reconhecidoFiltro} label="Status" onChange={(e) => setReconhecidoFiltro(e.target.value)} sx={selectSx}>
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="nao_reconhecido">Não reconhecidos</MenuItem>
                <MenuItem value="reconhecido">Reconhecidos</MenuItem>
              </Select>
            </FormControl>

            {(maquinaSelecionada || prioridadeSelecionada || reconhecidoFiltro !== 'todos') && (
              <Button size="small"
                onClick={() => { setMaquinaSelecionada(''); setPrioridadeSelecionada(''); setReconhecidoFiltro('todos'); }}
                sx={{ color: '#555', border: '1px solid #222', fontSize: '0.78rem', px: 1.5, '&:hover': { color: '#aaa', borderColor: '#3a3a3a' } }}>
                Limpar
              </Button>
            )}
          </Box>
        </Paper>

        {/* ── Erro ──────────────────────────────────────────────── */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>
        )}

        {/* ── Loading ───────────────────────────────────────────── */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={36} sx={{ color: '#333' }} />
          </Box>
        )}

        {/* ── Vazio ─────────────────────────────────────────────── */}
        {!loading && notificacoes.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <NotificationsNoneIcon sx={{ fontSize: 48, color: '#2a2a2a', mb: 2 }} />
            <Typography sx={{ color: '#444', fontSize: '0.9rem' }}>Nenhuma notificação encontrada</Typography>
          </Box>
        )}

        {/* ── Lista ─────────────────────────────────────────────── */}
        {!loading && notificacoes.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {notificacoes.map((n) => {
              const color = getPrioridadeColor(n.prioridade);
              return (
                <Card key={n.id} elevation={0} sx={{
                  bgcolor: '#161616',
                  border: `1px solid ${n.reconhecido ? '#1a1a1a' : color + '30'}`,
                  borderLeft: `3px solid ${n.reconhecido ? '#2a2a2a' : color}`,
                  borderRadius: '10px',
                  opacity: n.reconhecido ? 0.65 : 1,
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  '&:hover': { borderColor: n.reconhecido ? '#222' : color + '66', boxShadow: `0 4px 20px ${color}12` },
                }}>
                  <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      {/* Ícone */}
                      <Box sx={{
                        width: 40, height: 40, borderRadius: '8px', flexShrink: 0,
                        bgcolor: `${color}14`, border: `1px solid ${color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color,
                      }}>
                        {getPrioridadeIcon(n.prioridade)}
                      </Box>

                      {/* Corpo */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 0.75 }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, color: '#d0d0d0', fontSize: '0.9375rem', lineHeight: 1.3, mb: 0.25, fontFamily: '"Outfit", sans-serif' }}>
                              {n.maquina_nome}
                            </Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: '#444', fontFamily: 'monospace' }}>
                              {formatarData(n.created_at)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.375, bgcolor: `${color}14`, border: `1px solid ${color}35`, borderRadius: '6px', flexShrink: 0 }}>
                            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: color }} />
                            <Typography sx={{ color, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: '"Outfit", sans-serif' }}>
                              {getPrioridadeLabel(n.prioridade)}
                            </Typography>
                          </Box>
                        </Box>

                        <Typography sx={{ color: '#888', fontSize: '0.875rem', lineHeight: 1.55, mb: 1.5 }}>
                          {n.mensagem}
                        </Typography>

                        <Divider sx={{ borderColor: '#1a1a1a', mb: 1.5 }} />

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          {n.reconhecido ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <CheckCircleIcon sx={{ fontSize: 15, color: '#22c55e' }} />
                              <Typography sx={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 600 }}>
                                Reconhecido em {formatarData(n.reconhecido_em)}
                              </Typography>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <WarningAmberIcon sx={{ fontSize: 15, color: '#f59e0b' }} />
                              <Typography sx={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                                Aguardando reconhecimento
                              </Typography>
                            </Box>
                          )}

                          {!n.reconhecido && (
                            <Button
                              size="small"
                              startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 14 }} />}
                              onClick={() => handleReconhecer(n.id)}
                              sx={{
                                color: '#22c55e',
                                border: '1px solid rgba(34,197,94,0.3)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                px: 1.5,
                                '&:hover': { borderColor: '#22c55e', bgcolor: 'rgba(34,197,94,0.06)' },
                              }}
                            >
                              Reconhecer
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default Notificacoes;


