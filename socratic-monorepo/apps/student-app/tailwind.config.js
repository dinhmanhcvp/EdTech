/** @type {import('tailwindcss').Config} */
// "Interactive Lab Notebook": nền giấy ngà + lưới chấm bi, phản hồi sư phạm KHÔNG dùng đỏ báo lỗi.
//   hổ phách (hint)   = bước cần nghĩ lại;  xanh lục bảo (mastery) = máy chấm xác nhận đúng;
//   đỏ đô (brand)     = chỉ cho "Hàng rào Socratic" (khi xin đáp án) và các thao tác nguy hiểm.
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FAF7F0',
        sunk: '#F2EFE9',
        rule: '#E6E3DC',
        hair: '#EFECE6',
        ink: '#1B1F27',
        mute: '#646A73',
        dot: '#E2E0D8',
        brand: {50: '#FDF2F2', 100: '#FBE3E4', 200: '#F5C2C7', 300: '#E59AA0', 400: '#C9606A', 500: '#B53D46', 600: '#A32C34', 700: '#8A242B', 800: '#6F1D23', 900: '#541519'},
        hint: {DEFAULT: '#D97706', bg: '#FFFBEB', bd: '#FDE68A', fg: '#B45309'},
        mastery: {DEFAULT: '#15803D', bg: '#F0FDF4', bd: '#BBF7D0', fg: '#15803D'},
      },
      boxShadow: {card: '0 2px 10px rgba(27, 31, 39, 0.03)'},
      keyframes: {
        'head-shake': {'0%,100%': {transform: 'translateX(0)'}, '20%': {transform: 'translateX(-6px)'}, '40%': {transform: 'translateX(5px)'}, '60%': {transform: 'translateX(-3px)'}, '80%': {transform: 'translateX(2px)'}},
        'nudge-in': {from: {opacity: '0', transform: 'translateY(-4px) scale(.98)'}, to: {opacity: '1', transform: 'none'}},
        'unlock-turn': {'0%': {transform: 'rotate(0)'}, '45%': {transform: 'rotate(-22deg) scale(1.15)'}, '100%': {transform: 'rotate(0) scale(1)'}},
        'draw-check': {from: {strokeDashoffset: '24'}, to: {strokeDashoffset: '0'}},
        'rise-in': {from: {opacity: '0', transform: 'translateY(10px)'}, to: {opacity: '1', transform: 'none'}},
      },
      animation: {
        'head-shake': 'head-shake .2s ease-in-out 1',
        'nudge-in': 'nudge-in .25s ease-out both',
        'unlock-turn': 'unlock-turn .5s ease-out 1',
        'draw-check': 'draw-check .45s .05s ease-out forwards',
        'rise-in': 'rise-in .35s ease-out both',
      },
    },
  },
  plugins: [],
};
