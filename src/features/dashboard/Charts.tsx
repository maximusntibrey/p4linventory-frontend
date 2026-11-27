import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';

// The charts library is the heaviest dependency: this file is loaded lazily (React.lazy in Dashboard) so the cards paint first.

export function SalesLine({
  height,
  data,
  labels,
  color,
}: {
  height: number;
  data: number[];
  labels: string[];
  color?: string;
}) {
  return (
    <LineChart
      height={height}
      hideLegend
      series={[{ data, area: true, color, label: 'Sales (GHS)' }]}
      xAxis={[{ scaleType: 'point', data: labels }]}
      margin={{ left: 8, right: 16 }}
    />
  );
}

export function StockBars({
  height,
  values,
  names,
  color,
}: {
  height: number;
  values: number[];
  names: string[];
  color?: string;
}) {
  return (
    <BarChart
      height={height}
      hideLegend
      series={[{ data: values, label: 'On hand', color }]}
      xAxis={[{ scaleType: 'band', data: names, categoryGapRatio: 0.4 }]}
      slotProps={{ bar: { rx: 4, ry: 4 } }}
    />
  );
}

export function StockSplit({
  height,
  warehouse,
  branches,
  colors,
}: {
  height: number;
  warehouse: number;
  branches: number;
  colors: [string | undefined, string | undefined];
}) {
  return (
    <PieChart
      height={height}
      series={[
        {
          innerRadius: 50,
          data: [
            { id: 'wh', value: warehouse, label: 'Warehouse', color: colors[0] },
            { id: 'br', value: branches, label: 'Branches', color: colors[1] },
          ],
        },
      ]}
    />
  );
}
