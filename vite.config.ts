import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Note: localtunnel (loca.lt) fournit le HTTPS public.
// Le dev server tourne en HTTP sur localhost, le tunnel assure le HTTPS côté mobile.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,    // Expose sur toutes les interfaces réseau
    // https est géré par le tunnel localtunnel (https://fleetmanager-ma.loca.lt)
    // ou via @vitejs/plugin-basic-ssl pour le HTTPS local réseau
  },
})
