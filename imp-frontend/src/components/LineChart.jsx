import React from 'react';
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
      speed: 800,
      dynamicAnimation: { speed: 1000 } 
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
      }
    },
    zoom: { enabled: true },
    dropShadow: {
      enabled: true,
      color: '#1976d2',
      top: 18,
      left: 7,
      blur: 10,
      opacity: 0.1
    }
  },
  colors: ['#6366f1'],
  dataLabels: { enabled: false },
  stroke: { 
    curve: 'smooth', 
    width: 3,
    lineCap: 'round'
  },
  grid: {
    borderColor: 'rgba(0,0,0,0.1)',
    strokeDashArray: 3,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: true } }
  },
  xaxis: { 
    type: 'datetime', 
    labels: { 
      datetimeUTC: false, 
      format: 'HH:mm:ss',
      style: {
        colors: '#666',
        fontSize: '12px'
      }
    },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    title: { 
      text: 'Temperatura (°C)',
      style: {
        color: '#666',
        fontSize: '14px',
        fontWeight: 600
      }
    },
    labels: {
      style: {
        colors: '#666',
        fontSize: '12px'
      },
      formatter: (value) => { 
        return value !== undefined ? value.toFixed(1) : '0'; 
      }
    }
  },
  tooltip: { 
    x: { format: 'dd MMM yyyy - HH:mm:ss' },
    style: {
      fontSize: '12px'
    },
    theme: 'light'
  },
  markers: { 
    size: 4,
    colors: ['#6366f1'],
    strokeColors: '#1e293b',
    strokeWidth: 2,
    hover: {
      size: 6
    }
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'dark',
      type: 'vertical',
      shadeIntensity: 0.5,
      gradientToColors: ['#6366f1'],
      inverseColors: false,
      opacityFrom: 0.3,
      opacityTo: 0.05,
      stops: [0, 100]
    }
  }
};

function LineChart({ series }) {
  const dataPoints = series[0]?.data?.length || 0;
  const latestValue = series[0]?.data?.[dataPoints - 1]?.[1] || 0;
  
  const getTrendDirection = () => {
    if (dataPoints < 2) return 'neutral';
    const recent = series[0]?.data?.slice(-5) || [];
    if (recent.length < 2) return 'neutral';
    
    const first = recent[0][1];
    const last = recent[recent.length - 1][1];
    return last > first ? 'up' : last < first ? 'down' : 'neutral';
  };

  const trendDirection = getTrendDirection();

  return (
    <Card 
        elevation={0}
        sx={{ 
          height: '100%',
          borderRadius: 3,
          background: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            borderColor: 'primary.main'
          }
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUpOutlined 
                sx={{ 
                  fontSize: 28, 
                  color: 'primary.main',
                  mr: 2
                }} 
              />
              <Typography 
                variant="h5" 
                component="h2" 
                sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  fontSize: '1.3rem'
                }}
              >
                Histórico de Temperatura
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Chip 
                icon={<AccessTimeOutlined />}
                label={`${dataPoints} pontos`}
                size="small"
                variant="outlined"
                color="primary"
              />
              
              {trendDirection !== 'neutral' && (
                <Chip 
                  icon={<TrendingUpOutlined />}
                  label={trendDirection === 'up' ? 'Subindo' : 'Descendo'}
                  size="small"
                  color={trendDirection === 'up' ? 'success' : 'warning'}
                  variant="filled"
                />
              )}
            </Box>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography 
              variant="h4" 
              component="div"
              sx={{ 
                fontWeight: 700,
                color: 'primary.main',
                textAlign: 'center',
                mb: 1
              }}
            >
              {latestValue.toFixed(1)}°C
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ textAlign: 'center', fontSize: '0.75rem' }}
            >
              Última leitura
            </Typography>
          </Box>
          
          <Chart 
            options={lineChartOptions} 
            series={series} 
            type="area" 
            height={350} 
          />
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ fontSize: '0.8rem' }}
            >
              Dados atualizados em tempo real via MQTT
            </Typography>
          </Box>
        </CardContent>
      </Card>
  );
}

export default LineChart;


