import PropTypes from 'prop-types';

// material-ui
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

// project imports
import AuthFooter from 'components/cards/AuthFooter';
import AuthCard from './AuthCard';

// assets
import logoStackedOnDark from 'assets/logo-stacked-on-dark.png';

// ==============================|| AUTHENTICATION - WRAPPER ||============================== //
// Desktop: navy brand panel (stacked logo with the tagline) beside a white form panel.
// Mobile: a navy header strip above the form.

export default function AuthWrapper({ children }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, bgcolor: 'background.paper' }}>
      <Box
        component="header"
        sx={{
          bgcolor: 'navy.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
          py: { xs: 2, md: 6 },
          flex: { md: '0 0 45%' }
        }}
      >
        <Box
          component="img"
          src={logoStackedOnDark}
          alt="Payless4Laptops. Premium laptops, half the price."
          sx={{ width: { xs: 160, md: 'min(100%, 420px)' }, height: 'auto', display: 'block' }}
        />
      </Box>
      <Stack sx={{ flex: 1, minHeight: 0, justifyContent: 'space-between', bgcolor: 'background.default' }}>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, md: 3 } }}>
          <AuthCard>{children}</AuthCard>
        </Box>
        <AuthFooter />
      </Stack>
    </Box>
  );
}

AuthWrapper.propTypes = { children: PropTypes.node };
