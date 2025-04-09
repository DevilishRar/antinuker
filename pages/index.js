import { useEffect } from 'react';
import Head from 'next/head';
import Script from 'next/script';

export default function Home() {
  // Mount client-side script after component renders
  useEffect(() => {
    // Load script after component mounts
    const scriptElement = document.createElement('script');
    scriptElement.src = '/script.js';
    scriptElement.async = true;
    document.body.appendChild(scriptElement);
    
    return () => {
      // Clean up
      if (document.body.contains(scriptElement)) {
        document.body.removeChild(scriptElement);
      }
    };
  }, []);

  return (
    <div>
      <Head>
        <title>Roblox Console Logger</title>
        <meta name="description" content="Real-time logging system for Roblox" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link rel="icon" href="/logo.svg" />
      </Head>

      <div className="app-container">
        <header className="app-header">
          <div className="logo">
            <img src="/logo.svg" alt="Roblox Console Logger" />
            <h1>Roblox Console Logger</h1>
          </div>
          <div className="header-actions">
            <button id="clearLogsBtn" className="btn danger">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              Clear Logs
            </button>
            <button id="refreshBtn" className="btn primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
              Refresh
            </button>
            <div className="user-info">
              <span id="current-user">Not logged in</span>
              <button id="logout-btn" className="btn small secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Logout
              </button>
            </div>
            <div className="theme-toggle">
              <input type="checkbox" id="theme-switch" className="theme-switch" />
              <label htmlFor="theme-switch" className="theme-switch-label">
                <span className="toggle-icon">
                  <svg className="sun-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
                  <svg className="moon-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                </span>
              </label>
            </div>
          </div>
        </header>

        <div className="main-content">
          <div id="notification" className="notification hidden">Notification message</div>

          <div className="filters-section">
            <div className="search-container">
              <input type="text" id="searchInput" placeholder="Search logs by content, player or source..." />
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <div className="filter-options">
              <div className="filter-group">
                <label htmlFor="logLevelFilter">Log Level</label>
                <select id="logLevelFilter">
                  <option value="all">All Levels</option>
                  <option value="INFO">Info Only</option>
                  <option value="WARNING">Warnings Only</option>
                  <option value="ERROR">Errors Only</option>
                  <option value="DEBUG">Debug Only</option>
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="timeFilter">Time Range</label>
                <select id="timeFilter">
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="playerFilter">Player</label>
                <select id="playerFilter">
                  <option value="all">All Players</option>
                  {/* Options will be populated dynamically */}
                </select>
              </div>
            </div>
          </div>

          <div className="logs-container" id="logsContainer">
            {/* Player-based log cards will be displayed here */}
          </div>
        </div>
      </div>
      
      {/* Loading Overlay */}
      <div id="loadingOverlay" className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading logs...</p>
      </div>
    </div>
  );
}
