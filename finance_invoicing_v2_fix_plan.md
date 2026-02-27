# Finance & Invoicing V2 — Audit, Fix & Completion Plan

**Branch:** `feature/finance-invoicing-v2`
**Date:** 2026-02-27
**References:** `implementation_plan.md.resolved`, `finance_invoicing_prd_v2.md`, `finance_invoicing_trd_v2.md`, `RULES.md`

---

## Context

The feature branch implements Phases 0–7 of the implementation plan across 7 backend commits and 2 frontend commits (~4,600 LOC changed). A full audit of 55+ files reveals that while the architectural skeleton is sound, there are **critical runtime blockers** (missing DB migrations, empty modal, unwired UI), **backend bugs** (broken invoice numbering, RBAC bypass, decimal precision loss), and **RULES.md compliance violations** (`any` types, unsafe casts). The original requirement workflow is intact because the old `invoice_id` FK was not removed, but invoice creation is fully broken from the UI.

---

## Current Phase Status

| Phase | Status | Blocking Issue |
|-------|--------|----------------|
| 0 — Pre-flight | ✅ Complete | — |
| 1 — DB Schema | ⚠️ Schema written, no migration run | Tables don't exist in DB |
| 2 — Types & Infra | ✅ Complete | — |
| 3 — Service Layer | ⚠️ Complete with 5 bugs | See FIX-B below |
| 4 — API Endpoints | ✅ Complete | — |
| 5 — Background Jobs | ⚠️ Complete with 1 bug | Tax calc wrong |
| 6 — Frontend Core | ⚠️ Partial | Save unwired, mock data, FynixLogo |
| 7 — Frontend Advanced | ⚠️ Partial | `SendInvoiceModal` empty |
| 8 — Testing | ❌ Not done | — |
| 9 — Mock Cleanup | ❌ Not started | — |

---

## Critical Issue Registry

### P0 — Runtime Blockers (nothing works until these are fixed)

| ID | Location | Issue |
|----|----------|-------|
| P0-1 | `prisma/schema.prisma` | `invoice_requirements`, `invoice_activities`, `invoice_templates` tables defined in schema but **no Prisma migration exists**. `prisma.invoiceRequirement.*` calls crash at runtime |
| P0-2 | `CreateInvoicePage.tsx:224–227` | `handleSaveInvoice` only calls `toast.success()` then `router.push()` — **never calls `createInvoice()` mutation**. Invoice creation is completely broken |
| P0-3 | `SendInvoiceModal.tsx` | **File is completely empty** (0 bytes of implementation). Send invoice flow is non-functional |
| P0-4 | `invoice-email.service.ts` | `sendInvoiceEmailService` has **no `requirePermission('INVOICE_SEND')` call** and updates `invoice.status` directly instead of routing through `updateInvoiceStatusService`. RBAC bypass |

### P1 — High Priority Bugs

| ID | Location | Issue |
|----|----------|-------|
| P1-1 | `invoice.service.ts:291–298` | Invoice number sequencing uses `orderBy: { invoice_number: 'desc' }` — **lexicographic**, not numeric. `INV-2026-0100` sorts before `INV-2026-0009`. Produces duplicate numbers |
| P1-2 | `invoice.service.ts:433–434` | `Number(invoice.amount_received) + params.amount` — converts Prisma `Decimal` to `Number` (floating-point). **Precision loss** in financial calculation |
| P1-3 | `invoice.service.ts:433–436` | No overpayment guard: `amount_received > total` is allowed; invoice just marks 'paid'. Should throw 422 |
| P1-4 | `invoice-pdf.service.tsx:367–368` | `(invoice.company as Record<string, unknown>).pan_number` — `pan_number` and `gst_number` **do not exist** on `Company` model. Always `undefined` on PDFs |
| P1-5 | `requirement-billing.service.ts:44–71` | `deriveBillingStatus`, `linkInvoiceToRequirement`, `unlinkInvoiceFromRequirement` still use the **old `invoice_id` FK** and never touch the junction table. Billing status cannot reflect partial billing |
| P1-6 | `invoice-template.job.ts:57` | Tax computed from `p.tax` field which does **not exist** on `Particular` type. Should call `computeTaxLines()` |
| P1-7 | `FinancePage.tsx:63,69` | Merges `MOCK_INVOICES` with real API data (`[...MOCK_INVOICES, ...dbInvoices]`). "Ready to Bill" tab populated from `MOCK_REQUIREMENTS` only |
| P1-8 | `InvoicePreview.tsx:3,102` | `FynixLogo` hardcoded import still present. All users see wrong company logo |
| P1-9 | `RequirementDetailsPage.tsx:73–76` | `'billing'` is in `ReqDetailsTab` type but **missing from `validTabs` array**. Tab URL routing broken for billing tab |

