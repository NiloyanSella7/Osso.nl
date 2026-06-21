import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert, Box, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import HubIcon from '@mui/icons-material/Hub';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import PendingOutlinedIcon from '@mui/icons-material/PendingOutlined';
import EventNoteIcon from '@mui/icons-material/EventNote';

interface KafkaMessage {
  id: string;
  topic: string;
  data: Record<string, unknown>;
  timestamp: string;
  type?: string;
}

const TOPIC_META: Record<string, { label: string; color: string; bg: string; icon: ReactNode }> = {
  'blockchain.bid.submit': {
    label: 'bid.submit',
    color: '#FF9800',
    bg: 'rgba(255,152,0,0.15)',
    icon: <PendingOutlinedIcon sx={{ fontSize: 14 }} />,
  },
  'blockchain.bid.confirmed': {
    label: 'bid.confirmed',
    color: '#4CAF50',
    bg: 'rgba(76,175,80,0.15)',
    icon: <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />,
  },
  'blockchain.auction.events': {
    label: 'auction.events',
    color: '#2196F3',
    bg: 'rgba(33,150,243,0.15)',
    icon: <EventNoteIcon sx={{ fontSize: 14 }} />,
  },
};

function shortKey(s: string | undefined) {
  if (!s) return '—';
  return `${s.slice(0, 8)}…`;
}

function shortWallet(w: string | undefined) {
  if (!w) return '—';
  return `${w.slice(0, 8)}…${w.slice(-4)}`;
}

