import { Box, Typography, Chip, Avatar } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import GavelIcon from '@mui/icons-material/Gavel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useNavigate } from 'react-router-dom';
import type { Property, Auction, Makelaar } from '../../types';
import { useCountdown } from '../../hooks/useCountdown';

interface Props {
  property: Property;
  auction?: Auction;
  makelaar?: Makelaar;
}

const GRADIENTS = [
  'linear-gradient(135deg, #1B4F72 0%, #2196F3 100%)',
  'linear-gradient(135deg, #1B5E20 0%, #43A047 100%)',
  'linear-gradient(135deg, #4A148C 0%, #7B1FA2 100%)',
  'linear-gradient(135deg, #B71C1C 0%, #EF5350 100%)',
];

// toont resterende tijd tot deadline, met visuele waarschuwing bij urgentie
function Countdown({ deadline }: { deadline: string }) {
  const { label, expired, urgent } = useCountdown(deadline);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <AccessTimeIcon sx={{ fontSize: 14, color: urgent && !expired ? 'error.main' : 'text.secondary' }} />
      <Typography
        variant="caption"
        sx={{ fontWeight: 600, color: urgent && !expired ? 'error.main' : 'text.secondary' }}
      >
        {expired ? 'Gesloten' : `Sluit over ${label}`}
      </Typography>
    </Box>
  );
}

export default function DossierCard({ property, auction, makelaar }: Props) {
  const navigate = useNavigate();
  // bepaalt een consistente achtergrondkleur per woning op basis van het id
  const gradient = GRADIENTS[(property.id - 1) % GRADIENTS.length];
  const isOpen = auction?.status === 'open';

  return (
    <Box
      onClick={() => navigate(`/woning/${property.id}`)}
      sx={{
        display: 'flex',
        bgcolor: 'white',
        borderRadius: 2.5,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, transform 0.15s',
        '&:hover': {
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* Photo */}
      <Box
        sx={{
          width: { xs: 120, sm: 180 },
          flexShrink: 0,
          background: property.images?.[0] ? 'none' : gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {property.images?.[0] ? (
          <Box
            component="img"
            src={property.images[0]}
            alt={property.address}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <HomeIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.2)' }} />
        )}
        {auction && (
          <Chip
            label={isOpen ? 'Koop dossier' : 'Gesloten'}
            size="small"
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              fontWeight: 700,
              fontSize: '0.65rem',
              height: 20,
              bgcolor: 'rgba(0,0,0,0.45)',
              color: 'white',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.3)',
              '& .MuiChip-label': { px: 1 },
            }}
          />
        )}
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          px: { xs: 2, sm: 3 },
          py: 2.5,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 0.5,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark', lineHeight: 1.2 }}>
          {property.address}
        </Typography>

        {(property.postal_code || property.city) && (
          <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
            {[property.postal_code, property.city].filter(Boolean).join(' ')}
          </Typography>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} noWrap>
          {property.description}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 700, color: 'primary.main', fontSize: '1rem' }}>
            Transactieprijs € {property.asking_price.toLocaleString('nl-NL')},-
          </Typography>
          {auction && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <GavelIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {auction.bid_count ?? 0} biedingen
              </Typography>
            </Box>
          )}
          {auction?.status === 'open' && <Countdown deadline={auction.deadline} />}
        </Box>
      </Box>

      {/* Makelaar */}
      {makelaar && (
        <Box
          sx={{
            width: { xs: 0, sm: 170 },
            display: { xs: 'none', sm: 'flex' },
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            borderLeft: '1px solid',
            borderColor: 'divider',
            px: 2,
            py: 2,
            flexShrink: 0,
          }}
        >
          <Avatar
            sx={{
              width: 52,
              height: 52,
              bgcolor: makelaar.logo_color,
              fontSize: '0.85rem',
              fontWeight: 800,
              letterSpacing: '-0.5px',
            }}
          >
            {makelaar.logo_initials}
          </Avatar>
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, textAlign: 'center', lineHeight: 1.3, color: 'text.primary' }}
          >
            {makelaar.company_name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            {makelaar.contact_name}
          </Typography>
        </Box>
      )}

      {/* Arrow */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          pr: 2,
          pl: { xs: 1, sm: 0 },
        }}
      >
        <ArrowForwardIosIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
      </Box>
    </Box>
  );
}
