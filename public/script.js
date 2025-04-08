// API configuration
const API_URL = '/api/logs';
const API_KEY = 'roblox-logger-key'; // This would be securely stored in production

// Helper function for API calls
async function callApi(endpoint, method = 'GET', data = null, params = {}) {
    try {
        // Build URL with query parameters if provided
        const url = new URL(endpoint, window.location.origin);
        
        if (params && Object.keys(params).length > 0) {
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    url.searchParams.append(key, params[key]);
                }
            });
        }
        
        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        };
        
        // Build request options
        const options = {
            method,
            headers,
            credentials: 'same-origin'
        };
        
        // Add body for POST/PUT requests
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        // Make the request
        const response = await fetch(url.toString(), options);
        
        // Handle response
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API request failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Theme switcher
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
    
    // Storage for our actual logs from the API
    let logData = [];
    let playerList = [];
    
    // Pagination variables
    let currentPage = 1;
    const logsPerPage = 20;
    let filteredLogs = [];
    let totalPages = 1;
    let isLoading = false;
    
    // Filter variables
    let activeFilters = {
        search: '',
        types: {
            info: true,
            warning: true,
            error: true,
            debug: true
        },
        timeRange: 'all',
        player: 'all'
    };
    
    // DOM elements
    const logsTableBody = document.getElementById('logsTableBody');
    const totalLogsElement = document.getElementById('totalLogs');
    const filteredLogsElement = document.getElementById('filteredLogs');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfoElement = document.getElementById('pageInfo');
    const searchInput = document.getElementById('search');
    const timeRangeSelect = document.getElementById('timeRange');
    const playerFilterSelect = document.getElementById('playerFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    const logDetailModal = document.getElementById('logDetailModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const closeModalBtnFooter = document.getElementById('closeModal');
    
    // Modal elements
    const detailLevel = document.getElementById('detailLevel');
    const detailTime = document.getElementById('detailTime');
    const detailPlayer = document.getElementById('detailPlayer');
    const detailMessage = document.getElementById('detailMessage');
    const detailSource = document.getElementById('detailSource');
    const detailContext = document.getElementById('detailContext');
    const downloadDetailLog = document.getElementById('downloadDetailLog');
    
    // Initialize player filter options with data from API
    function initPlayerFilter(players) {
        playerFilterSelect.innerHTML = '<option value="all">All Players</option>';
        
        if (players && players.length > 0) {
            players.forEach(player => {
                const option = document.createElement('option');
                option.value = player;
                option.textContent = player;
                playerFilterSelect.appendChild(option);
            });
        }
    }
    
    // Fetch logs from API with applied filters
    async function fetchLogs() {
        if (isLoading) return;
        isLoading = true;
        showLoadingIndicator();
        
        try {
            // Prepare API query parameters based on active filters
            const params = {
                page: currentPage,
                limit: logsPerPage,
                search: activeFilters.search || undefined,
                player: activeFilters.player !== 'all' ? activeFilters.player : undefined,
                sort: 'timestamp',
                order: 'desc'
            };
            
            // Add level filter if not all levels are selected
            const selectedLevels = Object.entries(activeFilters.types)
                .filter(([_, isSelected]) => isSelected)
                .map(([level]) => level.toUpperCase());
                
            if (selectedLevels.length < 4) {
                params.level = selectedLevels.join(',');
            }
            
            // Add date range based on timeRange filter
            if (activeFilters.timeRange !== 'all') {
                const now = new Date();
                const endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString();
                let startDate;
                
                switch (activeFilters.timeRange) {
                    case 'today':
                        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                        break;
                    case 'yesterday':
                        now.setDate(now.getDate() - 1);
                        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                        now.setHours(23, 59, 59, 999);
                        endDate = now.toISOString();
                        break;
                    case 'week':
                        now.setDate(now.getDate() - 7);
                        startDate = now.toISOString();
                        break;
                    case 'month':
                        now.setMonth(now.getMonth() - 1);
                        startDate = now.toISOString();
                        break;
                }
                
                params.startDate = startDate;
                params.endDate = endDate;
            }
            
            // Call the API
            const response = await callApi(API_URL, 'GET', null, params);
            
            // Update data
            logData = response.data;
            filteredLogs = response.data;
            totalPages = response.pagination.pages;
            
            // Update player filter if needed
            if (!playerList.length && response.filters && response.filters.players) {
                playerList = response.filters.players;
                initPlayerFilter(playerList);
            }
            
            // Update the display
            updateLogsDisplay();
        } catch (error) {
            showError(`Failed to fetch logs: ${error.message}`);
            console.error('Fetch logs error:', error);
        } finally {
            hideLoadingIndicator();
            isLoading = false;
        }
    }
    
    // Clear logs based on current filters
    async function clearLogs() {
        if (isLoading || !confirm('Are you sure you want to clear logs? This action cannot be undone.')) {
            return;
        }
        
        isLoading = true;
        showLoadingIndicator();
        
        try {
            // Prepare params based on current filters for targeted deletion
            const params = {
                all: 'false',
                player: activeFilters.player !== 'all' ? activeFilters.player : undefined
            };
            
            // Add level filter
            const selectedLevels = Object.entries(activeFilters.types)
                .filter(([_, isSelected]) => isSelected)
                .map(([level]) => level.toUpperCase());
                
            if (selectedLevels.length < 4) {
                params.level = selectedLevels.join(',');
            }
            
            // Add date range
            if (activeFilters.timeRange !== 'all') {
                // Similar date logic as in fetchLogs
                const now = new Date();
                const endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString();
                let startDate;
                
                switch (activeFilters.timeRange) {
                    case 'today':
                        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                        break;
                    case 'yesterday':
                        now.setDate(now.getDate() - 1);
                        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                        now.setHours(23, 59, 59, 999);
                        endDate = now.toISOString();
                        break;
                    case 'week':
                        now.setDate(now.getDate() - 7);
                        startDate = now.toISOString();
                        break;
                    case 'month':
                        now.setMonth(now.getMonth() - 1);
                        startDate = now.toISOString();
                        break;
                }
                
                params.startDate = startDate;
                params.endDate = endDate;
            }
            
            // Are we clearing ALL logs?
            if (activeFilters.timeRange === 'all' && 
                activeFilters.player === 'all' && 
                Object.values(activeFilters.types).every(v => v)) {
                params.all = 'true';
            }
            
            // Call the DELETE endpoint
            const response = await callApi(API_URL, 'DELETE', null, params);
            
            // Show success message
            showNotification(response.message || 'Logs cleared successfully');
            
            // Refresh logs to see changes
            await fetchLogs();
        } catch (error) {
            showError(`Failed to clear logs: ${error.message}`);
            console.error('Clear logs error:', error);
        } finally {
            hideLoadingIndicator();
            isLoading = false;
        }
    }
    
    // Show loading indicator
    function showLoadingIndicator() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }
    
    // Hide loading indicator
    function hideLoadingIndicator() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
    
    // Show error notification
    function showError(message) {
        const notificationEl = document.getElementById('notification');
        notificationEl.textContent = message;
        notificationEl.className = 'notification error';
        notificationEl.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notificationEl.style.display = 'none';
        }, 5000);
    }
    
    // Show success notification
    function showNotification(message) {
        const notificationEl = document.getElementById('notification');
        notificationEl.textContent = message;
        notificationEl.className = 'notification success';
        notificationEl.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notificationEl.style.display = 'none';
        }, 3000);
    }
    
    // Update the log table with fetched data
    function updateLogsDisplay() {
        // Update page info
        pageInfoElement.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
        
        // Update log count
        totalLogsElement.textContent = `${logData.length} logs total`;
        filteredLogsElement.textContent = `${filteredLogs.length} shown`;
        
        // Clear existing rows
        logsTableBody.innerHTML = '';
        
        // Add log entries
        if (currentLogs.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    No logs found matching your filters
                </td>
            `;
            logsTableBody.appendChild(emptyRow);
        } else {
            currentLogs.forEach(log => {
                const row = document.createElement('tr');
                row.className = 'log-entry';
                row.dataset.level = log.level.toLowerCase();
                row.dataset.player = log.player;
                row.dataset.id = log.id;
                
                row.innerHTML = `
                    <td class="time">${log.time}</td>
                    <td class="level"><span class="level-badge ${log.level.toLowerCase()}">${log.level}</span></td>
                    <td class="player">${log.player}</td>
                    <td class="message">${log.message}</td>
                    <td class="source">${log.source}</td>
                    <td class="actions">
                        <button class="btn-icon view-log" title="View Details">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button class="btn-icon download-log" title="Download Log">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </button>
                    </td>
                `;
                
                logsTableBody.appendChild(row);
            });
        }
        
        // Add event listeners to view and download buttons
        document.querySelectorAll('.view-log').forEach(btn => {
            btn.addEventListener('click', function() {
                const logId = this.closest('tr').dataset.id;
                showLogDetails(logId);
            });
        });
        
        document.querySelectorAll('.download-log').forEach(btn => {
            btn.addEventListener('click', function() {
                const logId = this.closest('tr').dataset.id;
                downloadLog(logId);
            });
        });
    }
    
    // Show log details in modal
    function showLogDetails(logId) {
        const log = filteredLogs.find(l => l._id === logId);
        if (!log) return;
        
        // Update modal content
        detailLevel.textContent = log.level;
        detailLevel.className = `level-badge ${log.level.toLowerCase()}`;
        detailTime.textContent = log.time;
        detailPlayer.innerHTML = `<strong>Player:</strong> ${log.player} (UserId: ${log.userId})`;
        detailMessage.textContent = log.message;
        detailSource.textContent = log.source;
        
        // Clear and rebuild context items
        detailContext.innerHTML = '';
        for (const [key, value] of Object.entries(log.context)) {
            const contextItem = document.createElement('div');
            contextItem.className = 'context-item';
            contextItem.innerHTML = `
                <div class="context-label">${key.charAt(0).toUpperCase() + key.slice(1)}</div>
                <div class="context-value">${value}</div>
            `;
            detailContext.appendChild(contextItem);
        }
        
        // Download button handler
        downloadDetailLog.onclick = function() {
            downloadLog(logId);
        };
        
        // Show modal
        logDetailModal.style.display = 'block';
    }
    
    // Close modal
    function closeModal() {
        logDetailModal.style.display = 'none';
    }
    
    // Download log as text file
    function downloadLog(logId) {
        const log = filteredLogs.find(l => l._id === logId);
        if (!log) return;
        
        // Create log content
        let logContent = `--- ROBLOX CONSOLE LOG ---\n`;
        logContent += `Time: ${log.time}\n`;
        logContent += `Level: ${log.level}\n`;
        logContent += `Player: ${log.player} (ID: ${log.userId})\n`;
        logContent += `Source: ${log.source}\n`;
        logContent += `---------------------------\n\n`;
        logContent += `Message: ${log.message}\n\n`;
        logContent += `Context Information:\n`;
        
        for (const [key, value] of Object.entries(log.context)) {
            logContent += `${key}: ${value}\n`;
        }
        
        // Create download
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RobloxLog_${log.player}_${log.time.replace(/[: ]/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    // Event Listeners
    
    // Pagination
    prevPageBtn.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            fetchLogs();
        }
    });
    
    nextPageBtn.addEventListener('click', function() {
        if (currentPage < totalPages) {
            currentPage++;
            fetchLogs();
        }
    });
    
    // Search - debounced to avoid excessive API calls
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            activeFilters.search = this.value;
            currentPage = 1; // Reset to first page
            fetchLogs();
        }, 500); // Wait 500ms after typing stops
    });
    
    // Log type filters
    document.querySelectorAll('.checkbox-group input').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            activeFilters.types[this.value] = this.checked;
            currentPage = 1; // Reset to first page
            fetchLogs();
        });
    });
    
    // Time range filter
    timeRangeSelect.addEventListener('change', function() {
        activeFilters.timeRange = this.value;
        currentPage = 1; // Reset to first page
        fetchLogs();
    });
    
    // Player filter
    playerFilterSelect.addEventListener('change', function() {
        activeFilters.player = this.value;
        currentPage = 1; // Reset to first page
        fetchLogs();
    });
    
    // Clear logs button
    document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
    
    // Refresh button
    refreshBtn.addEventListener('click', function() {
        this.classList.add('refreshing');
        fetchLogs().finally(() => {
            this.classList.remove('refreshing');
        });
    });
    
    // Modal close buttons
    closeModalBtn.addEventListener('click', closeModal);
    closeModalBtnFooter.addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        if (event.target === logDetailModal) {
            closeModal();
        }
    });
    
    // Show empty state if there are no logs
    function updateEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const logsTable = document.querySelector('.logs-table');
        
        if (filteredLogs.length === 0) {
            emptyState.style.display = 'flex';
            logsTable.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            logsTable.style.display = 'table';
        }
    }
    
    // Complete the updateLogsDisplay function
    const originalUpdateLogsDisplay = updateLogsDisplay;
    updateLogsDisplay = function() {
        originalUpdateLogsDisplay();
        
        // Clear existing rows
        logsTableBody.innerHTML = '';
        
        // Add log entries
        if (filteredLogs.length === 0) {
            updateEmptyState();
            return;
        }
        
        // Show logs table
        updateEmptyState();
        
        // Populate with log data
        filteredLogs.forEach(log => {
            const row = document.createElement('tr');
            row.className = 'log-entry';
            row.dataset.level = log.level.toLowerCase();
            row.dataset.player = log.player;
            row.dataset.id = log._id;
            
            // Format timestamp
            const timestamp = new Date(log.timestamp);
            const formattedTime = timestamp.toLocaleString();
            
            row.innerHTML = `
                <td class="time">${formattedTime}</td>
                <td class="level"><span class="level-badge ${log.level.toLowerCase()}">${log.level}</span></td>
                <td class="player">${log.player}</td>
                <td class="message">${log.message}</td>
                <td class="source">${log.source}</td>
                <td class="actions">
                    <button class="btn-icon view-log" title="View Details">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-icon download-log" title="Download Log">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                </td>
            `;
            
            logsTableBody.appendChild(row);
        });
        
        // Add event listeners to view and download buttons
        document.querySelectorAll('.view-log').forEach(btn => {
            btn.addEventListener('click', function() {
                const logId = this.closest('tr').dataset.id;
                showLogDetails(logId);
            });
        });
        
        document.querySelectorAll('.download-log').forEach(btn => {
            btn.addEventListener('click', function() {
                const logId = this.closest('tr').dataset.id;
                downloadLog(logId);
            });
        });
    };
    
    // Initialize the app
    fetchLogs();
    
    // Set up real-time updates
    // Poll for new logs every 10 seconds
    setInterval(() => {
        if (!document.hidden && !isLoading) {
            // Only refresh when the page is visible and not already loading
            fetchLogs();
        }
    }, 10000);
});
