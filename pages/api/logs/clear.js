// API Route: /api/logs/clear
// Handles DELETE requests to clear log entries with filtering options

import clientPromise from '../../../lib/mongodb';
import apiKeyMiddleware from '../../../middleware/apiKeyAuth';

async function handler(req, res) {
  const { method } = req;
  
  // Only allow DELETE requests
  if (method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({
      success: false,
      error: `Method ${method} Not Allowed`,
    });
  }

  try {
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('console-logs');
    const logsCollection = db.collection('logs');

    // Get filter parameters
    const { player, level, before } = req.query;
    
    // Build query filters
    const query = {};
    
    // Filter by player name
    if (player && player !== 'all') {
      query.playerName = player;
    }
    
    // Filter by log level
    if (level && level !== 'all') {
      query.logLevel = level;
    }

    // Filter by date (logs before a certain date)
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    // Delete logs that match the query
    const result = await logsCollection.deleteMany(query);

    return res.status(200).json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
}

// Wrap handler with API key middleware
export default apiKeyMiddleware(handler);
