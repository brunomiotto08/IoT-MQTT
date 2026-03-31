import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  Box,
  Container,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Paper,
  Chip,
  Tooltip,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const EMPTY_FORM = { nome: '', modelo: '', uuid_maquina: '', ativa: true };

function Maquinas() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMaquina, setEditingMaquina] = useState(null);
  const [maquinaParaExcluir, setMaquinaParaExcluir] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setSession(session);
      fetchMaquinas(session);
    };
    getSession();
  }, [navigate]);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  });

  const fetchMaquinas = async (s = session) => {
    if (!s) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/maquinas`, {
        headers: { Authorization: `Bearer ${s.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar máquinas');
      setMaquinas(data);
    } catch (err) {
      showSnackbar('Erro ao carregar máquinas: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingMaquina(null);
    setForm(EMPTY_FORM);
    setError('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (maquina) => {
    setEditingMaquina(maquina);
    setForm({
      nome: maquina.nome,
      modelo: maquina.modelo || '',
      uuid_maquina: maquina.uuid_maquina,
      ativa: maquina.ativa,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleOpenDelete = (maquina) => {
    setMaquinaParaExcluir(maquina);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return; }
    if (!form.uuid_maquina.trim()) { setError('UUID da máquina é obrigatório'); return; }

    setSaving(true);
    setError('');
    try {
      const url = editingMaquina
        ? `${BACKEND_URL}/api/maquinas/${editingMaquina.id}`
        : `${BACKEND_URL}/api/maquinas`;
      const method = editingMaquina ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

      setDialogOpen(false);
      fetchMaquinas();
      showSnackbar(editingMaquina ? 'Máquina atualizada com sucesso!' : 'Máquina cadastrada com sucesso!', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!maquinaParaExcluir) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/maquinas/${maquinaParaExcluir.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir');
      setDeleteDialogOpen(false);
      setMaquinaParaExcluir(null);
      fetchMaquinas();
      showSnackbar('Máquina excluída com sucesso!', 'success');
    } catch (err) {
      showSnackbar('Erro ao excluir: ' + err.message, 'error');
    }
  };

  const handleCopyUUID = (uuid) => {
    navigator.clipboard.writeText(uuid);
    showSnackbar('UUID copiado para a área de transferência!', 'info');
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Typography sx={{ color: '#2a2a2a', fontSize: '0.875rem' }}>/</Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', color: '#e2e2e2', fontFamily: '"Outfit", sans-serif' }}>
              Gerenciamento de Máquinas
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 15 }} />}
            onClick={handleOpenCreate}
            sx={{ bgcolor: '#1a1a1a', color: '#aaa', border: '1px solid #2a2a2a', fontSize: '0.8125rem', px: 2, py: 0.75, '&:hover': { bgcolor: '#222', color: '#e2e2e2', borderColor: '#3a3a3a' } }}
          >
            Nova Máquina
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Info tópico MQTT */}
        <Paper
          elevation={0}
          sx={{ mb: 4, p: 3, bgcolor: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.25)', borderRadius: 2 }}
        >
          <Typography variant="subtitle2" sx={{ color: '#888', fontWeight: 600, mb: 1 }}>
            ℹ️ Como usar as máquinas cadastradas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Após cadastrar uma máquina, publique dados MQTT no tópico:{' '}
            <Box component="code" sx={{ bgcolor: 'rgba(255,255,255,0.07)', px: 1, py: 0.3, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
              empresas/{'{'}<em>empresa_id</em>{'}'}/maquinas/{'{'}<em>uuid_maquina</em>{'}'}/dados
            </Box>
          </Typography>
        </Paper>

        {/* Lista de Máquinas */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={48} />
          </Box>
        ) : maquinas.length === 0 ? (
          <Card elevation={2} sx={{ textAlign: 'center', py: 8 }}>
            <PrecisionManufacturingIcon sx={{ fontSize: 72, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhuma máquina cadastrada
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
              Clique em "Nova Máquina" para começar a monitorar seus equipamentos
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Cadastrar primeira máquina
            </Button>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {maquinas.map((maquina) => (
              <Grid item xs={12} sm={6} md={4} key={maquina.id}>
                <Card
                  elevation={3}
                  sx={{
                    height: '100%',
                    border: '1px solid',
                    borderColor: maquina.ativa ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 100, 100, 0.2)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: maquina.ativa ? 'rgba(16, 185, 129, 0.5)' : 'rgba(150, 150, 150, 0.4)',
                      transform: 'translateY(-2px)',
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Header do card */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 44, height: 44, borderRadius: 2,
                            bgcolor: maquina.ativa ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 100, 100, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <PrecisionManufacturingIcon sx={{ fontSize: 24, color: maquina.ativa ? '#10b981' : '#6b7280' }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            {maquina.nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {maquina.modelo || 'Sem modelo'}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        size="small"
                        label={maquina.ativa ? 'Ativa' : 'Inativa'}
                        icon={maquina.ativa ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} /> : <CancelIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{
                          bgcolor: maquina.ativa ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 100, 100, 0.15)',
                          color: maquina.ativa ? '#10b981' : '#6b7280',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                        }}
                      />
                    </Box>

                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />

                    {/* UUID */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        UUID da Máquina
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Box
                          component="code"
                          sx={{
                            flex: 1, px: 1.5, py: 0.75, borderRadius: 1,
                            bgcolor: 'rgba(255,255,255,0.05)',
                            fontSize: '0.78rem', fontFamily: 'monospace',
                            color: '#aaa', wordBreak: 'break-all',
                          }}
                        >
                          {maquina.uuid_maquina}
                        </Box>
                        <Tooltip title="Copiar UUID">
                          <IconButton size="small" onClick={() => handleCopyUUID(maquina.uuid_maquina)}
                            sx={{ color: '#555', '&:hover': { color: '#aaa' } }}>
                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* ID empresa */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Empresa ID
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Box
                          component="code"
                          sx={{
                            flex: 1, px: 1.5, py: 0.75, borderRadius: 1,
                            bgcolor: 'rgba(255,255,255,0.05)',
                            fontSize: '0.72rem', fontFamily: 'monospace',
                            color: '#94a3b8', wordBreak: 'break-all',
                          }}
                        >
                          {maquina.empresa_id}
                        </Box>
                        <Tooltip title="Copiar empresa_id">
                          <IconButton size="small" onClick={() => handleCopyUUID(maquina.empresa_id)}
                            sx={{ color: 'text.secondary', '&:hover': { color: '#94a3b8' } }}>
                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* Tópico MQTT completo */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Tópico MQTT (dados)
                      </Typography>
                      <Box
                        sx={{
                          mt: 0.5, px: 1.5, py: 1, borderRadius: 1,
                          bgcolor: 'rgba(99, 102, 241, 0.08)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          display: 'flex', alignItems: 'center', gap: 1,
                        }}
                      >
                        <Box
                          component="code"
                          sx={{
                            flex: 1,
                            fontSize: '0.7rem', fontFamily: 'monospace',
                            color: '#818cf8', wordBreak: 'break-all', lineHeight: 1.6,
                          }}
                        >
                          {`empresas/${maquina.empresa_id}/maquinas/${maquina.uuid_maquina}/dados`}
                        </Box>
                        <Tooltip title="Copiar tópico completo">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyUUID(`empresas/${maquina.empresa_id}/maquinas/${maquina.uuid_maquina}/dados`)}
                            sx={{ color: '#818cf8', flexShrink: 0, '&:hover': { color: '#6366f1', bgcolor: 'rgba(99,102,241,0.1)' } }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />

                    {/* Ações */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        fullWidth variant="outlined" size="small"
                        startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                        onClick={() => handleOpenEdit(maquina)}
                        sx={{ fontWeight: 600 }}
                      >
                        Editar
                      </Button>
                      <Button
                        fullWidth variant="outlined" size="small" color="error"
                        startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                        onClick={() => handleOpenDelete(maquina)}
                        sx={{ fontWeight: 600 }}
                      >
                        Excluir
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Dialog Criar / Editar */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <PrecisionManufacturingIcon sx={{ color: '#555' }} />
          <Typography variant="h6" fontWeight={700} component="span">
            {editingMaquina ? 'Editar Máquina' : 'Nova Máquina'}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Nome da Máquina *"
                value={form.nome}
                onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Autoclave Linha 1"
                autoFocus
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Modelo"
                value={form.modelo}
                onChange={(e) => setForm(f => ({ ...f, modelo: e.target.value }))}
                placeholder="Ex: AC-500 Pro"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label="UUID da Máquina (MQTT) *"
                value={form.uuid_maquina}
                onChange={(e) => setForm(f => ({ ...f, uuid_maquina: e.target.value }))}
                placeholder="Ex: autoclave-linha-1"
                helperText="Identificador único usado nos tópicos MQTT. Ex: empresas/{empresa_id}/maquinas/{uuid_maquina}/dados"
                disabled={!!editingMaquina}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.ativa}
                    onChange={(e) => setForm(f => ({ ...f, ativa: e.target.checked }))}
                    color="success"
                  />
                }
                label={
                  <Typography variant="body2">
                    Máquina <strong>{form.ativa ? 'Ativa' : 'Inativa'}</strong>
                  </Typography>
                }
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
            sx={{ fontWeight: 600, px: 3 }}
          >
            {saving ? 'Salvando...' : editingMaquina ? 'Salvar Alterações' : 'Cadastrar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DeleteIcon sx={{ color: 'error.main' }} />
          <Typography variant="h6" fontWeight={700} component="span">Excluir Máquina</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Tem certeza que deseja excluir a máquina{' '}
            <strong>"{maquinaParaExcluir?.nome}"</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta ação irá remover também todos os ciclos e leituras associados a esta máquina. Esta operação não pode ser desfeita.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error" fontWeight={700} sx={{ fontWeight: 700 }}>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%', fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Maquinas;
