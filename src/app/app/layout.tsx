import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workspace — AEROX OFFICE',
  description: 'Your spatial productivity workspace.',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
