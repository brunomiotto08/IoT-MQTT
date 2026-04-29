import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import {
  Box, Container, Typography, AppBar, Toolbar, Button, IconButton,
  Card, CardContent, LinearProgress, Grid,
  Snackbar, Alert, Divider, Chip,
} from '@mui/material';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ThermostatOutlined from '@mui/icons-material/ThermostatOutlined';
import SpeedOutlined from '@mui/icons-material/SpeedOutlined';
import ProductionQuantityLimitsOutlined from '@mui/icons-material/ProductionQuantityLimitsOutlined';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import HistoryIcon from '@mui/icons-material/History';
import NotificationsIcon from '@mui/icons-material/Notifications';
import TableChartIcon from '@mui/icons-material/TableChart';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import TireRepairIcon from '@mui/icons-material/TireRepair';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import soundManager from '../utils/soundManager';

const CICLO_DURACAO_MIN = 120;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STATUS_COLOR = {
  ok:      '#22c55e',
  ativo:   '#22c55e',
  running: '#22c55e',
  alerta:  '#f59e0b',
  warning: '#f59e0b',
  erro:    '#ef4444',
  error:   '#ef4444',
};
const STATUS_LABEL = {
  ok:      'Normal',
  ativo:   'Ativo',
  running: 'Ativo',
  alerta:  'Atenção',
  warning: 'Atenção',
  erro:    'Erro',
  error:   'Erro',
};

function getStatusColor(status) {
  return STATUS_COLOR[status?.toLowerCase()] ?? '#444444';
}
function getStatusLabel(status) {
  if (!status) return 'Sem dados';
  return STATUS_LABEL[status.toLowerCase()] ?? status;
}

function NavButton({ icon, label, active, onClick }) {
  return (
    <Button
      variant="text"
      startIcon={icon}
      onClick={onClick}
      sx={{
        color: active ? '#e2e2e2' : '#666',
        fontWeight: active ? 700 : 500,
        fontSize: '0.8125rem',
        px: 1.5,
        py: 0.75,
        minWidth: 0,
        borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
        borderRadius: 0,
        '&:hover': { color: '#e2e2e2', background: 'transparent', borderBottomColor: '#3a3a3a' },
      }}
    >
      {label}
    </Button>
  );
}

