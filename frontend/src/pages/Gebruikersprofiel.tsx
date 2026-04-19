import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  TextField,
  Avatar,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GavelIcon from '@mui/icons-material/Gavel';
import { useState } from 'react';
import { useAppContext } from '../lib/AppContext';

function statusColor(status: string) {
  switch (status) {
    case 'active': return 'success';
    case 'verified': return 'warning';
    default: return 'default';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'active': return 'Actief – biedklaar';
    case 'verified': return 'Geverifieerd – wallet koppelen';
    case 'invited': return 'Uitgenodigd – verificatie vereist';
    default: return status;
  }
}

export default function Gebruikersprofiel() {
  const { user, walletConnected, walletAddress, connectWallet, setUser } = useAppContext();
  const [idinStep, setIdinStep] = useState<'idle' | 'loading' | 'done'>('idle');

  if (!user) return null;

  const activeStep =
    user.status === 'active' && walletConnected ? 3
    : user.status === 'active' ? 2
    : user.idin_verified ? 1
    : 0;

  const handleIdinStart = () => {
    setIdinStep('loading');
    setTimeout(() => {
      setIdinStep('done');
      setUser({ ...user, idin_verified: true, status: 'verified' });
    }, 2500);
  };

  const handleConnectWallet = () => {
    connectWallet();
    setUser({ ...user, status: 'active' });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Mijn profiel
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Profile card */}
        <Card sx={{ flex: '1 1 320px' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                <AccountCircleIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h6">{user.full_name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  iDIN-verificatie
                </Typography>
                <Chip
                  label={user.idin_verified ? 'Geverifieerd' : 'Niet geverifieerd'}
                  color={user.idin_verified ? 'success' : 'default'}
                  size="small"
                  icon={<VerifiedUserIcon />}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Wallet
                </Typography>
                {walletConnected ? (
                  <Chip
                    label={walletAddress ? `${walletAddress.slice(0, 8)}...` : 'Verbonden'}
                    color="success"
                    size="small"
                    icon={<AccountBalanceWalletIcon />}
                  />
                ) : (
                  <Chip label="Niet verbonden" size="small" />
                )}
              </Box>

              {user.verified_at && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Geverifieerd op
                  </Typography>
                  <Typography variant="body2">
                    {new Date(user.verified_at).toLocaleDateString('nl-NL')}
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Onboarding stepper */}
        <Card sx={{ flex: '2 1 400px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Aan de slag
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Voltooi de onderstaande stappen om deel te kunnen nemen aan het biedproces.
            </Typography>

            <Stepper activeStep={activeStep} orientation="vertical">
              {/* Step 1: Account */}
              <Step completed={activeStep >= 1}>
                <StepLabel>Account aangemaakt</StepLabel>
                <StepContent>
                  <Alert severity="success">
                    Uw account is aangemaakt door uw makelaar. U ontving een uitnodigingsmail.
                  </Alert>
                </StepContent>
              </Step>

              {/* Step 2: iDIN */}
              <Step completed={user.idin_verified}>
                <StepLabel
                  optional={
                    user.idin_verified && (
                      <Typography variant="caption" color="success.main">
                        Voltooid
                      </Typography>
                    )
                  }
                >
                  Identiteitsverificatie (iDIN)
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Verifieer uw identiteit via uw bank. Dit is vereist om te kunnen bieden.
                  </Typography>

                  {idinStep === 'done' ? (
                    <Alert severity="success">
                      iDIN-verificatie geslaagd. Uw identiteit is bevestigd door uw bank.
                    </Alert>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <TextField
                        label="Bankkeuze"
                        select
                        size="small"
                        defaultValue="ING"
                        slotProps={{ select: { native: true } }}
                        sx={{ maxWidth: 200 }}
                      >
                        {['ING', 'ABN AMRO', 'Rabobank', 'SNS', 'ASN Bank'].map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </TextField>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<VerifiedUserIcon />}
                        onClick={handleIdinStart}
                        disabled={idinStep === 'loading'}
                        sx={{ maxWidth: 200 }}
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

              {/* Step 3: Wallet */}
              <Step completed={walletConnected}>
                <StepLabel>Wallet koppelen</StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Koppel uw crypto wallet (MetaMask, WalletConnect, etc.) om biedingen te
                    ondertekenen. Uw privésleutel verlaat uw apparaat nooit.
                  </Typography>
                  {walletConnected ? (
                    <Alert severity="success">
                      Wallet verbonden: <strong>{walletAddress}</strong>
                    </Alert>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AccountBalanceWalletIcon />}
                      onClick={handleConnectWallet}
                      disabled={!user.idin_verified}
                    >
                      Wallet verbinden
                    </Button>
                  )}
                </StepContent>
              </Step>

              {/* Step 4: Ready */}
              <Step completed={activeStep >= 3}>
                <StepLabel>Klaar om te bieden</StepLabel>
                <StepContent>
                  <Alert severity="success" icon={<GavelIcon />}>
                    Uw account is volledig geverifieerd en biedklaar. U kunt nu deelnemen aan
                    veilingen.
                  </Alert>
                </StepContent>
              </Step>
            </Stepper>

            {activeStep >= 3 && (
              <Alert severity="success" icon={<GavelIcon />} sx={{ mt: 2 }}>
                <strong>U bent biedklaar!</strong> Uw wallet is gekoppeld en uw identiteit is
                geverifieerd via iDIN.
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
