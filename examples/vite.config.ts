import { defineConfig } from 'vite';
import path from 'path';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  root: __dirname,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@common': path.resolve(__dirname, 'src/common'),
      '@cases': path.resolve(__dirname, 'src/cases'),
      'public': path.resolve(__dirname, 'public'),
    },
  },
  server: {
    port: 3600,
    open: true,
  },
  // public 目录会被复制到输出根目录，可以通过绝对路径访问
  publicDir: 'public',
  plugins: [
    // 使用 vite-plugin-wasm 处理 WASM 文件
    // 这会自动为 .wasm 文件设置正确的 MIME 类型
    wasm(),
  ],
});
