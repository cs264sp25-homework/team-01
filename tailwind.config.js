/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			brand: {
  				DEFAULT: 'hsl(var(--brand))',
  				foreground: 'hsl(var(--brand-foreground))'
  			},
  			highlight: {
  				DEFAULT: 'hsl(var(--highlight))',
  				foreground: 'hsl(var(--highlight-foreground))'
  			},
  			blue: {
  				'50': 'hsl(var(--primary) / 0.1)',
  				'100': 'hsl(var(--primary) / 0.2)',
  				'200': 'hsl(var(--primary) / 0.3)',
  				'300': 'hsl(var(--primary) / 0.4)',
  				'400': 'hsl(var(--primary) / 0.5)',
  				'500': 'hsl(var(--primary) / 0.6)',
  				'600': 'hsl(var(--primary) / 0.7)',
  				'700': 'hsl(var(--primary) / 0.8)',
  				'800': 'hsl(var(--primary) / 0.9)',
  				'900': 'hsl(var(--primary) / 1)',
  				'950': 'hsl(var(--primary) / 1)'
  			},
  			green: {
  				'50': 'hsl(var(--accent) / 0.1)',
  				'100': 'hsl(var(--accent) / 0.2)',
  				'200': 'hsl(var(--accent) / 0.3)',
  				'300': 'hsl(var(--accent) / 0.4)',
  				'400': 'hsl(var(--accent) / 0.5)',
  				'500': 'hsl(var(--accent) / 0.6)',
  				'600': 'hsl(var(--accent) / 0.7)',
  				'700': 'hsl(var(--accent) / 0.8)',
  				'800': 'hsl(var(--accent) / 0.9)',
  				'900': 'hsl(var(--accent) / 1)',
  				'950': 'hsl(var(--accent) / 1)'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
  		fontFamily: {
  			heading: [
  				'var(--font-heading)',
  				'ui-sans-serif',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI Variable Display',
  				'Segoe UI',
  				'Helvetica',
  				'Apple Color Emoji',
  				'Arial',
  				'sans-serif',
  				'Segoe UI Emoji',
  				'Segoe UI Symbol',
  				'Noto Color Emoji'
  			],
  			mono: [
  				'var(--font-mono)',
  				...require("tailwindcss/defaultTheme").fontFamily.mono
  			],
  			sans: [
  				'var(--font-sans)',
  				'ui-sans-serif',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI Variable Display',
  				'Segoe UI',
  				'Helvetica',
  				'Apple Color Emoji',
  				'Arial',
  				'sans-serif',
  				'Segoe UI Emoji',
  				'Segoe UI Symbol',
  				'Noto Color Emoji'
  			]
  		}
  	}
  },
  plugins: [
    require('tailwindcss-animate'),
    require('tailwind-scrollbar-hide')
  ],
} 