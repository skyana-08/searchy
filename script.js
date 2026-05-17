const API_URL = 'https://script.google.com/macros/s/AKfycbwCUIWiSxQ7XRcgXcZ2gMh5QNqS4U2Nu8h1bdeb3Yd3m1uxuUs3LcC79vI17CUYbZ8J/exec';

let isSplitMode = false;
let currentAccounts = [];
let currentSearchMode = 'single';
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
window.performBulkSearch = performBulkSearch;
window.setSearchMode = setSearchMode;

function setSearchMode(mode) {
    currentSearchMode = mode;
    
    const singleModeBtn = document.getElementById('singleModeBtn');
    const bulkModeBtn = document.getElementById('bulkModeBtn');
    const singlePanel = document.getElementById('singleSearchPanel');
    const bulkPanel = document.getElementById('bulkSearchPanel');
    
    if (mode === 'single') {
        singleModeBtn.classList.add('active');
        bulkModeBtn.classList.remove('active');
        singlePanel.style.display = 'block';
        bulkPanel.style.display = 'none';
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.focus();
    } else {
        singleModeBtn.classList.remove('active');
        bulkModeBtn.classList.add('active');
        singlePanel.style.display = 'none';
        bulkPanel.style.display = 'block';
        const bulkInput = document.getElementById('bulkSearchInput');
        if (bulkInput) bulkInput.focus();
    }
    
    const resultDiv = document.getElementById('result');
    if (resultDiv) resultDiv.innerHTML = '';
    exitSplitMode();
}

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
            showMessage('error', 'Account Not Found', `"${searchTerm}" was not found in the database.`, '📭');
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

