import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Socratic Vision Board - Student Companion',
  description: 'Gamified Socratic Companion with Anti-Cheat Cognitive Scaffolding, SymPy Verification & Grit Economy',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-paper text-ink min-h-screen antialiased selection:bg-sunk selection:text-ink">
        {children}
      </body>
    </html>
  );
}
