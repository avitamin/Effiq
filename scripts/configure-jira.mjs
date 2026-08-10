import { constants } from "node:fs";
import { chmod, mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

export const SETTINGS_RELATIVE_PATH = ".local/effiq.settings.json";

export class JiraConfigurationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "JiraConfigurationError";
    this.code = code;
  }
}

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function normalizeJiraBaseUrl(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new JiraConfigurationError("MISSING_JIRA_URL", "JIRA_URL is required.");
  }

  const candidate = value.trim();
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new JiraConfigurationError("INVALID_JIRA_URL", "JIRA_URL must be a valid HTTP(S) URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new JiraConfigurationError("INVALID_JIRA_URL", "JIRA_URL must be a valid HTTP(S) URL.");
  }

  if (url.username || url.password || candidate.includes("?") || candidate.includes("#")) {
    throw new JiraConfigurationError(
      "UNSAFE_JIRA_URL",
      "JIRA_URL must not contain credentials, a query, or a fragment.",
    );
  }

  const normalizedPath = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${normalizedPath}`;
}

async function readExistingSettings(settingsPath) {
  let source;
  try {
    source = await readFile(settingsPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }
    throw error;
  }

  let settings;
  try {
    settings = JSON.parse(source);
  } catch {
    throw new JiraConfigurationError(
      "MALFORMED_SETTINGS",
      "Existing Effiq settings are not valid JSON; no changes were written.",
    );
  }

  if (!isObject(settings) || ("jira" in settings && !isObject(settings.jira))) {
    throw new JiraConfigurationError(
      "INVALID_SETTINGS_SHAPE",
      "Existing Effiq settings have an invalid structure; no changes were written.",
    );
  }

  return settings;
}

export async function writeSettingsAtomically(settingsPath, contents) {
  const settingsDirectory = dirname(settingsPath);
  await mkdir(settingsDirectory, { recursive: true, mode: 0o700 });

  const temporaryPath = join(
    settingsDirectory,
    `.${basename(settingsPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let handle;

  try {
    handle = await open(temporaryPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    await handle.writeFile(contents, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, settingsPath);
    await chmod(settingsPath, 0o600);
  } catch (error) {
    await handle?.close().catch(() => {});
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

export async function configureJiraSettings({ jiraUrl, settingsPath }) {
  const baseUrl = normalizeJiraBaseUrl(jiraUrl);
  const existing = await readExistingSettings(settingsPath);
  const updated = {
    ...existing,
    jira: {
      ...(existing.jira ?? {}),
      baseUrl,
    },
  };
  const contents = `${JSON.stringify(updated, null, 2)}\n`;

  await writeSettingsAtomically(settingsPath, contents);
  return updated;
}

async function main() {
  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  const settingsPath = join(repoRoot, SETTINGS_RELATIVE_PATH);

  try {
    await configureJiraSettings({ jiraUrl: process.env.JIRA_URL, settingsPath });
    console.log(`Jira settings updated at ${SETTINGS_RELATIVE_PATH}.`);
  } catch (error) {
    const message = error instanceof JiraConfigurationError
      ? error.message
      : "Unable to update Jira settings; no URL was printed.";
    console.error(`error: ${message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
