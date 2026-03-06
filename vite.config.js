import { defineConfig } from "vite";

export default defineConfig({
  // 專案根目錄
  root: ".",

  // 開發伺服器設定
  server: {
    port: 3000,
    open: true,
    host: true,
    allowedHosts: true,
  },

  // 打包設定
  build: {
    outDir: "dist",
    // 確保單一 CSS 檔案輸出 (方便部署)
    cssCodeSplit: false,
  },
});
