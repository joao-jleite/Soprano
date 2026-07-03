import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1440px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // Zitrón brand tokens (override em um lugar só quando o manual oficial chegar)
        zitron: {
          blue: 'hsl(var(--zitron-blue))',
          'blue-bright': 'hsl(var(--zitron-blue-bright))',
          ink: 'hsl(var(--zitron-ink))',
          graphite: 'hsl(var(--zitron-graphite))',
          steel: 'hsl(var(--zitron-steel))',
          chrome: 'hsl(var(--zitron-chrome))',
          cyan: 'hsl(var(--zitron-cyan))',
        },
        // Chips de status — par texto/fundo que se adapta ao tema
        ok: { DEFAULT: 'hsl(var(--ok))', bg: 'hsl(var(--ok-bg))' },
        warn: { DEFAULT: 'hsl(var(--warn))', bg: 'hsl(var(--warn-bg))' },
        bad: { DEFAULT: 'hsl(var(--bad))', bg: 'hsl(var(--bad-bg))' },
        brand: { bg: 'hsl(var(--brand-bg))' },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'rotor-settle': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(1080deg)' },
        },
        'rotor-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        // Splash: rotor gira 3 voltas e assenta no S (curva do design system)
        'rotor-settle': 'rotor-settle 2.6s cubic-bezier(0.13, 0.62, 0.16, 1) both',
        'rotor-spin': 'rotor-spin 1.1s linear infinite',
        // Giro lento contínuo — painel de marca do login
        'rotor-drift': 'rotor-spin 14s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
