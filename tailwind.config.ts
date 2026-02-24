import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#007AFF',
          secondary: '#34aadc',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface2)',
        },
        bg: {
          0: 'var(--bg0)',
          1: 'var(--bg1)',
        },
      },
      borderRadius: {
        'card': '22px',
        'card-sm': '16px',
        'pill': '28px',
      },
      backdropBlur: {
        'glass': '44px',
      },
    },
  },
  plugins: [],
};

export default config;
