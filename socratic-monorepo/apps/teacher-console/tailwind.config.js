/** @type {import('tailwindcss').Config} */
// "Warm Swiss Precision": nền giấy ngà ấm, thẻ trắng sứ viền siêu mảnh, chữ than chì; màu ngữ nghĩa trầm (không dùng đỏ/xanh cơ bản chói mắt).
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF7F0', // nền tổng thể
        sunk: '#F2EFE9', // hover / bề mặt đang chọn
        rule: '#E6E3DC', // viền thẻ
        hair: '#EFECE6', // đường kẻ ngang trong bảng
        ink: '#1B1F27', // chữ, icon chính (không dùng #000)
        mute: '#646A73', // siêu dữ liệu
        // đỏ đô học thuật: thương hiệu, nút chính, và cũng là màu "mắc kẹt"
        brand: {50: '#FDF2F2', 100: '#FBE3E4', 200: '#F5C2C7', 300: '#E59AA0', 400: '#C9606A', 500: '#B53D46', 600: '#A32C34', 700: '#8A242B', 800: '#6F1D23', 900: '#541519'},
        stuck: {bg: '#FDF2F2', bd: '#F5C2C7', fg: '#A32C34'},
        hint: {bg: '#FFFBEB', bd: '#FDE68A', fg: '#B45309'},
        mastery: {bg: '#F0FDF4', bd: '#BBF7D0', fg: '#15803D'},
      },
      boxShadow: { card: '0 2px 10px rgba(27, 31, 39, 0.03)' },
      // phông có đủ glyph tiếng Việt; Times New Roman đứng sau để chữ vẫn đẹp khi chưa tải được Newsreader
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', '"Segoe UI"', 'sans-serif'],
        serif: ['Newsreader', '"Times New Roman"', 'Cambria', '"Noto Serif"', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
