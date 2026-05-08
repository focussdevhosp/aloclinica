I will perform a total overhaul of the admin experience to make it more functional, intuitive, and professional for the platform owner.

### Command Center (Admin Dashboard)
- Redesign the Panel Center into a true Command Center.
- Add **Quick Actions** for high-priority tasks (e.g., "Approve Pending Doctors", "Export Financial Report", "System Diagnosis").
- Enhance the **Real-time Pulse** with more granular metrics (Total Revenue, Active Consultations, System Uptime).
- Add a **Recent Activity** feed to track critical changes across the platform.

### WhatsApp & Integrations
- Improve the **AdminWhatsApp** UI to handle configuration errors gracefully.
- Provide a clear, non-technical setup guide for the Evolution API integration.
- Standardize the connection monitoring status.

### Financial Management
- Polish the **AdminFinancial** dashboard with better data visualization.
- Ensure withdrawal requests are prominent and easy to process.

### UI/UX Consistency
- Unify headers and layouts across all 15+ admin sub-pages using the `AdminPageHeader` component.
- Improve mobile responsiveness for the entire admin suite.

### Technical Details
- Update `PanelCenter.tsx` to include new dashboard widgets and activity tracking.
- Refactor `AdminWhatsApp.tsx` for better error messaging and setup instructions.
- Ensure `adminNav.tsx` groups related features logically.
