# Viakix Influencer Database (Demo)

A modern, interactive demo application for managing influencer data with a clean UI and comprehensive features.

## Features

### 🎨 Modern UI/UX
- **Orange & Gray Theme**: Professional color scheme using Viakix brand colors (#f97316 orange, #6b7280 gray)
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Clean Typography**: Uses Inter/system fonts for excellent readability
- **Viakix Branding**: Includes logo in header for brand consistency

### 🔍 Filtering & Search
- **State Filter**: Filter influencers by state using a dropdown menu
- **Text Search**: Search by name or social handle in real-time
- **Combined Filters**: Use multiple filters together for precise results

### 📄 Pagination
- **Client-side Pagination**: Browse through results with 10 items per page
- **Page Navigation**: Previous/Next buttons and direct page number selection
- **Results Counter**: Shows current range (e.g., "Showing 1-10 of 45")

### ✏️ Editing Capabilities
- **Inline Editing**: Click any cell in the table to edit directly
- **Detail View**: Click "View/Edit" to see a dedicated editing page for any influencer
- **Persistent Changes**: All edits are automatically saved to Supabase
- **Real-time Updates**: Changes sync across all connected clients

### 📊 Data Management
- **Export to CSV**: Export filtered results to CSV format
- **Refresh Data**: Manually refresh to see latest updates
- **Real-time Sync**: Automatically updates when data changes

### 🔐 Authentication
- **Magic Link Sign-in**: Passwordless authentication via email
- **Session Management**: Persistent sessions with sign-out capability

## Project Structure

```
├── index.html           # Main HTML file with structure
├── assets/
│   ├── styles.css      # Complete styling with CSS variables
│   ├── app.js          # Application logic and functionality
│   └── viakix-logo.svg # Viakix logo
└── README.md           # This file
```

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL database with real-time capabilities)
- **Styling**: Pure CSS with CSS variables for theming
- **Deployment**: Vercel (static site hosting)

## Database Schema

The application uses a `public.influencers` table with the following fields:

- `id` (UUID) - Primary key
- `name` (text) - Influencer name
- `email` (text) - Contact email
- `social_platform` (text) - Platform (e.g., Instagram, TikTok)
- `social_handle` (text) - Social media handle
- `category` (text) - Content category
- `state` (text) - US state
- `followers` (integer) - Follower count
- `engagement_rate` (decimal) - Engagement percentage
- `view_rate` (decimal) - View rate percentage
- `contacted` (boolean) - Contact status
- `created_at` (timestamp) - Record creation time

## Usage

### Viewing Data
1. The table loads automatically on page load
2. Use the state filter dropdown to filter by specific states
3. Use the search box to find influencers by name or handle
4. Navigate through pages using the pagination controls

### Editing Data
**Option 1: Inline Editing**
1. Click any cell in the table (except 'contacted')
2. Edit the value
3. Click the "Save" button for that row

**Option 2: Detail View**
1. Click the "View/Edit" button on any row
2. Edit fields in the form
3. Click "Save Changes" to update
4. Click "Back to List" to return to the table view

### Exporting Data
1. Apply any filters/search you want
2. Click "Export CSV"
3. Only the currently filtered results will be exported

### Authentication
1. Enter your email address
2. Click "Send magic link"
3. Check your email and click the link
4. You'll be signed in automatically

## Development

### Local Testing
Simply open `index.html` in a modern web browser. The application uses ES6 modules and requires a web server for proper functionality.

You can use Python's built-in server:
```bash
python3 -m http.server 8000
```

Or Node.js with `http-server`:
```bash
npx http-server
```

Then visit `http://localhost:8000`

### Supabase Configuration
The Supabase URL and anonymous key are embedded in the HTML file. For production use, consider moving these to environment variables in your deployment platform (e.g., Vercel).

## Accessibility

- Semantic HTML structure
- Sufficient color contrast ratios
- Keyboard navigation support
- Focus indicators on interactive elements
- Responsive text sizing

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

Potential improvements for future versions:
- Server-side filtering and pagination for large datasets
- Bulk edit capabilities
- Advanced filtering options (date ranges, multiple platforms)
- Data visualization and analytics
- Image uploads for influencer profiles
- Tag management system
- Export to other formats (Excel, PDF)

## License

This is a demo application. Check with the repository owner for licensing details.

## Support

For issues or questions, please open an issue on the GitHub repository.

---

**Branch**: feat/ui-enhancements