### P2 — Compliance & Type Safety (RULES.md §2 — no `any`)

| ID | Location | Issue |
|----|----------|-------|
| P2-1 | `invoice.ts:22` | `particulars?: any[]` — must be `Particular[]` |
| P2-2 | `FinancePage.tsx:52` | `status: ... as any` cast |
| P2-3 | `BillingTab.tsx:32` | `(requirement as any).total_billed` — no proper typed prop |
| P2-4 | `SmartRequirementSelect.tsx:95` | `(req as { total_billed?: number }).total_billed` — unsafe assertion |
| P2-5 | `CreateInvoicePage.tsx:17` | Still imports `MOCK_REQUIREMENTS` |
| P2-6 | `invoice-template.job.ts:57` | `as any` on `default_particulars` |
| P2-7 | `invoice-overdue.job.ts` | Notification failure not logged — silent swallow |

---

## Implementation Plan

### FIX-A: Database Migration (Unblocks Everything Else)

**Files:**
- `alsonotify-backend/prisma/schema.prisma` — minor addition: `pan_number`, `gst_number`, `state_code` on `Company`
- Run: `cd alsonotify-backend && pnpm prisma migrate dev --name invoice_v2_tables`
- Create: `alsonotify-backend/prisma/migrations/data-migration-v2.sql`

**A1 — Add missing Company fields for PDF/Tax** (`schema.prisma`, inside `model Company`):
```prisma
pan_number   String?
gst_number   String?
state_code   String?   // For India CGST/SGST vs IGST determination
```

**A2 — Run Prisma migration**
This creates `invoice_requirements`, `invoice_activities`, `invoice_templates` tables and adds all V2 fields to `Invoice` and `WorkspaceRequirement`:
```bash
cd alsonotify-backend && pnpm prisma migrate dev --name invoice_v2_tables
```

**A3 — Create `alsonotify-backend/prisma/migrations/data-migration-v2.sql`**
Run this script manually against the database AFTER `prisma migrate dev` succeeds:
```sql
-- Step 1: Rename legacy statuses in Invoice table
UPDATE "Invoice" SET status = 'sent'    WHERE status = 'open';
UPDATE "Invoice" SET status = 'overdue' WHERE status = 'past_due';

-- Step 2: Populate InvoiceRequirement junction from existing invoice_id links
INSERT INTO "invoice_requirements" (invoice_id, requirement_id, billed_amount, created_at)
SELECT invoice_id, id, COALESCE(quoted_price, 0), NOW()
FROM "workspace_requirements"
WHERE invoice_id IS NOT NULL
ON CONFLICT (invoice_id, requirement_id) DO NOTHING;

-- Step 3: Populate total_billed on workspace_requirements
UPDATE "workspace_requirements" wr
SET total_billed = (
    SELECT COALESCE(SUM(ir.billed_amount), 0)
    FROM "invoice_requirements" ir
    WHERE ir.requirement_id = wr.id
);
```

> **Note on `invoice_id` FK:** Keep the old `invoice_id` FK on `WorkspaceRequirement` for now — it is still used by `requirement-billing.service.ts` as a legacy fallback. After FIX-B (P1-5) is verified, a follow-up migration can drop the column.

