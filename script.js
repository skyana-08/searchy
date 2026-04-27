const API_URL = 'https://script.google.com/macros/s/AKfycbyfqad__CWnNJAmpiqNYM3msttU9PraIHospUDmBzjcbpuf-ZuDe0T6N_Au2Hm6U7nZ/exec';

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

function renderSingleResult(account) {
    return `
        <div class="result-card success">
            <div class="card-header">
                <div class="card-header-icon">✓</div>
                <div class="card-header-info">
                    <div class="card-header-title">Account Verified</div>
                    <div class="card-header-sub">CONFIRMED IN DATABASE · ELIGIBLE FOR FIELD VISIT</div>
                </div>
                <span class="card-badge">✓ GO</span>
            </div>
            <div class="card-details">
                <div class="detail-item">
                    <div class="detail-item-icon">👤</div>
                    <div class="detail-item-content">
                        <div class="detail-item-label">Account Name</div>
                        <div class="detail-item-value name-val">${escapeHtml(account.name)}</div>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-icon">🏷️</div>
                    <div class="detail-item-content">
                        <div class="detail-item-label">CH Code</div>
                        <div class="detail-item-value code-val">${escapeHtml(account.code)}</div>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-icon">📊</div>
                    <div class="detail-item-content">
                        <div class="detail-item-label">OB — Outstanding Balance</div>
                        <div class="detail-item-value amount-val">${formatPeso(account.ob)}</div>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-icon">📅</div>
                    <div class="detail-item-content">
                        <div class="detail-item-label">PD — Past Due</div>
                        <div class="detail-item-value amount-val">${formatPeso(account.pd)}</div>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-icon">💳</div>
                    <div class="detail-item-content">
                        <div class="detail-item-label">MAD — Minimum Amount Due</div>
                        <div class="detail-item-value amount-val">${formatPeso(account.mad)}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderMultipleResults(accountsArray, searchTerm) {
    const summaryHtml = `<div class="result-summary-badge">🔍 ${accountsArray.length} matching accounts found (same name or CH code)</div>`;
    const cardsHtml = accountsArray.map(acc => `
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
    `).join('');
    return `${summaryHtml}<div class="results-list">${cardsHtml}</div>`;
}

function showMessage(type, title, message, icon) {
    const isError = type === 'error';
    return `
        <div class="result-card ${isError ? 'error' : 'success'}">
            <div class="card-header">
                <div class="card-header-icon">${icon}</div>
                <div class="card-header-info">
                    <div class="card-header-title">${escapeHtml(title)}</div>
                    <div class="card-header-sub">${isError ? 'SEARCH COMPLETED — NO MATCH' : 'OPERATION SUCCESSFUL'}</div>
                </div>
            </div>
            <div class="card-message">
                <p class="card-message-text">${escapeHtml(message)}</p>
            </div>
        </div>
    `;
}

function setNormalLayout() {
    const mainContent = document.getElementById('mainContent');
    mainContent.className = 'main';
    mainContent.innerHTML = `
        <div class="hero">
            <div class="hero-eyebrow">Field Visit Verification System</div>
            <h1>SBC ACCOUNT CHECKER</h1>
            <p class="hero-sub">Search the database to verify whether an account is eligible for field visit.</p>
        </div>
        <div class="search-panel">
            <div class="search-field">
                <span class="search-field-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                </span>
                <input type="text" id="searchInput" placeholder="Search by Name or CH code" autocomplete="off" autocorrect="off" spellcheck="false">
                <button id="searchBtn" onclick="performSearch()">
                    <span class="btn-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                        </svg>
                    </span>
                    <span>Search</span>
                </button>
            </div>
        </div>
        <div class="results-area">
            <div id="loading" class="loading">
                <div class="loading-inner">
                    <div class="loader-ring"></div>
                    <p class="loading-text">Querying database</p>
                </div>
            </div>
            <div id="result"></div>
        </div>
    `;
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
}

function setSplitLayout() {
    const mainContent = document.getElementById('mainContent');
    mainContent.className = 'main-split';
    mainContent.innerHTML = `
        <div class="search-sidebar">
            <div class="compact-hero">
                <div class="hero-eyebrow">Field Visit Verification</div>
                <h1>SBC <span>ACCOUNT CHECKER</span></h1>
                <p>Verify eligibility & find matching accounts by Name or CH code.</p>
            </div>
            <div class="search-field">
                <span class="search-field-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                </span>
                <input type="text" id="searchInput" placeholder="Search by Name or CH code" autocomplete="off">
                <button id="searchBtn" onclick="performSearch()"><span>🔍</span> Search</button>
            </div>
            <div class="footer-tip" style="margin-top: 8px;">Press <kbd>Enter</kbd> to search · multiple matches appear side-by-side on right</div>
        </div>
        <div class="results-panel" id="resultsPanel">
            <div id="loading" class="loading">
                <div class="loader-ring"></div>
                <div class="loading-text">Searching database...</div>
            </div>
            <div id="result"></div>
        </div>
    `;
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
}

async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const searchBtn = document.getElementById('searchBtn');

    if (!searchTerm) {
        resultDiv.innerHTML = showMessage('error', 'No query entered', 'Please enter a name, CH code, or amount to search the database.', '🔍');
        searchInput.focus();
        return;
    }

    loadingDiv.style.display = 'block';
    resultDiv.innerHTML = '';
    searchBtn.disabled = true;
    searchInput.disabled = true;

    try {
        const response = await fetch(`${API_URL}?q=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) throw new Error('Network response was not ok');
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

        if (accountsList.length === 0) {
            setNormalLayout();
            const newResultDiv = document.getElementById('result');
            newResultDiv.innerHTML = showMessage('error', 'Account Not Found', 'No accounts matched your search. This account is negative for field visit.', '📭');
            document.getElementById('searchInput').value = searchTerm;
        } 
        else if (accountsList.length === 1) {
            setNormalLayout();
            const newResultDiv = document.getElementById('result');
            newResultDiv.innerHTML = renderSingleResult(accountsList[0]);
            document.getElementById('searchInput').value = searchTerm;
        }
        else {
            setSplitLayout();
            const newResultDiv = document.getElementById('result');
            newResultDiv.innerHTML = renderMultipleResults(accountsList, searchTerm);
            document.getElementById('searchInput').value = searchTerm;
        }
        
        const newSearchInput = document.getElementById('searchInput');
        newSearchInput.value = searchTerm;
        newSearchInput.focus();
        document.getElementById('searchBtn').disabled = false;
        newSearchInput.disabled = false;

    } catch (error) {
        setNormalLayout();
        const newResultDiv = document.getElementById('result');
        newResultDiv.innerHTML = showMessage('error', 'Connection Error', 'Unable to connect to the database. Please check your connection and try again.', '🔌');
        console.error('Search error:', error);
        document.getElementById('searchBtn').disabled = false;
        document.getElementById('searchInput').disabled = false;
    }
}

window.addEventListener('load', function() {
    setNormalLayout();
    document.getElementById('searchInput').focus();
});
