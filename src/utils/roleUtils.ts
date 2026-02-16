export type UserRole = 'Admin' | 'Head' | 'Finance' | 'HR' | 'Manager' | 'Employee' | 'Coordinator';

/**
 * Minimal type for user objects passed to getRoleFromUser.
 * Only includes properties that the function actually accesses.
 */
interface RoleLike {
    id?: number;
    name?: string;
}

interface UserLike {
    role?: RoleLike | string | null;
    email?: string;
    role_id?: number | null;
    roleName?: string; // Add roleName as a top-level property
    user_employee?: {
        role?: RoleLike | string | null;
        role_id?: number | null;
    } | null;
}

export const getRoleFromUser = (user: UserLike | null | undefined): UserRole => {
    if (!user) return 'Employee';

    // 0. Try explicitly passed roleName (from mapper) - Most Reliable
    if (user.roleName) {
        const roleLower = user.roleName.toLowerCase().trim();
        if (roleLower === 'admin') return 'Admin';
        if (roleLower === 'head') return 'Head';
        if (roleLower === 'finance') return 'Finance';
        if (roleLower === 'hr') return 'HR';
        if (roleLower === 'manager') return 'Manager';
        if (roleLower === 'employee') return 'Employee';
        if (roleLower === 'coordinator') return 'Coordinator';
    }

    // 1. Try Role Name (Fallback)
    const roleVal = user?.role || user?.user_employee?.role;
    const roleName = typeof roleVal === 'string' ? roleVal : (roleVal as RoleLike)?.name;

    if (roleName) {
        const roleLower = roleName.toLowerCase().trim();
        if (roleLower === 'admin') return 'Admin';
        if (roleLower === 'head') return 'Head';
        if (roleLower === 'finance') return 'Finance';
        if (roleLower === 'hr') return 'HR';
        if (roleLower === 'manager') return 'Manager';
        if (roleLower === 'employee') return 'Employee';
        if (roleLower === 'coordinator') return 'Coordinator';

        // Fallback fuzzy matching if exact match fails
        if (roleLower.includes('admin')) return 'Admin';
        if (roleLower.includes('manager')) return 'Manager';
        if (roleLower.includes('finance')) return 'Finance';
        if (roleLower.includes('hr')) return 'HR';
        if (roleLower.includes('department') || roleLower.includes('head')) return 'Head';
        if (roleLower.includes('coordinator')) return 'Coordinator';
    }

    // 2. Try Role ID (Fallback / Legacy)
    // Note: These IDs might change after database reset. Name matching is preferred.
    const roleId = user?.role_id ||
        user?.user_employee?.role_id ||
        (typeof user?.role === 'object' ? (user?.role as RoleLike)?.id : undefined);

    if (roleId) {
        const roleIdMapping: Record<number, UserRole> = {
            1: 'Admin',
            2: 'Employee',
            3: 'HR',       // Updated from legacy mapping
            4: 'Admin',
            5: 'Head',
            6: 'Finance',  // Updated from legacy mapping
            7: 'Manager',
            8: 'Coordinator',
        };
        if (roleIdMapping[roleId]) {
            return roleIdMapping[roleId];
        }
    }

    return 'Employee';
};

/**
 * Checks if a user is a "Super Admin" or "Developer".
 * This is used to restrict access to sensitive features like Feedbacks.
 * Currently hardcoded to specific emails or logic, as requested.
 */
export const isSuperAdmin = (user: UserLike | null | undefined): boolean => {
    if (!user) return false;

    const role = getRoleFromUser(user);
    if (role !== 'Admin') return false;

    // Check environment variable for developer emails (comma-separated)
    const envDeveloperEmails = process.env.NEXT_PUBLIC_DEVELOPER_EMAILS || '';
    const DEVELOPER_EMAILS = envDeveloperEmails.split(',').map(e => e.trim()).filter(Boolean);

    // If user has a specific email property, check it
    const email = user.email;
    if (email && DEVELOPER_EMAILS.includes(email)) {
        return true;
    }

    return false;
};