---

### FIX-B: Backend Bug Fixes

#### FIX-B-1 — RBAC bypass in email service (P0-4)
**File:** `alsonotify-backend/service/invoice-email.service.ts`

Add permission check at entry and route status change through the state machine:
```typescript
// Add after invoice fetch, at top of function:
await requirePermission(userTokenData, 'INVOICE_SEND');

// Replace the direct prisma.invoice.update({ status: 'sent' }) block with:
await updateInvoiceStatusService(invoiceId, 'sent', userTokenData);
// (remove the if-block that directly updates status and the duplicated activity log —
//  updateInvoiceStatusService handles both)
```
Import `requirePermission` from `'../utils/permissions'` and `updateInvoiceStatusService` from `'./invoice.service'`.

---

#### FIX-B-2 — Invoice number sequencing (P1-1)
**File:** `alsonotify-backend/service/invoice.service.ts` (function `getNextInvoiceNumberService`, ~lines 287–313)

Replace the `orderBy: { invoice_number: 'desc' }` approach with numeric max extraction:
```typescript
async function getNextInvoiceNumberService(companyId: number): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const allInvoices = await prisma.invoice.findMany({
        where: { bill_from: companyId, invoice_number: { startsWith: prefix }, is_deleted: false },
        select: { invoice_number: true },
    });

    let seq = 1;
    if (allInvoices.length > 0) {
        const numbers = allInvoices
            .map(inv => parseInt(inv.invoice_number.split('-REV')[0].split('-').pop() || '0', 10))
            .filter(n => !isNaN(n));
        seq = (Math.max(0, ...numbers)) + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
}
```

---

#### FIX-B-3 — Decimal precision + overpayment guard (P1-2, P1-3)
**File:** `alsonotify-backend/service/invoice.service.ts` (function `recordPaymentService`, ~lines 430–444)

```typescript
import { Decimal } from '@prisma/client/runtime/library';

// Replace the Number() conversion block:
const current = new Decimal(invoice.amount_received.toString());
const payment = new Decimal(params.amount.toString());
const invoiceTotal = new Decimal(invoice.total.toString());
const newAmountReceived = current.plus(payment);

if (newAmountReceived.greaterThan(invoiceTotal)) {
    throw HttpError.unprocessableEntity('Payment amount exceeds invoice total.');
}
const newStatus: InvoiceStatus = newAmountReceived.greaterThanOrEqualTo(invoiceTotal) ? 'paid' : 'partial';

// In the Prisma update call:
data: { amount_received: newAmountReceived, status: newStatus, updated_user: userTokenData.id }
```

---

#### FIX-B-4 — requirement-billing.service.ts junction table support (P1-5)
**File:** `alsonotify-backend/service/requirement-billing.service.ts`

**Rewrite `deriveBillingStatus`** to use `total_billed` from junction aggregates, with `invoice_id` as legacy fallback:
```typescript
export function deriveBillingStatus(requirement: {
    status: RequirementStatus | string;
    type: string;
    invoice_id: number | null;
    total_billed: Decimal | number;
    quoted_price: Decimal | number | null;
}): BillingStatus {
    if (requirement.type === 'inhouse') return 'Not_Billable';
    if (requirement.status !== 'Completed' && requirement.status !== RequirementStatus.Completed)
        return 'Not_Billable';

    const totalBilled = Number(requirement.total_billed ?? 0);
    const quotedPrice = Number(requirement.quoted_price ?? 0);

    if (totalBilled <= 0 && !requirement.invoice_id) return 'Ready_To_Bill';
    if (quotedPrice > 0 && totalBilled >= quotedPrice) return 'Paid';
    if (totalBilled > 0) return 'Invoiced';
    return 'Ready_To_Bill';
}
```

