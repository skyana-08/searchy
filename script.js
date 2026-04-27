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
                    <div class
