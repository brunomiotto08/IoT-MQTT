import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Container, 
  Box, 
  Typography, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Badge colorido para valores numéricos (temperatura, pressão…)
function ValueBadge({ value, color, fmt }) {
  if (value == null) return <Typography sx={{ color: '#2a2a2a', fontSize: '0.78rem' }}>—</Typography>;
  const c = color ?? '#555';
  return (
    <Box sx={{
      display: 'inline-flex',
      alignItems: 'center',
      px: 1,
      py: 0.25,
      bgcolor: `${c}18`,
      border: `1px solid ${c}40`,
      borderRadius: '6px',
      minWidth: 64,
      justifyContent: 'center',
    }}>
      <Typography sx={{ color: c, fontWeight: 700, fontSize: '0.8rem', fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.01em', lineHeight: 1.4 }}>
        {fmt(value)}
      </Typography>
    </Box>
  );
}

// Badge de status (ligado/desligado/aberta/fechada…)
const STATUS_BADGE = {
  ligado:   { color: '#22c55e', label: 'Ligado' },
  ativo:    { color: '#22c55e', label: 'Ativo' },
  aberta:   { color: '#22c55e', label: 'Aberta' },
  desligado:{ color: '#f59e0b', label: 'Desligado' },
  parado:   { color: '#f59e0b', label: 'Parado' },
  fechada:  { color: '#6b7280', label: 'Fechada' },
  erro:     { color: '#ef4444', label: 'Erro' },
  falha:    { color: '#ef4444', label: 'Falha' },
};

function StatusBadge({ value }) {
  if (!value) return <Typography sx={{ color: '#2a2a2a', fontSize: '0.78rem' }}>—</Typography>;
  const cfg = STATUS_BADGE[value.toLowerCase()] ?? { color: '#555', label: value };
  return (
    <Box sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      px: 1,
      py: 0.25,
      bgcolor: `${cfg.color}18`,
      border: `1px solid ${cfg.color}40`,
      borderRadius: '6px',
    }}>
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
      <Typography sx={{ color: cfg.color, fontWeight: 700, fontSize: '0.72rem', fontFamily: '"Outfit", sans-serif', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
        {cfg.label}
      </Typography>
    </Box>
  );
}

function Registros() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [leituras, setLeituras] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [empresaNome, setEmpresaNome] = useState('');
  
  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Filtros
  const [maquinas, setMaquinas] = useState([]);
  const [maquinaSelecionada, setMaquinaSelecionada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        const empresaNomeLS = localStorage.getItem('empresa_nome');
        if (empresaNomeLS) setEmpresaNome(empresaNomeLS);
        
        fetchMaquinas(session);
        fetchLeituras(session);
      }
    };
    getSession();
  }, []);
  
  const fetchMaquinas = async (session) => {
    try {
      const response = await axios.get(`${API_URL}/api/maquinas`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      setMaquinas(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar máquinas:', error);
    }
  };
  
  const fetchLeituras = async (sessionParam) => {
    const currentSession = sessionParam || session;
    if (!currentSession) return;
    
    try {
      setIsLoading(true);
      
      // Construir parâmetros de query
      let url = `${API_URL}/api/leituras`;
      const params = new URLSearchParams();
      
      if (maquinaSelecionada) params.append('maquina_id', maquinaSelecionada);
      if (dataInicio) params.append('data_inicio', new Date(dataInicio + 'T00:00:00').toISOString());
      if (dataFim) params.append('data_fim', new Date(dataFim + 'T23:59:59').toISOString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`
        }
      });
      
      // Ordenar por data mais recente primeiro
      const sortedData = (response.data || []).sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      setLeituras(sortedData);
    } catch (error) {
      console.error('Erro ao buscar leituras:', error);
      
      // Fallback para endpoint de teste
      try {
        const fallbackResponse = await axios.get(`${API_URL}/api/leituras-test`);
        const sortedData = (fallbackResponse.data || []).sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        setLeituras(sortedData);
      } catch (fallbackError) {
        console.error('Erro no fallback:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleLogout = async () => {
    localStorage.removeItem('empresa_id');
    localStorage.removeItem('empresa_nome');
    localStorage.removeItem('user_role');
    await supabase.auth.signOut();
  };
  
  const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  const getStatusColor = (status) => {
    if (!status) return 'default';
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'ligado' || statusLower === 'aberta' || statusLower === 'ativo') {
      return 'success';
    } else if (statusLower === 'desligado' || statusLower === 'fechada' || statusLower === 'parado') {
      return 'warning';
    } else if (statusLower === 'erro' || statusLower === 'falha') {
      return 'error';
    }
    return 'default';
  };
  
  // Carrega thresholds do localStorage (mesmo formato do Configuracoes.jsx)
  const loadThresholds = () => {
    try {
      const saved = localStorage.getItem('imp_thresholds');
      if (saved) {
        const cfg = JSON.parse(saved);
        // Migração: vibracao → pressao
        if (cfg.vibracao && !cfg.pressao) {
          cfg.pressao = cfg.vibracao;
          delete cfg.vibracao;
          localStorage.setItem('imp_thresholds', JSON.stringify(cfg));
        }
        return cfg;
      }
    } catch (e) {
      console.error('Erro ao carregar thresholds:', e);
    }
    // Valores padrão — mesmos do DEFAULT_CONFIG em Configuracoes.jsx
    return {
      temperatura:     { minimo: 0, 'atenção': 90,  critico: 100, maximo: 150 },
      pressao:         { minimo: 0, 'atenção': 5,   critico: 8,   maximo: 15  },
      pressao_envelope:{ minimo: 0, 'atenção': 4,   critico: 6,   maximo: 10  },
      pressao_saco_ar: { minimo: 0, 'atenção': 4,   critico: 6,   maximo: 10  },
    };
  };

  // Cores baseadas nos thresholds salvos nas Configurações
  // azul  = abaixo do mínimo   (muito abaixo do esperado)
  // verde = entre mínimo e atenção (normal / esperado)
  // amarelo = entre atenção e crítico (atenção)
  // vermelho = acima do crítico (crítico)
  const getValueColor = (value, type) => {
    if (value == null) return null;

    const thresholds = loadThresholds();
    const cfg = thresholds[type];
    if (!cfg) return null;

    const v = parseFloat(value);
    if (v >= cfg.critico)   return '#ef4444'; // vermelho
    if (v >= cfg['atenção']) return '#f59e0b'; // amarelo
    if (v >= cfg.minimo)    return '#10b981'; // verde
    return '#3b82f6';                          // azul
  };
  
  const applyFilters = () => {
    fetchLeituras();
    setPage(0); // Reset para primeira página
  };
  
  const clearFilters = () => {
    setMaquinaSelecionada('');
    setDataInicio('');
    setDataFim('');
    fetchLeituras();
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#0f0f0f', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ px: 4, minHeight: '56px !important', gap: 1 }}>
          <IconButton edge="start" size="small" onClick={() => navigate('/')} sx={{ color: '#666', mr: 1.5, '&:hover': { color: '#aaa' } }}>
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <img src="/habilita_logo.svg" alt="Habilita" style={{ height: 26, width: 'auto', marginRight: 12 }} />
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ color: '#333' }}>/</Typography>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#e2e2e2' }}>
                Registros de Leituras
              </Typography>
            </Box>
          </Box>
          <Button size="small" startIcon={<LogoutOutlined sx={{ fontSize: 14 }} />} onClick={handleLogout}
            sx={{ color: '#555', fontSize: '0.75rem', fontWeight: 600, px: 1.5, '&:hover': { color: '#aaa' } }}>
            Sair
          </Button>
        </Toolbar>
      </AppBar>
      
      {/* Filtros */}
      <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
        <Paper elevation={0} sx={{
          p: 2.5,
          mb: 3,
          bgcolor: '#161616',
          border: '1px solid #222',
          borderRadius: '10px',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterListIcon sx={{ fontSize: 16, color: '#444' }} />
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#3a3a3a', fontFamily: '"Outfit", sans-serif' }}>
              Filtros
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: '#1e1e1e' }} />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Máquina */}
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel sx={{ fontSize: '0.8rem' }}>Máquina</InputLabel>
              <Select
                value={maquinaSelecionada}
                label="Máquina"
                onChange={(e) => setMaquinaSelecionada(e.target.value)}
                sx={{ fontSize: '0.875rem' }}
              >
                <MenuItem value=""><em>Todas</em></MenuItem>
                {maquinas.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.nome}{m.modelo ? ` — ${m.modelo}` : ''}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Data Início */}
            <TextField
              label="Data Início"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarTodayIcon sx={{ fontSize: 14, color: '#444' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 180 }}
            />

            {/* Data Fim */}
            <TextField
              label="Data Fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarTodayIcon sx={{ fontSize: 14, color: '#444' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 180 }}
            />

            <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
              {(maquinaSelecionada || dataInicio || dataFim) && (
                <Button size="small" onClick={clearFilters}
                  sx={{ color: '#555', border: '1px solid #222', fontSize: '0.78rem', px: 1.5, '&:hover': { color: '#aaa', borderColor: '#3a3a3a' } }}>
                  Limpar
                </Button>
              )}
              <Button size="small" startIcon={<RefreshIcon sx={{ fontSize: 14 }} />} onClick={() => fetchLeituras()}
                sx={{ color: '#555', border: '1px solid #222', fontSize: '0.78rem', px: 1.5, '&:hover': { color: '#aaa', borderColor: '#3a3a3a' } }}>
                Atualizar
              </Button>
              <Button size="small" startIcon={<FilterListIcon sx={{ fontSize: 14 }} />} onClick={applyFilters}
                sx={{ color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', fontSize: '0.78rem', fontWeight: 700, px: 1.5, '&:hover': { borderColor: '#3b82f6', bgcolor: 'rgba(59,130,246,0.05)' } }}>
                Buscar
              </Button>
            </Box>
          </Box>
        </Paper>
        
        {/* Legenda de cores */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          {[
            { color: '#3b82f6', label: 'Abaixo do esperado' },
            { color: '#10b981', label: 'Normal' },
            { color: '#f59e0b', label: 'Atenção' },
            { color: '#ef4444', label: 'Crítico' },
          ].map(({ color, label }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
              <Typography sx={{ fontSize: '0.68rem', color: '#444', fontWeight: 600 }}>{label}</Typography>
            </Box>
          ))}
        </Box>

        {/* Tabela */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
            <CircularProgress size={40} sx={{ color: '#333' }} />
          </Box>
        ) : (
          <Paper elevation={0} sx={{
            borderRadius: '10px',
            overflow: 'hidden',
            bgcolor: '#161616',
            border: '1px solid #1e1e1e',
          }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {[
                      'Data/Hora', 'Temperatura', 'Pressão', 'P. Envelope',
                      'P. Saco Ar', 'Status', 'Motor Vent.', 'V. Ent. Auto.',
                      'V. Desc. Auto.', 'V. Ent. Saco', 'V. Desc. Saco',
                      'V. Ent. Env.', 'V. Desc. Env.', 'Peças',
                    ].map((h) => (
                      <TableCell key={h} sx={{
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: '#383838',
                        bgcolor: '#111',
                        borderBottom: '1px solid #1a1a1a',
                        whiteSpace: 'nowrap',
                        py: 1.25,
                        fontFamily: '"Outfit", sans-serif',
                      }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leituras.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} align="center" sx={{ py: 8, borderBottom: 'none' }}>
                        <Typography sx={{ color: '#333', fontSize: '0.875rem' }}>
                          Nenhum registro encontrado
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    leituras
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((leitura, index) => (
                        <TableRow
                          key={leitura.id || index}
                          sx={{
                            '&:hover td': { bgcolor: '#1a1a1a' },
                            '& td': { borderBottom: '1px solid #111', transition: 'background 0.15s' },
                          }}
                        >
                          <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap', color: '#888', fontFamily: 'monospace' }}>
                            {formatDateTime(leitura.created_at)}
                          </TableCell>

                          {/* Temperatura */}
                          <TableCell>
                            <ValueBadge value={leitura.temperatura} color={getValueColor(leitura.temperatura, 'temperatura')} fmt={(v) => `${parseFloat(v).toFixed(1)}°C`} />
                          </TableCell>

                          {/* Pressão */}
                          <TableCell>
                            <ValueBadge value={leitura.vibracao} color={getValueColor(leitura.vibracao, 'pressao')} fmt={(v) => `${parseFloat(v).toFixed(2)} Pa`} />
                          </TableCell>

                          {/* P. Envelope */}
                          <TableCell>
                            <ValueBadge value={leitura.pressao_envelope} color={getValueColor(leitura.pressao_envelope, 'pressao_envelope')} fmt={(v) => `${parseFloat(v).toFixed(2)} bar`} />
                          </TableCell>

                          {/* P. Saco Ar */}
                          <TableCell>
                            <ValueBadge value={leitura.pressao_saco_ar} color={getValueColor(leitura.pressao_saco_ar, 'pressao_saco_ar')} fmt={(v) => `${parseFloat(v).toFixed(2)} bar`} />
                          </TableCell>

                          {/* Status e válvulas */}
                          <TableCell><StatusBadge value={leitura.status} /></TableCell>
                          <TableCell><StatusBadge value={leitura.status_motor_ventilador} /></TableCell>
                          <TableCell><StatusBadge value={leitura.status_valvula_entrada_autoclave} /></TableCell>
                          <TableCell><StatusBadge value={leitura.status_valvula_descarga_autoclave} /></TableCell>
                          <TableCell><StatusBadge value={leitura.status_valvula_entrada_saco_ar} /></TableCell>
                          <TableCell><StatusBadge value={leitura.status_valvula_descarga_saco_ar} /></TableCell>
                          <TableCell><StatusBadge value={leitura.status_valvula_entrada_envelope} /></TableCell>
                          <TableCell><StatusBadge value={leitura.status_valvula_descarga_envelope} /></TableCell>

                          <TableCell sx={{ fontSize: '0.825rem', color: '#aaa', fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>
                            {leitura.pecas_produzidas ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ borderColor: '#1a1a1a' }} />
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={leituras.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
              sx={{
                color: '#555',
                fontSize: '0.75rem',
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { color: '#555', fontSize: '0.75rem' },
                '& .MuiTablePagination-select, & .MuiTablePagination-selectIcon': { color: '#777' },
                '& .MuiIconButton-root': { color: '#555', '&:hover': { color: '#aaa' }, '&.Mui-disabled': { color: '#2a2a2a' } },
              }}
            />
          </Paper>
        )}
      </Container>
    </Box>
  );
}

export default Registros;

