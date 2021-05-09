/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const common = require('./webpack-common.config.js');
const { merge } = require('webpack-merge');

module.exports = merge(common, {
    entry: './src/index',
    target: 'node',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
});
