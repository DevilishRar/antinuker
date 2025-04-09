// API Route: /api/logs
// Handles GET and POST requests for log entries

import clientPromise from '../../../lib/mongodb';
import { validateLogEntry, createLogEntry, sanitizeLogEntry } from '../../../models/LogEntry';
import apiKeyMiddleware from '../../../middleware/apiKeyAuth';

async function handler(req, res) {
  const { method } = req;
  
  try {
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('console-logs');
    const logsCollection = db.collection('logs');

    // Handle different HTTP methods
    switch (method) {
      // GET: Retrieve logs with filtering options
      case 'GET':
        const {
          player,
          level,
          startDate,
          endDate,
          limit = 100,
          skip = 0,
          search,
        } = req.query;

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

        // Filter by date range
        if (startDate || endDate) {
          query.timestamp = {};
          if (startDate) {
            query.timestamp.$gte = new Date(startDate);
          }
          if (endDate) {
            query.timestamp.$lte = new Date(endDate);
          }
        }

        // Filter by search term (across multiple fields)
        if (search) {
          const searchRegex = new RegExp(search, 'i');
          query.$or = [
            { playerName: searchRegex },
            { message: searchRegex },
            { source: searchRegex },
          ];
        }

        // Get total count for pagination
        const totalCount = await logsCollection.countDocuments(query);

        // Fetch logs with pagination
        const logs = await logsCollection
          .find(query)
          .sort({ timestamp: -1 }) // Newest first
          .skip(parseInt(skip))
          .limit(parseInt(limit))
          .toArray();

        // Return sanitized logs
        const sanitizedLogs = logs.map(sanitizeLogEntry);

        return res.status(200).json({
          success: true,
          data: sanitizedLogs,
          meta: {
            total: totalCount,
            limit: parseInt(limit),
            skip: parseInt(skip),
          },
        });

      // POST: Create a new log entry
      case 'POST':
        // Validate request body
        if (!validateLogEntry(req.body)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid log entry format',
          });
        }

        // Create a standardized log entry
        const logEntry = createLogEntry(req.body);

        // Insert log into database
        const result = await logsCollection.insertOne(logEntry);

        return res.status(201).json({
          success: true,
          data: {
            id: result.insertedId,
            ...logEntry,
          },
        });

      // Default: Method not allowed
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          error: `Method ${method} Not Allowed`,
        });
    }
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
