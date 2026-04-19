import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1B4F72',
      light: '#2E86C1',
      dark: '#154360',
    },
    secondary: {
      main: '#2ECC71',
      light: '#58D68D',
      dark: '#27AE60',
    },
    background: {
      default: '#F4F6F8',
      paper: '#FFFFFF',
    },
    error: {
      main: '#E74C3C',
    },
    warning: {
      main: '#F39C12',
    },
    success: {
      main: '#27AE60',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
  },
});

export default theme;
