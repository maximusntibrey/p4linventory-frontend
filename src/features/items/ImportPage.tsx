import { useState } from 'react';
import Box from '@mui/material/Box';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileCheck, Info, Upload } from 'components/icons';
import { api, rowsOf } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey, useSingleFlight } from '../../api/idempotency';
import { useCurrentMe } from '../../auth/guards';
import { ApiProblem } from '../../components/ApiProblem';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { ResultCard } from '../../components/focus';
import { Button, Card, PageHeader, SelectField, TextField, LinkButton } from '../../components/ui';

type S = components['schemas'];

/** Said before anyone confirms, as agreed with the owner (2026-11-24). */
function Warning() {
  return (
    <Box
      component="p"
      sx={{
        m: 0,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'grey.100',
        p: 1.5,
      }}
    >
      <Info aria-hidden="true" size={20} />
      <span>
        New items are created as <strong>Draft</strong>. Importing the same file again adds the
        quantities again.
      </span>
    </Box>
  );
}

function Counts({ r }: { r: S['ItemImportReport'] }) {
  const rows: [string, number][] = [
    ['Rows in the file', r.rows],
    ['New items (created as Draft)', r.items_created],
    ['Existing items (reused)', r.items_existing],
    ['Opening quantity in total', r.opening_quantity_total],
  ];
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))' },
        gap: 0.5,
      }}
    >
      {rows.map(([k, v]) => (
        <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Box component="dt" sx={{ color: 'text.secondary' }}>
            {k}
          </Box>
          <Box component="dd" sx={{ m: 0, fontWeight: 600 }}>
            {v}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/** Items and opening quantities from a CSV. Always a dry run first; the server checks every row and commits only a clean file. */
export function ImportPage() {
  const me = useCurrentMe();
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  const flight = useSingleFlight();
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState('');
  const [report, setReport] = useState<S['ItemImportReport'] | null>(null);
  const [fileError, setFileError] = useState<string>();
  // Changing the key gives a fresh, empty file input (a file input cannot be cleared from state).
  const [inputKey, setInputKey] = useState(0);
  // The API says who works across all locations; those users must name the location.
  const chooseLocation = me.all_branches;
  const locations = useQuery({
    enabled: chooseLocation,
    queryKey: ['import', 'locations'],
    queryFn: () => api('get', '/api/v1/branches/', { query: { is_active: true, page_size: 100 } }),
  });
  const run = useMutation({
    mutationFn: (dry: boolean) => {
      const form = new FormData();
      form.append('file', file!);
      form.append('dry_run', String(dry));
      if (location) form.append('location_id', location);
      return api('post', '/api/v1/item-imports/', {
        body: form,
        idempotencyKey: keys.forAction(
          `${dry}:${file!.name}:${file!.size}:${file!.lastModified}:${location}`,
        ),
      });
    },
    onSuccess: async (r) => {
      keys.done();
      setReport(r);
      if (r.committed) {
        await qc.invalidateQueries({ queryKey: ['items'] });
        await qc.invalidateQueries({ queryKey: ['stock'] });
      }
    },
  });
  const server = run.error;
  const again = () => {
    setFile(null);
    setInputKey((k) => k + 1);
    setReport(null);
    setFileError(undefined);
    run.reset();
  };

  if (report?.committed) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <PageHeader title="Import from CSV" />
        <ResultCard>
          <Box component="p" sx={{ m: 0, fontSize: '1.125rem', fontWeight: 600 }}>
            Import {report.batch_reference} is done.
          </Box>
          <Counts r={report} />
        </ResultCard>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button icon={Upload} onClick={again}>
            Import another file
          </Button>
          <LinkButton to="/items" variant="secondary">
            Back to items
          </LinkButton>
        </Box>
      </Box>
    );
  }

  const clean = report !== null && report.errors.length === 0;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title="Import from CSV" />
      <Warning />
      <ApiProblem error={server} at={run.submittedAt} />
      <Card sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box component="h2" sx={{ fontSize: '1.875rem' }}>
          1. Choose the file
        </Box>
        <TextField
          key={inputKey}
          label="CSV file"
          type="file"
          accept=".csv,text/csv"
          hint="UTF-8, up to 2 MB and 5000 rows. Needs opening_quantity and unit_cost columns."
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setReport(null);
            setFileError(undefined);
            run.reset();
          }}
          error={fileError}
        />
        {chooseLocation && (
          <SelectField
            label="Location"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setReport(null);
            }}
          >
            <option value="">Choose a location</option>
            {(locations.data ? rowsOf(locations.data) : []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </SelectField>
        )}
        <Button
          icon={FileCheck}
          disabled={run.isPending}
          sx={{ width: { xs: '100%', sm: 'auto' }, alignSelf: { sm: 'flex-start' } }}
          onClick={() => {
            if (!file) {
              setFileError('Choose a CSV file first.');
              return;
            }
            setFileError(undefined);
            if (flight.start()) run.mutate(true, { onSettled: flight.end });
          }}
        >
          {run.isPending ? 'Checking…' : 'Check the file'}
        </Button>
      </Card>

      {report && (
        <Card sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box component="h2" sx={{ fontSize: '1.875rem' }}>
            2. Check result
          </Box>
          <Box component="p" role="status" sx={{ m: 0, fontWeight: 600 }}>
            {clean
              ? 'No errors. Nothing has been saved yet.'
              : `${report.errors.length} ${report.errors.length === 1 ? 'error' : 'errors'} found. Nothing was saved. Fix the file and check it again.`}
          </Box>
          <Counts r={report} />
          {report.errors.length > 0 && (
            <Box
              component="ul"
              sx={{
                m: 0,
                display: 'flex',
                listStyle: 'none',
                flexDirection: 'column',
                gap: 1,
                p: 0,
              }}
              aria-label="Errors by row"
            >
              {report.errors.map((e, i) => (
                <Box
                  component="li"
                  key={i}
                  sx={{
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'error.main',
                    bgcolor: 'error.lighter',
                    p: 1,
                    color: 'error.main',
                  }}
                >
                  <strong>Row {e.row}</strong>
                  {e.field ? ` · ${e.field}` : ''}: {e.message}
                </Box>
              ))}
            </Box>
          )}
          {clean && (
            <ConfirmPanel
              danger={false}
              title="Import this file now? New items are created as Draft and the quantities are added to stock. Importing the same file again adds them again."
              confirmLabel="Import now"
              pending={run.isPending}
              onConfirm={() => flight.start() && run.mutate(false, { onSettled: flight.end })}
              onCancel={again}
            />
          )}
        </Card>
      )}
    </Box>
  );
}
