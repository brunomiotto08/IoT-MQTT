import React from 'react';
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

function DataCard({ title, value, unit, icon, color = 'primary', isStatus = false }) {
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
    return `${color}.main`;
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
            background: `linear-gradient(90deg, ${color === 'primary' ? '#888888' : color === 'secondary' ? '#999999' : color === 'success' ? '#10b981' : color === 'warning' ? '#f59e0b' : '#ef4444'}, ${color === 'primary' ? '#aaaaaa' : color === 'secondary' ? '#bbbbbb' : color === 'success' ? '#34d399' : color === 'warning' ? '#fbbf24' : '#f87171'})`,
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
                textShadow: `0 0 40px ${color === 'primary' ? 'rgba(139, 92, 246, 0.4)' : color === 'secondary' ? 'rgba(6, 182, 212, 0.4)' : color === 'success' ? 'rgba(16, 185, 129, 0.4)' : color === 'warning' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
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
                  bgcolor: `${color}.main`,
                  mr: 1.5,
                  animation: 'pulse 2s ease-in-out infinite',
                  boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)',
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


