import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'subtle-x-light': `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3e%3cpath d='M0 0L60 60M0 60L60 0' stroke='%2327272a' stroke-width='0.75' stroke-opacity='0.04' stroke-linecap='round'/%3e%3c/svg%3e")`,
        'subtle-x-dark': `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3e%3cpath d='M0 0L60 60M0 60L60 0' stroke='%23a1a1aa' stroke-width='0.75' stroke-opacity='0.05' stroke-linecap='round'/%3e%3c/svg%3e")`,
      },
      fontFamily: {
        body: ['var(--font-inter)', 'sans-serif'],
        headline: ['var(--font-space-grotesk)', 'sans-serif'],
        code: ['monospace'],
        // "Build a Bigger Engine" funnel faces
        anton: ['var(--font-anton)', 'sans-serif'],
        archivo: ['var(--font-archivo)', 'sans-serif'],
      },
      colors: {
        // Plan finder (entry section, dialog, admin): the brand palette from the
        // owner's design review. The entry is black in both themes, so it uses
        // these fixed values rather than the theme tokens, which flip.
        hx: {
          yellow: '#FADB5C',
          card: '#1A1A1A',   // card on black
          line: '#333333',   // border on black
          mute: '#B3B3B3',   // muted text on black
          ctl: '#808080',    // control border on black
          lineL: '#D9D9D9',  // border on white
          muteL: '#4D4D4D',  // muted text on white
        },
        // "Build a Bigger Engine" VO2max funnel palette (scoped, matches the guide + carousel)
        engine: {
          ox: '#5C0F1A',       // deep oxblood — dark section backgrounds
          oxdeep: '#2C0710',   // darkest maroon — gradient floor
          crimson: '#C1121F',  // primary hero red — buttons, accents
          crimsonD: '#9E0E1A',
          heart: '#E63946',    // lively accent — highlights, pulse line on dark
          paper: '#FBF5EF',    // warm cream — light section backgrounds
          paper2: '#F5E7E1',
          blush: '#F7EAE5',    // soft panels / stat tiles
          ink: '#2A1619',      // primary text on light
          inkSoft: '#4A3034',  // secondary text on light
          mutedrose: '#8A7375',
          line: '#E5D7D1',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
