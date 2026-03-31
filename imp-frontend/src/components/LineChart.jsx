import { useMemo } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import Chart from 'react-apexcharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

const MULTI_COLORS = ['#3b82f6', '#6366f1', '#22c55e', '#f59e0b'];

function buildOptions({ colors, unit, isMulti, showLegend }) {
  return {
    chart: {
      background: 'transparent',
      fontFamily: '"Outfit", sans-serif',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 500,
        dynamicAnimation: { enabled: true, speed: 400 },
      },
      toolbar: { show: false },
      zoom: { enabled: false },
      dropShadow: { enabled: false },
    },
    colors,
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 2,
      lineCap: 'round',
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        opacityFrom: isMulti ? 0.1 : 0.13,
        opacityTo: 0,
        stops: [0, 100],
      },
    },
    grid: {
      borderColor: '#1c1c1c',
      strokeDashArray: 5,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { top: 8, right: 4, bottom: 4, left: 4 },
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        format: 'HH:mm',
        style: { colors: '#3a3a3a', fontSize: '11px', fontWeight: 500 },
        offsetY: 2,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: '#3a3a3a', fontSize: '11px', fontWeight: 500 },
        formatter: (v) => {
          if (v === undefined || v === null) return '';
          if (unit === 'unidades') return v.toFixed(0);
          return v.toFixed(1);
        },
      },
    },
    tooltip: {
      theme: 'dark',
      x: { format: 'HH:mm:ss' },
      style: { fontSize: '12px', fontFamily: '"Outfit", sans-serif' },
      custom({ series: s, seriesIndex, dataPointIndex, w }) {
        const v = s[seriesIndex][dataPointIndex];
        const ts = new Date(w.globals.seriesX[seriesIndex][dataPointIndex]);
        const c = colors[seriesIndex] || colors[0];
        const name = w.config.series[seriesIndex]?.name || '';
        const formatted = unit === 'unidades' ? v?.toFixed(0) : v?.toFixed(2);
        return `<div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:10px 14px;min-width:140px;">
          ${isMulti ? `<div style="color:${c};font-size:11px;font-weight:600;margin-bottom:3px;">${name}</div>` : ''}
          <div style="color:${c};font-size:16px;font-weight:700;">${formatted} <span style="font-size:12px;color:#555;">${unit}</span></div>
          <div style="color:#444;font-size:11px;margin-top:3px;">${ts.toLocaleTimeString('pt-BR')}</div>
        </div>`;
      },
    },
    markers: {
      size: 0,
      hover: { size: 4, sizeOffset: 2 },
    },
    legend: showLegend ? {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      fontWeight: 600,
      labels: { colors: '#555' },
      markers: { width: 8, height: 8, radius: 4 },
      itemMargin: { horizontal: 10 },
    } : { show: false },
  };
}

function getTrend(series) {
  const data = series[0]?.data;
  if (!data || data.length < 3) return 'flat';
  const recent = data.slice(-5);
  const delta = recent[recent.length - 1][1] - recent[0][1];
  if (Math.abs(delta) < 0.1) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

function TrendIcon({ trend, color }) {
  const sx = { fontSize: 14, color };
  if (trend === 'up') return <TrendingUpIcon sx={sx} />;
  if (trend === 'down') return <TrendingDownIcon sx={sx} />;
  return <TrendingFlatIcon sx={sx} />;
}

function LineChart({ series, title = 'Histórico de Temperatura', unit = '°C', color = '#3b82f6' }) {
  const isMulti = series.length > 1;
  const colors = isMulti ? MULTI_COLORS.slice(0, series.length) : [color];
  const dataPoints = series[0]?.data?.length || 0;
  const latestValue = series[0]?.data?.[dataPoints - 1]?.[1];
  const trend = getTrend(series);

  const trendColor = trend === 'up' ? '#f59e0b' : trend === 'down' ? '#3b82f6' : '#555';

  const options = useMemo(
    () => buildOptions({ colors, unit, isMulti, showLegend: isMulti }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [color, unit, isMulti, series.length]
  );

  return (
    <Card elevation={0} sx={{
      width: '100%',
      height: '100%',
      bgcolor: '#161616',
      border: '1px solid #222',
      borderRadius: '10px',
      display: 'flex',
      flexDirection: 'column',
      transition: 'border-color 0.2s',
      '&:hover': { borderColor: '#2a2a2a' },
    }}>
      <CardContent sx={{ p: 3, pb: '16px !important', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="overline" sx={{ color: '#555', fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.7rem' }}>
              {title}
            </Typography>
            {!isMulti && latestValue !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mt: 0.5 }}>
                <Typography sx={{ fontSize: '1.625rem', fontWeight: 700, color, fontFamily: '"Outfit", sans-serif', lineHeight: 1 }}>
                  {unit === 'unidades' ? latestValue?.toFixed(0) : latestValue?.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#444', fontWeight: 500 }}>{unit}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: 0.5 }}>
                  <TrendIcon trend={trend} color={trendColor} />
                </Box>
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="caption" sx={{ color: '#2a2a2a', fontSize: '0.65rem' }}>
              {dataPoints} pts
            </Typography>
          </Box>
        </Box>

        {/* Chart — fills remaining flex space */}
        <Box sx={{ flex: 1, mx: -0.5, minHeight: 0 }}>
          <Chart options={options} series={series} type="area" height={300} />
        </Box>
      </CardContent>
    </Card>
  );
}

export default LineChart;
