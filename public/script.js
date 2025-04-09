// Roblox Console Logger - Dashboard Script
// Configuration
const API_URL = '/api/logs';
const API_KEY = '52ced539d303eae9648e04a3ffd48e956d88c2371b94d42458fd2414feba3961';

// Whitelist for authorized users
const AUTHORIZED_USERS = ['Junya52@', 'Lunar52@', 'DevilishRak52@'];
let currentUser = null;

// DOM elements
document.addEventListener('DOMContentLoaded', function() {
    // Theme preferences
    setupTheme();
    
    // Authentication check
    if (!checkAuthentication()) {
        showLoginPrompt();
    } else {
        initializeApp();
    }
});

// Authentication functions
function checkAuthentication() {
    currentUser = localStorage.getItem('console-username');
    return currentUser && AUTHORIZED_USERS.includes(currentUser);
}

function showLoginPrompt() {
    document.querySelector('.app-container').style.display = 'none';
    
    const loginContainer = document.createElement('div');
    loginContainer.className = 'login-container';
    loginContainer.innerHTML = `
        <div class="login-box">
            <h2>Authentication Required</h2>
            <p>Please enter your username to access the logs</p>
            <div class="login-form">
                <input type="text" id="username" placeholder="Username">
                <button id="login-btn" class="btn primary">Login</button>
            </div>
            <p class="login-error" style="display: none; color: red">Access denied. You are not authorized.</p>
        </div>
    `;
    
    document.body.appendChild(loginContainer);
    
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('username').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
}

function handleLogin() {
    const username = document.getElementById('username').value.trim();
    
    if (AUTHORIZED_USERS.includes(username)) {
        localStorage.setItem('console-username', username);
        currentUser = username;
        document.querySelector('.login-container').remove();
        document.querySelector('.app-container').style.display = 'flex';
        initializeApp();
    } else {
        document.querySelector('.login-error').style.display = 'block';
    }
}

