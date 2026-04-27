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

async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const searchBtn = document.getElementById('searchBtn');

    if (!searchTerm) {
        showMessage('error', 'No query entered', 'Please enter a name, CH code, or amount to search the database.', '🔍');
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
            const allResults = data.allResults || [data.data];
            const totalResults = data.totalResults || 1;
            
            // Check if there are multiple accounts with same name OR same CH code
            const hasDuplicateName = checkDuplicateName(allResults);
            const hasDuplicateCode = checkDuplicateCode(allResults);
            
            // Show split screen ONLY if 2+ results AND duplicates exist
            if (totalResults >= 2 && (hasDuplicateName || hasDuplicateCode)) {
                renderSplitScreen(allResults);
            } else if (totalResults === 1) {
                // Single result - normal UI
                resetToNormalLayout();
                displayResult(data.data);
            } else {
                // Multiple results but no duplicates - show first one with note
                resetToNormalLayout();
                displayResult(data.data);
                const note = document.createElement('div');
                note.className = 'result-card';
                note.innerHTML = `<div class="card-message"><p class="card-message-text"><strong>${totalResults} accounts found</strong><br>No duplicate names or CH codes. Showing first result.</p></div>`;
                document.getElementById('result').appendChild(note);
            }
        } else {
            showMessage('error', 'Account Not Found', 'No accounts matched your search. This account is negative for field visit.', '📭');
            resetToNormalLayout();
        }

    } catch (error) {
        loadingDiv.style.display = 'none';
        searchBtn.disabled = false;
        searchInput.disabled = false;
        showMessage('error', 'Connection Error', 'Unable to connect to the database. Please check your connection and try again.', '🔌');
        resetToNormalLayout();
        console.error('Search error:', error);
    }
}

function checkDuplicateName(accounts) {
    const names = accounts.map(acc => acc.name?.trim().toUpperCase());
    return new Set(names).size !== names.length;
}

function checkDuplicateCode(accounts) {
    const codes = accounts.map(acc => acc.code?.trim().toUpperCase());
    return new Set(codes).size !== codes.length;
}

function renderSplitScreen(accounts) {
    const mainElement = document.querySelector('.main');
    const heroHTML = document.querySelector('.hero').outerHTML;
    const searchPanelHTML = document.getElementById('searchPanelWrapper').innerHTML;
    
    let resultsHTML = '<div class="results-area">';
    accounts.forEach(account => {
        resultsHTML += `
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
                            <div class="detail-item-value amount-val">₱${escapeHtml(account.ob)}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-icon">📅</div>
                        <div class="detail-item-content">
                            <div class="detail-item-label">PD — Past Due</div>
                            <div class="detail-item-value amount-val">₱${escapeHtml(account.pd)}</div>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-icon">💳</div>
                        <div class="detail-item-content">
                            <div class="detail-item-label">MAD — Minimum Amount Due</div>
                            <div class="detail-item-value amount-val">₱${escapeHtml(account.mad)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    resultsHTML += '</div>';
    
    mainElement.innerHTML = `
        <div class="split-layout">
            <div class="split-left">
                ${heroHTML}
                ${searchPanelHTML}
            </div>
            <div class="split-right">
                ${resultsHTML}
            </div>
        </div>
    `;
    
    const newSearchInput = document.getElementById('searchInput');
    if (newSearchInput) {
        newSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') performSearch();
        });
        newSearchInput.focus();
    }
    
    const newSearchBtn = document.getElementById('searchBtn');
    if (newSearchBtn) {
        newSearchBtn.onclick = performSearch;
    }
}

function resetToNormalLayout() {
    const mainElement = document.querySelector('.main');
    if (mainElement.querySelector('.split-layout')) {
        location.reload();
    }
}

function displayResult(data) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
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
                        <div class="detail-item-value name-val">${escapeHtml(data.name)}</div>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-icon">🏷️</div>
                    <div class="detail-item-content">
                        <div class="detail-item-label">CH Code</div>
                        <div class="detail-item-value code-val">${escapeHtml(data.code)}</div>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-icon">📊</div>
                    <div class="detail-item-content">
                        <div class="detail-item-label">OB — Outstanding Balance</div>
                        <div class="detail-item-value amount-val">₱${escapeHtml(data.ob)}</div>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-icon">📅</div>
                    <div class="detail-item-content">
                        <div class="detail-item-label">PD — Past Due</div>
                        <div class="detail-item-value amount-val">₱${escapeHtml(data.pd)}</div>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-icon">💳</div>
                    <div class="detail-item-content">
                        <div class="detail-item-label">MAD — Minimum Amount Due</div>
                        <div class="detail-item-value amount-val">₱${escapeHtml(data.mad)}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function showMessage(type, title, message, icon) {
    const resultDiv = document.getElementById('result');
    const isError = type === 'error';
    
    resultDiv.innerHTML = `
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

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') performSearch();
});

window.addEventListener('load', function() {
    document.getElementById('searchInput').focus();
});
