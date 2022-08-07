 const path = require('path');
 const HtmlWebpackPlugin = require('html-webpack-plugin');
 const MiniCssExtractPlugin = require("mini-css-extract-plugin");

 module.exports = {
   mode: 'development',
   entry: {
     index: './src/index.js',
   },
   devtool: 'inline-source-map',
   devServer: {
     static: './dist',
   },
   module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(vert|frag|woff)$/i,
        type: 'asset/resource',
      },
    ],
   },
   plugins: [
     new HtmlWebpackPlugin({
       title: 'Development',
     }),

     new MiniCssExtractPlugin(),
   ],
   output: {
     filename: '[name].bundle.js',
     path: path.resolve(__dirname, 'docs'),
     clean: true,
   },
 };