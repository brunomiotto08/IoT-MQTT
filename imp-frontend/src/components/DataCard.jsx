import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip,
  Avatar,
  LinearProgress
} from '@mui/material';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownOutlined from '@mui/icons-material/TrendingDownOutlined';

function DataCard({ title, value, unit, icon, color = 'primary', isStatus = false, threshold = null }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  // Detectar mudanças no valor e adicionar animação
  useEffect(() => {
    if (value !== prevValue && value !== null && value !== undefined) {
      setIsUpdating(true);
      
      const timer = setTimeout(() => {
        setPrevValue(value);
        setIsUpdating(false);
      }, 400); // Duração do fade out
      
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);
  // Carregar thresholds personalizados do localStorage
  const loadThresholds = () => {
    try {
      const savedConfig = localStorage.getItem('imp_thresholds');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        
        // Migração automática: vibracao -> pressao
        if (config.vibracao && !config.pressao) {
          config.pressao = config.vibracao;
          delete config.vibracao;
          localStorage.setItem('imp_thresholds', JSON.stringify(config));
        }
        
        return config;
      }
    } catch (err) {
      console.error('Erro ao carregar thresholds:', err);
    }
    
    // Padrão
    return {
      temperatura: { atenção: 90, critico: 100 },
      pressao: { atenção: 5, critico: 8 }
    };
  };

  const thresholds = loadThresholds();

  // Determinar cor dinâmica baseada em threshold
  const getDynamicColor = () => {
    if (!threshold || value === null || value === undefined) return color;
    
    const numValue = parseFloat(value);
    
    // Temperatura
    if (title.toLowerCase().includes('temperatura')) {
      // Verificar MÁXIMOS
      if (numValue >= thresholds.temperatura.critico) return 'error';
      if (numValue >= thresholds.temperatura.atenção) return 'warning';
      
      // Verificar MÍNIMOS
      if (numValue <= 0) return 'error';    // Crítico baixo
      if (numValue <= 10) return 'info';    // Azul para temperatura muito baixa
      
      // Normal
      if (numValue >= 70) return 'success';
      return 'primary';
    }
    
    // Pressão
    if (title.toLowerCase().includes('pressão') || title.toLowerCase().includes('pressao')) {
      // Verificar MÁXIMOS
      if (numValue >= thresholds.pressao.critico) return 'error';
      if (numValue >= thresholds.pressao.atenção) return 'warning';
      
      // Verificar MÍNIMOS
      if (numValue <= 0.1) return 'error';  // Crítico baixo (máquina parada?)
      if (numValue <= 0.5) return 'info';   // Azul para pressão muito baixa
      
      // Normal
      if (numValue >= 3) return 'success';
      return 'primary';
    }
    
    return color;
  };
  
  const dynamicColor = getDynamicColor();
  const isAlert = dynamicColor === 'error' || dynamicColor === 'warning' || dynamicColor === 'info';
  
  // Obter cores RGB baseadas no estado
  const getColorValues = () => {
    switch(dynamicColor) {
      case 'error':
        return {
          rgb: '239, 68, 68',
          hex: '#ef4444',
          light: '#f87171',
          glow: 'rgba(239, 68, 68, 0.6)'
        };
      case 'warning':
        return {
          rgb: '245, 158, 11',
          hex: '#f59e0b',
          light: '#fbbf24',
          glow: 'rgba(245, 158, 11, 0.6)'
        };
      case 'info':
        return {
          rgb: '59, 130, 246',
          hex: '#3b82f6',
          light: '#60a5fa',
          glow: 'rgba(59, 130, 246, 0.6)'
        };
      case 'success':
        return {
          rgb: '16, 185, 129',
          hex: '#10b981',
          light: '#34d399',
          glow: 'rgba(16, 185, 129, 0.4)'
        };
      case 'secondary':
        return {
          rgb: '100, 100, 100',
          hex: '#999999',
          light: '#bbbbbb',
          glow: 'rgba(100, 100, 100, 0.4)'
        };
      default: // primary
        return {
          rgb: '120, 120, 120',
          hex: '#888888',
          light: '#aaaaaa',
          glow: 'rgba(120, 120, 120, 0.4)'
        };
    }
  };
  
  const colors = getColorValues();
  
  const getStatusChip = (status) => {
    if (!isStatus || !status) return null;
    
    const statusConfig = {
      'ativo': { label: 'Ativo', color: 'success' },
      'running': { label: 'Ativo', color: 'success' },
      'parado': { label: 'Parado', color: 'warning' },
      'stopped': { label: 'Parado', color: 'warning' },
      'erro': { label: 'Erro', color: 'error' },
      'error': { label: 'Erro', color: 'error' }
    };
    
    const config = statusConfig[status.toLowerCase()] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getValueColor = () => {
    if (isStatus) return 'text.primary';
    if (value === null || value === undefined) return 'text.secondary';
    return `${dynamicColor}.main`;
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
          borderColor: isAlert 
            ? `rgba(${colors.rgb}, 0.7)`
            : 'rgba(80, 80, 80, 0.3)',
          boxShadow: isAlert
            ? `0 8px 32px rgba(${colors.rgb}, 0.5), 0 0 60px rgba(${colors.rgb}, 0.4)`
            : '0 8px 32px rgba(0, 0, 0, 0.6)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          animation: isAlert ? 'alertPulse 2s ease-in-out infinite' : 'none',
          '@keyframes alertPulse': {
            '0%, 100%': {
              boxShadow: isAlert
                ? `0 8px 32px rgba(${colors.rgb}, 0.5)`
                : '0 8px 32px rgba(0, 0, 0, 0.6)',
            },
            '50%': {
              boxShadow: isAlert
                ? `0 8px 45px rgba(${colors.rgb}, 0.9), 0 0 80px rgba(${colors.rgb}, 0.7)`
                : '0 8px 32px rgba(0, 0, 0, 0.6)',
            }
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: `linear-gradient(90deg, ${colors.hex}, ${colors.light})`,
            opacity: isAlert ? 1 : 0.6,
            animation: isAlert ? 'glow 1.5s ease-in-out infinite' : 'none',
          },
          '@keyframes glow': {
            '0%, 100%': { opacity: 0.6 },
            '50%': { opacity: 1 }
          },
          '&:hover': {
            transform: 'translateY(-8px) scale(1.02)',
            boxShadow: isAlert
              ? `0 20px 60px rgba(${colors.rgb}, 0.7)`
              : '0 20px 60px rgba(0, 0, 0, 0.8)',
            borderColor: isAlert
              ? `rgba(${colors.rgb}, 0.9)`
              : 'rgba(120, 120, 120, 0.5)',
          }
        }}
      >
        <CardContent sx={{ p: 5, position: 'relative', zIndex: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            mb: 4,
            gap: 3
          }}>
            <Typography 
              variant="overline" 
              color="text.secondary" 
              sx={{ 
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                fontSize: '0.75rem',
                color: '#94a3b8',
                flex: 1,
              }}
            >
              {title}
            </Typography>
            {icon && (
              <Avatar 
                sx={{ 
                  bgcolor: 'rgba(40, 40, 40, 0.6)',
                  border: `3px solid`,
                  borderColor: '#b0b0b0',
                  color: '#ffffff',
                  width: 56,
                  height: 56,
                  flexShrink: 0,
                  animation: 'pulse 3s ease-in-out infinite',
                  boxShadow: '0 0 20px rgba(255, 255, 255, 0.1)',
                  '& .MuiSvgIcon-root': {
                    fontSize: '28px',
                    filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))',
                  }
                }}
              >
                {icon}
              </Avatar>
            )}
          </Box>
          
          <Box sx={{ textAlign: 'center', mb: 3, mt: 3 }}>
            <Typography 
              variant="h3" 
              component="div"
              sx={{ 
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 900,
                color: getValueColor(),
                fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
                lineHeight: 1,
                textShadow: `0 0 40px ${colors.glow}`,
                transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
                opacity: isUpdating ? 0 : 1,
                transform: isUpdating ? 'translateY(-10px)' : 'translateY(0)',
              }}
            >
              {value !== null && value !== undefined ? (
                <>
                  {value}
                  {unit && (
                    <Typography 
                      component="span" 
                      variant="body2" 
                      sx={{ 
                        ml: 2, 
                        fontSize: '1.25rem', 
                        fontWeight: 700,
                        fontFamily: '"Poppins", sans-serif',
                        color: '#94a3b8',
                        transition: 'opacity 0.4s ease-in-out',
                        opacity: isUpdating ? 0 : 1,
                      }}
                    >
                      {unit}
                    </Typography>
                  )}
                </>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3 }}>
                  <LinearProgress 
                    sx={{ 
                      width: '70%', 
                      height: 6,
                      borderRadius: 3,
                    }} 
                  />
                </Box>
              )}
            </Typography>
          </Box>
          
          {isStatus && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              {getStatusChip(value)}
            </Box>
          )}
          
          {!isStatus && value !== null && value !== undefined && (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                mt: 3,
                pt: 3,
                borderTop: '1px solid',
                borderColor: 'rgba(80, 80, 80, 0.2)'
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: colors.hex,
                  mr: 1.5,
                  animation: 'pulse 2s ease-in-out infinite',
                  boxShadow: `0 0 15px ${colors.glow}`,
                }}
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 700,
                  fontFamily: '"Outfit", sans-serif',
                  color: '#e2e8f0',
                  letterSpacing: '0.05em',
                }}
              >
                AO VIVO
              </Typography>
            </Box>
          )}
        </CardContent>

        {/* Decorative gradient orb */}
        <Box
          sx={{
            position: 'absolute',
            bottom: -40,
            right: -40,
            width: 130,
            height: 130,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(60, 60, 60, 0.15) 0%, transparent 70%)',
            filter: 'blur(25px)',
            pointerEvents: 'none',
          }}
        />
      </Card>
  );
}

export default DataCard;


