const API_URL = 'https://script.google.com/macros/s/AKfycbwCUIWiSxQ7XRcgXcZ2gMh5QNqS4U2Nu8h1bdeb3Yd3m1uxuUs3LcC79vI17CUYbZ8J/exec';

let isSplitMode = false;
let currentAccounts = [];
let scrollContainer = null;
let fadeTimeout = null;

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
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
        console.error('Search input not found');
        return;
    }
    
    const searchTerm = searchInput.value.trim();
    const resultDiv = document.getElementById('result');
    let loadingDiv = document.getElementById('loading');
    const searchBtn = document.getElementById('searchBtn');

    if (!searchTerm) {
        showMessage('error', 'No query entered', 'Please enter a name, CH code, or amount to search the database.', '🔍');
        if (searchInput) searchInput.focus();
        return;
    }

    if (resultDiv) resultDiv.innerHTML = '';
    
    if (!loadingDiv) {
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
            loadingDiv = document.getElementById('loading');
        }
    }
    
    if (loadingDiv) {
        loadingDiv.style.display = 'block';
        loadingDiv.classList.add('active');
    }
    
    if (searchBtn) searchBtn.disabled = true;
    if (searchInput) searchInput.disabled = true;

    try {
        const response = await fetch(`${API_URL}?q=${encodeURIComponent(searchTerm)}`);

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        if (loadingDiv) {
            loadingDiv.style.display = 'none';
            loadingDiv.classList.remove('active');
        }
        
        if (searchBtn) searchBtn.disabled = false;
        if (searchInput) searchInput.disabled = false;
        if (searchInput) searchInput.focus();

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
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
            loadingDiv.classList.remove('active');
        }
        if (searchBtn) searchBtn.disabled = false;
        if (searchInput) searchInput.disabled = false;
        showMessage('error', 'Connection Error', 'Unable to connect to the database. Please check your connection and try again.', '🔌');
        exitSplitMode();
        currentAccounts = [];
        console.error('Search error:', error);
    }
}

