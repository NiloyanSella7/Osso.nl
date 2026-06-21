import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Divider,
  Alert,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';

type Role = 'bidder' | 'makelaar';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAppContext();
  const [role, setRole] = useState<Role>('bidder');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Logt de gebruiker in en navigeert daarna naar de homepage
  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // Navigeer op basis van status na login (AppContext haalt user op)
      navigate('/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Inloggen mislukt');
    } finally {
      setLoading(false);
    }
  };

  // Laat inloggen toe met de Enter-toets
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  const isMakelaar = role === 'makelaar';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left: branding */}
      <Box
        sx={{
          flex: '0 0 55%',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          px: 10,
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: 'url("https://cdn.prod.website-files.com/648819830dc1a2c1c574b1b6/6745dd853a91bea8252e402c_Header%20WinWin%20woning%20(2).webp")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, rgba(13,59,94,0.82) 0%, rgba(27,108,168,0.72) 55%, rgba(33,150,243,0.65) 100%)' }} />
        <Box sx={{ position: 'relative', zIndex: 1, mb: 6 }}>
          <Box component="img" src="/osso-logo.png" alt="Osso.nl" sx={{ height: 80, width: 'auto', filter: 'brightness(0) invert(1)' }} />
        </Box>
        <Typography variant="h3" sx={{ position: 'relative', zIndex: 1, fontWeight: 700, color: 'white', lineHeight: 1.2, mb: 3, fontSize: '2.4rem' }}>
          Transparant bieden<br />op uw droomhuis
        </Typography>
        <Typography variant="body1" sx={{ position: 'relative', zIndex: 1, color: 'rgba(255,255,255,0.85)', mb: 5, maxWidth: 420, lineHeight: 1.7 }}>
          Elk bod wordt onwijzigbaar vastgelegd. Eerlijk, controleerbaar en transparant — voor koper en verkoper.
        </Typography>
        <Divider sx={{ position: 'relative', zIndex: 1, borderColor: 'rgba(255,255,255,0.2)', mb: 4, maxWidth: 400 }} />
        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', gap: 4 }}>
          {[
            { label: 'Onwijzigbaar', sub: 'Vastgelegd en verifieerbaar' },
            { label: 'iDIN-verificatie', sub: 'Via uw bank' },
            { label: '100% transparant', sub: 'Publiek verifieerbaar' },
          ].map((item) => (
            <Box key={item.label}>
              <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>{item.label}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>{item.sub}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right: login form */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F0F4F8', p: 4 }}>
        <Card elevation={0} sx={{ maxWidth: 420, width: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 5 }}>
            {/* Role toggle */}
            <Box sx={{ display: 'flex', bgcolor: 'grey.100', borderRadius: 2, p: 0.5, mb: 4, gap: 0.5 }}>
              {([
                { value: 'bidder', label: 'Koper', icon: <PersonIcon sx={{ fontSize: 16 }} /> },
                { value: 'makelaar', label: 'Makelaar', icon: <BusinessIcon sx={{ fontSize: 16 }} /> },
              ] as { value: Role; label: string; icon: React.ReactNode }[]).map((opt) => (
                <Button
                  key={opt.value}
                  onClick={() => setRole(opt.value)}
                  startIcon={opt.icon}
                  fullWidth
                  disableElevation
                  sx={{
                    py: 1, borderRadius: 1.5, fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.2s',
                    bgcolor: role === opt.value ? 'white' : 'transparent',
                    color: role === opt.value ? 'primary.main' : 'text.secondary',
                    boxShadow: role === opt.value ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                    '&:hover': { bgcolor: role === opt.value ? 'white' : 'grey.200' },
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </Box>

            {/* Logo + header */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
              <Box component="img" src="/osso-logo.png" alt="Osso.nl" sx={{ height: 72, width: 'auto', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, color: isMakelaar ? 'secondary.dark' : 'primary.dark' }}>
                Welkom bij Osso.nl
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
              {isMakelaar ? 'Log in op uw makelaarsaccount' : 'Log in op uw kopersaccount'}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="E-mailadres"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                fullWidth
                size="small"
                placeholder={isMakelaar ? 'makelaar@kantoor.nl' : 'u@voorbeeld.nl'}
              />
              <TextField
                label="Wachtwoord"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                fullWidth
                size="small"
              />

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <FormControlLabel
                  control={<Checkbox size="small" checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
                  label={<Typography variant="body2" color="text.secondary">Ingelogd blijven</Typography>}
                />
              </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleLogin}
                disabled={loading || !email || !password}
                sx={{
                  mt: 1, py: 1.5, fontWeight: 700, fontSize: '1rem', borderRadius: 2,
                  background: isMakelaar
                    ? 'linear-gradient(90deg, #1B5E20 0%, #43A047 100%)'
                    : 'linear-gradient(90deg, #1B4F72 0%, #2196F3 100%)',
                  '&:hover': {
                    background: isMakelaar
                      ? 'linear-gradient(90deg, #145214 0%, #388E3C 100%)'
                      : 'linear-gradient(90deg, #154360 0%, #1976D2 100%)',
                  },
                }}
              >
                {loading ? 'Inloggen...' : isMakelaar ? 'INLOGGEN ALS MAKELAAR' : 'INLOGGEN ALS KOPER'}
              </Button>
            </Box>

            {/* Registratielink alleen tonen voor makelaars */}
            {isMakelaar && (
              <>
                <Divider sx={{ my: 3 }} />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Nog geen account?{' '}
                    <Box
                      component="span"
                      onClick={() => navigate('/register')}
                      sx={{ color: 'primary.main', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                    >
                      Makelaar registreren →
                    </Box>
                  </Typography>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
