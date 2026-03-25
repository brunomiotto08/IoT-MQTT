import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import { io as socketIo } from 'socket.io-client';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import TireRepairIcon from '@mui/icons-material/TireRepair';
import HistoryIcon from '@mui/icons-material/History';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useNavigate } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';

const API_URL = 'http://localhost:3000';

// ─────────────────────────────────────────
// Modal: Gerenciar pneus de um ciclo ativo
// ─────────────────────────────────────────
function DialogGerenciarPneus({ open, onClose, ciclo, session }) {
  const [pneus, setPneus] = useState([]);
  const [novoCodigo, setNovoCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPneus, setLoadingPneus] = useState(false);
  const [erro, setErro] = useState('');

  const fetchPneus = useCallback(async () => {
    if (!ciclo || !session) return;
    setLoadingPneus(true);
    try {
      const r = await axios.get(`${API_URL}/api/ciclos/${ciclo.id}/pneus`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setPneus(r.data);
    } catch {
      setPneus([]);
    } finally {
      setLoadingPneus(false);
    }
  }, [ciclo, session]);

  useEffect(() => {
    if (open) {
      fetchPneus();
      setNovoCodigo('');
      setErro('');
    }
  }, [open, fetchPneus]);

  const handleAdicionar = async () => {
    const codigo = novoCodigo.trim();
    if (!codigo) return;
    if (pneus.length >= 16) {
      setErro('Limite de 16 pneus por ciclo atingido.');
      return;
    }
    setErro('');
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/ciclos/${ciclo.id}/pneus`,
        { codigos: [codigo] },
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      setNovoCodigo('');
      fetchPneus();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao adicionar pneu.');
    } finally {
      setLoading(false);
    }
  };

  const fmtNumero = (n) => n != null ? `Ciclo ${String(n).padStart(3, '0')}` : '—';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TireRepairIcon color="warning" />
          {ciclo ? `${fmtNumero(ciclo.numero_ciclo)} — ${ciclo.maquina_nome}` : 'Pneus do Ciclo'}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {erro && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setErro('')}>{erro}</Alert>}

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          Pneus registrados ({pneus.length}/16)
        </Typography>

        {loadingPneus ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : pneus.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic', mb: 2 }}>
            Nenhum pneu registrado ainda.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
            {pneus.map((p, i) => (
              <Chip
                key={p.id}
                label={`${i + 1}. ${p.codigo_pneu}`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontFamily: 'monospace', fontSize: '0.72rem' }}
              />
            ))}
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          Adicionar pneu
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Código do pneu"
            value={novoCodigo}
            onChange={e => setNovoCodigo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdicionar()}
            inputProps={{ maxLength: 100, style: { fontFamily: 'monospace' } }}
            disabled={pneus.length >= 16}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AddCircleOutlineIcon />}
            onClick={handleAdicionar}
            disabled={loading || !novoCodigo.trim() || pneus.length >= 16}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Adicionar
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────
function Ciclos() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const socketRef = useRef(null);

  // Máquinas
  const [maquinas, setMaquinas] = useState([]);
  const [loadingMaquinas, setLoadingMaquinas] = useState(true);

  // Seção A – Ciclos ativos
  const [ciclosAtivos, setCiclosAtivos] = useState([]);
  const [loadingAtivos, setLoadingAtivos] = useState(false);
  const [cicloGerenciar, setCicloGerenciar] = useState(null);

  // Seção B – Busca por pneu
  const [codigoPneu, setCodigoPneu] = useState('');
  const [resultadoPneu, setResultadoPneu] = useState(null);
  const [loadingPneu, setLoadingPneu] = useState(false);
  const [erroPneu, setErroPneu] = useState('');

  // Seção C – Histórico
  const [maquinaSelecionada, setMaquinaSelecionada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [ciclos, setCiclos] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [erroHistorico, setErroHistorico] = useState('');

  // Detalhe do ciclo selecionado
  const [cicloSelecionado, setCicloSelecionado] = useState(null);
  const [leiturasCiclo, setLeiturasCiclo] = useState([]);
  const [pneusCiclo, setPneusCiclo] = useState([]);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  // ── Auth ─────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate('/login');
    });
  }, [navigate]);

  // ── Empresa ──────────────────────────────
  useEffect(() => {
    if (!session) return;
    supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) setEmpresaId(data.empresa_id);
      });
  }, [session]);

  // ── Máquinas ─────────────────────────────
  useEffect(() => {
    if (!session) return;
    setLoadingMaquinas(true);
    axios
      .get(`${API_URL}/api/maquinas`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      .then(r => setMaquinas(r.data))
      .catch(() => {})
      .finally(() => setLoadingMaquinas(false));
  }, [session]);

  // ── Ciclos ativos ─────────────────────────
  const sessionRef = useRef(null);
  sessionRef.current = session;

  const fetchCiclosAtivos = useCallback(async () => {
    if (!sessionRef.current) return;
    setLoadingAtivos(true);
    try {
      const r = await axios.get(`${API_URL}/api/ciclos/ativos`, {
        headers: { Authorization: `Bearer ${sessionRef.current.access_token}` }
      });
      setCiclosAtivos(r.data);
    } catch {
      setCiclosAtivos([]);
    } finally {
      setLoadingAtivos(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchCiclosAtivos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchCiclosAtivosRef = useRef(fetchCiclosAtivos);
  fetchCiclosAtivosRef.current = fetchCiclosAtivos;

  // ── WebSocket – atualização em tempo real ──
  useEffect(() => {
    if (!empresaId) return;

    const socket = socketIo(API_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_empresa', empresaId);
    });

    socket.on('ciclo_iniciado', () => fetchCiclosAtivosRef.current());
    socket.on('ciclo_encerrado', () => fetchCiclosAtivosRef.current());

    return () => {
      socket.disconnect();
    };
  }, [empresaId]);

  // ── Busca por pneu ────────────────────────
  const handleBuscarPneu = async () => {
    const codigo = codigoPneu.trim();
    if (!codigo || !session) return;
    setLoadingPneu(true);
    setErroPneu('');
    setResultadoPneu(null);
    try {
      const r = await axios.get(`${API_URL}/api/ciclos/buscar-pneu`, {
        params: { codigo },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (r.data.length === 0) {
        setErroPneu(`Nenhum ciclo encontrado para o pneu "${codigo}".`);
      } else {
        setResultadoPneu(r.data);
      }
    } catch {
      setErroPneu('Erro ao buscar pneu.');
    } finally {
      setLoadingPneu(false);
    }
  };

  // ── Histórico de ciclos ───────────────────
  const handleBuscarCiclos = async () => {
    if (!session) return;
    setLoadingHistorico(true);
    setErroHistorico('');
    setCiclos([]);
    setCicloSelecionado(null);
    setLeiturasCiclo([]);
    setPneusCiclo([]);
    try {
      const params = {};
      if (maquinaSelecionada) params.maquina_id = maquinaSelecionada;
      if (dataInicio) params.data_inicio = new Date(dataInicio).toISOString();
      if (dataFim) params.data_fim = new Date(dataFim).toISOString();

      const r = await axios.get(`${API_URL}/api/ciclos`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        params
      });
      setCiclos(r.data);
      if (r.data.length === 0) setErroHistorico('Nenhum ciclo encontrado para os filtros selecionados.');
    } catch (err) {
      setErroHistorico('Erro ao buscar ciclos: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingHistorico(false);
    }
  };

  // ── Detalhe do ciclo ──────────────────────
  const handleSelecionarCiclo = async (ciclo) => {
    if (!session) return;
    setLoadingDetalhe(true);
    setCicloSelecionado(ciclo);
    setLeiturasCiclo([]);
    setPneusCiclo([]);
    try {
      const [leitR, pneuR] = await Promise.all([
        axios.get(`${API_URL}/api/ciclos/${ciclo.id}/leituras`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        }),
        axios.get(`${API_URL}/api/ciclos/${ciclo.id}/pneus`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
      ]);
      setLeiturasCiclo(leitR.data);
      setPneusCiclo(pneuR.data);
    } catch {
      setLeiturasCiclo([]);
      setPneusCiclo([]);
    } finally {
      setLoadingDetalhe(false);
    }
  };

  // ── Helpers de formatação ─────────────────
  const fmt = (str) => str ? new Date(str).toLocaleString('pt-BR') : 'N/A';
  const fmtDur = (min) => {
    if (!min) return 'N/A';
    return `${Math.floor(min / 60)}h ${Math.round(min % 60)}min`;
  };
  const fmtNumero = (n) => n != null ? `Ciclo ${String(n).padStart(3, '0')}` : '—';
  const statusColor = (s) => ({ ativo: 'primary', concluido: 'success', falha: 'error' }[s] || 'default');

  // ── Gráfico ───────────────────────────────
  const chartOptions = {
    chart: {
      type: 'line',
      height: 400,
      background: 'transparent',
      foreColor: '#ffffff',
      fontFamily: '"Poppins", sans-serif',
      zoom: { enabled: true },
      toolbar: { show: true }
    },
    theme: { mode: 'dark' },
    stroke: { curve: 'smooth', width: 3 },
    grid: { show: true, borderColor: 'rgba(30,64,175,0.2)', strokeDashArray: 4 },
    xaxis: {
      type: 'datetime',
      labels: { format: 'HH:mm', style: { colors: '#cbd5e1', fontSize: '12px' } }
    },
    yaxis: [
      {
        title: { text: 'Temperatura (°C)', style: { color: '#f97316', fontSize: '13px', fontWeight: 700 } },
        labels: { style: { colors: '#f97316' } }
      },
      {
        opposite: true,
        title: { text: 'Pressão (bar)', style: { color: '#60a5fa', fontSize: '13px', fontWeight: 700 } },
        labels: { style: { colors: '#60a5fa' } }
      }
    ],
    tooltip: {
      theme: 'dark',
      x: { format: 'dd/MM HH:mm:ss' },
      y: {
        formatter: (v, { seriesIndex }) =>
          seriesIndex === 0 ? `${v?.toFixed(1)}°C` : `${v?.toFixed(2)} bar`
      }
    },
    legend: { position: 'top', labels: { colors: '#fff' }, markers: { width: 10, height: 10, radius: 5 } },
    colors: ['#f97316', '#60a5fa']
  };

  const chartSeries = [
    {
      name: 'Temperatura',
      data: leiturasCiclo.map(l => ({ x: new Date(l.created_at).getTime(), y: l.temperatura || 0 }))
    },
    {
      name: 'Pressão Envelope',
      data: leiturasCiclo.map(l => ({ x: new Date(l.created_at).getTime(), y: l.pressao_envelope || 0 }))
    }
  ];

  // ─────────────────────────────────────────
  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#0f0f0f', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ px: 4, minHeight: '56px !important' }}>
          <IconButton edge="start" size="small" onClick={() => navigate('/')} sx={{ color: '#666', mr: 2, '&:hover': { color: '#aaa' } }}>
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', color: '#e2e2e2', fontFamily: '"Outfit", sans-serif' }}>
            Ciclos de Produção
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>

        {/* ══════════════════════════════════
            SEÇÃO A — Ciclos em Andamento
            (controlados pelo CLP via MQTT)
            ══════════════════════════════════ */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PlayCircleOutlineIcon sx={{ color: '#4ade80' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#e2e2e2' }}>
              Ciclos em Andamento
            </Typography>
            {loadingAtivos && <CircularProgress size={16} sx={{ ml: 1 }} />}
            <Typography variant="caption" sx={{ color: '#555', ml: 1 }}>
              (iniciados automaticamente pelo CLP)
            </Typography>
            <Button size="small" onClick={fetchCiclosAtivos} sx={{ ml: 'auto', color: '#666', fontSize: '0.72rem' }}>
              Atualizar
            </Button>
          </Box>

          {ciclosAtivos.length === 0 && !loadingAtivos ? (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Typography variant="body2" sx={{ color: '#555' }}>
                Nenhum ciclo ativo no momento.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {ciclosAtivos.map(ciclo => (
                <Grid item xs={12} sm={6} md={4} key={ciclo.id}>
                  <Paper sx={{
                    p: 2.5,
                    bgcolor: 'rgba(74,222,128,0.05)',
                    border: '1px solid rgba(74,222,128,0.25)',
                    borderRadius: 2
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#4ade80', fontWeight: 700, display: 'block' }}>
                          {fmtNumero(ciclo.numero_ciclo)}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#e2e2e2', lineHeight: 1.3 }}>
                          {ciclo.maquina_nome}
                        </Typography>
                        {ciclo.maquina_modelo && (
                          <Typography variant="caption" sx={{ color: '#777' }}>{ciclo.maquina_modelo}</Typography>
                        )}
                      </Box>
                      <Chip label="ativo" color="success" size="small" />
                    </Box>

                    <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.07)' }} />

                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                      Início: {fmt(ciclo.start_time)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                      Duração: {fmtDur(ciclo.duracao_minutos)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1.5 }}>
                      Pneus registrados: {ciclo.total_pneus || 0}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<TireRepairIcon />}
                        sx={{ flex: 1, fontSize: '0.72rem' }}
                        onClick={() => setCicloGerenciar(ciclo)}
                      >
                        Pneus
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ flex: 1, fontSize: '0.72rem' }}
                        onClick={() => handleSelecionarCiclo(ciclo)}
                      >
                        Ver Gráfico
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        <Divider sx={{ mb: 4, borderColor: 'rgba(255,255,255,0.08)' }} />

        {/* ══════════════════════════════════
            SEÇÃO B — Busca por Pneu
            ══════════════════════════════════ */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TireRepairIcon sx={{ color: '#f59e0b' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#e2e2e2' }}>
              Rastreabilidade — Buscar por Pneu
            </Typography>
          </Box>

          <Paper sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Código do pneu"
                  placeholder="Ex: PN-2024-0042"
                  value={codigoPneu}
                  onChange={e => setCodigoPneu(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBuscarPneu()}
                  InputProps={{ sx: { fontFamily: 'monospace' } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ height: 56, bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}
                  startIcon={loadingPneu ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                  onClick={handleBuscarPneu}
                  disabled={loadingPneu || !codigoPneu.trim()}
                >
                  {loadingPneu ? 'Buscando...' : 'Buscar Pneu'}
                </Button>
              </Grid>
            </Grid>

            {erroPneu && (
              <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setErroPneu('')}>
                {erroPneu}
              </Alert>
            )}

            {resultadoPneu && resultadoPneu.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#4ade80' }}>
                  {resultadoPneu.length} ciclo(s) encontrado(s) para "{codigoPneu}":
                </Typography>
                <Stack spacing={1}>
                  {resultadoPneu.map(ciclo => (
                    <Paper
                      key={ciclo.id}
                      sx={{
                        p: 2,
                        bgcolor: 'rgba(245,158,11,0.07)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        borderRadius: 2,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(245,158,11,0.12)' }
                      }}
                      onClick={() => handleSelecionarCiclo(ciclo)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                            {fmtNumero(ciclo.numero_ciclo)} — {ciclo.maquina_nome}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            {fmt(ciclo.start_time)} até {fmt(ciclo.end_time)} · {fmtDur(ciclo.duracao_minutos)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={ciclo.status} color={statusColor(ciclo.status)} size="small" />
                          <Button size="small" variant="outlined" sx={{ fontSize: '0.7rem' }}>
                            Ver Gráfico
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}
          </Paper>
        </Box>

        <Divider sx={{ mb: 4, borderColor: 'rgba(255,255,255,0.08)' }} />

        {/* ══════════════════════════════════
            SEÇÃO C — Histórico de Ciclos
            ══════════════════════════════════ */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <HistoryIcon sx={{ color: '#60a5fa' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#e2e2e2' }}>
              Histórico de Ciclos
            </Typography>
          </Box>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Máquina</InputLabel>
                  <Select
                    value={maquinaSelecionada}
                    label="Máquina"
                    onChange={e => setMaquinaSelecionada(e.target.value)}
                    disabled={loadingMaquinas}
                  >
                    <MenuItem value=""><em>Todas as máquinas</em></MenuItem>
                    {maquinas.map(m => (
                      <MenuItem key={m.id} value={m.id}>
                        {m.nome}{m.modelo ? ` (${m.modelo})` : ''}
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
                  onChange={e => setDataInicio(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Data Fim"
                  type="datetime-local"
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<SearchIcon />}
                  onClick={handleBuscarCiclos}
                  disabled={loadingHistorico}
                  sx={{ height: 56 }}
                >
                  {loadingHistorico ? 'Buscando...' : 'Buscar'}
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {erroHistorico && (
            <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setErroHistorico('')}>
              {erroHistorico}
            </Alert>
          )}

          {ciclos.length > 0 && (
            <Paper elevation={3} sx={{ mb: 3 }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">Ciclos Encontrados ({ciclos.length})</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Nº Ciclo</strong></TableCell>
                      <TableCell><strong>Máquina</strong></TableCell>
                      <TableCell><strong>Início</strong></TableCell>
                      <TableCell><strong>Fim</strong></TableCell>
                      <TableCell><strong>Duração</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Pneus</strong></TableCell>
                      <TableCell><strong>Ação</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ciclos.map(ciclo => (
                      <TableRow
                        key={ciclo.id}
                        hover
                        selected={cicloSelecionado?.id === ciclo.id}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa' }}>
                            {fmtNumero(ciclo.numero_ciclo)}
                          </Typography>
                        </TableCell>
                        <TableCell>{ciclo.maquina_nome}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>{fmt(ciclo.start_time)}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>{fmt(ciclo.end_time)}</TableCell>
                        <TableCell>{fmtDur(ciclo.duracao_minutos)}</TableCell>
                        <TableCell>
                          <Chip label={ciclo.status} color={statusColor(ciclo.status)} size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<TireRepairIcon sx={{ fontSize: '14px !important' }} />}
                            label={ciclo.total_pneus || 0}
                            size="small"
                            variant="outlined"
                            color={ciclo.total_pneus > 0 ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.75 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleSelecionarCiclo(ciclo)}
                            >
                              Gráfico
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={() => navigate(`/ciclo/${ciclo.id}`)}
                            >
                              Monitorar
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {loadingHistorico && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </Box>

        {/* ══════════════════════════════════
            Painel de Detalhe do Ciclo
            ══════════════════════════════════ */}
        {cicloSelecionado && (
          <Paper
            elevation={3}
            sx={{
              mt: 4,
              p: 4,
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(30,30,30,0.95) 100%)',
              border: '2px solid rgba(30,64,175,0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', mb: 0.5 }}>
                  {fmtNumero(cicloSelecionado.numero_ciclo)} — {cicloSelecionado.maquina_nome}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  {fmt(cicloSelecionado.start_time)} até {fmt(cicloSelecionado.end_time)}
                  {' · '}Duração: {fmtDur(cicloSelecionado.duracao_minutos)}
                </Typography>
              </Box>
              <Chip label={cicloSelecionado.status} color={statusColor(cicloSelecionado.status)} />
            </Box>

            {loadingDetalhe ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                {/* Lista de pneus */}
                <Grid item xs={12} md={3}>
                  <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <TireRepairIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                        Pneus ({pneusCiclo.length})
                      </Typography>
                    </Box>
                    {pneusCiclo.length === 0 ? (
                      <Typography variant="caption" sx={{ color: '#555', fontStyle: 'italic' }}>
                        Nenhum pneu vinculado a este ciclo.
                      </Typography>
                    ) : (
                      <Stack spacing={0.5}>
                        {pneusCiclo.map((p, i) => (
                          <Chip
                            key={p.id}
                            label={`${i + 1}. ${p.codigo_pneu}`}
                            size="small"
                            variant="outlined"
                            color="warning"
                            sx={{ justifyContent: 'flex-start', fontFamily: 'monospace', fontSize: '0.72rem' }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Grid>

                {/* Gráfico */}
                <Grid item xs={12} md={9}>
                  {leiturasCiclo.length === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                      <Typography variant="body2" sx={{ color: '#444' }}>
                        Nenhuma leitura registrada para este ciclo.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ p: 2, bgcolor: 'rgba(15,15,25,0.5)', borderRadius: 2, border: '1px solid rgba(30,64,175,0.2)' }}>
                      <ReactApexChart
                        options={chartOptions}
                        series={chartSeries}
                        type="line"
                        height={380}
                      />
                    </Box>
                  )}
                </Grid>
              </Grid>
            )}
          </Paper>
        )}
      </Container>

      {/* Modal gerenciar pneus */}
      <DialogGerenciarPneus
        open={!!cicloGerenciar}
        onClose={() => setCicloGerenciar(null)}
        ciclo={cicloGerenciar}
        session={session}
      />
    </Box>
  );
}

export default Ciclos;
