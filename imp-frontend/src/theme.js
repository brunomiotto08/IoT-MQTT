import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1e40af', // Azul escuro profundo
      dark: '#1e3a8a',
      light: '#3b82f6',
    },
    secondary: {
      main: '#f97316', // Laranja vibrante
      dark: '#ea580c',
      light: '#fb923c',
    },
    success: {
      main: '#10b981',
      dark: '#059669',
      light: '#34d399',
    },
    warning: {
      main: '#f59e0b',
      dark: '#d97706',
      light: '#fbbf24',
    },
    error: {
      main: '#ef4444',
      dark: '#dc2626',
      light: '#f87171',
    },
    info: {
      main: '#1e40af', // Azul escuro
      dark: '#1e3a8a',
      light: '#3b82f6',
    },
    background: {
      default: '#0a0a0a', // Preto
      paper: 'rgba(20, 20, 20, 0.95)', // Cinza escuro com transparência
    },
    text: {
      primary: '#ffffff',
      secondary: '#e2e8f0',
    },
    divider: 'rgba(60, 60, 60, 0.3)',
  },
  typography: {
    fontFamily: '"Outfit", "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 900,
      fontSize: '3.5rem',
      letterSpacing: '-0.03em',
      background: 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h2: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 800,
      fontSize: '2.5rem',
      letterSpacing: '-0.02em',
    },
    h3: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 800,
      fontSize: '2rem',
      letterSpacing: '-0.02em',
    },
    h4: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 700,
      fontSize: '1.75rem',
      letterSpacing: '-0.01em',
    },
    h5: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 700,
      fontSize: '1.5rem',
      letterSpacing: '-0.01em',
    },
    h6: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    body1: {
      fontFamily: '"Poppins", sans-serif',
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.7,
    },
    body2: {
      fontFamily: '"Poppins", sans-serif',
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    button: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
    caption: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 500,
    },
    overline: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 700,
      letterSpacing: '0.1em',
    },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    'none',
    '0 2px 4px rgba(0,0,0,0.1)',
    '0 4px 8px rgba(0,0,0,0.12)',
    '0 8px 16px rgba(0,0,0,0.14)',
    '0 12px 24px rgba(0,0,0,0.16)',
    '0 16px 32px rgba(0,0,0,0.18)',
    '0 20px 40px rgba(30, 64, 175, 0.3)', // Azul escuro
    '0 24px 48px rgba(249, 115, 22, 0.3)', // Laranja
    ...Array(17).fill('0 0 0 0 rgba(0,0,0,0)'),
  ],
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(30, 64, 175, 0.2)',
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: '0 20px 60px rgba(30, 64, 175, 0.4)',
            borderColor: 'rgba(249, 115, 22, 0.4)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '1rem',
          padding: '14px 32px',
          boxShadow: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        contained: {
          background: 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(135deg, #1e3a8a 0%, #ea580c 100%)',
            boxShadow: '0 8px 24px rgba(249, 115, 22, 0.5)',
            transform: 'translateY(-2px)',
          },
        },
        outlined: {
          borderWidth: 2,
          borderColor: 'rgba(30, 64, 175, 0.6)',
          color: '#ffffff',
          '&:hover': {
            borderWidth: 2,
            borderColor: '#f97316',
            background: 'rgba(249, 115, 22, 0.15)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 14,
            backgroundColor: 'rgba(25, 25, 25, 0.8)',
            transition: 'all 0.3s ease',
            '& fieldset': {
              borderColor: 'rgba(100, 100, 100, 0.4)',
              borderWidth: 2,
            },
            '&:hover fieldset': {
              borderColor: 'rgba(30, 64, 175, 0.6)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#f97316',
              boxShadow: '0 0 0 4px rgba(249, 115, 22, 0.15)',
            },
          },
          '& .MuiInputLabel-root': {
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontFamily: '"Outfit", sans-serif',
          fontWeight: 700,
          fontSize: '0.875rem',
          padding: '4px 8px',
        },
        outlined: {
          borderWidth: 2,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: 'rgba(30, 64, 175, 0.15)',
          height: 6,
        },
        bar: {
          borderRadius: 4,
          background: 'linear-gradient(90deg, #1e40af 0%, #f97316 100%)',
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#f97316',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontFamily: '"Outfit", sans-serif',
          fontWeight: 700,
        },
      },
    },
  },
});

export default theme;
