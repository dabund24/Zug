const path = require("path")
const CompressionPlugin = require("compression-webpack-plugin")
const BrotliPlugin = require("brotli-webpack-plugin")

module.exports = {
    entry: "./src/public/ts/main.ts",
    mode: "production",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                include: [path.resolve(__dirname, "src/public/ts")]
            }
        ]
    },
    plugins: [
        new CompressionPlugin({
            algorithm: "gzip",
            test: /\.(js|css|html|json|ico|svg|xml|txt|eot|otf|ttf|map)$/,
            threshold: 10240,
            minRatio: 0.8
        }),
        new BrotliPlugin({
            test: /\.(js|css|html|json|ico|svg|xml|txt|eot|otf|ttf|map)$/,
            threshold: 10240,
            minRatio: 0.8
        })
    ],
    resolve: {
        extensions: [".ts", ".js"]
    },
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "dist/public")
    }
}