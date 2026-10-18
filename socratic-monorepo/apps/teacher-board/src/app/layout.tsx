import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Socratic Vision Board - Teacher Smartboard',
  description: 'AI-assisted Interactive Smartboard with On-Demand Magic Lasso & 60FPS Deterministic Simulation Engines',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
