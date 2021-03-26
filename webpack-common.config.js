const path = require('path'); // eslint-disable-line @typescript-eslint/no-var-requires
const webpack = require('webpack'); // eslint-disable-line @typescript-eslint/no-var-requires
const { CleanWebpackPlugin } = require('clean-webpack-plugin'); // eslint-disable-line @typescript-eslint/no-var-requires
const MinifyPlugin = require('babel-minify-webpack-plugin'); // eslint-disable-line @typescript-eslint/no-var-requires

const MODE = 'production';

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
        alias: {
            'react-dom$': 'react-dom/profiling',
            'scheduler/tracing': 'scheduler/tracing-profiling',
        },
        extensions: ['.ts', '.js', '.tsx'],
        modules: [path.resolve(__dirname, 'node_modules'), path.resolve(__dirname, './src')],
    },
    plugins: [
        new webpack.optimize.ModuleConcatenationPlugin(),
        new MinifyPlugin(),
        new CleanWebpackPlugin(),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(MODE),
        }),
    ],
    mode: MODE,
};

module.exports = commonConfig;
