import { Box, Typography, Chip, Button } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import BoltIcon from '@mui/icons-material/Bolt';
import GavelIcon from '@mui/icons-material/Gavel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import type { Property, Auction } from '../../types';
import { useCountdown } from '../../hooks/useCountdown';

interface Props {
  property: Property;
  auction?: Auction;
}

const GRADIENTS = [
  'linear-gradient(135deg, #1B4F72 0%, #2196F3 100%)',
  'linear-gradient(135deg, #1B5E20 0%, #43A047 100%)',
  'linear-gradient(135deg, #4A148C 0%, #7B1FA2 100%)',
  'linear-gradient(135deg, #B71C1C 0%, #EF5350 100%)',
];

function CountdownBadge({ deadline }: { deadline: string }) {
  const { label, expired, urgent } = useCountdown(deadline);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        borderRadius: 1.5,
        bgcolor: expired
          ? 'rgba(0,0,0,0.55)'
          : urgent
          ? 'rgba(211,47,47,0.85)'
          : 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <AccessTimeIcon sx={{ fontSize: 13, color: 'white' }} />
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', lineHeight: 1 }}>
        {expired ? 'Gesloten' : label}
      </Typography>
    </Box>
  );
}

export default function PropertyCard({ property, auction }: Props) {
  const navigate = useNavigate();
  const gradient = GRADIENTS[(property.id - 1) % GRADIENTS.length];
  const isOpen = auction?.status === 'open';

  return (
    <Box
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: 'white',
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
        },
      }}
    >
      {/* Image area */}
      <Box
        sx={{
          height: 200,
          background: property.images?.[0] ? 'none' : gradient,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
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
          <>
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px)',
              }}
            />
            <HomeIcon sx={{ fontSize: 72, color: 'rgba(255,255,255,0.18)' }} />
          </>
        )}

        {/* Top badges */}
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          {auction && (
            <Chip
              label={isOpen ? 'Bieding open' : 'Gesloten'}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 22,
                bgcolor: isOpen ? 'success.main' : 'rgba(0,0,0,0.4)',
                color: 'white',
                '& .MuiChip-label': { px: 1 },
              }}
            />
          )}
          {property.energy_label && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <BoltIcon sx={{ fontSize: 12, color: 'white' }} />
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'white' }}>
                {property.energy_label}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Bottom: price + countdown */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            px: 1.5,
            py: 1.25,
            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <Typography
            sx={{ fontSize: '1.35rem', fontWeight: 800, color: 'white', lineHeight: 1 }}
          >
            € {property.asking_price.toLocaleString('nl-NL')}
          </Typography>
          {auction && isOpen && <CountdownBadge deadline={auction.deadline} />}
          {auction && !isOpen && <CountdownBadge deadline={auction.deadline} />}
        </Box>
      </Box>

      {/* Card body */}
      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, lineHeight: 1.3, mb: 0.75 }}
          noWrap
        >
          {property.address}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }} noWrap>
          {property.description}
        </Typography>

        {/* Specs */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          {property.rooms && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <HomeIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">
                {property.rooms} kamers
              </Typography>
            </Box>
          )}
          {property.area_m2 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SquareFootIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">
                {property.area_m2} m²
              </Typography>
            </Box>
          )}
          {auction && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <GavelIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">
                {auction.bid_count ?? 0} biedingen
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="contained"
          fullWidth
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate(`/woning/${property.id}`)}
          sx={{
            fontWeight: 700,
            borderRadius: 2,
            py: 1.1,
            background: 'linear-gradient(90deg, #1B4F72 0%, #2196F3 100%)',
            '&:hover': {
              background: 'linear-gradient(90deg, #154360 0%, #1976D2 100%)',
            },
          }}
        >
          Bekijk woning
        </Button>
      </Box>
    </Box>
  );
}
