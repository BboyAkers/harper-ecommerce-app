import js from '@eslint/js';
import globals from 'globals';

export default [
	js.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		rules: {
			'no-unused-vars': 'warn',
			'no-console': 'off',
		},
	},
	{
		// Build output and the generated schema types are not hand-written source.
		ignores: ['node_modules/', 'dist/', 'schemas/types.ts', 'schemas/globalTypes.d.ts'],
	},
];
