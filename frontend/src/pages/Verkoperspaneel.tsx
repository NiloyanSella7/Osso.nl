import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import AddHomeIcon from '@mui/icons-material/AddHome';
import GavelIcon from '@mui/icons-material/Gavel';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import * as api from '../lib/api';
import type { Property, Auction } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
      {value === index && children}
    </Box>
  );
}

const emptyProperty = {
  address: '',
  postal_code: '',
  city: '',
  description: '',
  asking_price: '',
  rooms: '',
  area_m2: '',
  energy_label: '',
  image1: '',
  image2: '',
  image3: '',
};

const emptyAuction = {
  property_id: '',
  start_date: '',
  deadline: '',
};

const emptyInvite = {
  email: '',
  full_name: '',
  property_id: '',
};

export default function Verkoperspaneel() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  const [properties, setProperties] = useState<Property[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [propertyForm, setPropertyForm] = useState(emptyProperty);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [propertySuccess, setPropertySuccess] = useState(false);
  const [propertyError, setPropertyError] = useState('');

  const [auctionForm, setAuctionForm] = useState(emptyAuction);
  const [auctionLoading, setAuctionLoading] = useState(false);
  const [auctionSuccess, setAuctionSuccess] = useState(false);
  const [auctionError, setAuctionError] = useState('');

  const [inviteForm, setInviteForm] = useState(emptyInvite);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<{ email: string; name: string } | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [copied, setCopied] = useState<'email' | 'password' | null>(null);

  useEffect(() => {
    Promise.all([api.getProperties(), api.getAuctions()])
      .then(([props, aucts]) => {
        setProperties(props);
        setAuctions(aucts);
      })
      .finally(() => setDataLoading(false));
  }, []);

  if (!user || (user.role !== 'seller' && user.role !== 'makelaar' && user.role !== 'admin')) {
    return (
      <Box>
        <Alert severity="error">
          U heeft geen toegang tot het verkoperspaneel. Dit paneel is alleen beschikbaar voor
          verkopers en makelaars.
        </Alert>
      </Box>
    );
  }

  if (user.status === 'invited') {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Verkoperspaneel</Typography>
        <Alert severity="warning" icon={<GavelIcon />} sx={{ maxWidth: 560 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Wacht op NVM-goedkeuring
          </Typography>
          <Typography variant="body2">
            Uw makelaarskantoor wordt geverifieerd door de NVM. Zodra uw aanvraag is goedgekeurd,
            krijgt u toegang tot het verkoperspaneel. Ga naar{' '}
            <strong>Mijn profiel</strong> om de status te bekijken.
          </Typography>
        </Alert>
      </Box>
    );
  }

  const getAuction = (propertyId: number) => auctions.find((a) => a.property_id === propertyId);

  const handlePropertySubmit = async () => {
    setPropertyError('');
    setPropertyLoading(true);
    try {
      const images = [propertyForm.image1, propertyForm.image2, propertyForm.image3]
        .map((u) => u.trim())
        .filter(Boolean);

      const created = await api.createProperty({
        address: propertyForm.address,
        postal_code: propertyForm.postal_code || undefined,
        city: propertyForm.city || undefined,
        description: propertyForm.description || undefined,
        asking_price: Number(propertyForm.asking_price),
        rooms: propertyForm.rooms ? Number(propertyForm.rooms) : undefined,
        area_m2: propertyForm.area_m2 ? Number(propertyForm.area_m2) : undefined,
        energy_label: propertyForm.energy_label || undefined,
        images: images.length > 0 ? images : undefined,
      });
      setProperties((prev) => [...prev, created]);
      setPropertyForm(emptyProperty);
      setPropertySuccess(true);
      setTimeout(() => setPropertySuccess(false), 4000);
    } catch (e) {
      setPropertyError(e instanceof Error ? e.message : 'Woning opslaan mislukt');
    } finally {
      setPropertyLoading(false);
    }
  };

  const handleAuctionSubmit = async () => {
    setAuctionError('');
    setAuctionLoading(true);
    try {
      const created = await api.createAuction({
        property_id: Number(auctionForm.property_id),
        start_date: auctionForm.start_date + ':00',
        deadline: auctionForm.deadline + ':00',
      });
      setAuctions((prev) => [...prev, created]);
      setAuctionForm(emptyAuction);
      setAuctionSuccess(true);
      setTimeout(() => setAuctionSuccess(false), 4000);
    } catch (e) {
      setAuctionError(e instanceof Error ? e.message : 'Biedproces starten mislukt');
    } finally {
      setAuctionLoading(false);
    }
  };

  const handleInviteSubmit = async () => {
    setInviteDialogOpen(false);
    setInviteError('');
    setInviteLoading(true);
    try {
      await api.inviteUser(
        inviteForm.email,
        inviteForm.full_name,
        inviteForm.property_id ? Number(inviteForm.property_id) : undefined,
      );
      setInviteSuccess({ email: inviteForm.email, name: inviteForm.full_name });
      setInviteForm(emptyInvite);
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : 'Uitnodiging versturen mislukt');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopy = (type: 'email' | 'password', value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Verkoperspaneel
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Beheer uw woningen, biedprocessen en bieders.
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Mijn woningen" icon={<AddHomeIcon />} iconPosition="start" />
          <Tab label="Biedproces starten" icon={<GavelIcon />} iconPosition="start" />
          <Tab label="Bieder uitnodigen" icon={<PersonAddIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab 0: Mijn woningen */}
      <TabPanel value={tab} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Geregistreerde woningen</Typography>
          <Button
            variant="contained"
            startIcon={<AddHomeIcon />}
            onClick={() => setTab(1)}
          >
            Woning toevoegen
          </Button>
        </Box>

        {dataLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={1}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Adres</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">
                    Vraagprijs
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                    Biedingen
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                    Acties
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {properties.map((property) => {
                  const auction = getAuction(property.id);
                  const deadlinePassed = auction ? new Date(auction.deadline) < new Date() : false;
                  const effectiveStatus = auction
                    ? (auction.status === 'open' && deadlinePassed ? 'closed' : auction.status)
                    : null;
                  return (
                    <TableRow key={property.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {property.address}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        € {property.asking_price.toLocaleString('nl-NL')}
                      </TableCell>
                      <TableCell>
                        {effectiveStatus ? (
                          <Chip
                            label={
                              effectiveStatus === 'open'
                                ? 'Open voor biedingen'
                                : effectiveStatus === 'closed'
                                ? 'Gesloten'
                                : 'Afgerond'
                            }
                            color={effectiveStatus === 'open' ? 'success' : 'default'}
                            size="small"
                          />
                        ) : (
                          <Chip label="Geen biedproces" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">{auction?.bid_count ?? 0}</Typography>
                        {auction && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {deadlinePassed ? 'Verlopen' : new Date(auction.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Bekijk woning">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/woning/${property.id}`)}
                            >
                              <VisibilityIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                          {auction && (
                            <Tooltip title="Bekijk biedhistorie">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/biedhistorie/${auction.id}`)}
                              >
                                <GavelIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {properties.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      Nog geen woningen geregistreerd
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Alert severity="info" sx={{ mt: 3 }}>
          Woningen worden na registratie zichtbaar voor bieders zodra een actief biedproces is
          gekoppeld.
        </Alert>
      </TabPanel>

      {/* Tab 1: Woning + veiling aanmaken */}
      <TabPanel value={tab} index={1}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Woning registreren */}
          <Card sx={{ flex: '1 1 340px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Woning registreren
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Vul de woninggegevens in. De woning wordt zichtbaar zodra een biedproces is gestart.
              </Typography>

              {propertySuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Woning succesvol geregistreerd!
                </Alert>
              )}
              {propertyError && (
                <Alert severity="error" sx={{ mb: 2 }}>{propertyError}</Alert>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Adres"
                  value={propertyForm.address}
                  onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
                  fullWidth
                  size="small"
                  placeholder="Keizersgracht 123"
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Postcode"
                    value={propertyForm.postal_code}
                    onChange={(e) => setPropertyForm({ ...propertyForm, postal_code: e.target.value })}
                    size="small"
                    placeholder="1234 AB"
                    sx={{ width: '40%' }}
                  />
                  <TextField
                    label="Plaatsnaam"
                    value={propertyForm.city}
                    onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
                    size="small"
                    placeholder="Amsterdam"
                    sx={{ flex: 1 }}
                  />
                </Box>
                <TextField
                  label="Omschrijving"
                  value={propertyForm.description}
                  onChange={(e) =>
                    setPropertyForm({ ...propertyForm, description: e.target.value })
                  }
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                />
                <TextField
                  label="Vraagprijs (€)"
                  type="number"
                  value={propertyForm.asking_price}
                  onChange={(e) =>
                    setPropertyForm({ ...propertyForm, asking_price: e.target.value })
                  }
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { min: 0 } }}
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Kamers"
                    type="number"
                    value={propertyForm.rooms}
                    onChange={(e) => setPropertyForm({ ...propertyForm, rooms: e.target.value })}
                    size="small"
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                  <TextField
                    label="Oppervlakte (m²)"
                    type="number"
                    value={propertyForm.area_m2}
                    onChange={(e) => setPropertyForm({ ...propertyForm, area_m2: e.target.value })}
                    size="small"
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                  <TextField
                    label="Energielabel"
                    value={propertyForm.energy_label}
                    onChange={(e) =>
                      setPropertyForm({ ...propertyForm, energy_label: e.target.value })
                    }
                    size="small"
                    slotProps={{ htmlInput: { maxLength: 1 } }}
                    placeholder="A"
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AddPhotoAlternateIcon fontSize="small" color="action" />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Foto-URL's (max. 3)
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {(['image1', 'image2', 'image3'] as const).map((key, idx) => (
                      <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {propertyForm[key] && (
                          <Box
                            component="img"
                            src={propertyForm[key]}
                            alt={`preview ${idx + 1}`}
                            sx={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 1, flexShrink: 0, border: '1px solid', borderColor: 'divider' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <TextField
                          label={`Foto ${idx + 1}${idx === 0 ? ' (hoofdfoto)' : ' (optioneel)'}`}
                          value={propertyForm[key]}
                          onChange={(e) => setPropertyForm({ ...propertyForm, [key]: e.target.value })}
                          fullWidth
                          size="small"
                          placeholder="https://example.com/foto.jpg"
                          type="url"
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  startIcon={<AddHomeIcon />}
                  disabled={!propertyForm.address || !propertyForm.asking_price || propertyLoading}
                  onClick={handlePropertySubmit}
                >
                  {propertyLoading ? 'Opslaan...' : 'Woning opslaan'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* Veiling aanmaken */}
          <Card sx={{ flex: '1 1 340px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Biedproces starten
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Koppel een bestaande woning aan een nieuw biedproces en stel de biedperiode in.
              </Typography>

              {auctionSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Biedproces gestart! Bieders kunnen nu bieden op de geselecteerde woning.
                </Alert>
              )}
              {auctionError && (
                <Alert severity="error" sx={{ mb: 2 }}>{auctionError}</Alert>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Woning"
                  select
                  value={auctionForm.property_id}
                  onChange={(e) =>
                    setAuctionForm({ ...auctionForm, property_id: e.target.value })
                  }
                  fullWidth
                  size="small"
                  slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
                >
                  <option value="" disabled>Selecteer een woning...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.address}
                    </option>
                  ))}
                </TextField>
                <TextField
                  label="Startdatum"
                  type="datetime-local"
                  value={auctionForm.start_date}
                  onChange={(e) =>
                    setAuctionForm({ ...auctionForm, start_date: e.target.value })
                  }
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="Deadline"
                  type="datetime-local"
                  value={auctionForm.deadline}
                  onChange={(e) =>
                    setAuctionForm({ ...auctionForm, deadline: e.target.value })
                  }
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Alert severity="info">
                  <Typography variant="caption">
                    De deadline wordt automatisch afgedwongen. Biedingen na de deadline worden
                    geweigerd.
                  </Typography>
                </Alert>
                <Button
                  variant="contained"
                  startIcon={<GavelIcon />}
                  disabled={
                    !auctionForm.property_id ||
                    !auctionForm.start_date ||
                    !auctionForm.deadline ||
                    auctionLoading
                  }
                  onClick={handleAuctionSubmit}
                >
                  {auctionLoading ? 'Bezig...' : 'Biedproces starten'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </TabPanel>

      {/* Tab 2: Bieder uitnodigen */}
      <TabPanel value={tab} index={2}>
        <Card sx={{ maxWidth: 520 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Bieder uitnodigen
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Stuur een uitnodigingsmail naar een potentiële bieder. De bieder ontvangt een link om
              hun account te activeren en iDIN-verificatie te starten.
            </Typography>

            {inviteError && (
              <Alert severity="error" sx={{ mb: 2 }}>{inviteError}</Alert>
            )}

            {inviteSuccess ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Succesbanner */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'success.light', borderRadius: 2, p: 2 }}>
                  <CheckCircleIcon sx={{ color: 'success.dark', fontSize: 32, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'success.dark' }}>
                      Account aangemaakt voor {inviteSuccess.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'success.dark', opacity: 0.85 }}>
                      Deel onderstaande inloggegevens met de bieder. Ze kunnen direct inloggen en hun iDIN-verificatie starten.
                    </Typography>
                  </Box>
                </Box>

                {/* Inloggegevens */}
                <Card variant="outlined" sx={{ borderColor: 'primary.light' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                      Inloggegevens bieder
                    </Typography>

                    <TextField
                      label="E-mailadres"
                      value={inviteSuccess.email}
                      fullWidth
                      size="small"
                      slotProps={{
                        input: {
                          readOnly: true,
                          startAdornment: <InputAdornment position="start"><EmailIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title={copied === 'email' ? 'Gekopieerd!' : 'Kopieer'}>
                                <IconButton size="small" onClick={() => handleCopy('email', inviteSuccess.email)}>
                                  <ContentCopyIcon sx={{ fontSize: 16, color: copied === 'email' ? 'success.main' : 'action' }} />
                                </IconButton>
                              </Tooltip>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <TextField
                      label="Tijdelijk wachtwoord"
                      value="Bieden123@"
                      fullWidth
                      size="small"
                      slotProps={{
                        input: {
                          readOnly: true,
                          startAdornment: <InputAdornment position="start"><LockIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title={copied === 'password' ? 'Gekopieerd!' : 'Kopieer'}>
                                <IconButton size="small" onClick={() => handleCopy('password', 'Bieden123@')}>
                                  <ContentCopyIcon sx={{ fontSize: 16, color: copied === 'password' ? 'success.main' : 'action' }} />
                                </IconButton>
                              </Tooltip>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <Alert severity="warning" sx={{ py: 0.5 }}>
                      <Typography variant="caption">
                        Vraag de bieder het wachtwoord te wijzigen na de eerste login.
                      </Typography>
                    </Alert>
                  </CardContent>
                </Card>

                <Button
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  onClick={() => { setInviteSuccess(null); setInviteError(''); }}
                >
                  Nieuwe bieder uitnodigen
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Volledige naam bieder"
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  fullWidth
                  size="small"
                  placeholder="Jan de Vries"
                />
                <TextField
                  label="E-mailadres bieder"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  fullWidth
                  size="small"
                  placeholder="jan@example.nl"
                />
                <TextField
                  label="Woning (optioneel)"
                  select
                  value={inviteForm.property_id}
                  onChange={(e) => setInviteForm({ ...inviteForm, property_id: e.target.value })}
                  fullWidth
                  size="small"
                  slotProps={{ select: { native: true } }}
                >
                  <option value="">Geen specifieke woning</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.address}
                    </option>
                  ))}
                </TextField>
                <Alert severity="info">
                  <Typography variant="caption">
                    De bieder krijgt de status <strong>uitgenodigd</strong> en kan pas bieden na
                    iDIN-verificatie. De uitnodiging is 7 dagen geldig.
                  </Typography>
                </Alert>
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  disabled={!inviteForm.email || !inviteForm.full_name || inviteLoading}
                  onClick={() => setInviteDialogOpen(true)}
                >
                  {inviteLoading ? 'Versturen...' : 'Uitnodiging versturen'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Invite confirmation dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)}>
        <DialogTitle>Uitnodiging bevestigen</DialogTitle>
        <DialogContent>
          <Typography>
            Weet u zeker dat u een uitnodiging wilt sturen naar{' '}
            <strong>{inviteForm.full_name}</strong> ({inviteForm.email})?
          </Typography>
          {inviteForm.property_id && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Woning:{' '}
              {properties.find((p) => String(p.id) === inviteForm.property_id)?.address}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Annuleren</Button>
          <Button variant="contained" onClick={handleInviteSubmit}>
            Versturen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
