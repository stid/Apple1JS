const path = require('path'); // eslint-disable-line @typescript-eslint/no-var-requires
const commonConfig = require('./webpack-common.config.js'); // eslint-disable-line @typescript-eslint/no-var-requires
const TerserPlugin = require('terser-webpack-plugin'); // eslint-disable-line @typescript-eslint/no-var-requires
const HtmlWebpackPlugin = require('html-webpack-plugin'); // eslint-disable-line @typescript-eslint/no-var-requires

commonConfig.plugins.push(
    new HtmlWebpackPlugin({
        template: 'src/index.html',
        favicon: 'src/assets/favicon.ico',
        excludeChunks: ['Apple.worker'],
    }),
);

const webConfig = {
    devtool: 'source-map',
    entry: { bundle: './src/index-web', 'Apple.worker': './src/apple1/Apple.worker' },
    target: 'web',
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'public'),
    },
    optimization: {
        minimizer: [new TerserPlugin()],
    },
    devServer: {
        //publicPath: '/js/',
        contentBase: './public/',
    },
    ...commonConfig,
};

module.exports = [webConfig];
