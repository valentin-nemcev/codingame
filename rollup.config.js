import typescript from 'rollup-plugin-typescript2';

export default {
    input: ['src/tron.ts', 'src/benchmark.ts'],
    plugins: [typescript()],
    output: {
        dir: 'target',
        format: 'commonjs',
        sourcemap: false,
    },
};
