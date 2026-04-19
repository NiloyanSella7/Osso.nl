import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import { AppProvider, useAppContext } from './lib/AppContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import WoningOverzicht from './pages/WoningOverzicht';
import WoningDetail from './pages/WoningDetail';
import Biedhistorie from './pages/Biedhistorie';
import Gebruikersprofiel from './pages/Gebruikersprofiel';
import Verkoperspaneel from './pages/Verkoperspaneel';
import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAppContext();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireOnboarded({ children }: { children: ReactNode }) {
  const { isLoggedIn, isOnboarded } = useAppContext();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isOnboarded) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

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
