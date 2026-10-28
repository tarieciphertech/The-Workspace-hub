import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // The project Pages URL includes /The-Workspace-hub until the custom
  // workspace.synexistech.co.zw domain is connected and verified.
  base: process.env.GITHUB_ACTIONS ? '/The-Workspace-hub/' : '/',
})
