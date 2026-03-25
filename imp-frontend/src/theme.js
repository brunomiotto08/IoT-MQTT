import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6',
      dark: '#2563eb',
      light: '#60a5fa',
    },
    secondary: {
      main: '#888888',
      dark: '#666666',
      light: '#aaaaaa',
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
      paper: '#161616',
    },
    text: {
      primary: '#e2e2e2',
      secondary: '#888888',
      disabled: '#555555',
    },
    divider: '#2a2a2a',
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
    overline: { fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.7rem' },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.4)',
    '0 2px 6px rgba(0,0,0,0.4)',
    '0 4px 12px rgba(0,0,0,0.4)',
    '0 8px 24px rgba(0,0,0,0.4)',
    '0 12px 32px rgba(0,0,0,0.5)',
    '0 16px 40px rgba(0,0,0,0.5)',
    '0 20px 48px rgba(0,0,0,0.5)',
    ...Array(17).fill('0 0 0 0 rgba(0,0,0,0)'),
  ],
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: '#161616',
          border: '1px solid #2a2a2a',
          borderRadius: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          transition: 'border-color 0.2s ease',
          '&:hover': {
            borderColor: '#3a3a3a',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '8px 20px',
          boxShadow: 'none',
          transition: 'all 0.15s ease',
          '&:hover': { boxShadow: 'none' },
        },
        contained: {
          background: '#2a2a2a',
          color: '#e2e2e2',
          border: '1px solid #3a3a3a',
          '&:hover': { background: '#333333', borderColor: '#4a4a4a' },
        },
        outlined: {
          borderColor: '#3a3a3a',
          color: '#aaaaaa',
          '&:hover': { borderColor: '#555555', color: '#e2e2e2', background: 'rgba(255,255,255,0.04)' },
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
            borderRadius: 6,
            backgroundColor: '#1a1a1a',
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
          borderRadius: 4,
          fontWeight: 600,
          fontSize: '0.75rem',
          height: 24,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          backgroundColor: '#2a2a2a',
          height: 2,
        },
        bar: {
          borderRadius: 2,
          background: '#3b82f6',
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
          background: '#111111',
          borderBottom: '1px solid #2a2a2a',
          boxShadow: 'none',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#2a2a2a' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#161616',
          border: '1px solid #2a2a2a',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: '#252525',
          border: '1px solid #3a3a3a',
          color: '#e2e2e2',
          fontSize: '0.75rem',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { borderBottom: '1px solid #2a2a2a' },
        indicator: { backgroundColor: '#3b82f6', height: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: '#666666',
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          minHeight: 48,
          '&.Mui-selected': { color: '#e2e2e2' },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 6 },
      },
    },
  },
});

export default theme;
