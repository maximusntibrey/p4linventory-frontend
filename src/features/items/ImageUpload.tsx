import { useId, useState } from 'react';
import Box from '@mui/material/Box';
import { useMutation } from '@tanstack/react-query';
import { ImageUp } from 'components/icons';
import { api } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey } from '../../api/idempotency';
import { ApiProblem } from '../../components/ApiProblem';
import { SuccessNotice } from '../../components/focus';
import { Button } from '../../components/ui';

type Item = components['schemas']['Item'];

// Same limits the contract states for the image endpoint. The server checks the real file content
// and size again; this only saves a round trip and gives a plain message first.
const types = ['image/jpeg', 'image/png', 'image/webp'];
const maxBytes = 5 * 1024 * 1024;

/** The one item picture: shows it, and uploads a new one (which replaces it). `canManage` comes from /me. */
export function ImageUpload({
  item,
  canManage,
  onUploaded,
}: {
  item: Item;
  canManage: boolean;
  onUploaded: (item: components['schemas']['ItemWithCost']) => void;
}) {
  const inputId = useId();
  const keys = useIdempotencyKey();
  const [file, setFile] = useState<File>();
  const [tooBig, setTooBig] = useState<string>();
  const [wrongType, setWrongType] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [broken, setBroken] = useState(false);
  const [round, setRound] = useState(0); // new key = a fresh file input after each upload
  const problem = wrongType ?? tooBig;
  const upload = useMutation({
    mutationFn: (f: File) => {
      const body = new FormData();
      body.append('image', f);
      return api('put', '/api/v1/items/{id}/image/', {
        path: { id: item.id },
        body,
        idempotencyKey: keys.forAction(`${f.name}:${f.size}:${f.lastModified}`),
      });
    },
    onSuccess: (row) => {
      keys.done();
      setFile(undefined);
      setBroken(false);
      setSaved(true);
      setRound((n) => n + 1);
      onUploaded(row);
    },
  });

  const choose = (f: File | undefined) => {
    setSaved(false);
    upload.reset();
    setWrongType(undefined);
    setTooBig(undefined);
    setFile(undefined);
    if (!f) return;
    if (!types.includes(f.type)) {
      setWrongType('This file type is not allowed. Use a JPEG, PNG or WebP picture.');
    } else if (f.size > maxBytes) {
      setTooBig(
        `This picture is ${(f.size / 1024 / 1024).toFixed(1)} MB. The most allowed is 5 MB.`,
      );
    } else {
      setFile(f);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {item.image_url && !broken ? (
        <Box
          component="img"
          src={item.image_url}
          alt={item.name}
          onError={() => setBroken(true)}
          sx={{
            alignSelf: 'flex-start',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        />
      ) : (
        <Box component="p" sx={{ m: 0, color: 'text.secondary' }}>
          {item.image_url ? 'The picture could not be loaded.' : 'No picture yet.'}
        </Box>
      )}
      {saved && <SuccessNotice>Picture saved.</SuccessNotice>}
      {canManage && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box component="label" htmlFor={inputId} sx={{ fontWeight: 600 }}>
            {item.image_url ? 'Replace the picture' : 'Add a picture'}
          </Box>
          <Box component="p" sx={{ m: 0, fontSize: '0.875rem', color: 'text.secondary' }}>
            JPEG, PNG or WebP, up to 5 MB.
          </Box>
          <Box
            component="input"
            key={round}
            id={inputId}
            type="file"
            accept={types.join(',')}
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? `${inputId}-problem` : undefined}
            sx={{ minHeight: 44, fontSize: '1rem' }}
            onChange={(e) => choose(e.target.files?.[0])}
          />
          {problem && (
            <Box
              component="p"
              id={`${inputId}-problem`}
              role="alert"
              sx={{ m: 0, fontSize: '0.875rem', fontWeight: 600, color: 'error.main' }}
            >
              {problem}
            </Box>
          )}
          <ApiProblem error={upload.error} at={upload.submittedAt} />
          <Button
            icon={ImageUp}
            disabled={!file || upload.isPending}
            onClick={() => file && upload.mutate(file)}
            sx={{ alignSelf: 'flex-start' }}
          >
            {upload.isPending ? 'Uploading…' : 'Upload picture'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
