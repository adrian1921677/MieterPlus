/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#2563a8',
        'primary-dark': '#1d4f8c',
        brand: '#09090b',
      },
    },
  },
  plugins: [],
};
