export interface Clause {
  id: string;
  standardId: string;
  title: string;
  description: string;
  applicability: string[];
  severity: 'Error' | 'Warning' | 'Information';
}
