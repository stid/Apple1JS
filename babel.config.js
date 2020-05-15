module.exports = function(api) {
    api.cache(true);

    const presets = [
        ['@babel/preset-env', { useBuiltIns: 'usage', corejs: 3, targets: { chrome: '76', node: '12' } }],
        '@babel/typescript',
        '@babel/preset-react',
    ];

    const plugins = [
        [
            'babel-plugin-styled-components',
            {
                pure: true,
            },
        ],
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
        chrome: '58',
        ie: '11',
    };

    return {
        presets,
        plugins,
    };
};
