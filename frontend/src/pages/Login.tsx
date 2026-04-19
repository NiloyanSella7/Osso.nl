import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Link,
  Divider,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
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

  const handleLogin = () => {
    const addr = email || (role === 'makelaar' ? 'makelaar@osso.nl' : 'koper@osso.nl');
    login(addr, role);
    navigate(role === 'makelaar' ? '/' : '/onboarding');
  };

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
          background: 'linear-gradient(145deg, #0D3B5E 0%, #1B6CA8 55%, #2196F3 100%)',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          px: 10,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', top: -100, right: -150 }} />
        <Box sx={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)', bottom: -200, left: -200 }} />

        <Box sx={{ mb: 6 }}>
          <Box component="img" src="/osso-logo.png" alt="Osso.nl" sx={{ height: 80, width: 'auto', filter: 'brightness(0) invert(1)' }} />
        </Box>

        <Typography variant="h3" sx={{ fontWeight: 700, color: 'white', lineHeight: 1.2, mb: 3, fontSize: '2.4rem' }}>
          Transparant bieden
          <br />
          op uw droomhuis
        </Typography>

        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.75)', mb: 5, maxWidth: 420, lineHeight: 1.7 }}>
          Elk bod wordt onwijzigbaar vastgelegd op de blockchain. Eerlijk, controleerbaar en
          manipulatiebestendig — voor koper en verkoper.
        </Typography>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', mb: 4, maxWidth: 400 }} />

        <Box sx={{ display: 'flex', gap: 4 }}>
          {[
            { label: 'Blockchain-geborgd', sub: 'Polygon PoS' },
            { label: 'iDIN-verificatie', sub: 'Via uw bank' },
            { label: '100% transparant', sub: 'Publiek verifieerbaar' },
          ].map((item) => (
            <Box key={item.label}>
              <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>{item.label}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem' }}>{item.sub}</Typography>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
            background: 'rgba(255,255,255,0.04)',
            clipPath: 'polygon(0 80%, 8% 60%, 15% 60%, 15% 30%, 22% 20%, 29% 30%, 29% 60%, 38% 60%, 45% 40%, 52% 40%, 52% 15%, 60% 5%, 68% 15%, 68% 40%, 75% 40%, 80% 55%, 87% 55%, 87% 30%, 94% 22%, 100% 30%, 100% 80%, 100% 100%, 0 100%)',
          }}
        />
      </Box>

      {/* Right: login form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#F0F4F8',
          p: 4,
        }}
      >
        <Card
          elevation={0}
          sx={{ maxWidth: 420, width: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
        >
          <CardContent sx={{ p: 5 }}>
            {/* Role toggle */}
            <Box
              sx={{
                display: 'flex',
                bgcolor: 'grey.100',
                borderRadius: 2,
                p: 0.5,
                mb: 4,
                gap: 0.5,
              }}
            >
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
                    py: 1,
                    borderRadius: 1.5,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    transition: 'all 0.2s',
                    bgcolor: role === opt.value ? 'white' : 'transparent',
                    color: role === opt.value ? 'primary.main' : 'text.secondary',
                    boxShadow: role === opt.value ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                    '&:hover': {
                      bgcolor: role === opt.value ? 'white' : 'grey.200',
                    },
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </Box>

            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: '50%',
                  bgcolor: isMakelaar ? 'secondary.dark' : 'primary.main',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background-color 0.2s',
                }}
              >
                <LockOutlinedIcon sx={{ color: 'white', fontSize: 18 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: isMakelaar ? 'secondary.dark' : 'primary.dark', transition: 'color 0.2s' }}>
                Welkom bij Osso.nl
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, ml: 6.5 }}>
              {isMakelaar ? 'Log in op uw makelaarsaccount' : 'Log in op uw kopersaccount'}
            </Typography>

            {/* Fields */}
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
                <Link href="#" variant="body2" underline="hover" color="primary">
                  Wachtwoord vergeten?
                </Link>
              </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleLogin}
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
                {isMakelaar ? 'INLOGGEN ALS MAKELAAR' : 'INLOGGEN ALS KOPER'}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }}>
              <Typography variant="caption" color="text.disabled">DEMO</Typography>
            </Divider>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
              {isMakelaar
                ? <>Als makelaar gaat u direct naar het <strong>verkoperspaneel</strong>.</>
                : <>Als koper doorloopt u eerst de <strong>iDIN-verificatie</strong>.</>}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