function renderMiniCards(accounts) {
    const mainElement = document.getElementById('mainContainer');
    const appRoot = document.getElementById('appRoot');
    
    const currentSearchValue = document.getElementById('searchInput')?.value || '';
    const totalResults = accounts.length;
    const needsScrollableContainer = totalResults >= 5;
    
    let resultsHTML = `
        <div class="results-container">
    `;
    
    if (needsScrollableContainer) {
        resultsHTML += `<div class="scrollable-container" id="resultsScrollContainer">`;
    }
    
    resultsHTML += `<div class="mini-cards-container">`;
    
    accounts.forEach((account, index) => {
        const shortName = account.name.length > 35 ? account.name.substring(0, 32) + '...' : account.name;
        const placement = account.placement || 'N/A';
        
        resultsHTML += `
            <div class="mini-card" data-index="${index}" onclick="showAccountDetails(${index})">
                <div class="mini-card-icon">👤</div>
                <div class="mini-card-info">
                    <div class="mini-card-name">${escapeHtml(shortName)}</div>
                    <div class="mini-card-code">${escapeHtml(account.code)}</div>
                    <div class="mini-card-placement">${escapeHtml(placement)}</div>
                </div>
                <div class="mini-card-arrow">→</div>
            </div>
        `;
    });
    
    resultsHTML += `</div>`;
    
    if (needsScrollableContainer) {
        resultsHTML += `</div>`;
    }
    
    resultsHTML += `</div>
            <div id="full-detail-container" style="display: none;"></div>
    `;
    
    const heroHTML = document.querySelector('.hero')?.outerHTML || '';
    const searchPanelHTML = document.querySelector('.search-panel')?.outerHTML || '';
    
    appRoot.innerHTML = `
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
    isSplitMode = true;
    
    setTimeout(() => {
        attachEventListeners(currentSearchValue);
        setupScrollFadeEffect();
    }, 0);
}

function setupScrollFadeEffect() {
    let container = document.querySelector('.split-right .scrollable-container');
    if (!container) {
        container = document.querySelector('.split-right');
    }
    
    if (!container) return;
    
    scrollContainer = container;
    
    const updateFadeEffect = () => {
        if (!scrollContainer) return;
        
        const containerRect = scrollContainer.getBoundingClientRect();
        const containerTop = containerRect.top;
        const containerBottom = containerRect.bottom;
        
        const cards = scrollContainer.querySelectorAll('.mini-card, .result-card');
        
        cards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            const cardTop = cardRect.top;
            const cardBottom = cardRect.bottom;
            
            const visibleTop = Math.max(containerTop, cardTop);
            const visibleBottom = Math.min(containerBottom, cardBottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            const totalCardHeight = cardRect.height;
            
            let visibilityRatio = visibleHeight / totalCardHeight;
            
            if (visibilityRatio >= 0.8) {
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
                card.classList.remove('fade-out');
            } else if (visibilityRatio >= 0.3) {
                const opacity = 0.5 + (visibilityRatio - 0.3) / 0.5 * 0.5;
                card.style.opacity = opacity;
                card.style.transform = 'scale(0.99)';
            } else {
                const opacity = Math.max(0.15, visibilityRatio / 0.3 * 0.35);
                card.style.opacity = opacity;
                card.style.transform = 'scale(0.97)';
                card.classList.add('fade-out');
            }
        });
    };
    
    const debouncedUpdate = () => {
        if (fadeTimeout) cancelAnimationFrame(fadeTimeout);
        fadeTimeout = requestAnimationFrame(updateFadeEffect);
    };
    
    scrollContainer.addEventListener('scroll', debouncedUpdate);
    window.addEventListener('resize', debouncedUpdate);
    
    updateFadeEffect();
}

window.showAccountDetails = function(index) {
    const account = currentAccounts[index];
    if (!account) return;
    
    const fullDetailContainer = document.getElementById('full-detail-container');
    let miniCardsContainer = document.querySelector('.mini-cards-container');
    let scrollableContainer = document.querySelector('.split-right .scrollable-container');
    
    if (!miniCardsContainer && scrollableContainer) {
        miniCardsContainer = scrollableContainer.querySelector('.mini-cards-container');
    }
    
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
        
        if (scrollContainer) scrollContainer.scrollTop = 0;
        
        setTimeout(() => setupScrollFadeEffect(), 0);
    }
};

window.backToResults = function() {
    const fullDetailContainer = document.getElementById('full-detail-container');
    let miniCardsContainer = document.querySelector('.mini-cards-container');
    let scrollableContainer = document.querySelector('.split-right .scrollable-container');
    
    if (!miniCardsContainer && scrollableContainer) {
        miniCardsContainer = scrollableContainer.querySelector('.mini-cards-container');
    }
    
    if (fullDetailContainer && miniCardsContainer) {
        fullDetailContainer.style.display = 'none';
        miniCardsContainer.style.display = 'flex';
        fullDetailContainer.innerHTML = '';
        
        setTimeout(() => setupScrollFadeEffect(), 0);
    }
};

function generateFullDetailCard(data) {
    const placement = data.placement || 'N/A';
    
    return `
        <div class="result-card">
            <div class="card-header">
                <div class="card-header-icon">📋</div>
                <div class="card-header-info">
                    <div class="card-header-title">Account Verified</div>
                    <div class="card-header-sub">CONFIRMED IN DATABASE · ELIGIBLE FOR FIELD VISIT</div>
                </div>
                <span class="card-badge-placement">${escapeHtml(placement)}</span>
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
                    <div class="detail-item-icon">📍</div>
                    <div class="detail-item-content">
                        <div class="detail-item-label">Placement</div>
                        <div class="detail-item-value placement-val">${escapeHtml(placement)}</div>
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
    const currentSearchValue = document.getElementById('searchInput')?.value || '';
    
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
    scrollContainer = null;
    
    setTimeout(() => {
        attachEventListeners(currentSearchValue);
    }, 0);
}

function attachEventListeners(savedSearchValue) {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    if (searchInput) {
        searchInput.value = savedSearchValue || '';
        const newSearchInput = searchInput.cloneNode(true);
        if (searchInput.parentNode) {
            searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        }
        newSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
        setTimeout(() => newSearchInput.focus(), 0);
    }
    
    if (searchBtn) {
        const newSearchBtn = searchBtn.cloneNode(true);
        if (searchBtn.parentNode) {
            searchBtn.parentNode.replaceChild(newSearchBtn, searchBtn);
        }
        newSearchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            performSearch();
        });
    }
}

function displayResult(data) {
    const resultDiv = document.getElementById('result');
    if (!resultDiv) return;
    
    resultDiv.innerHTML = generateFullDetailCard(data);
    
    setTimeout(() => {
        setupScrollFadeEffect();
    }, 0);
}

function showMessage(type, title, message, icon) {
    const resultDiv = document.getElementById('result');
    if (!resultDiv) return;
    
    resultDiv.innerHTML = `
        <div class="result-card">
            <div class="card-header">
                <div class="card-header-icon">${icon}</div>
                <div class="card-header-info">
                    <div class="card-header-title">${escapeHtml(title)}</div>
                    <div class="card-header-sub">${type === 'error' ? 'SEARCH COMPLETED — NO MATCH' : 'OPERATION SUCCESSFUL'}</div>
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
