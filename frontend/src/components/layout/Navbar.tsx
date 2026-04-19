import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  IconButton,
  Chip,
} from '@mui/material';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../lib/AppContext';

const NAV_LINKS = [
  { label: 'Woningen', path: '/', icon: <HomeWorkIcon sx={{ fontSize: 16 }} /> },
  { label: 'Mijn profiel', path: '/profiel', icon: <PersonIcon sx={{ fontSize: 16 }} /> },
];

const SELLER_LINK = {
  label: 'Verkoperspaneel',
  path: '/verkoper',
  icon: <DashboardIcon sx={{ fontSize: 16 }} />,
};

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isLoggedIn } = useAppContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const links =
    user?.role === 'seller' || user?.role === 'makelaar' || user?.role === 'admin'
      ? [...NAV_LINKS, SELLER_LINK]
      : NAV_LINKS;

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login');
  };

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <Toolbar sx={{ px: { xs: 2, md: 4 }, minHeight: 64 }}>
        {/* Logo */}
        <Box
          onClick={() => navigate('/')}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mr: 5 }}
        >
          <Box
            component="img"
            src="/osso-logo.png"
            alt="Osso.nl"
            sx={{ height: 52, width: 'auto' }}
          />
        </Box>

        {/* Nav links */}
        {isLoggedIn && (
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, flexGrow: 1 }}>
            {links.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  startIcon={link.icon}
                  sx={{
                    px: 2,
                    py: 0.75,
                    borderRadius: 2,
                    fontSize: '0.875rem',
                    fontWeight: active ? 700 : 500,
                    color: active ? 'primary.main' : 'text.secondary',
                    bgcolor: active ? 'rgba(27,79,114,0.07)' : 'transparent',
                    '&:hover': {
                      bgcolor: 'grey.100',
                      color: 'primary.main',
                    },
                    position: 'relative',
                    '&::after': active
                      ? {
                          content: '""',
                          position: 'absolute',
                          bottom: -17,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '60%',
                          height: 2,
                          bgcolor: 'primary.main',
                          borderRadius: '2px 2px 0 0',
                        }
                      : {},
                  }}
                >
                  {link.label}
                </Button>
              );
            })}
          </Box>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* Right side */}
        {isLoggedIn && user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {user.idin_verified && (
              <Chip
                icon={<VerifiedUserIcon sx={{ fontSize: '14px !important' }} />}
                label="Geverifieerd"
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontWeight: 600, display: { xs: 'none', sm: 'flex' } }}
              />
            )}

            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'primary.main',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                }}
              >
                {initials}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              slotProps={{
                paper: {
                  elevation: 4,
                  sx: { minWidth: 220, borderRadius: 2, mt: 1 },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {user.full_name || 'Mijn account'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  navigate('/profiel');
                }}
                sx={{ gap: 1.5, py: 1.25 }}
              >
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2">Mijn profiel</Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1.25, color: 'error.main' }}>
                <LogoutIcon fontSize="small" />
                <Typography variant="body2">Uitloggen</Typography>
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Button
            variant="contained"
            size="small"
            onClick={() => navigate('/login')}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Inloggen
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
