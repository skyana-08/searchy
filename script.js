const API_URL = 'https://script.google.com/macros/s/AKfycbyfqad__CWnNJAmpiqNYM3msttU9PraIHospUDmBzjcbpuf-ZuDe0T6N_Au2Hm6U7nZ/exec';

/* ─── Theme Toggle ───────────────────────────────────── */

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

/* ─── Search ─────────────────────────────────────────── */

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

    // Clear previous results and show loading animation INSIDE results area
    resultDiv.innerHTML = '';
    loadingDiv.style.display = 'block';
    loadingDiv.classList.add('active');
    searchBtn.disabled = true;
    searchInput.disabled = true;

    try {
        const response = await fetch(`${API_URL}?q=${encodeURIComponent(searchTerm)}`);

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        // Hide loading animation
        loadingDiv.style.display = 'none';
        loadingDiv.classList.remove('active');
        searchBtn.disabled = false;
        searchInput.disabled = false;
        searchInput.focus();

        if (data.found && data.data) {
            // Get all results from API
            const allResults = data.allResults || [data.data];
            const totalResults = data.totalResults || 1;
            
            // Check if there are duplicate names OR duplicate CH codes
            const names = allResults.map(acc => acc.name?.trim().toUpperCase());
            const codes = allResults.map(acc => acc.code?.trim().toUpperCase());
            const hasDuplicateName = new Set(names).size !== names.length;
            const hasDuplicateCode = new Set(codes).size !== codes.length;
            const hasDuplicates = hasDuplicateName || hasDuplicateCode;
            
            // If 2+ results AND duplicates exist, show split screen
            if (totalResults >= 2 && hasDuplicates) {
                renderSplitScreen(allResults);
            } else {
                // Normal UI - single result or no duplicates
                resetToNormalLayout();
                displayResult(data.data);
                // If multiple results but no duplicates, show a note
                if (totalResults > 1) {
                    const note = document.createElement('div');
                    note.className = 'result-card';
                    note.style.marginTop = '16px';
                    note.innerHTML = `<div class="card-message"><p class="card-message-text"><strong>${totalResults} accounts found</strong><br>No duplicate names or CH codes. Showing first result.</p></div>`;
                    document.getElementById('result').appendChild(note);
                }
            }
        } else {
            showMessage('error', 'Account Not Found', 'No accounts matched your search. This account is negative for field visit.', '📭');
            resetToNormalLayout();
        }

    } catch (error) {
        loadingDiv.style.display = 'none';
        loadingDiv.classList.remove('active');
        searchBtn.disabled = false;
        searchInput.disabled = false;
        showMessage('error', 'Connection Error', 'Unable to connect to the database. Please check your connection and try again.', '🔌');
        resetToNormalLayout();
        console.error('Search error:', error);
    }
}

function renderSplitScreen(accounts) {
    const mainElement = document.querySelector('.main');
    const heroHTML = document.querySelector('.hero').outerHTML;
    const searchPanelHTML = document.querySelector('.search-panel').outerHTML;
    
    let resultsHTML = '<div class="results-area">';
    accounts.forEach((account, index) => {
        // Add animation delay for each result card
        const delay = index * 0.1;
        resultsHTML += `
            <div class="result-card success" style="animation: fadeSlide 0.35s ease ${delay}s both;">
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
    
    // Smooth transition - fade out old content first
    mainElement.style.opacity = '0';
    setTimeout(() => {
        mainElement.innerHTML = `
            <div class="split-container">
                <div class="split-left">
                    ${heroHTML}
                    ${searchPanelHTML}
                </div>
                <div class="split-right">
                    ${resultsHTML}
                </div>
            </div>
        `;
        mainElement.classList.add('split-mode');
        mainElement.style.opacity = '1';
        
        // Re-attach event listeners
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
    }, 200);
}

function resetToNormalLayout() {
    const mainElement = document.querySelector('.main');
    if (mainElement.classList.contains('split-mode')) {
        mainElement.style.opacity = '0';
        setTimeout(() => {
            location.reload();
        }, 200);
    }
}

function displayResult(data) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
        <div class="result-card success" style="animation: fadeSlide 0.35s ease;">
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

document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') performSearch();
});

window.addEventListener('load', function () {
    document.getElementById('searchInput').focus();
});
