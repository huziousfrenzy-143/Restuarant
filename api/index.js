const app = require('../apps/api/dist/server.js');

module.exports = async (req, res) => {
  try {
    const handler = app.default || app;
    return await handler(req, res);
  } catch (err) {
    console.error('[Vercel Lambda Handler Exception]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          code: 'SERVERLESS_INVOCATION_ERROR',
          message: err?.message || 'Serverless Function Execution Error'
        }
      });
    }
  }
};
