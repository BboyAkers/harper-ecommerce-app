/**
 * Prettier's defaults do not describe this codebase.
 *
 * Without a config, Prettier assumes 2-space indentation and an 80-column width,
 * while every file here is tab-indented and wraps around 120. The result was that
 * `prettier --check` failed on all 38 source files and the `npm run format`
 * script in package.json would have reindented the entire repository from tabs to
 * spaces — a whole-tree diff triggered by running a documented command.
 *
 * These values were derived from the existing files rather than chosen, so the
 * config describes the code that is already here instead of proposing a new
 * style. Only `useTabs`, `printWidth` and `singleQuote` differ from Prettier's
 * defaults; the rest are defaults, listed because a formatter config that omits
 * them makes readers go look them up.
 */
export default {
	// The whole codebase indents with tabs.
	useTabs: true,
	tabWidth: 2,

	// Measured against the source: only 28 of ~5,000 lines exceed 120, and those
	// are unbreakable className strings. 110 or 130 both fit the code worse.
	printWidth: 120,

	// Single quotes in TS/JS, double quotes in JSX attributes — both as written.
	singleQuote: true,
	jsxSingleQuote: false,

	semi: true,
	trailingComma: 'all',
	bracketSpacing: true,
	arrowParens: 'always',
};
