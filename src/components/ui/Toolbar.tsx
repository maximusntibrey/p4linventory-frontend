import { useState } from 'react';
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import { Download, Filter, Plus, Search, SlidersHorizontal } from '../icons';
import { Button } from './Button';
import { Drawer } from './Drawer';
import { SegmentedControl } from './SegmentedControl';
import type { SegmentOption } from './SegmentedControl';
import { SelectField } from './SelectField';
import { useCompact } from './useCompact';

export type ToolbarProps<V extends string = string> = {
  search?: { label: string; value: string; onChange: (v: string) => void };
  onFilter?: () => void;
  sort?: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
  };
  onExport?: () => void;
  view?: { label: string; value: V; options: SegmentOption<V>[]; onChange: (v: V) => void };
  statistics?: { checked: boolean; onChange: (v: boolean) => void };
  primary?: { label: string; onClick: () => void };
  /** Extra controls. */
  children?: ReactNode;
};

/** Every control is optional: pass only what the screen allows. On phones everything but search and the primary action sits in a Filters drawer. */
export function Toolbar<V extends string = string>({
  search,
  onFilter,
  sort,
  onExport,
  view,
  statistics,
  primary,
  children,
}: ToolbarProps<V>) {
  const compact = useCompact();
  const [open, setOpen] = useState(false);
  const closeThen = (fn?: () => void) => fn && (() => (setOpen(false), fn()));
  const filter = onFilter && (
    <Button variant="secondary" icon={Filter} onClick={compact ? closeThen(onFilter) : onFilter}>
      Filter
    </Button>
  );
  const exportBtn = onExport && (
    <Button variant="secondary" icon={Download} onClick={compact ? closeThen(onExport) : onExport}>
      Export
    </Button>
  );
  const sortField = sort && (
    <Box sx={{ width: compact ? undefined : 160 }}>
      <SelectField
        label="Sort by"
        value={sort.value}
        onChange={(e) => sort.onChange(e.target.value)}
      >
        {sort.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SelectField>
    </Box>
  );
  const viewControl = view && (
    <SegmentedControl
      label={view.label}
      value={view.value}
      onValueChange={view.onChange}
      options={view.options}
    />
  );
  const stats = statistics && (
    <FormControlLabel
      label="Show Statistics"
      control={
        <Switch
          checked={statistics.checked}
          onChange={(e) => statistics.onChange(e.target.checked)}
        />
      }
    />
  );
  const searchBox = search && (
    <Box sx={{ minWidth: 0, flex: '1 1 224px' }}>
      <OutlinedInput
        fullWidth
        size="small"
        type="search"
        value={search.value}
        onChange={(e) => search.onChange(e.target.value)}
        placeholder={search.label}
        inputProps={{ 'aria-label': search.label }}
        startAdornment={
          <InputAdornment position="start">
            <Search size={16} />
          </InputAdornment>
        }
      />
    </Box>
  );
  const primaryBtn = primary && (
    <Box sx={{ ml: 'auto' }}>
      <Button icon={Plus} onClick={primary.onClick}>
        {primary.label}
      </Button>
    </Box>
  );
  const rowSx = { flexWrap: 'wrap', alignItems: 'flex-end', gap: 1 } as const;
  if (compact) {
    const hasMore = onFilter || sort || onExport || view || statistics || children;
    return (
      <Stack role="toolbar" aria-label="Table tools" direction="row" sx={rowSx}>
        {searchBox}
        {hasMore && (
          <Button variant="secondary" icon={SlidersHorizontal} onClick={() => setOpen(true)}>
            Filters
          </Button>
        )}
        {primaryBtn}
        <Drawer open={open} onClose={() => setOpen(false)} title="Filters">
          <Stack sx={{ gap: 1.5, '& > *': { width: '100%' } }}>
            {filter}
            {sortField}
            {viewControl}
            {stats}
            {children}
            {exportBtn}
          </Stack>
        </Drawer>
      </Stack>
    );
  }
  return (
    <Stack role="toolbar" aria-label="Table tools" direction="row" sx={rowSx}>
      {searchBox}
      {filter}
      {sortField}
      {exportBtn}
      {viewControl}
      {stats}
      {children}
      {primaryBtn}
    </Stack>
  );
}
