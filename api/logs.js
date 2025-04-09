// api/logs.js - Serverless API endpoint for Vercel
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// MongoDB connection
let cachedDb = null;

async function connectToDatabase(uri) {
  if (cachedDb) return cachedDb;
  
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  await client.connect();
  const db = client.db('roblox-logger');
  cachedDb = db;
  return db;
}

// Generate hash for API key verification
function generateHash(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

// Verify webhook request is from Discord
function verifyDiscordRequest(req) {
  // For production, implement proper Discord webhook verification
  // This is a simplified version for now
  return true;
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Check for API key on all non-webhook requests
  if (req.method !== 'POST' || !req.headers['x-discord-webhook']) {
    const apiKey = req.headers.authorization?.split('Bearer ')[1];
    const expectedHash = process.env.API_KEY_HASH;
    
    if (!apiKey || generateHash(apiKey, process.env.API_SECRET) !== expectedHash) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  
  try {
    const db = await connectToDatabase(process.env.MONGODB_URI);
    const logsCollection = db.collection('logs');
    
    // GET - Retrieve logs with filtering
    if (req.method === 'GET') {
      const { 
        player, level, source, startDate, endDate, search,
        page = 1, limit = 20, sort = 'time', order = 'desc'
      } = req.query;
      
      // Build query filters
      const query = {};
      if (player && player !== 'all') query.player = player;
      if (level && level !== 'all') query.level = level.toUpperCase();
      if (source) query.source = source;
      
      // Date range filter
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }
      
      // Search filter (in message or source)
      if (search) {
        query.$or = [
          { message: { $regex: search, $options: 'i' } },
          { source: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Get total count for pagination
      const totalCount = await logsCollection.countDocuments(query);
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      
      // Sort direction
      const sortDirection = order === 'asc' ? 1 : -1;
      const sortOption = { [sort]: sortDirection };
      
      // Get player list for filters
      const players = await logsCollection.distinct('player');
      
      // Fetch logs with pagination
      const logs = await logsCollection.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .toArray();
      
      // Return paginated results with metadata
      return res.status(200).json({
        success: true,
        data: logs,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalCount / limitNum)
        },
        filters: {
          players
        }
      });
    }
    
    // POST - Receive logs from Discord webhook or Roblox directly
    else if (req.method === 'POST') {
      // Check if this is coming from Discord webhook
      if (req.headers['x-discord-webhook']) {
        if (!verifyDiscordRequest(req)) {
          return res.status(401).json({ error: 'Unauthorized webhook request' });
        }
        
        // Process webhook - extract file content
        const { attachments } = req.body;
        if (!attachments || attachments.length === 0) {
          return res.status(400).json({ error: 'No log file found' });
        }
        
        // Download and process the log file
        // In a real implementation, you would download the file content
        // and parse it to extract log data
        
        // For simplicity in this example, we'll just mock the response
        return res.status(200).json({ success: true });
      }
      
      // Direct log insertion (bypassing Discord)
      const logData = req.body;
      
      if (!logData.level || !logData.message) {
        return res.status(400).json({ error: 'Invalid log data' });
      }
      
      // Format and insert the log
      const newLog = {
        level: logData.level,
        message: logData.message,
        source: logData.source || 'Unknown',
        player: logData.player || 'Server',
        userId: logData.userId || '',
        timestamp: new Date(),
        context: logData.context || {}
      };
      
      await logsCollection.insertOne(newLog);
      
      return res.status(201).json({ success: true, data: newLog });
    }
    
    // DELETE - Clear logs (with optional filters)
    else if (req.method === 'DELETE') {
      const { player, level, startDate, endDate, all } = req.query;
      
      let query = {};
      
      // Apply filters if not clearing all
      if (all !== 'true') {
        if (player && player !== 'all') query.player = player;
        if (level && level !== 'all') query.level = level.toUpperCase();
        
        // Date range filter
        if (startDate || endDate) {
          query.timestamp = {};
          if (startDate) query.timestamp.$gte = new Date(startDate);
          if (endDate) query.timestamp.$lte = new Date(endDate);
        }
      }
      
      const result = await logsCollection.deleteMany(query);
      
      return res.status(200).json({ 
        success: true, 
        message: `${result.deletedCount} logs deleted`
      });
    }
    
    // Method not supported
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
