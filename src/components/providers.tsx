'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={['dark', 'light']}
      value={{ dark: 'dark', light: 'light' }}
    >
      {children}
      <Toaster
        position="top-right"
        theme="system"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
    </ThemeProvider>
  );
}