async function performBulkSearch() {
    const bulkInput = document.getElementById('bulkSearchInput');
    if (!bulkInput) return;
    
    const bulkText = bulkInput.value.trim();
    if (!bulkText) {
        showMessage('error', 'No entries', 'Please enter search terms (one per line).', '📝');
        return;
    }
    
    const searchTerms = bulkText.split(/\r?\n/).filter(term => term.trim().length > 0);
    
    if (searchTerms.length === 0) {
        showMessage('error', 'No valid entries', 'Please enter at least one search term.', '📝');
        return;
    }
    
    const resultDiv = document.getElementById('result');
    let loadingDiv = document.getElementById('loading');
    const bulkBtn = document.getElementById('bulkSearchBtn');
    
    if (resultDiv) resultDiv.innerHTML = '';
    
    if (!loadingDiv) {
        const resultsArea = document.querySelector('.results-area');
        if (resultsArea) {
            const loadingHTML = `
                <div id="loading" class="loading">
                    <div class="loading-inner">
                        <div class="loader-ring"></div>
                        <p class="loading-text">Searching ${searchTerms.length} entries...</p>
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
    
    if (bulkBtn) bulkBtn.disabled = true;
    
    try {
        const searchPromises = searchTerms.map(async (term) => {
            try {
                const response = await fetch(`${API_URL}?q=${encodeURIComponent(term.trim())}`);
                const data = await response.json();
                return {
                    searchTerm: term.trim(),
                    found: data.found || false,
                    data: data.data || null,
                    account: data.data ? {
                        name: data.data.name,
                        code: data.data.code,
                        ob: data.data.ob,
                        pd: data.data.pd,
                        mad: data.data.mad,
                        placement: data.data.placement || 'N/A'
                    } : null
                };
            } catch (err) {
                return {
                    searchTerm: term.trim(),
                    found: false,
                    data: null,
                    account: null,
                    error: true
                };
            }
        });
        
        const results = await Promise.all(searchPromises);
        
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
            loadingDiv.classList.remove('active');
        }
        if (bulkBtn) bulkBtn.disabled = false;
        
        renderBulkResults(results);
        
    } catch (error) {
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
            loadingDiv.classList.remove('active');
        }
        if (bulkBtn) bulkBtn.disabled = false;
        showMessage('error', 'Connection Error', 'Unable to complete bulk search. Please check your connection and try again.', '🔌');
        console.error('Bulk search error:', error);
    }
}

function renderBulkResults(results) {
    const mainElement = document.getElementById('mainContainer');
    const appRoot = document.getElementById('appRoot');
    
    const heroHTML = document.querySelector('.hero')?.outerHTML || '';
    const searchModeToggleHTML = document.querySelector('.search-mode-toggle')?.outerHTML || '';
    
    let resultsHTML = `
        <div class="results-container">
            <div class="scrollable-container bulk-scroll" id="bulkResultsScrollContainer">
                <div class="bulk-results-container">
    `;
    
    results.forEach((result, index) => {
        const isFound = result.found;
        
        resultsHTML += `
            <div class="bulk-result-item" data-index="${index}">
                <div class="bulk-result-header" onclick="toggleBulkResult(${index})">
                    <div class="bulk-result-title">
                        <span class="bulk-search-term">${escapeHtml(result.searchTerm)}</span>
                        <span class="bulk-result-badge ${isFound ? 'found' : 'not-found'}">
                            ${isFound ? '✓ FOUND' : '✗ NOT FOUND'}
                        </span>
                    </div>
                    <span class="bulk-result-toggle">▶</span>
                </div>
                <div class="bulk-result-details" style="display: none;">
        `;
        
        if (isFound && result.account) {
            const account = result.account;
            const placement = account.placement || 'N/A';
            
            resultsHTML += `
                <div class="result-card" style="margin-bottom: 0;">
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
        } else {
            resultsHTML += `
                <div class="bulk-not-found-message">
                    <span style="font-size: 32px;">🔍</span>
                    <p style="margin-top: 12px; color: var(--text-muted);">No account found matching "${escapeHtml(result.searchTerm)}"</p>
                </div>
            `;
        }
        
        resultsHTML += `
                </div>
            </div>
        `;
    });
    
    resultsHTML += `
                </div>
            </div>
        </div>
    `;
    
    const singlePanelHTML = `
        <div class="search-panel" id="singleSearchPanel">
            <div class="search-field">
                <span class="search-field-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                </span>
                <input type="text" id="searchInput" placeholder="Search by Name or CH code" autocomplete="off" autocorrect="off" spellcheck="false"/>
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
    `;
    
    const bulkPanelHTML = `
        <div class="search-panel" id="bulkSearchPanel" style="display: block;">
            <div class="bulk-search-field">
                <textarea id="bulkSearchInput" rows="6" placeholder="Enter one search term per line&#10;Example:&#10;John Doe&#10;01234&#10;Jane Doe" autocomplete="off" autocorrect="off" spellcheck="false"></textarea>
                <button id="bulkSearchBtn" onclick="performBulkSearch()">
                    <span class="btn-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                        </svg>
                    </span>
                    <span>Search All</span>
                </button>
            </div>
            <div class="bulk-info">Enter one search term per line. Supports Name or CH Code.</div>
        </div>
    `;
    
    appRoot.innerHTML = `
        <div class="split-container">
            <div class="split-left">
                ${heroHTML}
                ${searchModeToggleHTML}
                ${singlePanelHTML}
                ${bulkPanelHTML}
            </div>
            <div class="split-right">
                ${resultsHTML}
            </div>
        </div>
    `;
    
    mainElement.classList.add('split-mode');
    isSplitMode = true;
    currentSearchMode = 'bulk';
    
    const singleModeBtn = document.getElementById('singleModeBtn');
    const bulkModeBtn = document.getElementById('bulkModeBtn');
    if (singleModeBtn && bulkModeBtn) {
        singleModeBtn.classList.remove('active');
        bulkModeBtn.classList.add('active');
    }
    
    setTimeout(() => {
        const newBulkBtn = document.getElementById('bulkSearchBtn');
        if (newBulkBtn) {
            const clonedBtn = newBulkBtn.cloneNode(true);
            newBulkBtn.parentNode.replaceChild(clonedBtn, newBulkBtn);
            clonedBtn.addEventListener('click', function(e) {
                e.preventDefault();
                performBulkSearch();
            });
        }
        
        const newBulkInput = document.getElementById('bulkSearchInput');
        if (newBulkInput && currentSearchMode === 'bulk') {
            newBulkInput.focus();
        }
        
        setupBulkScrollFadeEffect();
    }, 0);
}

