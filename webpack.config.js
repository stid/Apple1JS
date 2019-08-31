const path = require('path');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MinifyPlugin = require('babel-minify-webpack-plugin');

const commonConfig = {
    module: {
        rules: [
            {
                test: /\.(ts|js)x?$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        babelrc: true,
                    },
                },
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        modules: [path.resolve(__dirname, 'node_modules'), path.resolve(__dirname, './src')],
    },
    plugins: [
        new webpack.optimize.ModuleConcatenationPlugin(),
        new MinifyPlugin(),
        new CleanWebpackPlugin(),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production'),
        }),
    ],
    mode: 'production',
};

const nodeConfig = {
    entry: './src/index',
    target: 'node',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    ...commonConfig,
};

const webConfig = {
    entry: './src/index-web',
    target: 'web',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist-web'),
    },
    ...commonConfig,
};

module.exports = [nodeConfig, webConfig];
