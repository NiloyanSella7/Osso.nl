import {
  Box, Typography, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip, Alert,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import { useState, useEffect, useRef } from 'react';
import * as api from '../lib/api';
import type { BlockchainEntry } from '../lib/api';

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 8)}…${wallet.slice(-4)}`;
}

// Fix: zorg dat UTC timestamps correct geïnterpreteerd worden
function parseUTC(dateStr: string): Date {
  if (dateStr.endsWith('Z') || dateStr.includes('+')) return new Date(dateStr);
  return new Date(dateStr + 'Z'); // Voeg Z toe zodat browser het als UTC leest
}


function formatTime(dateStr: string): string {
  return parseUTC(dateStr).toLocaleString('nl-NL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function BlockchainMonitor() {
  const [entries, setEntries] = useState<BlockchainEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const [tick, setTick] = useState(0);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const prevIds = useRef<Set<number>>(new Set());

  const fetchFeed = async () => {
    try {
      const data = await api.getBlockchainFeed(100);
      const incoming = new Set(data.map((e) => e.id));
      const fresh = new Set<number>();
      incoming.forEach((id) => { if (!prevIds.current.has(id)) fresh.add(id); });
      if (fresh.size > 0) setNewIds(fresh);
      prevIds.current = incoming;
      setEntries(data);
      setError('');
    } catch {
      setError('Blockchain feed tijdelijk niet beschikbaar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFeed(); }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchFeed();
      setTick((t) => t + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (newIds.size === 0) return;
    const t = setTimeout(() => setNewIds(new Set()), 3000);
    return () => clearTimeout(t);
  }, [newIds]);

  // Live klok voor tijdstip-update
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearTimeout(t);
  }, []);

  // Unieke woningen voor filter
  const properties = [...new Map(entries.map((e) => [e.property_address, e.property_address])).values()];

  // Gefilterde entries
  const filtered = selectedProperty === 'all'
    ? entries
    : entries.filter((e) => e.property_address === selectedProperty);

  // Stats per woning
  const byProperty = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.property_address] = (acc[e.property_address] ?? 0) + 1;
    return acc;
  }, {});

  const uniqueWallets = [...new Set(filtered.map((e) => e.bidder_wallet))].length;
  const activeAuctions = [...new Set(filtered.map((e) => e.auction_id))].length;

  return (
    <Box sx={{
      minHeight: 'calc(100vh - 64px)',
      bgcolor: '#0a0e1a',
      mx: 'calc(-50vw + 50%)',
      px: { xs: 3, md: 6 },
      pt: 4, pb: 8,
    }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 10, height: 10, borderRadius: '50%', bgcolor: '#00e676',
            boxShadow: '0 0 8px #00e676',
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1, transform: 'scale(1)' },
              '50%': { opacity: 0.5, transform: 'scale(0.85)' },
            },
          }} />
          <Typography sx={{ color: '#00e676', fontWeight: 700, fontSize: '0.75rem', letterSpacing: 2, fontFamily: 'monospace' }}>
            LIVE
          </Typography>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>
          Blockchain Monitor
        </Typography>
        <Typography variant="caption" sx={{ color: '#4fc3f7', fontFamily: 'monospace', ml: 'auto' }}>
          Polygon PoS · Osso.nl · vernieuwd elke 5s
        </Typography>
      </Box>

      {/* Stats — geen bedrag */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Biedingen', value: filtered.length.toString(), color: '#4fc3f7' },
          { label: 'Actieve biedingen', value: activeAuctions.toString(), color: '#ffb74d' },
          { label: 'Unieke bieders', value: uniqueWallets.toString(), color: '#00e676' },
        ].map((stat) => (
          <Box key={stat.label} sx={{
            flex: '1 1 160px',
            bgcolor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 2, p: 2.5,
          }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.7rem', fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>
              {stat.label}
            </Typography>
            <Typography sx={{ color: stat.color, fontWeight: 700, fontSize: '1.5rem', fontFamily: 'monospace' }}>
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Filter per woning */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <HomeWorkIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`Alle woningen (${entries.length})`}
            onClick={() => setSelectedProperty('all')}
            size="small"
            sx={{
              fontFamily: 'monospace', fontSize: '0.75rem', cursor: 'pointer',
              bgcolor: selectedProperty === 'all' ? 'rgba(79,195,247,0.2)' : 'rgba(255,255,255,0.06)',
              color: selectedProperty === 'all' ? '#4fc3f7' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${selectedProperty === 'all' ? 'rgba(79,195,247,0.4)' : 'rgba(255,255,255,0.1)'}`,
              '&:hover': { bgcolor: 'rgba(79,195,247,0.15)' },
            }}
          />
          {properties.map((prop) => (
            <Chip
              key={prop}
              label={`${prop} (${byProperty[prop] ?? 0})`}
              onClick={() => setSelectedProperty(prop)}
              size="small"
              sx={{
                fontFamily: 'monospace', fontSize: '0.75rem', cursor: 'pointer',
                bgcolor: selectedProperty === prop ? 'rgba(79,195,247,0.2)' : 'rgba(255,255,255,0.06)',
                color: selectedProperty === prop ? '#4fc3f7' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${selectedProperty === prop ? 'rgba(79,195,247,0.4)' : 'rgba(255,255,255,0.1)'}`,
                '&:hover': { bgcolor: 'rgba(79,195,247,0.15)' },
              }}
            />
          ))}
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3, bgcolor: 'rgba(255,167,38,0.1)', color: '#ffb74d', border: '1px solid rgba(255,167,38,0.2)' }}>
          {error}
        </Alert>
      )}

      {/* Transactietabel — zonder bedrag */}
      <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <LinkIcon sx={{ color: '#4fc3f7', fontSize: 16 }} />
          <Typography sx={{ color: 'white', fontFamily: 'monospace', fontSize: '0.8rem', letterSpacing: 1 }}>
            TRANSACTIE LOG
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
              {loading ? 'laden...' : `${filtered.length} records · tick #${tick}`}
            </Typography>
          </Box>
        </Box>

        {filtered.length === 0 && !loading ? (
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <AccountBalanceIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.15)', mb: 2 }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
              {entries.length === 0
                ? 'Nog geen biedingen. Biedingen verschijnen hier zodra ze zijn ingediend.'
                : 'Geen biedingen voor de geselecteerde woning.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small" sx={{ tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  {['Block', 'Tx Hash', 'Woning', 'Bieder', 'Tijdstip'].map((h) => (
                    <TableCell key={h} sx={{
                      color: 'white', fontFamily: 'monospace',
                      fontSize: '0.7rem', letterSpacing: 1, textTransform: 'uppercase',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      bgcolor: 'transparent', py: 1.5,
                    }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((entry) => {
                  const isNew = newIds.has(entry.id);
                  return (
                    <TableRow
                      key={entry.id}
                      sx={{
                        bgcolor: isNew ? 'rgba(0,230,118,0.07)' : 'transparent',
                        transition: 'background-color 1.5s ease',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                        '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)' },
                      }}
                    >
                      {/* Block */}
                      <TableCell sx={{ fontFamily: 'monospace', color: '#ffb74d', fontSize: '0.8rem', py: 1.5 }}>
                        #{entry.block_number.toLocaleString()}
                      </TableCell>

                      {/* Tx Hash */}
                      <TableCell sx={{ py: 1.5 }}>
                        <Tooltip title={entry.tx_hash} placement="top">
                          <Typography sx={{
                            fontFamily: 'monospace', fontSize: '0.78rem',
                            color: '#4fc3f7', cursor: 'default',
                            '&:hover': { color: '#81d4fa' },
                          }}>
                            {shortHash(entry.tx_hash)}
                          </Typography>
                        </Tooltip>
                      </TableCell>

                      {/* Woning */}
                      <TableCell sx={{ py: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Typography sx={{ color: 'white', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {entry.property_address}
                        </Typography>
                      </TableCell>

                      {/* Bieder wallet — geen naam, alleen wallet voor privacy */}
                      <TableCell sx={{ py: 1.5 }}>
                        <Tooltip title={entry.bidder_wallet} placement="top">
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#ce93d8', cursor: 'default' }}>
                            {shortWallet(entry.bidder_wallet)}
                          </Typography>
                        </Tooltip>
                      </TableCell>

                      {/* Tijdstip — exacte datum en tijd */}
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {formatTime(entry.indexed_at)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Network', value: 'Polygon PoS (lokaal)' },
          { label: 'Contract', value: 'OssoBidRegistry.sol' },
          { label: 'Verificatie', value: 'SHA-256 iDIN hash' },
          { label: 'Opslag', value: 'On-chain + MySQL index' },
          { label: 'Bedragen', value: 'Verborgen tijdens bieden' },
        ].map((item) => (
          <Box key={item.label}>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: 1, textTransform: 'uppercase' }}>
              {item.label}
            </Typography>
            <Typography sx={{ color: 'white', fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {item.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
