import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io as socketIo } from 'socket.io-client';
import { supabase } from '../supabaseClient';
import {
  Box,
  Container,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Grid,
  Paper,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ThermostatOutlined from '@mui/icons-material/ThermostatOutlined';
import SpeedOutlined from '@mui/icons-material/SpeedOutlined';
import TireRepairIcon from '@mui/icons-material/TireRepair';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import ReactApexChart from 'react-apexcharts';
import { useNavigate, useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const CICLO_DURACAO_MIN = 120;

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({ label, value, unit, icon, color = '#e2e2e2', subtext }) {
  return (
    <Box sx={{
      bgcolor: '#161616',
      border: '1px solid #222',
      borderRadius: 2,
      p: 2.5,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, bgcolor: color, opacity: 0.7 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </Typography>
        <Box sx={{ color: color, opacity: 0.6, '& .MuiSvgIcon-root': { fontSize: 18 } }}>
          {icon}
        </Box>
      </Box>
      <Box sx={{ mt: 1.5 }}>
        {value !== null && value !== undefined ? (
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, color, fontFamily: '"Outfit", sans-serif', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {value}
            </Typography>
            {unit && (
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#555', lineHeight: 1 }}>
                {unit}
              </Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ height: 32, display: 'flex', alignItems: 'center' }}>
            <LinearProgress sx={{ width: '60%', height: 2, borderRadius: 1 }} />
          </Box>
        )}
        {subtext && (
          <Typography sx={{ fontSize: '0.7rem', color: '#555', mt: 0.5 }}>{subtext}</Typography>
        )}
      </Box>
    </Box>
  );
}

// ─── Barra de Progresso ──────────────────────────────────────
function ProgressBar({ elapsedMin, status }) {
  const pct = Math.min((elapsedMin / CICLO_DURACAO_MIN) * 100, 100);
  const barColor = status === 'ativo'
    ? pct > 95 ? '#4ade80' : '#3b82f6'
    : status === 'concluido' ? '#4ade80' : '#ef4444';

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: '#555', fontSize: '0.68rem' }}>
          Progresso ({Math.round(pct)}%)
        </Typography>
        <Typography variant="caption" sx={{ color: '#555', fontSize: '0.68rem' }}>
          Meta: {CICLO_DURACAO_MIN}min
        </Typography>
      </Box>
      <Box sx={{ height: 6, bgcolor: '#1e1e1e', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{
          height: '100%',
          width: `${pct}%`,
          bgcolor: barColor,
          borderRadius: 3,
          transition: 'width 1s linear',
          boxShadow: status === 'ativo' ? `0 0 8px ${barColor}80` : 'none',
        }} />
      </Box>
    </Box>
  );
}

// ─── Componente principal ─────────────────────────────────────
export default function CicloMonitor() {
  const navigate = useNavigate();
  const { id: cicloId } = useParams();
  const socketRef = useRef(null);
  const timerRef = useRef(null);

  const [session, setSession] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dados do ciclo
  const [ciclo, setCiclo] = useState(null);
  const [leituras, setLeituras] = useState([]);
  const [pneus, setPneus] = useState([]);

  // Dados ao vivo (apenas ciclos ativos)
  const [liveData, setLiveData] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  // ── Auth ─────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate('/login');
    });
  }, [navigate]);

  // ── Empresa ──────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => { if (data) setEmpresaId(data.empresa_id); });
  }, [session]);

  const sessionRef = useRef(null);
  sessionRef.current = session;

  // ── Buscar dados do ciclo ─────────────────────────────────────
  const fetchCiclo = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    try {
      const headers = { Authorization: `Bearer ${s.access_token}` };
      const [cicloR, leiturasR, pneusR] = await Promise.all([
        axios.get(`${API_URL}/api/ciclos/${cicloId}`, { headers }),
        axios.get(`${API_URL}/api/ciclos/${cicloId}/leituras`, { headers }),
        axios.get(`${API_URL}/api/ciclos/${cicloId}/pneus`, { headers }),
      ]);

      const cicloData = cicloR.data;
      setCiclo(cicloData);
      setLeituras(leiturasR.data);
      setPneus(pneusR.data);

      if (cicloData.status === 'ativo' && leiturasR.data.length > 0) {
        setLiveData(leiturasR.data[leiturasR.data.length - 1]);
      }
      const startMs = new Date(cicloData.start_time).getTime();
      const endMs = cicloData.end_time ? new Date(cicloData.end_time).getTime() : Date.now();
      setElapsedSec(Math.floor((endMs - startMs) / 1000));
    } catch {
      setError('Erro ao carregar dados do ciclo.');
    } finally {
      setLoading(false);
    }
  }, [cicloId]);

  const fetchCicloRef = useRef(fetchCiclo);
  fetchCicloRef.current = fetchCiclo;

  // Run after session is available, or when cicloId changes
  useEffect(() => {
    if (!session) return;
    fetchCiclo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, fetchCiclo]);

  // ── Timer ao vivo ─────────────────────────────────────────────
  useEffect(() => {
    if (ciclo?.status !== 'ativo') return;
    timerRef.current = setInterval(() => {
      setElapsedSec(s => s + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [ciclo?.status]);

  // ── WebSocket ─────────────────────────────────────────────────
  useEffect(() => {
    if (!empresaId || ciclo?.status !== 'ativo') return;

    const socket = socketIo(API_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('join_empresa', empresaId));

    socket.on('mqtt_message', (msg) => {
      try {
        const p = typeof msg === 'string' ? JSON.parse(msg) : msg;
        if (ciclo && p.maquina_id === ciclo.maquina_id && p.ciclo_id === cicloId) {
          setLiveData(p);
          // Adicionar ao gráfico em tempo real
          setLeituras(prev => {
            const nova = { ...p, created_at: p.timestamp || new Date().toISOString() };
            const updated = [...prev, nova];
            return updated.length > 500 ? updated.slice(-500) : updated;
          });
        }
      } catch {}
    });

    socket.on('ciclo_encerrado', (data) => {
      if (data.ciclo?.id === cicloId) {
        setCiclo(prev => ({ ...prev, status: 'concluido', end_time: data.ciclo.end_time }));
        clearInterval(timerRef.current);
        fetchCicloRef.current();
      }
    });

    return () => socket.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, ciclo?.status, ciclo?.maquina_id, cicloId]);

  // ── Helpers ───────────────────────────────────────────────────
  const fmt = (str) => str ? new Date(str).toLocaleString('pt-BR') : 'N/A';
  const fmtHora = (str) => str ? new Date(str).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  const fmtNumero = (n) => n != null ? `Ciclo ${String(n).padStart(3, '0')}` : '—';

  const fmtElapsed = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const elapsedMin = elapsedSec / 60;

  // Estatísticas do ciclo
  const temps = leituras.map(l => parseFloat(l.temperatura)).filter(v => !isNaN(v));
  const stats = {
    maxTemp: temps.length ? Math.max(...temps).toFixed(1) : null,
    minTemp: temps.length ? Math.min(...temps).toFixed(1) : null,
    avgTemp: temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : null,
  };

  // Dados ao vivo ou última leitura
  const temp = liveData?.temperatura != null ? parseFloat(liveData.temperatura).toFixed(1) : null;
  const pressEnv = liveData?.pressao_envelope != null ? parseFloat(liveData.pressao_envelope).toFixed(2) : null;
  const pressSaco = liveData?.pressao_saco_ar != null ? parseFloat(liveData.pressao_saco_ar).toFixed(2) : null;
  const statusMaquina = liveData?.status || null;

  const statusColor = { ativo: '#4ade80', concluido: '#60a5fa', falha: '#ef4444' }[ciclo?.status] || '#666';

  // ── Gráfico ───────────────────────────────────────────────────
  const leiturasOrdenadas = [...leituras].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const chartOptions = {
    chart: {
      type: 'line',
      background: 'transparent',
      foreColor: '#aaa',
      fontFamily: '"Poppins", sans-serif',
      zoom: { enabled: true },
      toolbar: { show: true, tools: { download: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } },
      animations: { enabled: ciclo?.status === 'ativo', dynamicAnimation: { enabled: true, speed: 800 } },
    },
    theme: { mode: 'dark' },
    stroke: { curve: 'smooth', width: [3, 2, 2] },
    grid: { borderColor: '#1e1e1e', strokeDashArray: 4 },
    xaxis: {
      type: 'datetime',
      labels: {
        format: 'HH:mm',
        style: { colors: '#555', fontSize: '11px' },
        datetimeUTC: false,
      },
    },
    yaxis: [
      {
        title: { text: 'Temperatura (°C)', style: { color: '#f97316', fontWeight: 700 } },
        labels: { style: { colors: '#f97316' }, formatter: v => `${v?.toFixed(0)}°` },
      },
      {
        opposite: true,
        title: { text: 'Pressão (bar)', style: { color: '#60a5fa', fontWeight: 700 } },
        labels: { style: { colors: '#60a5fa' }, formatter: v => `${v?.toFixed(1)}` },
      },
      { show: false },
    ],
    tooltip: {
      theme: 'dark',
      x: { format: 'dd/MM HH:mm:ss' },
      y: { formatter: (v, { seriesIndex }) => seriesIndex === 0 ? `${v?.toFixed(1)}°C` : `${v?.toFixed(2)} bar` },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      labels: { colors: '#888' },
      markers: { width: 10, height: 10, radius: 5 },
    },
    colors: ['#f97316', '#60a5fa', '#a78bfa'],
    markers: { size: 0, hover: { size: 5 } },
  };

  const chartSeries = [
    {
      name: 'Temperatura (°C)',
      data: leiturasOrdenadas.map(l => ({ x: new Date(l.created_at).getTime(), y: parseFloat(l.temperatura) || 0 })),
    },
    {
      name: 'Pressão Envelope (bar)',
      data: leiturasOrdenadas.map(l => ({ x: new Date(l.created_at).getTime(), y: parseFloat(l.pressao_envelope) || 0 })),
    },
    {
      name: 'Pressão Saco de Ar (bar)',
      data: leiturasOrdenadas.map(l => ({ x: new Date(l.created_at).getTime(), y: parseFloat(l.pressao_saco_ar) || 0 })),
    },
  ];

  // ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="error" action={<Button onClick={() => navigate('/ciclos')}>Voltar</Button>}>{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f0f' }}>

      {/* ── AppBar ───────────────────────────────────────────── */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#111', borderBottom: '1px solid #1e1e1e' }}>
        <Toolbar sx={{ px: 4, minHeight: '56px !important', gap: 1 }}>
          <IconButton size="small" onClick={() => navigate('/ciclos')} sx={{ color: '#555', mr: 1, '&:hover': { color: '#aaa' } }}>
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>

          {/* Identidade do ciclo */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#e2e2e2', fontFamily: '"Outfit", sans-serif' }}>
                {fmtNumero(ciclo?.numero_ciclo)}
              </Typography>
              <Typography sx={{ color: '#333', fontSize: '0.9rem' }}>—</Typography>
              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#aaa' }}>
                {ciclo?.maquina_nome || '…'}
              </Typography>
              <Chip
                size="small"
                label={ciclo?.status || '…'}
                sx={{
                  bgcolor: `${statusColor}18`,
                  color: statusColor,
                  border: `1px solid ${statusColor}40`,
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 22,
                }}
              />
              {ciclo?.status === 'ativo' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.25, bgcolor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 1 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4ade80', animation: 'pulse 2s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#4ade80' }}>
                    {fmtElapsed(elapsedSec)}
                  </Typography>
                </Box>
              )}
            </Box>
            {/* Barra de progresso inline */}
            <ProgressBar elapsedMin={elapsedMin} status={ciclo?.status} />
          </Box>

          <IconButton size="small" onClick={fetchCiclo} sx={{ color: '#555', '&:hover': { color: '#aaa' } }}>
            <RefreshIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton size="small" onClick={() => navigate('/ciclos')} sx={{ color: '#555', '&:hover': { color: '#aaa' } }}>
            <HistoryIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3, px: { xs: 2, md: 4 } }}>

        {/* ── KPI Cards ────────────────────────────────────────── */}
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <KpiCard
              label="Temperatura Atual"
              value={temp}
              unit="°C"
              icon={<ThermostatOutlined />}
              color={temp != null ? (parseFloat(temp) >= 100 ? '#ef4444' : parseFloat(temp) >= 90 ? '#f59e0b' : '#f97316') : '#555'}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KpiCard
              label="Pressão Envelope"
              value={pressEnv}
              unit="bar"
              icon={<SpeedOutlined />}
              color="#60a5fa"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KpiCard
              label="Pressão Saco de Ar"
              value={pressSaco}
              unit="bar"
              icon={<SpeedOutlined />}
              color="#a78bfa"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KpiCard
              label="Status da Máquina"
              value={statusMaquina ? (statusMaquina.charAt(0).toUpperCase() + statusMaquina.slice(1)) : (ciclo?.status === 'concluido' ? 'Concluído' : '—')}
              icon={<CheckCircleOutlined />}
              color={statusMaquina ? ({ ativo: '#4ade80', running: '#4ade80', ok: '#4ade80', erro: '#ef4444' }[statusMaquina.toLowerCase()] || '#aaa') : '#555'}
              subtext={liveData ? `Última leitura: ${new Date(liveData.created_at || Date.now()).toLocaleTimeString('pt-BR')}` : undefined}
            />
          </Grid>
        </Grid>

        {/* ── Gráfico principal ─────────────────────────────────── */}
        <Paper sx={{
          mb: 3,
          p: 3,
          bgcolor: '#161616',
          border: '1px solid #222',
          borderRadius: 2,
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography sx={{ fontWeight: 700, color: '#d0d0d0', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Telemetria do Ciclo
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {ciclo?.status === 'ativo' && (
                <Chip size="small" label="Ao vivo" sx={{ bgcolor: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', fontSize: '0.68rem', height: 20 }} />
              )}
              <Typography variant="caption" sx={{ color: '#444' }}>{leituras.length} leituras</Typography>
            </Box>
          </Box>

          {leituras.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <Typography variant="body2" sx={{ color: '#444' }}>
                {ciclo?.status === 'ativo' ? 'Aguardando leituras do CLP...' : 'Nenhuma leitura registrada para este ciclo.'}
              </Typography>
            </Box>
          ) : (
            <ReactApexChart
              options={chartOptions}
              series={chartSeries}
              type="line"
              height={360}
            />
          )}
        </Paper>

        {/* ── Pneus + Resumo ────────────────────────────────────── */}
        <Grid container spacing={2}>

          {/* Pneus */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, bgcolor: '#161616', border: '1px solid #222', borderRadius: 2, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TireRepairIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 700, color: '#d0d0d0', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Pneus Registrados
                  </Typography>
                  <Chip
                    label={`${pneus.length}/16`}
                    size="small"
                    sx={{ bgcolor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.68rem', height: 20 }}
                  />
                </Box>
                {ciclo?.status === 'ativo' && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={() => navigate('/ciclos')}
                    sx={{ fontSize: '0.72rem' }}
                  >
                    Gerenciar Pneus
                  </Button>
                )}
              </Box>

              {pneus.length === 0 ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#444', fontStyle: 'italic' }}>
                    Nenhum pneu vinculado a este ciclo.
                  </Typography>
                  {ciclo?.status === 'ativo' && (
                    <Typography variant="caption" sx={{ color: '#333', display: 'block', mt: 0.5 }}>
                      Acesse "Ciclos" para registrar pneus.
                    </Typography>
                  )}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {pneus.map((p, i) => (
                    <Chip
                      key={p.id}
                      label={`${i + 1}. ${p.codigo_pneu}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.72rem',
                        borderColor: 'rgba(245,158,11,0.35)',
                        color: '#d4a017',
                        bgcolor: 'rgba(245,158,11,0.05)',
                      }}
                    />
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Resumo */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, bgcolor: '#161616', border: '1px solid #222', borderRadius: 2, height: '100%' }}>
              <Typography sx={{ fontWeight: 700, color: '#d0d0d0', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 2 }}>
                Resumo do Ciclo
              </Typography>
              <Stack spacing={1.5}>
                <SummaryRow label="Nº do Ciclo" value={fmtNumero(ciclo?.numero_ciclo)} mono />
                <SummaryRow label="Máquina" value={ciclo?.maquina_nome} />
                <SummaryRow label="Status" value={ciclo?.status} valueColor={statusColor} />
                <Divider sx={{ borderColor: '#1e1e1e' }} />
                <SummaryRow label="Início" value={fmtHora(ciclo?.start_time)} sub={ciclo?.start_time ? new Date(ciclo.start_time).toLocaleDateString('pt-BR') : undefined} />
                <SummaryRow
                  label="Fim"
                  value={ciclo?.end_time ? fmtHora(ciclo.end_time) : (ciclo?.status === 'ativo' ? 'Em andamento…' : 'N/A')}
                  valueColor={ciclo?.status === 'ativo' ? '#4ade80' : undefined}
                />
                <SummaryRow label="Duração" value={fmtElapsed(elapsedSec)} mono />
                <Divider sx={{ borderColor: '#1e1e1e' }} />
                <SummaryRow label="Temp. Máxima" value={stats.maxTemp ? `${stats.maxTemp}°C` : '—'} valueColor="#ef4444" />
                <SummaryRow label="Temp. Mínima" value={stats.minTemp ? `${stats.minTemp}°C` : '—'} valueColor="#60a5fa" />
                <SummaryRow label="Temp. Média" value={stats.avgTemp ? `${stats.avgTemp}°C` : '—'} valueColor="#f59e0b" />
                <SummaryRow label="Total de Leituras" value={leituras.length} />
              </Stack>
            </Paper>
          </Grid>

        </Grid>
      </Container>
    </Box>
  );
}

// ─── Helper: linha do resumo ────────────────────────────────
function SummaryRow({ label, value, valueColor, mono, sub }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
      <Typography variant="caption" sx={{ color: '#555', fontWeight: 600, flexShrink: 0, mt: '1px' }}>
        {label}
      </Typography>
      <Box sx={{ textAlign: 'right' }}>
        <Typography variant="body2" sx={{
          color: valueColor || '#aaa',
          fontWeight: 700,
          fontFamily: mono ? 'monospace' : undefined,
          fontSize: mono ? '0.82rem' : '0.825rem',
        }}>
          {value ?? '—'}
        </Typography>
        {sub && <Typography variant="caption" sx={{ color: '#444', fontSize: '0.65rem', display: 'block' }}>{sub}</Typography>}
      </Box>
    </Box>
  );
}
