import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Build tĩnh để deploy lên Hostinger. base "./" giúp chạy được khi đặt
// app trong subfolder của public_html (đường dẫn tương đối cho assets).
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
