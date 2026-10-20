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
    <html lang="vi">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
          crossOrigin="anonymous"
        />
        <script
          defer
          src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-[#F8F7F4] text-[#18181B] min-h-screen antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
