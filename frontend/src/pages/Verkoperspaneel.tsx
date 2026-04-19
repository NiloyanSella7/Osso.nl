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
} from '@mui/material';
import AddHomeIcon from '@mui/icons-material/AddHome';
import GavelIcon from '@mui/icons-material/Gavel';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockProperties, mockAuctions } from '../lib/mockData';
import { useAppContext } from '../lib/AppContext';

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
  description: '',
  asking_price: '',
  rooms: '',
  area_m2: '',
  energy_label: '',
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

  const [propertyForm, setPropertyForm] = useState(emptyProperty);
  const [propertySuccess, setPropertySuccess] = useState(false);

  const [auctionForm, setAuctionForm] = useState(emptyAuction);
  const [auctionSuccess, setAuctionSuccess] = useState(false);

  const [inviteForm, setInviteForm] = useState(emptyInvite);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

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

  const handlePropertySubmit = () => {
    setPropertySuccess(true);
    setPropertyForm(emptyProperty);
    setTimeout(() => setPropertySuccess(false), 4000);
  };

  const handleAuctionSubmit = () => {
    setAuctionSuccess(true);
    setAuctionForm(emptyAuction);
    setTimeout(() => setAuctionSuccess(false), 4000);
  };

  const handleInviteSubmit = () => {
    setInviteDialogOpen(false);
    setInviteSuccess(true);
    setInviteForm(emptyInvite);
    setTimeout(() => setInviteSuccess(false), 4000);
  };

  const propertiesWithAuctions = mockProperties.map((p) => ({
    property: p,
    auction: mockAuctions.find((a) => a.property_id === p.id),
  }));

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Verkoperspaneel
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Beheer uw woningen, veilingen en bieders.
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Mijn woningen" icon={<AddHomeIcon />} iconPosition="start" />
          <Tab label="Veiling aanmaken" icon={<GavelIcon />} iconPosition="start" />
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

        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Adres</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">
                  Vraagprijs
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Veilingstatus</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                  Biedingen
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                  Acties
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {propertiesWithAuctions.map(({ property, auction }) => (
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
                    {auction ? (
                      <Chip
                        label={
                          auction.status === 'open'
                            ? 'Veiling open'
                            : auction.status === 'closed'
                            ? 'Gesloten'
                            : 'Afgerond'
                        }
                        color={auction.status === 'open' ? 'success' : 'default'}
                        size="small"
                      />
                    ) : (
                      <Chip label="Geen veiling" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{auction?.bid_count ?? 0}</Typography>
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Alert severity="info" sx={{ mt: 3 }}>
          Woningen worden na registratie zichtbaar voor bieders zodra een actieve veiling is
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
                Vul de woninggegevens in. De woning wordt zichtbaar zodra een veiling is aangemaakt.
              </Typography>

              {propertySuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Woning succesvol geregistreerd! (demo)
                </Alert>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Adres"
                  value={propertyForm.address}
                  onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
                  fullWidth
                  size="small"
                  placeholder="Keizersgracht 123, Amsterdam"
                />
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
                <Button
                  variant="contained"
                  startIcon={<AddHomeIcon />}
                  disabled={!propertyForm.address || !propertyForm.asking_price}
                  onClick={handlePropertySubmit}
                >
                  Woning opslaan
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* Veiling aanmaken */}
          <Card sx={{ flex: '1 1 340px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Veiling aanmaken
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Koppel een bestaande woning aan een nieuwe veiling op Polygon PoS. Het smart
                contract wordt automatisch gedeployed.
              </Typography>

              {auctionSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Veiling aangemaakt! Het AuctionManager smart contract is geregistreerd. (demo)
                </Alert>
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
                  slotProps={{ select: { native: true } }}
                >
                  <option value="">Selecteer een woning...</option>
                  {mockProperties.map((p) => (
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
                    Na aanmaken wordt het AuctionManager contract gedeployed op Polygon Amoy
                    testnet. De deadline wordt on-chain vastgelegd en automatisch afgedwongen.
                  </Typography>
                </Alert>
                <Button
                  variant="contained"
                  startIcon={<GavelIcon />}
                  disabled={
                    !auctionForm.property_id || !auctionForm.start_date || !auctionForm.deadline
                  }
                  onClick={handleAuctionSubmit}
                >
                  Veiling starten
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

            {inviteSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Uitnodiging verstuurd. (demo)
              </Alert>
            )}

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
                {mockProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.address}
                  </option>
                ))}
              </TextField>
              <Alert severity="info">
                <Typography variant="caption">
                  De bieder krijgt de status <strong>uitgenodigd</strong> en kan pas bieden na
                  iDIN-verificatie en wallet-koppeling. De uitnodiging is 7 dagen geldig.
                </Typography>
              </Alert>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                disabled={!inviteForm.email || !inviteForm.full_name}
                onClick={() => setInviteDialogOpen(true)}
              >
                Uitnodiging versturen
              </Button>
            </Box>
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
              {mockProperties.find((p) => String(p.id) === inviteForm.property_id)?.address}
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
