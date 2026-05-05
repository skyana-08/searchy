const express = require('express');
const session = require('express-session');
const { google } = require('googleapis');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static(__dirname));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1 hour
}));

// Google Sheets authentication
const auth = new google.auth.JWT(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.json({ success: false, message: "Please enter both email and password" });
    }
    
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: 'Accounts!A:H',
        });
        
        const rows = response.data.values || [];
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const storedEmail = row[0]?.toString().toLowerCase();
            const storedPassword = row[1]?.toString();
            const firstName = row[2]?.toString() || '';
            const lastName = row[3]?.toString() || '';
            const status = row[7]?.toString().toUpperCase() || 'ACTIVE';
            
            if (storedEmail === email.toLowerCase()) {
                if (status === 'INACTIVE') {
                    return res.json({ success: false, message: "This Account is INACTIVE", inactive: true });
                }
                
                if (storedPassword === password) {
                    const isFirstLogin = (password === 'changeme123' || password === firstName + lastName);
                    req.session.user = { 
                        email, 
                        firstName, 
                        lastName, 
                        requiresPasswordChange: isFirstLogin 
                    };
                    return res.json({ 
                        success: true, 
                        requiresPasswordChange: isFirstLogin, 
                        email, 
                        firstName, 
                        lastName 
                    });
                }
                return res.json({ success: false, message: "Invalid password" });
            }
        }
        res.json({ success: false, message: "Account not found" });
    } catch (error) {
        console.error('Login error:', error);
        res.json({ success: false, message: "Database error" });
    }
});

// Change password endpoint
app.post('/api/change-password', async (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: "Session expired" });
    }
    
    const { email, currentPassword, newPassword } = req.body;
    
    if (!email || !currentPassword || !newPassword) {
        return res.json({ success: false, message: "All fields are required" });
    }
    
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: 'Accounts!A:H',
        });
        
        const rows = response.data.values || [];
        
        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0]?.toString().toLowerCase() === email.toLowerCase()) {
                if (rows[i][1]?.toString() !== currentPassword) {
                    return res.json({ success: false, message: "Current password is incorrect" });
                }
                
                await sheets.spreadsheets.values.update({
                    spreadsheetId: process.env.SPREADSHEET_ID,
                    range: `Accounts!B${i + 1}`,
                    valueInputOption: 'RAW',
                    resource: { values: [[newPassword]] }
                });
                
                req.session.user.requiresPasswordChange = false;
                return res.json({ success: true, message: "Password changed successfully" });
            }
        }
        res.json({ success: false, message: "User not found" });
    } catch (error) {
        console.error('Password change error:', error);
        res.json({ success: false, message: "Error updating password" });
    }
});

// Check session endpoint
app.get('/api/check-session', (req, res) => {
    res.json({ valid: !!req.session.user, userData: req.session.user || null });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Search endpoint (modified to use your sheet structure)
app.get('/api/search', async (req, res) => {
    if (!req.session.user) {
        return res.json({ error: "Session expired" });
    }
    
    const searchTerm = req.query.q?.trim();
    if (!searchTerm) {
        return res.json({ error: "Please enter a search term" });
    }
    
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: 'Sheet1!A:F', // Adjust this range to match your data sheet
        });
        
        const data = response.data.values || [];
        const results = [];
        const searchLower = searchTerm.toLowerCase();
        
        function formatCurrency(value) {
            if (typeof value === 'number') {
                return value.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }
            if (value && !isNaN(parseFloat(value))) {
                return parseFloat(value).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }
            return value || '0.00';
        }
        
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const name = row[0]?.toString().trim() || '';
            const code = row[1]?.toString().trim() || '';
            const ob = row[2];
            const pd = row[3];
            const mad = row[4];
            const status = row[5]?.toString().trim() || 'Active';
            
            if (name.toLowerCase() === searchLower || code.toLowerCase() === searchLower) {
                results.push({
                    name: name,
                    code: code,
                    ob: formatCurrency(ob),
                    pd: formatCurrency(pd),
                    mad: formatCurrency(mad),
                    status: status
                });
            }
        }
        
        if (results.length > 0) {
            res.json({ 
                found: true, 
                data: results[0], 
                totalResults: results.length, 
                allResults: results 
            });
        } else {
            res.json({ found: false, message: "No exact match found" });
        }
    } catch (error) {
        console.error('Search error:', error);
        res.json({ error: "Database query error" });
    }
});

// Serve main.html only if authenticated
app.get('/main.html', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'main.html'));
});

// Serve all other static files
app.get('*', (req, res) => {
    if (req.path === '/' || req.path === '') {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, req.path));
    }
});

module.exports = app;
