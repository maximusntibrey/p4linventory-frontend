import { Home } from 'components/icons';
import Box from '@mui/material/Box';
import { LinkButton, PageHeader } from '../components/ui';

export function Forbidden() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
      <PageHeader
        title="403: Not allowed"
        subtitle="Your account is not allowed to open this page. If you need it, ask your administrator."
      />
      <LinkButton to="/" icon={Home}>
        Back to Home
      </LinkButton>
    </Box>
  );
}
