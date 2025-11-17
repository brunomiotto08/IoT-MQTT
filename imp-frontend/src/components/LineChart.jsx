import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import Chart from 'react-apexcharts';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import AccessTimeOutlined from '@mui/icons-material/AccessTimeOutlined';

const lineChartOptions = {
  chart: {
    id: 'realtime-temperature',
    background: 'transparent',
    fontFamily: 'Inter, sans-serif',
    animations: { 
      enabled: true, 
      easing: 'easeinout', 
      speed: 1000,
      dynamicAnimation: { speed: 1200 } 
    },
    toolbar: { 
      show: true,
      tools: {
        download: true,
        selection: true,
        zoom: true,
        zoomin: true,
        zoomout: true,
        pan: true,
        reset: true
      },
      offsetY: -10,
    },
    zoom: { enabled: true },
    dropShadow: {
      enabled: true,
      color: '#8b5cf6',
      top: 0,
      left: 0,
      blur: 20,
      opacity: 0.3
    }
  },
  colors: ['#8b5cf6'],
  dataLabels: { enabled: false },
  stroke: { 
    curve: 'smooth', 
    width: 4,
    lineCap: 'round'
  },
  grid: {
    borderColor: 'rgba(139, 92, 246, 0.1)',
    strokeDashArray: 4,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: true } },
    padding: {
      top: 0,
      right: 20,
      bottom: 0,
      left: 10
    }
  },
  xaxis: { 
    type: 'datetime', 
    labels: { 
      datetimeUTC: false, 
      format: 'HH:mm:ss',
      style: {
        colors: '#94a3b8',
        fontSize: '13px',
        fontWeight: 600
      }
    },
    axisBorder: { 
      show: true,
      color: 'rgba(139, 92, 246, 0.2)'
    },
    axisTicks: { show: false }
  },
  yaxis: {
    title: { 
      text: 'Temperatura (°C)',
      style: {
        color: '#8b5cf6',
        fontSize: '14px',
        fontWeight: 700
      }
    },
    labels: {
      style: {
        colors: '#94a3b8',
        fontSize: '13px',
        fontWeight: 600
      },
      formatter: (value) => { 
        return value !== undefined ? value.toFixed(1) : '0'; 
      }
    }
  },
  tooltip: { 
    x: { format: 'dd MMM yyyy - HH:mm:ss' },
    style: {
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif'
    },
    theme: 'dark',
    custom: function({ series, seriesIndex, dataPointIndex, w }) {
      const value = series[seriesIndex][dataPointIndex];
      const timestamp = new Date(w.globals.seriesX[seriesIndex][dataPointIndex]);
      return `<div style="background: rgba(15, 15, 25, 0.95); backdrop-filter: blur(20px); padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.3);">
        <div style="color: #8b5cf6; font-weight: 700; font-size: 18px; margin-bottom: 4px;">${value.toFixed(1)}°C</div>
        <div style="color: #94a3b8; font-size: 12px;">${timestamp.toLocaleString('pt-BR')}</div>
      </div>`;
    }
  },
  markers: { 
    size: 5,
    colors: ['#8b5cf6'],
    strokeColors: 'rgba(139, 92, 246, 0.3)',
    strokeWidth: 3,
    hover: {
      size: 8,
      sizeOffset: 3
    }
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'dark',
      type: 'vertical',
      shadeIntensity: 0.4,
      gradientToColors: ['#06b6d4'],
      inverseColors: false,
      opacityFrom: 0.6,
      opacityTo: 0.05,
      stops: [0, 100]
    }
  }
};

