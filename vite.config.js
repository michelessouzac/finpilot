import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Cada build ganha um id novo (timestamp). Ele vai tanto embutido no bundle
// (__APP_VERSION__) quanto num arquivo à parte (version.json) — o app compara
// os dois em runtime pra saber se saiu uma versão mais nova no ar, já que
// PWAs instalados na tela do celular costumam só "acordar" a página antiga
// em vez de recarregar sozinhos ao reabrir.
const buildId = Date.now().toString()

function writeVersionFile() {
  return {
    name: 'write-version-file',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: buildId }),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), writeVersionFile()],
  define: {
    __APP_VERSION__: JSON.stringify(buildId),
  },
  server: {
    host: true,
  },
})
