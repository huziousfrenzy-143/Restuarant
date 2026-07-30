const app = require('../apps/api/dist/server.js');

module.exports = (req, res) => {
  const handler = app.default || app;
  return handler(req, res);
};
