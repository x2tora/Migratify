/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 사용자 지정 테마 팔레트 (#212229 Background / #CAD3F5 Foreground / #C6A0F6 Accent 및 라벤더-슬레이트 라이트 모드 대응)
        zinc: {
          50: '#EBF0F7',
          100: '#CAD3F5',
          200: '#D0D6E6',
          300: '#B5BFE2',
          400: '#949EC0',
          500: '#646A82',
          600: '#4E5368',
          700: '#3E4152',
          800: '#323442',
          900: '#272934',
          950: '#212229',
        },
        spotify: {
          DEFAULT: 'var(--theme-accent)',
          hover: 'var(--theme-accent-hover)',
          soft: 'var(--theme-accent-soft)',
          fg: 'var(--theme-accent-fg)',
        },
        theme: {
          bg: 'var(--theme-bg)',
          card: 'var(--theme-card)',
          elevated: 'var(--theme-elevated)',
          inset: 'var(--theme-inset)',
          titlebar: 'var(--theme-titlebar)',
          fg: 'var(--theme-fg)',
          muted: 'var(--theme-muted)',
          border: 'var(--theme-border)',
          accent: 'var(--theme-accent)',
          'accent-fg': 'var(--theme-accent-fg)',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'PretendardJP', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['Consolas', 'D2 Coding', 'D2Coding', 'monospace'],
      },
      keyframes: {
        stageEnter: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        stageForward: {
          '0%': { opacity: '0', transform: 'translateX(6px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        stageBackward: {
          '0%': { opacity: '0', transform: 'translateX(-6px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        tabPanelEnter: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        tabSlideRight: {
          '0%': { opacity: '0', transform: 'translateX(4px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        tabSlideLeft: {
          '0%': { opacity: '0', transform: 'translateX(-4px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        sceneCurtain: {
          '0%': { opacity: '0' },
          '100%': { opacity: '0' },
        },
        checkPop: {
          '0%': { transform: 'scale(0.85)', opacity: '0.4' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        badgePop: {
          '0%': { opacity: '0.4' },
          '100%': { opacity: '1' },
        },
        iconMorph: {
          '0%': { opacity: '0.4' },
          '100%': { opacity: '1' },
        },
        packetFlow: {
          '0%': { transform: 'translateX(-100%)', opacity: '0.3' },
          '100%': { transform: 'translateX(200%)', opacity: '0.3' },
        },
        modalEnter: {
          '0%': { opacity: '0', transform: 'scale(0.98) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        drawerEnter: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        toastSlide: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        logLineIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'stage-enter': 'stageEnter 180ms ease-out forwards',
        'stage-forward': 'stageForward 180ms ease-out forwards',
        'stage-backward': 'stageBackward 180ms ease-out forwards',
        'tab-panel': 'tabPanelEnter 150ms ease-out forwards',
        'tab-right': 'tabSlideRight 150ms ease-out forwards',
        'tab-left': 'tabSlideLeft 150ms ease-out forwards',
        'scene-curtain': 'sceneCurtain 1ms ease-out forwards',
        'check-pop': 'checkPop 140ms ease-out forwards',
        'badge-pop': 'badgePop 140ms ease-out forwards',
        'icon-morph': 'iconMorph 150ms ease-out forwards',
        'packet-flow': 'packetFlow 1.25s linear infinite',
        'modal-enter': 'modalEnter 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'drawer-enter': 'drawerEnter 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'toast-slide': 'toastSlide 160ms ease-out forwards',
        'log-line': 'logLineIn 100ms ease-out forwards',
      },
    },
  },
  plugins: [],
};
