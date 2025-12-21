import typescript from '@rollup/plugin-typescript';
const config = [
    {
        input: 'src/index.ts',
        output: {
            dir: 'dist',
            format: 'esm',
            sourcemap: true,
        },
        plugins: [
            typescript({
                declaration: true,
            }),
        ],
    }
];

export default config;