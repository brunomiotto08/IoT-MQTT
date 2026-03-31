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
  Paper,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Button,
  Divider,
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
      borderRadius: '10px',
      px: 3.5,
      py: 3,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top accent bar */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: color, opacity: 0.8 }} />

      {/* Label + icon row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography sx={{
          fontSize: '0.7rem',
          fontWeight: 700,
          color: '#4a4a4a',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontFamily: '"Outfit", sans-serif',
        }}>
          {label}
        </Typography>
        <Box sx={{ color: color, opacity: 0.55, '& .MuiSvgIcon-root': { fontSize: 20 } }}>
          {icon}
        </Box>
      </Box>

      {/* Value */}
      <Box sx={{ mt: 2.5 }}>
        {value !== null && value !== undefined ? (
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
            <Typography sx={{
              fontSize: '2.75rem',
              fontWeight: 700,
              color,
              fontFamily: '"Outfit", sans-serif',
              lineHeight: 1,
              letterSpacing: '-0.03em',
            }}>
              {value}
            </Typography>
            {unit && (
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#3a3a3a', lineHeight: 1, mb: '4px' }}>
                {unit}
              </Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ height: 44, display: 'flex', alignItems: 'center' }}>
            <LinearProgress sx={{ width: '55%', height: 2, borderRadius: 1 }} />
          </Box>
        )}
        {subtext && (
          <Typography sx={{ fontSize: '0.7rem', color: '#3a3a3a', mt: 0.75 }}>{subtext}</Typography>
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

  const [ciclo, setCiclo] = useState(null);
  const [leituras, setLeituras] = useState([]);
  const [pneus, setPneus] = useState([]);
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

  const temps = leituras.map(l => parseFloat(l.temperatura)).filter(v => !isNaN(v));
  const stats = {
    maxTemp: temps.length ? Math.max(...temps).toFixed(1) : null,
    minTemp: temps.length ? Math.min(...temps).toFixed(1) : null,
    avgTemp: temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : null,
  };

  const temp = liveData?.temperatura != null ? parseFloat(liveData.temperatura).toFixed(1) : null;
  const pressEnv = liveData?.pressao_envelope != null ? parseFloat(liveData.pressao_envelope).toFixed(2) : null;
  const pressSaco = liveData?.pressao_saco_ar != null ? parseFloat(liveData.pressao_saco_ar).toFixed(2) : null;
  const statusMaquina = liveData?.status || null;

  const statusColor = { ativo: '#4ade80', concluido: '#60a5fa', falha: '#ef4444' }[ciclo?.status] || '#666';

  // ── Gráfico ───────────────────────────────────────────────────
  const leiturasOrdenadas = [...leituras].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const chartOptions = {
    chart: {
      type: 'area',
      background: 'transparent',
      foreColor: '#555',
      fontFamily: '"Outfit", sans-serif',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: ciclo?.status === 'ativo',
        dynamicAnimation: { enabled: true, speed: 800 },
      },
      dropShadow: { enabled: false },
    },
    theme: { mode: 'dark' },
    stroke: { curve: 'smooth', width: [3, 2, 2] },
    grid: {
      borderColor: '#1c1c1c',
      strokeDashArray: 5,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { top: 8, right: 8, bottom: 4, left: 8 },
    },
    xaxis: {
      type: 'datetime',
      labels: {
        format: 'HH:mm',
        style: { colors: '#3a3a3a', fontSize: '11px', fontWeight: 500 },
        datetimeUTC: false,
        offsetY: 2,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: [
      {
        labels: {
          style: { colors: '#f97316', fontSize: '11px' },
          formatter: v => v != null ? `${v.toFixed(0)}°` : '',
        },
      },
      {
        opposite: true,
        labels: {
          style: { colors: '#60a5fa', fontSize: '11px' },
          formatter: v => v != null ? v.toFixed(1) : '',
        },
      },
      { show: false },
    ],
    tooltip: {
      theme: 'dark',
      x: { format: 'HH:mm:ss' },
      style: { fontSize: '12px', fontFamily: '"Outfit", sans-serif' },
      custom({ series: s, seriesIndex, dataPointIndex, w }) {
        const v = s[seriesIndex][dataPointIndex];
        const ts = new Date(w.globals.seriesX[seriesIndex][dataPointIndex]);
        const colors = ['#f97316', '#60a5fa', '#a78bfa'];
        const c = colors[seriesIndex] || colors[0];
        const name = w.config.series[seriesIndex]?.name || '';
        const formatted = seriesIndex === 0 ? `${v?.toFixed(1)}°C` : `${v?.toFixed(2)} bar`;
        return `<div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:10px 14px;min-width:150px;">
          <div style="color:${c};font-size:11px;font-weight:600;margin-bottom:4px;">${name}</div>
          <div style="color:${c};font-size:17px;font-weight:700;">${formatted}</div>
          <div style="color:#444;font-size:11px;margin-top:4px;">${ts.toLocaleTimeString('pt-BR')}</div>
        </div>`;
      },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'left',
      fontSize: '12px',
      fontWeight: 600,
      labels: { colors: '#666' },
      markers: { width: 8, height: 8, radius: 4 },
      itemMargin: { horizontal: 12 },
    },
    colors: ['#f97316', '#60a5fa', '#a78bfa'],
    markers: { size: 0, hover: { size: 5 } },
    fill: {
      type: ['gradient', 'gradient', 'gradient'],
      gradient: {
        shade: 'dark',
        type: 'vertical',
        opacityFrom: 0.12,
        opacityTo: 0,
        stops: [0, 100],
      },
    },
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

      <Container maxWidth="xl" sx={{ py: 3.5, px: { xs: 2, md: 4 } }}>

        {/* ── KPI Cards ────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3.5, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <KpiCard
              label="Temperatura Atual"
              value={temp}
              unit="°C"
              icon={<ThermostatOutlined />}
              color={temp != null ? (parseFloat(temp) >= 100 ? '#ef4444' : parseFloat(temp) >= 90 ? '#f59e0b' : '#f97316') : '#555'}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <KpiCard
              label="Pressão Envelope"
              value={pressEnv}
              unit="bar"
              icon={<SpeedOutlined />}
              color="#60a5fa"
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <KpiCard
              label="Pressão Saco de Ar"
              value={pressSaco}
              unit="bar"
              icon={<SpeedOutlined />}
              color="#a78bfa"
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <KpiCard
              label="Status da Máquina"
              value={statusMaquina ? (statusMaquina.charAt(0).toUpperCase() + statusMaquina.slice(1)) : (ciclo?.status === 'concluido' ? 'Concluído' : '—')}
              icon={<CheckCircleOutlined />}
              color={statusMaquina ? ({ ativo: '#4ade80', running: '#4ade80', ok: '#4ade80', erro: '#ef4444' }[statusMaquina.toLowerCase()] || '#aaa') : '#555'}
              subtext={liveData ? `Última leitura: ${new Date(liveData.created_at || Date.now()).toLocaleTimeString('pt-BR')}` : undefined}
            />
          </Box>
        </Box>

        {/* ── Gráfico principal ─────────────────────────────────── */}
        <Paper sx={{
          mb: 3.5,
          p: 3,
          bgcolor: '#161616',
          border: '1px solid #222',
          borderRadius: '10px',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#d0d0d0', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: '"Outfit", sans-serif' }}>
                Telemetria do Ciclo
              </Typography>
              <Typography sx={{ color: '#3a3a3a', fontSize: '0.68rem', mt: 0.25 }}>
                {leituras.length} leituras registradas
              </Typography>
            </Box>
            {ciclo?.status === 'ativo' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625, px: 1.25, py: 0.5, bgcolor: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '6px' }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#4ade80', animation: 'pulse 2s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
                <Typography sx={{ color: '#4ade80', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                  AO VIVO
                </Typography>
              </Box>
            )}
          </Box>

          {leituras.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
              <Typography variant="body2" sx={{ color: '#444' }}>
                {ciclo?.status === 'ativo' ? 'Aguardando leituras do CLP...' : 'Nenhuma leitura registrada para este ciclo.'}
              </Typography>
            </Box>
          ) : (
            <ReactApexChart
              options={chartOptions}
              series={chartSeries}
              type="area"
              height={400}
            />
          )}
        </Paper>

        {/* ── Pneus + Resumo ────────────────────────────────────── */}
        <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'stretch', flexDirection: { xs: 'column', md: 'row' } }}>

          {/* ── Pneus ─────────────────────────────────────────── */}
          <Paper sx={{ flex: 7, minWidth: 0, p: 4, bgcolor: '#161616', border: '1px solid #222', borderRadius: '10px' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, pb: 2.5, borderBottom: '1px solid #1e1e1e' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TireRepairIcon sx={{ color: '#f59e0b', fontSize: 26 }} />
                <Box>
                  <Typography sx={{ fontWeight: 700, color: '#d0d0d0', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: '"Outfit", sans-serif' }}>
                    Pneus Registrados
                  </Typography>
                  <Typography sx={{ color: '#444', fontSize: '0.78rem', mt: 0.25 }}>
                    {pneus.length} de 16 slots preenchidos
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ px: 1.75, py: 0.625, bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px' }}>
                  <Typography sx={{ color: '#f59e0b', fontWeight: 700, fontSize: '1rem', fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.01em' }}>
                    {pneus.length}/16
                  </Typography>
                </Box>
                {ciclo?.status === 'ativo' && (
                  <Button size="small" variant="outlined" color="warning" onClick={() => navigate('/ciclos')}
                    sx={{ fontSize: '0.78rem', borderRadius: '6px', px: 1.5 }}>
                    Gerenciar
                  </Button>
                )}
              </Box>
            </Box>

            {/* Badges */}
            {pneus.length === 0 ? (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <Typography sx={{ color: '#333', fontSize: '0.9rem', fontStyle: 'italic' }}>
                  Nenhum pneu vinculado a este ciclo.
                </Typography>
                {ciclo?.status === 'ativo' && (
                  <Typography sx={{ color: '#2a2a2a', fontSize: '0.8rem', mt: 0.75 }}>
                    Acesse "Ciclos" para registrar pneus.
                  </Typography>
                )}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                {pneus.map((p, i) => (
                  <Box key={p.id} sx={{
                    px: 2,
                    py: 1,
                    bgcolor: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}>
                    <Typography sx={{ color: '#5a4010', fontSize: '0.72rem', fontWeight: 700, lineHeight: 1 }}>
                      {String(i + 1).padStart(2, '0')}
                    </Typography>
                    <Box sx={{ width: '1px', height: 14, bgcolor: 'rgba(245,158,11,0.2)' }} />
                    <Typography sx={{ color: '#d4a017', fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1 }}>
                      {p.codigo_pneu}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>

          {/* ── Resumo ────────────────────────────────────────── */}
          <Paper sx={{ flex: 5, minWidth: 0, p: 4, bgcolor: '#161616', border: '1px solid #222', borderRadius: '10px' }}>
            {/* Header */}
            <Box sx={{ mb: 3, pb: 2.5, borderBottom: '1px solid #1e1e1e' }}>
              <Typography sx={{ fontWeight: 700, color: '#d0d0d0', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: '"Outfit", sans-serif' }}>
                Resumo do Ciclo
              </Typography>
            </Box>

            {/* Stats grid — top block */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 3 }}>
              <StatBlock label="Nº Ciclo" value={fmtNumero(ciclo?.numero_ciclo)} mono />
              <StatBlock label="Máquina" value={ciclo?.maquina_nome} />
              <StatBlock label="Status" value={ciclo?.status} color={statusColor} />
            </Box>

            <Divider sx={{ borderColor: '#1e1e1e', mb: 3 }} />

            {/* Time block */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 3 }}>
              <StatBlock label="Início" value={fmtHora(ciclo?.start_time)} sub={ciclo?.start_time ? new Date(ciclo.start_time).toLocaleDateString('pt-BR') : undefined} />
              <StatBlock
                label="Fim"
                value={ciclo?.end_time ? fmtHora(ciclo.end_time) : (ciclo?.status === 'ativo' ? 'Ativo…' : 'N/A')}
                color={ciclo?.status === 'ativo' ? '#4ade80' : undefined}
              />
              <StatBlock label="Duração" value={fmtElapsed(elapsedSec)} mono />
            </Box>

            <Divider sx={{ borderColor: '#1e1e1e', mb: 3 }} />

            {/* Temp stats */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 1.5 }}>
              <StatBlock label="Temp. Máx." value={stats.maxTemp ? `${stats.maxTemp}°C` : '—'} color="#ef4444" />
              <StatBlock label="Temp. Mín." value={stats.minTemp ? `${stats.minTemp}°C` : '—'} color="#60a5fa" />
              <StatBlock label="Temp. Méd." value={stats.avgTemp ? `${stats.avgTemp}°C` : '—'} color="#f59e0b" />
              <StatBlock label="Leituras" value={leituras.length} />
            </Box>
          </Paper>

        </Box>
      </Container>
    </Box>
  );
}

// ─── Bloco de stat no Resumo ─────────────────────────────────
function StatBlock({ label, value, color, mono, sub }) {
  return (
    <Box sx={{
      bgcolor: '#111',
      border: '1px solid #1e1e1e',
      borderRadius: '8px',
      px: 1.75,
      py: 1.5,
      display: 'flex',
      flexDirection: 'column',
      gap: 0.5,
    }}>
      <Typography sx={{
        fontSize: '0.65rem',
        fontWeight: 700,
        color: '#3a3a3a',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontFamily: '"Outfit", sans-serif',
        lineHeight: 1,
      }}>
        {label}
      </Typography>
      <Typography sx={{
        fontSize: '1rem',
        fontWeight: 700,
        color: color || '#c0c0c0',
        fontFamily: mono ? 'monospace' : '"Outfit", sans-serif',
        lineHeight: 1.2,
        wordBreak: 'break-word',
      }}>
        {value ?? '—'}
      </Typography>
      {sub && (
        <Typography sx={{ fontSize: '0.68rem', color: '#383838', lineHeight: 1 }}>{sub}</Typography>
      )}
    </Box>
  );
}
