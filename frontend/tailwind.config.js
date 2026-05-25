/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Cormorant', 'Georgia', 'serif'],
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['DM Mono', 'Consolas', 'monospace'],
      },
      colors: {
        void:   '#04080F',
        canvas: '#08111F',
        panel:  '#0C1828',
        card:   '#101F32',
        lift:   '#162840',
        edge:   '#1D3450',
        rim:    '#264462',
        gold: {
          dim:     '#7A5010',
          DEFAULT: '#C98922',
          bright:  '#E4A53A',
          light:   '#F5C35A',
        },
        teal: {
          dim:     '#084E4C',
          DEFAULT: '#0AA8A0',
          bright:  '#12C8C0',
          light:   '#44E8E0',
        },
        ink: {
          0: '#E2EBF9',
          1: '#8799B8',
          2: '#4A5B78',
          3: '#283448',
        },
      },
      animation: {
        'fade-in':   'fadeIn 0.5s ease-out both',
        'slide-up':  'slideUp 0.45s ease-out both',
        'pulse-dot': 'pulseDot 2.5s ease-in-out infinite',
        'shimmer':   'shimmer 2.2s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'dash':      'dash 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:  { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseDot: { '0%,100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.5, transform: 'scale(0.85)' } },
        shimmer:  { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        dash:     { '0%': { strokeDashoffset: 283 }, '50%': { strokeDashoffset: 71 }, '100%': { strokeDashoffset: 283 } },
      },
      backgroundImage: {
        'grid-dark': "linear-gradient(rgba(38,68,98,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(38,68,98,0.25) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
}
