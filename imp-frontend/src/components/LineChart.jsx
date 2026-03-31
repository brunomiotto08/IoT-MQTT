import { useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import Chart from 'react-apexcharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

const MULTI_COLORS = ['#3b82f6', '#6366f1', '#22c55e', '#f59e0b'];

// Pixels por ponto de dado — determina o "zoom" horizontal do gráfico scrollável.
// Com 10px/ponto, ~360 pontos cabem em 3600px de largura (~1h a 10s/ponto).
const PX_PER_POINT = 10;
// Largura mínima visível (px) — garante que o gráfico preencha o card mesmo com poucos pontos
const MIN_CHART_WIDTH = 700;

function buildOptions({ colors, unit, isMulti, showLegend, scrollable }) {
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
      width: scrollable ? 1.5 : 2,
      lineCap: 'round',
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        opacityFrom: isMulti ? 0.10 : 0.12,
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
        // Em modo scrollável mostra mais ticks já que o chart é largo
        rotate: 0,
        hideOverlappingLabels: true,
        showDuplicates: false,
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
      hover: { size: 3, sizeOffset: 2 },
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

function LineChart({ series, title = 'Histórico', unit = '°C', color = '#3b82f6', scrollable = false }) {
  const isMulti   = series.length > 1;
  const colors    = isMulti ? MULTI_COLORS.slice(0, series.length) : [color];
  const dataPoints = series[0]?.data?.length || 0;
  const latestValue = series[0]?.data?.[dataPoints - 1]?.[1];
  const trend = getTrend(series);
  const trendColor = trend === 'up' ? '#f59e0b' : trend === 'down' ? '#3b82f6' : '#555';

  // Ref para o container scrollável
  const scrollRef = useRef(null);

  // Rola automaticamente para o final (dados mais recentes) sempre que os dados mudam
  useEffect(() => {
    if (scrollable && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [series, scrollable]);

  // Largura do gráfico em modo scrollável:
  // cada ponto ocupa PX_PER_POINT pixels, mas no mínimo MIN_CHART_WIDTH
  const chartPxWidth = scrollable && dataPoints > 0
    ? Math.max(MIN_CHART_WIDTH, dataPoints * PX_PER_POINT)
    : null; // null = 100% (não scrollável)

  const options = useMemo(
    () => buildOptions({ colors, unit, isMulti, showLegend: isMulti, scrollable }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [color, unit, isMulti, series.length, scrollable]
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
      <CardContent sx={{ p: 3, pb: '16px !important', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5, flexShrink: 0 }}>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {scrollable && dataPoints > 0 && (
              <Typography variant="caption" sx={{ color: '#2a2a2a', fontSize: '0.62rem' }}>
                ← role para ver histórico
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: '#2a2a2a', fontSize: '0.65rem' }}>
              {dataPoints} pts
            </Typography>
          </Box>
        </Box>

        {/* Wrapper scrollável horizontalmente */}
        <Box
          ref={scrollRef}
          sx={{
            flex: 1,
            overflowX: scrollable ? 'auto' : 'hidden',
            overflowY: 'hidden',
            mx: -0.5,
            minHeight: 0,
            // Scrollbar fina e discreta
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-track': { bgcolor: '#111', borderRadius: 2 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: '#2a2a2a',
              borderRadius: 2,
              '&:hover': { bgcolor: '#3a3a3a' },
            },
          }}
        >
          <Box sx={{
            width: chartPxWidth ? `${chartPxWidth}px` : '100%',
            minWidth: '100%',
          }}>
            <Chart
              options={options}
              series={series}
              type="area"
              height={280}
              width={chartPxWidth ?? '100%'}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default LineChart;
