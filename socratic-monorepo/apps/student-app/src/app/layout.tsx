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
      <body className="bg-[#F8F7F4] text-[#18181B] min-h-screen antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
