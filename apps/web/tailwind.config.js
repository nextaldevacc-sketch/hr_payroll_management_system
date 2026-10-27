/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/app/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/primitives/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        inset: 'var(--surface-inset)',
        'inset-hover': 'var(--surface-inset-hover)',
        'surface-inset': 'var(--surface-inset)',
        'surface-inset-hover': 'var(--surface-inset-hover)',
        'tint-primary': 'var(--tint-primary)',
        'tint-primary-strong': 'var(--tint-primary-strong)',
        'tint-danger': 'var(--tint-danger)',
        'tint-warning': 'var(--tint-warning)',
        'tint-success': 'var(--tint-success)',
        primary: {
          DEFAULT: 'var(--primary)',
          strong: 'var(--primary-strong)',
          wash: 'var(--primary-wash)'
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          text: 'var(--secondary-text)',
          wash: 'var(--secondary-wash)'
        },
        text: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
          heading: 'var(--heading)'
        },
        border: 'var(--border)',
        danger: {
          DEFAULT: 'var(--danger)',
          text: 'var(--danger-text)',
          wash: 'var(--danger-wash)'
        },
        warning: {
          DEFAULT: 'var(--warning)',
          text: 'var(--warning-text)',
          wash: 'var(--warning-wash)'
        }
      },
      borderRadius: {
        tile: '20px',
        control: '14px',
        pill: '9999px'
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-ibm-plex-arabic)', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glass: 'var(--shadow-glass)',
        'well-flat': 'var(--shadow-well-flat)',
        'well-inset': 'var(--shadow-well-inset)',
        'well-hover': 'var(--shadow-well-hover)'
      },
      backdropBlur: {
        glass: '18px',
        'glass-dark': '20px'
      },
      animation: {
        'sheen': 'sheenSweep 2.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards',
        'pulse-subtle': 'subtlePulse 3s ease-in-out infinite'
      },
      keyframes: {
        sheenSweep: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        subtlePulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' }
        }
      }
    }
  },
  plugins: []
};
