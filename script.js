const API_URL = 'https://script.google.com/macros/s/AKfycbzGZm2zuKUATbQE3ZqMTZusnTZ4MuVP8is3Z57moqAuCxrzqKU4Le4Kw4k8ZDLXf15P/exec';

let isSplitMode = false;
let currentAccounts = [];

// Cache DOM elements for better performance
let cachedSearchInput = null;
let cachedResultDiv = null;
let cachedLoadingDiv = null;
let cachedSearchBtn = null;

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

window.performSearch = performSearch;

async function performSearch() {
    if (!cachedSearchInput) cachedSearchInput = document.getElementById('searchInput');
    if (!cachedResultDiv) cachedResultDiv = document.getElementById('result');
    if (!cachedLoadingDiv) cachedLoadingDiv = document.getElementById('loading');
    if (!cachedSearchBtn) cachedSearchBtn = document.getElementById('searchBtn');
    
    const searchTerm = cachedSearchInput?.value.trim();
    
    if (!searchTerm) {
        showMessage('error', 'No query entered', 'Please enter a name, CH code, or amount to search the database.', '🔍');
        if (cachedSearchInput) cachedSearchInput.focus();
        return;
    }

    if (cachedResultDiv) cachedResultDiv.innerHTML = '';
    
    if (!cachedLoadingDiv) {
        const resultsArea = document.querySelector('.results-area');
        if (resultsArea) {
            const loadingHTML = `
                <div id="loading" class="loading">
                    <div class="loading-inner">
                        <div class="loader-ring"></div>
                        <p class="loading-text">Querying database</p>
                    </div>
                </div>
            `;
            resultsArea.insertAdjacentHTML('afterbegin', loadingHTML);
            cachedLoadingDiv = document.getElementById('loading');
        }
    }
    
    if (cachedLoadingDiv) {
        cachedLoadingDiv.style.display = 'block';
        cachedLoadingDiv.classList.add('active');
    }
    
    if (cachedSearchBtn) cachedSearchBtn.disabled = true;
    if (cachedSearchInput) cachedSearchInput.disabled = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const url = `${API_URL}?q=${encodeURIComponent(searchTerm)}`;
        console.log('Fetching:', url);
        
        const response = await fetch(url, {
            signal: controller.signal,
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Data received:', data);

        if (cachedLoadingDiv) {
            cachedLoadingDiv.style.display = 'none';
            cachedLoadingDiv.classList.remove('active');
        }
        
        if (cachedSearchBtn) cachedSearchBtn.disabled = false;
        if (cachedSearchInput) cachedSearchInput.disabled = false;
        if (cachedSearchInput) cachedSearchInput.focus();

        if (data.found && data.data) {
            const allResults = data.allResults || [data.data];
            const totalResults = data.totalResults || 1;
            
            if (totalResults >= 2) {
                currentAccounts = allResults;
                renderMiniCards(allResults);
            } else {
                currentAccounts = [];
                exitSplitMode();
                displayResult(data.data);
            }
        } else {
            showMessage('error', 'Account Not Found', 'No accounts matched your search. This account is negative for field visit.', '📭');
            exitSplitMode();
            currentAccounts = [];
        }

    } catch (error) {
        console.error('Fetch error:', error);
        
        if (cachedLoadingDiv) {
            cachedLoadingDiv.style.display = 'none';
            cachedLoadingDiv.classList.remove('active');
        }
        if (cachedSearchBtn) cachedSearchBtn.disabled = false;
        if (cachedSearchInput) cachedSearchInput.disabled = false;
        
        let errorMessage = 'Unable to connect to the database. ';
        
        if (error.name === 'AbortError') {
            errorMessage = 'Request timeout. Please try again.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Cannot reach the server. Please check:\n1. Apps Script is deployed\n2. Deployment has "Execute as: Me" and "Access: Anyone"\n3. You have internet connection';
        } else {
            errorMessage += error.message;
        }
        
        showMessage('error', 'Connection Error', errorMessage, '🔌');
        exitSplitMode();
        currentAccounts = [];
    }
}

function renderMiniCards(accounts) {
    const mainElement = document.getElementById('mainContainer');
    const appRoot = document.getElementById('appRoot');
    
    const currentSearchValue = cachedSearchInput?.value || '';
    
    let resultsHTML = `
        <div class="results-area">
            <div class="virtual-scroll-container" id="virtualScrollContainer">
                <div class="mini-cards-container" id="miniCardsContainer">
    `;
    
    accounts.forEach((account, index) => {
        const shortName = account.name.length > 35 ? account.name.substring(0, 32) + '...' : account.name;
        const status = account.status ? account.status.toLowerCase() : 'active';
        const statusClass = status === 'pullout' ? 'status-pullout' : 'status-active';
        const statusText = status === 'pullout' ? '✗ PULLOUT' : '✓ GO';
        
        resultsHTML += `
            <div class="mini-card scroll-item" data-index="${index}" data-scroll-index="${index}" onclick="showAccountDetails(${index})">
                <div class="mini-card-icon">👤</div>
                <div class="mini-card-info">
                    <div class="mini-card-name">${escapeHtml(shortName)}</div>
                    <div class="mini-card-code">${escapeHtml(account.code)}</div>
                    <div class="mini-card-status ${statusClass}">${statusText}</div>
                </div>
                <div class="mini-card-arrow">→</div>
            </div>
        `;
    });
    
    resultsHTML += `
                </div>
            </div>
            <div id="full-detail-container" style="display: none;"></div>
        </div>
    `;
    
    const heroHTML = document.querySelector('.hero')?.outerHTML || '';
    const searchPanelHTML = document.querySelector('.search-panel')?.outerHTML || '';
    
    appRoot.innerHTML = `
        <div class="split-container">
            <div class="split-left">
                ${heroHTML}
                ${searchPanelHTML}
            </div>
            <div class="split-right" id="splitRightContainer">
                ${resultsHTML}
            </div>
        </div>
    `;
    
    mainElement.classList.add('split-mode');
    isSplitMode = true;
    
    setTimeout(() => {
        attachEventListeners(currentSearchValue);
        initScrollFadeEffect();
    }, 50);
}

function initScrollFadeEffect() {
    const container = document.getElementById('splitRightContainer');
    if (!container) return;
    
    container.addEventListener('scroll', handleScrollFade, { passive: true });
    setTimeout(() => handleScrollFade(), 10);
}

function handleScrollFade() {
    const container = document.getElementById('splitRightContainer');
    const items = document.querySelectorAll('.scroll-item');
    if (!container || !items.length) return;
    
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;
    const fadeRange = containerRect.height / 2;
    
    requestAnimationFrame(() => {
        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.top + itemRect.height / 2;
            const distanceFromCenter = Math.abs(itemCenter - containerCenter);
            
            let opacity = 1 - (distanceFromCenter / fadeRange);
            opacity = Math.max(0.2, Math.min(1, opacity));
            
            let scale = 1 - (distanceFromCenter / fadeRange) * 0.1;
            scale = Math.max(0.9, Math.min(1, scale));
            
            item.style.opacity = opacity;
            item.style.transform = `scale(${scale})`;
            item.style.transition = 'opacity 0.1s ease-out, transform 0.1s ease-out';
        });
    });
}

