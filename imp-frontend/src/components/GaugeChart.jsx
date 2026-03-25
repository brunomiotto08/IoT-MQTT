import { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import Chart from 'react-apexcharts';

function getTemperatureConfig(temp) {
  if (temp >= 100) return { color: '#ef4444', label: 'Crítico',  track: 'rgba(239,68,68,0.08)' };
  if (temp >= 90)  return { color: '#f59e0b', label: 'Atenção',  track: 'rgba(245,158,11,0.08)' };
  if (temp >= 10)  return { color: '#22c55e', label: 'Normal',   track: 'rgba(34,197,94,0.08)'  };
  if (temp > 0)    return { color: '#3b82f6', label: 'Baixo',    track: 'rgba(59,130,246,0.08)' };
  return           { color: '#ef4444', label: 'Crítico',  track: 'rgba(239,68,68,0.08)' };
}

function GaugeChart({ series }) {
  const temperature = series[0] || 0;
  const cfg = getTemperatureConfig(temperature);

  const [displayTemp, setDisplayTemp] = useState(temperature);

  useEffect(() => {
    const t = setTimeout(() => setDisplayTemp(temperature), 150);
    return () => clearTimeout(t);
  }, [temperature]);

  const options = {
    chart: {
      type: 'radialBar',
      background: 'transparent',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 600,
        dynamicAnimation: { enabled: true, speed: 500 },
      },
      sparkline: { enabled: false },
    },
    plotOptions: {
      radialBar: {
        startAngle: -120,
        endAngle: 120,
        hollow: {
          size: '68%',
          background: 'transparent',
          margin: 0,
        },
        track: {
          background: cfg.track,
          strokeWidth: '100%',
          margin: 0,
        },
        dataLabels: {
          name: { show: false },
          value: {
            show: true,
            fontSize: '2rem',
            fontWeight: 700,
            fontFamily: '"Outfit", sans-serif',
            color: cfg.color,
            offsetY: 6,
            formatter: () => `${displayTemp.toFixed(1)}°`,
          },
        },
      },
    },
    fill: { colors: [cfg.color] },
    stroke: { lineCap: 'round' },
    labels: ['Temperatura'],
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } },
    },
  };

  return (
    <Card elevation={0} sx={{
      width: '100%',
      height: '100%',
      bgcolor: '#161616',
      border: '1px solid #222',
      borderRadius: '10px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="overline" sx={{ color: '#555', fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.7rem' }}>
            Temperatura Atual
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: cfg.color, transition: 'background 0.4s' }} />
            <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 700, fontSize: '0.7rem', transition: 'color 0.4s' }}>
              {cfg.label}
            </Typography>
          </Box>
        </Box>

        {/* Gauge */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', mt: -1 }}>
          <Box sx={{ width: '100%', maxWidth: 280 }}>
            <Chart options={options} series={[Math.min((temperature / 120) * 100, 100)]} type="radialBar" height={240} />
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1.5, borderTop: '1px solid #1e1e1e' }}>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#444', fontSize: '0.65rem', display: 'block', mb: 0.25 }}>Mín. seguro</Typography>
            <Typography variant="caption" sx={{ color: '#555', fontWeight: 700, fontSize: '0.75rem' }}>10°C</Typography>
          </Box>
          <Box sx={{ width: '1px', bgcolor: '#1e1e1e' }} />
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#444', fontSize: '0.65rem', display: 'block', mb: 0.25 }}>Atenção</Typography>
            <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.75rem' }}>90°C</Typography>
          </Box>
          <Box sx={{ width: '1px', bgcolor: '#1e1e1e' }} />
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#444', fontSize: '0.65rem', display: 'block', mb: 0.25 }}>Crítico</Typography>
            <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 700, fontSize: '0.75rem' }}>100°C</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default GaugeChart;
