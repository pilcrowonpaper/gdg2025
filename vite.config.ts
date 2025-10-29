import * as path from "node:path";
import * as vite from "vite";

export default vite.defineConfig({
	resolve: {
		alias: {
			"@lang": path.resolve(import.meta.dirname, "lang/index.js"),
			"@audio": path.resolve(import.meta.dirname, "audio/index.js"),
			"@graphics": path.resolve(import.meta.dirname, "graphics/index.js"),
			"@storage": path.resolve(import.meta.dirname, "storage/index.js"),
			"@shared": path.resolve(import.meta.dirname, "shared/index.js"),
		},
	},
	build: {
		rollupOptions: {
			input: [
				path.resolve(import.meta.dirname, "index.html"),
				path.resolve(import.meta.dirname, "game/index.html"),
				path.resolve(import.meta.dirname, "game/play/index.html"),
				path.resolve(import.meta.dirname, "game/audio-clips/index.html"),
				path.resolve(import.meta.dirname, "game/sprites/index.html"),
				path.resolve(import.meta.dirname, "game/scripts/index.html"),
				path.resolve(import.meta.dirname, "game/files/index.html"),
			],
		},
	},
});