function shortHash(h: string | undefined) {
  if (!h) return '—';
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('nl-NL', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function KafkaMonitor() {
  const [messages, setMessages] = useState<KafkaMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const wsRef = useRef<WebSocket | null>(null);

  // Zet een WebSocket-verbinding op naar de Kafka-feed en herverbindt automatisch bij verbreking
  useEffect(() => {
    const token = localStorage.getItem('osso_token');
    if (!token) { setError('Niet ingelogd'); return; }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/api/kafka/ws?token=${token}`;

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => { setConnected(true); setError(''); };
      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000);
      };
      ws.onerror = () => setError('WebSocket verbindingsfout — opnieuw verbinden…');
      ws.onmessage = (e) => {
        const msg: KafkaMessage = JSON.parse(e.data);
        if (msg.type === 'heartbeat') return;
        setMessages((prev) => [msg, ...prev].slice(0, 300));
      };
    }

    connect();
    return () => { wsRef.current?.close(); };
  }, []);

  const topics = Object.keys(TOPIC_META);
  // Filtert berichten op gekozen topic, of toont alles
  const filtered = filter === 'all' ? messages : messages.filter((m) => m.topic === filter);

  // Telt het aantal berichten per topic voor de stats en filterchips
  const countByTopic = topics.reduce<Record<string, number>>((acc, t) => {
    acc[t] = messages.filter((m) => m.topic === t).length;
    return acc;
  }, {});

  const stats = [
    { label: 'Totaal berichten', value: messages.length, color: '#4fc3f7' },
    { label: 'Biedingen verzonden', value: countByTopic['blockchain.bid.submit'] ?? 0, color: '#FF9800' },
    { label: 'Transacties bevestigd', value: countByTopic['blockchain.bid.confirmed'] ?? 0, color: '#4CAF50' },
    { label: 'Veiling events', value: countByTopic['blockchain.auction.events'] ?? 0, color: '#2196F3' },
  ];

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: '#050810', mx: 'calc(-50vw + 50%)', px: { xs: 2, md: 6 }, pt: 4, pb: 8 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 10, height: 10, borderRadius: '50%',
            bgcolor: connected ? '#4CAF50' : '#F44336',
            boxShadow: connected ? '0 0 8px #4CAF50' : '0 0 8px #F44336',
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1, transform: 'scale(1)' },
              '50%': { opacity: 0.5, transform: 'scale(0.85)' },
            },
          }} />
          <Typography sx={{ color: connected ? '#4CAF50' : '#F44336', fontWeight: 700, fontSize: '0.7rem', letterSpacing: 2, fontFamily: 'monospace' }}>
            {connected ? 'LIVE' : 'VERBINDEN…'}
          </Typography>
        </Box>
        <HubIcon sx={{ color: '#FF9800', fontSize: 22 }} />
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>
          Kafka Monitor
        </Typography>
        <Typography variant="caption" sx={{ color: '#888', fontFamily: 'monospace', ml: 'auto' }}>
          Admin · Alleen voor intern gebruik
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(244,67,54,0.1)', color: '#ef9a9a', border: '1px solid rgba(244,67,54,0.2)' }}>
          {error}
        </Alert>
      )}

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {stats.map((s) => (
          <Box key={s.label} sx={{ flex: '1 1 160px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>
              {s.label}
            </Typography>
            <Typography sx={{ color: s.color, fontWeight: 700, fontSize: '1.6rem', fontFamily: 'monospace' }}>
              {s.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Topic filter */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Chip
          label={`Alle (${messages.length})`}
          onClick={() => setFilter('all')}
          size="small"
          sx={{
            fontFamily: 'monospace', fontSize: '0.72rem', cursor: 'pointer',
            bgcolor: filter === 'all' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
            color: 'white',
            border: `1px solid ${filter === 'all' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
          }}
        />
        {topics.map((t) => {
          const meta = TOPIC_META[t];
          return (
            <Chip
              key={t}
              icon={<Box component="span" sx={{ color: `${meta.color} !important`, display: 'flex' }}>{meta.icon}</Box>}
              label={`${meta.label} (${countByTopic[t] ?? 0})`}
              onClick={() => setFilter(t)}
              size="small"
              sx={{
                fontFamily: 'monospace', fontSize: '0.72rem', cursor: 'pointer',
                bgcolor: filter === t ? meta.bg : 'rgba(255,255,255,0.04)',
                color: filter === t ? meta.color : 'rgba(255,255,255,0.6)',
                border: `1px solid ${filter === t ? meta.color + '60' : 'rgba(255,255,255,0.1)'}`,
              }}
            />
          );
        })}
      </Box>

      {/* Message feed */}
      <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <HubIcon sx={{ color: '#FF9800', fontSize: 15 }} />
          <Typography sx={{ color: 'white', fontFamily: 'monospace', fontSize: '0.78rem', letterSpacing: 1 }}>
            MESSAGE FEED
          </Typography>
          <Typography sx={{ ml: 'auto', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
            {filtered.length} berichten · realtime WebSocket
          </Typography>
        </Box>

        {filtered.length === 0 ? (
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <HubIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.1)', mb: 2 }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
              Wacht op Kafka berichten…
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  {['Tijd', 'Topic', 'Bid Key', 'Auction', 'Wallet', 'Tx Hash / Status'].map((h) => (
                    <TableCell key={h} sx={{
                      color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', fontSize: '0.65rem',
                      letterSpacing: 1, textTransform: 'uppercase',
                      borderBottom: '1px solid rgba(255,255,255,0.07)',
                      bgcolor: '#0a0e18', py: 1.5,
                    }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((msg) => {
                  const meta = TOPIC_META[msg.topic];
                  const d = msg.data;
                  // Bericht is een foutmelding als status 'failed' is of een error-veld bevat
                  const isError = d.status === 'failed' || 'error' in d;
                  const isConfirmed = msg.topic === 'blockchain.bid.confirmed' && !isError;

                  return (
                    <TableRow
                      key={msg.id}
                      sx={{
                        bgcolor: 'transparent',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                        '& td': { borderBottom: '1px solid rgba(255,255,255,0.04)' },
                      }}
                    >
                      {/* Tijd */}
                      <TableCell sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', py: 1.5, width: 90 }}>
                        {formatTime(msg.timestamp)}
                      </TableCell>

                      {/* Topic badge */}
                      <TableCell sx={{ py: 1.5, width: 160 }}>
                        {meta ? (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.4, borderRadius: 1, bgcolor: meta.bg, border: `1px solid ${meta.color}40` }}>
                            <Box sx={{ color: meta.color, display: 'flex' }}>{meta.icon}</Box>
                            <Typography sx={{ color: meta.color, fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 600 }}>
                              {meta.label}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            {msg.topic}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Bid Key */}
                      <TableCell sx={{ py: 1.5, width: 100 }}>
                        <Tooltip title={String(d.bid_key ?? '')} placement="top">
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#ce93d8', cursor: 'default' }}>
                            {shortKey(String(d.bid_key ?? ''))}
                          </Typography>
                        </Tooltip>
                      </TableCell>

                      {/* Auction ID */}
                      <TableCell sx={{ py: 1.5, width: 80 }}>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#ffb74d' }}>
                          #{String(d.auction_id ?? '—')}
                        </Typography>
                      </TableCell>

                      {/* Wallet */}
                      <TableCell sx={{ py: 1.5, width: 130 }}>
                        <Tooltip title={String(d.bidder_wallet ?? '')} placement="top">
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#81d4fa', cursor: 'default' }}>
                            {shortWallet(String(d.bidder_wallet ?? ''))}
                          </Typography>
                        </Tooltip>
                      </TableCell>

                      {/* Tx Hash / Status */}
                      {/* Toont status op basis van bericht type: fout, bevestigd, wachtend, of ruwe data */}
                      <TableCell sx={{ py: 1.5 }}>
                        {isError ? (
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#ef5350' }}>
                            ✕ {String(d.error ?? 'mislukt')}
                          </Typography>
                        ) : isConfirmed ? (
                          <Tooltip title={String(d.tx_hash ?? '')} placement="top">
                            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#4CAF50', cursor: 'default' }}>
                              ✓ {shortHash(String(d.tx_hash ?? ''))} · blok #{String(d.block_number ?? '')}
                            </Typography>
                          </Tooltip>
                        ) : msg.topic === 'blockchain.bid.submit' ? (
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#FF9800' }}>
                            ⏳ Wacht op blockchain…
                          </Typography>
                        ) : (
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                            {JSON.stringify(d).slice(0, 60)}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Footer legenda */}
      <Box sx={{ mt: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'bid.submit', desc: 'Bod gepubliceerd naar Kafka', color: '#FF9800' },
          { label: 'bid.confirmed', desc: 'Blockchain tx bevestigd', color: '#4CAF50' },
          { label: 'auction.events', desc: 'Veiling lifecycle event', color: '#2196F3' },
        ].map((item) => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
            <Typography sx={{ color: item.color, fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 600 }}>
              {item.label}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
              — {item.desc}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
