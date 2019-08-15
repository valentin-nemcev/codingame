module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2018
    },
    env: {
        commonjs: true,
        node: true
    },
    extends: [
        "standard",
        "plugin:@typescript-eslint/standard",
        "plugin:@typescript-eslint/recommended"
    ],
    plugins: ['@typescript-eslint'],
    rules: {
    }
}
