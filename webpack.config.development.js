// eslint-disable-next-line
const productionConfig = require('./webpack.config.production.js')

module.exports = {
	...productionConfig,
	mode: 'development',
	watchOptions: {
    poll: 1000, // fallback for broken fs watching
    ignored: /node_modules/,
  }
}
