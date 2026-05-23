import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        jakarta: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Single, disciplined palette
        ink: {
          DEFAULT: '#0f172a',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50:  '#f8fafc',
        },
        primary: {
          DEFAULT: '#4B0082',
          900: '#1A0030',
          800: '#28004A',
          700: '#3A0066',
          600: '#4B0082',
          500: '#6B2BA1',
          400: '#8A4FB8',
          300: '#A875D2',
          200: '#C9A4E5',
          100: '#E5D1F3',
          50:  '#F4ECFA',
        },
        success: { DEFAULT: '#10b981', 50: '#ecfdf5', 100: '#d1fae5', 700: '#047857' },
        warning: { DEFAULT: '#f59e0b', 50: '#fffbeb', 100: '#fef3c7', 700: '#b45309' },
        danger:  { DEFAULT: '#ef4444', 50: '#fef2f2', 100: '#fee2e2', 700: '#b91c1c' },
        sidebar: '#0b1120',
      },
      boxShadow: {
        xs:    '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        sm:    '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        md:    '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        lg:    '0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
        panel: '0 0 0 1px rgb(0 0 0 / 0.04), 0 4px 16px -2px rgb(0 0 0 / 0.08)',
      },
      letterSpacing: {
        tight:   '-0.025em',
        tighter: '-0.04em',
      },
    },
  },
  plugins: [],
};

export default config;
