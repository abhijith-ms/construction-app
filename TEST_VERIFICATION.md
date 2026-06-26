# Construction ERP - Test Verification Guide

## Application Status: ✅ READY

The React 19 + Vite + TypeScript application has been successfully built and is running.

### Application URLs
- **Local:** http://localhost:5174/
- **Network:** http://192.168.1.11:5174/

---

## Test Credentials

| Role | Email | Password | Expected RLS Behavior |
|------|-------|----------|----------------------|
| **Admin** | `admin@test.com` | `Test@123` | ✅ Can create sites (RLS allows) |
| **Office Manager** | `manager@test.com` | `Test@123` | ✅ Can create sites (RLS allows) |
| **Supervisor** | `supervisor@test.com` | `Test@123` | ❌ Cannot create sites (RLS blocks) |
| **Invalid** | `supervisor@test.com` | `wrongpass` | ❌ Login fails with "Invalid email or password" |

---

## Test Scenarios

### 1. Login Flow
1. Navigate to http://localhost:5174/
2. Enter credentials for any test user
3. Click "Sign In"
4. Expected: Redirected to Dashboard

### 2. Dashboard
1. After login, verify:
   - Header shows user's full name and role
   - Navigation links work (Dashboard, Sites)
   - Logout button works

### 3. Sites CRUD
1. Navigate to Sites page via header
2. **For Admin/Office Manager:**
   - Should see "Add Site" button
   - Can create new sites via modal form
   - Toast shows success when created
3. **For Supervisor:**
   - No "Add Site" button visible
   - Can view existing sites (RLS allows SELECT)
   - Cannot create sites (RLS blocks INSERT)

### 4. RLS Verification
**To verify RLS enforcement:**
1. Login as `supervisor@test.com`
2. The supervisor shouldn't see "Add Site" button
3. If they try to create via direct API call, RLS returns error

---

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Tech Stack

- **Framework:** React 19 + TypeScript 7
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui
- **State Management:** Zustand
- **Form Handling:** React Hook Form + Zod
- **Data Fetching:** TanStack Query (React Query)
- **Auth:** Supabase Auth
- **Notifications:** Sonner (toast)

---

## Project Structure

```
src/
├── components/ui/      # shadcn/ui components (button, input, card, dialog, label)
├── hooks/
│   ├── useSites.ts     # TanStack Query hook for fetching sites
│   └── useCreateSite.ts # TanStack Query mutation for creating sites
├── lib/
│   ├── utils.ts        # shadcn utility functions
│   └── supabase.ts     # Supabase client configuration
├── routes/
│   ├── Login.tsx       # Login page with form validation
│   ├── ProtectedLayout.tsx # Protected layout with header/nav
│   ├── Dashboard.tsx   # Dashboard with role info
│   └── Sites.tsx       # Sites CRUD with RLS verification
├── stores/
│   └── authStore.ts    # Zustand auth store
├── types/
│   └── database.ts     # Supabase database types
├── App.tsx             # Router setup
└── main.tsx            # Entry point with QueryClient
```

---

## RLS Policy Reference

### sites Table Policies
- `anon_sites_policy`: Blocks all anonymous access
- `authenticated_read_sites`: Allows SELECT for authenticated users
- `admin_and_manager_insert_sites`: Allows INSERT only for admin/office_manager
- `admin_and_manager_update_sites`: Allows UPDATE only for admin/office_manager
- `admin_delete_sites`: Allows DELETE only for admin

---

## Environment Variables

Create `.env.local` file:
```
VITE_SUPABASE_URL=https://avphveuppaezjspvdfpv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cGh2ZXVwcGFlempzcHZkZnB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NTcyNjQsImV4cCI6MjA2NjEzMzI2NH0.EihUQtvlBCocA6iWdQXpBPEbXu6Pp8uMrlg1ULkoz80
```

---

## Verification Checklist

- [ ] Project builds successfully with `npm run build`
- [ ] Login page renders at `/login`
- [ ] Login redirects to `/dashboard` on success
- [ ] Header displays user name and role correctly
- [ ] Navigation between Dashboard and Sites works
- [ ] Logout clears session and redirects to login
- [ ] Sites page lists existing sites
- [ ] Add Site button visible only for admin/manager
- [ ] Site creation form validates inputs
- [ ] Successful site creation shows toast notification
- [ ] RLS error shown if unauthorized user tries to create site