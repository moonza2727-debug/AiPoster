
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // กำหนดค่าเพื่อให้ Browser รู้จัก process.env และเข้าถึง API_KEY ได้
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env': {}
  }
});
