import {
  Grid,
  Typography,
  Box,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import GavelIcon from '@mui/icons-material/Gavel';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { useState } from 'react';
import PropertyCard from '../components/common/PropertyCard';
import DossierCard from '../components/common/DossierCard';
import { mockProperties, mockAuctions, mockMakelaars } from '../lib/mockData';
import { useAppContext } from '../lib/AppContext';

type FilterStatus = 'all' | 'open' | 'closed';

// ─── Bidder view: one assigned house in Move.nl dossier style ────────────────

function BidderView() {
  const { user } = useAppContext();
  const [search, setSearch] = useState('');

  const property = mockProperties.find((p) => p.id === user?.assigned_property_id);
  const auction = property ? mockAuctions.find((a) => a.property_id === property.id) : undefined;
  const makelaar = property ? mockMakelaars.find((m) => m.id === property.seller_id) : undefined;

  const matchesSearch =
    !search ||
    property?.address.toLowerCase().includes(search.toLowerCase()) ||
    property?.city?.toLowerCase().includes(search.toLowerCase());

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        bgcolor: '#EBF3FA',
        mx: -4,
        px: 4,
        pt: 4,
        pb: 8,
      }}
    >
      {/* Makelaar hero */}
      {makelaar && (
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: 2.5,
            p: { xs: 3, md: 4 },
            mb: 4,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            flexWrap: 'wrap',
          }}
        >
          {/* Makelaar logo / avatar */}
          <Avatar
            sx={{
              width: 72,
              height: 72,
              bgcolor: makelaar.logo_color,
              fontSize: '1.1rem',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              flexShrink: 0,
            }}
          >
            {makelaar.logo_initials}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Aangeboden door
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark', lineHeight: 1.2 }}>
              {makelaar.company_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {makelaar.contact_name} · {makelaar.phone} · {makelaar.email}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: 1 }}>
            <Chip
              icon={<VerifiedUserIcon sx={{ fontSize: '14px !important' }} />}
              label="iDIN-geverifieerd"
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <Chip
              icon={<GavelIcon sx={{ fontSize: '14px !important' }} />}
              label="Blockchain-geborgd biedproces"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </Box>
      )}

      {/* Dossiers header + search */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark', flexGrow: 1 }}>
          Mijn dossier
        </Typography>
        <TextField
          placeholder="Zoek naar een straatnaam..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ maxWidth: 340, bgcolor: 'white', borderRadius: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {/* House silhouette decorative strip */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {property && matchesSearch ? (
          <DossierCard property={property} auction={auction} makelaar={makelaar} />
        ) : (
          <Box
            sx={{
              bgcolor: 'white',
              borderRadius: 2,
              p: 6,
              textAlign: 'center',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <HomeWorkIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="body1" color="text.secondary">
              Geen dossiers gevonden
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer decorative houses */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 120,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            background: 'rgba(27,79,114,0.04)',
            clipPath:
              'polygon(0 100%,0 70%,3% 70%,3% 40%,6% 25%,9% 40%,9% 70%,13% 70%,13% 50%,17% 35%,21% 50%,21% 70%,25% 70%,25% 45%,29% 30%,33% 45%,33% 70%,38% 70%,38% 55%,42% 42%,46% 55%,46% 70%,52% 70%,52% 40%,56% 22%,60% 40%,60% 70%,65% 70%,65% 50%,68% 38%,71% 50%,71% 70%,76% 70%,76% 45%,80% 28%,84% 45%,84% 70%,88% 70%,88% 55%,91% 44%,94% 55%,94% 70%,100% 70%,100% 100%)',
          }}
        />
      </Box>
    </Box>
  );
}

// ─── Makelaar/admin view: full property grid ─────────────────────────────────

function MakelaarView() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');

  const getAuction = (propertyId: number) =>
    mockAuctions.find((a) => a.property_id === propertyId);

  const filtered = mockProperties.filter((p) => {
    const matchesSearch =
      p.address.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.city?.toLowerCase().includes(search.toLowerCase());
    const auction = getAuction(p.id);
    const matchesFilter =
      filter === 'all' ||
      (filter === 'open' && auction?.status === 'open') ||
      (filter === 'closed' && auction?.status !== 'open');
    return matchesSearch && matchesFilter;
  });

  const openCount = mockAuctions.filter((a) => a.status === 'open').length;

  return (
    <Box>
      {/* Hero header */}
      <Box
        sx={{
          background: 'linear-gradient(145deg, #0D3B5E 0%, #1B6CA8 60%, #2196F3 100%)',
          borderRadius: 3,
          p: { xs: 4, md: 6 },
          mb: 4,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: 350,
            height: 350,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.07)',
            top: -100,
            right: -80,
          }}
        />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, color: 'white', mb: 1, fontSize: { xs: '1.8rem', md: '2.4rem' } }}
          >
            Alle woningen
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3, maxWidth: 520 }}>
            Beheer en monitor alle actieve veilingen op het blockchain-geborgde biedplatform.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<GavelIcon sx={{ fontSize: '14px !important', color: 'white !important' }} />}
              label={`${openCount} veilingen actief`}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600 }}
            />
            <Chip
              label="Blockchain-geborgd"
              sx={{ bgcolor: 'rgba(46,204,113,0.25)', color: '#A8E6CF', fontWeight: 600 }}
            />
          </Box>
        </Box>
      </Box>

      {/* Filter bar */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
          alignItems: 'center',
          bgcolor: 'white',
          borderRadius: 2,
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <TextField
          placeholder="Zoek op adres of omschrijving..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, maxWidth: 420 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, val) => val && setFilter(val)}
          size="small"
        >
          <ToggleButton value="all" sx={{ fontWeight: 600, px: 2 }}>Alle</ToggleButton>
          <ToggleButton value="open" sx={{ fontWeight: 600, px: 2 }}>Open</ToggleButton>
          <ToggleButton value="closed" sx={{ fontWeight: 600, px: 2 }}>Gesloten</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {filtered.length} woning{filtered.length !== 1 ? 'en' : ''}
        </Typography>
      </Box>

      {filtered.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 12,
            bgcolor: 'white',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <HomeWorkIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Geen woningen gevonden
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filtered.map((property) => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={property.id}>
              <PropertyCard property={property} auction={getAuction(property.id)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

// ─── Root component: renders the right view based on role ────────────────────

export default function WoningOverzicht() {
  const { user } = useAppContext();
  const isBidder = user?.role === 'bidder';
  return isBidder ? <BidderView /> : <MakelaarView />;
}
