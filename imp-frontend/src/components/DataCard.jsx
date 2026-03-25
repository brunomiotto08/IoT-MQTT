import { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

const STATUS_COLORS = {
  critical_high: { hex: '#ef4444', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.25)', label: 'Crítico'  },
  warning_high:  { hex: '#f59e0b', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.25)', label: 'Atenção' },
  normal:        { hex: '#22c55e', bg: 'rgba(34,197,94,0.07)',  border: 'rgba(34,197,94,0.25)',  label: 'Normal'  },
  warning_low:   { hex: '#3b82f6', bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.25)', label: 'Baixo'   },
  critical_low:  { hex: '#ef4444', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.25)', label: 'Crítico'  },
  neutral:       { hex: '#3d3d3d', bg: 'transparent',           border: '#252525',              label: '—'        },
};

const STATUS_CHIP = {
  ok:      { label: 'Normal',  color: '#22c55e' },
  ativo:   { label: 'Ativo',   color: '#22c55e' },
  running: { label: 'Ativo',   color: '#22c55e' },
  alerta:  { label: 'Atenção', color: '#f59e0b' },
  parado:  { label: 'Parado',  color: '#f59e0b' },
  stopped: { label: 'Parado',  color: '#f59e0b' },
  erro:    { label: 'Erro',    color: '#ef4444' },
  error:   { label: 'Erro',    color: '#ef4444' },
};

function loadThresholds() {
  try {
    const saved = localStorage.getItem('imp_thresholds');
    if (saved) {
      const c = JSON.parse(saved);
      if (c.vibracao && !c.pressao) { c.pressao = c.vibracao; delete c.vibracao; }
      return c;
    }
  } catch {}
  return {
    temperatura: { minimo_critico: 0, minimo_atencao: 10, maximo_atencao: 90, critico: 100 },
    pressao:     { minimo_critico: 0.1, minimo_atencao: 0.5, maximo_atencao: 5, critico: 8 },
  };
}

function getStatusLevel(title, value) {
  if (value === null || value === undefined) return 'neutral';
  const n = parseFloat(value);
  const t = loadThresholds();

  if (title.toLowerCase().includes('temperatura')) {
    const th = t.temperatura;
    if (n >= (th.critico ?? 100))       return 'critical_high';
    if (n >= (th.maximo_atencao ?? 90)) return 'warning_high';
    if (n <= (th.minimo_critico ?? 0))  return 'critical_low';
    if (n <= (th.minimo_atencao ?? 10)) return 'warning_low';
    return 'normal';
  }
  if (title.toLowerCase().includes('pressão') || title.toLowerCase().includes('pressao')) {
    const th = t.pressao;
    if (n >= (th.critico ?? 8))           return 'critical_high';
    if (n >= (th.maximo_atencao ?? 5))    return 'warning_high';
    if (n <= (th.minimo_critico ?? 0.1))  return 'critical_low';
    if (n <= (th.minimo_atencao ?? 0.5))  return 'warning_low';
    return 'normal';
  }
  return 'neutral';
}

function DataCard({ title, value, unit, icon, isStatus = false, threshold = false }) {
  const [flash, setFlash] = useState(false);
  const [prev, setPrev] = useState(value);

  useEffect(() => {
    if (value !== prev && value !== null && value !== undefined) {
      setFlash(true);
      const t = setTimeout(() => { setPrev(value); setFlash(false); }, 250);
      return () => clearTimeout(t);
    }
  }, [value, prev]);

  const level = threshold ? getStatusLevel(title, value) : 'neutral';
  const c = STATUS_COLORS[level];
  const hasAlert = level !== 'neutral' && level !== 'normal';
  const chipCfg = (isStatus && value && typeof value === 'string')
    ? (STATUS_CHIP[value.toLowerCase()] ?? { label: value, color: '#666' })
    : null;

  const valueColor = isStatus
    ? (chipCfg?.color ?? '#888')
    : hasAlert ? c.hex : level === 'normal' ? '#22c55e' : '#d0d0d0';

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      bgcolor: '#161616',
      border: '1px solid',
      borderColor: hasAlert ? c.border : '#222',
      borderRadius: '8px',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'border-color 0.3s ease',
    }}>
      {/* Barra indicadora de status no topo */}
      <Box sx={{
        height: '2px',
        bgcolor: level === 'neutral' ? '#222' : c.hex,
        transition: 'background-color 0.4s ease',
        flexShrink: 0,
      }} />

      <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

        {/* Linha superior: título + ícone */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography sx={{
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#555',
            lineHeight: 1.3,
            fontFamily: '"Outfit", sans-serif',
          }}>
            {title}
          </Typography>
          {icon && (
            <Box sx={{
              color: level === 'neutral' ? '#333' : c.hex,
              display: 'flex',
              transition: 'color 0.3s ease',
              '& .MuiSvgIcon-root': { fontSize: 16 },
            }}>
              {icon}
            </Box>
          )}
        </Box>

        {/* Valor principal */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {value !== null && value !== undefined ? (
            isStatus ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{
                  width: 7, height: 7, borderRadius: '50%',
                  bgcolor: chipCfg?.color ?? '#666', flexShrink: 0,
                  boxShadow: chipCfg ? `0 0 6px ${chipCfg.color}60` : 'none',
                  transition: 'background 0.3s, box-shadow 0.3s',
                }} />
                <Typography sx={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: chipCfg?.color ?? '#888',
                  fontFamily: '"Outfit", sans-serif',
                  lineHeight: 1,
                  transition: 'color 0.3s',
                }}>
                  {chipCfg?.label ?? value}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                <Typography sx={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  color: valueColor,
                  fontFamily: '"Outfit", sans-serif',
                  lineHeight: 1,
                  opacity: flash ? 0.35 : 1,
                  transition: 'color 0.3s ease, opacity 0.2s ease',
                  letterSpacing: '-0.02em',
                }}>
                  {value}
                </Typography>
                {unit && (
                  <Typography sx={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#444',
                    lineHeight: 1,
                    mb: '2px',
                  }}>
                    {unit}
                  </Typography>
                )}
              </Box>
            )
          ) : (
            <LinearProgress sx={{ height: 2, borderRadius: 1, my: 1 }} />
          )}
        </Box>

        {/* Rodapé: badge de nível */}
        <Box sx={{ mt: 1.5, minHeight: 18 }}>
          {threshold && value !== null && value !== undefined && !isStatus && (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              px: 0.875, py: 0.25,
              bgcolor: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: '4px',
            }}>
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: c.hex, flexShrink: 0 }} />
              <Typography sx={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: c.hex,
                lineHeight: 1,
                letterSpacing: '0.04em',
              }}>
                {c.label}
              </Typography>
            </Box>
          )}
        </Box>

      </Box>
    </Box>
  );
}

export default DataCard;
