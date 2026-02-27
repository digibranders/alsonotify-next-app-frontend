
import { UserDto } from '@/types/dto/user.dto';

/**
 * Standardizes the retrieval of a Partner ID from various potential fields returned by the backend.
 * Checks fields in the following order of preference:
 * 1. partner_user_id (Explicit partner user link)
 * 2. user_id (Generic user link)
 * 3. client_id (Client context)
 * 4. outsource_id (Outsourcing context)
 * 5. association_id (Association context)
 * 6. invite_id (Invite context)
 * 7. id (Fallback to the object's own ID)
 *
 * Note: company_id is excluded here to distinguish between User/Partner entity ID and Company ID.
 * Use getPartnerCompanyId() for Company context.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPartnerId(partner: any): number | undefined {
    if (!partner) return undefined;

    const id = partner.partner_user_id ??
        partner.user_id ??
        partner.client_id ??
        partner.outsource_id ??
        partner.association_id ??
        partner.invite_id ??
        partner.id;

    return typeof id === 'number' ? id : undefined;
}

/**
 * Standardizes the retrieval of a Partner Name from various potential fields.
 * Checks fields in the following order of preference:
 * 1. partner_user.name (Explicit partner user name)
 * 2. partner_user.company (Explicit partner company name)
 * 3. company (If string) or company.name (If object)
 * 4. partner_company.name (Partner company details)
 * 5. name (Direct name property)
 * 6. email (Fallback to email)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPartnerName(partner: any): string {
    if (!partner) return 'Unknown Partner';

    // Check nested partner_user object
    if (partner.partner_user) {
        if (partner.partner_user.name) return partner.partner_user.name;
        if (partner.partner_user.company) return partner.partner_user.company;
    }

    // Check company field (can be string or object)
    if (partner.company) {
        if (typeof partner.company === 'string') return partner.company;
        if (typeof partner.company === 'object' && partner.company.name) return partner.company.name;
    }

    // Check partner_company object
    if (partner.partner_company?.name) return partner.partner_company.name;

    // Direct properties
    if (partner.name) return partner.name;
    if (partner.email) return partner.email;

    return 'Unknown Partner';
}

/**
 * Validates if a partner is active or accepted.
 * Allows if status is 'ACCEPTED' OR if is_active is explicitly true (handling potential missing status in legacy data).
 * Explicitly rejects if is_active is false.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isValidPartner(partner: any): boolean {
    if (!partner) return false;

    // Explicit deactivation check
    if (partner.is_active === false) return false;

    return partner.status === 'ACCEPTED' || partner.is_active === true;
}

/**
 * Helper to get filter options for partners, ensuring consistent ID and Name usage.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPartnerOptions(partners: any[]) {
    if (!partners || !Array.isArray(partners)) return [];

    return partners
        .filter(isValidPartner)
        .map(p => ({
            label: getPartnerName(p),
            value: String(getPartnerId(p))
        }));
}

/**
 * Helper to get the company ID specifically from a partner object.
 * Useful when the context requires the Company ID (e.g. Workspace partner_id) rather than the User ID.
 * Falls back to getPartnerId if company_id is missing, assuming the primary ID represents the entity.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPartnerCompanyId(partner: any): number | undefined {
    if (!partner) return undefined;

    if (typeof partner.company_id === 'number') return partner.company_id;
    if (typeof partner.company === 'object' && typeof partner.company.id === 'number') return partner.company.id;

    // Fallback to standard ID if no specific company ID found
    return getPartnerId(partner);
}
