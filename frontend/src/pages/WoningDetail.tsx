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
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
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
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import * as api from '../lib/api';
import type { Property, Auction } from '../types';

// formatteert de deadline als leesbare Nederlandse datum/tijd
function formatDeadline(deadline: string) {
  return new Date(deadline).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// berekent de resterende tijd tot de deadline in dagen en uren
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
  const { user } = useAppContext();

  const [property, setProperty] = useState<Property | null>(null);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeImage, setActiveImage] = useState(0);
  const [bidAmount, setBidAmount] = useState('');
  const [financingCondition, setFinancingCondition] = useState<boolean | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bidSubmitted, setBidSubmitted] = useState(false);
  const [bidStep, setBidStep] = useState(0);
  const [bidError, setBidError] = useState('');
  const [alreadyBid, setAlreadyBid] = useState(false);

  // laadt woning- en veilinggegevens en controleert of de gebruiker al heeft geboden
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([api.getProperty(Number(id)), api.getAuctions()])
      .then(async ([prop, auctions]) => {
        setProperty(prop);
        const foundAuction = auctions.find((a) => a.property_id === prop.id) ?? null;
        setAuction(foundAuction);

        // Controleer of de gebruiker al geboden heeft
        if (foundAuction) {
          try {
            const bids = await api.getBids(foundAuction.id);
            const myWallet = user?.wallet_address?.toLowerCase();
            if (myWallet && bids.some((b) => b.bidder_wallet.toLowerCase() === myWallet)) {
              setAlreadyBid(true);
            }
          } catch { /* negeer */ }
        }
      })
      .catch(() => setError('Kon woninggegevens niet laden'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !property) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
          Terug
        </Button>
        <Typography sx={{ mt: 2 }}>{error || 'Woning niet gevonden.'}</Typography>
      </Box>
    );
  }

  const isMakelaar = user?.role === 'makelaar' || user?.role === 'seller' || user?.role === 'admin';

  // alleen actieve, iDIN-geverifieerde bieders mogen bieden op een open biedproces
  const canBid =
    !isMakelaar &&
    user?.status === 'active' &&
    user?.idin_verified &&
    auction?.status === 'open';

  const bidSteps = ['Bod verwerken', 'Bod valideren', 'Bod geregistreerd'];

  // doorloopt de stappen van het bod plaatsen en registreert het bod via de API
  const handleBidSubmit = async () => {
    setConfirmOpen(false);
    setBidError('');
    setBidStep(1); // Stap 1: Bod verwerken

    try {
      await new Promise((r) => setTimeout(r, 600));
      setBidStep(2); // Stap 2: Blockchain transactie versturen

      await api.placeBid(auction!.id, {
        amount_usdc: Number(bidAmount),
        financing_condition: financingCondition!,
      });

      // Stap 3: Geregistreerd op blockchain
      await new Promise((r) => setTimeout(r, 500));
      setBidSubmitted(true);
      setAlreadyBid(true);
    } catch (e) {
      setBidError(e instanceof Error ? e.message : 'Bod plaatsen mislukt');
      setBidStep(0);
    }
  };

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 2 }}>
        Terug naar overzicht
      </Button>

      <Grid container spacing={3}>
        {/* Left column */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Photo */}
          {property.images && property.images.length > 0 ? (
            <Box sx={{ mb: 3 }}>
              <Box
                component="img"
                src={property.images[activeImage]}
                alt={property.address}
                sx={{
                  width: '100%',
                  height: 320,
                  objectFit: 'cover',
                  borderRadius: 2,
                  display: 'block',
                }}
              />
              {property.images.length > 1 && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {property.images.map((img, idx) => (
                    <Box
                      key={idx}
                      component="img"
                      src={img}
                      alt={`foto ${idx + 1}`}
                      onClick={() => setActiveImage(idx)}
                      sx={{
                        width: 80,
                        height: 56,
                        objectFit: 'cover',
                        borderRadius: 1,
                        cursor: 'pointer',
                        border: activeImage === idx ? '2px solid' : '2px solid transparent',
                        borderColor: activeImage === idx ? 'primary.main' : 'transparent',
                        opacity: activeImage === idx ? 1 : 0.65,
                        transition: 'opacity 0.2s',
                        '&:hover': { opacity: 1 },
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          ) : (
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
          )}

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
                Dit biedproces is transparant en onwijzigbaar. Na afloop zijn alle biedingen verifieerbaar.
              </Alert>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Automatische deadline-afdwinging"
                    secondary="Biedingen na de deadline worden automatisch geweigerd"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Veilige fondsverwerking"
                    secondary="Uw bodgarantie wordt veilig vastgehouden totdat de biedperiode is afgerond"
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
              {isMakelaar && (
                <Button
                  variant="text"
                  size="small"
                  onClick={() => navigate(`/biedhistorie/${auction.id}`)}
                  startIcon={<GavelIcon />}
                >
                  Bekijk biedhistorie
                </Button>
              )}
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

          {/* Geen biedproces - toont melding aan bieders als er nog geen veiling is gestart */}
          {!auction && !isMakelaar && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Alert severity="info">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Nog geen actief biedproces
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                    De makelaar heeft nog geen biedperiode gestart voor deze woning. Kom later terug.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Auction status card */}
          {auction && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">Biedperiode</Typography>
                  {/* toont "Open" alleen als status open is én de deadline nog niet verstreken is */}
                  <Chip
                    label={auction.status === 'open' && new Date(auction.deadline) > new Date() ? 'Open' : 'Gesloten'}
                    color={auction.status === 'open' && new Date(auction.deadline) > new Date() ? 'success' : 'default'}
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

                {auction.status === 'open' && new Date(auction.deadline) > new Date() && (
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

          {/* Al geboden melding - per bieder is maar één bod toegestaan */}
          {auction?.status === 'open' && !isMakelaar && alreadyBid && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Alert severity="success" icon={<VerifiedIcon />}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    U heeft al een bod uitgebracht
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                    Per bieder is één bod toegestaan. Uw bod is geregistreerd op de blockchain en kan niet worden gewijzigd.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Bid form — niet zichtbaar voor makelaars of als al geboden */}
          {auction?.status === 'open' && !isMakelaar && !alreadyBid && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Bod uitbrengen
                </Typography>

                {/* toont resultaat, voortgang of formulier afhankelijk van de status van het bod */}
                {bidSubmitted ? (
                  <Alert severity="success" icon={<VerifiedIcon />}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Bod succesvol geregistreerd!
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                      Bod: <strong>€ {Number(bidAmount).toLocaleString('nl-NL')}</strong>
                      {' · '}Voorbehoud financiering:{' '}
                      <strong>{financingCondition ? 'Ja' : 'Nee'}</strong>
                    </Typography>
                  </Alert>
                ) : bidStep > 0 ? (
                  <Box>
                    {bidError && <Alert severity="error" sx={{ mb: 2 }}>{bidError}</Alert>}
                    <Stepper activeStep={bidStep} orientation="vertical">
                      {bidSteps.map((label) => (
                        <Step key={label}>
                          <StepLabel>{label}</StepLabel>
                        </Step>
                      ))}
                    </Stepper>
                  </Box>
                ) : !canBid ? (
                  // legt uit waarom de gebruiker nog niet kan bieden (geen iDIN of nog niet geverifieerd)
                  <Box>
                    {bidError && <Alert severity="error" sx={{ mb: 1 }}>{bidError}</Alert>}
                    {!user?.idin_verified && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        Doorloop eerst uw iDIN-verificatie om te kunnen bieden.
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
                    {bidError && <Alert severity="error">{bidError}</Alert>}
                    <TextField
                      label="Bod-bedrag (€)"
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      fullWidth
                      size="small"
                      slotProps={{ htmlInput: { min: 0 } }}
                      helperText={`Vraagprijs: € ${property.asking_price.toLocaleString('nl-NL')}`}
                    />
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                        Voorbehoud van financiering
                      </Typography>
                      <ToggleButtonGroup
                        value={financingCondition}
                        exclusive
                        onChange={(_, val) => { if (val !== null) setFinancingCondition(val); }}
                        size="small"
                        fullWidth
                      >
                        <ToggleButton value={true} color="primary">
                          Ja
                        </ToggleButton>
                        <ToggleButton value={false} color="primary">
                          Nee
                        </ToggleButton>
                      </ToggleButtonGroup>
                      <Typography variant="caption" color="text.secondary">
                        Kies "Ja" als uw bod afhankelijk is van het verkrijgen van een hypotheek.
                      </Typography>
                    </Box>
                    <Alert severity="info" icon={<WarningIcon />}>
                      <Typography variant="caption">
                        Uw bod wordt veilig verwerkt en geregistreerd. U ontvangt een bevestiging na indiening.
                      </Typography>
                    </Alert>
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      // schakelt knop pas in als bedrag positief is en financieringsvoorwaarde gekozen is
                      disabled={!bidAmount || Number(bidAmount) <= 0 || financingCondition === null}
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
            <strong>€ {Number(bidAmount).toLocaleString('nl-NL')}</strong> uit te brengen op{' '}
            <strong>{property.address}</strong>.
          </DialogContentText>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Voorbehoud van financiering</Typography>
              <Chip
                label={financingCondition ? 'Ja' : 'Nee'}
                color={financingCondition ? 'warning' : 'success'}
                size="small"
              />
            </Box>
          </Box>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Eenmaal ingediend kan uw bod niet worden ingetrokken zolang de biedperiode loopt.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Annuleren</Button>
          <Button variant="contained" onClick={handleBidSubmit}>
            Bod bevestigen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