function MetricCell({ icon, label, value, color }) {
  return (
    <Box sx={{ bgcolor: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', px: 2, py: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
        <Box sx={{ color: '#333', '& .MuiSvgIcon-root': { fontSize: 15 } }}>{icon}</Box>
        <Typography sx={{ color: '#383838', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, fontFamily: '"Outfit", sans-serif', lineHeight: 1 }}>
          {label}
        </Typography>
      </Box>
      <Typography sx={{ color: color ?? '#aaa', fontWeight: 700, fontFamily: '"Outfit", sans-serif', fontSize: '1.5rem', lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value ?? <span style={{ color: '#2a2a2a', fontSize: '0.875rem' }}>—</span>}
      </Typography>
    </Box>
  );
}

// ─── Card de ciclo ativo ──────────────────────────────────────
function CicloAtivoCard({ ciclo, liveTemp, livePressEnv, navigate }) {
  const [elapsedSec, setElapsedSec] = useState(() => {
    const start = new Date(ciclo.start_time).getTime();
    return Math.floor((Date.now() - start) / 1000);
  });

  useEffect(() => {
    const t = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtNumero = (n) => n != null ? `Ciclo ${String(n).padStart(3, '0')}` : '—';
  const fmtElapsed = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  const elapsedMin = elapsedSec / 60;
  const pct = Math.min((elapsedMin / CICLO_DURACAO_MIN) * 100, 100);
  const barColor = pct > 95 ? '#4ade80' : '#3b82f6';

  const temp = liveTemp != null ? parseFloat(liveTemp).toFixed(1) : null;
  const tempColor = temp != null
    ? (parseFloat(temp) >= 100 ? '#ef4444' : parseFloat(temp) >= 90 ? '#f59e0b' : '#f97316')
    : '#555';

  return (
    <Card elevation={0} sx={{
      bgcolor: '#161616',
      border: '1px solid rgba(74,222,128,0.2)',
      borderRadius: 2,
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 0.3s, box-shadow 0.3s',
      '&:hover': { borderColor: 'rgba(74,222,128,0.45)', boxShadow: '0 0 20px rgba(74,222,128,0.08)' },
    }}>
      {/* linha verde no topo */}
      <Box sx={{ height: 2, bgcolor: '#4ade80', opacity: 0.6 }} />
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#4ade80', fontSize: '0.78rem', lineHeight: 1.2 }}>
              {fmtNumero(ciclo.numero_ciclo)}
            </Typography>
            <Typography sx={{ fontWeight: 700, color: '#d0d0d0', fontSize: '0.9rem', lineHeight: 1.3, mt: 0.25 }}>
              {ciclo.maquina_nome}
            </Typography>
            {ciclo.maquina_modelo && (
              <Typography variant="caption" sx={{ color: '#444' }}>{ciclo.maquina_modelo}</Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.25, bgcolor: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 1 }}>
            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#4ade80', animation: 'pulse 2s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#4ade80', fontSize: '0.75rem' }}>
              {fmtElapsed(elapsedSec)}
            </Typography>
          </Box>
        </Box>

        {/* Métricas */}
        <Grid container spacing={1} sx={{ mb: 1.5 }}>
          <Grid item xs={6}>
            <Box sx={{ bgcolor: '#1a1a1a', borderRadius: 1, p: 1 }}>
              <Typography sx={{ fontSize: '0.62rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>
                Temperatura
              </Typography>
              <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: '1.15rem', color: tempColor, lineHeight: 1 }}>
                {temp != null ? `${temp}°C` : <span style={{ color: '#333', fontSize: '0.8rem' }}>—</span>}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ bgcolor: '#1a1a1a', borderRadius: 1, p: 1 }}>
              <Typography sx={{ fontSize: '0.62rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>
                P. Envelope
              </Typography>
              <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: '1.15rem', color: '#60a5fa', lineHeight: 1 }}>
                {livePressEnv != null ? `${parseFloat(livePressEnv).toFixed(2)} bar` : <span style={{ color: '#333', fontSize: '0.8rem' }}>—</span>}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Progresso */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#444', fontSize: '0.65rem' }}>
              {Math.round(pct)}% concluído
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {ciclo.total_pneus > 0 && (
                <Chip
                  icon={<TireRepairIcon sx={{ fontSize: '10px !important' }} />}
                  label={ciclo.total_pneus}
                  size="small"
                  sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', '& .MuiChip-icon': { ml: '4px' } }}
                />
              )}
              <Typography variant="caption" sx={{ color: '#333', fontSize: '0.65rem' }}>
                meta {CICLO_DURACAO_MIN}min
              </Typography>
            </Box>
          </Box>
          <Box sx={{ height: 4, bgcolor: '#1e1e1e', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{
              height: '100%',
              width: `${pct}%`,
              bgcolor: barColor,
              borderRadius: 2,
              transition: 'width 1s linear',
              boxShadow: `0 0 6px ${barColor}60`,
            }} />
          </Box>
        </Box>

        {/* Ação */}
        <Button
          fullWidth
          size="small"
          variant="outlined"
          endIcon={<OpenInNewIcon sx={{ fontSize: '14px !important' }} />}
          onClick={() => navigate('/ciclos')}
          sx={{
            borderColor: 'rgba(74,222,128,0.2)',
            color: '#4ade80',
            fontSize: '0.72rem',
            fontWeight: 700,
            '&:hover': { borderColor: 'rgba(74,222,128,0.5)', bgcolor: 'rgba(74,222,128,0.05)' },
          }}
        >
          Monitorar
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Card de máquina (puro — sem drag) ───────────────────────
function MachineCard({ maquina, liveReadings, navigate, dragHandleProps = {} }) {
  const r = liveReadings[maquina.id];
  const sColor = getStatusColor(r?.status);
  const hasData = !!r;
  const isAlert = hasData && r.status && !['ok', 'ativo', 'running'].includes(r.status.toLowerCase());

  return (
    <Card elevation={0} sx={{
      height: '100%',
      bgcolor: '#161616',
      border: '1px solid',
      borderColor: isAlert ? `${sColor}35` : '#1e1e1e',
      borderRadius: '12px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      '&:hover': { borderColor: isAlert ? `${sColor}66` : '#2e2e2e', boxShadow: '0 6px 32px rgba(0,0,0,0.5)' },
    }}>
      {/* Barra de status no topo */}
      <Box sx={{ height: '3px', bgcolor: hasData ? sColor : '#1e1e1e', opacity: hasData ? 0.8 : 1 }} />

      <CardContent sx={{ p: 3.5 }}>
        {/* ── Header ── */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}>
          <Box
            sx={{ flex: 1, minWidth: 0, pr: 1, cursor: 'pointer' }}
            onClick={() => navigate(`/dashboard/${maquina.id}`)}
          >
            <Typography sx={{
              fontWeight: 700, color: '#e2e2e2', fontSize: '1.375rem',
              lineHeight: 1.2, mb: 0.5, fontFamily: '"Outfit", sans-serif',
              letterSpacing: '-0.01em',
            }}>
              {maquina.nome}
            </Typography>
            <Typography sx={{ color: '#3a3a3a', fontSize: '0.825rem', fontWeight: 500 }}>
              {maquina.modelo || 'Sem modelo'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            {/* Status badge */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.75,
              px: 1.5, py: 0.625,
              bgcolor: hasData ? `${sColor}14` : '#111',
              border: `1px solid ${hasData ? sColor + '44' : '#222'}`,
              borderRadius: '8px',
              cursor: 'pointer',
            }} onClick={() => navigate(`/dashboard/${maquina.id}`)}>
              <Box sx={{
                width: 7, height: 7, borderRadius: '50%', bgcolor: hasData ? sColor : '#333',
                ...(hasData && ['ativo','running','ok'].includes(r?.status?.toLowerCase()) && {
                  animation: 'dotPulse 2s infinite',
                  '@keyframes dotPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
                }),
              }} />
              <Typography sx={{ color: hasData ? sColor : '#444', fontWeight: 700, fontSize: '0.78rem', fontFamily: '"Outfit", sans-serif' }}>
                {hasData ? getStatusLabel(r?.status) : 'Sem dados'}
              </Typography>
            </Box>

            {/* Drag handle */}
            <Box
              {...dragHandleProps}
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '6px',
                color: '#2a2a2a', cursor: 'grab',
                transition: 'color 0.15s, background 0.15s',
                '&:hover': { color: '#555', bgcolor: '#1e1e1e' },
                '&:active': { cursor: 'grabbing' },
              }}
            >
              <DragIndicatorIcon sx={{ fontSize: 18 }} />
            </Box>
          </Box>
        </Box>

        {/* ── Métricas ── */}
        <Box
          sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2.5, cursor: 'pointer' }}
          onClick={() => navigate(`/dashboard/${maquina.id}`)}
        >
          <MetricCell
            icon={<ThermostatOutlined />} label="Temperatura"
            value={hasData && r.temperatura != null ? `${parseFloat(r.temperatura).toFixed(1)}°C` : null}
            color={hasData && r.temperatura != null
              ? (parseFloat(r.temperatura) >= 90 ? '#ef4444' : parseFloat(r.temperatura) >= 70 ? '#f59e0b' : '#22c55e')
              : '#444'}
          />
          <MetricCell
            icon={<SpeedOutlined />} label="Pressão Envelope"
            value={hasData && r.pressao_envelope != null ? `${parseFloat(r.pressao_envelope).toFixed(2)} bar` : null}
            color={hasData && r.pressao_envelope != null ? '#60a5fa' : '#444'}
          />
          <MetricCell
            icon={<SpeedOutlined />} label="Vibração"
            value={hasData && r.vibracao != null ? `${parseFloat(r.vibracao).toFixed(2)} Pa` : null}
            color={hasData && r.vibracao != null
              ? (parseFloat(r.vibracao) >= 8 ? '#ef4444' : parseFloat(r.vibracao) >= 5 ? '#f59e0b' : '#22c55e')
              : '#444'}
          />
          <MetricCell
            icon={<ProductionQuantityLimitsOutlined />} label="Peças Produz."
            value={hasData && r.pecas_produzidas != null ? String(r.pecas_produzidas) : null}
            color="#a78bfa"
          />
        </Box>

        {/* ── Footer ── */}
        <Box
          sx={{ pt: 2, borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => navigate(`/dashboard/${maquina.id}`)}
        >
          <Typography sx={{ color: '#2a2a2a', fontSize: '0.68rem', fontFamily: 'monospace' }}>
            {maquina.uuid_maquina || maquina.id}
          </Typography>
          <Typography sx={{ color: r?.created_at ? '#3a3a3a' : '#222', fontSize: '0.72rem', fontWeight: 500 }}>
            {r?.created_at ? `Atualizado ${new Date(r.created_at).toLocaleTimeString('pt-BR')}` : 'Aguardando dados'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Wrapper sortable ─────────────────────────────────────────
function SortableMachineCard({ maquina, liveReadings, navigate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(maquina.id),
  });

  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.25 : 1,
        height: '100%',
      }}
    >
      <MachineCard
        maquina={maquina}
        liveReadings={liveReadings}
        navigate={navigate}
        dragHandleProps={listeners}
      />
    </Box>
  );
}

// ─── Dashboard ────────────────────────────────────────────────
export default function DashboardOverview() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [maquinas, setMaquinas] = useState([]);
  const [orderedIds, setOrderedIds] = useState([]);
  const [activeDragId, setActiveDragId] = useState(null);
  const [liveReadings, setLiveReadings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [empresaNome, setEmpresaNome] = useState(() => localStorage.getItem('empresa_nome') || '');
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [notification, setNotification] = useState(null);
  const socketRef = useRef(null);

  // Ciclos ativos
  const [ciclosAtivos, setCiclosAtivos] = useState([]);
  const [liveCicloReadings, setLiveCicloReadings] = useState({});

  const sessionRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const fetchCiclosAtivos = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    try {
      const r = await axios.get(`${API_URL}/api/ciclos/ativos`, {
        headers: { Authorization: `Bearer ${s.access_token}` }
      });
      setCiclosAtivos(r.data || []);
    } catch {
      setCiclosAtivos([]);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      setSession(session);
      sessionRef.current = session;

      // Always re-fetch empresa_id from Supabase to avoid stale localStorage
      const { data: v } = await supabase
        .from('usuarios_empresas')
        .select('empresa_id, empresas(nome)')
        .eq('user_id', session.user.id)
        .single();
      let empresaId = localStorage.getItem('empresa_id');
      if (v) {
        empresaId = String(v.empresa_id);
        localStorage.setItem('empresa_id', empresaId);
        if (v.empresas?.nome) { localStorage.setItem('empresa_nome', v.empresas.nome); setEmpresaNome(v.empresas.nome); }
      } else {
        const n = localStorage.getItem('empresa_nome');
        if (n) setEmpresaNome(n);
      }

      await Promise.all([fetchResumo(session), fetchCiclosAtivos()]);

      const sock = io(API_URL);
      socketRef.current = sock;
      sock.on('connect', () => {
        setConnected(true);
        const eId = localStorage.getItem('empresa_id');
        if (eId) sock.emit('join_empresa', eId);
      });
      sock.on('disconnect', () => setConnected(false));
      sock.on('mqtt_message', (msg) => {
        try {
          const p = typeof msg === 'string' ? JSON.parse(msg) : msg;
          if (p.maquina_id) {
            setLiveReadings(prev => ({ ...prev, [p.maquina_id]: p }));
            setLiveCicloReadings(prev => ({ ...prev, [p.maquina_id]: p }));
            setLastUpdate(new Date());
          }
        } catch {}
      });
      sock.on('new_notification', (n) => {
        soundManager.play(n.prioridade || 'media', n.tipoLimite || 'max');
        setNotification(n);
      });
      sock.on('ciclo_iniciado', fetchCiclosAtivos);
      sock.on('ciclo_encerrado', fetchCiclosAtivos);
    };
    init();
    return () => { socketRef.current?.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchResumo = async (s = session) => {
    if (!s) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/maquinas/resumo`, {
        headers: { Authorization: `Bearer ${s.access_token}` },
      });
      const data = await res.json();
      setMaquinas(data || []);
      // Restaurar ordem salva (merge com novos IDs não salvos)
      const storageKey = `maquina_order_${localStorage.getItem('empresa_id') || 'default'}`;
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const apiIds = (data || []).map(m => String(m.id));
      const merged = [
        ...saved.filter(id => apiIds.includes(id)),
        ...apiIds.filter(id => !saved.includes(id)),
      ];
      setOrderedIds(merged);
      const init = {};
      (data || []).forEach(m => {
        if (m.ultima_leitura) {
          init[m.id] = { temperatura: m.temperatura, vibracao: m.vibracao, status: m.status, pecas_produzidas: m.pecas_produzidas, pressao_envelope: m.pressao_envelope, pressao_saco_ar: m.pressao_saco_ar, created_at: m.ultima_leitura };
        }
      });
      setLiveReadings(init);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Erro resumo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('empresa_id');
    localStorage.removeItem('empresa_nome');
    localStorage.removeItem('user_role');
    await supabase.auth.signOut();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f0f' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#111', borderBottom: '1px solid #1e1e1e' }}>
        <Toolbar sx={{ px: 4, minHeight: '56px !important', gap: 1 }}>
          {/* Logo / Nome */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: 4 }}>
            <img src="/habilita_logo.svg" alt="Habilita" style={{ height: 28, width: 'auto' }} />
            {empresaNome && (
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#555', fontFamily: '"Outfit", sans-serif' }}>
                {empresaNome}
              </Typography>
            )}
          </Box>

          {/* Nav */}
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 0.5 }}>
            <NavButton icon={<PrecisionManufacturingIcon sx={{ fontSize: 15 }} />} label="Visão Geral" active />
            <NavButton icon={<MonitorHeartIcon sx={{ fontSize: 15 }} />} label="Status" onClick={() => navigate('/status-maquina')} />
            <NavButton icon={<PrecisionManufacturingIcon sx={{ fontSize: 15 }} />} label="Máquinas" onClick={() => navigate('/maquinas')} />
            <NavButton icon={<HistoryIcon sx={{ fontSize: 15 }} />} label="Ciclos" onClick={() => navigate('/ciclos')} />
            <NavButton icon={<TableChartIcon sx={{ fontSize: 15 }} />} label="Registros" onClick={() => navigate('/registros')} />
            <NavButton icon={<NotificationsIcon sx={{ fontSize: 15 }} />} label="Notificações" onClick={() => navigate('/notificacoes')} />
          </Box>

          {/* Direita */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, bgcolor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: connected ? '#22c55e' : '#444' }} />
              <Typography variant="caption" sx={{ color: connected ? '#22c55e' : '#555', fontWeight: 600, fontSize: '0.7rem' }}>
                {connected ? 'Online' : 'Offline'}
              </Typography>
            </Box>
            {lastUpdate && (
              <Typography variant="caption" sx={{ color: '#444', fontSize: '0.7rem' }}>
                {lastUpdate.toLocaleTimeString()}
              </Typography>
            )}
            <IconButton size="small" onClick={() => fetchResumo()} disabled={isLoading} sx={{ color: '#555', '&:hover': { color: '#aaa' } }}>
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" onClick={() => navigate('/configuracoes')} sx={{ color: '#555', '&:hover': { color: '#aaa' } }}>
              <SettingsIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <Divider orientation="vertical" flexItem sx={{ borderColor: '#2a2a2a', mx: 0.5 }} />
            <Button size="small" startIcon={<LogoutIcon sx={{ fontSize: 14 }} />} onClick={handleLogout}
              sx={{ color: '#555', fontSize: '0.75rem', fontWeight: 600, px: 1.5, '&:hover': { color: '#aaa' } }}>
              Sair
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {isLoading && <LinearProgress sx={{ height: 2 }} />}

      <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
        {/* ══ Seção: Ciclos em Andamento ══════════════════════ */}
        {ciclosAtivos.length > 0 && (
          <Box sx={{ mb: 4 }}>
            {/* Header da seção */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#4ade80', animation: 'overviewPulse 2s infinite', '@keyframes overviewPulse': { '0%,100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.5, transform: 'scale(0.85)' } } }} />
                  <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Ciclos em Andamento
                  </Typography>
                </Box>
                <Chip
                  label={ciclosAtivos.length}
                  size="small"
                  sx={{ bgcolor: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                />
                <Typography variant="caption" sx={{ color: '#333', fontSize: '0.68rem' }}>
                  atualizados pelo CLP via MQTT
                </Typography>
              </Box>
              <Button
                size="small"
                startIcon={<HistoryIcon sx={{ fontSize: 13 }} />}
                onClick={() => navigate('/ciclos')}
                sx={{ color: '#555', fontSize: '0.72rem', border: '1px solid #222', '&:hover': { color: '#aaa', borderColor: '#3a3a3a' } }}
              >
                Ver histórico
              </Button>
            </Box>

            {/* Cards dos ciclos */}
            <Grid container spacing={2}>
              {ciclosAtivos.map(ciclo => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={ciclo.id}>
                  <CicloAtivoCard
                    ciclo={ciclo}
                    liveTemp={liveCicloReadings[ciclo.maquina_id]?.temperatura ?? ciclo.ultima_temperatura}
                    livePressEnv={liveCicloReadings[ciclo.maquina_id]?.pressao_envelope ?? ciclo.ultima_pressao_envelope}
                    navigate={navigate}
                  />
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ mt: 4, borderColor: '#1a1a1a' }} />
          </Box>
        )}

        {/* Título */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#e2e2e2', mb: 0.25 }}>
              Máquinas
            </Typography>
            <Typography variant="body2" sx={{ color: '#555' }}>
              {maquinas.length} máquina{maquinas.length !== 1 ? 's' : ''} cadastrada{maquinas.length !== 1 ? 's' : ''} · clique para ver detalhes
            </Typography>
          </Box>
          <Button size="small" startIcon={<AddIcon sx={{ fontSize: 15 }} />} onClick={() => navigate('/maquinas')}
            sx={{ color: '#666', border: '1px solid #2a2a2a', bgcolor: '#161616', px: 2, '&:hover': { color: '#aaa', borderColor: '#3a3a3a' } }}>
            Gerenciar
          </Button>
        </Box>

        {/* Grid */}
        {maquinas.length === 0 && !isLoading ? (
          <Box sx={{ textAlign: 'center', py: 12, color: '#333' }}>
            <PrecisionManufacturingIcon sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="body1" sx={{ color: '#444', mb: 2 }}>Nenhuma máquina cadastrada</Typography>
            <Button onClick={() => navigate('/maquinas')} sx={{ color: '#555', border: '1px solid #2a2a2a' }}>
              Cadastrar máquina
            </Button>
          </Box>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => setActiveDragId(active.id)}
            onDragEnd={({ active, over }) => {
              setActiveDragId(null);
              if (!over || active.id === over.id) return;
              setOrderedIds(prev => {
                const oldIdx = prev.indexOf(active.id);
                const newIdx = prev.indexOf(over.id);
                const next = arrayMove(prev, oldIdx, newIdx);
                const storageKey = `maquina_order_${localStorage.getItem('empresa_id') || 'default'}`;
                localStorage.setItem(storageKey, JSON.stringify(next));
                return next;
              });
            }}
            onDragCancel={() => setActiveDragId(null)}
          >
            <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 3,
                maxWidth: '1400px',
                mx: 'auto',
              }}>
                {orderedIds
                  .map(id => maquinas.find(m => String(m.id) === id))
                  .filter(Boolean)
                  .map(maquina => (
                    <SortableMachineCard
                      key={maquina.id}
                      maquina={maquina}
                      liveReadings={liveReadings}
                      navigate={navigate}
                    />
                  ))
                }
              </Box>
            </SortableContext>

            <DragOverlay>
              {activeDragId ? (() => {
                const m = maquinas.find(m => String(m.id) === activeDragId);
                return m ? (
                  <Box sx={{ opacity: 0.9, boxShadow: '0 16px 48px rgba(0,0,0,0.7)', borderRadius: '12px' }}>
                    <MachineCard maquina={m} liveReadings={liveReadings} navigate={navigate} />
                  </Box>
                ) : null;
              })() : null}
            </DragOverlay>
          </DndContext>
        )}
      </Container>

      <Snackbar open={!!notification} autoHideDuration={6000} onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setNotification(null)} severity="warning" sx={{ fontWeight: 600 }}>
          <strong>{notification?.maquina_nome}</strong>: {notification?.mensagem}
        </Alert>
      </Snackbar>
    </Box>
  );
}
