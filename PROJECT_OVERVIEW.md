# Morning Brew Empire - Rostering SaaS Application

## 🎯 Project Overview

A multi-tenant SaaS rostering application built with Next.js 15, Supabase, and dnd-kit. This application allows organizations to manage multiple business locations with a shared employee pool, enabling efficient shift scheduling across all locations.

---

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router, Turbopack)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS v4 with ShadCN UI
- **Drag & Drop**: @dnd-kit/core
- **Language**: TypeScript

### Key Features
- ✅ Multi-tenant SaaS architecture
- ✅ Organization-scoped data isolation
- ✅ Shared employee pool across multiple locations
- ✅ Drag-and-drop shift scheduling
- ✅ Real-time database synchronization
- ✅ Dark mode by default
- ✅ Responsive design

---

## 📊 Database Schema

### Core Tables

#### `organizations`
```sql
- id (UUID, Primary Key)
- name (TEXT)
- created_at (TIMESTAMP)
```
**Purpose**: Top-level tenant isolation. Each organization is a separate customer.

#### `businesses`
```sql
- id (UUID, Primary Key)
- organization_id (UUID, Foreign Key → organizations.id)
- name (TEXT)
- location (TEXT)
- created_at (TIMESTAMP)
```
**Purpose**: Individual locations/stores within an organization (e.g., "Downtown Café", "Airport Branch").

#### `employees`
```sql
- id (UUID, Primary Key)
- organization_id (UUID, Foreign Key → organizations.id)
- name (TEXT)
- role (TEXT)
- created_at (TIMESTAMP)
```
**Purpose**: Shared employee pool at the organization level. Employees can be assigned to any business within their organization.

#### `shifts`
```sql
- id (UUID, Primary Key)
- employee_id (UUID, Foreign Key → employees.id)
- business_id (UUID, Foreign Key → businesses.id)
- organization_id (UUID, Foreign Key → organizations.id)
- day_of_week (TEXT) - "Mon", "Tue", "Wed", "Thu", "Fri"
- shift_time (TEXT) - "morning" or "afternoon"
- created_at (TIMESTAMP)
```
**Purpose**: Actual shift assignments. Links employees to specific shifts at specific businesses.

**Unique Constraint**: `(employee_id, day_of_week, shift_time)` - Prevents double-booking an employee.

#### `availability`
```sql
- id (UUID, Primary Key)
- employee_id (UUID, Foreign Key → employees.id)
- day_of_week (TEXT)
- is_available (BOOLEAN)
- created_at (TIMESTAMP)
```
**Purpose**: Tracks when employees are available to work.

---

## 🔄 Data Flow

### 1. Organization Selection (Simulated)
```typescript
const TEST_ORG_ID = '11111111-1111-1111-1111-111111111111'
```
- Currently hardcoded for testing
- In production, this would come from authentication/session

### 2. Data Loading Flow

```
page.tsx (useEffect)
    ↓
    ├─→ Load Businesses (filtered by organization_id)
    │   SELECT * FROM businesses WHERE organization_id = TEST_ORG_ID
    │   └─→ Set businesses state
    │       └─→ Auto-select first business
    │
    └─→ Load Employees (filtered by organization_id)
        SELECT * FROM employees WHERE organization_id = TEST_ORG_ID
        └─→ Set employees state (shared pool)
```

### 3. Roster Board Flow

```
RosterBoard Component
    ↓
    ├─→ Receives Props:
    │   - employees[] (shared pool)
    │   - businessId (current location)
    │
    ├─→ Load Existing Shifts (useEffect)
    │   SELECT * FROM shifts 
    │   WHERE business_id = businessId
    │   JOIN employees ON shifts.employee_id = employees.id
    │   └─→ Build assignments map: { "Mon::morning": employee, ... }
    │
    └─→ Render UI:
        ├─→ Left Sidebar: DraggableEmployee cards
        └─→ Right Grid: ShiftSlot dropzones (5 days × 2 shifts)
```

### 4. Drag & Drop Flow

