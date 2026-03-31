import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import { io as socketIo } from 'socket.io-client';
import {
  Container,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
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
  Stack,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import TireRepairIcon from '@mui/icons-material/TireRepair';
import HistoryIcon from '@mui/icons-material/History';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
const fmt = (str) => str ? new Date(str).toLocaleString('pt-BR') : 'N/A';
const fmtDate = (str) => str ? new Date(str).toLocaleDateString('pt-BR') : 'N/A';
const fmtHora = (str) => str ? new Date(str).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
const fmtDur = (min) => {
  if (!min) return 'N/A';
  return `${Math.floor(min / 60)}h ${Math.round(min % 60)}min`;
};
const fmtNumero = (n) => n != null ? `Ciclo ${String(n).padStart(3, '0')}` : '—';

const STATUS_COLOR = { ativo: '#4ade80', concluido: '#60a5fa', falha: '#ef4444' };
const STATUS_BG    = { ativo: 'rgba(74,222,128,0.1)', concluido: 'rgba(96,165,250,0.1)', falha: 'rgba(239,68,68,0.1)' };

// ─────────────────────────────────────────
// Section label
// ─────────────────────────────────────────
function SectionLabel({ icon, label }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
      {icon}
      <Typography sx={{
        fontWeight: 700,
        color: '#d0d0d0',
        fontSize: '0.875rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontFamily: '"Outfit", sans-serif',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: '#1c1c1c' }} />
    </Box>
  );
}

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
    if (pneus.length >= 16) { setErro('Limite de 16 pneus por ciclo atingido.'); return; }
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
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
        ) : pneus.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic', mb: 2 }}>Nenhum pneu registrado ainda.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
            {pneus.map((p, i) => (
              <Chip key={p.id} label={`${i + 1}. ${p.codigo_pneu}`} size="small" color="warning" variant="outlined"
                sx={{ fontFamily: 'monospace', fontSize: '0.72rem' }} />
            ))}
          </Box>
        )}
        <Divider sx={{ mb: 2 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>Adicionar pneu</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth size="small" placeholder="Código do pneu" value={novoCodigo}
            onChange={e => setNovoCodigo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdicionar()}
            inputProps={{ maxLength: 100, style: { fontFamily: 'monospace' } }}
            disabled={pneus.length >= 16}
          />
          <Button variant="contained" size="small"
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AddCircleOutlineIcon />}
            onClick={handleAdicionar}
            disabled={loading || !novoCodigo.trim() || pneus.length >= 16}
            sx={{ whiteSpace: 'nowrap' }}>
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
// Cabeçalho ordenável
// ─────────────────────────────────────────
const COL_SX = {
  numero_ciclo:      { minWidth: 90,  flexShrink: 0 },
  maquina_nome:      { flex: 2,  minWidth: 0 },
  start_time:        { flex: 1.5, minWidth: 0, display: { xs: 'none', sm: 'flex' } },
  duracao_minutos:   { flex: 1,  minWidth: 0, display: { xs: 'none', md: 'flex' } },
  total_pneus:       { minWidth: 56, flexShrink: 0, display: { xs: 'none', md: 'flex' } },
};

function ColHeader({ col, label, sortCol, sortDir, onSort, sx = {} }) {
  const active = sortCol === col;
  return (
    <Box
      onClick={() => onSort(col)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        cursor: 'pointer',
        userSelect: 'none',
        color: active ? '#a0a0a0' : '#383838',
        transition: 'color 0.15s',
        '&:hover': { color: '#888' },
        ...COL_SX[col],
        ...sx,
      }}
    >
      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: '"Outfit", sans-serif', lineHeight: 1 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.6rem', lineHeight: 1, opacity: active ? 1 : 0, transition: 'opacity 0.15s' }}>
        {active ? (sortDir === 'asc' ? '▲' : '▼') : '▲'}
      </Typography>
    </Box>
  );
}

