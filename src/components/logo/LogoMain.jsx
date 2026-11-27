import PropTypes from 'prop-types';

// material-ui
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

// assets
import logoMark from 'assets/logo-mark.png';
import wordmarkOnDark from 'assets/logo-wordmark-on-dark.png';
import wordmark from 'assets/logo-wordmark.png';

// ==============================|| LOGO (mark + wordmark) ||============================== //
// `reverse` = light artwork for dark surfaces (the drawer); default = dark artwork for light surfaces.

export default function LogoMain({ reverse = true }) {
  return (
    <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
      <Box component="img" src={logoMark} alt="" sx={{ height: 28, width: 'auto', display: 'block' }} />
      <Box component="img" src={reverse ? wordmarkOnDark : wordmark} alt="Payless4Laptops" sx={{ height: 20, width: 'auto', display: 'block' }} />
    </Stack>
  );
}

LogoMain.propTypes = { reverse: PropTypes.bool };
