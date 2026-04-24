// ⚠️ IMPORTANT: Replace this URL with your Google Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbyfqad__CWnNJAmpiqNYM3msttU9PraIHospUDmBzjcbpuf-ZuDe0T6N_Au2Hm6U7nZ/exec';

async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const searchBtn = document.getElementById('searchBtn');
    
    // Validate input
    if (!searchTerm) {
        showMessage('error', 'Please enter a search term', '⚠️');
        searchInput.focus();
        return;
    }
    
    // Show loading state
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
        
        // Hide loading
        loadingDiv.style.display = 'none';
        searchBtn.disabled = false;
        searchInput.disabled = false;
        searchInput.focus();
        
        if (data.found && data.data) {
            displayResult(data.data);
        } else {
            showMessage('error', 'No Accounts found, Negative for Field Visit.','⚠️');
        }
        
    } catch (error) {
        // Hide loading
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
                <div class="result-icon">✅</div>
                <h2 class="result-title">Account Found</h2>
            </div>
            <div class="result-details">
                <div class="detail-card">
                    <span class="detail-label">Account Name</span>
                    <span class="detail-value">${escapeHtml(data.name)}</span>
                </div>
                <div class="detail-card">
                    <span class="detail-label">CH Code</span>
                    <span class="detail-value">${escapeHtml(data.code)}</span>
                </div>
                <div class="detail-card">
                    <span class="detail-label">Opening Balance (OB)</span>
                    <span class="detail-value amount">₱${escapeHtml(data.ob)}</span>
                </div>
                <div class="detail-card">
                    <span class="detail-label">Payment Due (PD)</span>
                    <span class="detail-value amount">₱${escapeHtml(data.pd)}</span>
                </div>
                <div class="detail-card">
                    <span class="detail-label">Minimum Amount Due (MAD)</span>
                    <span class="detail-value amount">₱${escapeHtml(data.mad)}</span>
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
                <h2 class="result-title">${isError ? 'Search Result' : 'Success'}</h2>
            </div>
            <div class="error-message">${escapeHtml(message)}</div>
        </div>
    `;
    
    resultDiv.innerHTML = html;
}

// Helper function to prevent XSS
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Allow Enter key to trigger search
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// Focus on input when page loads
window.addEventListener('load', function() {
    document.getElementById('searchInput').focus();
});