```
User drags employee card
    ↓
DndContext captures drag event
    ↓
handleDragEnd(event)
    ↓
    ├─→ Extract data:
    │   - employee (from active.data.current)
    │   - day, shiftTime (from over.id)
    │
    ├─→ Optimistic UI Update:
    │   setAssignments({ ...prev, [slotId]: employee })
    │
    └─→ Database Sync:
        UPSERT into shifts (
          employee_id,
          business_id,
          organization_id,
          day_of_week,
          shift_time
        )
        ON CONFLICT (employee_id, day_of_week, shift_time)
        DO UPDATE
```

---

## 📁 Project Structure

```
roster-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (dark mode enabled)
│   │   ├── page.tsx             # Main page (Empire Command Center)
│   │   └── globals.css          # Tailwind v4 + ShadCN theme
│   │
│   ├── components/
│   │   ├── ui/                  # ShadCN components (select, badge, card)
│   │   ├── roster/
│   │   │   ├── RosterBoard.tsx         # Main scheduling grid
│   │   │   ├── DraggableEmployee.tsx   # Staff card (draggable)
│   │   │   └── ShiftSlot.tsx           # Shift slot (droppable)
│   │   ├── AvailabilityGrid.tsx # Employee availability view
│   │   └── ManagerDashboard.tsx # Manager tools
│   │
│   └── lib/
│       └── supabase.ts          # Supabase client
│
├── public/
├── .env.local                   # NEXT_PUBLIC_SUPABASE_* vars
├── postcss.config.mjs           # PostCSS with @tailwindcss/postcss
├── package.json
└── tsconfig.json
```

---

## 🎨 UI Components

### Main Page (`page.tsx`)
**Layout**: Fixed header + flexible content area

```
┌─────────────────────────────────────────────┐
│  Header (h-16)                              │
│  - Logo + Organization Info                 │
│  - Business Selector Dropdown               │
└─────────────────────────────────────────────┘
│                                              │
│  RosterBoard (flex-1)                       │
│  ├─ Left Sidebar (w-72) ─────────────────┐ │
│  │  - Available Staff List                │ │
│  │  - Draggable employee cards            │ │
│  └────────────────────────────────────────┘ │
│  │                                          │
│  └─ Right Grid (flex-1) ─────────────────┐ │
│     - 5 columns (Mon-Fri)                 │ │
│     - 2 rows per day (Morning/Afternoon)  │ │
│     - Droppable shift slots               │ │
│     └──────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### RosterBoard Component
- **Props**: `employees[]`, `businessId`
- **State**: `assignments` (maps slot IDs to employees)
- **Effects**: Loads shifts from database on mount or when `businessId` changes
- **Events**: Handles drag-and-drop to assign/reassign shifts

### DraggableEmployee Component
- Uses `useDraggable` hook from @dnd-kit
- Displays: Employee name + role
- Styling: Card with hover effects, cursor changes

### ShiftSlot Component
- Uses `useDroppable` hook from @dnd-kit
- Displays: Shift time label + assigned employee (or "Drag staff here")
- States:
  - Empty (dashed border)
  - Hover (highlighted border + ring)
  - Filled (employee name displayed)

---

## 🔐 Multi-Tenant Data Isolation

### Current Implementation (Development)
```typescript
// Hardcoded organization ID
const TEST_ORG_ID = '11111111-1111-1111-1111-111111111111'

// All queries filtered by organization
.from('businesses').select('*').eq('organization_id', TEST_ORG_ID)
.from('employees').select('*').eq('organization_id', TEST_ORG_ID)
```

### Production Implementation (Future)
```typescript
// Get from authenticated session
const { data: { user } } = await supabase.auth.getUser()
const orgId = user.user_metadata.organization_id

// Row Level Security (RLS) on Supabase
CREATE POLICY "org_isolation" ON businesses
  FOR ALL USING (organization_id = auth.jwt() ->> 'organization_id')
