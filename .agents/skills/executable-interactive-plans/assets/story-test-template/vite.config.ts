import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { reviewServer } from "./review-server"

export default defineConfig({
  plugins: [react(), reviewServer()],
  server: { host: "127.0.0.1", port: 4174, strictPort: true },
})
