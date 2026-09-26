// Sets the app version everywhere it's recorded: package.json (the source of truth for the builds),
// src-tauri/Cargo.toml and src-tauri/Cargo.lock. Usage: node scripts/set-version.ts 2.0.2
import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2] ?? "";
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(version)) {
  console.error("usage: node scripts/set-version.ts <major.minor.patch>");
  process.exit(1);
}

const root = new URL("../", import.meta.url);
function update(path: string, pattern: RegExp): void {
  const file = new URL(path, root);
  const text = readFileSync(file, "utf8");
  if (!pattern.test(text)) throw new Error(`no version found in ${path}`);
  writeFileSync(file, text.replace(pattern, `$1"${version}"`));
}

update("package.json", /("version":\s*)"[^"]*"/);
update("src-tauri/Cargo.toml", /^(version\s*=\s*)"[^"]*"/m);
update("src-tauri/Cargo.lock", /(\[\[package\]\]\nname = "autotiler"\nversion = )"[^"]*"/);
console.log(`Version set to ${version}. Next: update CHANGELOG.md, commit, then tag v${version}.`);
