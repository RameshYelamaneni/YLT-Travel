import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { platformApi } from './vite.platform-api';

export default defineConfig(({ command, mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...fileEnv, ...process.env })) {
    if (typeof v === 'string') env[k] = v;
  }
  return {
    plugins: command === 'serve' ? [react(), platformApi(env)] : [react()],
    define: {
      'import.meta.env.VITE_RAZORPAY_KEY_ID': JSON.stringify(env.VITE_RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID || ''),
    },
    server: {
      host: true,
      port: 5173,
      watch: { ignored: ['**/dist/**'] },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
