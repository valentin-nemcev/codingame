module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: __dirname + '/tsconfig.json',
        ecmaVersion: 2018,
    },
    env: {
        commonjs: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
        'prettier/standard',
    ],
    plugins: ['@typescript-eslint', 'prettier'],
    rules: {
        'prettier/prettier': 'warn',
        curly: ['error', 'multi-line'],
    },
};
