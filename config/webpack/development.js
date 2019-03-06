process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const environment = require('./environment');

environment.token_auth_config = {
    apiBase: 'https://localhost:5100'
};

module.exports = environment.toWebpackConfig();
