import React, { useState, useEffect } from 'react';
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
      speed: 1200,
      dynamicAnimation: {
        enabled: true,
        speed: 800
      }
    }
  },
  plotOptions: {
    radialBar: {
      startAngle: -135,
      endAngle: 135,
      hollow: { 
        size: '65%',
        background: 'rgba(15, 15, 25, 0.5)',
        margin: 15,
      },
      track: {
        background: 'rgba(30, 64, 175, 0.1)', // Azul escuro
        strokeWidth: '100%',
        margin: 0,
      },
      dataLabels: {
        name: { 
          show: false 
        },
        value: {
          fontSize: '36px',
          fontWeight: 800,
          show: true,
          formatter: (val) => `${parseFloat(val).toFixed(1)}°C`,
          color: '#f97316', // Laranja
          offsetY: 10
        }
      }
    }
  },
  fill: { 
    type: 'gradient',
    gradient: {
      shade: 'dark',
      type: 'horizontal',
      shadeIntensity: 0.5,
      gradientToColors: ['#f97316'], // Laranja
      inverseColors: false,
      opacityFrom: 1,
      opacityTo: 1,
      stops: [0, 100]
    }
  },
  stroke: { 
    lineCap: 'round',
    width: 0
  },
  labels: ['Temperatura'],
  colors: ['#1e40af'] // Azul escuro
};

function GaugeChart({ series }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [prevTemp, setPrevTemp] = useState(series[0] || 0);

  const temperature = series[0] || 0;

  // Detectar mudanças na temperatura
  useEffect(() => {
    if (temperature !== prevTemp) {
      setIsUpdating(true);
      
      const timer = setTimeout(() => {
        setPrevTemp(temperature);
        setIsUpdating(false);
      }, 400); // Duração do fade out
      
      return () => clearTimeout(timer);
    }
  }, [temperature, prevTemp]);

  const getTemperatureStatus = (temp) => {
    if (temp >= 80) return { status: 'Crítico', color: 'error' };
    if (temp >= 60) return { status: 'Alto', color: 'warning' };
    if (temp >= 40) return { status: 'Normal', color: 'success' };
    return { status: 'Baixo', color: 'info' };
  };

  const tempStatus = getTemperatureStatus(temperature);

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
            background: 'linear-gradient(90deg, #1e40af, #f97316)',
            opacity: 0.8,
          },
          '&:hover': {
            transform: 'translateY(-8px) scale(1.02)',
            boxShadow: '0 20px 60px rgba(249, 115, 22, 0.4)',
            borderColor: 'rgba(30, 64, 175, 0.6)',
          }
        }}
      >
        <CardContent sx={{ p: 5, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
            <ThermostatOutlined 
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
              Temperatura Atual
            </Typography>
          </Box>
          
          <Box 
            sx={{ 
              position: 'relative', 
              mb: 2,
              transition: 'opacity 0.4s ease-in-out',
              opacity: isUpdating ? 0 : 1,
            }}
          >
            <Chart 
              options={gaugeOptions} 
              series={series} 
              type="radialBar" 
              height={300} 
            />
            
            {/* Status indicator */}
            <Box 
              sx={{ 
                position: 'absolute',
                bottom: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 3,
                py: 1.5,
                borderRadius: 3,
                background: 'rgba(15, 15, 25, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid',
                borderColor: `${tempStatus.color}.main`,
              }}
            >
              <Box 
                sx={{ 
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: `${tempStatus.color}.main`,
                  animation: 'pulse 2s infinite',
                  boxShadow: `0 0 10px ${tempStatus.color}.main`,
                }} 
              />
              <Typography 
                variant="caption" 
                color={`${tempStatus.color}.main`}
                sx={{ fontWeight: 700, fontSize: '0.9rem' }}
              >
                {tempStatus.status}
              </Typography>
            </Box>
          </Box>
          
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.9rem', 
              mt: 4,
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'rgba(80, 80, 80, 0.2)',
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 600,
              color: '#94a3b8',
            }}
          >
            Última leitura em tempo real
          </Typography>
        </CardContent>

        {/* Decorative gradient orb */}
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249, 115, 22, 0.15) 0%, rgba(30, 64, 175, 0.1) 50%, transparent 70%)',
            filter: 'blur(35px)',
            pointerEvents: 'none',
          }}
        />
      </Card>
  );
}

export default GaugeChart;