**Update `linkInvoiceToRequirement`** — write to junction table AND sync old FK for backward compatibility:
```typescript
// Inside the existing transaction, after validation:
await tx.invoiceRequirement.upsert({
    where: { invoice_id_requirement_id: { invoice_id: invoiceId, requirement_id: requirementId } },
    update: { billed_amount: billedAmount },
    create: { invoice_id: invoiceId, requirement_id: requirementId, billed_amount: billedAmount },
});
// Keep syncing legacy FK so old queries remain unbroken:
await tx.workspaceRequirement.update({
    where: { id: requirementId },
    data: { invoice_id: invoiceId },
});
// Recalculate total_billed:
const agg = await tx.invoiceRequirement.aggregate({
    where: { requirement_id: requirementId },
    _sum: { billed_amount: true },
});
await tx.workspaceRequirement.update({
    where: { id: requirementId },
    data: { total_billed: agg._sum.billed_amount ?? 0 },
});
```

**Update `unlinkInvoiceFromRequirement`** — delete junction entry and recalculate `total_billed`:
```typescript
await tx.invoiceRequirement.deleteMany({
    where: { invoice_id: invoiceId, requirement_id: requirementId },
});
const agg = await tx.invoiceRequirement.aggregate({
    where: { requirement_id: requirementId },
    _sum: { billed_amount: true },
});
const newTotal = agg._sum.billed_amount ?? new Decimal(0);
await tx.workspaceRequirement.update({
    where: { id: requirementId },
    data: {
        total_billed: newTotal,
        invoice_id: newTotal.equals(0) ? null : undefined, // clear legacy FK if no more invoices
    },
});
```

---

#### FIX-B-5 — Tax calculation in template job (P1-6)
**File:** `alsonotify-backend/jobs/invoice-template.job.ts`

Import `computeTaxLines`, `getTotalTaxRate` from `'../utils/tax-engine'`. Replace the incorrect `p.tax` field usage:
```typescript
// Fetch companies for tax context
const company = await prisma.company.findUnique({
    where: { id: template.company_id },
    select: { country: true, state_code: true },
});
const clientCompany = template.client_company_id
    ? await prisma.company.findUnique({
          where: { id: template.client_company_id },
          select: { country: true, state_code: true },
      })
    : null;

const taxLines = computeTaxLines(
    company?.country ?? '',
    company?.state_code ?? null,
    clientCompany?.country ?? '',
    clientCompany?.state_code ?? null,
);
const taxRate = getTotalTaxRate(taxLines);
const taxAmount = parseFloat((subTotal * (taxRate / 100)).toFixed(2));
const taxType = taxLines.map(t => `${t.name} ${t.rate}%`).join(' + ') || null;
const total = subTotal + taxAmount;
```

For `default_particulars`, replace the `as any` cast with proper validation:
```typescript
const particulars: Particular[] = Array.isArray(template.default_particulars)
    ? (template.default_particulars as unknown[]).filter(
          (p): p is Particular =>
              p !== null &&
              typeof p === 'object' &&
              'description' in (p as object) &&
              'quantity' in (p as object)
      )
    : [];
```

---

#### FIX-B-6 — Notification logging in overdue job (P2-7)
**File:** `alsonotify-backend/jobs/invoice-overdue.job.ts`

```typescript
// Replace the silent catch block:
} catch (err) {
    app.log.warn(
        { err, invoiceId: inv.id },
        '[InvoiceOverdueJob] Failed to send overdue notification'
    );
}
```

---

### FIX-C: Frontend Critical Fixes

#### FIX-C-1 — Implement SendInvoiceModal (P0-3)
**File:** `alsonotify-frontend/src/components/features/finance/SendInvoiceModal.tsx`

Full implementation per TRD §4.4. The file is currently empty — implement from scratch:

```typescript
'use client';
import { useState, useEffect } from 'react';
import { X, Paperclip, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoice, useSendInvoiceEmail } from '../../../hooks/useInvoice';
import { getEmailRecipients } from '../../../services/invoice';

interface SendInvoiceModalProps {
    invoiceId: number;
    invoiceNumber: string;
    isOpen: boolean;
    onClose: () => void;
    onSent: () => void;
}
```

