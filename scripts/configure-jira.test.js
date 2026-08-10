import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  configureJiraSettings,
  JiraConfigurationError,
  normalizeJiraBaseUrl,
} from "./configure-jira.mjs";

async function temporarySettingsPath() {
  const root = await mkdtemp(join(tmpdir(), "effiq-jira-settings-"));
  return { root, settingsPath: join(root, ".local", "effiq.settings.json") };
}

describe("normalizeJiraBaseUrl", () => {
  it("accepts HTTP(S), preserves a context path, and removes trailing slashes", () => {
    assert.equal(normalizeJiraBaseUrl("https://jira.example.com/"), "https://jira.example.com");
    assert.equal(
      normalizeJiraBaseUrl("https://jira.example.com/atlassian///"),
      "https://jira.example.com/atlassian",
    );
    assert.equal(normalizeJiraBaseUrl("http://jira.example.com"), "http://jira.example.com");
  });

  for (const [name, value, code] of [
    ["missing values", undefined, "MISSING_JIRA_URL"],
    ["non-HTTP schemes", "ftp://jira.example.com", "INVALID_JIRA_URL"],
    ["malformed URLs", "not a URL", "INVALID_JIRA_URL"],
    ["credentials", "https://user:secret@jira.example.com", "UNSAFE_JIRA_URL"],
    ["queries", "https://jira.example.com?token=secret", "UNSAFE_JIRA_URL"],
    ["empty queries", "https://jira.example.com?", "UNSAFE_JIRA_URL"],
    ["fragments", "https://jira.example.com#secret", "UNSAFE_JIRA_URL"],
    ["empty fragments", "https://jira.example.com#", "UNSAFE_JIRA_URL"],
  ]) {
    it(`rejects ${name} without echoing the supplied value`, () => {
      assert.throws(
        () => normalizeJiraBaseUrl(value),
        (error) => error instanceof JiraConfigurationError
          && error.code === code
          && !error.message.includes(String(value)),
      );
    });
  }
});

describe("configureJiraSettings", () => {
  it("creates normalized settings atomically with mode 0600", async () => {
    const { root, settingsPath } = await temporarySettingsPath();
    const result = await configureJiraSettings({
      jiraUrl: "https://jira.example.com/context/",
      settingsPath,
    });

    assert.deepEqual(result, { jira: { baseUrl: "https://jira.example.com/context" } });
    assert.deepEqual(JSON.parse(await readFile(settingsPath, "utf8")), result);
    assert.equal((await stat(settingsPath)).mode & 0o777, 0o600);
    assert.deepEqual(await readdir(join(root, ".local")), ["effiq.settings.json"]);
  });

  it("merge-updates only jira.baseUrl and preserves unknown fields", async () => {
    const { settingsPath } = await temporarySettingsPath();
    await configureJiraSettings({ jiraUrl: "https://old.example.com", settingsPath });
    await writeFile(
      settingsPath,
      `${JSON.stringify({ theme: "dark", jira: { project: "AG", baseUrl: "https://old.example.com" } })}\n`,
    );

    const result = await configureJiraSettings({ jiraUrl: "https://new.example.com/", settingsPath });

    assert.deepEqual(result, {
      theme: "dark",
      jira: { project: "AG", baseUrl: "https://new.example.com" },
    });
  });

  it("does not clobber malformed existing JSON", async () => {
    const { settingsPath } = await temporarySettingsPath();
    await configureJiraSettings({ jiraUrl: "https://jira.example.com", settingsPath });
    const malformed = '{"jira":';
    await writeFile(settingsPath, malformed);

    await assert.rejects(
      configureJiraSettings({ jiraUrl: "https://other.example.com", settingsPath }),
      (error) => error instanceof JiraConfigurationError && error.code === "MALFORMED_SETTINGS",
    );
    assert.equal(await readFile(settingsPath, "utf8"), malformed);
  });

  it("does not overwrite settings when JIRA_URL is absent or unsafe", async () => {
    const { settingsPath } = await temporarySettingsPath();
    await configureJiraSettings({ jiraUrl: "https://jira.example.com", settingsPath });
    const original = await readFile(settingsPath, "utf8");

    for (const jiraUrl of [undefined, "https://user:secret@jira.example.com", "https://jira.example.com?q=secret"]) {
      await assert.rejects(configureJiraSettings({ jiraUrl, settingsPath }), JiraConfigurationError);
      assert.equal(await readFile(settingsPath, "utf8"), original);
    }
  });

  it("is idempotent and restores restrictive permissions", async () => {
    const { settingsPath } = await temporarySettingsPath();
    await configureJiraSettings({ jiraUrl: "https://jira.example.com/", settingsPath });
    const first = await readFile(settingsPath, "utf8");
    await chmod(settingsPath, 0o644);

    await configureJiraSettings({ jiraUrl: "https://jira.example.com", settingsPath });

    assert.equal(await readFile(settingsPath, "utf8"), first);
    assert.equal((await stat(settingsPath)).mode & 0o777, 0o600);
  });
});
