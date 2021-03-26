const path = require('path'); // eslint-disable-line @typescript-eslint/no-var-requires
const commonConfig = require('./webpack-common.config.js'); // eslint-disable-line @typescript-eslint/no-var-requires

const nodeConfig = {
    entry: './src/index',
    target: 'node',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    ...commonConfig,
};

module.exports = [nodeConfig];
