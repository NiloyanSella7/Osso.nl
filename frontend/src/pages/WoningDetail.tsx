import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  TextField,
  Alert,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GavelIcon from '@mui/icons-material/Gavel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VerifiedIcon from '@mui/icons-material/Verified';
import HomeIcon from '@mui/icons-material/Home';
import BoltIcon from '@mui/icons-material/Bolt';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockProperties, mockAuctions } from '../lib/mockData';
import { useAppContext } from '../lib/AppContext';

function formatDeadline(deadline: string) {
  return new Date(deadline).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeUntil(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Verlopen';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days} dag${days > 1 ? 'en' : ''} en ${hours} uur`;
  return `${hours} uur`;
}

export default function WoningDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, walletConnected, connectWallet } = useAppContext();

  const [bidAmount, setBidAmount] = useState('');
  const [conditions, setConditions] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bidSubmitted, setBidSubmitted] = useState(false);
  const [bidStep, setBidStep] = useState(0);

  const property = mockProperties.find((p) => p.id === Number(id));
  const auction = mockAuctions.find((a) => a.property_id === Number(id));

  if (!property) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
          Terug
        </Button>
        <Typography sx={{ mt: 2 }}>Woning niet gevonden.</Typography>
      </Box>
    );
  }

  const canBid =
    user?.status === 'active' &&
    user?.idin_verified &&
    walletConnected &&
    auction?.status === 'open';

  const bidSteps = ['Wallet bevestigen', 'Transactie ondertekenen', 'Bod geregistreerd'];

  const handleBidSubmit = () => {
    setConfirmOpen(false);
    setBidStep(0);
    const interval = setInterval(() => {
      setBidStep((s) => {
        if (s >= 2) {
          clearInterval(interval);
          setBidSubmitted(true);
          return s;
        }
        return s + 1;
      });
    }, 1200);
  };

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 2 }}>
        Terug naar overzicht
      </Button>

      <Grid container spacing={3}>
        {/* Left column */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Photo placeholder */}
          <Box
            sx={{
              height: 320,
              bgcolor: 'primary.light',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <HomeIcon sx={{ fontSize: 96, color: 'white', opacity: 0.5 }} />
          </Box>

          <Typography variant="h4" gutterBottom>
            {property.address}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            {property.rooms && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <HomeIcon fontSize="small" />
                <Typography>{property.rooms} kamers</Typography>
              </Box>
            )}
            {property.area_m2 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SquareFootIcon fontSize="small" />
                <Typography>{property.area_m2} m²</Typography>
              </Box>
            )}
            {property.energy_label && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BoltIcon fontSize="small" />
                <Typography>Energielabel {property.energy_label}</Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Omschrijving
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {property.description}
          </Typography>

          {auction && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Biedproces
              </Typography>
              <Alert severity="info" icon={<VerifiedIcon />} sx={{ mb: 2 }}>
                Dit biedproces is blockchain-geborgd. Elk bod wordt onwijzigbaar opgeslagen op
                Polygon PoS. Na afloop zijn alle biedingen geanonimiseerd verifieerbaar.
              </Alert>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Automatische deadline-afdwinging"
                    secondary="Biedingen na de deadline worden technisch geweigerd door het netwerk"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Fondsvergrendeling via escrow"
                    secondary="Uw bod-bedrag wordt in USDC vergrendeld totdat de veiling is afgerond"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="iDIN-verificatie vereist"
                    secondary="Alleen geverifieerde bieders kunnen deelnemen"
                  />
                </ListItem>
              </List>
              <Button
                variant="text"
                size="small"
                onClick={() => navigate(`/biedhistorie/${auction.id}`)}
                startIcon={<GavelIcon />}
              >
                Bekijk biedhistorie
              </Button>
            </>
          )}
        </Grid>

        {/* Right column */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Price card */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Vraagprijs
              </Typography>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                € {property.asking_price.toLocaleString('nl-NL')}
              </Typography>
            </CardContent>
          </Card>

          {/* Auction status card */}
          {auction && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">Veiling</Typography>
                  <Chip
                    label={auction.status === 'open' ? 'Open' : 'Gesloten'}
                    color={auction.status === 'open' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <GavelIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {auction.bid_count ?? 0} bod{(auction.bid_count ?? 0) !== 1 ? 'en' : ''}
                    &nbsp;uitgebracht
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AccessTimeIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    Deadline: {formatDeadline(auction.deadline)}
                  </Typography>
                </Box>

                {auction.status === 'open' && (
                  <>
                    <LinearProgress
                      variant="determinate"
                      value={65}
                      sx={{ mb: 0.5, borderRadius: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Nog {timeUntil(auction.deadline)} resterend
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bid form */}
          {auction?.status === 'open' && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Bod uitbrengen
                </Typography>

                {bidSubmitted ? (
                  <Alert severity="success" icon={<VerifiedIcon />}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Bod succesvol geregistreerd!
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                      Uw bod is onwijzigbaar vastgelegd op Polygon PoS.
                    </Typography>
                  </Alert>
                ) : bidStep > 0 && !bidSubmitted ? (
                  <Box>
                    <Stepper activeStep={bidStep} orientation="vertical">
                      {bidSteps.map((label) => (
                        <Step key={label}>
                          <StepLabel>{label}</StepLabel>
                        </Step>
                      ))}
                    </Stepper>
                  </Box>
                ) : !canBid ? (
                  <Box>
                    {!user?.idin_verified && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        Doorloop eerst uw iDIN-verificatie om te kunnen bieden.
                      </Alert>
                    )}
                    {!walletConnected && (
                      <Alert
                        severity="warning"
                        sx={{ mb: 1 }}
                        action={
                          <Button size="small" onClick={connectWallet}>
                            Verbinden
                          </Button>
                        }
                      >
                        Verbind uw wallet om te bieden.
                      </Alert>
                    )}
                    {user?.status === 'invited' && (
                      <Alert severity="info">
                        Uw account wacht op verificatie door de makelaar.
                      </Alert>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Bod-bedrag (USDC)"
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      fullWidth
                      size="small"
                      slotProps={{ htmlInput: { min: 0 } }}
                      helperText={`Vraagprijs: € ${property.asking_price.toLocaleString('nl-NL')}`}
                    />
                    <TextField
                      label="Voorwaarden (optioneel)"
                      value={conditions}
                      onChange={(e) => setConditions(e.target.value)}
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      placeholder="Bijv. voorbehoud van financiering"
                    />
                    <Alert severity="info" icon={<WarningIcon />}>
                      <Typography variant="caption">
                        Uw wallet toont een bevestigingsscherm. Het bod-bedrag wordt in USDC
                        vergrendeld via BidEscrow. Uw privésleutel verlaat uw apparaat niet.
                      </Typography>
                    </Alert>
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={!bidAmount || Number(bidAmount) <= 0}
                      onClick={() => setConfirmOpen(true)}
                      startIcon={<GavelIcon />}
                    >
                      Bod plaatsen
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Bod bevestigen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            U staat op het punt een bod van{' '}
            <strong>€ {Number(bidAmount).toLocaleString('nl-NL')} USDC</strong> uit te brengen op{' '}
            <strong>{property.address}</strong>.
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Het bod-bedrag wordt direct vergrendeld via het BidEscrow smart contract op Polygon PoS.
            Dit kan niet ongedaan worden gemaakt.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Annuleren</Button>
          <Button variant="contained" onClick={handleBidSubmit}>
            Bevestigen &amp; ondertekenen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
