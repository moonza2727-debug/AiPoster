
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // ตรวจสอบค่าจาก Environment Variable ของ Vercel หรือ Local
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "")
  }
});
