let app;

module.exports = async (req, res) => {
  try {
    if (!app) {
      const loaded = require('../dist/server.js');
      app = loaded.default || loaded;
    }
    return await app(req, res);
  } catch (err) {
    console.error('[Vercel Serverless Function Execution Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          code: 'SERVERLESS_FUNCTION_ERROR',
          message: err?.message || 'Serverless Function Execution Error',
          details: String(err)
        }
      });
    }
  }
};
