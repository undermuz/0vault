import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "0vault",
		identifier: "undermuz.0vault",
		version: "0.0.1",
	},
	build: {
		bun: {
			tsconfig: "./tsconfig.json",
		},
		// Vite builds to dist/, we copy from there
		copy: {
			"dist/index.html": "views/mainview/index.html",
			"dist/assets": "views/mainview/assets",
		},
		// Ignore Vite output in watch mode — HMR handles view rebuilds separately
		watchIgnore: ["dist/**"],
		mac: {
			bundleCEF: false,
		},
		linux: {
			bundleCEF: false,
		},
		win: {
			bundleCEF: false,
		},
	},
	release: {
		baseUrl: "https://github.com/undermuz/0vault/releases/latest/download",
	}
} satisfies ElectrobunConfig;
