Branch: feature/finance-invoicing-v2
Date: 2026-02-27
References: implementation_plan.md.resolved, finance_invoicing_prd_v2.md, finance_invoicing_trd_v2.md, RULES.md

Context
The feature branch implements Phases 0–7 of the implementation plan across 7 backend commits and 2 frontend commits (~4,600 LOC changed). A full audit of 55+ files reveals that while the architectural skeleton is sound, there are critical runtime blockers (missing DB migrations, empty modal, unwired UI), backend bugs (broken invoice numbering, RBAC bypass, decimal precision loss), and RULES.md compliance violations (any types, unsafe casts). The original requirement workflow is intact because the old invoice_id FK was not removed, but invoice creation is fully broken from the UI.

Current Phase Status
PhaseStatusBlocking Issue0 — Pre-flight✅ Complete—1 — DB Schema⚠️ Schema written, no migration runTables don't exist in DB2 — Types & Infra✅ Complete—3 — Service Layer⚠️ Complete with 5 bugsSee FIX-B below4 — API Endpoints✅ Complete—5 — Background Jobs⚠️ Complete with 1 bugTax calc wrong6 — Frontend Core⚠️ PartialSave unwired, mock data, FynixLogo7 — Frontend Advanced⚠️ PartialSendInvoiceModal empty8 — Testing❌ Not done—9 — Mock Cleanup❌ Not started—

Critical Issue Registry
P0 — Runtime Blockers (nothing works until these are fixed)
IDLocationIssueP0-1prisma/schema.prismainvoice_requirements, invoice_activities, invoice_templates tables defined in schema but no Prisma migration exists. prisma.invoiceRequirement.* calls crash at runtimeP0-2CreateInvoicePage.tsx:224–227handleSaveInvoice only calls toast.success() then router.push() — never calls createInvoice() mutation. Invoice creation is completely brokenP0-3SendInvoiceModal.tsxFile is completely empty (0 bytes of implementation). Send invoice flow is non-functionalP0-4invoice-email.service.tssendInvoiceEmailService has no requirePermission('INVOICE_SEND') call and updates invoice.status directly instead of routing through updateInvoiceStatusService. RBAC bypass
P1 — High Priority Bugs
IDLocationIssueP1-1invoice.service.ts:291–298Invoice number sequencing uses orderBy: { invoice_number: 'desc' } — lexicographic, not numeric. INV-2026-0100 sorts before INV-2026-0009. Produces duplicate numbersP1-2invoice.service.ts:433–434Number(invoice.amount_received) + params.amount — converts Prisma Decimal to Number (floating-point). Precision loss in financial calculationP1-3invoice.service.ts:433–436No overpayment guard: amount_received > total is allowed; invoice just marks 'paid'. Should throw 422P1-4invoice-pdf.service.tsx:367–368(invoice.company as Record<string, unknown>).pan_number — pan_number and gst_number do not exist on Company model. Always undefined on PDFsP1-5requirement-billing.service.ts:44–71deriveBillingStatus, linkInvoiceToRequirement, unlinkInvoiceFromRequirement still use the old invoice_id FK and never touch the junction table. Billing status cannot reflect partial billingP1-6invoice-template.job.ts:57Tax computed from p.tax field which does not exist on Particular type. Should call computeTaxLines()P1-7FinancePage.tsx:63,69Merges MOCK_INVOICES with real API data ([...MOCK_INVOICES, ...dbInvoices]). "Ready to Bill" tab populated from MOCK_REQUIREMENTS onlyP1-8InvoicePreview.tsx:3,102FynixLogo hardcoded import still present. All users see wrong company logoP1-9RequirementDetailsPage.tsx:73–76'billing' is in ReqDetailsTab type but missing from validTabs array. Tab URL routing broken for billing tab
P2 — Compliance & Type Safety (RULES.md §2 — no any)
IDLocationIssueP2-1invoice.ts:22particulars?: any[] — must be Particular[]P2-2FinancePage.tsx:52status: ... as any castP2-3BillingTab.tsx:32(requirement as any).total_billed — no proper typed propP2-4SmartRequirementSelect.tsx:95(req as { total_billed?: number }).total_billed — unsafe assertionP2-5CreateInvoicePage.tsx:17Still imports MOCK_REQUIREMENTSP2-6invoice-template.job.ts:57as any on default_particularsP2-7invoice-overdue.job.tsNotification failure not logged — silent swallow

