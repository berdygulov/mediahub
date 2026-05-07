const controlStatements = ['if', 'return', 'for', 'while', 'do', 'switch', 'try', 'throw'];

const paddingAroundControl = controlStatements.flatMap((stmt) => [
    { blankLine: 'always', prev: '*', next: stmt },
    { blankLine: 'always', prev: stmt, next: '*' },
]);

/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
    },
    plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import', '@stylistic'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
        'plugin:react-hooks/recommended',
        'prettier',
    ],
    rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'react/no-unescaped-entities': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/consistent-type-imports': [
            'error',
            { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
        ],
        'import/order': [
            'error',
            {
                groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                alphabetize: { order: 'asc', caseInsensitive: true },
            },
        ],
        'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
        '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],
        '@stylistic/padding-line-between-statements': ['error', ...paddingAroundControl],
        curly: ['error', 'all'],
    },
    settings: {
        react: { version: 'detect' },
        'import/resolver': {
            typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
            node: true,
        },
    },
    ignorePatterns: [
        'vendor',
        'node_modules',
        'public',
        'bootstrap/ssr',
        'tailwind.config.js',
        'vite.config.ts',
        'resources/js/actions/**',
        'resources/js/components/ui/*',
        'resources/js/routes/**',
        'resources/js/wayfinder/**',
    ],
};
