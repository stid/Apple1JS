module.exports = function (api) {
    api.cache(true);

    const presets = [
        ['@babel/preset-env', { useBuiltIns: 'usage', corejs: 3, targets: { chrome: '89', node: '14' } }],
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

    const targets = {
        chrome: '89',
        ie: '11',
    };

    return {
        presets,
        plugins,
    };
};