// Core app functionality
function initializeApp() {
    const logsContainer = document.getElementById('logsContainer');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const notificationEl = document.getElementById('notification');
    const searchInput = document.getElementById('searchInput');
    const logLevelFilter = document.getElementById('logLevelFilter');
    const timeFilter = document.getElementById('timeFilter');
    const playerFilter = document.getElementById('playerFilter');
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    
    // State
    let playerLogs = {}; // Logs organized by player
    let allPlayers = []; // List of all players
    
    // Initialize with data
    fetchLogs();
    
    // Set up event listeners
    refreshBtn.addEventListener('click', fetchLogs);
    clearLogsBtn.addEventListener('click', confirmClearLogs);
    searchInput.addEventListener('input', debounce(applyFilters, 300));
    logLevelFilter.addEventListener('change', applyFilters);
    timeFilter.addEventListener('change', applyFilters);
    playerFilter.addEventListener('change', applyFilters);
    
    // Fetch logs from API
    async function fetchLogs() {
        showLoading(true);
        
        try {
            // Build query params
            const params = {
                limit: 1000 // Get a large number to organize by player
            };
            
            // Add filters if they're set
            if (logLevelFilter.value !== 'all') params.level = logLevelFilter.value;
            if (timeFilter.value !== 'all') params.timeframe = timeFilter.value;
            if (playerFilter.value !== 'all') params.player = playerFilter.value;
            if (searchInput.value.trim()) params.search = searchInput.value.trim();
            
            // API call
            const response = await fetch(`${API_URL}?${new URLSearchParams(params)}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch logs');
            }
            
            const data = await response.json();
            
            // Process the data
            processLogData(data);
            
            // Show success notification
            showNotification('Logs refreshed successfully', 'success');
            
        } catch (error) {
            console.error('Error fetching logs:', error);
            showNotification('Failed to fetch logs: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }
    
    // Process and organize log data by player
    function processLogData(data) {
        const logs = data.logs || [];
        
        // Reset data
        playerLogs = {};
        
        // Organize logs by player
        logs.forEach(log => {
            const player = log.player || 'Server';
            
            if (!playerLogs[player]) {
                playerLogs[player] = [];
            }
            
            playerLogs[player].push(log);
        });
        
        // Update player filter
        updatePlayerFilter(data.players || Object.keys(playerLogs));
        
        // Display the logs
        displayLogsByPlayer();
    }
    
    // Update player filter dropdown
    function updatePlayerFilter(players) {
        allPlayers = players;
        
        // Clear existing options except "All"
        while (playerFilter.options.length > 1) {
            playerFilter.remove(1);
        }
        
        // Add player options
        players.sort().forEach(player => {
            const option = document.createElement('option');
            option.value = player;
            option.textContent = player;
            playerFilter.appendChild(option);
        });
    }
    
    // Display logs organized by player
    function displayLogsByPlayer() {
        logsContainer.innerHTML = '';
        
        // Check if we have any logs
        if (Object.keys(playerLogs).length === 0) {
            showEmptyState();
            return;
        }
        
        // Create sorted list of players (Server always first)
        const sortedPlayers = Object.keys(playerLogs).sort((a, b) => {
            if (a === 'Server') return -1;
            if (b === 'Server') return 1;
            return a.localeCompare(b);
        });
        
        // Create player cards
        sortedPlayers.forEach(player => {
            const logs = playerLogs[player];
            if (!logs || logs.length === 0) return;
            
            // Create the player card
            const card = createPlayerCard(player, logs);
            logsContainer.appendChild(card);
        });
    }
    
    // Create a card for a player's logs
    function createPlayerCard(player, logs) {
        const card = document.createElement('div');
        card.className = 'player-card';
        
        // Count logs by level
        const counts = {
            INFO: 0,
            WARNING: 0,
            ERROR: 0,
            DEBUG: 0
        };
        
        logs.forEach(log => {
            if (counts[log.level] !== undefined) {
                counts[log.level]++;
            }
        });
        
        // Sort logs by timestamp (newest first)
        const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);
        const latestLog = sortedLogs[0];
        const latestTime = new Date(latestLog.timestamp * 1000).toLocaleString();
        
        // Create card content
        card.innerHTML = `
            <div class="card-header">
                <h3>${player}</h3>
                <span class="log-count">${logs.length} logs</span>
            </div>
            <div class="card-meta">
                <span class="latest-time">Latest: ${latestTime}</span>
                <div class="log-types">
                    <span class="info-count">${counts.INFO} Info</span>
                    <span class="warning-count">${counts.WARNING} Warn</span>
                    <span class="error-count">${counts.ERROR} Error</span>
                    <span class="debug-count">${counts.DEBUG} Debug</span>
                </div>
            </div>
            <div class="card-preview">
                <p>${latestLog.message.substring(0, 100)}${latestLog.message.length > 100 ? '...' : ''}</p>
            </div>
            <div class="card-actions">
                <button class="btn secondary view-logs-btn">View Details</button>
                <button class="btn primary download-logs-btn">Download Logs</button>
            </div>
        `;
        
        // Add event listeners
        card.querySelector('.view-logs-btn').addEventListener('click', () => showPlayerLogDetails(player, logs));
        card.querySelector('.download-logs-btn').addEventListener('click', () => downloadPlayerLogs(player, logs));
        
        return card;
    }
    
    // Show player log details modal
    function showPlayerLogDetails(player, logs) {
        // Create modal structure
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'playerLogModal';
        
        // Sort logs by timestamp (newest first)
        const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);
        
        let logItems = '';
        sortedLogs.forEach(log => {
            const time = new Date(log.timestamp * 1000).toLocaleString();
            logItems += `
                <div class="log-item ${log.level.toLowerCase()}">
                    <div class="log-item-header">
                        <span class="log-level">${log.level}</span>
                        <span class="log-time">${time}</span>
                        <span class="log-source">${log.source || 'Unknown'}</span>
                    </div>
                    <div class="log-message">${log.message}</div>
                    <button class="btn small secondary dig-deeper-btn">Dig Deeper</button>
                </div>
            `;
        });
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Logs for ${player}</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="log-items">
                        ${logItems || '<p class="empty-text">No logs found</p>'}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn primary download-logs-btn">Download All Logs</button>
                    <button class="btn secondary close-btn">Close</button>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('.download-logs-btn').addEventListener('click', () => {
            downloadPlayerLogs(player, logs);
        });
        
        // Add dig deeper functionality
        modal.querySelectorAll('.dig-deeper-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => showDeepDiveModal(sortedLogs[index]));
        });
        
        // Show modal
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    // Show deep dive modal for a single log
    function showDeepDiveModal(log) {
        // Create modal structure
        const modal = document.createElement('div');
        modal.className = 'modal deep-dive-modal';
        modal.id = 'deepDiveModal';
        
        // Format context data for display
        let contextHtml = '<p>No detailed context available</p>';
        if (log.context) {
            contextHtml = '<div class="context-data">';
            for (const key in log.context) {
                if (typeof log.context[key] === 'object') {
                    contextHtml += `<div class="context-section">
                        <h4>${key}</h4>
                        <pre>${JSON.stringify(log.context[key], null, 2)}</pre>
                    </div>`;
                } else {
                    contextHtml += `<div class="context-item">
                        <span class="context-key">${key}:</span>
                        <span class="context-value">${log.context[key]}</span>
                    </div>`;
                }
            }
            contextHtml += '</div>';
        }
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Deep Dive Analysis</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="deep-dive-sections">
                        <section class="deep-dive-section">
                            <h3>Basic Information</h3>
                            <div class="info-grid">
                                <div class="info-row">
                                    <span class="info-label">Level:</span>
                                    <span class="info-value ${log.level.toLowerCase()}">${log.level}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Time:</span>
                                    <span class="info-value">${new Date(log.timestamp * 1000).toLocaleString()}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Player:</span>
                                    <span class="info-value">${log.player || 'Server'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Source:</span>
                                    <span class="info-value">${log.source || 'Unknown'}</span>
                                </div>
                            </div>
                        </section>
                        
                        <section class="deep-dive-section">
                            <h3>Message</h3>
                            <div class="message-content">
                                <pre>${log.message}</pre>
                            </div>
                        </section>
                        
                        <section class="deep-dive-section">
                            <h3>Context Data</h3>
                            ${contextHtml}
                        </section>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn secondary close-btn">Close</button>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
        
        // Show modal
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    // Download logs for a player
    function downloadPlayerLogs(player, logs) {
        // Sort logs by timestamp (newest first)
        const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);
        
        let fileContent = `=== ROBLOX CONSOLE LOGS FOR ${player} ===\r\n`;
        fileContent += `Generated: ${new Date().toLocaleString()}\r\n`;
        fileContent += `Total Logs: ${logs.length}\r\n\r\n`;
        
        sortedLogs.forEach(log => {
            const timestamp = new Date(log.timestamp * 1000).toLocaleString();
            fileContent += `[${timestamp}] [${log.level}] ${log.source ? '[Source: ' + log.source + ']' : ''}\r\n`;
            fileContent += `${log.message}\r\n`;
            
            // Add context data if available
            if (log.context) {
                fileContent += `\r\nContext:\r\n`;
                for (const key in log.context) {
                    if (typeof log.context[key] === 'object') {
                        fileContent += `  ${key}: ${JSON.stringify(log.context[key], null, 2)}\r\n`;
                    } else {
                        fileContent += `  ${key}: ${log.context[key]}\r\n`;
                    }
                }
            }
            
            fileContent += `\r\n-----------------------------------\r\n\r\n`;
        });
        
        // Create and trigger download
        const blob = new Blob([fileContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RobloxLogs_${player}_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification(`Logs for ${player} downloaded successfully`, 'success');
    }
    
    // Apply filters to log data
    function applyFilters() {
        fetchLogs(); // Re-fetch with the new filters
    }
    
    // Confirm and clear logs
    function confirmClearLogs() {
        if (!confirm('Are you sure you want to clear the logs? This cannot be undone.')) return;
        
        clearLogs();
    }
    
    // Clear logs from database
    async function clearLogs() {
        showLoading(true);
        
        try {
            // Build filter params
            const params = {};
            if (logLevelFilter.value !== 'all') params.level = logLevelFilter.value;
            if (timeFilter.value !== 'all') params.timeframe = timeFilter.value;
            if (playerFilter.value !== 'all') params.player = playerFilter.value;
            if (searchInput.value.trim()) params.search = searchInput.value.trim();
            
            // Make API request
            const response = await fetch(API_URL, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify(params)
            });
            
            if (!response.ok) {
                throw new Error('Failed to clear logs');
            }
            
            const data = await response.json();
            
            // Show success notification
            showNotification(`Successfully cleared ${data.deleted} logs`, 'success');
            
            // Refresh logs
            fetchLogs();
            
        } catch (error) {
            console.error('Error clearing logs:', error);
            showNotification('Failed to clear logs: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }
    
    // Show empty state
    function showEmptyState() {
        logsContainer.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <h3>No logs found</h3>
                <p>No logs match your current filters or no logs have been captured yet.</p>
                <button id="resetFiltersBtn" class="btn secondary">Reset Filters</button>
            </div>
        `;
        
        document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);
    }
    
    // Reset all filters
    function resetFilters() {
        searchInput.value = '';
        logLevelFilter.value = 'all';
        timeFilter.value = 'all';
        playerFilter.value = 'all';
        
        fetchLogs();
    }
    
    // Show/hide loading overlay
    function showLoading(show) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        notificationEl.textContent = message;
        notificationEl.className = `notification ${type}`;
        notificationEl.style.display = 'block';
        
        setTimeout(() => {
            notificationEl.style.opacity = '1';
        }, 10);
        
        setTimeout(() => {
            notificationEl.style.opacity = '0';
            setTimeout(() => {
                notificationEl.style.display = 'none';
            }, 300);
        }, 3000);
    }
}

// Setup theme preference
function setupTheme() {
    const themeSwitch = document.getElementById('theme-switch');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Check for saved theme preference or use device preference
    const currentTheme = localStorage.getItem('theme') || 
                       (prefersDarkScheme.matches ? 'dark' : 'light');
    
    if (currentTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeSwitch.checked = true;
    }
    
    // Handle theme switch
    themeSwitch.addEventListener('change', function() {
        if (this.checked) {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    });
}

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
