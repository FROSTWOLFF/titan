/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './apps/titan/web/index.html',
    './apps/titan/web/src/**/*.{js,ts,jsx,tsx}',
    './libs/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-animate')],
};