**Component behaviour:**
1. On mount (when `isOpen` becomes true): call `getEmailRecipients(invoiceId)` — populates `toEmails[]` and `ccEmails[]`
2. Render To and CC as editable pill-tag arrays (add email via input + Enter, remove via × on tag)
3. Show invoice summary card: client company name, total amount, due date (from `useInvoice(invoiceId)`)
4. Show static attachment chip: `📎 {invoiceNumber}.pdf` (non-removable)
5. Textarea for `customMessage` (optional)
6. Send button: disabled while loading, shows spinner when submitting
7. On Send: call `useSendInvoiceEmail()` mutation with `{ invoiceId, toEmails, ccEmails, customMessage }`
8. On success: call `onSent()`, show `toast.success('Invoice sent successfully')`, call `onClose()`
9. On error: show `toast.error('Failed to send invoice. Please try again.')` — do NOT modify any state

**Validation before send:**
- At least one `toEmails` entry required (show inline error if empty)
- Each email must pass basic format check

---

#### FIX-C-2 — Wire CreateInvoicePage save to API (P0-2, P2-5)
**File:** `alsonotify-frontend/src/components/features/finance/CreateInvoicePage.tsx`

**Wire `handleSaveInvoice`:**
```typescript
const { mutateAsync: createInvoiceMutation, isPending: isSaving } = useCreateInvoice();

const handleSaveInvoice = async () => {
    try {
        const payload = {
            bill_to: selectedClient?.id,
            issue_date: issueDate,
            due_date: dueDate,
            currency,
            particulars: lineItems,       // Particular[]
            sub_total: subtotal,
            discount: discountAmount,
            tax: taxAmount,
            tax_type: taxType,
            total: totalAmount,
            memo,
            payment_details: footer,
            metadata: { invoiceDetails: requirementBillings }, // for junction table creation
        };
        const created = await createInvoiceMutation(payload);
        toast.success(`Invoice ${created.invoice_number} saved as draft.`);
        router.push('/dashboard/finance');
    } catch {
        toast.error('Failed to save invoice. Please try again.');
    }
};
```

**Remove `Math.random()` line item IDs** — replace with `crypto.randomUUID()`:
```typescript
// Replace: String(Math.floor(Math.random() * 9000) + 1000)
// With:
crypto.randomUUID()
```

**Remove `MOCK_REQUIREMENTS` import (line 17)** and replace requirements data source with `useCollaborativeRequirements` hook, passing results to `SmartRequirementSelect`.

**Wire invoice number fetch on mount:**
```typescript
const { data: nextInvoiceNumber } = useQuery({
    queryKey: ['next-invoice-number'],
    queryFn: () => getNextInvoiceNumber(),
    staleTime: 0, // Always fresh
});
// Display nextInvoiceNumber in the invoice number field (read-only)
```

---

#### FIX-C-3 — Remove mock data from FinancePage (P1-7)
**File:** `alsonotify-frontend/src/components/features/finance/FinancePage.tsx`

Delete lines 22–27 (MOCK imports) and the mock-mixing logic on lines 63 and 69. Replace with:
```typescript
const { data: invoicesData, isLoading: invoicesLoading } = useInvoices({
    company_id: currentCompany?.id,
});
const invoices = useMemo(() => invoicesData?.data ?? [], [invoicesData]);

// For "Ready to Bill" tab — use real requirements API:
// (add useRequirements hook import — same pattern as useInvoices)
const { data: requirementsData, isLoading: reqsLoading } = useRequirements({
    company_id: currentCompany?.id,
    billing_status: 'Ready_To_Bill',
});
const requirements = useMemo(() => requirementsData?.data ?? [], [requirementsData]);
```

Add loading skeleton rendering during `invoicesLoading` / `reqsLoading` states using the already-imported `Skeleton` component.

---

#### FIX-C-4 — Fix InvoicePreview company logo (P1-8)
**File:** `alsonotify-frontend/src/components/features/finance/InvoicePreview.tsx`

