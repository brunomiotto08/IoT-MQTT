import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6',
      dark: '#2563eb',
      light: '#60a5fa',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6366f1',
      dark: '#4f46e5',
      light: '#818cf8',
    },
    success: {
      main: '#22c55e',
      dark: '#16a34a',
      light: '#4ade80',
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
      main: '#3b82f6',
      dark: '#2563eb',
      light: '#60a5fa',
    },
    background: {
      default: '#0f0f0f',
      paper: '#141414',
    },
    text: {
      primary: '#e2e2e2',
      secondary: '#888888',
      disabled: '#555555',
    },
    divider: '#222222',
  },
  typography: {
    fontFamily: '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem', letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.015em' },
    h3: { fontWeight: 600, fontSize: '1.75rem', letterSpacing: '-0.01em' },
    h4: { fontWeight: 600, fontSize: '1.5rem', letterSpacing: '-0.01em' },
    h5: { fontWeight: 600, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', lineHeight: 1.4 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
    overline: { fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.68rem' },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    '0 1px 4px rgba(0,0,0,0.5)',
    '0 2px 8px rgba(0,0,0,0.5)',
    '0 4px 16px rgba(0,0,0,0.5)',
    '0 8px 28px rgba(0,0,0,0.55)',
    '0 12px 36px rgba(0,0,0,0.6)',
    '0 16px 44px rgba(0,0,0,0.6)',
    '0 20px 52px rgba(0,0,0,0.65)',
    ...Array(17).fill('0 0 0 0 rgba(0,0,0,0)'),
  ],
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(20,20,20,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease',
          '&:hover': {
            borderColor: 'rgba(255,255,255,0.13)',
            boxShadow: '0 8px 36px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: 'rgba(20,20,20,0.9)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '8px 20px',
          boxShadow: 'none',
          transition: 'all 0.18s ease',
          '&:hover': { boxShadow: 'none' },
        },
        contained: {
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: '#ffffff',
          border: '1px solid rgba(59,130,246,0.4)',
          boxShadow: '0 2px 12px rgba(59,130,246,0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            boxShadow: '0 4px 20px rgba(59,130,246,0.45)',
          },
          '&.Mui-disabled': {
            background: '#1e1e1e',
            color: '#444',
            border: '1px solid #2a2a2a',
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: '#2a2a2a',
          color: '#aaaaaa',
          '&:hover': {
            borderColor: '#3b82f6',
            color: '#60a5fa',
            background: 'rgba(59,130,246,0.06)',
          },
        },
        text: {
          color: '#aaaaaa',
          '&:hover': { color: '#e2e2e2', background: 'rgba(255,255,255,0.05)' },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: 'rgba(10,10,10,0.6)',
            backdropFilter: 'blur(8px)',
            '& fieldset': { borderColor: '#2a2a2a' },
            '&:hover fieldset': { borderColor: '#3a3a3a' },
            '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: 1 },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          fontSize: '0.72rem',
          height: 22,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: '#1e1e1e',
          height: 2,
        },
        bar: {
          borderRadius: 4,
          background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: { color: '#3b82f6' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(12,12,12,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'none',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#1e1e1e' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: 'rgba(18,18,18,0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: 'rgba(20,20,20,0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#d0d0d0',
          fontSize: '0.75rem',
          borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        },
        arrow: {
          color: 'rgba(20,20,20,0.95)',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { borderBottom: '1px solid #1e1e1e' },
        indicator: {
          background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
          height: 2,
          borderRadius: 2,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: '#555',
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          minHeight: 48,
          transition: 'color 0.2s ease',
          '&.Mui-selected': { color: '#e2e2e2' },
          '&:hover': { color: '#aaa' },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backdropFilter: 'blur(8px)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: 'rgba(16,16,16,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          transition: 'background 0.15s ease',
          '&:hover': { background: 'rgba(255,255,255,0.05)' },
          '&.Mui-selected': { background: 'rgba(59,130,246,0.12)' },
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: { bottom: 24 },
      },
    },
  },
});

export default theme;