function setupBulkScrollFadeEffect() {
    let container = document.querySelector('.split-right .bulk-scroll');
    if (!container) return;
    
    scrollContainer = container;
    
    const updateFadeEffect = () => {
        if (!scrollContainer) return;
        
        const containerRect = scrollContainer.getBoundingClientRect();
        const containerTop = containerRect.top;
        const containerBottom = containerRect.bottom;
        
        // Only target the header elements, not the expanded content
        const headers = scrollContainer.querySelectorAll('.bulk-result-header');
        
        headers.forEach(header => {
            const headerRect = header.getBoundingClientRect();
            const headerTop = headerRect.top;
            const headerBottom = headerRect.bottom;
            
            // Check if the header is visible in the container
            const isFullyVisible = headerTop >= containerTop && headerBottom <= containerBottom;
            const isPartiallyVisible = (headerBottom > containerTop && headerTop < containerBottom);
            
            if (isFullyVisible) {
                header.style.opacity = '1';
                header.style.transform = 'scale(1)';
            } else if (isPartiallyVisible) {
                // Calculate how much is visible
                const visibleTop = Math.max(containerTop, headerTop);
                const visibleBottom = Math.min(containerBottom, headerBottom);
                const visibleHeight = Math.max(0, visibleBottom - visibleTop);
                const totalHeight = headerRect.height;
                const visibilityRatio = visibleHeight / totalHeight;
                
                const opacity = Math.max(0.3, visibilityRatio);
                header.style.opacity = opacity;
                header.style.transform = 'scale(0.99)';
            } else {
                header.style.opacity = '0.15';
                header.style.transform = 'scale(0.97)';
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

window.toggleBulkResult = function(index) {
    const item = document.querySelector(`.bulk-result-item[data-index="${index}"]`);
    if (item) {
        const details = item.querySelector('.bulk-result-details');
        if (details) {
            if (details.style.display === 'none' || details.style.display === '') {
                details.style.display = 'block';
                item.classList.add('expanded');
            } else {
                details.style.display = 'none';
                item.classList.remove('expanded');
            }
        }
    }
};

function renderMiniCards(accounts) {
    const mainElement = document.getElementById('mainContainer');
    const appRoot = document.getElementById('appRoot');
    
    const currentSearchValue = document.getElementById('searchInput')?.value || '';
    const totalResults = accounts.length;
    const needsScrollableContainer = totalResults >= 5;
    
    let resultsHTML = '';
    
    if (needsScrollableContainer) {
        resultsHTML = `
            <div class="results-container">
                <div class="scrollable-container" id="resultsScrollContainer">
                    <div class="mini-cards-container">
        `;
    } else {
        resultsHTML = `
            <div class="results-container">
                <div class="mini-cards-container">
        `;
    }
    
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
    
    if (needsScrollableContainer) {
        resultsHTML += `
                    </div>
                </div>
            </div>
            <div id="full-detail-container" style="display: none;"></div>
        `;
    } else {
        resultsHTML += `
                </div>
            </div>
            <div id="full-detail-container" style="display: none;"></div>
        `;
    }
    
    const heroHTML = document.querySelector('.hero')?.outerHTML || '';
    const searchModeToggleHTML = document.querySelector('.search-mode-toggle')?.outerHTML || '';
    const singlePanelHTML = `
        <div class="search-panel" id="singleSearchPanel">
            <div class="search-field">
                <span class="search-field-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                </span>
                <input type="text" id="searchInput" placeholder="Search by Name or CH code" autocomplete="off" autocorrect="off" spellcheck="false"/>
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
    `;
    const bulkPanelHTML = `
        <div class="search-panel" id="bulkSearchPanel" style="display: none;">
            <div class="bulk-search-field">
                <textarea id="bulkSearchInput" rows="6" placeholder="Enter one search term per line&#10;Example:&#10;John Doe&#10;01234#10;Jane Doe" autocomplete="off" autocorrect="off" spellcheck="false"></textarea>
                <button id="bulkSearchBtn" onclick="performBulkSearch()">
                    <span class="btn-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                        </svg>
                    </span>
                    <span>Search All</span>
                </button>
            </div>
            <div class="bulk-info">Enter one search term per line. Supports Name or CH Code.</div>
        </div>
    `;
    
    appRoot.innerHTML = `
        <div class="split-container">
            <div class="split-left">
                ${heroHTML}
                ${searchModeToggleHTML}
                ${singlePanelHTML}
                ${bulkPanelHTML}
            </div>
            <div class="split-right">
                ${resultsHTML}
            </div>
        </div>
    `;
    
    mainElement.classList.add('split-mode');
    isSplitMode = true;
    currentSearchMode = 'single';
    
    setTimeout(() => {
        attachEventListeners(currentSearchValue);
        setupScrollFadeEffect();
    }, 0);
}

function setupScrollFadeEffect() {
    let container = document.querySelector('.split-right .scrollable-container');
    if (!container) {
        const cards = document.querySelectorAll('.mini-card, .result-card');
        cards.forEach(card => {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
        });
        return;
    }
    
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
    
    const heroHTML = document.querySelector('.hero')?.outerHTML || '';
    const searchModeToggleHTML = document.querySelector('.search-mode-toggle')?.outerHTML || '';
    
    appRoot.innerHTML = `
        <div class="hero">
            <div class="hero-eyebrow">Field Visit Verification System</div>
            <h1>SBC ACCOUNT CHECKER</h1>
            <p class="hero-sub">Search the database to verify whether an account is eligible for field visit.</p>
        </div>

        <div class="search-mode-toggle">
            <button class="mode-btn active" id="singleModeBtn" onclick="setSearchMode('single')">Single Search</button>
            <button class="mode-btn" id="bulkModeBtn" onclick="setSearchMode('bulk')">Bulk Search</button>
        </div>

        <div class="search-panel" id="singleSearchPanel">
            <div class="search-field">
                <span class="search-field-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                </span>
                <input type="text" id="searchInput" placeholder="Search by Name or CH code" autocomplete="off" autocorrect="off" spellcheck="false"/>
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

        <div class="search-panel" id="bulkSearchPanel" style="display: none;">
            <div class="bulk-search-field">
                <textarea id="bulkSearchInput" rows="6" placeholder="Enter one search term per line&#10;Example:&#10;Willy Namoca&#10;02SBCCAC2604-2377&#10;Criselda Llamosa" autocomplete="off" autocorrect="off" spellcheck="false"></textarea>
                <button id="bulkSearchBtn" onclick="performBulkSearch()">
                    <span class="btn-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                        </svg>
                    </span>
                    <span>Search All</span>
                </button>
            </div>
            <div class="bulk-info">Enter one search term per line. Supports Name or CH Code.</div>
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
    const bulkSearchBtn = document.getElementById('bulkSearchBtn');
    
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
    
    if (bulkSearchBtn) {
        const newBulkBtn = bulkSearchBtn.cloneNode(true);
        if (bulkSearchBtn.parentNode) {
            bulkSearchBtn.parentNode.replaceChild(newBulkBtn, bulkSearchBtn);
        }
        newBulkBtn.addEventListener('click', function(e) {
            e.preventDefault();
            performBulkSearch();
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
