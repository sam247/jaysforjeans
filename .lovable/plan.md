

## Wire Email Signup to Google Sheet

### Approach: Google Apps Script Web App

Since there's no database connected, the simplest and free approach is to create a small Google Apps Script attached to your spreadsheet that acts as a web endpoint. The form will POST directly to it.

### Steps

1. **Create a Google Apps Script** on your spreadsheet (`1UNZltUTOZhYEthpnnZIzZ-FSZHLavjW0kgTolLnLI34`) — this is a manual step you'll do in Google Sheets:
   - Open the spreadsheet → Extensions → Apps Script
   - Paste a small script that receives POST requests and appends email + timestamp to the sheet
   - Deploy as a Web App (set to "Anyone" can access)
   - Copy the deployment URL

2. **Update `src/pages/Index.tsx`** — replace the current toast-only `handleSubmit` with a `fetch()` POST to the Apps Script URL, keeping the toast for user feedback and adding error handling.

### What You'll Need To Do

- Open your Google Sheet
- Go to Extensions → Apps Script
- I'll give you the exact script to paste
- Deploy it as a web app and share the URL back with me so I can wire it into the form

### Alternative

If you'd prefer not to do the Apps Script setup manually, we could connect Lovable Cloud + Supabase and use an edge function to call the Google Sheets API. But the Apps Script route is simpler and requires no additional services.