function CicloTableHeader({ sortCol, sortDir, onSort }) {
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      px: 2.5,
      py: 1,
      bgcolor: '#111',
      border: '1px solid #1a1a1a',
      borderRadius: '8px',
      mb: 0.5,
    }}>
      <ColHeader col="numero_ciclo"    label="Nº Ciclo"  sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
      <ColHeader col="maquina_nome"    label="Máquina"   sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
      <ColHeader col="start_time"      label="Início"    sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
      <ColHeader col="duracao_minutos" label="Duração"   sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
      <ColHeader col="total_pneus"     label="Pneus"     sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
      {/* Status + botão — espaços fixos sem ordenação */}
      <Box sx={{ minWidth: 74, flexShrink: 0 }}>
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#2a2a2a', fontFamily: '"Outfit", sans-serif' }}>
          Status
        </Typography>
      </Box>
      <Box sx={{ minWidth: 94, flexShrink: 0 }} />
    </Box>
  );
}

// ─────────────────────────────────────────
// Linha compacta de ciclo (histórico)
// ─────────────────────────────────────────
function CicloRow({ ciclo, onMonitorar }) {
  const cor = STATUS_COLOR[ciclo.status] || '#888';
  const bg  = STATUS_BG[ciclo.status]   || 'transparent';

  return (
    <Paper elevation={0} sx={{
      bgcolor: '#161616',
      border: '1px solid #1e1e1e',
      borderLeft: `3px solid ${cor}`,
      borderRadius: '8px',
      px: 2.5,
      py: 1.5,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      transition: 'border-color 0.2s, background 0.2s',
      '&:hover': { bgcolor: '#1a1a1a', borderColor: `${cor}66` },
    }}>
      {/* Nº Ciclo */}
      <Box sx={{ minWidth: 90, flexShrink: 0 }}>
        <Typography sx={{ color: cor, fontWeight: 700, fontSize: '0.78rem', fontFamily: 'monospace' }}>
          {fmtNumero(ciclo.numero_ciclo)}
        </Typography>
      </Box>

      {/* Máquina */}
      <Box sx={{ flex: 2, minWidth: 0 }}>
        <Typography sx={{ color: '#d0d0d0', fontWeight: 600, fontSize: '0.875rem', fontFamily: '"Outfit", sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ciclo.maquina_nome}
        </Typography>
        {ciclo.maquina_modelo && (
          <Typography sx={{ color: '#3a3a3a', fontSize: '0.7rem' }}>{ciclo.maquina_modelo}</Typography>
        )}
      </Box>

      {/* Início */}
      <Box sx={{ flex: 1.5, minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
        <Typography sx={{ color: '#555', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Início</Typography>
        <Typography sx={{ color: '#888', fontSize: '0.82rem', fontFamily: '"Outfit", sans-serif' }}>
          {fmtHora(ciclo.start_time)} · {fmtDate(ciclo.start_time)}
        </Typography>
      </Box>

      {/* Duração */}
      <Box sx={{ flex: 1, minWidth: 0, display: { xs: 'none', md: 'block' } }}>
        <Typography sx={{ color: '#555', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Duração</Typography>
        <Typography sx={{ color: '#888', fontSize: '0.82rem', fontFamily: '"Outfit", sans-serif' }}>
          {fmtDur(ciclo.duracao_minutos)}
        </Typography>
      </Box>

      {/* Pneus */}
      <Box sx={{ minWidth: 48, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
        <Typography sx={{ color: '#555', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pneus</Typography>
        <Typography sx={{ color: ciclo.total_pneus > 0 ? '#f59e0b' : '#333', fontSize: '0.82rem', fontWeight: 700 }}>
          {ciclo.total_pneus || 0}
        </Typography>
      </Box>

      {/* Status */}
      <Box sx={{ px: 1.25, py: 0.25, bgcolor: bg, border: `1px solid ${cor}44`, borderRadius: '6px', flexShrink: 0 }}>
        <Typography sx={{ color: cor, fontWeight: 700, fontSize: '0.72rem' }}>{ciclo.status}</Typography>
      </Box>

      {/* Botão */}
      <Button
        size="small"
        variant="outlined"
        onClick={() => onMonitorar(ciclo.id)}
        startIcon={<MonitorHeartIcon sx={{ fontSize: '13px !important' }} />}
        sx={{
          flexShrink: 0,
          fontSize: '0.72rem',
          borderRadius: '6px',
          py: 0.5,
          px: 1.5,
          borderColor: `${cor}44`,
          color: cor,
          '&:hover': { borderColor: cor, bgcolor: `${cor}0f` },
        }}>
        Monitorar
      </Button>
    </Paper>
  );
}

// ─────────────────────────────────────────
// Card de ciclo (ativo ou histórico)
// ─────────────────────────────────────────
function CicloCard({ ciclo, onGerenciarPneus, onMonitorar, isAtivo = false }) {
  const cor = STATUS_COLOR[ciclo.status] || '#888';
  const bg  = STATUS_BG[ciclo.status]  || 'transparent';

  return (
    <Paper elevation={0} sx={{
      bgcolor: '#161616',
      border: `1px solid ${cor}33`,
      borderRadius: '10px',
      overflow: 'hidden',
      position: 'relative',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      '&:hover': { borderColor: `${cor}77`, boxShadow: `0 4px 20px ${cor}18` },
      '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px', bgcolor: cor },
    }}>
      <Box sx={{ p: 3 }}>
        {/* Top row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography sx={{ color: cor, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5, fontFamily: '"Outfit", sans-serif' }}>
              {fmtNumero(ciclo.numero_ciclo)}
            </Typography>
            <Typography sx={{ fontWeight: 700, color: '#e2e2e2', fontSize: '1.05rem', fontFamily: '"Outfit", sans-serif', lineHeight: 1.2 }}>
              {ciclo.maquina_nome}
            </Typography>
            {ciclo.maquina_modelo && (
              <Typography sx={{ color: '#3a3a3a', fontSize: '0.78rem', mt: 0.25 }}>{ciclo.maquina_modelo}</Typography>
            )}
          </Box>
          <Box sx={{ px: 1.25, py: 0.375, bgcolor: bg, border: `1px solid ${cor}44`, borderRadius: '6px' }}>
            <Typography sx={{ color: cor, fontWeight: 700, fontSize: '0.75rem', fontFamily: '"Outfit", sans-serif' }}>
              {ciclo.status}
            </Typography>
          </Box>
        </Box>

        {/* Stats row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 2.5 }}>
          <Box sx={{ bgcolor: '#111', border: '1px solid #1e1e1e', borderRadius: '6px', px: 1.5, py: 1 }}>
            <Typography sx={{ color: '#3a3a3a', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.25 }}>Início</Typography>
            <Typography sx={{ color: '#aaa', fontWeight: 600, fontSize: '0.82rem', fontFamily: '"Outfit", sans-serif' }}>{fmtHora(ciclo.start_time)}</Typography>
            <Typography sx={{ color: '#333', fontSize: '0.68rem' }}>{fmtDate(ciclo.start_time)}</Typography>
          </Box>
          <Box sx={{ bgcolor: '#111', border: '1px solid #1e1e1e', borderRadius: '6px', px: 1.5, py: 1 }}>
            <Typography sx={{ color: '#3a3a3a', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.25 }}>Duração</Typography>
            <Typography sx={{ color: '#aaa', fontWeight: 600, fontSize: '0.82rem', fontFamily: '"Outfit", sans-serif' }}>{fmtDur(ciclo.duracao_minutos)}</Typography>
          </Box>
          <Box sx={{ bgcolor: '#111', border: '1px solid #1e1e1e', borderRadius: '6px', px: 1.5, py: 1 }}>
            <Typography sx={{ color: '#3a3a3a', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.25 }}>Pneus</Typography>
            <Typography sx={{ color: ciclo.total_pneus > 0 ? '#f59e0b' : '#3a3a3a', fontWeight: 600, fontSize: '0.82rem', fontFamily: '"Outfit", sans-serif' }}>
              {ciclo.total_pneus || 0}/16
            </Typography>
          </Box>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isAtivo && (
            <Button size="small" variant="outlined" color="warning"
              startIcon={<TireRepairIcon sx={{ fontSize: '14px !important' }} />}
              onClick={() => onGerenciarPneus(ciclo)}
              sx={{ flex: 1, fontSize: '0.75rem', borderRadius: '6px', py: 0.75 }}>
              Pneus
            </Button>
          )}
          <Button size="small" variant="outlined"
            startIcon={<MonitorHeartIcon sx={{ fontSize: '14px !important' }} />}
            onClick={() => onMonitorar(ciclo.id)}
            sx={{ flex: 1, fontSize: '0.75rem', borderRadius: '6px', py: 0.75, borderColor: `${cor}44`, color: cor, '&:hover': { borderColor: cor, bgcolor: `${cor}0f` } }}>
            Monitorar
          </Button>
        </Box>
      </Box>
    </Paper>
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

  const [maquinas, setMaquinas] = useState([]);
  const [loadingMaquinas, setLoadingMaquinas] = useState(true);

  const [ciclosAtivos, setCiclosAtivos] = useState([]);
  const [loadingAtivos, setLoadingAtivos] = useState(false);
  const [cicloGerenciar, setCicloGerenciar] = useState(null);

  const [codigoPneu, setCodigoPneu] = useState('');
  const [resultadoPneu, setResultadoPneu] = useState(null);
  const [loadingPneu, setLoadingPneu] = useState(false);
  const [erroPneu, setErroPneu] = useState('');

  const [maquinaSelecionada, setMaquinaSelecionada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [ciclos, setCiclos] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [erroHistorico, setErroHistorico] = useState('');
  const [sortCol, setSortCol] = useState('start_time');
  const [sortDir, setSortDir] = useState('desc');

  // ── Auth ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate('/login');
    });
  }, [navigate]);

  // ── Empresa ───────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => { if (data) setEmpresaId(data.empresa_id); });
  }, [session]);

  // ── Máquinas ──────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    setLoadingMaquinas(true);
    axios.get(`${API_URL}/api/maquinas`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => setMaquinas(r.data))
      .catch(() => {})
      .finally(() => setLoadingMaquinas(false));
  }, [session]);

  // ── Ciclos ativos ─────────────────────────────────────────────
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
    } catch { setCiclosAtivos([]); }
    finally { setLoadingAtivos(false); }
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchCiclosAtivos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchCiclosAtivosRef = useRef(fetchCiclosAtivos);
  fetchCiclosAtivosRef.current = fetchCiclosAtivos;

  // ── WebSocket ─────────────────────────────────────────────────
  useEffect(() => {
    if (!empresaId) return;
    const socket = socketIo(API_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join_empresa', empresaId));
    socket.on('ciclo_iniciado', () => fetchCiclosAtivosRef.current());
    socket.on('ciclo_encerrado', () => fetchCiclosAtivosRef.current());
    return () => socket.disconnect();
  }, [empresaId]);

  // ── Histórico — busca com filtros opcionais ───────────────────
  const fetchCiclosHistorico = useCallback(async (params = {}) => {
    if (!sessionRef.current) return;
    setLoadingHistorico(true);
    setErroHistorico('');
    setCiclos([]);
    try {
      const r = await axios.get(`${API_URL}/api/ciclos`, {
        headers: { Authorization: `Bearer ${sessionRef.current.access_token}` },
        params,
      });
      setCiclos(r.data);
      if (r.data.length === 0) setErroHistorico('Nenhum ciclo encontrado para os filtros selecionados.');
    } catch (err) {
      setErroHistorico('Erro ao buscar ciclos: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingHistorico(false);
    }
  }, []);

  // Auto-carregar histórico ao abrir a página
  useEffect(() => {
    if (!session) return;
    fetchCiclosHistorico();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleBuscarCiclos = () => {
    const params = {};
    if (maquinaSelecionada) params.maquina_id = maquinaSelecionada;
    if (dataInicio) params.data_inicio = new Date(dataInicio + 'T00:00:00').toISOString();
    if (dataFim)    params.data_fim    = new Date(dataFim    + 'T23:59:59').toISOString();
    fetchCiclosHistorico(params);
  };

  const handleLimparFiltros = () => {
    setMaquinaSelecionada('');
    setDataInicio('');
    setDataFim('');
    fetchCiclosHistorico();
  };

  // ── Busca por pneu ────────────────────────────────────────────
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
      if (r.data.length === 0) setErroPneu(`Nenhum ciclo encontrado para o pneu "${codigo}".`);
      else setResultadoPneu(r.data);
    } catch { setErroPneu('Erro ao buscar pneu.'); }
    finally { setLoadingPneu(false); }
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#0f0f0f', minHeight: '100vh' }}>

      {/* ── AppBar ─────────────────────────────────────────────── */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#111', borderBottom: '1px solid #1e1e1e' }}>
        <Toolbar sx={{ px: 4, minHeight: '56px !important' }}>
          <IconButton edge="start" size="small" onClick={() => navigate('/')}
            sx={{ color: '#555', mr: 2, '&:hover': { color: '#aaa' } }}>
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#e2e2e2', fontFamily: '"Outfit", sans-serif' }}>
            Ciclos de Produção
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>

        {/* ══════════════════════════════════════
            SEÇÃO A — Ciclos em Andamento
            ══════════════════════════════════════ */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <SectionLabel
              icon={<PlayCircleOutlineIcon sx={{ color: '#4ade80', fontSize: 20 }} />}
              label="Ciclos em Andamento"
            />
            {loadingAtivos && <CircularProgress size={14} sx={{ ml: -1, mt: '-2px' }} />}
            <Button size="small" onClick={fetchCiclosAtivos}
              sx={{ ml: 'auto', color: '#444', fontSize: '0.72rem', '&:hover': { color: '#aaa' } }}>
              Atualizar
            </Button>
          </Box>

          {ciclosAtivos.length === 0 && !loadingAtivos ? (
            <Box sx={{ py: 3, px: 2.5, bgcolor: '#111', border: '1px dashed #1e1e1e', borderRadius: '10px', textAlign: 'center' }}>
              <Typography sx={{ color: '#333', fontSize: '0.875rem' }}>
                Nenhum ciclo ativo no momento — o CLP inicia ciclos automaticamente.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {ciclosAtivos.map(ciclo => (
                <Box key={ciclo.id} sx={{ flex: '1 1 320px', maxWidth: 480 }}>
                  <CicloCard
                    ciclo={ciclo}
                    isAtivo
                    onGerenciarPneus={setCicloGerenciar}
                    onMonitorar={(id) => navigate(`/ciclo/${id}`)}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ height: '1px', bgcolor: '#161616', mb: 4 }} />

        {/* ══════════════════════════════════════
            SEÇÃO B — Busca por Pneu
            ══════════════════════════════════════ */}
        <Box sx={{ mb: 4 }}>
          <SectionLabel
            icon={<TireRepairIcon sx={{ color: '#f59e0b', fontSize: 20 }} />}
            label="Rastreabilidade — Buscar por Pneu"
          />

          <Paper elevation={0} sx={{ p: 3, bgcolor: '#161616', border: '1px solid #222', borderRadius: '10px' }}>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
              <TextField
                fullWidth
                size="small"
                label="Código do pneu"
                placeholder="Ex: PN-2024-0042"
                value={codigoPneu}
                onChange={e => setCodigoPneu(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBuscarPneu()}
                InputProps={{
                  sx: { fontFamily: 'monospace', fontSize: '0.9rem' },
                  startAdornment: <InputAdornment position="start"><TireRepairIcon sx={{ color: '#444', fontSize: 18 }} /></InputAdornment>,
                }}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#111', borderRadius: '8px' } }}
              />
              <Button
                variant="contained"
                size="small"
                sx={{ minWidth: 140, bgcolor: '#f59e0b', color: '#000', fontWeight: 700, borderRadius: '8px', '&:hover': { bgcolor: '#d97706' }, flexShrink: 0 }}
                startIcon={loadingPneu ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />}
                onClick={handleBuscarPneu}
                disabled={loadingPneu || !codigoPneu.trim()}>
                {loadingPneu ? 'Buscando…' : 'Buscar Pneu'}
              </Button>
            </Box>

            {erroPneu && (
              <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setErroPneu('')}>{erroPneu}</Alert>
            )}

            {resultadoPneu && resultadoPneu.length > 0 && (
              <Box sx={{ mt: 2.5 }}>
                <Typography sx={{ color: '#4ade80', fontWeight: 600, fontSize: '0.82rem', mb: 1.5 }}>
                  {resultadoPneu.length} ciclo(s) encontrado(s) para "{codigoPneu}"
                </Typography>
                <Stack spacing={1}>
                  {resultadoPneu.map(ciclo => (
                    <Box key={ciclo.id} sx={{ maxWidth: 600 }}>
                      <CicloCard
                        ciclo={ciclo}
                        onGerenciarPneus={() => {}}
                        onMonitorar={(id) => navigate(`/ciclo/${id}`)}
                      />
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Paper>
        </Box>

        <Box sx={{ height: '1px', bgcolor: '#161616', mb: 4 }} />

        {/* ══════════════════════════════════════
            SEÇÃO C — Histórico de Ciclos
            ══════════════════════════════════════ */}
        <Box>
          <SectionLabel
            icon={<HistoryIcon sx={{ color: '#60a5fa', fontSize: 20 }} />}
            label="Histórico de Ciclos"
          />

          {/* ── Painel de filtros ─────────────────────── */}
          <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: '#161616', border: '1px solid #222', borderRadius: '10px' }}>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#3a3a3a', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 2 }}>
              Filtrar resultados
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>

              {/* Máquina */}
              <FormControl size="small" sx={{ minWidth: 220, flex: '1 1 200px' }}>
                <InputLabel sx={{ fontSize: '0.82rem' }}>Máquina</InputLabel>
                <Select
                  value={maquinaSelecionada}
                  label="Máquina"
                  onChange={e => setMaquinaSelecionada(e.target.value)}
                  disabled={loadingMaquinas}
                  sx={{ bgcolor: '#111', borderRadius: '8px', fontSize: '0.875rem' }}
                >
                  <MenuItem value=""><em>Todas as máquinas</em></MenuItem>
                  {maquinas.map(m => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.nome}{m.modelo ? ` (${m.modelo})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Data Início */}
              <TextField
                size="small"
                label="Data início"
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><CalendarTodayIcon sx={{ color: '#3a3a3a', fontSize: 15 }} /></InputAdornment>,
                }}
                sx={{ flex: '1 1 160px', minWidth: 160, '& .MuiOutlinedInput-root': { bgcolor: '#111', borderRadius: '8px', fontSize: '0.875rem' } }}
              />

              {/* Data Fim */}
              <TextField
                size="small"
                label="Data fim"
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><CalendarTodayIcon sx={{ color: '#3a3a3a', fontSize: 15 }} /></InputAdornment>,
                }}
                sx={{ flex: '1 1 160px', minWidth: 160, '& .MuiOutlinedInput-root': { bgcolor: '#111', borderRadius: '8px', fontSize: '0.875rem' } }}
              />

              {/* Botões */}
              <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={loadingHistorico ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />}
                  onClick={handleBuscarCiclos}
                  disabled={loadingHistorico}
                  sx={{ bgcolor: '#3b82f6', fontWeight: 700, borderRadius: '8px', px: 2.5, py: 1, '&:hover': { bgcolor: '#2563eb' } }}>
                  {loadingHistorico ? 'Buscando…' : 'Filtrar'}
                </Button>
                {(maquinaSelecionada || dataInicio || dataFim) && (
                  <Button
                    size="small"
                    onClick={handleLimparFiltros}
                    sx={{ color: '#444', borderRadius: '8px', px: 1.5, '&:hover': { color: '#aaa' } }}>
                    Limpar
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>

          {erroHistorico && (
            <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setErroHistorico('')}>{erroHistorico}</Alert>
          )}

          {loadingHistorico && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          )}

          {/* ── Lista de ciclos ──────────────────────── */}
          {ciclos.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: '0.72rem', color: '#3a3a3a', mb: 1.5, fontWeight: 600 }}>
                {ciclos.length} ciclo(s) encontrado(s)
              </Typography>

              {/* Cabeçalho ordenável */}
              <CicloTableHeader
                sortCol={sortCol}
                sortDir={sortDir}
                onSort={(col) => {
                  if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                  else { setSortCol(col); setSortDir('asc'); }
                }}
              />

              <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                {[...ciclos]
                  .sort((a, b) => {
                    let va, vb;
                    if (sortCol === 'numero_ciclo') { va = a.numero_ciclo ?? 0; vb = b.numero_ciclo ?? 0; }
                    else if (sortCol === 'maquina_nome') { va = a.maquina_nome ?? ''; vb = b.maquina_nome ?? ''; }
                    else if (sortCol === 'start_time') { va = new Date(a.start_time ?? 0); vb = new Date(b.start_time ?? 0); }
                    else if (sortCol === 'duracao_minutos') { va = a.duracao_minutos ?? 0; vb = b.duracao_minutos ?? 0; }
                    else if (sortCol === 'total_pneus') { va = a.total_pneus ?? 0; vb = b.total_pneus ?? 0; }
                    else if (sortCol === 'status') { va = a.status ?? ''; vb = b.status ?? ''; }
                    else return 0;
                    if (va < vb) return sortDir === 'asc' ? -1 : 1;
                    if (va > vb) return sortDir === 'asc' ?  1 : -1;
                    return 0;
                  })
                  .map(ciclo => (
                    <CicloRow
                      key={ciclo.id}
                      ciclo={ciclo}
                      onMonitorar={(id) => navigate(`/ciclo/${id}`)}
                    />
                  ))}
              </Stack>
            </Box>
          )}
        </Box>

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
