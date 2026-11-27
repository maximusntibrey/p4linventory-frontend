import { Home } from 'components/icons';
import Box from '@mui/material/Box';
import { LinkButton, PageHeader } from '../components/ui';

export function NotFound() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
      <PageHeader
        title="Page not found"
        subtitle="We could not find that page. Check the address or go back home."
      />
      <LinkButton to="/" icon={Home}>
        Back to Home
      </LinkButton>
    </Box>
  );
}
