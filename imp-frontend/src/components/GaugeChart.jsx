import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import Chart from 'react-apexcharts';
import ThermostatOutlined from '@mui/icons-material/ThermostatOutlined';

const gaugeOptions = {
  chart: { 
    type: 'radialBar',
    background: 'transparent',
    fontFamily: 'Inter, sans-serif',
    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 1000
    }
  },
  plotOptions: {
    radialBar: {
      startAngle: -90,
      endAngle: 90,
      hollow: { 
        size: '60%',
        background: 'rgba(255,255,255,0.1)'
      },
      track: {
        background: 'rgba(0,0,0,0.1)',
        strokeWidth: '97%',
        margin: 5,
      },
      dataLabels: {
        name: { 
          show: false 
        },
        value: {
          fontSize: '28px',
          fontWeight: 700,
          show: true,
          formatter: (val) => `${parseFloat(val).toFixed(1)}°C`,
          color: '#1976d2',
          offsetY: -10
        }
      }
    }
  },
  fill: { 
    type: 'gradient',
    gradient: {
      shade: 'dark',
      type: 'horizontal',
      shadeIntensity: 0.8,
      gradientToColors: ['#6366f1', '#8b5cf6'],
      inverseColors: false,
      opacityFrom: 1,
      opacityTo: 0.8,
      stops: [0, 100]
    }
  },
  stroke: { 
    lineCap: 'round',
    width: 8
  },
  labels: ['Temperatura'],
  colors: ['#6366f1']
};

function GaugeChart({ series }) {
  const getTemperatureStatus = (temp) => {
    if (temp >= 80) return { status: 'Crítico', color: 'error' };
    if (temp >= 60) return { status: 'Alto', color: 'warning' };
    if (temp >= 40) return { status: 'Normal', color: 'success' };
    return { status: 'Baixo', color: 'info' };
  };

  const temperature = series[0] || 0;
  const tempStatus = getTemperatureStatus(temperature);

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
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
            <ThermostatOutlined 
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
              Temperatura Atual
            </Typography>
          </Box>
          
          <Box sx={{ position: 'relative', mb: 4 }}>
            <Chart 
              options={gaugeOptions} 
              series={series} 
              type="radialBar" 
              height={280} 
            />
            
            {/* Status indicator */}
            <Box 
              sx={{ 
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Box 
                sx={{ 
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: `${tempStatus.color}.main`,
                  animation: 'pulse 2s infinite'
                }} 
              />
              <Typography 
                variant="caption" 
                color={`${tempStatus.color}.main`}
                sx={{ fontWeight: 600 }}
              >
                {tempStatus.status}
              </Typography>
            </Box>
          </Box>
          
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontSize: '0.8rem', mt: 2 }}
          >
            Última leitura em tempo real
          </Typography>
        </CardContent>
      </Card>
  );
}

export default GaugeChart;



