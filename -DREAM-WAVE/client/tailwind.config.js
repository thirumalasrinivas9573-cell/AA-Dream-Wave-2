/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
        },
        brand: {
          primary: 'var(--primary)',
          hover: 'var(--primary-hover)',
          secondary: 'var(--secondary)',
        },
        content: {
          heading: 'var(--text-heading)',
          body: 'var(--text-body)',
          muted: 'var(--text-muted)',
        },
        divider: 'var(--border-subtle)',
        focus: 'var(--border-focus)',
        wave: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-heading)', 'sans-serif'],
        sans: ['var(--font-body)', 'sans-serif'],
      },
      borderRadius: {
        stitch: 'var(--radius-card)',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(15, 23, 42, 0.12)',
        oceanic: '0 10px 28px -4px rgba(47, 143, 221, 0.12), 0 4px 12px -2px rgba(47, 143, 221, 0.08)',
        oceanicLg: '0 16px 36px -6px rgba(47, 143, 221, 0.16), 0 6px 16px -3px rgba(47, 143, 221, 0.10)',
        oceanicSm: '0 2px 8px rgba(47, 143, 221, 0.08)',
      },
      backgroundImage: {
        'wave-grid':
          'radial-gradient(circle at 20% 20%, rgba(20,184,166,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(6,182,212,0.16), transparent 35%), radial-gradient(circle at 50% 80%, rgba(15,118,110,0.12), transparent 45%)',
      },
    },
  },
  plugins: [],
};

