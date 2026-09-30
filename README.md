# RenewCall — Insurance Renewal Follow-Up Calling System

**RenewCall** is a modern, production-ready CRM web application built specifically for insurance renewal reminder calling workflows. It features an Admin workstation for parsing Excel sheets, dynamic column mapping, bulk telecaller allocation, and custom multi-dimensional analytics, paired with a mobile-first Telecaller workstation featuring a 4-slide horizontal carousel roster and automated skip scheduling.

The user interface follows the **SALETEL** design system (dark-mode-first, glass cards, modern typography, gradient accents, and real-time status indicators).

---

## 🚀 Key Features

### 1. Authentication & Role Management
- **Two Roles**: `admin` and `telecaller`.
- **Admin Visibility**: Admins can view plain-text usernames and passwords for all telecallers with 1-click clipboard copy and toggle show/hide.
- **Default Seeded Admin**: Username `admin`, Password `admin123` (with a prompt to change password on first login).
- **Default Seeded Telecallers**:
  - `kuldeep` / `123`
  - `rohit` / `123`
  - `himanshi` / `123`

### 2. Admin Workstation
- **Dashboard Overview**: KPI stat cards, real-time line chart (*Leads Uploaded Over Time*), donut chart (*Status Distribution*), and bar chart (*Renewals Due in 7/30 Days*).
- **Upload Excel (`SheetJS`)**:
  - Browser-side parsing of `.xlsx`, `.xls`, and `.csv`.
  - First 20 rows validation preview.
  - **Dynamic Column Mapping**: Map *Customer Name*, *Phone*, and *Policy Expiry Date*. All other columns (*Vehicle Brand, Vehicle No, Policy No, Premium, Insurer, City, etc.*) are automatically stored in the `data` JSONB payload.
  - Auto-detection of Excel serial dates, `dd-mm-yyyy`, and `yyyy-mm-dd` formats.
  - Duplicate detection (same phone + policy date) with skip option.
  - Chunked insertion (500 rows per batch) with progress bar and batch deletion history.
- **Leads / Entries**:
  - Dynamic table with sticky header, horizontal scroll, and dynamic column visibility toggle.
  - Multi-filters: search, status, telecaller assignment, batch, and policy date range.
  - **Bulk Actions**: Select leads across pages to bulk assign to a telecaller, bulk unassign, or soft-delete.
  - **Auto Call Calculation**: Assigning leads automatically sets `next_call_date = policy_date - 1 month` (or today if already within 1 month).
- **Custom Dashboards (Saletel Analytics)**:
  - Choose any batch or all data and pick any Excel column names (*Brand, Insurer, City, etc.*).
  - Donut charts with distinct counts and percentage distributions.
  - Left multi-column filter panel (OR within a column, AND across columns).
  - Filtered records table with direct telecaller assignment and Excel export.
  - Save and load named custom dashboards.
- **Telecaller Reports Hub**:
  - Breakdown by telecaller: Total Assigned, Due Today, Upcoming, Skipped, Done, Closed, Reverted, and Conversion %.
  - Drill-down into any telecaller's leads with remarks and audit timeline.
- **Reverted Leads Queue**:
  - Queue of leads returned by telecallers with their specific remarks.
  - Reassign to any telecaller or mark Closed.
- **Lead Status Count**:
  - High-level overview cards with date range, batch, and telecaller filters and Excel export.

### 3. Telecaller Calling Workstation (Mobile-First)
- **4-Slide Horizontal Carousel / Slider** with tab badges:
  - **Slide 1 — Reminder Calls (Due Today)**: Leads with `status='pending'` AND `next_call_date <= today`. Includes large tap-to-call dial button, days left, overdue badge, and skip history.
  - **Slide 2 — Insurance Done**: Successfully renewed leads with recorded notes.
  - **Slide 3 — Closed**: Closed/lost leads with reason.
  - **Slide 4 — Reverted to Admin**: Leads reverted to Admin for reassignment.