window.showAccountDetails = function(index) {
    const account = currentAccounts[index];
    if (!account) return;
    
    const fullDetailContainer = document.getElementById('full-detail-container');
    const miniCardsContainer = document.getElementById('miniCardsContainer');
    
    if (fullDetailContainer && miniCardsContainer) {
        miniCardsContainer.style.display = 'none';
        
        fullDetailContainer.style.display = 'block';
        fullDetailContainer.innerHTML = `
            <div class="full-detail-view">
                <button class="back-to-results-btn" onclick="backToResults()">
                    ← Back
                </button>
                ${generateFullDetailCard(account)}
            </div>
        `;
        
        const splitRight = document.querySelector('.split-right');
        if (splitRight) splitRight.scrollTop = 0;
    }
};

window.backToResults = function() {
    const fullDetailContainer = document.getElementById('full-detail-container');
    const miniCardsContainer = document.getElementById('miniCardsContainer');
    
    if (fullDetailContainer && miniCardsContainer) {
        fullDetailContainer.style.display = 'none';
        miniCardsContainer.style.display = 'flex';
        fullDetailContainer.innerHTML = '';
        setTimeout(() => handleScrollFade(), 10);
    }
};

function generateFullDetailCard(data) {
    const status = data.status ? data.status.toLowerCase() : 'active';
    const isPullout = status === 'pullout';
    const badgeText = isPullout ? '✗ PULLOUT' : '✓ GO';
    const badgeClass = isPullout ? 'card-badge-pullout' : 'card-badge';
    const headerClass = isPullout ? 'card-header-pullout' : 'card-header';
    const resultCardClass = isPullout ? 'result-card pullout' : 'result-card success';
    
    return `
        <div class="${resultCardClass}">
            <div class="${headerClass}">
                <div class="card-header-icon">${isPullout ? '✗' : '✓'}</div>
                <div class="card-header-info">
                    <div class="card-header-title">Account ${isPullout ? 'Not Eligible' : 'Verified'}</div>
                    <div class="card-header-sub">${isPullout ? 'PULLOUT - NOT ELIGIBLE FOR FIELD VISIT' : 'CONFIRMED IN DATABASE · ELIGIBLE FOR FIELD VISIT'}</div>
                </div>
                <span class="${badgeClass}">${badgeText}</span>
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
                <div class="detail-item">
                    <div class="detail-item-icon">📌</div>
                    <div class="detail-item-content">
                        <div class="detail-item-label">Status</div>
                        <div class="detail-item-value status-val ${isPullout ? 'status-pullout' : 'status-active'}">${escapeHtml(data.status || 'Active')}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function exitSplitMode() {
    if (!isSplitMode) return;
    
    const mainElement = document.getElementById('mainContainer');
    const appRoot = document.getElementById('appRoot');
    const currentSearchValue = cachedSearchInput?.value || '';
    
    appRoot.innerHTML = `
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
                <input type="text" id="searchInput" placeholder="Search by Name or CH code" autocomplete="off" autocorrect="off" spellcheck="false"/>
                <button id="searchBtn">
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
    
    mainElement.classList.remove('split-mode');
    isSplitMode = false;
    currentAccounts = [];
    
    cachedSearchInput = null;
    cachedResultDiv = null;
    cachedLoadingDiv = null;
    cachedSearchBtn = null;
    
    setTimeout(() => {
        attachEventListeners(currentSearchValue);
    }, 0);
}

