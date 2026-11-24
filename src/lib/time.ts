/** The API sends UTC; screens show Africa/Accra time (TASKS 0.3). */
export function formatAccra(iso: string): string {
  return `${new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))} (Accra time)`;
}
