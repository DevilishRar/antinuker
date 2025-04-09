// Log Entry model and schema definition
// This helps standardize the log structure in MongoDB

/**
 * Log Entry Schema:
 * - playerName: Name of the player who generated the log
 * - logLevel: The severity level (INFO, WARNING, ERROR, DEBUG)
 * - message: The actual log message content
 * - source: Where the log originated from (client/server, script name)
 * - timestamp: When the log was created
 * - contextData: Additional information about the log (game info, device info, etc.)
 */

export const LogLevels = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
};

export function validateLogEntry(entry) {
  // Required fields
  if (!entry.playerName || !entry.logLevel || !entry.message) {
    return false;
  }

  // Validate log level
  if (!Object.values(LogLevels).includes(entry.logLevel)) {
    return false;
  }

  return true;
}

export function createLogEntry(data) {
  return {
    playerName: data.playerName || 'Unknown Player',
    logLevel: data.logLevel || LogLevels.INFO,
    message: data.message || '',
    source: data.source || 'Unknown Source',
    timestamp: data.timestamp || new Date(),
    contextData: data.contextData || {},
    createdAt: new Date(),
  };
}

export function sanitizeLogEntry(entry) {
  // Ensure no sensitive information is returned
  return {
    id: entry._id,
    playerName: entry.playerName,
    logLevel: entry.logLevel,
    message: entry.message,
    source: entry.source,
    timestamp: entry.timestamp,
    contextData: entry.contextData,
    createdAt: entry.createdAt,
  };
}