```typescript
// DELETE line 3: import FynixLogo from '@/assets/images/fynix-logo.png';

// Add to InvoicePreviewData interface:
senderLogoUrl?: string | null;
senderName?: string;

// Replace the logo render block (~line 102):
{invoiceData.senderLogoUrl
    ? <img src={invoiceData.senderLogoUrl} alt="Company Logo" style={{ maxHeight: 60, maxWidth: 180, objectFit: 'contain' }} />
    : <span style={{ fontWeight: 700, fontSize: 18 }}>{invoiceData.senderName ?? 'Your Company'}</span>
}
```

Update all callers of `InvoicePreview` to pass:
```typescript
senderLogoUrl={currentCompany?.logo}
senderName={currentCompany?.name}
```

---

#### FIX-C-5 — Fix billing tab routing (P1-9)
**File:** `alsonotify-frontend/src/components/features/requirements/RequirementDetailsPage.tsx`

On line ~74, add `'billing'` to `validTabs`:
```typescript
// Before:
validTabs: ['details', 'tasks', 'gantt', 'kanban', 'pnl', 'documents']
// After:
validTabs: ['details', 'tasks', 'gantt', 'kanban', 'pnl', 'documents', 'billing']
```

---

### FIX-D: Type Safety & RULES.md Compliance

#### FIX-D-1 — `particulars: any[]` in invoice service (P2-1)
**File:** `alsonotify-frontend/src/services/invoice.ts` (line 22)

Define `Particular` locally or import from shared types (mirror the backend interface):
```typescript
export interface Particular {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    tax_rate?: number;
    hsn_sac?: string;
    requirement_id?: number;
}

// In InvoiceDto:
particulars?: Particular[];   // was: any[]
```

---

#### FIX-D-2 — `as any` in FinancePage (P2-2)
**File:** `alsonotify-frontend/src/components/features/finance/FinancePage.tsx`

Import or define `InvoiceStatusType`:
```typescript
type InvoiceStatusType = 'draft' | 'pending_approval' | 'sent' | 'overdue' | 'partial' | 'paid' | 'void';

// Replace:
status: (inv.status?.toLowerCase() || 'draft') as any
// With:
status: (inv.status?.toLowerCase() as InvoiceStatusType) ?? 'draft'
```

---

#### FIX-D-3 — `as any` in BillingTab (P2-3)
**File:** `alsonotify-frontend/src/components/features/requirements/components/BillingTab.tsx`

Add `total_billed` to the `BillingTabProps` requirement type and remove the cast:
```typescript
interface BillingTabProps {
    requirement: {
        id: number;
        quoted_price?: number | null;
        estimated_cost?: number | null;
        total_billed?: number | null;   // explicitly typed — no cast needed
    };
}
// Remove: (requirement as any).total_billed
// Use: requirement.total_billed ?? 0
```

Ensure `RequirementDetailsPage.tsx` passes `total_billed` from the API response when rendering `BillingTab`.

---

#### FIX-D-4 — Unsafe assertion in SmartRequirementSelect (P2-4)
**File:** `alsonotify-frontend/src/components/features/finance/SmartRequirementSelect.tsx`

Add `total_billed` to the requirement item type definition used in this component. If `useCollaborativeRequirements` doesn't include it, extend the query to fetch the billing summary:
```typescript
interface SelectableRequirement {
    id: number;
    name: string;
    quoted_price?: number | null;
    total_billed?: number | null;   // Add explicit field
    client_company?: { name: string };
    // ... other existing fields
}
// Remove: (req as { total_billed?: number }).total_billed
// Use: req.total_billed ?? 0
```

---

### FIX-C5: Replace SplitPaymentModal with TRD-compliant Pro-Ration Modal

**File:** `alsonotify-frontend/src/components/features/finance/SplitPaymentModal.tsx`

The current implementation is a **payment milestone scheduler** (future-dated splits). TRD §4.2 requires a **pro-ration billing entry** modal — used inside `CreateInvoicePage` when a user selects a requirement and needs to choose how much to bill. Rewrite entirely:

```typescript
interface SplitPaymentModalProps {
    requirement: {
        id: number;
        name: string;
        quoted_price: number;
        total_billed: number;   // sum of all prior InvoiceRequirement records
    };
    onConfirm: (billedAmount: number) => void;
    onClose: () => void;
    isOpen: boolean;
}
```

**Modal layout:**
- **Header:** Requirement name
- **Summary row:** Quoted Price | Total Already Billed | **Remaining Balance** (= `quoted_price - total_billed`)
- **Mode toggle:** "Full remaining balance" (default) vs "Custom amount"
- **When Custom:** radio selector — `Percentage` (slider 1–100% of `quoted_price`) or `Fixed Amount` (number input)
- **Live preview:** "Billing: ₹ X.XX of ₹ Y.YY remaining"
- **Validation:** `billedAmount > 0` AND `billedAmount ≤ remaining`
- **Confirm:** calls `onConfirm(billedAmount)` → caller adds a line item with that amount

```typescript
const remaining = requirement.quoted_price - requirement.total_billed;

const billedAmount = isFullPayment
    ? remaining
    : mode === 'percentage'
        ? Math.min(parseFloat(((percentage / 100) * requirement.quoted_price).toFixed(2)), remaining)
        : Math.min(parseFloat(customAmount.toFixed(2)), remaining);
```

---

### FIX-E: Phase 8 — Testing & Verification

**Backend commands (run in order):**
```bash
cd alsonotify-backend

# 1. Apply schema migration
pnpm prisma migrate dev --name invoice_v2_tables

# 2. Run data migration SQL manually via psql or db client
# psql $DATABASE_URL -f prisma/migrations/data-migration-v2.sql

# 3. Regenerate Prisma client
pnpm prisma generate

# 4. TypeScript compile check
pnpm tsc --noEmit

# 5. Unit tests
pnpm vitest run tests/invoice.test.ts
```

**Frontend commands:**
```bash
cd alsonotify-frontend
pnpm build   # Must complete with 0 TypeScript errors
```

**Manual E2E Verification Checklist:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to `/dashboard/finance/create` | Invoice number field shows `INV-2026-XXXX` fetched from server |
| 2 | Select a requirement via SmartRequirementSelect | SplitPaymentModal opens with Quoted/Billed/Remaining breakdown |
| 3 | Confirm billing amount, save draft | Invoice persists in DB, appears in Drafts tab |
| 4 | Open invoice → click Send | SendInvoiceModal opens with auto-populated To/CC recipients and PDF attachment chip |
| 5 | Send the invoice | Status → `sent`, Outstanding tab shows it |
| 6 | Record partial payment | Status → `partial`, amount_received updated correctly |
| 7 | Record remaining payment | Status → `paid`, moves to History tab |
| 8 | Open requirement → Billing tab | Shows linked invoices, correct remaining balance |
| 9 | Download PDF | Company logo shown (not FynixLogo), PAN/GST from Company model |
| 10 | Navigate requirement tabs 1–6 | Details, Tasks, Gantt, Kanban, P&L, Documents — all render correctly |
| 11 | Navigate to Billing tab via URL param | Tab activates correctly (routing not broken) |
| 12 | "Ready to Bill" tab | Shows real API requirements, not mock data |

---

### FIX-F: Phase 9 — Mock Data Cleanup (Post-Approval Only)

> **Trigger:** CTO approves UI in staging after FIX-C is live.

1. Remove `MOCK_REQUIREMENTS` and `MOCK_INVOICES` from `mockFinanceData.ts` exports
2. Confirm zero remaining `import ... from '...mockFinanceData'` statements (grep the whole codebase)
3. Delete `alsonotify-frontend/src/data/mockFinanceData.ts`
4. Run `pnpm build` — must pass with 0 errors confirming no mock references remain

---

## Implementation Order & Critical Path