function LineChart({ series, title = 'Histórico de Temperatura', unit = '°C', color = '#8b5cf6' }) {
  const dataPoints = series[0]?.data?.length || 0;
  const latestValue = series[0]?.data?.[dataPoints - 1]?.[1] || 0;
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [prevLatestValue, setPrevLatestValue] = useState(latestValue);

  // Detectar mudanças no valor mais recente
  useEffect(() => {
    if (latestValue !== prevLatestValue && latestValue !== 0) {
      setIsUpdating(true);
      
      const timer = setTimeout(() => {
        setPrevLatestValue(latestValue);
        setIsUpdating(false);
      }, 400); // Duração do fade out
      
      return () => clearTimeout(timer);
    }
  }, [latestValue, prevLatestValue]);
  
  // Detectar se há múltiplas séries e definir cores específicas
  const isMultipleSeries = series.length > 1;
  const chartColors = isMultipleSeries 
    ? ['#f97316', '#1e40af'] // Laranja para Envelope, Azul para Saco de Ar
    : [color];
  
  const getTrendDirection = () => {
    if (dataPoints < 2) return 'neutral';
    const recent = series[0]?.data?.slice(-5) || [];
    if (recent.length < 2) return 'neutral';
    
    const first = recent[0][1];
    const last = recent[recent.length - 1][1];
    return last > first ? 'up' : last < first ? 'down' : 'neutral';
  };

  const trendDirection = getTrendDirection();
  
  // Criar opções dinâmicas baseadas nos props
  const dynamicOptions = {
    ...lineChartOptions,
    colors: chartColors,
    chart: {
      ...lineChartOptions.chart,
      dropShadow: {
        ...lineChartOptions.chart.dropShadow,
        color: chartColors[0],
        enabled: !isMultipleSeries
      }
    },
    stroke: {
      ...lineChartOptions.stroke,
      width: isMultipleSeries ? 3 : 4
    },
    legend: isMultipleSeries ? {
      show: true,
      position: 'top',
      horizontalAlign: 'center',
      fontSize: '14px',
      fontWeight: 700,
      labels: {
        colors: '#ffffff'
      },
      markers: {
        width: 12,
        height: 12,
        radius: 6
      }
    } : { show: false },
    yaxis: {
      ...lineChartOptions.yaxis,
      title: {
        text: isMultipleSeries ? `Pressão (${unit})` : `${series[0]?.name || title} (${unit})`,
        style: {
          color: isMultipleSeries ? '#ffffff' : color,
          fontSize: '14px',
          fontWeight: 700
        }
      }
    },
    tooltip: {
      ...lineChartOptions.tooltip,
      custom: function({ series: s, seriesIndex, dataPointIndex, w }) {
        const value = s[seriesIndex][dataPointIndex];
        const timestamp = new Date(w.globals.seriesX[seriesIndex][dataPointIndex]);
        const displayValue = unit === 'unidades' ? value.toFixed(0) : value.toFixed(2);
        const seriesColor = chartColors[seriesIndex];
        const seriesName = w.config.series[seriesIndex].name;
        return `<div style="background: rgba(15, 15, 25, 0.95); backdrop-filter: blur(20px); padding: 12px 16px; border-radius: 8px; border: 1px solid ${seriesColor}40;">
          ${isMultipleSeries ? `<div style="color: ${seriesColor}; font-weight: 600; font-size: 13px; margin-bottom: 4px;">${seriesName}</div>` : ''}
          <div style="color: ${seriesColor}; font-weight: 700; font-size: 18px; margin-bottom: 4px;">${displayValue} ${unit}</div>
          <div style="color: #94a3b8; font-size: 12px;">${timestamp.toLocaleString('pt-BR')}</div>
        </div>`;
      }
    },
    markers: {
      ...lineChartOptions.markers,
      colors: chartColors,
      strokeColors: chartColors.map(c => `${c}50`)
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.4,
        gradientToColors: chartColors,
        inverseColors: false,
        opacityFrom: isMultipleSeries ? 0.4 : 0.6,
        opacityTo: 0.05,
        stops: [0, 100]
      }
    },
    grid: {
      ...lineChartOptions.grid,
      borderColor: isMultipleSeries ? 'rgba(30, 64, 175, 0.15)' : 'rgba(139, 92, 246, 0.1)'
    }
  };

  return (
    <Card 
        elevation={0}
        sx={{ 
          width: '100%',
          height: '100%',
          borderRadius: 4,
          background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '2px solid',
          borderColor: 'rgba(80, 80, 80, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #888888, #aaaaaa)',
            opacity: 0.6,
          },
          '&:hover': {
            transform: 'translateY(-8px) scale(1.02)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
            borderColor: 'rgba(120, 120, 120, 0.5)',
          }
        }}
      >
        <CardContent sx={{ p: 5, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUpOutlined 
                sx={{ 
                  fontSize: 36, 
                  color: '#ffffff',
                  mr: 2
                }} 
              />
              <Typography 
                variant="h5" 
                component="h2" 
                sx={{ 
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 800,
                  color: '#ffffff',
                  fontSize: '1.75rem',
                  letterSpacing: '-0.01em',
                }}
              >
                {title}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Chip 
                icon={<AccessTimeOutlined />}
                label={`${dataPoints} leituras`}
                size="medium"
                variant="outlined"
                color="primary"
                sx={{ 
                  fontWeight: 700,
                  borderWidth: 2,
                  mx: 1.5,
                  my: 1,
                }}
              />
              
              {trendDirection !== 'neutral' && (
                <Chip 
                  icon={<TrendingUpOutlined />}
                  label={trendDirection === 'up' ? 'Subindo' : 'Descendo'}
                  size="medium"
                  color={trendDirection === 'up' ? 'success' : 'warning'}
                  variant="filled"
                  sx={{ 
                    fontWeight: 700,
                    mx: 1.5,
                    my: 1,
                  }}
                />
              )}
            </Box>
          </Box>
          
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            {isMultipleSeries ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
                {series.map((s, idx) => {
                  const lastVal = s.data?.[s.data.length - 1]?.[1] || 0;
                  return (
                    <Box key={idx}>
                      <Typography 
                        variant="h3" 
                        component="div"
                        sx={{ 
                          fontWeight: 800,
                          color: chartColors[idx],
                          mb: 0.5,
                          textShadow: `0 0 30px ${chartColors[idx]}50`,
                          transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
                          opacity: isUpdating ? 0 : 1,
                          transform: isUpdating ? 'translateY(-8px)' : 'translateY(0)',
                        }}
                      >
                        {lastVal.toFixed(2)} {unit}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontSize: '0.875rem', 
                          fontWeight: 600,
                          color: chartColors[idx],
                          transition: 'opacity 0.4s ease-in-out',
                          opacity: isUpdating ? 0 : 1,
                        }}
                      >
                        {s.name}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <>
                <Typography 
                  variant="h3" 
                  component="div"
                  sx={{ 
                    fontWeight: 800,
                    background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 0.5,
                    textShadow: `0 0 30px ${color}50`,
                    transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
                    opacity: isUpdating ? 0 : 1,
                    transform: isUpdating ? 'translateY(-8px)' : 'translateY(0)',
                  }}
                >
                  {unit === 'unidades' ? latestValue.toFixed(0) : latestValue.toFixed(1)} {unit}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    fontSize: '0.875rem', 
                    fontWeight: 600, 
                    transition: 'opacity 0.4s ease-in-out',
                    opacity: isUpdating ? 0 : 1,
                  }}
                >
                  Última leitura
                </Typography>
              </>
            )}
          </Box>
          
          <Chart 
            options={dynamicOptions} 
            series={series} 
            type="area" 
            height={340} 
          />
          
          <Box 
            sx={{ 
              mt: 4, 
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'rgba(80, 80, 80, 0.2)',
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: '#ffffff',
                animation: 'pulse 2s ease-in-out infinite',
                boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)',
              }}
            />
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: '0.9rem', 
                fontWeight: 700,
                fontFamily: '"Poppins", sans-serif',
                color: '#94a3b8',
              }}
            >
              Dados atualizados em tempo real via MQTT
            </Typography>
          </Box>
        </CardContent>

        {/* Decorative gradient orb */}
        <Box
          sx={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(60, 60, 60, 0.15) 0%, transparent 70%)',
            filter: 'blur(45px)',
            pointerEvents: 'none',
          }}
        />
      </Card>
  );
}

export default LineChart;