Implementation Plan
FIX-A: Database Migration (Unblocks Everything Else)
Files:

alsonotify-backend/prisma/schema.prisma — minor addition: pan_number, gst_number on Company
Run: cd alsonotify-backend && pnpm prisma migrate dev --name invoice_v2_tables
Create: alsonotify-backend/prisma/migrations/data-migration-v2.sql

Steps:
A1 — Add missing Company fields for PDF/Tax (schema.prisma)
prisma// In model Company, add after existing fields:
pan_number   String?
gst_number   String?
state_code   String?   // For India CGST/SGST vs IGST determination
A2 — Run Prisma migration
This creates invoice_requirements, invoice_activities, invoice_templates tables and adds all V2 fields to Invoice and WorkspaceRequirement. Command:
bashcd alsonotify-backend && pnpm prisma migrate dev --name invoice_v2_tables
A3 — Create data-migration-v2.sql
sql-- Step 1: Rename legacy statuses in Invoice table
-- (Only needed if old invoices exist with 'open'/'past_due')
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
Run this after prisma migrate dev succeeds.
Note on invoice_id FK removal: Keep the old invoice_id FK on WorkspaceRequirement for now. It is still used by requirement-billing.service.ts derivation logic (P1-5 fix below updates the service to use junction table). After FIX-B-5 is complete and verified, a follow-up migration can drop the FK.

FIX-B: Backend Bug Fixes
File: alsonotify-backend/service/invoice-email.service.ts — Fix P0-4
Add requirePermission call at service entry and route status update through updateInvoiceStatusService:
typescript// At top of sendInvoiceEmailService, after invoice fetch:
await requirePermission(userTokenData, 'INVOICE_SEND');

// Replace direct prisma.invoice.update for status with:
await updateInvoiceStatusService(invoiceId, 'sent', userTokenData);
Import requirePermission from ../utils/permissions and updateInvoiceStatusService from same file.

