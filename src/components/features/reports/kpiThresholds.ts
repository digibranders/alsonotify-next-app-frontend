/**
 * One definition of the KPI bands, shared by the on-screen drawer and the PDF
 * export. They previously disagreed: the PDF used 70 for occupancy, so an
 * employee at 72% read Low in the app and green in the exported report.
 *
 * Boundaries are inclusive and match docs/kpi-calculations.html.
 */
export const KPI_THRESHOLDS = { excellent: 90, good: 75 } as const;

export type KpiBand = 'excellent' | 'good' | 'low';

export function kpiBand(value: number): KpiBand {
  if (value >= KPI_THRESHOLDS.excellent) return 'excellent';
  if (value >= KPI_THRESHOLDS.good) return 'good';
  return 'low';
}
