module.exports = function (api) {
    api.cache(true);

    const presets = [
        ['@babel/preset-env', {useBuiltIns: 'usage', corejs: 3}],
        '@babel/typescript'
    ];

    const plugins = [
        '@babel/transform-async-to-generator',
        ['@babel/transform-runtime', {
            regenerator: true,
            corejs: 3,
        }],
        ['babel-plugin-inline-import', {
            'extensions': ['.o']
        }]
    ];

    return {
        presets,
        plugins
    };
};
