// API Route: /api/logs/player
// Handles GET requests for player-specific logs and statistics

import clientPromise from '../../../lib/mongodb';
import { sanitizeLogEntry } from '../../../models/LogEntry';
import apiKeyMiddleware from '../../../middleware/apiKeyAuth';

async function handler(req, res) {
  const { method } = req;
  
  // Only allow GET requests
  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
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

    // Get player statistics (group by player)
    const playerStats = await logsCollection.aggregate([
      {
        $group: {
          _id: '$playerName',
          count: { $sum: 1 },
          lastLog: { $max: '$timestamp' },
          infoCount: {
            $sum: {
              $cond: [{ $eq: ['$logLevel', 'INFO'] }, 1, 0]
            }
          },
          warningCount: {
            $sum: {
              $cond: [{ $eq: ['$logLevel', 'WARNING'] }, 1, 0]
            }
          },
          errorCount: {
            $sum: {
              $cond: [{ $eq: ['$logLevel', 'ERROR'] }, 1, 0]
            }
          },
          debugCount: {
            $sum: {
              $cond: [{ $eq: ['$logLevel', 'DEBUG'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          playerName: '$_id',
          logCount: '$count',
          lastActivity: '$lastLog',
          logTypes: {
            info: '$infoCount',
            warning: '$warningCount',
            error: '$errorCount',
            debug: '$debugCount'
          }
        }
      },
      {
        $sort: { lastActivity: -1 }
      }
    ]).toArray();
    
    // For each player, get their most recent log as a preview
    const enhancedPlayerStats = await Promise.all(
      playerStats.map(async (player) => {
        const latestLog = await logsCollection
          .find({ playerName: player.playerName })
          .sort({ timestamp: -1 })
          .limit(1)
          .toArray();
          
        return {
          ...player,
          previewLog: latestLog.length > 0 ? sanitizeLogEntry(latestLog[0]) : null
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: enhancedPlayerStats
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
