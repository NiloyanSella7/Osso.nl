import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import theme from './theme';
import { AppProvider, useAppContext } from './lib/AppContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import WoningOverzicht from './pages/WoningOverzicht';
import WoningDetail from './pages/WoningDetail';
import Biedhistorie from './pages/Biedhistorie';
import Gebruikersprofiel from './pages/Gebruikersprofiel';
import Verkoperspaneel from './pages/Verkoperspaneel';
import BlockchainMonitor from './pages/BlockchainMonitor';
import KafkaMonitor from './pages/KafkaMonitor';
import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoggedIn, loading } = useAppContext();
  if (loading) return <Spinner />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireOnboarded({ children }: { children: ReactNode }) {
  const { isLoggedIn, isOnboarded, loading } = useAppContext();
  if (loading) return <Spinner />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isOnboarded) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function RequireMakelaar({ children }: { children: ReactNode }) {
  const { user, loading } = useAppContext();
  if (loading) return <Spinner />;
  if (!user || (user.role !== 'makelaar' && user.role !== 'admin' && user.role !== 'seller')) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAppContext();
  if (loading) return <Spinner />;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Spinner() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <Onboarding />
          </RequireAuth>
        }
      />

      <Route
        element={
          <RequireOnboarded>
            <Layout />
          </RequireOnboarded>
        }
      >
        <Route index element={<WoningOverzicht />} />
        <Route path="woning/:id" element={<WoningDetail />} />
        <Route path="biedhistorie/:auctionId" element={<Biedhistorie />} />
        <Route path="profiel" element={<Gebruikersprofiel />} />
        <Route path="verkoper" element={<Verkoperspaneel />} />
        <Route path="blockchain" element={<RequireMakelaar><BlockchainMonitor /></RequireMakelaar>} />
        <Route path="kafka" element={<RequireAdmin><KafkaMonitor /></RequireAdmin>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}
