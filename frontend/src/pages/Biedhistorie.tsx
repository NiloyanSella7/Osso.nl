import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Divider,
  Avatar,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VerifiedIcon from '@mui/icons-material/Verified';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LockIcon from '@mui/icons-material/Lock';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import type { Auction, Bid, Property } from '../types';

const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
const medalLabels = ['1e plaats', '2e plaats', '3e plaats'];

export default function Biedhistorie() {
  const { auctionId } = useParams<{ auctionId: string }>();
  const navigate = useNavigate();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Haalt veiling, biedingen en woninggegevens op zodra de auctionId verandert
  useEffect(() => {
    if (!auctionId) return;
    const id = Number(auctionId);
    setLoading(true);
    Promise.all([api.getAuction(id), api.getBids(id)])
      .then(async ([auc, fetchedBids]) => {
        setAuction(auc);
        setBids(fetchedBids);
        const prop = await api.getProperty(auc.property_id);
        setProperty(prop);
      })
      .catch(() => setError('Kon biedhistorie niet laden'))
      .finally(() => setLoading(false));
  }, [auctionId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !auction || !property) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
          Terug
        </Button>
        <Typography sx={{ mt: 2 }}>{error || 'Biedproces niet gevonden.'}</Typography>
      </Box>
    );
  }

  // Veiling is gesloten zodra de deadline verstreken is of de status niet 'open' is
  const deadlinePassed = new Date(auction.deadline).getTime() < Date.now();
  const isClosed = auction.status !== 'open' || deadlinePassed;

  // Sorteert biedingen op bedrag, hoogste eerst, voor de top 3
  const sortedByAmount = [...bids].sort((a, b) => (b.amount_usdc ?? 0) - (a.amount_usdc ?? 0));
  const top3 = sortedByAmount.slice(0, 3);

  // Sorteert biedingen op tijdstip, meest recent eerst, voor de volledige tabel
  const sortedByTime = [...bids].sort(
    (a, b) => new Date(b.indexed_at).getTime() - new Date(a.indexed_at).getTime()
  );

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/woning/${property.id}`)}
        sx={{ mb: 2 }}
      >
        Terug naar woning
      </Button>

      <Typography variant="h4" gutterBottom>
        Biedhistorie
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        {property.address}
      </Typography>

      <Chip
        label={auction.status === 'open' ? 'Open voor biedingen' : 'Biedperiode gesloten'}
        color={auction.status === 'open' ? 'success' : 'default'}
        sx={{ mb: 3 }}
      />

      {/* Summary cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: '1 1 150px' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Totaal biedingen
            </Typography>
            <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
              {auction.bid_count ?? bids.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 150px' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Hoogste bod
            </Typography>
            {isClosed ? (
              // Toon het hoogste bod alleen als de biedperiode gesloten is
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'secondary.dark' }}>
                {bids.length > 0 && bids.some((b) => b.amount_usdc != null)
                  ? `€ ${Math.max(...bids.map((b) => b.amount_usdc ?? 0)).toLocaleString('nl-NL')}`
                  : '—'}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <LockIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                <Typography variant="body2" color="text.disabled">Verborgen</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 150px' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Deadline
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {new Date(auction.deadline).toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Melding tijdens biedperiode */}
      {!isClosed && (
        <Alert severity="warning" icon={<LockIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Biedingen zijn verborgen tijdens de biedperiode
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
            Het aantal biedingen is zichtbaar, maar bedragen en biedergegevens worden pas
            onthuld na het verstrijken van de deadline op{' '}
            {new Date(auction.deadline).toLocaleDateString('nl-NL', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}.
          </Typography>
        </Alert>
      )}

      {/* Top 3 bidders — only for closed auctions */}
      {isClosed && top3.length > 0 && (
        <>
          <Divider sx={{ mb: 3 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <EmojiEventsIcon color="warning" />
            <Typography variant="h6">Top 3 hoogste bieders</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            {top3.map((bid, idx) => (
              <Card
                key={bid.id}
                sx={{
                  flex: '1 1 260px',
                  border: idx === 0 ? `2px solid ${medalColors[0]}` : '1px solid',
                  borderColor: idx === 0 ? medalColors[0] : 'divider',
                  position: 'relative',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar
                      sx={{
                        bgcolor: medalColors[idx],
                        color: idx === 0 ? '#7B4F00' : idx === 1 ? '#4A4A4A' : '#5C3000',
                        fontWeight: 700,
                        width: 36,
                        height: 36,
                        fontSize: '0.85rem',
                      }}
                    >
                      {idx + 1}
                    </Avatar>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {medalLabels[idx]}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {bid.bidder_name ?? `Bieder ${idx + 1}`}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 800, color: 'secondary.dark', mb: 1.5 }}
                  >
                    {bid.amount_usdc != null
                      ? `€ ${bid.amount_usdc.toLocaleString('nl-NL')}`
                      : '—'}
                  </Typography>

                  {bid.bidder_email && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <EmailIcon fontSize="small" color="action" />
                      <Typography variant="body2">{bid.bidder_email}</Typography>
                    </Box>
                  )}
                  {bid.bidder_phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <PhoneIcon fontSize="small" color="action" />
                      <Typography variant="body2">{bid.bidder_phone}</Typography>
                    </Box>
                  )}
                  {/* Toon voorbehoud financiering alleen als deze waarde bekend is */}
                  {bid.financing_condition !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <AccountBalanceIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Voorbehoud financiering:
                      </Typography>
                      <Chip
                        label={bid.financing_condition ? 'Ja' : 'Nee'}
                        color={bid.financing_condition ? 'warning' : 'success'}
                        size="small"
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        </>
      )}

      {isClosed && (
        <>
          <Divider sx={{ mb: 3 }} />

          {/* Bid table — alleen zichtbaar na deadline */}
          <Typography variant="h6" gutterBottom>
            Alle biedingen
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Gesorteerd op tijdstip van indiening.
          </Typography>

          {sortedByTime.length === 0 ? (
            <Alert severity="info">Nog geen biedingen geregistreerd voor dit biedproces.</Alert>
          ) : (
            <TableContainer component={Paper} elevation={1}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>#</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Tijdstip</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Bieder</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">
                      Bedrag
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                      Vb. financiering
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedByTime.map((bid, idx) => {
                    // Bepaalt de rangpositie op bedrag om top-3 biedingen visueel te markeren
                    const rank = sortedByAmount.findIndex((b) => b.id === bid.id) + 1;
                    const isTop3 = rank <= 3;
                    return (
                      <TableRow
                        key={bid.id}
                        sx={{
                          '&:hover': { bgcolor: 'action.hover' },
                          bgcolor: isTop3 ? 'rgba(46,204,113,0.06)' : undefined,
                        }}
                      >
                        <TableCell>{sortedByTime.length - idx}</TableCell>
                        <TableCell>
                          {new Date(bid.indexed_at).toLocaleString('nl-NL', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          {bid.bidder_name ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">{bid.bidder_name}</Typography>
                              {isTop3 && (
                                <Chip
                                  label={`#${rank}`}
                                  size="small"
                                  sx={{
                                    bgcolor: medalColors[rank - 1],
                                    color: rank === 1 ? '#7B4F00' : rank === 2 ? '#4A4A4A' : '#5C3000',
                                    fontWeight: 700,
                                    height: 18,
                                    fontSize: '0.7rem',
                                  }}
                                />
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Bieder {sortedByTime.length - idx}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 600, color: 'secondary.dark' }}>
                            {bid.amount_usdc != null
                              ? `€ ${bid.amount_usdc.toLocaleString('nl-NL')}`
                              : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {bid.financing_condition !== undefined ? (
                            <Chip
                              label={bid.financing_condition ? 'Ja' : 'Nee'}
                              color={bid.financing_condition ? 'warning' : 'success'}
                              size="small"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <Alert severity="info" sx={{ mt: 3 }} icon={<VerifiedIcon />}>
        De biedhistorie is onwijzigbaar vastgelegd. Aanpassen of verwijderen van biedingen is niet
        mogelijk.
      </Alert>
    </Box>
  );
}
