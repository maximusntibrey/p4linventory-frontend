import MuiSkeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

/** Loading placeholder, hidden from assistive tech: put aria-busy on the region that loads. */
export function Skeleton({
  width = '100%',
  height = 16,
}: {
  width?: number | string;
  height?: number | string;
}) {
  return <MuiSkeleton aria-hidden="true" variant="rounded" width={width} height={height} />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <Stack aria-hidden="true" sx={{ gap: 1 }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '66%' : '100%'} />
      ))}
    </Stack>
  );
}