```

---

## 🎯 Key User Flows

### 1. Manager Assigns a Shift
1. Manager selects a business from dropdown
2. RosterBoard loads shifts for that business
3. Manager drags employee card from left sidebar
4. Manager drops on a shift slot (e.g., "Mon::morning")
5. UI updates immediately (optimistic)
6. Database records shift assignment
7. Conflict prevention: Can't double-book same employee

### 2. Employee Views Availability
1. AvailabilityGrid component loads employee data
2. Shows 7-day week grid with toggles
3. Employee clicks days they're available
4. Saves to `availability` table

### 3. Switching Between Locations
1. Manager selects different business from dropdown
2. `selectedBusinessId` state updates
3. RosterBoard re-renders with new `businessId`
4. useEffect triggers, loads shifts for new business
5. Calendar grid shows different assignments
6. Same employee pool (organization-level)

---

## 🎨 Styling System

### Tailwind v4 + ShadCN
- **Color System**: OKLCH color space (perceptually uniform)
- **Theme Variables**: Defined in `globals.css` using CSS custom properties
- **Dark Mode**: Enabled by default via `className="dark"` on `<html>`
- **Component Library**: ShadCN UI (Select, Badge, Card, etc.)

### Key Design Tokens
```css
--background: oklch(0 0 0)           /* Pure black */
--foreground: oklch(0.9328 ...)      /* Light text */
--card: oklch(0.2097 ...)            /* Dark card background */
--primary: oklch(0.6692 ...)         /* Accent color (purple) */
--border: oklch(0.2674 ...)          /* Subtle borders */
--muted: oklch(0.2090 0 0)           /* Muted sections */
```

---

## 🚀 Getting Started

### Prerequisites
```bash
Node.js 18+
Supabase account
```

### Environment Setup
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Installation
```bash
npm install
npm run dev
```

### Database Setup
1. Create tables in Supabase (see schema above)
2. Insert test organization:
   ```sql
   INSERT INTO organizations (id, name) 
   VALUES ('11111111-1111-1111-1111-111111111111', 'Morning Brew Empire');
   ```
3. Insert test businesses:
   ```sql
   INSERT INTO businesses (organization_id, name, location) VALUES
   ('11111111-...', 'Downtown Café', '123 Main St'),
   ('11111111-...', 'Airport Branch', '456 Terminal Ave');
   ```
4. Insert test employees:
   ```sql
   INSERT INTO employees (organization_id, name, role) VALUES
   ('11111111-...', 'Alice Johnson', 'Barista'),
   ('11111111-...', 'Bob Smith', 'Manager');
   ```

---

## 📝 Development Notes

### Current Status
- ✅ Multi-tenant architecture implemented
- ✅ Drag-and-drop scheduling working
- ✅ Organization-scoped data queries
- ✅ Dark mode UI with ShadCN
- ⚠️ Authentication not yet implemented (using hardcoded TEST_ORG_ID)
- ⚠️ No conflict detection UI (DB constraint exists)

### Next Steps
1. Add authentication (Supabase Auth)
2. Implement Row Level Security (RLS)
3. Add conflict detection alerts
4. Show employee availability in drag preview
5. Add shift notes/comments
6. Export schedules to PDF/CSV
7. Add mobile responsive view
8. Implement notifications

---

## 🐛 Known Issues

1. **TypeScript Cache**: Sometimes requires restarting TS server for new files
2. **Dev Server Port**: May conflict if multiple instances running (use port 3001)
3. **Tailwind v4**: Must use `@tailwindcss/postcss`, not `tailwindcss` directly

### Quick Fixes
```bash
# Clear cache
rm -r .next
rm -r node_modules/.cache

# Restart TS server in VS Code
Ctrl+Shift+P → "TypeScript: Restart TS Server"

# Kill hanging process
Stop-Process -Id <PID> -Force
```

---

## 📚 Technical Decisions

### Why Tailwind v4?
- Modern OKLCH color space
- Inline `@theme` configuration
- No separate config file needed
- Better performance with Turbopack

### Why @dnd-kit?
- Modern, accessible drag-and-drop
- Touch support built-in
- Framework agnostic
- Better than react-beautiful-dnd (deprecated)

### Why Supabase?
- PostgreSQL with REST API
- Real-time subscriptions
- Built-in authentication
- Row Level Security for multi-tenancy

### Why Organization-Level Employee Pool?
- Flexibility: Employees can work at any location
- Efficiency: Single employee record across all locations
- Scalability: Easy to add new businesses without duplicating staff

---

## 🎓 Learning Resources

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [dnd-kit Documentation](https://docs.dndkit.com/)
- [ShadCN UI](https://ui.shadcn.com/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)

---

## 📄 License

This project is for educational/portfolio purposes.

---

**Last Updated**: January 6, 2026
