import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skipDirs = new Set(["node_modules", "dist", ".git"]);
const uiPackages = new Set([
  "react",
  "react-dom",
  "vue",
  "lit",
  "svelte",
  "preact",
  "solid-js",
]);

const failures = [];

function fail(message) {
  failures.push(message);
  console.error(message);
}

async function walk(dir, acc) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err && err.code === "ENOENT") return acc;
    throw err;
  }
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, acc);
      continue;
    }
    if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".mjs"))) {
      acc.push(full);
    }
  }
  return acc;
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
  });
}

const files = await walk(path.join(root, "packages"), []);
await walk(path.join(root, "scripts"), files);
files.sort();

if (files.length === 0) {
  fail("lint: no JavaScript files found");
}

for (const file of files) {
  const checked = run(process.execPath, ["--check", file]);
  if (checked.status !== 0) {
    const detail = (checked.stderr || checked.stdout || "").trim();
    fail(detail || `node --check failed: ${path.relative(root, file)}`);
  }
}

const noRuntime = [
  "packages/core/package.json",
  "packages/element/package.json",
];

for (const rel of noRuntime) {
  const pkg = JSON.parse(await readFile(path.join(root, rel), "utf8"));
  const deps = pkg.dependencies ?? {};
  if (Object.keys(deps).length > 0) {
    fail(`${rel}: runtime dependencies are forbidden (${Object.keys(deps).join(", ")})`);
  }
  for (const name of Object.keys(pkg.devDependencies ?? {})) {
    const bare = name.startsWith("@") ? name.slice(name.indexOf("/") + 1) : name;
    if (uiPackages.has(name) || uiPackages.has(bare)) {
      fail(`${rel}: UI package ${name} is forbidden`);
    }
  }
}

const generated = "packages/core/src/openapi.d.ts";
const generate = run("pnpm", ["--filter", "@veylqo/core", "generate"]);
if (generate.stdout) process.stdout.write(generate.stdout);
if (generate.stderr) process.stderr.write(generate.stderr);
if (generate.status !== 0) {
  fail("pnpm --filter @veylqo/core generate failed");
} else {
  const diff = run("git", ["diff", "--exit-code", "--", generated]);
  if (diff.status !== 0) {
    if (diff.stdout) process.stdout.write(diff.stdout);
    fail(`${generated} is stale; commit the output of pnpm --filter @veylqo/core generate`);
  }
}

if (failures.length > 0) {
  console.error(`lint: ${failures.length} problem(s)`);
  process.exit(1);
}

console.log(`lint: ${files.length} files checked, openapi types match`);
