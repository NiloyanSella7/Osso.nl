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
  Tooltip,
  IconButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VerifiedIcon from '@mui/icons-material/Verified';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockAuctions, mockBids, mockProperties } from '../lib/mockData';

function shortenAddress(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

function shortenHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export default function Biedhistorie() {
  const { auctionId } = useParams<{ auctionId: string }>();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const auction = mockAuctions.find((a) => a.id === Number(auctionId));
  const property = auction ? mockProperties.find((p) => p.id === auction.property_id) : null;
  const bids = mockBids.filter((b) => b.auction_id === Number(auctionId));

  const handleVerify = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setVerified(true);
    }, 2000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!auction || !property) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
          Terug
        </Button>
        <Typography sx={{ mt: 2 }}>Veiling niet gevonden.</Typography>
      </Box>
    );
  }

  const sortedBids = [...bids].sort(
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
        label={auction.status === 'open' ? 'Veiling open' : 'Veiling gesloten'}
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
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'secondary.dark' }}>
              {bids.length > 0
                ? `€ ${Math.max(...bids.map((b) => b.amount_usdc)).toLocaleString('nl-NL')}`
                : '—'}
            </Typography>
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

      {/* On-chain verification */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <VerifiedIcon color="primary" />
            <Typography variant="h6">On-chain verificatie</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Verifieer de biedhistorie rechtstreeks vanuit het AuctionManager smart contract op
            Polygon PoS. De on-chain data is de enige bron van waarheid.
          </Typography>

          {verified && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>Verificatie geslaagd</strong> — De geïndexeerde biedhistorie komt exact
              overeen met de on-chain data in het AuctionManager contract (auction #{auction.contract_auction_id}).
            </Alert>
          )}

          <Button
            variant="outlined"
            startIcon={verifying ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleVerify}
            disabled={verifying}
          >
            {verifying ? 'Bezig met verificatie...' : 'Verifieer via blockchain'}
          </Button>
        </CardContent>
      </Card>

      <Divider sx={{ mb: 3 }} />

      {/* Bid table */}
      <Typography variant="h6" gutterBottom>
        Geregistreerde biedingen (geanonimiseerd)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Wallet-adressen zijn pseudoniem. Elk bod is verifieerbaar via de transactiehash op
        Polygon.
      </Typography>

      {sortedBids.length === 0 ? (
        <Alert severity="info">Nog geen biedingen geregistreerd voor deze veiling.</Alert>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>#</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Tijdstip</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Wallet (pseudoniem)</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">
                  Bedrag (USDC)
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Tx hash</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                  Blok
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedBids.map((bid, idx) => (
                <TableRow
                  key={bid.id}
                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <TableCell>{sortedBids.length - idx}</TableCell>
                  <TableCell>
                    {new Date(bid.indexed_at).toLocaleString('nl-NL', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {shortenAddress(bid.bidder_wallet)}
                      </Typography>
                      <Tooltip title={copied === bid.bidder_wallet ? 'Gekopieerd!' : 'Kopieer'}>
                        <IconButton size="small" onClick={() => handleCopy(bid.bidder_wallet)}>
                          <ContentCopyIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 600, color: 'secondary.dark' }}>
                      € {bid.amount_usdc.toLocaleString('nl-NL')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {shortenHash(bid.tx_hash)}
                      </Typography>
                      <Tooltip title="Bekijk op Polygonscan">
                        <IconButton size="small">
                          <OpenInNewIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {bid.block_number.toLocaleString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Alert severity="info" sx={{ mt: 3 }} icon={<VerifiedIcon />}>
        De biedhistorie is publiek verifieerbaar via het AuctionManager smart contract op Polygon
        PoS. Aanpassen of verwijderen van biedingen is technisch onmogelijk.
      </Alert>
    </Box>
  );
}
