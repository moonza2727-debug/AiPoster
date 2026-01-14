
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // ใช้ค่าจาก Environment Variable ที่ตั้งไว้ใน Vercel
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ""),
    'process.env': {}
  }
});
