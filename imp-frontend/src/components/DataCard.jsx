import { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

const STATUS_COLORS = {
  critical_high: { hex: '#ef4444', bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.2)',   label: 'Crítico'  },
  warning_high:  { hex: '#f59e0b', bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.2)',  label: 'Atenção'  },
  normal:        { hex: '#22c55e', bg: 'rgba(34,197,94,0.07)',   border: 'rgba(34,197,94,0.2)',   label: 'Normal'   },
  warning_low:   { hex: '#3b82f6', bg: 'rgba(59,130,246,0.07)',  border: 'rgba(59,130,246,0.2)',  label: 'Baixo'    },
  critical_low:  { hex: '#ef4444', bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.2)',   label: 'Crítico'  },
  neutral:       { hex: '#2a2a2a', bg: 'transparent',            border: 'rgba(255,255,255,0.05)', label: '—'       },
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
    temperatura: { minimo_critico: 0,   minimo_atencao: 10,  maximo_atencao: 90, critico: 100 },
    pressao:     { minimo_critico: 0.1, minimo_atencao: 0.5, maximo_atencao: 5,  critico: 8   },
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
    : hasAlert ? c.hex : level === 'normal' ? '#22c55e' : '#c8c8c8';

  /* border color: soft glow when alerted, otherwise ultra-subtle */
  const borderColor = hasAlert
    ? `${c.hex}30`
    : 'rgba(255,255,255,0.06)';

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      background: 'rgba(16,16,16,0.80)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid',
      borderColor,
      borderRadius: '12px',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: hasAlert
        ? `0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px ${c.hex}18`
        : '0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.03)',
      transition: 'border-color 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: hasAlert
          ? `0 8px 36px rgba(0,0,0,0.55), 0 0 0 1px ${c.hex}28`
          : '0 8px 36px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
        borderColor: hasAlert ? `${c.hex}45` : 'rgba(255,255,255,0.1)',
      },
    }}>

      {/* Left accent bar */}
      <Box sx={{
        position: 'absolute',
        left: 0,
        top: '18%',
        bottom: '18%',
        width: '3px',
        borderRadius: '0 3px 3px 0',
        bgcolor: level === 'neutral' ? 'rgba(255,255,255,0.06)' : c.hex,
        opacity: level === 'neutral' ? 0.4 : 0.9,
        transition: 'background-color 0.4s ease, opacity 0.4s ease',
        boxShadow: level !== 'neutral' ? `0 0 8px ${c.hex}60` : 'none',
      }} />

      <Box sx={{ pl: 3.5, pr: 2.5, py: 2.5, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

        {/* Top row: title + icon */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.75 }}>
          <Typography sx={{
            fontSize: '0.68rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#333',
            lineHeight: 1.3,
            fontFamily: '"Outfit", sans-serif',
          }}>
            {title}
          </Typography>
          {icon && (
            <Box sx={{
              color: level === 'neutral' ? '#272727' : `${c.hex}aa`,
              display: 'flex',
              transition: 'color 0.3s ease',
              '& .MuiSvgIcon-root': { fontSize: 16 },
            }}>
              {icon}
            </Box>
          )}
        </Box>

        {/* Main value */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {value !== null && value !== undefined ? (
            isStatus ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box sx={{
                  width: 7, height: 7, borderRadius: '50%',
                  bgcolor: chipCfg?.color ?? '#555',
                  flexShrink: 0,
                  boxShadow: chipCfg ? `0 0 8px ${chipCfg.color}80` : 'none',
                  transition: 'background 0.3s, box-shadow 0.3s',
                }} />
                <Typography sx={{
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  color: chipCfg?.color ?? '#777',
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
                  fontSize: '2.25rem',
                  fontWeight: 700,
                  color: valueColor,
                  fontFamily: '"Outfit", sans-serif',
                  lineHeight: 1,
                  opacity: flash ? 0.25 : 1,
                  transition: 'color 0.3s ease, opacity 0.18s ease',
                  letterSpacing: '-0.04em',
                }}>
                  {value}
                </Typography>
                {unit && (
                  <Typography sx={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#2c2c2c',
                    lineHeight: 1,
                    mb: '2px',
                  }}>
                    {unit}
                  </Typography>
                )}
              </Box>
            )
          ) : (
            <LinearProgress sx={{ height: 2, borderRadius: 1, my: 1.5, opacity: 0.5 }} />
          )}
        </Box>

        {/* Footer badge */}
        <Box sx={{ mt: 1.75, minHeight: 20 }}>
          {threshold && value !== null && value !== undefined && !isStatus && (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              px: 0.875, py: 0.375,
              bgcolor: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: '5px',
            }}>
              <Box sx={{
                width: 5, height: 5, borderRadius: '50%',
                bgcolor: c.hex, flexShrink: 0,
                boxShadow: `0 0 5px ${c.hex}80`,
              }} />
              <Typography sx={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: c.hex,
                lineHeight: 1,
                letterSpacing: '0.07em',
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
