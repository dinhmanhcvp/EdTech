/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  // serif có đủ glyph tiếng Việt (Georgia thiếu một số chữ có dấu) cho tên sách trên kệ
  theme: { extend: { fontFamily: { serif: ['"Times New Roman"', 'Cambria', '"Noto Serif"', 'serif'] } } },
  plugins: [],
};
