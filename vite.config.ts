import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    worker: {
        format: 'es',
        rollupOptions: {
            output: {
                entryFileNames: 'worker-[name].[hash].js',
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
        } as any,
        rollupOptions: {
            output: {
                // Vite 8 bundles with Rolldown, which requires manualChunks to be a
                // function (the object form is no longer accepted). Groups the React
                // runtime (incl. scheduler, react-dom's dep) into one vendor chunk.
                manualChunks: (id) => {
                    if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
                        return 'react-vendor';
                    }
                },
                chunkFileNames: (chunkInfo) => {
                    const facadeModuleId = chunkInfo.facadeModuleId
                        ? chunkInfo.facadeModuleId.split('/').pop()
                        : 'chunk';
                    return `${facadeModuleId}-[hash].js`;
                },
            },
        },
        reportCompressedSize: true,
        chunkSizeWarningLimit: 1000,
    },
    optimizeDeps: {
        include: ['react', 'react-dom'],
        exclude: ['@/apple1/worker'],
    },
});
