// API Key authentication middleware
// This ensures only authorized requests can access the API

/**
 * Middleware to validate API key against the one stored in environment variables
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 * @param {Function} next - Function to call next middleware
 * @returns {Object|void} Returns error response or continues to next middleware
 */
export function validateApiKey(req, res, next) {
  // Get API key from request headers
  const authHeader = req.headers.authorization || '';
  const apiKey = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : '';

  // Get the configured API key
  const validApiKey = process.env.API_KEY;

  // If no API key is configured, return error
  if (!validApiKey) {
    console.error('API key not configured on server');
    return res.status(500).json({
      error: 'Server configuration error',
    });
  }

  // If API key doesn't match, return unauthorized
  if (apiKey !== validApiKey) {
    return res.status(401).json({
      error: 'Unauthorized - Invalid API key',
    });
  }

  // API key is valid, continue to the next middleware or handler
  return next();
}

// Export as middleware function for API routes
export default function apiKeyMiddleware(handler) {
  return (req, res) => {
    return validateApiKey(req, res, () => handler(req, res));
  };
}
