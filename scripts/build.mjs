import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { force: true, recursive: true });
await mkdir("dist/src", { recursive: true });
await cp("index.html", "dist/index.html");
await cp("src/main.js", "dist/src/main.js");
await cp("src/validation.js", "dist/src/validation.js");
await cp("src/uiState.js", "dist/src/uiState.js");
await cp("src/tauriApi.js", "dist/src/tauriApi.js");
await cp("src/styles.css", "dist/src/styles.css");
