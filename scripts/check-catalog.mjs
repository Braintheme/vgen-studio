// Fails when a workspace package pins a version outside the pnpm catalog, or when the
// lockfile resolves a catalog-critical package to more than one version.
// Runs in `make lint`. Usage: node scripts/check-catalog.mjs
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const WORKSPACE_DIRS = ['apps', 'packages', 'packages/engines', 'tools'];
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const ALLOWED = /^(catalog:|workspace:)/;
/** Packages that must resolve to exactly one version (Remotion demands an exact zod). */
const SINGLE_VERSION = /^(zod|remotion|@remotion\/[^@]+|react|react-dom)$/;

const problems = [];

/** Minimal reader for the flat `catalog:` map of pnpm-workspace.yaml. */
const readCatalog = () => {
  const lines = readFileSync(path.join(ROOT, 'pnpm-workspace.yaml'), 'utf8').split('\n');
  const catalog = new Map();
  let inside = false;
  for (const line of lines) {
    if (/^catalog:\s*$/.test(line)) {
      inside = true;
      continue;
    }
    if (inside && /^\S/.test(line)) break;
    const match = /^ {2}'?([^':#\s]+(?:\/[^':#\s]+)?)'?:\s*([^\s#]+)/.exec(line);
    if (inside && match) catalog.set(match[1], match[2]);
  }
  return catalog;
};

const packageJsonFiles = () => {
  const files = [path.join(ROOT, 'package.json')];
  for (const dir of WORKSPACE_DIRS) {
    const absolute = path.join(ROOT, dir);
    if (!existsSync(absolute)) continue;
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const file = path.join(absolute, entry.name, 'package.json');
      if (entry.isDirectory() && existsSync(file)) files.push(file);
    }
  }
  return files;
};

const catalog = readCatalog();

// pnpm rewrites pnpm-workspace.yaml on `pnpm add` and drops comments; this one must stay.
const ZOD_NOTE = 'Upgrade remotion/@remotion/* and zod TOGETHER';
if (!readFileSync(path.join(ROOT, 'pnpm-workspace.yaml'), 'utf8').includes(ZOD_NOTE)) {
  problems.push(
    'pnpm-workspace.yaml lost its comments (pnpm rewrote it): restore the Remotion/zod note next to zod',
  );
}

for (const file of packageJsonFiles()) {
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  for (const field of DEPENDENCY_FIELDS) {
    for (const [name, spec] of Object.entries(manifest[field] ?? {})) {
      if (!ALLOWED.test(spec)) {
        problems.push(
          `${path.relative(ROOT, file)}: ${field}.${name} is "${spec}" — use "catalog:" (add the version to pnpm-workspace.yaml)`,
        );
      } else if (spec === 'catalog:' && !catalog.has(name)) {
        problems.push(
          `${path.relative(ROOT, file)}: ${name} uses "catalog:" but is missing from the catalog`,
        );
      }
    }
  }
}

const lockfile = readFileSync(path.join(ROOT, 'pnpm-lock.yaml'), 'utf8');
const packagesSection = lockfile.slice(lockfile.indexOf('\npackages:\n'), lockfile.indexOf('\nsnapshots:\n'));
const resolved = new Map();
for (const match of packagesSection.matchAll(/^ {2}'?((?:@[^/@\s]+\/)?[^@\s']+)@([^(:'\s]+)/gm)) {
  const [, name, version] = match;
  if (!SINGLE_VERSION.test(name)) continue;
  resolved.set(name, new Set([...(resolved.get(name) ?? []), version]));
}
for (const [name, versions] of resolved) {
  const expected = catalog.get(name);
  if (versions.size > 1 || (expected && !versions.has(expected))) {
    problems.push(
      `pnpm-lock.yaml resolves ${name} to ${[...versions].join(', ')}; the catalog says ${expected ?? '(not in catalog)'}`,
    );
  }
}

if (problems.length > 0) {
  console.error(`Catalog check failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Catalog check passed (${catalog.size} catalog entries).`);
