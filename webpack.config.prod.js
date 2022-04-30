/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const common = require('./webpack-common.config.js');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { merge } = require('webpack-merge');

module.exports = merge(common, {
    mode: 'production',
    entry: { bundle: './src/index-web', 'Apple.worker': './src/apple1/Apple.worker' },
    target: 'web',
    output: {
        filename: (pathData) => {
            return pathData.chunk.name === 'Apple.worker' ? '[name].js' : '[name].[contenthash].js';
        },
        path: path.resolve(__dirname, 'public'),
    },
    optimization: {
        minimizer: [new TerserPlugin()],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/index.html',
            favicon: 'src/assets/favicon.ico',
            excludeChunks: ['Apple.worker'],
        }),
    ],
});
