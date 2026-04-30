function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const searchTerm = e.parameter.q?.toString().trim();
  
  if (!searchTerm) {
    return ContentService.createTextOutput(JSON.stringify({
      error: "Please enter a search term"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const results = [];
  const searchTermLower = searchTerm.toLowerCase();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = row[0] ? row[0].toString().trim() : '';
    const code = row[1] ? row[1].toString().trim() : '';
    const ob = row[2];
    const pd = row[3];
    const mad = row[4];
    const status = row[5] ? row[5].toString().trim() : 'Active';
    
    if (name && name.toLowerCase() === searchTermLower) {
      results.push({
        name: name,
        code: code,
        ob: formatCurrency(ob),
        pd: formatCurrency(pd),
        mad: formatCurrency(mad),
        status: status
      });
    } else if (code && code.toLowerCase() === searchTermLower) {
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
    return ContentService.createTextOutput(JSON.stringify({
      found: true,
      data: results[0],
      totalResults: results.length,
      allResults: results
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    found: false,
    message: "No exact match found. Please check your search term."
  })).setMimeType(ContentService.MimeType.JSON);
}

function formatCurrency(value) {
  if (typeof value === 'number') {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  return value;
}
