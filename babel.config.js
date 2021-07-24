module.exports = function (api) {
    api.cache(true);

    const presets = [
        [
            '@babel/preset-env',
            {
                bugfixes: true,
                shippedProposals: true,
                useBuiltIns: 'usage',
                corejs: '3.14.0',
                targets: { edge: '89', chrome: '89', node: '14' },
            },
        ],
        '@babel/typescript',
        ['@babel/preset-react', { runtime: 'automatic' }],
    ];

    const plugins = [
        [
            require.resolve('babel-plugin-module-resolver'),
            {
                root: ['./src'],
                alias: {
                    core: './src/core',
                },
            },
        ],
        '@babel/transform-async-to-generator',
        [
            '@babel/transform-runtime',
            {
                regenerator: true,
                corejs: 3,
            },
        ],
        [
            'babel-plugin-inline-import',
            {
                extensions: ['.o'],
            },
        ],
    ];

    return {
        presets,
        plugins,
    };
};
