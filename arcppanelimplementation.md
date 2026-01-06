# ARCP Panel Dashboard Enhancement - ARCP Prep Integration

## Goal

Enhance the trainee panels in `ARCPPanelDashboard.tsx` to show linked evidence from the `arcp_prep` table, split into two sections: **Last ARCP** (left) and **Current ARCP** (right).

## Proposed Changes

### 1. Fetch arcp_prep Data

#### [MODIFY] [ARCPPanelDashboard.tsx](file:///c:/Users/tmwbu/Documents/OphthaoPortfolio-AI-Studio%20-%20AG/views/ARCPPanelDashboard.tsx)

**Data Fetching Changes:**
- Add a query to fetch `arcp_prep` records for all trainees alongside the existing evidence query
- Store arcp_prep data keyed by user_id for quick lookup
- Include in the TraineeSummary or as a separate state map

**New State:**
```typescript
const [arcpPrepByTrainee, setArcpPrepByTrainee] = useState<Record<string, ARCPPrepData>>({});
```

**New Query (add to useEffect):**
```typescript
const { data: allArcpPrep } = await supabase
    .from('arcp_prep')
    .select('*')
    .in('user_id', traineeIds);
```

---

### 2. Update Trainee Row UI - Split Bottom Section

#### Current UI:
- EPA Matrix (top)
- Single bottom section

#### New UI (based on mockup):
```
┌─────────────────────────────────────────────────────────────┐
│ [Trainee Header - Same as current]                          │
├─────────────────────────────────────────────────────────────┤
│ [EPA Matrix - Same as current]                              │
├────────────────────────┬────────────────────────────────────┤
│ LAST ARCP              │ CURRENT ARCP                       │
│ ─────────────          │ ─────────────                      │
│ Date: 20/01/2025       │ Next ARCP: 2026-01-19              │
│ Type: Interim          │ Type: Full ARCP                    │
│                        │                                    │
│ ┌───────────────────┐  │ ┌───────────────────┐              │
│ │ EPAs              │  │ │ EPAs              │              │
│ │ - Oculoplastics.. │  │ │ - EPA Level 3...  │              │
│ └───────────────────┘  │ └───────────────────┘              │
│ ┌───────────────────┐  │ ┌───────────────────┐              │
│ │ GSAT              │  │ │ GSAT              │              │
│ │ - MSF 14Fish...   │  │ │ No Items          │              │
│ └───────────────────┘  │ └───────────────────┘              │
│ ┌───────────────────┐  │ ┌───────────────────┐              │
│ │ MSF               │  │ │ MSF               │              │
│ │ - No links        │  │ │ No Items          │              │
│ └───────────────────┘  │ └───────────────────┘              │
│ ┌───────────────────┐  │ ┌───────────────────┐              │
│ │ ESR               │  │ │ ESR               │              │
│ │ - No links        │  │ │ No Items          │              │
│ └───────────────────┘  │ └───────────────────┘              │
└────────────────────────┴────────────────────────────────────┘
```

---

### 3. Helper Functions

**Get evidence items by IDs:**
```typescript
const getEvidenceItems = (ids: string[], allEvidence: EvidenceItem[]): EvidenceItem[] => {
    return allEvidence.filter(e => ids.includes(e.id));
};
```

**Format date:**
```typescript
const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-GB');
};
```

---

### 4. ARCPLinkedEvidenceSection Component

Create a reusable component for displaying linked evidence:

```typescript
interface ARCPLinkedEvidenceSectionProps {
    title: string;
    items: EvidenceItem[];
    onViewItem?: (item: EvidenceItem) => void;
    emptyLabel?: string;
}
```

Features:
- Shows title (EPAs, GSAT, MSF, ESR)
- Lists linked evidence items with title and date
- Clicking an item calls `onViewItem`
- Shows "No items" when empty
- **No delete button** (read-only view for panel members)
- **MSF Special Case:** If `arcp_prep.no_msf_planned` is true, show "No MSF planned for this review" instead of evidence items

---

### 5. RLS Policy Updates

#### [NEW] [fix_arcp_prep_panel_access.sql](file:///c:/Users/tmwbu/Documents/OphthaoPortfolio-AI-Studio%20-%20AG/supabase/migrations/fix_arcp_prep_panel_access.sql)

Add RLS policy to allow ARCP panel members to read arcp_prep for trainees in their deanery:

```sql
CREATE POLICY "arcp_panel_read_arcp_prep"
ON public.arcp_prep
FOR SELECT
USING (
  public.is_arcp_panel_member()
  AND EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = arcp_prep.user_id
    AND up.deanery = public.get_current_user_deanery()
  )
);
```

---

## Verification Plan

### Manual Testing
1. Navigate to ARCP Panel Dashboard
2. Verify Last ARCP section shows:
   - Date and type from arcp_prep
   - Linked EPAs, GSAT, MSF, ESR evidence
3. Verify Current ARCP section shows:
   - Current linked evidence
   - Falls back to defaults when not customized
4. Click an evidence item → should navigate to view it
5. Verify no delete buttons appear

### Edge Cases
- Trainee with no arcp_prep record → show empty sections
- Evidence ID in arcp_prep but evidence deleted → filter out missing items
