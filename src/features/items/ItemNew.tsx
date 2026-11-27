import { Link, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'components/icons';
import { api } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey } from '../../api/idempotency';
import { ApiProblem } from '../../components/ApiProblem';
import { ItemForm } from './ItemForm';
import { Card, PageHeader } from '../../components/ui';

/** Add an item. It is always saved as a Draft; the item page then offers Activate. */
export function ItemNew() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  const create = useMutation({
    mutationFn: (body: components['schemas']['ItemWrite']) =>
      api('post', '/api/v1/items/', { body, idempotencyKey: keys.forAction(JSON.stringify(body)) }),
    onSuccess: async (item) => {
      keys.done();
      await qc.invalidateQueries({ queryKey: ['items', 'list'] });
      // Possible duplicates do not block: they travel to the item page as a notice.
      navigate(`/items/${item.id}`, {
        state: { notice: `${item.name} was saved as a Draft.`, warnings: item.warnings },
      });
    },
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title="Add an item" />
      <ApiProblem error={create.error} at={create.submittedAt} />
      <Card>
        <ItemForm
          pending={create.isPending}
          error={create.error}
          submitLabel="Save as Draft"
          onSubmit={(body) => create.mutate(body)}
        />
      </Card>
      <Box
        component={Link}
        to="/items"
        sx={{
          display: 'inline-flex',
          minHeight: 44,
          alignItems: 'center',
          gap: 1,
          fontWeight: 600,
          color: 'primary.main',
          textDecoration: 'underline',
        }}
      >
        <ArrowLeft aria-hidden="true" size={20} />
        <span>Back to items</span>
      </Box>
    </Box>
  );
}
