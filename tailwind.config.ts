import type { Config } from 'tailwindcss';

const config: Config = {
  /**
   * Die App ist dunkel voreingestellt: `tokens.css` definiert die dunklen Werte
   * auf `:root` und schaltet über die Klasse `light` auf hell um — es gibt also
   * keine Klasse `dark`, auf die Tailwinds Standardstrategie hören könnte.
   * Ohne diesen Selektor greift keine einzige `dark:`-Utility.
   */
  darkMode: ['selector', ':root:not(.light)'],
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
