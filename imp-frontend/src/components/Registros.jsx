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
  Avatar,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import TableChartIcon from '@mui/icons-material/TableChart';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import ThermostatOutlined from '@mui/icons-material/ThermostatOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';

const API_URL = 'http://localhost:3000';

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
      if (dataInicio) params.append('data_inicio', dataInicio);
      if (dataFim) params.append('data_fim', dataFim);
      
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
  
  // Função para carregar thresholds do localStorage
  const loadThresholds = () => {
    try {
      const savedConfig = localStorage.getItem('imp_thresholds');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        
        // Migração automática: vibracao -> pressao
        if (config.vibracao && !config.pressao) {
          config.pressao = config.vibracao;
          delete config.vibracao;
          localStorage.setItem('imp_thresholds', JSON.stringify(config));
        }
        
        return config;
      }
    } catch (error) {
      console.error('Erro ao carregar thresholds:', error);
    }
    return {
      temperatura: { min: 20, low: 40, medium: 60, high: 80 },
      pressao: { min: 0, low: 2, medium: 5, high: 8 },
      pressao_envelope: { min: 0, low: 2, medium: 4, high: 6 },
      pressao_saco_ar: { min: 0, low: 2, medium: 4, high: 6 }
    };
  };
  
  // Função para obter cor baseada no valor e thresholds
  const getValueColor = (value, type) => {
    if (value == null) return '#94a3b8'; // Cinza para valores nulos
    
    const thresholds = loadThresholds();
    const config = thresholds[type];
    
    if (!config) return '#94a3b8';
    
    const numValue = parseFloat(value);
    
    if (numValue >= config.high) {
      return '#ef4444'; // Vermelho - Crítico
    } else if (numValue >= config.medium) {
      return '#f59e0b'; // Amarelo - Alerta
    } else if (numValue >= config.low) {
      return '#10b981'; // Verde - Normal
    } else {
      return '#3b82f6'; // Azul - Baixo
    }
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
          <IconButton edge="start" size="small" onClick={() => navigate('/')} sx={{ color: '#666', mr: 1, '&:hover': { color: '#aaa' } }}>
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#888', fontFamily: '"Outfit", sans-serif' }}>
                {empresaNome || 'IMP'}
              </Typography>
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
      <Container maxWidth="xl" sx={{ py: 4, px: 6 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 3,
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(40, 40, 40, 0.95) 100%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FilterListIcon sx={{ mr: 1, color: '#94a3b8' }} />
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
              Filtros
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Máquina</InputLabel>
              <Select
                value={maquinaSelecionada}
                label="Máquina"
                onChange={(e) => setMaquinaSelecionada(e.target.value)}
                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <MenuItem value="">
                  <em>Todas</em>
                </MenuItem>
                {maquinas.map((maquina) => (
                  <MenuItem key={maquina.id} value={maquina.id}>
                    {maquina.nome} - {maquina.modelo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Data Início"
              type="datetime-local"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              size="small"
              sx={{ minWidth: 200, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              label="Data Fim"
              type="datetime-local"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              size="small"
              sx={{ minWidth: 200, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              InputLabelProps={{ shrink: true }}
            />
            
            <Button 
              variant="contained" 
              startIcon={<FilterListIcon />}
              onClick={applyFilters}
              sx={{ fontWeight: 600 }}
            >
              Aplicar Filtros
            </Button>
            
            <Button 
              variant="outlined"
              onClick={clearFilters}
              sx={{ fontWeight: 600 }}
            >
              Limpar
            </Button>
            
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              onClick={() => fetchLeituras()}
              sx={{ fontWeight: 600 }}
            >
              Atualizar
            </Button>
          </Box>
        </Paper>
        
        {/* Tabela */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
            <CircularProgress size={60} />
          </Box>
        ) : (
          <Paper 
            elevation={3}
            sx={{ 
              borderRadius: 3,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(40, 40, 40, 0.95) 100%)',
            }}
          >
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', backgroundColor: 'rgba(20, 20, 20, 0.98)' }}>Data/Hora</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', backgroundColor: 'rgba(20, 20, 20, 0.98)' }}>Temperatura (°C)</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', backgroundColor: 'rgba(20, 20, 20, 0.98)' }}>Pressão (Pa)</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', backgroundColor: 'rgba(20, 20, 20, 0.98)' }}>P. Envelope (bar)</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', backgroundColor: 'rgba(20, 20, 20, 0.98)' }}>P. Saco Ar (bar)</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', backgroundColor: 'rgba(20, 20, 20, 0.98)' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', backgroundColor: 'rgba(20, 20, 20, 0.98)' }}>Motor Vent.</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', backgroundColor: 'rgba(20, 20, 20, 0.98)' }}>V. Ent. Auto.</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', backgroundColor: 'rgba(20, 20, 20, 0.98)' }}>V. Desc. Auto.</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', backgroundColor: 'rgba(20, 20, 20, 0.98)' }}>V. Ent. Saco</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', backgroundColor: 'rgba(20, 20, 20, 0.98)' }}>V. Desc. Saco</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', backgroundColor: 'rgba(20, 20, 20, 0.98)' }}>V. Ent. Env.</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', backgroundColor: 'rgba(20, 20, 20, 0.98)' }}>V. Desc. Env.</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', backgroundColor: 'rgba(20, 20, 20, 0.98)' }}>Peças Prod.</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leituras.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} align="center" sx={{ py: 5 }}>
                        <Typography variant="body1" sx={{ color: '#94a3b8' }}>
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
                          hover
                          sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' } }}
                        >
                          <TableCell sx={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                            {formatDateTime(leitura.created_at)}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>
                            <Box
                              component="span"
                              sx={{
                                fontWeight: 700,
                                color: getValueColor(leitura.temperatura, 'temperatura'),
                                transition: 'all 0.3s ease',
                              }}
                            >
                              {leitura.temperatura != null ? parseFloat(leitura.temperatura).toFixed(1) : '-'}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>
                            <Box
                              component="span"
                              sx={{
                                fontWeight: 700,
                                color: getValueColor(leitura.vibracao, 'pressao'),
                                transition: 'all 0.3s ease',
                              }}
                            >
                              {leitura.vibracao != null ? parseFloat(leitura.vibracao).toFixed(2) : '-'}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>
                            <Box
                              component="span"
                              sx={{
                                fontWeight: 700,
                                color: getValueColor(leitura.pressao_envelope, 'pressao_envelope'),
                                transition: 'all 0.3s ease',
                              }}
                            >
                              {leitura.pressao_envelope != null ? parseFloat(leitura.pressao_envelope).toFixed(2) : '-'}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>
                            <Box
                              component="span"
                              sx={{
                                fontWeight: 700,
                                color: getValueColor(leitura.pressao_saco_ar, 'pressao_saco_ar'),
                                transition: 'all 0.3s ease',
                              }}
                            >
                              {leitura.pressao_saco_ar != null ? parseFloat(leitura.pressao_saco_ar).toFixed(2) : '-'}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={leitura.status || '-'} 
                              color={getStatusColor(leitura.status)}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={leitura.status_motor_ventilador || '-'} 
                              color={getStatusColor(leitura.status_motor_ventilador)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={leitura.status_valvula_entrada_autoclave || '-'} 
                              color={getStatusColor(leitura.status_valvula_entrada_autoclave)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={leitura.status_valvula_descarga_autoclave || '-'} 
                              color={getStatusColor(leitura.status_valvula_descarga_autoclave)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={leitura.status_valvula_entrada_saco_ar || '-'} 
                              color={getStatusColor(leitura.status_valvula_entrada_saco_ar)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={leitura.status_valvula_descarga_saco_ar || '-'} 
                              color={getStatusColor(leitura.status_valvula_descarga_saco_ar)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={leitura.status_valvula_entrada_envelope || '-'} 
                              color={getStatusColor(leitura.status_valvula_entrada_envelope)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={leitura.status_valvula_descarga_envelope || '-'} 
                              color={getStatusColor(leitura.status_valvula_descarga_envelope)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>
                            {leitura.pecas_produzidas || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={leituras.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
              sx={{
                borderTop: '1px solid rgba(80, 80, 80, 0.3)',
                color: '#ffffff',
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  color: '#94a3b8',
                },
                '& .MuiTablePagination-select, & .MuiTablePagination-selectIcon': {
                  color: '#ffffff',
                }
              }}
            />
          </Paper>
        )}
      </Container>
    </Box>
  );
}

export default Registros;

