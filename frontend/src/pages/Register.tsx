import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, Divider,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as api from '../lib/api';
import { useAppContext } from '../lib/AppContext';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAppContext();

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // valideert het registratieformulier, maakt account aan en logt direct in
  const handleSubmit = async () => {
    setError('');
    if (!fullName || !companyName || !email || !password) {
      setError('Vul alle verplichte velden in');
      return;
    }
    if (password !== password2) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }
    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens bevatten');
      return;
    }
    setLoading(true);
    try {
      await api.register(email, password, fullName, 'makelaar', companyName);
      await login(email, password);
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registratie mislukt');
    } finally {
      setLoading(false);
    }
  };

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
          Start met transparant<br />bieden op woningen
        </Typography>
        <Typography variant="body1" sx={{ position: 'relative', zIndex: 1, color: 'rgba(255,255,255,0.85)', mb: 5, maxWidth: 420, lineHeight: 1.7 }}>
          Registreer uw makelaardij en begin vandaag nog met het uitnodigen van bieders.
        </Typography>
      </Box>

      {/* Right: register form */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F0F4F8', p: 4 }}>
        <Card elevation={0} sx={{ maxWidth: 440, width: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Box component="img" src="/osso-logo.png" alt="Osso.nl" sx={{ height: 60, width: 'auto', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                Account aanmaken
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Makelaar registratie
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Volledige naam"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                fullWidth size="small"
                placeholder="Jan van der Berg"
                slotProps={{ input: { startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> } }}
              />
              <TextField
                label="Bedrijfsnaam makelaardij"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                fullWidth size="small"
                placeholder="Van der Berg Makelaardij"
                slotProps={{ input: { startAdornment: <BusinessIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> } }}
              />
              <TextField
                label="E-mailadres"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth size="small"
                placeholder="info@makelaardij.nl"
              />

              <Divider sx={{ my: 0.5 }} />

              <TextField
                label="Wachtwoord"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth size="small"
                helperText="Minimaal 8 tekens"
                slotProps={{ input: { startAdornment: <LockIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> } }}
              />
              <TextField
                label="Wachtwoord bevestigen"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                fullWidth size="small"
                error={!!password2 && password !== password2}
                helperText={password2 && password !== password2 ? 'Wachtwoorden komen niet overeen' : ''}
                slotProps={{ input: { startAdornment: <LockIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> } }}
              />

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleSubmit}
                disabled={loading || !fullName || !companyName || !email || !password}
                sx={{
                  mt: 1, py: 1.5, fontWeight: 700, fontSize: '1rem', borderRadius: 2,
                  background: 'linear-gradient(90deg, #1B5E20 0%, #43A047 100%)',
                  '&:hover': { background: 'linear-gradient(90deg, #145214 0%, #388E3C 100%)' },
                }}
              >
                {loading ? 'Account aanmaken...' : 'Account aanmaken'}
              </Button>
            </Box>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Al een account?{' '}
                <Link to="/login" style={{ color: 'inherit', fontWeight: 600 }}>
                  Inloggen
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