```
FIX-A (DB Migration) ─────────────────────────────────────────────────┐
    └─► FIX-B (Backend Bugs) ──────────────────────────────────────────┤
            ├─► B1: RBAC bypass (invoice-email.service.ts)              │
            ├─► B2: Invoice number sequencing (invoice.service.ts)      │
            ├─► B3: Decimal precision + overpayment (invoice.service.ts)│
            ├─► B4: Billing service junction table (req-billing.ts)     │
            ├─► B5: Template job tax calc (invoice-template.job.ts)     │
            └─► B6: Overdue job logging (invoice-overdue.job.ts)        │
                    └─► FIX-C (Frontend Critical) ─────────────────────►│
                            ├─► C1: Implement SendInvoiceModal           │
                            ├─► C2: Wire CreateInvoicePage save          │
                            ├─► C3: Remove mock data from FinancePage    │
                            ├─► C4: Fix InvoicePreview logo              │
                            ├─► C5: Fix billing tab validTabs            │
                            └─► C6: Replace SplitPaymentModal            │
                                    └─► FIX-D (Type Safety) ────────────►│
                                            └─► FIX-E (Testing) ─────────┤
                                                    └─► FIX-F (Cleanup) ─┘
```

Each fix group is sequentially dependent. Do not skip ahead.

---

## Original Workflow Preservation Checklist

These workflows were working before this branch and **must not be broken**:

| Workflow | Risk | Mitigation |
|----------|------|------------|
| Requirement creation/editing | Low | `RequirementsForm.tsx` not modified |
| Requirement status progression | Low | `updateRequirementStatus` service untouched |
| Requirement billing link via old FK | Medium | `invoice_id` FK kept on schema; `linkInvoiceToRequirement` writes to BOTH junction table AND old FK |
| RequirementDetailsPage tabs 1–6 | Low | Only `validTabs` array gets `'billing'` appended; no other change |
| Workspace/task/gantt flows | Low | Not modified in this plan |
| Invoice listing (`GET /invoice`) | Low | Query unchanged |
| Invoice detail view (`GET /invoice/:id`) | Low | Query unchanged |

---

## Key Files Changed in This Plan

| File | Fix IDs |
|------|---------|
| `alsonotify-backend/prisma/schema.prisma` | FIX-A1 |
| `alsonotify-backend/prisma/migrations/data-migration-v2.sql` *(new)* | FIX-A3 |
| `alsonotify-backend/service/invoice-email.service.ts` | FIX-B1 (P0-4) |
| `alsonotify-backend/service/invoice.service.ts` | FIX-B2, B3 (P1-1, P1-2, P1-3) |
| `alsonotify-backend/service/requirement-billing.service.ts` | FIX-B4 (P1-5) |
| `alsonotify-backend/jobs/invoice-template.job.ts` | FIX-B5 (P1-6, P2-6) |
| `alsonotify-backend/jobs/invoice-overdue.job.ts` | FIX-B6 (P2-7) |
| `alsonotify-frontend/src/components/features/finance/SendInvoiceModal.tsx` | FIX-C1 (P0-3) |
| `alsonotify-frontend/src/components/features/finance/CreateInvoicePage.tsx` | FIX-C2 (P0-2, P2-5) |
| `alsonotify-frontend/src/components/features/finance/FinancePage.tsx` | FIX-C3 (P1-7), FIX-D2 (P2-2) |
| `alsonotify-frontend/src/components/features/finance/InvoicePreview.tsx` | FIX-C4 (P1-8) |
| `alsonotify-frontend/src/components/features/requirements/RequirementDetailsPage.tsx` | FIX-C5 (P1-9) |
| `alsonotify-frontend/src/components/features/finance/SplitPaymentModal.tsx` | FIX-C6 (full rewrite) |
| `alsonotify-frontend/src/services/invoice.ts` | FIX-D1 (P2-1) |
| `alsonotify-frontend/src/components/features/requirements/components/BillingTab.tsx` | FIX-D3 (P2-3) |
| `alsonotify-frontend/src/components/features/finance/SmartRequirementSelect.tsx` | FIX-D4 (P2-4) |
