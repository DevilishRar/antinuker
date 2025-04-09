import { MongoClient } from 'mongodb';

// MongoDB connection
const uri = process.env.MONGODB_URI;
const apiKey = process.env.API_KEY;

// Basic API key verification
const verifyApiKey = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const providedKey = authHeader.split(' ')[1];
  return providedKey === apiKey;
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Verify API key for non-GET requests
  if (req.method !== 'GET') {
    const authHeader = req.headers.authorization;
    if (!verifyApiKey(authHeader)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  
  // Connect to MongoDB
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const database = client.db('roblox-logger');
    const logsCollection = database.collection('logs');
    
    // GET - Retrieve logs
    if (req.method === 'GET') {
      const { level, player, timeframe, search, limit = 100, page = 1 } = req.query;
      const skip = (page - 1) * parseInt(limit);
      
      // Build query
      const query = {};
      
      if (level && level !== 'all') {
        query.level = level;
      }
      
      if (player && player !== 'all') {
        query.player = player;
      }
      
      if (timeframe && timeframe !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (timeframe) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'yesterday':
            startDate = new Date(now.setDate(now.getDate() - 1));
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setDate(now.getDate() - 30));
            break;
        }
        
        if (startDate) {
          query.timestamp = { $gte: Math.floor(startDate.getTime() / 1000) };
        }
      }
      
      if (search) {
        query.$or = [
          { message: { $regex: search, $options: 'i' } },
          { player: { $regex: search, $options: 'i' } },
          { source: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Get distinct players for the player filter
      const players = await logsCollection.distinct('player');
      
      // Execute query
      const logs = await logsCollection.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();
      
      const total = await logsCollection.countDocuments(query);
      
      return res.status(200).json({
        logs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        },
        players
      });
    }
    
    // POST - Add new log
    if (req.method === 'POST') {
      const log = req.body;
      
      // Validate log data
      if (!log.level || !log.message) {
        return res.status(400).json({ error: 'Log must have a level and message' });
      }
      
      // Ensure timestamp is present
      if (!log.timestamp) {
        log.timestamp = Math.floor(Date.now() / 1000);
      }
      
      // Insert log
      const result = await logsCollection.insertOne(log);
      
      return res.status(201).json({
        id: result.insertedId,
        message: 'Log created successfully'
      });
    }
    
    // DELETE - Remove logs
    if (req.method === 'DELETE') {
      const { level, player, timeframe, search } = req.body;
      
      // Build query - similar to GET
      const query = {};
      
      if (level && level !== 'all') {
        query.level = level;
      }
      
      if (player && player !== 'all') {
        query.player = player;
      }
      
      if (timeframe && timeframe !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (timeframe) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'yesterday':
            startDate = new Date(now.setDate(now.getDate() - 1));
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setDate(now.getDate() - 30));
            break;
        }
        
        if (startDate) {
          query.timestamp = { $gte: Math.floor(startDate.getTime() / 1000) };
        }
      }
      
      if (search) {
        query.$or = [
          { message: { $regex: search, $options: 'i' } },
          { player: { $regex: search, $options: 'i' } },
          { source: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Execute delete
      const result = await logsCollection.deleteMany(query);
      
      return res.status(200).json({
        deleted: result.deletedCount,
        message: `${result.deletedCount} logs deleted successfully`
      });
    }
    
    // Unsupported method
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.close();
  }
}
