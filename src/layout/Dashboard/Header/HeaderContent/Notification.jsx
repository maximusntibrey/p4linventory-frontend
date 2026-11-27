// material-ui
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';

// project imports
import IconButton from 'components/@extended/IconButton';

// assets
import BellOutlined from '@ant-design/icons/BellOutlined';

export const NO_NOTIFICATIONS = 'No notifications yet';

// ==============================|| HEADER CONTENT - NOTIFICATION ||============================== //
// There is no notification feed yet: the bell stays in its disabled state and says so.

export default function Notification() {
  return (
    <Box sx={{ flexShrink: 0, ml: 0.75 }}>
      <Tooltip title={NO_NOTIFICATIONS}>
        <span>
          <IconButton color="secondary" variant="light" aria-label={`Notifications. ${NO_NOTIFICATIONS}`} aria-disabled="true" sx={{ color: 'text.primary' }}>
            <BellOutlined />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
