import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileCheck, Info, Upload } from 'lucide-react';
import { api, rowsOf } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey, useSingleFlight } from '../../api/idempotency';
import { useCurrentMe } from '../../auth/guards';
import { ApiProblem } from '../../components/ApiProblem';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { Field } from '../../components/Field';
import { ResultCard } from '../../components/focus';
import { Select } from '../../components/Select';
import { linkButton } from '../sales/labels';
import { Button, Card } from '../../components/ui';

type S = components['schemas'];

/** Said before anyone confirms, as agreed with the owner (2026-11-24). */
function Warning() {
  return (
    <p className="m-0 flex items-start gap-2 rounded-lg border border-line bg-surface p-3">
      <Info aria-hidden="true" size={20} className="mt-0.5 shrink-0" />
      <span>
        New items are created as <strong>Draft</strong>. Importing the same file again adds the
        quantities again.
      </span>
    </p>
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
    <dl className="m-0 grid grid-cols-1 gap-1 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2">
          <dt className="text-muted">{k}</dt>
          <dd className="m-0 font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
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
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h1 className="text-4xl text-ink">Import from CSV</h1>
        <ResultCard>
          <p className="m-0 text-lg font-semibold">Import {report.batch_reference} is done.</p>
          <Counts r={report} />
        </ResultCard>
        <div className="flex flex-wrap gap-2">
          <Button icon={Upload} onClick={again}>
            Import another file
          </Button>
          <Link to="/items" className={linkButton}>
            <span>Back to items</span>
          </Link>
        </div>
      </div>
    );
  }

  const clean = report !== null && report.errors.length === 0;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-4xl text-ink">Import from CSV</h1>
      <Warning />
      <ApiProblem error={server} at={run.submittedAt} />
      <Card className="flex flex-col gap-4">
        <h2 className="text-3xl">1. Choose the file</h2>
        <Field
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
          <Select
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
          </Select>
        )}
        <Button
          icon={FileCheck}
          disabled={run.isPending}
          className="w-full sm:w-auto sm:self-start"
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
        <Card className="flex flex-col gap-3">
          <h2 className="text-3xl">2. Check result</h2>
          <p role="status" className="m-0 font-semibold">
            {clean
              ? 'No errors. Nothing has been saved yet.'
              : `${report.errors.length} ${report.errors.length === 1 ? 'error' : 'errors'} found. Nothing was saved. Fix the file and check it again.`}
          </p>
          <Counts r={report} />
          {report.errors.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Errors by row">
              {report.errors.map((e, i) => (
                <li key={i} className="rounded-lg border border-bad bg-bad-bg p-2 text-bad">
                  <strong>Row {e.row}</strong>
                  {e.field ? ` · ${e.field}` : ''}: {e.message}
                </li>
              ))}
            </ul>
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
    </div>
  );
}