function attachEventListeners(savedSearchValue) {
    cachedSearchInput = document.getElementById('searchInput');
    cachedSearchBtn = document.getElementById('searchBtn');
    
    if (cachedSearchInput) {
        cachedSearchInput.value = savedSearchValue || '';
        const newSearchInput = cachedSearchInput.cloneNode(true);
        if (cachedSearchInput.parentNode) {
            cachedSearchInput.parentNode.replaceChild(newSearchInput, cachedSearchInput);
        }
        newSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
        setTimeout(() => newSearchInput.focus(), 0);
        cachedSearchInput = newSearchInput;
    }
    
    if (cachedSearchBtn) {
        const newSearchBtn = cachedSearchBtn.cloneNode(true);
        if (cachedSearchBtn.parentNode) {
            cachedSearchBtn.parentNode.replaceChild(newSearchBtn, cachedSearchBtn);
        }
        newSearchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            performSearch();
        });
        cachedSearchBtn = newSearchBtn;
    }
}

function displayResult(data) {
    cachedResultDiv = document.getElementById('result');
    if (!cachedResultDiv) return;
    
    cachedResultDiv.innerHTML = generateFullDetailCard(data);
}

function showMessage(type, title, message, icon) {
    cachedResultDiv = document.getElementById('result');
    if (!cachedResultDiv) return;
    
    const isError = type === 'error';
    cachedResultDiv.innerHTML = `
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

window.addEventListener('load', function() {
    attachEventListeners('');
});
