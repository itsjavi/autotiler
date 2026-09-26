// Cuts a release: pnpm release-version <major|minor|patch|X.Y.Z> [--push] [--dry-run]
//  1. checks that main is clean and up to date with origin, and that the tag is new
//  2. runs pnpm check
//  3. sets the version in package.json (what the builds use), src-tauri/Cargo.toml and src-tauri/Cargo.lock
//  4. turns the "## Unreleased" section of CHANGELOG.md into "## X.Y.Z (date)"
//  5. commits and tags vX.Y.Z; --push also pushes both, and the tag starts the release workflow
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const USAGE = "usage: pnpm release-version <major|minor|patch|X.Y.Z> [--push] [--dry-run]";
const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const push = args.includes("--push");
const dryRun = args.includes("--dry-run");
const bump = args.find((a) => !a.startsWith("--"));

function fail(message: string): never {
  console.error(`release-version: ${message}`);
  process.exit(1);
}

const git = (...a: string[]) => execFileSync("git", a, { cwd: root, encoding: "utf8" }).trim();

/** Runs a command with its output shown; stops the release with `message` if it fails. */
function step(message: string, command: string, ...a: string[]): void {
  try {
    execFileSync(command, a, { cwd: root, stdio: "inherit" });
  } catch {
    fail(message);
  }
}
const read = (path: string) => readFileSync(root + path, "utf8");
const write = (path: string, text: string) => writeFileSync(root + path, text);

// ---- the new version

const current = /"version":\s*"([^"]*)"/.exec(read("package.json"))?.[1] ?? "";
const parts = /^(\d+)\.(\d+)\.(\d+)$/.exec(current)?.slice(1).map(Number);
if (!parts) fail(`package.json has a version this script can't bump: ${current}`);
const [major, minor, patch] = parts;
const version =
  bump === "major"
    ? `${major + 1}.0.0`
    : bump === "minor"
      ? `${major}.${minor + 1}.0`
      : bump === "patch"
        ? `${major}.${minor}.${patch + 1}`
        : (bump ?? "");
if (!/^\d+\.\d+\.\d+$/.test(version)) fail(USAGE);
if (version === current) fail(`the version is already ${current}`);
const tag = `v${version}`;

// ---- preconditions

if (git("rev-parse", "--abbrev-ref", "HEAD") !== "main") fail("releases are cut from main");
if (git("status", "--porcelain")) {
  if (dryRun) console.warn("warning: the working tree has changes (a real run stops here)");
  else fail("the working tree has changes: commit or stash them first");
}
git("fetch", "--quiet", "--tags", "origin", "main");
if (git("rev-list", "--count", "HEAD..origin/main") !== "0") fail("main is behind origin/main: pull first");
if (git("tag", "--list", tag)) fail(`${tag} already exists`);

const changelog = read("CHANGELOG.md");
const unreleased = /^## Unreleased[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(changelog);
if (!unreleased) fail('CHANGELOG.md has no "## Unreleased" section: list the changes under one first');
if (!/^\s*[-*] /m.test(unreleased[1])) fail('the "## Unreleased" section of CHANGELOG.md is empty');

const now = new Date();
const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((n) => String(n).padStart(2, "0")).join("-");
console.log(`Release ${current} → ${version} (${tag}, ${today}) with these changes:\n${unreleased[1].trim()}\n`);
if (dryRun) {
  console.log("Dry run: nothing was changed.");
  process.exit(0);
}

// ---- checks, then the edits

step("pnpm check failed: fix it and run again (nothing was changed)", "pnpm", "check");

function setVersion(path: string, pattern: RegExp): void {
  const text = read(path);
  if (!pattern.test(text)) fail(`no version found in ${path}`);
  write(path, text.replace(pattern, `$1"${version}"`));
}
setVersion("package.json", /("version":\s*)"[^"]*"/);
setVersion("src-tauri/Cargo.toml", /^(version\s*=\s*)"[^"]*"/m);
setVersion("src-tauri/Cargo.lock", /(\[\[package\]\]\nname = "autotiler"\nversion = )"[^"]*"/);
write("CHANGELOG.md", changelog.replace(/^## Unreleased[^\n]*$/m, `## ${version} (${today})`));

// ---- commit, tag and maybe push

git("commit", "--quiet", "--all", "--message", `chore: release ${version}`);
git("tag", "--annotate", tag, "--message", `Autotiler ${version}`);
if (push) {
  step(
    `the push failed: the commit and ${tag} are ready locally, push them with git push --atomic origin main ${tag}`,
    "git",
    "push",
    "--atomic",
    "origin",
    "main",
    tag,
  );
  console.log(`\nPushed ${tag}. The release workflow builds a draft release: review it, then publish it.`);
} else {
  console.log(`\nCommitted and tagged ${tag}. To start the release workflow:\n  git push --atomic origin main ${tag}`);
}
