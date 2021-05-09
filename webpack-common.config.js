/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    module: {
        rules: [
            {
                test: /\.txt$/i,
                use: 'raw-loader',
            },
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
        alias: {
            'react-dom$': 'react-dom/profiling',
            'scheduler/tracing': 'scheduler/tracing-profiling',
        },
        extensions: ['.ts', '.js', '.tsx'],
        modules: [path.resolve(__dirname, 'node_modules'), path.resolve(__dirname, './src')],
    },
    plugins: [new webpack.optimize.ModuleConcatenationPlugin(), new CleanWebpackPlugin()],
};
