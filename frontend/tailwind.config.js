/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      "colors": {
        "tertiary-fixed-dim": "#ffb786",
        "on-secondary-fixed-variant": "#93000b",
        "secondary-fixed": "#ffdad6",
        "secondary-fixed-dim": "#ffb4ab",
        "on-secondary-fixed": "#410002",
        "surface-container-lowest": "#0e0e0e",
        "surface-container-highest": "#353534",
        "tertiary-container": "#df7412",
        "outline": "#8c909f",
        "on-secondary": "#690005",
        "on-primary": "#002e6a",
        "surface-bright": "#3a3939",
        "primary": "#adc6ff",
        "on-error": "#690005",
        "primary-container": "#4d8eff",
        "on-tertiary-container": "#461f00",
        "surface-dim": "#131313",
        "on-surface-variant": "#c2c6d6",
        "secondary-container": "#db0418",
        "on-tertiary-fixed-variant": "#723600",
        "primary-fixed": "#d8e2ff",
        "tertiary": "#ffb786",
        "on-tertiary": "#502400",
        "surface": "#131313",
        "on-error-container": "#ffdad6",
        "on-primary-fixed-variant": "#004395",
        "tertiary-fixed": "#ffdcc6",
        "background": "#131313",
        "surface-container": "#201f1f",
        "inverse-on-surface": "#313030",
        "error": "#ffb4ab",
        "surface-container-high": "#2a2a2a",
        "surface-tint": "#adc6ff",
        "on-background": "#e5e2e1",
        "on-secondary-container": "#ffecea",
        "on-primary-container": "#00285d",
        "outline-variant": "#424754",
        "on-primary-fixed": "#001a42",
        "inverse-primary": "#005ac2",
        "inverse-surface": "#e5e2e1",
        "primary-fixed-dim": "#adc6ff",
        "on-tertiary-fixed": "#311400",
        "surface-variant": "#353534",
        "on-surface": "#e5e2e1",
        "secondary": "#ffb4ab",
        "surface-container-low": "#1c1b1b",
        "error-container": "#93000a",

        /* keep original tailwind variables */
        'sos-red':    '#FF2D2D',
        'stadium':    '#0A0A0A',
        'success':    '#22c55e',
      },
      /* Intentionally NOT overriding borderRadius — Tailwind defaults
         (including rounded-full = 9999px) must be preserved for circles. */
      "fontFamily": {
        "headline": ["Inter"],
        "body": ["Inter"],
        "label": ["Inter"]
      },
      animation: {
        'sos-pulse': 'sos-pulse 2s infinite',
        'dot-pulse': 'dot-pulse 1.2s ease-in-out infinite',
        'slide-up':  'slide-up 0.3s ease-out forwards',
        'fade-in':   'fade-in 0.4s ease-out forwards',
        'dash': 'dash 2s linear infinite',
      },
      keyframes: {
        dash: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        }
      }
    },
  },
  plugins: [],
}
