import { EmptyState, PageHeader } from '../components/ui';
import Box from '@mui/material/Box';
import { Construction } from 'components/icons';

/** Stand-in for a screen that a later step builds. The route and its permission check are real. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title={title} />
      <EmptyState
        icon={Construction}
        title="Not built yet"
        description="This screen is not built yet."
      />
    </Box>
  );
}
