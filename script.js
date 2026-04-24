// ⚠️ IMPORTANT: Replace this URL with your Google Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbzY0bfkFITHybnBBcm4aK2oBTUXObw3dr2swT5bBBCWDwbTi7kcyIp9WV3uo4mmhpJh/exec';

async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const searchBtn = document.getElementById('searchBtn');
    
    // Validate input
    if (!searchTerm) {
        showError('Please enter a search term');
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
        
        if (data.found && data.data) {
            displayResult(data.data);
        } else {
            showNoResult();
        }
        
    } catch (error) {
        // Hide loading
        loadingDiv.style.display = 'none';
        searchBtn.disabled = false;
        searchInput.disabled = false;
        
        showError('Failed to connect to database. Please check your connection and try again.');
        console.error('Search error:', error);
    }
}

function displayResult(data) {
    const resultDiv = document.getElementById('result');
    
    const html = `
        <div class="result-card success">
            <div class="result-title">✅ Account Found</div>
            <div class="result-details">
                <div class="detail-item">
                    <span class="detail-label">Account Name</span>
                    <span class="detail-value highlight">${escapeHtml(data.name)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">CH Code</span>
                    <span class="detail-value">${escapeHtml(data.code)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">OB (Opening Balance)</span>
                    <span class="detail-value">₱${escapeHtml(data.ob)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">PD (Payment Due)</span>
                    <span class="detail-value">₱${escapeHtml(data.pd)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">MAD (Minimum Amount Due)</span>
                    <span class="detail-value">₱${escapeHtml(data.mad)}</span>
                </div>
            </div>
        </div>
    `;
    
    resultDiv.innerHTML = html;
}

function showNoResult() {
    const resultDiv = document.getElementById('result');
    
    const html = `
        <div class="result-card error">
            <div class="result-title">❌ No Result Found</div>
            <p class="error-message">The search term was not found in the database. Please try different keywords.</p>
        </div>
    `;
    
    resultDiv.innerHTML = html;
}

function showError(message) {
    const resultDiv = document.getElementById('result');
    
    const html = `
        <div class="result-card error">
            <div class="result-title">⚠️ Error</div>
            <p class="error-message">${escapeHtml(message)}</p>
        </div>
    `;
    
    resultDiv.innerHTML = html;
}

// Helper function to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
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