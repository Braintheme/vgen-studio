// Fails `npm install` / `yarn` / `bun install`: this monorepo is pnpm-only
// (workspace catalogs, supportedArchitectures and the lockfile are pnpm features).
const agent = process.env.npm_config_user_agent ?? '';

if (!agent.startsWith('pnpm/')) {
  console.error('\nThis repository uses pnpm. Run `make install` (or `pnpm install`).\n');
  process.exit(1);
}