File: alsonotify-backend/service/invoice.service.ts — Fix P1-1, P1-2, P1-3
P1-1 — Fix invoice number sequence (lines ~287–313):
Replace lexicographic orderBy: desc with numeric max extraction:
typescriptconst allInvoices = await prisma.invoice.findMany({
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
P1-2 & P1-3 — Fix Decimal precision + overpayment guard (lines ~430–444):
typescriptimport { Decimal } from '@prisma/client/runtime/library';

const current = new Decimal(invoice.amount_received.toString());
const payment = new Decimal(params.amount.toString());
const invoiceTotal = new Decimal(invoice.total.toString());
const newAmountReceived = current.plus(payment);

if (newAmountReceived.greaterThan(invoiceTotal)) {
    throw HttpError.unprocessableEntity('Payment amount exceeds invoice total.');
}
const newStatus: InvoiceStatus = newAmountReceived.greaterThanOrEqualTo(invoiceTotal) ? 'paid' : 'partial';
// Pass newAmountReceived directly to Prisma (accepts Decimal)
data: { amount_received: newAmountReceived, status: newStatus, updated_user: userTokenData.id }

File: alsonotify-backend/service/requirement-billing.service.ts — Fix P1-5
Rewrite deriveBillingStatus to use junction table aggregates and fall back to invoice_id for legacy data:
typescriptexport function deriveBillingStatus(requirement: {
    status: RequirementStatus | string;
    type: string;
    invoice_id: number | null;       // kept for legacy fallback
    total_billed: Decimal | number;
    quoted_price: Decimal | number | null;
    invoice_requirements?: { billed_amount: Decimal | number }[];
}): BillingStatus {
    if (requirement.type === 'inhouse') return 'Not_Billable';
    if (requirement.status !== 'Completed' && requirement.status !== RequirementStatus.Completed)
        return 'Not_Billable';

    const totalBilled = Number(requirement.total_billed ?? 0);
    const quotedPrice = Number(requirement.quoted_price ?? 0);

    if (totalBilled <= 0 && !requirement.invoice_id) return 'Ready_To_Bill';
    if (totalBilled >= quotedPrice && quotedPrice > 0) return 'Paid';
    if (totalBilled > 0) return 'Invoiced';
    return 'Ready_To_Bill';
}
Update linkInvoiceToRequirement to create InvoiceRequirement junction entry (in addition to syncing invoice_id for backward compatibility):
typescript// After existing validation, inside transaction:
await tx.invoiceRequirement.upsert({
    where: { invoice_id_requirement_id: { invoice_id: invoiceId, requirement_id: requirementId } },
    update: { billed_amount: billedAmount },
    create: { invoice_id: invoiceId, requirement_id: requirementId, billed_amount: billedAmount },
});
// Keep syncing invoice_id FK for legacy query support
await tx.workspaceRequirement.update({ where: { id: requirementId }, data: { invoice_id: invoiceId } });

File: alsonotify-backend/jobs/invoice-template.job.ts — Fix P1-6
Replace incorrect tax computation. Import computeTaxLines, getTotalTaxRate from ../utils/tax-engine:
typescript// Fetch sender and receiver company country for tax computation
const company = await prisma.company.findUnique({ where: { id: template.company_id }, select: { country: true, state_code: true } });
const clientCompany = template.client_company_id
    ? await prisma.company.findUnique({ where: { id: template.client_company_id }, select: { country: true, state_code: true } })
    : null;

const taxLines = computeTaxLines(
    company?.country ?? '',
    company?.state_code ?? null,
    clientCompany?.country ?? '',
    clientCompany?.state_code ?? null
);
const taxRate = getTotalTaxRate(taxLines);
const taxAmount = subTotal * (taxRate / 100);
const taxType = taxLines.map(t => `${t.name} ${t.rate}%`).join(' + ') || null;

File: alsonotify-backend/jobs/invoice-overdue.job.ts — Fix P2-7
Replace silent notification failure with proper logging:
typescript} catch (err) {
    app.log.warn({ err, invoiceId: inv.id }, '[InvoiceOverdueJob] Failed to send notification');
}

FIX-C: Frontend Critical Fixes
File: alsonotify-frontend/src/components/features/finance/SendInvoiceModal.tsx — Fix P0-3
Implement the full SendInvoiceModal per TRD §4.4. Key requirements:

Props: invoiceId: number, invoiceNumber: string, isOpen: boolean, onClose: () => void, onSent: () => void
On mount: call getEmailRecipients(invoiceId) to populate To/CC
Render editable To and CC pill-tag arrays (using Ant Design tag pattern matching EmailComposeModal.tsx)
Show invoice summary card (client name, total, due date)
Show static attachment chip: {invoiceNumber}.pdf
Textarea for customMessage
Send button calls sendInvoiceEmail({ invoiceId, toEmails, ccEmails, customMessage })
On success: onSent(), show toast, close modal
On error: show error toast, do NOT change any state
Use useSendInvoiceEmail() mutation from useInvoice.ts
Use useInvoice(invoiceId) for summary data


File: alsonotify-frontend/src/components/features/finance/CreateInvoicePage.tsx — Fix P0-2, P2-5
P0-2 — Wire handleSaveInvoice to API:
typescriptconst { mutateAsync: createInvoice, isPending: isSaving } = useCreateInvoice();

const handleSaveInvoice = async () => {
    try {
        const payload = buildInvoicePayload(); // extract current form state
        const created = await createInvoice(payload);
        toast.success(`Invoice ${created.invoice_number} saved as draft.`);
        router.push('/dashboard/finance');
    } catch (err) {
        toast.error('Failed to save invoice. Please try again.');
    }
};
Remove Math.random() IDs — use crypto.randomUUID() or nanoid() for client-side temporary line item IDs.
Remove MOCK_REQUIREMENTS import — replace with useCollaborativeRequirements hook (already available) filtered to billing_status: 'Ready_To_Bill' passed to SmartRequirementSelect.
Wire invoice number fetch on mount:
typescriptconst { data: nextNumber } = useQuery({
    queryKey: ['next-invoice-number'],
    queryFn: () => invoiceService.getNextInvoiceNumber(),
});
// Use nextNumber to pre-fill invoice_number field (read-only)

File: alsonotify-frontend/src/components/features/finance/FinancePage.tsx — Fix P1-7
Remove mock data mixing. Replace:
typescript// DELETE lines 22-27 (MOCK_REQUIREMENTS, MOCK_INVOICES imports)
// DELETE lines 63 ([...MOCK_INVOICES, ...dbInvoices])
// DELETE lines 69 (setRequirements(MOCK_REQUIREMENTS))
With:
typescriptconst { data: invoicesResponse, isLoading: invoicesLoading } = useInvoices({ company_id: currentCompany?.id });
const { data: requirementsResponse, isLoading: reqsLoading } = useRequirements({ billing_status: 'Ready_To_Bill' });
const invoices = useMemo(() => invoicesResponse?.data ?? [], [invoicesResponse]);
const requirements = useMemo(() => requirementsResponse?.data ?? [], [requirementsResponse]);
Add loading skeleton states where Skeleton component is already imported.

File: alsonotify-frontend/src/components/features/finance/InvoicePreview.tsx — Fix P1-8
typescript// DELETE: import FynixLogo from '@/assets/images/fynix-logo.png';

// Update InvoicePreviewData interface to add:
senderLogoUrl?: string;
senderName: string; // fallback text

// Replace logo render (line ~102):
{senderLogoUrl
    ? <img src={senderLogoUrl} alt="Company Logo" style={{ maxHeight: 60, maxWidth: 180 }} />
    : <span style={{ fontWeight: 700, fontSize: 18 }}>{senderName}</span>
}
Pass senderLogoUrl={currentCompany?.logo} and senderName={currentCompany?.name} from all callers.

File: alsonotify-frontend/src/components/features/requirements/RequirementDetailsPage.tsx — Fix P1-9
Add 'billing' to the validTabs array (line ~74):
typescriptvalidTabs: ['details', 'tasks', 'gantt', 'kanban', 'pnl', 'documents', 'billing']
//                                                                              ^^^ ADD

FIX-D: Type Safety & RULES.md Compliance
File: alsonotify-frontend/src/services/invoice.ts — Fix P2-1
typescript// Import Particular from shared types or define locally:
import type { Particular } from '@/types/invoice'; // or inline interface

// Replace:
particulars?: any[];
// With:
particulars?: Particular[];
File: alsonotify-frontend/src/components/features/requirements/components/BillingTab.tsx — Fix P2-3
Define proper typed prop for total_billed instead of as any cast:
typescriptinterface BillingTabProps {
    requirement: {
        id: number;
        quoted_price?: number | null;
        estimated_cost?: number | null;
        total_billed?: number | null;  // Add explicit field
    };
}
// Remove: (requirement as any).total_billed
// Use: requirement.total_billed ?? 0
File: alsonotify-frontend/src/components/features/finance/SmartRequirementSelect.tsx — Fix P2-4
Add total_billed to the typed interface used for requirement items. Fetch via useRequirements with include: ['billing_summary'] or add the field to the CollaborativeRequirement type.
File: alsonotify-frontend/src/components/features/finance/FinancePage.tsx — Fix P2-2
typescript// Replace:
status: (inv.status?.toLowerCase() || 'draft') as any
// With (define proper union type):
status: (inv.status?.toLowerCase() as InvoiceStatusType) ?? 'draft'
// Import InvoiceStatusType from shared types

FIX-C5: Replace SplitPaymentModal with TRD-compliant Pro-Ration Modal
File: alsonotify-frontend/src/components/features/finance/SplitPaymentModal.tsx — Full replacement
The current implementation is a payment milestone scheduler (future-dated payment splits). The TRD §4.2 specifies a pro-ration billing entry modal used within CreateInvoicePage when selecting a requirement to bill. Rewrite entirely:
typescriptinterface SplitPaymentModalProps {
    requirement: {
        id: number;
        name: string;
        quoted_price: number;
        total_billed: number;   // sum of prior InvoiceRequirement records
    };
    onConfirm: (billedAmount: number) => void;
    onClose: () => void;
    isOpen: boolean;
}
Modal layout:

Header: Requirement name + Quoted Price / Total Billed / Remaining Balance summary row
isFullPayment toggle (default: true) — "Full remaining balance" vs "Custom amount"
When custom: radio between Percentage (0–100% of quoted_price) and Fixed Amount
Live preview: "You are billing: ₹ X.XX of ₹ Y.YY remaining"
Validation: billedAmount must be > 0 and ≤ remaining_balance
Confirm button calls onConfirm(billedAmount) which sets the line item amount in CreateInvoicePage

typescriptconst remaining = requirement.quoted_price - requirement.total_billed;
const billedAmount = isFullPayment
    ? remaining
    : (mode === 'percentage'
        ? Math.min((percentage / 100) * requirement.quoted_price, remaining)
        : Math.min(customAmount, remaining));

FIX-E: Phase 8 — Testing & Verification
Backend:
bashcd alsonotify-backend
pnpm prisma migrate dev     # Must complete with 0 errors
pnpm prisma generate        # Must complete with 0 errors
pnpm tsc --noEmit           # Must show 0 TypeScript errors
pnpm vitest run tests/invoice.test.ts  # All tests must pass
Frontend:
bashcd alsonotify-frontend
pnpm build   # Must complete with 0 TypeScript errors, 0 unresolved imports
```

**Manual E2E Verification Checklist:**
1. Create invoice → verify server-generated `INV-2026-XXXX` number appears in form
2. Save draft → verify invoice persists in DB and appears in Drafts tab
3. Open SendInvoiceModal → verify recipients auto-populated, attachment chip shown
4. Send invoice → verify status changes to `sent`, `sent` tab shows it
5. Record partial payment → verify status → `partial`
6. Record remaining payment → verify status → `paid`, appears in History tab
7. Navigate to Requirement Details → Billing tab → verify invoices listed
8. Download PDF → verify company logo (not FynixLogo), correct tax fields
9. Navigate requirements workflow (Details/Tasks/Gantt/Kanban/P&L/Documents) → verify tabs still work
10. Verify "Ready to Bill" tab shows real requirements (no mock data)

---

### FIX-F: Phase 9 — Mock Data Cleanup (Post-Approval)

Only after FIX-C is verified working in staging:

1. **Delete** `MOCK_REQUIREMENTS`, `MOCK_INVOICES` exports from `mockFinanceData.ts`
2. After confirming zero imports remain, **delete** `mockFinanceData.ts` entirely
3. Run final `pnpm build` to confirm zero mock references

---

## Implementation Order & Critical Path
```
FIX-A (Migration) ──────────────────────────────────────────────┐
    └─► FIX-B (Backend Bugs) ────────────────────────────────────┤
            └─► FIX-C (Frontend Critical) ──────────────────────►│
                    └─► FIX-D (Type Safety) ─────────────────────┤
                                └─► FIX-E (Testing) ─────────────┤
                                        └─► FIX-F (Mock Cleanup) ┘
Each fix group is sequentially dependent. Do not skip ahead.

Original Workflow Preservation
The following original workflows must remain unbroken throughout:

Requirement creation/editing — RequirementsForm.tsx not changed
Requirement status progression — updateRequirementStatus service not touched
Requirement billing link (legacy) — invoice_id FK kept on WorkspaceRequirement; linkInvoiceToRequirement updated to write to BOTH junction table AND old FK
RequirementDetailsPage tabs 1–6 — only validTabs array modified to add 'billing'; no other tab rendering changed
Workspace/task flows — not modified


Key Files Changed in This Plan
FileFix IDsalsonotify-backend/prisma/schema.prismaFIX-A1alsonotify-backend/prisma/migrations/data-migration-v2.sql (new)FIX-A3alsonotify-backend/service/invoice-email.service.tsFIX-B (P0-4)alsonotify-backend/service/invoice.service.tsFIX-B (P1-1, P1-2, P1-3)alsonotify-backend/service/requirement-billing.service.tsFIX-B (P1-5)alsonotify-backend/jobs/invoice-template.job.tsFIX-B (P1-6)alsonotify-backend/jobs/invoice-overdue.job.tsFIX-B (P2-7)alsonotify-frontend/src/components/features/finance/SendInvoiceModal.tsxFIX-C (P0-3)alsonotify-frontend/src/components/features/finance/CreateInvoicePage.tsxFIX-C (P0-2, P2-5)alsonotify-frontend/src/components/features/finance/FinancePage.tsxFIX-C (P1-7), FIX-D (P2-2)alsonotify-frontend/src/components/features/finance/InvoicePreview.tsxFIX-C (P1-8)alsonotify-frontend/src/components/features/requirements/RequirementDetailsPage.tsxFIX-C (P1-9)alsonotify-frontend/src/services/invoice.tsFIX-D (P2-1)alsonotify-frontend/src/components/features/requirements/components/BillingTab.tsxFIX-D (P2-3)alsonotify-frontend/src/components/features/finance/SmartRequirementSelect.tsxFIX-D (P2-4)