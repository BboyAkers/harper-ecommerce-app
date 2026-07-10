import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin, type ViteDevServer } from 'vite';

/**
 * Harper serves this app via @harperfast/vite, whose dev mode expects unhandled
 * requests to fall through to Harper's REST layer (/Product/, /Order/, ...).
 * Vite 8's `appType: 'spa'` appends a terminal 404 middleware even in middleware
 * mode, which swallows those requests. Run as `appType: 'custom'` instead and
 * serve index.html ourselves for HTML navigations only.
 */
function harperRestFallthrough(): Plugin {
	return {
		name: 'harper-rest-fallthrough',
		config: () => ({ appType: 'custom' }),
		configureServer(server: ViteDevServer) {
			return () => {
				server.middlewares.use(async (req, res, next) => {
					const isHtmlNavigation =
						(req.method === 'GET' || req.method === 'HEAD') &&
						String(req.headers.accept ?? '').includes('text/html');
					if (!isHtmlNavigation) return next();
					try {
						const template = readFileSync(path.join(server.config.root, 'index.html'), 'utf8');
						const html = await server.transformIndexHtml(req.url ?? '/', template, req.originalUrl);
						res.setHeader('Content-Type', 'text/html');
						res.end(html);
					} catch (error) {
						next(error);
					}
				});
			};
		},
	};
}

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		harperRestFallthrough(),
	],
	resolve: {
		alias: {
			'@': path.resolve(import.meta.dirname, './src'),
		},
	},
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		rolldownOptions: {
			external: ['**/*.test.*', '**/*.spec.*'],
		},
	},
});
