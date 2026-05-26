import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
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
		fontFamily: {
				'sans': ['Proxima Nova', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
				/* Tokens used by the redesigned checkout (see RedesignedPaymentForm + checkout-redesign.css). */
				'hc-serif': ['DM Serif Display', 'Times New Roman', 'serif'],
				'hc-sans': ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					hover: 'hsl(var(--primary-hover))'
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
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				/*
				 * Redesigned checkout palette — these reference CSS variables set on the
				 * `.hc-redesign` root in checkout-redesign.css so theme switching keeps
				 * working. Use as `text-hc-ink`, `bg-hc-paper`, `border-hc-rule`, etc.
				 */
				hc: {
					bg: 'var(--hc-bg)',
					paper: 'var(--hc-paper)',
					ink: 'var(--hc-ink)',
					'ink-2': 'var(--hc-ink-2)',
					'ink-3': 'var(--hc-ink-3)',
					rule: 'var(--hc-rule)',
					'rule-2': 'var(--hc-rule-2)',
					accent: 'var(--hc-accent)',
					'accent-soft': 'var(--hc-accent-soft)',
					'accent-ink': 'var(--hc-accent-ink)',
					positive: 'var(--hc-positive)'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				/* Redesigned checkout — 8px default, 12px for cards. */
				hc: '8px',
				'hc-lg': '12px'
			},
			/* Removed gradient backgrounds for flatter design */
			boxShadow: {
				'soft': 'var(--shadow-soft)',
				'medium': 'var(--shadow-medium)',
				'strong': 'var(--shadow-strong)',
			},
			keyframes: {
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-in-right': {
					'0%': {
						transform: 'translateX(12px)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateX(0)',
						opacity: '1'
					}
				},
			},
			animation: {
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-in-fast': 'fade-in 0.15s ease-out',
				'slide-in-right-fast': 'slide-in-right 0.15s ease-out',
				/* Redesigned checkout animations — mirrors keyframes in checkout-redesign.css. */
				'hc-fade': 'hc-fade 0.35s cubic-bezier(0.2, 0.7, 0.3, 1)',
				'hc-field-rise': 'hc-field-rise 0.45s cubic-bezier(0.2, 0.7, 0.3, 1)',
				'hc-card-slide-in': 'hc-card-slide-in 0.42s cubic-bezier(0.2, 0.7, 0.3, 1)',
				'hc-line-in': 'hc-line-in 0.35s cubic-bezier(0.2, 0.7, 0.3, 1)',
				'hc-mark-pop': 'hc-mark-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
			},
			/* Custom spacing and sizing from Chrome inspect */
			spacing: {
				'10': '2.4rem',
				'64': '16rem',
				'72': '18rem'
			},
			maxWidth: {
				'md': '34rem'
			},
			padding: {
				'6': '2.5rem'
			}
		}
	},
    plugins: [animate],
} satisfies Config;
