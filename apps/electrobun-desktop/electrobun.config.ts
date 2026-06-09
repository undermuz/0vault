import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "0vault",
		identifier: "undermuz.0vault",
		version: "0.0.1",
	},
	build: {
		bun: {
			entrypoint: "src/bun/index.ts",
			tsconfig: "./tsconfig.bun.json",
		},
		copy: {
			"../../dist/apps/electrobun-desktop/index.html": "views/mainview/index.html",
			"../../dist/apps/electrobun-desktop/assets": "views/mainview/assets",
		},
		watchIgnore: ["../../dist/**"],
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
	},
} satisfies ElectrobunConfig;
