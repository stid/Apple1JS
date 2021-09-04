/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const common = require('./webpack-common.config.js');
const { merge } = require('webpack-merge');

module.exports = merge(common, {
    devtool: 'source-map',
    entry: { bundle: './src/index-web', 'Apple.worker': './src/apple1/Apple.worker' },
    target: 'web',
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'public'),
    },
    devServer: {
        static: './public/',
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/index.html',
            favicon: 'src/assets/favicon.ico',
            excludeChunks: ['Apple.worker'],
        }),
    ],
});
