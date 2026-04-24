const API_URL = 'https://script.google.com/macros/s/AKfycbyfqad__CWnNJAmpiqNYM3msttU9PraIHospUDmBzjcbpuf-ZuDe0T6N_Au2Hm6U7nZ/exec';

async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const searchBtn = document.getElementById('searchBtn');
    
    if (!searchTerm) {
        showMessage('error', 'Please enter a search term to continue.', '🔍');
        searchInput.focus();
        return;
    }
    
    loadingDiv.style.display = 'block';
    resultDiv.innerHTML = '';
    searchBtn.disabled = true;
    searchInput.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}?q=${encodeURIComponent(searchTerm)}`);
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        loadingDiv.style.display = 'none';
        searchBtn.disabled = false;
        searchInput.disabled = false;
        searchInput.focus();
        
        if (data.found && data.data) {
            displayResult(data.data);
        } else {
            showMessage('error', 'No accounts matched your search. This account is negative for field visit.', '📭');
        }
        
    } catch (error) {
        loadingDiv.style.display = 'none';
        searchBtn.disabled = false;
        searchInput.disabled = false;
        
        showMessage('error', 'Unable to connect to the database. Please check your connection and try again.', '🔌');
        console.error('Search error:', error);
    }
}

function displayResult(data) {
    const resultDiv = document.getElementById('result');
    
    const html = `
        <div class="result-card success">
            <div class="result-header">
                <div class="result-icon">✓</div>
                <div class="result-title-group">
                    <h2 class="result-title">Account Found</h2>
                    <p class="result-subtitle">Verified in database</p>
                </div>
                <span class="result-badge">GO</span>
            </div>
            <div class="result-details">
                <div class="detail-row">
                    <div class="detail-icon">👤</div>
                    <div class="detail-content">
                        <div class="detail-label">Account Name</div>
                        <div class="detail-value highlight">${escapeHtml(data.name)}</div>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-icon">🏷️</div>
                    <div class="detail-content">
                        <div class="detail-label">CH Code</div>
                        <div class="detail-value">${escapeHtml(data.code)}</div>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-icon">📊</div>
                    <div class="detail-content">
                        <div class="detail-label">Opening Balance (OB)</div>
                        <div class="detail-value amount">₱${escapeHtml(data.ob)}</div>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-icon">📅</div>
                    <div class="detail-content">
                        <div class="detail-label">Payment Due (PD)</div>
                        <div class="detail-value amount">₱${escapeHtml(data.pd)}</div>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-icon">💳</div>
                    <div class="detail-content">
                        <div class="detail-label">Minimum Amount Due (MAD)</div>
                        <div class="detail-value amount">₱${escapeHtml(data.mad)}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    resultDiv.innerHTML = html;
}

function showMessage(type, message, icon) {
    const resultDiv = document.getElementById('result');
    const isError = type === 'error';
    
    const html = `
        <div class="result-card ${isError ? 'error' : 'success'}">
            <div class="result-header">
                <div class="result-icon">${icon}</div>
                <div class="result-title-group">
                    <h2 class="result-title">${isError ? 'No Results' : 'Success'}</h2>
                    <p class="result-subtitle">${isError ? 'Search completed' : 'Operation successful'}</p>
                </div>
            </div>
            <div class="error-message">
                ${escapeHtml(message)}
            </div>
        </div>
    `;
    
    resultDiv.innerHTML = html;
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});

window.addEventListener('load', function() {
    document.getElementById('searchInput').focus();
});
