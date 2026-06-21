import {
  Box, Typography, Card, CardContent, Button, Chip, Divider,
  Stepper, Step, StepLabel, StepContent, Alert, TextField, Avatar,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import GavelIcon from '@mui/icons-material/Gavel';
import BusinessIcon from '@mui/icons-material/Business';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import * as api from '../lib/api';

function mockWalletForUser(userId: number): string {
  const hex = userId.toString(16).padStart(8, '0');
  return `0x${hex}0000000000000000000000000000000000000001`.slice(0, 42);
}

function statusColor(status: string) {
  switch (status) {
    case 'active': return 'success';
    case 'verified': return 'warning';
    case 'pending_nvm': return 'warning';
    default: return 'default';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'active': return 'Actief';
    case 'verified': return 'Geverifieerd';
    case 'invited': return 'Uitgenodigd – verificatie vereist';
    case 'pending_nvm': return 'Wacht op NVM-goedkeuring';
    default: return status;
  }
}

export default function Gebruikersprofiel() {
  const { user, refreshUser } = useAppContext();
  const [idinStep, setIdinStep] = useState<'idle' | 'loading' | 'done'>('idle');
  const [nvmStep, setNvmStep] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState('');

  if (!user) return null;

  const isMakelaar = user.role === 'makelaar' || user.role === 'seller' || user.role === 'admin';

  // Stappen voor bieders
  const bidderActiveStep =
    user.status === 'active' ? 2
    : user.idin_verified ? 1
    : 0;

  // Stappen voor makelaars
  const makelaarActiveStep =
    user.status === 'active' ? 1 : 0;

  // Simuleert iDIN-verificatie via mock wallet en callback, en vernieuwt daarna de gebruiker
  const handleIdinStart = async () => {
    setIdinStep('loading');
    setError('');
    try {
      const mockWallet = mockWalletForUser(user.id);
      await api.idinStart(mockWallet);
      await new Promise((r) => setTimeout(r, 2500));
      await api.idinCallback(
        `mock-idin-${user.id}-${Date.now()}`,
        mockWallet,
        user.full_name,
      );
      await refreshUser();
      setIdinStep('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'iDIN mislukt');
      setIdinStep('idle');
    }
  };

  // Simuleert NVM-goedkeuring voor makelaars en vernieuwt daarna de gebruiker
  const handleNvmApprove = async () => {
    setNvmStep('loading');
    setError('');
    try {
      await new Promise((r) => setTimeout(r, 2000)); // simuleer vertraging
      await api.nvmApprove();
      await refreshUser();
      setNvmStep('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'NVM-goedkeuring mislukt');
      setNvmStep('idle');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Mijn profiel</Typography>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Profielkaart */}
        <Card sx={{ flex: '1 1 320px' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                <AccountCircleIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h6">{user.full_name}</Typography>
                <Typography variant="body2" color="text.secondary">{user.email}</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                label={statusLabel(user.status)}
                color={statusColor(user.status) as 'success' | 'warning' | 'default'}
                size="small"
              />
              <Chip
                label={user.role === 'bidder' ? 'Bieder' : user.role === 'seller' ? 'Verkoper' : 'Makelaar'}
                variant="outlined"
                size="small"
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {isMakelaar ? (
                // Toon NVM-status voor makelaars, iDIN-status voor bieders
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">NVM-lidmaatschap</Typography>
                  <Chip
                    label={user.status === 'active' ? 'Goedgekeurd' : 'In behandeling'}
                    color={user.status === 'active' ? 'success' : 'warning'}
                    size="small"
                    icon={user.status === 'active' ? <CheckCircleIcon /> : <HourglassEmptyIcon />}
                  />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">iDIN-verificatie</Typography>
                  <Chip
                    label={user.idin_verified ? 'Geverifieerd' : 'Niet geverifieerd'}
                    color={user.idin_verified ? 'success' : 'default'}
                    size="small"
                    icon={<VerifiedUserIcon />}
                  />
                </Box>
              )}

              {user.wallet_address && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Wallet</Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.wallet_address}
                  </Typography>
                </Box>
              )}

              {user.verified_at && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Goedgekeurd op</Typography>
                  <Typography variant="body2">{new Date(user.verified_at).toLocaleDateString('nl-NL')}</Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Stappenkaart */}
        <Card sx={{ flex: '2 1 400px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Aan de slag</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isMakelaar
                ? 'Voltooi de onderstaande stappen om woningen en biedprocessen te kunnen beheren.'
                : 'Voltooi de onderstaande stappen om deel te kunnen nemen aan het biedproces.'}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {isMakelaar ? (
              /* ── Makelaar stepper ── */
              // Toont onboarding-stappen specifiek voor makelaars (NVM-goedkeuring)
              <>
                <Stepper activeStep={makelaarActiveStep} orientation="vertical">
                  <Step completed={makelaarActiveStep >= 1}>
                    <StepLabel>Account aangemaakt</StepLabel>
                    <StepContent>
                      <Alert severity="success">Uw makelaarskantoor is geregistreerd.</Alert>
                    </StepContent>
                  </Step>

                  <Step completed={user.status === 'active'}>
                    <StepLabel
                      optional={
                        user.status === 'active'
                          ? <Typography variant="caption" color="success.main">Goedgekeurd</Typography>
                          : <Typography variant="caption" color="warning.main">In behandeling</Typography>
                      }
                    >
                      NVM-lidmaatschap verifiëren
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        De NVM controleert uw lidmaatschap en kantoorgegevens. Na goedkeuring kunt u
                        woningen en biedprocessen beheren.
                      </Typography>

                      {/* Toon succesmelding zodra goedkeuring gesimuleerd of al actief is */}
                      {nvmStep === 'done' || user.status === 'active' ? (
                        <Alert severity="success" icon={<CheckCircleIcon />}>
                          NVM-goedkeuring geslaagd. Uw kantoor is actief.
                        </Alert>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Alert severity="info" sx={{ mb: 1 }}>
                            <Typography variant="caption">
                              Uw aanvraag is in behandeling bij de NVM. Dit duurt normaal 1–2 werkdagen.
                            </Typography>
                          </Alert>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<BusinessIcon />}
                            onClick={handleNvmApprove}
                            disabled={nvmStep === 'loading'}
                            sx={{ maxWidth: 260 }}
                          >
                            {nvmStep === 'loading' ? 'NVM controleert gegevens...' : 'Simuleer NVM-goedkeuring (demo)'}
                          </Button>
                          <Typography variant="caption" color="text.secondary">
                            (Demo: NVM-goedkeuring is gesimuleerd via een mock-service)
                          </Typography>
                        </Box>
                      )}
                    </StepContent>
                  </Step>

                  <Step completed={user.status === 'active'}>
                    <StepLabel>Actief als makelaar</StepLabel>
                    <StepContent>
                      <Alert severity="success" icon={<GavelIcon />}>
                        Uw kantoor is volledig actief. U kunt woningen registreren en biedprocessen starten.
                      </Alert>
                    </StepContent>
                  </Step>
                </Stepper>

                {user.status === 'active' && (
                  <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2 }}>
                    <strong>Welkom, {user.full_name}!</strong> Uw makelaarskantoor is goedgekeurd door de NVM.
                  </Alert>
                )}
              </>
            ) : (
              /* ── Bieder stepper ── */
              // Toont onboarding-stappen specifiek voor bieders (iDIN-verificatie)
              <>
                <Stepper activeStep={bidderActiveStep} orientation="vertical">
                  <Step completed={bidderActiveStep >= 1}>
                    <StepLabel>Account aangemaakt</StepLabel>
                    <StepContent>
                      <Alert severity="success">
                        Uw account is aangemaakt door uw makelaar. U ontving een uitnodigingsmail.
                      </Alert>
                    </StepContent>
                  </Step>

                  <Step completed={user.idin_verified}>
                    <StepLabel optional={user.idin_verified && <Typography variant="caption" color="success.main">Voltooid</Typography>}>
                      Identiteitsverificatie (iDIN)
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Verifieer uw identiteit via uw bank. Dit is vereist om te kunnen bieden.
                      </Typography>

                      {/* Toon succesmelding zodra iDIN gesimuleerd of al geverifieerd is */}
                      {idinStep === 'done' || user.idin_verified ? (
                        <Alert severity="success">iDIN-verificatie geslaagd. Uw identiteit is bevestigd.</Alert>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <TextField
                            label="Bankkeuze" select size="small" defaultValue="ING"
                            slotProps={{ select: { native: true } }} sx={{ maxWidth: 200 }}
                          >
                            {['ING', 'ABN AMRO', 'Rabobank', 'SNS', 'ASN Bank'].map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </TextField>
                          <Button
                            variant="contained" size="small"
                            startIcon={<VerifiedUserIcon />}
                            onClick={handleIdinStart}
                            disabled={idinStep === 'loading'}
                            sx={{ maxWidth: 220 }}
                          >
                            {idinStep === 'loading' ? 'Doorsturen naar bank...' : 'Start iDIN-verificatie'}
                          </Button>
                          <Typography variant="caption" color="text.secondary">
                            (Demo: iDIN is gesimuleerd via een mock-service)
                          </Typography>
                        </Box>
                      )}
                    </StepContent>
                  </Step>

                  <Step completed={bidderActiveStep >= 2}>
                    <StepLabel>Klaar om te bieden</StepLabel>
                    <StepContent>
                      <Alert severity="success" icon={<GavelIcon />}>
                        Uw account is volledig geverifieerd en biedklaar.
                      </Alert>
                    </StepContent>
                  </Step>
                </Stepper>

                {bidderActiveStep >= 2 && (
                  <Alert severity="success" icon={<GavelIcon />} sx={{ mt: 2 }}>
                    <strong>U bent biedklaar!</strong> Uw identiteit is geverifieerd via iDIN.
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
