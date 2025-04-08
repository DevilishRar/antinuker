import { useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  useEffect(() => {
    // Load your original scripts after component mounts
    const script = document.createElement('script');
    script.src = '/script.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div>
      <Head>
        <title>Roblox Console Logs</title>
        <meta name="description" content="Real-time logging system for Roblox" />
        <link rel="stylesheet" href="/styles.css" />
      </Head>

      <div className="container">
        <header>
          <h1>Roblox Console Logs</h1>
          <div className="controls">
            <select id="logLevelFilter">
              <option value="all">All Levels</option>
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="ERROR">Error</option>
              <option value="DEBUG">Debug</option>
            </select>
            <select id="timeFilter">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            <select id="playerFilter">
              <option value="all">All Players</option>
            </select>
            <input type="text" id="searchInput" placeholder="Search logs..." />
            <button id="clearLogsBtn">Clear Logs</button>
          </div>
        </header>
        
        <main>
          <div id="logsContainer"></div>
          <div id="emptyState" className="hidden">No logs found</div>
        </main>
        
        <div id="loadingOverlay" className="hidden">
          <div className="spinner"></div>
          <p>Loading logs...</p>
        </div>
        
        <div id="notification" className="hidden"></div>
      </div>
    </div>
  );
}
