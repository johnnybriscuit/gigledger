/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Colors from design tokens
      colors: {
        brand: {
          DEFAULT: '#f59e0b',
          foreground: '#ffffff',
          hover: '#d97706',
          muted: '#fef3c7',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f9fafb',
          elevated: '#ffffff',
        },
        text: {
          DEFAULT: '#111827',
          muted: '#6b7280',
          subtle: '#9ca3af',
        },
        success: {
          DEFAULT: '#10b981',
          foreground: '#ffffff',
          muted: '#d1fae5',
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#ffffff',
          muted: '#fef3c7',
        },
        danger: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
          muted: '#fee2e2',
        },
        border: {
          DEFAULT: '#e5e7eb',
          muted: '#f3f4f6',
          focus: '#f59e0b',
        },
        chart: {
          primary: '#f59e0b',
          secondary: '#3b82f6',
          tertiary: '#10b981',
          quaternary: '#8b5cf6',
          quinary: '#ec4899',
        },
      },
      
      // Border radius from design tokens
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },
      
      // Box shadows from design tokens
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        popover: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        elevated: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      
      // Typography from design tokens
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Consolas', 'monospace'],
      },
      
      fontSize: {
        'display-sm': ['32px', '1.2'],
        'display-md': ['36px', '1.2'],
        'display-lg': ['48px', '1.2'],
        'h1': ['28px', '1.35'],
        'h2': ['22px', '1.35'],
        'h3': ['18px', '1.35'],
        'body': ['16px', '1.55'],
        'subtle': ['14px', '1.55'],
        'caption': ['12px', '1.5'],
      },
      
      // Transitions
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
        slow: '300ms',
      },
      
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
      },
      
      // Z-index scale
      zIndex: {
        dropdown: '1000',
        sticky: '1100',
        fixed: '1200',
        'modal-backdrop': '1300',
        modal: '1400',
        popover: '1500',
        tooltip: '1600',
        toast: '1700',
      },
      
      // Max width for content containers
      maxWidth: {
        'content': '1440px',
      },
    },
  },
  plugins: [],
};