- **Lead Detail Modal & Sticky Bottom Action Bar**:
  - Complete 2-column key/value layout of all dynamic Excel columns.
  - Call remarks textarea.
  - Quick action buttons: **Done**, **Skip**, **Revert**, and **Close**.
- **Skip Schedule Logic (`src/lib/skipSchedule.ts`)**:
  - First reminder due 1 month before policy date (or today).
  - Skip #1 → `today + 15 days`
  - Skip #2 → `today + 10 days`
  - Skip #3 → `today + 5 days`
  - Skip #4+ → `policy_date` (capped at policy date)
  - If skipped on or after policy date, it stays in the roster every day marked **OVERDUE** until resolved.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript (strict), Vite
- **Routing**: React Router DOM v7 with `AdminRoute` and `TelecallerRoute` guards and `React.lazy` code-splitting
- **Styling**: Tailwind CSS 3.4 (`clsx`, `tailwind-merge`) with custom SALETEL dark palette
- **Charts**: Recharts (PieChart, Donut, LineChart, BarChart)
- **Icons**: Lucide React
- **Excel Processing**: SheetJS (`xlsx`)
- **Database & Backend**: Supabase (PostgreSQL with JSONB and GIN index) + high-performance local persistent store fallback for offline zero-config operation
- **Notifications**: Sonner

---

## 📁 Project Structure

```
RenewCall/
├── public/
│   └── sample_renewals.xlsx     # Ready-to-test sample renewal Excel sheet
├── scripts/
│   └── generate_sample_excel.js # Sample generator script
├── src/
│   ├── components/
│   │   ├── auth/                # AdminRoute & TelecallerRoute guards
│   │   ├── common/              # StatCard, AssignModal, LeadDetailPanel, ConfirmationModal, ChangePasswordModal
│   │   ├── layout/              # Header, Sidebar, AdminLayout
│   │   └── telecaller/          # TelecallerLeadModal with sticky action bar
│   ├── context/
│   │   └── AuthContext.tsx      # Session management & user roles
│   ├── lib/
│   │   ├── db.ts                # Unified database service (Supabase & fallback)
│   │   ├── skipSchedule.ts      # Core skip schedule calculation engine
│   │   ├── supabase.ts          # Supabase client singleton
│   │   └── utils.ts             # cn(), date parsers, Excel exporter, phone helpers
│   ├── pages/
│   │   ├── admin/               # DashboardOverview, UploadExcel, LeadsList, CustomDashboards, RoleManagement, Reports, RevertedLeads, LeadStatusCount
│   │   ├── auth/                # LoginPage
│   │   └── telecaller/          # TelecallerRoster (4-slide carousel)
│   ├── types/
│   │   └── index.ts             # Centralized TypeScript definitions
│   ├── App.tsx                  # Main router and Suspense wrappers
│   ├── index.css                # Tailwind directives & glass aesthetics
│   └── main.tsx
├── supabase/
│   └── migration.sql            # Full PostgreSQL migration with GIN index & seeds
├── .env.example                 # Supabase environment variables example
├── tailwind.config.js           # SALETEL dark color tokens
└── package.json
```

---

## 💻 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional for Supabase)
By default, RenewCall runs in **High-Performance Local Mode** out of the box with zero external configuration needed.

To connect your Supabase database:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Set your Supabase project URL and anon key:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Run the SQL script located at [supabase/migration.sql](file:///e:/Internship/RenewCall/supabase/migration.sql) in your Supabase SQL editor.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 🧪 Testing Credentials

| Role | Username | Password | Notes |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Full administrative access, Excel upload, custom dashboards, telecaller assignment |
| **Telecaller** | `kuldeep` | `123` | 4-slide roster, tap-to-call, insurance renewal actions |
| **Telecaller** | `rohit` | `123` | Active telecaller |
| **Telecaller** | `himanshi` | `123` | Active telecaller |

A sample Excel test sheet with realistic customer renewal data is located in `sample_renewals.xlsx` and can be uploaded directly via the **Upload Excel** page.
