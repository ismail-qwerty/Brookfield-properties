/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Main brand color. Filled elements are pure black; since
        // black cannot darken, the 700 "hover" step lightens instead.
        primary: {
          DEFAULT: '#000000',
          50: '#F7F7F7',
          100: '#EFEFEF',
          200: '#D9D9D9',
          300: '#BFBFBF',
          400: '#8C8C8C',
          500: '#595959',
          600: '#000000',
          700: '#333333',
          800: '#1A1A1A',
          900: '#000000',
        },
        // Solid Green - Success, active states (status indicators only)
        green: {
          DEFAULT: '#16A34A',
          50: '#E8F7ED',
          100: '#D1EFDB',
          200: '#A3DFB7',
          300: '#75CF93',
          400: '#47BF6F',
          500: '#16A34A',
          600: '#12823B',
          700: '#0D622C',
          800: '#09411E',
          900: '#04210F',
        },
        // Action - Primary buttons, links, CTAs (mirrors `primary`)
        blue: {
          DEFAULT: '#000000',
          50: '#F7F7F7',
          100: '#EFEFEF',
          200: '#D9D9D9',
          300: '#BFBFBF',
          400: '#8C8C8C',
          500: '#595959',
          600: '#000000',
          700: '#333333',
          800: '#1A1A1A',
          900: '#000000',
        },
        // Sidebar Dark - Admin panel. 500 is Blackstone's dark section tone.
        sidebar: {
          DEFAULT: '#151B17',
          50: '#F2F2F2',
          100: '#E0E0E0',
          200: '#B3B3B3',
          300: '#808080',
          400: '#4D4D4D',
          500: '#151B17',
          600: '#111614',
          700: '#0D110F',
          800: '#151B17',
          900: '#000000',
        },
        // Additional system colors
        teal: {
          DEFAULT: '#111111',
          light: '#2E2E2E',
          dark: '#000000',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Source Serif 4', 'Georgia', 'Times New Roman', 'serif'],
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
    },
    // Blackstone's design language is hard-edged: every corner is square and
    // nothing casts a shadow. Flattening the scales applies that everywhere at
    // once, so per-page `rounded-*`/`shadow-*` utilities inherit the theme.
    // `full` stays circular for avatars and spinners.
    borderRadius: {
      none: '0px',
      sm: '0px',
      DEFAULT: '0px',
      md: '0px',
      lg: '0px',
      xl: '0px',
      '2xl': '0px',
      '3xl': '0px',
      '4xl': '0px',
      full: '9999px',
    },
    boxShadow: {
      none: 'none',
      sm: 'none',
      DEFAULT: 'none',
      md: 'none',
      lg: 'none',
      xl: 'none',
      '2xl': 'none',
      inner: 'none',
    },
  },
  plugins: [],
}
