import * as path from "node:path";
import * as vite from "vite";

export default vite.defineConfig({
	resolve: {
		alias: {
			"@lang": path.resolve(import.meta.dirname, "lang/index.js"),
		},
	},
	build: {
		rollupOptions: {
			input: [
				path.resolve(import.meta.dirname, "index.html"),
				path.resolve(import.meta.dirname, "game/index.html"),
				path.resolve(import.meta.dirname, "playground/index.html"),
			],
		},
	},
});
