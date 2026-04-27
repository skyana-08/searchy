const API_URL = 'https://script.google.com/macros/s/AKfycbyfqad__CWnNJAmpiqNYM3msttU9PraIHospUDmBzjcbpuf-ZuDe0T6N_Au2Hm6U7nZ/exec';

// Theme handling
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('checkmych-theme', next);
}

(function initTheme() {
    const saved = localStorage.getItem('checkmych-theme');
    if (saved === 'light' || saved === 'dark') {
        document.documentElement.setAttribute('data-theme', saved);
    }
})();

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function formatPeso(val) {
    return `₱${escapeHtml(val)}`;
}

function renderMultipleResults(accountsArray, searchTerm) {
    if (!accountsArray || accountsArray.length === 0) {
        return `<div class="result-card error">
            <div class="card-header">
                <div class="card-header-icon">⚠️</div>
                <div class="card-header-info">
                    <div class="card-header-title">No Results</div>
                    <div class="card-header-sub">No matching accounts</div>
                </div>
            </div>
            <div class="card-message">
                <p class="card-message-text">No records found for "${escapeHtml(searchTerm)}".</p>
            </div>
        </div>`;
    }

    const multiple = accountsArray.length >= 2;
    let summaryHtml = '';
    if (multiple) {
        summaryHtml = `<div class="result-summary-badge">🔍 ${accountsArray.length} matching accounts found (same name or CH code)</div>`;
    }

    const cardsHtml = accountsArray.map(acc => {
        return `
            <div class="result-card success">
                <div class="card-header">
                    <div class="card-header-icon">✓</div>
                    <div class="card-header-info">
                        <div class="card-header-title">Account Verified</div>
                        <div class="card-header-sub">ELIGIBLE FOR FIELD VISIT</div>
                    </div>
                    <span class="card-badge">✓ GO</span>
                </div>
                <div class="card-details">
                    <div class="detail-item">
                        <div class="detail-item-icon">👤</div>
                        <div class="detail-item-content">
                            <div class="detail-item-label">Account Name</div>
                            <div class="detail-item-value name-val">${escapeHtml(acc.name)}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-icon">🏷️</div>
                        <div class="detail-item-content">
                            <div class="detail-item-label">CH Code</div>
                            <div class="detail-item-value code-val">${escapeHtml(acc.code)}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-icon">📊</div>
                        <div class="detail-item-content">
                            <div class="detail-item-label">OB — Outstanding Balance</div>
                            <div class="detail-item-value amount-val">${formatPeso(acc.ob)}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-icon">📅</div>
                        <div class="detail-item-content">
                            <div class="detail-item-label">PD — Past Due</div>
                            <div class="detail-item-value amount-val">${formatPeso(acc.pd)}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-icon">💳</div>
                        <div class="detail-item-content">
                            <div class="detail-item-label">MAD — Minimum Amount Due</div>
                            <div class="detail-item-value amount-val">${formatPeso(acc.mad)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `${summaryHtml}<div class="results-list">${cardsHtml}</div>`;
}

async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const searchBtn = document.getElementById('searchBtn');

    if (!searchTerm) {
        resultDiv.innerHTML = `<div class="result-card error">
            <div class="card-header">
                <div class="card-header-icon">🔍</div>
                <div class="card-header-info">
                    <div class="card-header-title">Empty Query</div>
                    <div class="card-header-sub">Please enter a name or CH code</div>
                </div>
            </div>
            <div class="card-message">
                <p class="card-message-text">Type an account name or CH code to search.</p>
            </div>
        </div>`;
        searchInput.focus();
        return;
    }

    loadingDiv.style.display = 'block';
    resultDiv.innerHTML = '';
    searchBtn.disabled = true;
    searchInput.disabled = true;

    try {
        const response = await fetch(`${API_URL}?q=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();

        loadingDiv.style.display = 'none';
        searchBtn.disabled = false;
        searchInput.disabled = false;
        searchInput.focus();

        let accountsList = [];
        if (data.found && data.data) {
            if (Array.isArray(data.data)) {
                accountsList = data.data;
            } else if (typeof data.data === 'object' && data.data.name) {
                accountsList = [data.data];
            }
        }

        if (accountsList.length > 0) {
            resultDiv.innerHTML = renderMultipleResults(accountsList, searchTerm);
        } else {
            resultDiv.innerHTML = `<div class="result-card error">
                <div class="card-header">
                    <div class="card-header-icon">📭</div>
                    <div class="card-header-info">
                        <div class="card-header-title">Account Not Found</div>
                        <div class="card-header-sub">No matches for field visit</div>
                    </div>
                </div>
                <div class="card-message">
                    <p class="card-message-text">"${escapeHtml(searchTerm)}" is not in the database or not eligible.</p>
                </div>
            </div>`;
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        searchBtn.disabled = false;
        searchInput.disabled = false;
        resultDiv.innerHTML = `<div class="result-card error">
            <div class="card-header">
                <div class="card-header-icon">🔌</div>
                <div class="card-header-info">
                    <div class="card-header-title">Connection Error</div>
                    <div class="card-header-sub">Unable to reach database</div>
                </div>
            </div>
            <div class="card-message">
                <p class="card-message-text">Please check your network and try again.</p>
            </div>
        </div>`;
        console.error('Search error:', error);
    }
}

// Event listeners
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') performSearch();
});

window.addEventListener('load', function() {
    document.getElementById('searchInput').focus();
});
