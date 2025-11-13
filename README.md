# VIAKIX Influencer Database

A streamlined influencer outreach management tool with VIAKIX branding and workflow optimization.

## Features

### 🎨 VIAKIX Brand Theme
- Custom orange (#ff6b00) and gray color scheme
- Professional typography with Inter/system fonts
- Responsive design for desktop and mobile
- Clean, modern card-based layout

### 🔍 Advanced Filtering & Search
- **State Filter**: Filter influencers by geographic location
- **Live Search**: Real-time search by name or social handle
- **Pagination**: Browse through influencers with 10 per page (customizable)

### 👥 Multi-Page Navigation
- **List View** (`#/list`): Main table with all influencers
- **Detail/Edit View** (`#/influencer/:id`): Full editing interface for individual influencers

### 🎁 Product Offer Management
Select from 6 VIAKIX sandal products per influencer:
- Cortona
- Samara
- Siena
- Acadia
- Monterra
- Rebel

Product selections are stored in the `outreach_log` JSONB field and included in CSV exports.

### 📧 Outreach Campaign Management
- **Selection Toggle**: Mark influencers for outreach campaigns
- **Separate from Products**: Product offers don't auto-select for outreach (prevents accidental contact)
- **Tracked in Database**: All selections persisted to Supabase `outreach_log` field

### 📊 CSV Export Modes

Export data tailored for [Instantly.ai](https://instantly.ai) import:

1. **Export Selected for Outreach** (default): Only influencers marked for outreach
2. **Export Filtered**: Currently filtered results from search/state filters
3. **Export All**: Complete database export

**CSV Columns:**
- name
- email
- offered_products (comma-separated list)
- social_platform
- social_handle
- followers
- notes
- influencer_id
- campaign_name (optional)
- custom_message (optional, per-influencer)

**Optional Feature:** Check "Mark exported as contacted" to automatically update the `contacted` flag for exported influencers.

### ✏️ Inline & Detail Editing
- **List View**: Quick inline editing of key fields with Save button
- **Detail View**: Full-featured form with all fields including:
  - Basic info (name, email, social accounts)
  - Metrics (followers, engagement rate, view rate)
  - Campaign fields (campaign name, custom message)
  - Notes
  - Product offers
  - Outreach selection

### 🔐 Authentication
- Magic link authentication via Supabase
- Session management
- Secure API access using existing anon key

### ⚡ Real-time Updates
- Automatic refresh when data changes
- PostgreSQL change subscriptions via Supabase

## Technical Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Hosting**: Vercel (or any static host)
- **Data Storage**: `outreach_log` JSONB field for all selection state

## File Structure

```
/
├── index.html              # Main HTML file with app structure
├── assets/
│   ├── styles.css         # VIAKIX-themed CSS with responsive layout
│   ├── app.js             # Application logic and Supabase integration
│   └── viakix-logo.svg    # VIAKIX logo
└── README.md              # This file
```

## Setup & Deployment

1. **No build step required** - pure client-side application
2. Supabase credentials are embedded (existing anon key from repo)
3. Deploy to Vercel, Netlify, or any static hosting service
4. Ensure CORS is properly configured in Supabase dashboard

## Usage

### Filtering Influencers
1. Use the **State** dropdown to filter by geographic location
2. Type in the **Search** box to filter by name or social handle
3. Both filters work together

### Managing Product Offers
1. Click product buttons (Cortona, Samara, etc.) to toggle offers
2. Active products are highlighted in orange
3. Changes save automatically to Supabase

### Preparing Outreach Campaigns
1. Toggle product offers for each influencer
2. Check the "Select for outreach" checkbox for influencers you want to contact
3. Use **Export CSV** → **Export Selected for Outreach** to generate import file
4. Optionally check "Mark exported as contacted" before export

### Editing Influencer Details
1. Click **View/Edit** button in any row
2. Edit all fields in the detail form
3. Manage product offers and outreach selection
4. Click **Save Changes** to persist
5. Click **Back to List** to return

### CSV Export for Instantly.ai
1. Click **Export CSV ▾** dropdown
2. Select export mode:
   - **Selected for Outreach**: Only checked influencers
   - **Filtered**: Current search/filter results
   - **All**: Complete database
3. Optionally enable "Mark exported as contacted"
4. Import CSV into Instantly.ai for email outreach

## Database Schema

The app uses the existing `influencers` table with the following key fields:

- Standard fields: `name`, `email`, `social_platform`, `social_handle`, `state`, `followers`, etc.
- **`outreach_log`** (JSONB): Stores all UI state
  ```json
  {
    "offers": ["Cortona", "Siena"],
    "selected_for_outreach": true,
    "campaign_name": "Summer 2024",
    "custom_message": "Love your hiking content!"
  }
  ```

## Browser Support

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile responsive for iOS and Android

## License

Proprietary - VIAKIX Internal Tool
