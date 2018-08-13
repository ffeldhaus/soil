/*module.exports = {
  test: /\.(ts|tsx)?(\.erb)?$/,
  use: [{
    loader: 'ts-loader'
  }]
}*/
module.exports = {
    test: /\.(ts|tsx)?(\.erb)?$/,
    use: [{
        loader: 'ng-router-loader',
        options: {
            /* ng-router-loader options */
            loader: 'async-import',
            genDir: 'compiled'
        }
    }, {
        loader: 'ts-loader'
    }]
};