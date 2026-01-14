
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // นำ define ออกเพื่อให้ process.env.API_KEY ดึงค่าจากสภาพแวดล้อมที่รันอยู่จริง (Injected at runtime)
});
