import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { 
  Typography, 
  Box, 
  Button, 
  AppBar, 
  Toolbar, 
  IconButton,
  LinearProgress,
  Snackbar,
  Tabs,
  Tab,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import RefreshOutlined from '@mui/icons-material/RefreshOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import SpeedOutlined from '@mui/icons-material/SpeedOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ProductionQuantityLimitsOutlined from '@mui/icons-material/ProductionQuantityLimitsOutlined';
import ThermostatOutlined from '@mui/icons-material/ThermostatOutlined';
import HistoryIcon from '@mui/icons-material/History';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import TableChartIcon from '@mui/icons-material/TableChart';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { supabase } from '../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';

import DataCard from './DataCard';
import GaugeChart from './GaugeChart';
import LineChart from './LineChart';
import soundManager from '../utils/soundManager';

function SectionLabel({ label }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
      <Typography sx={{
        fontSize: '0.65rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: '#3a3a3a',
        fontFamily: '"Outfit", sans-serif',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: '#1c1c1c' }} />
    </Box>
  );
}

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function Dashboard() {
  const navigate = useNavigate();
  const { maquinaId } = useParams();

  const [session, setSession]               = useState(null);
  const [maquinas, setMaquinas]             = useState([]);
  const [maquinaSelecionada, setMaquinaSelecionada] = useState(maquinaId || '');
  const [liveData, setLiveData]             = useState(null);
  const [filteredData, setFilteredData]     = useState([]); // leituras da máquina atual, ordem ASC
  const [isLoading, setIsLoading]           = useState(true);
  const [lastUpdate, setLastUpdate]         = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [empresaNome, setEmpresaNome]       = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationData, setNotificationData] = useState(null);

  // Ref para rastrear a máquina atual dentro dos handlers de socket (evita closure stale)
  const maquinaAtualRef    = useRef(maquinaId || '');
  const sessionRef         = useRef(null);
  // Guarda o ID inicial da URL para uso no efeito de carga (sem entrar nas deps)
  const initialMaquinaId   = useRef(maquinaId || '');

  // ─── Busca leituras de UMA máquina específica ──────────────
  const fetchDataForMaquina = useCallback(async (mid, sess) => {
    const s = sess ?? sessionRef.current;
    if (!s || !mid) {
      setLiveData(null);
      setFilteredData([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/leituras`, {
        headers: { Authorization: `Bearer ${s.access_token}` },
        params: { maquina_id: mid },
      });
      // API retorna mais recente primeiro → inverter para gráficos (ASC)
      const asc = (res.data || []).slice().sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      setFilteredData(asc);
      // liveData = último da lista ASC = mais recente
      setLiveData(asc.length > 0 ? asc[asc.length - 1] : null);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Erro ao buscar leituras:', err);
      setFilteredData([]);
      setLiveData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Sessão ────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setSession(session);
      sessionRef.current = session;

      let empresaId = localStorage.getItem('empresa_id');
      if (!empresaId) {
        const { data: v } = await supabase
          .from('usuarios_empresas')
          .select('empresa_id, empresas(nome)')
          .eq('user_id', session.user.id)
          .single();
        if (v) {
          empresaId = String(v.empresa_id);
          localStorage.setItem('empresa_id', empresaId);
          if (v.empresas?.nome) {
            localStorage.setItem('empresa_nome', v.empresas.nome);
            setEmpresaNome(v.empresas.nome);
          }
        }
      }
      const n = localStorage.getItem('empresa_nome');
      if (n) setEmpresaNome(n);
    };
    init();
  }, []);

  // ─── Carrega máquinas UMA VEZ quando sessão pronta ─────────
  // Não usa maquinaId nem navigate como deps para evitar re-disparar
  // ao trocar de aba (que muda a URL e consequentemente maquinaId).
  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/maquinas`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const lista = res.data || [];
        setMaquinas(lista);

        // Determinar máquina inicial a partir do ID que veio na URL
        const idUrl  = initialMaquinaId.current;
        const existe = idUrl && lista.find(m => String(m.id) === idUrl);
        const inicial = existe ? idUrl : (lista.length > 0 ? String(lista[0].id) : '');

        if (inicial) {
          maquinaAtualRef.current = inicial;
          // Sempre busca os dados diretamente após carregar as máquinas, passando
          // a sessão explicitamente. Isso cobre o caso onde maquinaSelecionada já
          // tinha o mesmo valor (acesso direto via URL) e o useEffect abaixo não
          // dispara novamente por não haver mudança de estado.
          setMaquinaSelecionada(inicial);
          fetchDataForMaquina(inicial, session);
          if (!existe && lista.length > 0) {
            navigate(`/dashboard/${inicial}`, { replace: true });
          }
        }
      } catch (err) {
        console.error('Erro ao buscar máquinas:', err);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, fetchDataForMaquina]); // fetchDataForMaquina é estável (useCallback sem deps)

  // ─── Sempre que maquinaSelecionada mudar → re-busca dados ──
  useEffect(() => {
    const mid = String(maquinaSelecionada || '');
    if (!mid) return;
    maquinaAtualRef.current = mid;
    fetchDataForMaquina(mid);
  }, [maquinaSelecionada, fetchDataForMaquina]);

  // ─── WebSocket ─────────────────────────────────────────────
  useEffect(() => {
    socket.on('connect', () => {
      const eId = localStorage.getItem('empresa_id');
      if (eId) socket.emit('join_empresa', eId);
      setConnectionStatus('connected');
    });
    socket.on('disconnect',    () => setConnectionStatus('disconnected'));
    socket.on('connect_error', () => setConnectionStatus('disconnected'));
    socket.on('connected',     () => setConnectionStatus('connected'));

    // Entrar no room se já conectado
    const eId = localStorage.getItem('empresa_id');
    if (eId && socket.connected) socket.emit('join_empresa', eId);

    socket.on('mqtt_message', (message) => {
      try {
        const parsed = typeof message === 'string' ? JSON.parse(message) : message;
        if (!parsed.created_at) parsed.created_at = new Date().toISOString();

        // Só atualiza liveData/histórico se for da máquina que está sendo exibida
        if (String(parsed.maquina_id) === maquinaAtualRef.current) {
          setLiveData(parsed);
          setFilteredData(prev => {
            const next = [...prev, parsed];
            return next.length > 200 ? next.slice(next.length - 200) : next;
          });
          setLastUpdate(new Date());
        }
      } catch (err) {
        console.error('Erro ao processar MQTT:', err);
      }
    });

    socket.on('new_notification', (notification) => {
      try {
        soundManager.play(notification.prioridade || 'media', notification.tipoLimite || 'max');
        setNotificationData(notification);
        setNotificationOpen(true);
      } catch (err) {
        console.error('Erro ao processar notificação:', err);
      }
    });

    return () => {
      socket.off('mqtt_message');
      socket.off('new_notification');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('connected');
    };
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('empresa_id');
    localStorage.removeItem('empresa_nome');
    localStorage.removeItem('user_role');
    await supabase.auth.signOut();
  };

  const handleCloseNotification = (_, reason) => {
    if (reason === 'clickaway') return;
    setNotificationOpen(false);
  };

  const handleRefresh = () => {
    if (maquinaSelecionada) fetchDataForMaquina(maquinaSelecionada);
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

  // Dados históricos ordenados ASC (mais antigo → mais recente)
  const sortedData = useMemo(() =>
    [...filteredData].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [filteredData]
  );

  // ─── Janelas horárias disponíveis ────────────────────────────
  // Cada janela representa 1 hora com ao menos 1 registro
  const availableWindows = useMemo(() => {
    if (!sortedData.length) return [];
    const windows = [];
    // Hora arredondada para baixo do primeiro registro
    const first = new Date(sortedData[0].created_at);
    first.setMinutes(0, 0, 0);
    const last = new Date(sortedData[sortedData.length - 1].created_at);
    const endHour = new Date(last);
    endHour.setMinutes(0, 0, 0);
    endHour.setHours(endHour.getHours() + 1);

    const cursor = new Date(first);
    while (cursor <= endHour) {
      const wStart = new Date(cursor);
      const wEnd   = new Date(cursor);
      wEnd.setHours(wEnd.getHours() + 1);
      if (sortedData.some(d => {
        const t = new Date(d.created_at);
        return t >= wStart && t < wEnd;
      })) {
        windows.push({ start: wStart, end: wEnd });
      }
      cursor.setHours(cursor.getHours() + 1);
    }
    return windows;
  }, [sortedData]);

  // Índice da janela selecionada; -1 = aguardando dados
  const [windowIndex, setWindowIndex] = useState(-1);

  // Sempre que as janelas disponíveis mudam, posiciona na última (mais recente)
  useEffect(() => {
    if (availableWindows.length > 0) {
      setWindowIndex(availableWindows.length - 1);
    }
  }, [availableWindows.length]);

  // Quando chegam dados ao vivo, avança automaticamente para a janela mais recente
  useEffect(() => {
    if (availableWindows.length > 0) {
      setWindowIndex(prev => {
        // só avança se o usuário estiver na janela mais recente ou não houver seleção
        if (prev === availableWindows.length - 2 || prev === -1) {
          return availableWindows.length - 1;
        }
        return prev;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableWindows.length]);

  const currentWindow = availableWindows[windowIndex] ?? null;

  // Filtra dados para a janela selecionada
  const windowedData = useMemo(() => {
    if (!currentWindow) return sortedData;
    return sortedData.filter(d => {
      const t = new Date(d.created_at);
      return t >= currentWindow.start && t < currentWindow.end;
    });
  }, [sortedData, currentWindow]);

  // ─── Séries dos gráficos (usam windowedData) ─────────────────
  const lineSeries = useMemo(() => [{
    name: 'Temperatura',
    data: windowedData.map(d => [
      d.created_at ? new Date(d.created_at).getTime() : Date.now(),
      d.temperatura != null ? parseFloat(d.temperatura) : 0,
    ]),
  }], [windowedData]);

  const vibrationSeries = useMemo(() => [{
    name: 'Pressão',
    data: windowedData.map(d => [
      d.created_at ? new Date(d.created_at).getTime() : Date.now(),
      d.vibracao != null ? parseFloat(d.vibracao) : 0,
    ]),
  }], [windowedData]);

  const productionSeries = useMemo(() => [{
    name: 'Peças Produzidas',
    data: windowedData.map(d => [
      d.created_at ? new Date(d.created_at).getTime() : Date.now(),
      d.pecas_produzidas != null ? parseInt(d.pecas_produzidas) : 0,
    ]),
  }], [windowedData]);

  const pressureSeries = useMemo(() => [
    {
      name: 'Pressão Envelope',
      data: windowedData.map(d => [
        d.created_at ? new Date(d.created_at).getTime() : Date.now(),
        d.pressao_envelope != null ? parseFloat(d.pressao_envelope) : 0,
      ]),
    },
    {
      name: 'Pressão Saco de Ar',
      data: windowedData.map(d => [
        d.created_at ? new Date(d.created_at).getTime() : Date.now(),
        d.pressao_saco_ar != null ? parseFloat(d.pressao_saco_ar) : 0,
      ]),
    },
  ], [windowedData]);

  // ─── Helpers de formatação ────────────────────────────────────
  const fmtHour = (date) =>
    date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const fmtWindowLabel = (w) =>
    `${fmtHour(w.start)} – ${fmtHour(w.end)}`;

  const maquinaAtual = maquinas.find(m => String(m.id) === String(maquinaSelecionada));

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#0f0f0f', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#111', borderBottom: '1px solid #1e1e1e' }}>
        <Toolbar sx={{ px: 4, minHeight: '56px !important', gap: 1 }}>
          {/* Logo / breadcrumb */}
          <Box
            onClick={() => navigate('/')}
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: 4, cursor: 'pointer', '&:hover img': { opacity: 0.8 }, '&:hover .empresa-nome': { color: '#aaa' } }}
          >
            <img src="/habilita_logo.svg" alt="Habilita" style={{ height: 28, width: 'auto', transition: 'opacity 0.2s' }} />
            <Typography sx={{ color: '#2a2a2a', fontSize: '0.875rem' }}>/</Typography>
            <Typography className="empresa-nome" sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#888', transition: 'color 0.2s' }}>
              {maquinaAtual?.nome || 'Dashboard'}
            </Typography>
          </Box>

          {/* Nav */}
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 0.5 }}>
            {[
              { label: 'Visão Geral', icon: <DashboardIcon sx={{ fontSize: 15 }} />, onClick: () => navigate('/') },
              { label: 'Status', icon: <MonitorHeartIcon sx={{ fontSize: 15 }} />, onClick: () => navigate('/status-maquina') },
              { label: 'Máquinas', icon: <PrecisionManufacturingIcon sx={{ fontSize: 15 }} />, onClick: () => navigate('/maquinas') },
              { label: 'Ciclos', icon: <HistoryIcon sx={{ fontSize: 15 }} />, onClick: () => navigate('/ciclos') },
              { label: 'Registros', icon: <TableChartIcon sx={{ fontSize: 15 }} />, onClick: () => navigate('/registros') },
              { label: 'Notificações', icon: <NotificationsActiveIcon sx={{ fontSize: 15 }} />, onClick: () => navigate('/notificacoes') },
            ].map(({ label, icon, onClick }) => (
              <Button key={label} variant="text" startIcon={icon} onClick={onClick}
                sx={{ color: '#666', fontWeight: 500, fontSize: '0.8125rem', px: 1.5, py: 0.75, minWidth: 0, borderBottom: '2px solid transparent', borderRadius: 0, '&:hover': { color: '#e2e2e2', background: 'transparent', borderBottomColor: '#3a3a3a' } }}>
                {label}
              </Button>
            ))}
          </Box>

          {/* Direita */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, bgcolor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: connectionStatus === 'connected' ? '#22c55e' : '#444' }} />
              <Typography variant="caption" sx={{ color: connectionStatus === 'connected' ? '#22c55e' : '#555', fontWeight: 600, fontSize: '0.7rem' }}>
                {connectionStatus === 'connected' ? 'Online' : connectionStatus === 'connecting' ? 'Conectando' : 'Offline'}
              </Typography>
            </Box>
            {lastUpdate && (
              <Typography variant="caption" sx={{ color: '#444', fontSize: '0.7rem' }}>
                {lastUpdate.toLocaleTimeString()}
              </Typography>
            )}
            <IconButton size="small" onClick={handleRefresh} disabled={isLoading} sx={{ color: '#555', '&:hover': { color: '#aaa' } }}>
              <RefreshOutlined sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" onClick={() => navigate('/configuracoes')} sx={{ color: '#555', '&:hover': { color: '#aaa' } }}>
              <SettingsIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <Box sx={{ width: 1, height: 24, bgcolor: '#2a2a2a', mx: 0.5 }} />
            <Button size="small" startIcon={<LogoutOutlined sx={{ fontSize: 14 }} />} onClick={handleLogout}
              sx={{ color: '#555', fontSize: '0.75rem', fontWeight: 600, px: 1.5, '&:hover': { color: '#aaa' } }}>
              Sair
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Loading Indicator */}
      {isLoading && <LinearProgress sx={{ height: 3 }} />}

      {/* Tabs de máquinas */}
      {maquinas.length > 0 && (
        <Box sx={{ bgcolor: '#111', borderBottom: '1px solid #1e1e1e', px: 4 }}>
          <Tabs
            value={maquinaSelecionada || false}
            onChange={(_, val) => {
              const id = String(val);
              maquinaAtualRef.current = id;
              setMaquinaSelecionada(id);
              navigate(`/dashboard/${id}`, { replace: true });
            }}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{ style: { background: '#3b82f6', height: 2 } }}
            sx={{
              minHeight: 44,
              '& .MuiTab-root': {
                color: '#555',
                fontWeight: 600,
                fontSize: '0.8125rem',
                textTransform: 'none',
                minHeight: 44,
                px: 2,
                '&.Mui-selected': { color: '#e2e2e2' },
                '&:hover': { color: '#aaa' },
              },
            }}
          >
            {maquinas.map((m) => (
              <Tab key={m.id} value={m.id} label={m.nome} />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ py: 3.5, px: { xs: 2, md: 4 } }}>

        {/* ── Seção 1: KPIs ─────────────────────────────────── */}
        <SectionLabel label="Leitura em Tempo Real" />
        <Box sx={{ display: 'flex', gap: 2, mb: 3.5, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          {[
            { title: 'Temperatura',      value: liveData ? liveData.temperatura?.toFixed(1) : null, unit: '°C',  icon: <ThermostatOutlined />,              threshold: true },
            { title: 'Pressão',          value: liveData ? liveData.vibracao?.toFixed(2) : null,    unit: 'Pa',  icon: <SpeedOutlined />,                  threshold: true },
            { title: 'Status da Máquina',value: liveData ? liveData.status : null,                  unit: null,  icon: <CheckCircleOutlined />,             isStatus: true  },
            { title: 'Peças Produzidas', value: liveData ? liveData.pecas_produzidas : null,         unit: 'un',  icon: <ProductionQuantityLimitsOutlined />                },
          ].map(({ title, value, unit, icon, threshold, isStatus }) => (
            <Box key={title} sx={{ flex: '1 1 0', minWidth: { xs: 'calc(50% - 8px)', sm: 0 }, display: 'flex' }}>
              <DataCard title={title} value={value} unit={unit} icon={icon} threshold={threshold} isStatus={isStatus} />
            </Box>
          ))}
        </Box>

        {/* ── Navegação por janela horária ──────────────────── */}
        {availableWindows.length > 0 && (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 3,
            px: 2,
            py: 1.25,
            bgcolor: '#141414',
            border: '1px solid #1e1e1e',
            borderRadius: '8px',
            flexWrap: 'wrap',
          }}>
            {/* Ícone + label */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mr: 0.5 }}>
              <AccessTimeIcon sx={{ fontSize: 14, color: '#3a3a3a' }} />
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#3a3a3a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Período
              </Typography>
            </Box>

            {/* Seta anterior */}
            <Tooltip title="Hora anterior">
              <span>
                <IconButton
                  size="small"
                  disabled={windowIndex <= 0}
                  onClick={() => setWindowIndex(i => i - 1)}
                  sx={{ color: windowIndex <= 0 ? '#252525' : '#555', '&:hover': { color: '#aaa' }, p: 0.5 }}
                >
                  <ChevronLeftIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>

            {/* Label da janela atual */}
            <Typography sx={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: '#ccc',
              fontFamily: '"Outfit", sans-serif',
              minWidth: 130,
              textAlign: 'center',
            }}>
              {currentWindow ? fmtWindowLabel(currentWindow) : '—'}
            </Typography>

            {/* Seta próxima */}
            <Tooltip title="Próxima hora">
              <span>
                <IconButton
                  size="small"
                  disabled={windowIndex >= availableWindows.length - 1}
                  onClick={() => setWindowIndex(i => i + 1)}
                  sx={{ color: windowIndex >= availableWindows.length - 1 ? '#252525' : '#555', '&:hover': { color: '#aaa' }, p: 0.5 }}
                >
                  <ChevronRightIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>

            {/* Separador */}
            <Box sx={{ width: 1, height: 20, bgcolor: '#1e1e1e', mx: 0.5 }} />

            {/* Seletor rápido de hora */}
            <Select
              size="small"
              value={windowIndex >= 0 ? windowIndex : ''}
              onChange={(e) => setWindowIndex(Number(e.target.value))}
              displayEmpty
              sx={{
                fontSize: '0.78rem',
                color: '#888',
                bgcolor: '#111',
                border: '1px solid #222',
                borderRadius: '6px',
                '& .MuiSelect-select': { py: 0.6, px: 1.5 },
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '& .MuiSvgIcon-root': { color: '#444' },
                minWidth: 160,
              }}
            >
              {availableWindows.map((w, i) => (
                <MenuItem key={i} value={i} sx={{ fontSize: '0.8rem' }}>
                  {fmtWindowLabel(w)}
                  {i === availableWindows.length - 1 && (
                    <Typography component="span" sx={{ ml: 1, fontSize: '0.68rem', color: '#22c55e', fontWeight: 700 }}>
                      ao vivo
                    </Typography>
                  )}
                </MenuItem>
              ))}
            </Select>

            {/* Contador de janelas */}
            <Typography sx={{ fontSize: '0.68rem', color: '#2a2a2a', ml: 'auto' }}>
              {windowIndex + 1} / {availableWindows.length}
            </Typography>
          </Box>
        )}

        {/* ── Seção 2: Gauge + Histórico de Temperatura ─────── */}
        <SectionLabel label="Temperatura" />
        <Box sx={{ display: 'flex', gap: 2, mb: 3.5, alignItems: 'stretch', flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
            <GaugeChart series={gaugeSeries} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <LineChart
              series={lineSeries}
              title="Histórico de Temperatura"
              unit="°C"
              color="#3b82f6"
              scrollable
            />
          </Box>
        </Box>

        {/* ── Seção 3: Pressão + Produção ───────────────────── */}
        <SectionLabel label="Pressão e Produção" />
        <Box sx={{ display: 'flex', gap: 2, mb: 3.5, alignItems: 'stretch', flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <LineChart
              series={vibrationSeries}
              title="Pressão"
              unit="Pa"
              color="#6366f1"
              scrollable
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <LineChart
              series={productionSeries}
              title="Produção Acumulada"
              unit="un"
              color="#22c55e"
              scrollable
            />
          </Box>
        </Box>

        {/* ── Seção 4: Pressões Envelope e Saco de Ar ───────── */}
        <SectionLabel label="Pressões — Envelope e Saco de Ar" />
        <Box sx={{ mb: 3 }}>
          <LineChart
            series={pressureSeries}
            title="Pressões — Envelope e Saco de Ar"
            unit="bar"
            scrollable
          />
        </Box>

      </Box>
      
      {/* Notificação */}
      <Snackbar
        open={notificationOpen}
        autoHideDuration={8000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Box sx={{
          minWidth: 320,
          bgcolor: '#1a1a1a',
          border: '1px solid',
          borderColor: (() => {
            const p = notificationData?.prioridade;
            if (p === 'critica') return 'rgba(239,68,68,0.5)';
            if (p === 'alta') return notificationData?.tipoLimite === 'min' ? 'rgba(59,130,246,0.5)' : 'rgba(245,158,11,0.5)';
            return '#2a2a2a';
          })(),
          borderRadius: '8px',
          p: 2,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
        }}>
          <Box sx={{ width: 3, alignSelf: 'stretch', borderRadius: 1, flexShrink: 0, bgcolor: (() => {
            const p = notificationData?.prioridade;
            if (p === 'critica') return '#ef4444';
            if (p === 'alta') return notificationData?.tipoLimite === 'min' ? '#3b82f6' : '#f59e0b';
            if (p === 'media') return '#f59e0b';
            return '#555';
          })() }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#d0d0d0', mb: 0.25 }}>
              {notificationData?.maquina_nome || 'Alerta'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#888' }}>
              {notificationData?.mensagem}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleCloseNotification} sx={{ color: '#555', '&:hover': { color: '#aaa' }, p: 0.5 }}>
            ✕
          </IconButton>
        </Box>
      </Snackbar>
    </Box>
  );
}

export default Dashboard;
