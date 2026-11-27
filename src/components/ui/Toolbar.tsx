import { Download, Filter, Plus, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Drawer } from './Drawer';
import { SearchInput } from './SearchInput';
import { SegmentedControl } from './SegmentedControl';
import type { SegmentOption } from './SegmentedControl';
import { Select } from './Select';
import { FormField } from './FormField';
import { Switch } from './Switch';
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
  /** Extra controls (for example the column-visibility menu). */
  children?: ReactNode;
};

/** Every control is optional: pass only what the screen allows. The primary action carries a leading +. */
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
  // Phones: search and the primary action stay; everything else sits behind one Filters button.
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
    <div className={compact ? undefined : 'w-40'}>
      <FormField label="Sort by">
        {(c) => (
          <Select {...c} value={sort.value} onChange={(e) => sort.onChange(e.target.value)}>
            {sort.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
      </FormField>
    </div>
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
    <Switch
      label="Show Statistics"
      checked={statistics.checked}
      onCheckedChange={statistics.onChange}
    />
  );
  const searchBox = search && (
    <SearchInput
      label={search.label}
      value={search.value}
      onValueChange={search.onChange}
      className="min-w-0 flex-1 basis-56"
    />
  );
  const primaryBtn = primary && (
    <Button icon={Plus} onClick={primary.onClick} className="ml-auto">
      {primary.label}
    </Button>
  );
  if (compact) {
    const hasMore = onFilter || sort || onExport || view || statistics || children;
    return (
      <div role="toolbar" aria-label="Table tools" className="flex flex-wrap items-end gap-2">
        {searchBox}
        {hasMore && (
          <Button variant="secondary" icon={SlidersHorizontal} onClick={() => setOpen(true)}>
            Filters
          </Button>
        )}
        {primaryBtn}
        <Drawer open={open} onClose={() => setOpen(false)} title="Filters">
          <div className="flex flex-col items-stretch gap-3 *:w-full">
            {filter}
            {sortField}
            {viewControl}
            {stats}
            {children}
            {exportBtn}
          </div>
        </Drawer>
      </div>
    );
  }
  return (
    <div role="toolbar" aria-label="Table tools" className="flex flex-wrap items-end gap-2">
      {searchBox}
      {filter}
      {sortField}
      {exportBtn}
      {viewControl}
      {stats}
      {children}
      {primaryBtn}
    </div>
  );
}
