/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Oficial (CSS HEX)
        'floral-white': '#FFFCF2',
        'pearl-beige': '#E5D5B3',
        'carbon-black': '#1B1A1B',
        'deep-teal': '#607466',

        // Tokens do Modelo de Referência Editorial
        primary: '#FFFCF2',
        'primary-container': '#607466',
        'on-primary-container': '#FFFCF2',
        secondary: '#E5D5B3',
        'secondary-container': '#262E29',
        'on-secondary-container': '#E5D5B3',
        background: '#121112',
        surface: '#1B1A1B',
        'surface-container-lowest': '#0F0E0F',
        'surface-container-low': '#171617',
        'surface-container': '#1E1D1E',
        'surface-container-high': '#262527',
        'surface-container-highest': '#313032',
        'surface-variant': '#282729',
        outline: '#748B7B',
        'outline-variant': '#373638',
        'on-surface': '#FFFCF2',
        'on-surface-variant': '#BDBAB5',
        tertiary: '#748B7B',
        'tertiary-container': '#243028',
        'on-tertiary': '#FFFCF2',
        'surface-bright': '#3B3A3C',
        'surface-dim': '#121112',

        // Cores Semânticas Funcionais Estritas
        semantic: {
          success: '#748B7B',
          warning: '#E5D5B3',
          danger: '#f87171',
          info: '#607466'
        }
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2.5rem',
        'gutter-sm': '1rem',
        gutter: '1.5rem',
        'gutter-lg': '2.5rem',
        'margin-sm': '1.25rem',
        margin: '2rem',
        'margin-lg': '4rem'
      },
      fontFamily: {
        'body-md': ['Inter', 'sans-serif'],
        'label-lg': ['Inter', 'sans-serif'],
        'display-mobile': ['Newsreader', 'Georgia', 'serif'],
        'label-md': ['Inter', 'sans-serif'],
        subheading: ['Newsreader', 'Georgia', 'serif'],
        'headline-lg-mobile': ['Newsreader', 'Georgia', 'serif'],
        'headline-md': ['Newsreader', 'Georgia', 'serif'],
        'label-sm': ['Inter', 'sans-serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'body-sm': ['Inter', 'sans-serif'],
        display: ['Newsreader', 'Georgia', 'serif'],
        'headline-sm': ['Newsreader', 'Georgia', 'serif'],
        'headline-lg': ['Newsreader', 'Georgia', 'serif']
      },
      fontSize: {
        'body-md': ['1rem', { lineHeight: '1.625rem', letterSpacing: '0em', fontWeight: '400' }],
        'label-lg': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.02em', fontWeight: '600' }],
        'display-mobile': ['2.5rem', { lineHeight: '3rem', letterSpacing: '-0.015em', fontWeight: '400' }],
        'label-md': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.04em', fontWeight: '500' }],
        subheading: ['1.125rem', { lineHeight: '1.625rem', letterSpacing: '0.01em', fontWeight: '400' }],
        'headline-lg-mobile': ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.01em', fontWeight: '400' }],
        'headline-md': ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.01em', fontWeight: '500' }],
        'label-sm': ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.06em', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.875rem', letterSpacing: '-0.005em', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.375rem', letterSpacing: '0.005em', fontWeight: '400' }],
        display: ['3.5rem', { lineHeight: '4rem', letterSpacing: '-0.02em', fontWeight: '400' }],
        'headline-sm': ['1.375rem', { lineHeight: '1.875rem', letterSpacing: '0em', fontWeight: '500' }],
        'headline-lg': ['2.5rem', { lineHeight: '3rem', letterSpacing: '-0.015em', fontWeight: '400' }],
        // Aliases compatíveis
        caption: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.04em', fontWeight: '500' }],
        body: ['0.875rem', { lineHeight: '1.375rem', letterSpacing: '0.005em', fontWeight: '400' }],
        h3: ['1.375rem', { lineHeight: '1.875rem', letterSpacing: '0em', fontWeight: '500' }],
        h2: ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.01em', fontWeight: '500' }],
        h1: ['2.5rem', { lineHeight: '3rem', letterSpacing: '-0.015em', fontWeight: '400' }]
      }
    }
  },
  plugins: []
}
