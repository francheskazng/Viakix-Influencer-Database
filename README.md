# VIAKIX Influencer Database (Demo)

A client-side web application for managing influencer outreach campaigns with VIAKIX branding.

## Features

### UI/UX
- **VIAKIX Branding**: Orange (#ff6b00) and gray color theme
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern Typography**: Inter font family with clean spacing

### Influencer Management
- **Editable Table**: Inline editing of influencer details (name, email, social info, etc.)
- **Multi-Page Views**: 
  - List view with all influencers
  - Detail/Edit view for comprehensive editing
- **Real-time Updates**: Changes sync across all connected clients via Supabase

### Filtering & Search
- **State Filter**: Filter influencers by state (dropdown)
- **Live Search**: Search by name or social handle
- **Pagination**: Client-side pagination with 10 items per page

### Outreach Workflow
- **Product Offers**: Toggle 6 sandal products per influencer (Cortona, Samara, Siena, Acadia, Monterra, Rebel)
- **Outreach Selection**: Mark influencers for outreach campaign
- **Campaign Fields**: Add campaign name and custom message per influencer
- **Persistence**: All selections saved to `outreach_log` JSONB field in Supabase

### CSV Export
Three export modes optimized for Instantly.ai:
- **Export Selected for Outreach**: Only rows marked for outreach (default)
- **Export Filtered**: Current filter results
- **Export All**: Entire database

CSV includes: name, email, offered_products, social_platform, social_handle, followers, notes, influencer_id, campaign_name, custom_message

Optional: Mark exported rows as contacted

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend**: Supabase (PostgreSQL + real-time subscriptions)
- **Authentication**: Supabase Auth with magic links
- **Deployment**: Vercel (static hosting)

## File Structure

```
├── index.html              # Main HTML file
├── assets/
│   ├── styles.css         # VIAKIX theme and responsive styles
│   ├── app.js             # Application logic
│   └── viakix-logo.svg    # VIAKIX logo
└── README.md              # This file
```

## Setup

1. The app uses an existing Supabase project with anon key embedded in `assets/app.js`
2. Deploy to Vercel or any static hosting service
3. No build step required - pure client-side application

## Database Schema

The app expects an `influencers` table with these columns:
- `id` (uuid, primary key)
- `name` (text)
- `email` (text)
- `social_platform` (text)
- `social_handle` (text)
- `category` (text)
- `state` (text)
- `followers` (integer)
- `engagement_rate` (numeric)
- `view_rate` (numeric)
- `contacted` (boolean)
- `notes` (text)
- `outreach_log` (jsonb) - stores offers, selected_for_outreach, campaign_name, custom_message
- `created_at` (timestamp)

## Usage

### List View
1. Filter by state using the dropdown
2. Search by name or handle in the search box
3. Toggle product offers by clicking product buttons
4. Check "Select for outreach" to mark influencers for export
5. Click "Save" to persist inline edits
6. Click "View/Edit" to open detail view
7. Use pagination to navigate through results

### Detail/Edit View
1. Edit all influencer fields in dedicated form
2. Toggle product offers
3. Add campaign name and custom message
4. Mark for outreach selection
5. Click "Save Changes" to persist
6. Click "Back to List" to return

### Export CSV
1. Click "Export CSV" button
2. Choose export mode:
   - Selected for Outreach (recommended for campaigns)
   - Filtered (current view)
   - All (entire database)
3. Optionally check "Mark exported as contacted"
4. CSV file downloads automatically

### Authentication
- Click "Send magic link" with your email
- Check email and click the link
- Once authenticated, you can edit data
- Click "Sign out" to end session

## Development

No build process required. To make changes:
1. Edit files directly
2. Refresh browser to see changes
3. All state management is client-side
4. Supabase handles data persistence

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Notes

- All data operations are client-side filtering/pagination
- Real-time sync via Supabase WebSocket channels
- Auth uses Supabase magic links (passwordless)
- CSV export happens entirely in browser (no server)
- Product toggles and outreach selection persist to `outreach_log` JSONB field
