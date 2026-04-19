import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Divider,
  Avatar,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';

const BANKS = ['ING', 'ABN AMRO', 'Rabobank', 'SNS Bank', 'ASN Bank', 'Bunq', 'Revolut'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { completeOnboarding, user } = useAppContext();

  const [step, setStep] = useState(0);

  // Step 0: Profile
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState(false);

  // Step 1: iDIN
  const [bank, setBank] = useState('ING');
  const [idinState, setIdinState] = useState<'idle' | 'loading' | 'done'>('idle');

  const handleProfileNext = () => {
    if (!fullName.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setStep(1);
  };

  const handleIdin = () => {
    setIdinState('loading');
    setTimeout(() => {
      setIdinState('done');
    }, 2800);
  };

  const handleFinish = () => {
    completeOnboarding(fullName);
    navigate('/');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#F0F4F8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      {/* Logo */}
      <Box
        component="img"
        src="/osso-logo.png"
        alt="Osso.nl"
        sx={{ height: 68, width: 'auto', mb: 5 }}
      />

      <Card
        elevation={0}
        sx={{
          maxWidth: 560,
          width: '100%',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Account activeren
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Vul uw gegevens in en verifieer uw identiteit om te kunnen bieden.
          </Typography>

          <Stepper activeStep={step} sx={{ mb: 4 }}>
            <Step completed={step > 0}>
              <StepLabel>Uw gegevens</StepLabel>
            </Step>
            <Step completed={step > 1}>
              <StepLabel>iDIN-verificatie</StepLabel>
            </Step>
            <Step completed={step > 2}>
              <StepLabel>Klaar</StepLabel>
            </Step>
          </Stepper>

          {/* Step 0: Profile */}
          {step === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.light' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Persoonlijke gegevens
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ingelogd als {user?.email}
                  </Typography>
                </Box>
              </Box>

              <TextField
                label="Volledige naam"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (e.target.value) setNameError(false);
                }}
                fullWidth
                size="small"
                error={nameError}
                helperText={nameError ? 'Naam is verplicht' : ''}
                placeholder="Jan de Vries"
                slotProps={{ input: { startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> } }}
              />

              <TextField
                label="Telefoonnummer (optioneel)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                size="small"
                placeholder="+31 6 12345678"
                slotProps={{ input: { startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} /> } }}
              />

              <Alert severity="info" sx={{ mt: 1 }}>
                Uw gegevens worden uitsluitend gebruikt voor het biedproces. Er wordt geen
                informatie gedeeld met derden.
              </Alert>

              <Button
                variant="contained"
                size="large"
                onClick={handleProfileNext}
                sx={{ mt: 1, fontWeight: 700, borderRadius: 2 }}
              >
                Volgende: identiteitsverificatie
              </Button>
            </Box>
          )}

          {/* Step 1: iDIN */}
          {step === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ bgcolor: 'secondary.light' }}>
                  <VerifiedUserIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Identiteitsverificatie via iDIN
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    U wordt doorgestuurd naar uw bank
                  </Typography>
                </Box>
              </Box>

              {idinState === 'done' ? (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  <Typography sx={{ fontWeight: 600 }}>iDIN-verificatie geslaagd!</Typography>
                  <Typography variant="body2">
                    Uw identiteit is bevestigd door {bank}. U kunt nu doorgaan.
                  </Typography>
                </Alert>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Selecteer uw bank en klik op <strong>Start iDIN-verificatie</strong>. U wordt
                    doorgestuurd naar de beveiligde omgeving van uw bank.
                  </Typography>

                  <TextField
                    label="Uw bank"
                    select
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    fullWidth
                    size="small"
                    slotProps={{ select: { native: true } }}
                  >
                    {BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </TextField>

                  {idinState === 'loading' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                      <CircularProgress size={24} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Verbinden met {bank}...
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Even geduld, u wordt doorgestuurd (gesimuleerd)
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  <Button
                    variant="contained"
                    size="large"
                    startIcon={idinState === 'loading' ? undefined : <VerifiedUserIcon />}
                    onClick={handleIdin}
                    disabled={idinState === 'loading'}
                    sx={{
                      fontWeight: 700,
                      borderRadius: 2,
                      bgcolor: '#1B5E20',
                      '&:hover': { bgcolor: '#145214' },
                    }}
                  >
                    {idinState === 'loading' ? 'Bezig...' : `Start iDIN-verificatie via ${bank}`}
                  </Button>

                  <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center' }}>
                    Demo: iDIN wordt gesimuleerd. Er worden geen echte bankgegevens gebruikt.
                  </Typography>
                </>
              )}

              {idinState === 'done' && (
                <>
                  <Divider />
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => setStep(2)}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    Doorgaan naar overzicht
                  </Button>
                </>
              )}

              <Button
                variant="text"
                size="small"
                onClick={() => setStep(0)}
                sx={{ color: 'text.secondary' }}
              >
                ← Terug
              </Button>
            </Box>
          )}

          {/* Step 2: Done */}
          {step === 2 && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'success.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 48, color: 'success.dark' }} />
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Welkom, {fullName}!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Uw account is geverifieerd. U kunt nu biedingen uitbrengen op woningen via het
                blockchain-geborgde biedplatform van Osso.nl.
              </Typography>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleFinish}
                sx={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  borderRadius: 2,
                  py: 1.5,
                  background: 'linear-gradient(90deg, #1B4F72 0%, #2196F3 100%)',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #154360 0%, #1976D2 100%)',
                  },
                }}
              >
                Bekijk beschikbare woningen →
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
