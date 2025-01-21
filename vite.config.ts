/// <reference types="vitest" />

import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import { createTanStackServerFnPlugin } from '@tanstack/server-functions-plugin';
import { TanStackStartVitePlugin } from '@tanstack/start-plugin';
import { resolve } from 'node:path';

const TanStackServerFnsPlugin = createTanStackServerFnPlugin({
  // This is the ID that will be available to look up and import
  // our server function manifest and resolve its module
  manifestVirtualImportId: 'tsr:server-fn-manifest',
  client: {
    getRuntimeCode: () =>
      `import { createClientRpc } from '~/client-runtime'`,
    replacer: (opts) => `createClientRpc(${JSON.stringify(opts.functionId)})`,
  },
  ssr: {
    getRuntimeCode: () =>
      `import { createSsrRpc } from '~/ssr-runtime'`,
    replacer: (opts) => `createSsrRpc(${JSON.stringify(opts.functionId)})`,
  },
  server: {
    getRuntimeCode: () =>
      `import { createServerRpc } from '@tanstack/start/server-runtime'`,
    replacer: (opts) =>
      `createServerRpc(${JSON.stringify(opts.functionId)}, ${opts.fn})`,
  },
})

// https://vitejs.dev/config/
export default defineConfig(({ mode, isSsrBuild }) => ({
  build: {
    target: ['es2020'],
    outDir: 'dist/client'
  },
  resolve: {
    mainFields: ['module'],
    alias: {
      '~': resolve(process.cwd(), 'src/app')
    }
  },
  plugins: [
    analog({
      ssr: true,
      nitro: {
        rollupConfig: {
          plugins: [
            TanStackStartVitePlugin({ env: 'server' }),
            ...TanStackServerFnsPlugin.server,
            {
              name: 'tsr:resolve',
              resolveId(id) {
                const [fileId, query] = id.split('?');

                if (query && query.includes('tsr-directive')) {
                  return fileId;
                }

                return;
              }
            }
          ],
        },
      }
    }),
    { ...TanStackStartVitePlugin({ env: 'client' }), enforce: 'post' },
    {
      ...TanStackServerFnsPlugin.client[0],
      enforce: 'post',
      transform(code, id, options) {
        if (!options?.ssr) {
          // console.log('ss')
          const transform = TanStackServerFnsPlugin.client[0].transform as Function;
          const result = transform(code, id);

          return result;
        }

        return undefined;
      }
    },
    TanStackServerFnsPlugin.client[1],
    {
      ...TanStackServerFnsPlugin.ssr[0],
      enforce: 'post',
      transform(code, id, options) {
        if (options?.ssr) {
          // console.log('ss')
          const transform = TanStackServerFnsPlugin.ssr[0].transform as Function;
          const result = transform(code, id);

          return result;
        }

        return undefined;
      }
    }
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['**/*.spec.ts'],
    reporters: ['default'],
  },
  define: {
    'import.meta.vitest': mode !== 'production',
    'process.env.TSS_SERVER_FN_BASE': `"api/server-fns"`
  },
}));
