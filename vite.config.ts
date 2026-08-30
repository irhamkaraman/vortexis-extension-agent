import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { defineConfig, type Plugin } from 'vite';
import fs from 'fs';
import obfuscator from 'rollup-plugin-obfuscator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function copyManifestPlugin(): Plugin {
  return {
    name: 'copy-manifest-plugin',
    closeBundle() {
      const srcManifest = resolve(__dirname, 'src/manifest.json');
      const destManifest = resolve(__dirname, 'dist/manifest.json');
      if (fs.existsSync(srcManifest)) {
        const manifest = JSON.parse(fs.readFileSync(srcManifest, 'utf-8'));
        fs.writeFileSync(destManifest, JSON.stringify(manifest));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), copyManifestPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'src/background/index.js';
          }
          if (chunkInfo.name === 'content') {
            return 'src/content/index.js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
      plugins: [
        obfuscator({
          globalOptions: {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.75,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.4,
            debugProtection: false,
            debugProtectionInterval: 0,
            disableConsoleOutput: false,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            numbersToExpressions: true,
            renameGlobals: false,
            selfDefending: true,
            simplify: true,
            splitStrings: true,
            splitStringsChunkLength: 10,
            stringArray: true,
            stringArrayCallsTransform: true,
            stringArrayCallsTransformThreshold: 0.5,
            stringArrayEncoding: ['base64'],
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 1,
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 2,
            stringArrayWrappersType: 'variable',
            stringArrayThreshold: 0.75,
            unicodeEscapeSequence: false
          }
        })
      ]
    },
  },
});
