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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Typography 
              variant="subtitle1" 
              color="text.secondary" 
              sx={{ 
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                fontSize: '0.9rem'
              }}
            >
              {title}
            </Typography>
            {icon && (
              <Avatar 
                sx={{ 
                  bgcolor: `${color}.light`, 
                  color: `${color}.main`,
                  width: 48,
                  height: 48
                }}
              >
                {icon}
              </Avatar>
            )}
          </Box>
          
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography 
              variant="h3" 
              component="div"
              sx={{ 
                fontWeight: 700,
                color: getValueColor(),
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                lineHeight: 1.1
              }}
            >
              {value !== null && value !== undefined ? (
                <>
                  {value}
                  {unit && (
                    <Typography 
                      component="span" 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ ml: 1.5, fontSize: '0.875rem' }}
                    >
                      {unit}
                    </Typography>
                  )}
                </>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LinearProgress 
                    sx={{ 
                      width: '60%', 
                      height: 4,
                      borderRadius: 2,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: `${color}.main`
                      }
                    }} 
                  />
                </Box>
              )}
            </Typography>
          </Box>
          
          {isStatus && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              {getStatusChip(value)}
            </Box>
          )}
          
          {!isStatus && value !== null && value !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
              <TrendingUpOutlined 
                sx={{ 
                  fontSize: 16, 
                  color: `${color}.main`,
                  mr: 0.5
                }} 
              />
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontSize: '0.7rem' }}
              >
                Tempo real
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
  );
}

export default DataCard;


