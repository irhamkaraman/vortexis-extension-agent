import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { defineConfig, type Plugin } from 'vite';
import fs from 'fs';
import rollupObfuscator from 'rollup-plugin-obfuscator';
const obfuscator = (rollupObfuscator as any).default || rollupObfuscator;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';

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
      plugins: isDev ? [] : [
        // Only apply lightweight obfuscation in production.
        // Heavy options (controlFlowFlattening, deadCodeInjection, selfDefending)
        // slow down the extension significantly and can cause agent tool-call timeouts.
        obfuscator({
          globalOptions: {
            compact: true,
            controlFlowFlattening: false,         // DISABLED: causes 2-5x perf slowdown
            deadCodeInjection: false,              // DISABLED: inflates bundle, slow parse
            debugProtection: false,
            debugProtectionInterval: 0,
            disableConsoleOutput: false,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            numbersToExpressions: false,           // DISABLED: runtime overhead
            renameGlobals: false,
            selfDefending: false,                  // DISABLED: breaks with devtools open
            simplify: true,
            splitStrings: false,                   // DISABLED: fragments prompt strings
            stringArray: true,
            stringArrayCallsTransform: true,
            stringArrayCallsTransformThreshold: 0.5,
            stringArrayEncoding: ['base64'],        // Lighter: base64 only, no rc4
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 1,
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 2,
            stringArrayWrappersType: 'function',
            stringArrayThreshold: 0.75,            // Only 75% of strings obfuscated
            unicodeEscapeSequence: false,          // DISABLED: unnecessary overhead
          }
        })
      ]
    },
  },
});
