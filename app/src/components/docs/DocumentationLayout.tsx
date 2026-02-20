import React from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemText, Typography, Divider, useMediaQuery, useTheme, IconButton } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HomeIcon from '@mui/icons-material/Home';

const drawerWidth = 280;

const navItems = [
    { text: 'Overview', path: '/docs' },
    { text: 'Use Cases', path: '/docs/use-cases' },
    { text: 'Installation', path: '/docs/installation' },
    { text: 'Usage Guide', path: '/docs/usage' },
    { text: 'Integration Examples', path: '/docs/integration' },
];

export const DocumentationLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = React.useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const navContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }} onClick={() => navigate('/')}>
                <AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                <Typography variant="h6" fontWeight="bold">Noah SDK</Typography>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
            <List sx={{ px: 2, py: 2 }}>
                {navItems.map((item) => (
                    <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => {
                                navigate(item.path);
                                if (isMobile) setMobileOpen(false);
                            }}
                            sx={{
                                borderRadius: 2,
                                '&.Mui-selected': {
                                    background: 'rgba(33, 150, 243, 0.1)',
                                    color: 'primary.main',
                                    borderLeft: '4px solid #2196f3',
                                },
                                '&:hover': {
                                    background: 'rgba(255, 255, 255, 0.05)'
                                }
                            }}
                        >
                            <ListItemText
                                primary={item.text}
                                primaryTypographyProps={{
                                    fontWeight: location.pathname === item.path ? 600 : 400
                                }}
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            <Box sx={{ mt: 'auto', p: 3 }}>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 2 }} />
                <ListItemButton onClick={() => navigate('/')} sx={{ borderRadius: 2, color: 'text.secondary' }}>
                    <HomeIcon sx={{ mr: 2 }} fontSize="small" />
                    <ListItemText primary="Back to Home" />
                </ListItemButton>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', background: 'radial-gradient(circle at top left, #121212, #000000)' }}>
            {/* Mobile AppBar */}
            {isMobile && (
                <Box sx={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1100,
                    background: 'rgba(18, 18, 18, 0.8)', backdropFilter: 'blur(10px)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 2
                }}>
                    <IconButton color="inherit" edge="start" onClick={handleDrawerToggle}>
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" fontWeight="bold">Noah Docs</Typography>
                </Box>
            )}

            {/* Sidebar Navigation */}
            <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
                {isMobile ? (
                    <Drawer
                        variant="temporary"
                        open={mobileOpen}
                        onClose={handleDrawerToggle}
                        ModalProps={{ keepMounted: true }}
                        sx={{
                            display: { xs: 'block', md: 'none' },
                            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, background: '#121212', borderRight: '1px solid rgba(255,255,255,0.05)' },
                        }}
                    >
                        {navContent}
                    </Drawer>
                ) : (
                    <Drawer
                        variant="permanent"
                        sx={{
                            display: { xs: 'none', md: 'block' },
                            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, background: 'transparent', borderRight: '1px solid rgba(255,255,255,0.05)' },
                        }}
                        open
                    >
                        {navContent}
                    </Drawer>
                )}
            </Box>

            {/* Main Content Area */}
            <Box component="main" sx={{
                flexGrow: 1, p: { xs: 3, md: 6 },
                mt: { xs: 8, md: 0 },
                width: { md: `calc(100% - ${drawerWidth}px)` },
                maxWidth: 1000,
                margin: '0 auto'
            }}>
                <Outlet />
            </Box>
        </Box>
    );
};
