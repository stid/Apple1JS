const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const MinifyPlugin = require('babel-minify-webpack-plugin');

const commonConfig = {
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        babelrc: true
                    }
                }
            }
        ]
    },
    plugins: [
        new webpack.optimize.ModuleConcatenationPlugin(),
        //new MinifyPlugin(),
        new CleanWebpackPlugin(),
        new webpack.DefinePlugin({
            //'process.env.NODE_ENV': JSON.stringify('production')
        })
    ],
    mode: 'development'
};

const webConfig = {
    entry: './src/index.js',
    target: 'node',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    ...commonConfig
};

const nodeConfig = {
    entry: './src/web.js',
    target: 'web',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build')
    },
    ...commonConfig
};


module.exports = [nodeConfig, webConfig];