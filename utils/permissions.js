// write a permission constant for each role

// modules
const MODULES = {
    TRANSACTIONS: 'transactions',
    ASSETS: 'assets',
    ASSET_CATEGORY: 'asset_category',
    USERS: 'users',
    DEPARTMENT: 'department',
    REQUESTS: 'requests',
    COMPANY_SETTINGS: 'company_settings',
    PROFILE: 'profile',
    MAINTENANCE: 'maintenance',
    DOCUMENTS: 'documents',
}

// permissions
const PERMISSIONS = {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    LIST_OWN: 'list_own',
    CHANGE: 'change',
    // Additional permissions for specific operations
    GET_BY_ID: 'get_by_id',
    CHANGE_STATUS: 'change_status',
}

const ADMIN_PERMISSIONS = {
    [MODULES.TRANSACTIONS]: [
        PERMISSIONS.LIST,
        PERMISSIONS.GET_BY_ID,
        PERMISSIONS.CREATE,
        PERMISSIONS.UPDATE,
        PERMISSIONS.DELETE,
        PERMISSIONS.CHANGE_STATUS],
    [MODULES.ASSETS]: [
        PERMISSIONS.LIST,
        PERMISSIONS.LIST_OWN,
        PERMISSIONS.GET_BY_ID,
        PERMISSIONS.CREATE,
        PERMISSIONS.UPDATE,
        PERMISSIONS.DELETE,
        PERMISSIONS.CHANGE_STATUS],
    [MODULES.ASSET_CATEGORY]: [
        PERMISSIONS.LIST,
        PERMISSIONS.GET_BY_ID,
        PERMISSIONS.CREATE,
        PERMISSIONS.UPDATE,
        PERMISSIONS.DELETE],
    [MODULES.USERS]: [
        PERMISSIONS.LIST,
        PERMISSIONS.GET_BY_ID,
        PERMISSIONS.CREATE,
        PERMISSIONS.UPDATE,
        PERMISSIONS.DELETE,
        PERMISSIONS.CHANGE_STATUS],
    [MODULES.DEPARTMENT]: [
        PERMISSIONS.LIST,
        PERMISSIONS.GET_BY_ID,
        PERMISSIONS.CREATE,
        PERMISSIONS.UPDATE,
        PERMISSIONS.DELETE],
    [MODULES.REQUESTS]: [
        PERMISSIONS.LIST_OWN],
    [MODULES.COMPANY_SETTINGS]: [
        PERMISSIONS.CHANGE],
    [MODULES.PROFILE]: [
        PERMISSIONS.LIST],
    [MODULES.MAINTENANCE]: [
        PERMISSIONS.LIST,
        PERMISSIONS.GET_BY_ID,
        PERMISSIONS.CREATE,
        PERMISSIONS.UPDATE,
        PERMISSIONS.DELETE],
    [MODULES.DOCUMENTS]: [
        PERMISSIONS.LIST,
        PERMISSIONS.GET_BY_ID,
        PERMISSIONS.CREATE,
        PERMISSIONS.UPDATE,
        PERMISSIONS.DELETE],
}

const IT_MANAGER_PERMISSIONS = {
    [MODULES.TRANSACTIONS]: [
        PERMISSIONS.LIST,
        PERMISSIONS.GET_BY_ID,
        PERMISSIONS.CREATE,
        PERMISSIONS.UPDATE,
        PERMISSIONS.CHANGE_STATUS],
    [MODULES.ASSETS]: [
        PERMISSIONS.LIST,
        PERMISSIONS.LIST_OWN,
        PERMISSIONS.GET_BY_ID,
        PERMISSIONS.CREATE,
        PERMISSIONS.UPDATE,
        PERMISSIONS.DELETE,
        PERMISSIONS.CHANGE_STATUS],
    [MODULES.ASSET_CATEGORY]: [
        PERMISSIONS.LIST,
        PERMISSIONS.GET_BY_ID],
    [MODULES.USERS]: [
        PERMISSIONS.LIST,
        PERMISSIONS.GET_BY_ID],
    [MODULES.DEPARTMENT]: [
        PERMISSIONS.LIST,
        PERMISSIONS.GET_BY_ID],
    [MODULES.REQUESTS]: [
        PERMISSIONS.LIST_OWN,
        PERMISSIONS.CREATE,
        PERMISSIONS.UPDATE,
        PERMISSIONS.CHANGE_STATUS
    ],
    [MODULES.COMPANY_SETTINGS]: [],
    [MODULES.PROFILE]: [
        PERMISSIONS.LIST],
    [MODULES.MAINTENANCE]: [
        PERMISSIONS.LIST,
        PERMISSIONS.GET_BY_ID,
        PERMISSIONS.CREATE,
        PERMISSIONS.UPDATE,
        PERMISSIONS.DELETE],
    [MODULES.DOCUMENTS]: [
        PERMISSIONS.LIST,
        PERMISSIONS.GET_BY_ID,
        PERMISSIONS.CREATE,
        PERMISSIONS.UPDATE,
        PERMISSIONS.DELETE],
}

const EMPLOYEE_PERMISSIONS = {
    [MODULES.TRANSACTIONS]: [
        PERMISSIONS.CREATE,
        PERMISSIONS.CHANGE_STATUS],
    [MODULES.ASSETS]: [
        PERMISSIONS.LIST_OWN,
        PERMISSIONS.GET_BY_ID],
    [MODULES.ASSET_CATEGORY]: [],
    [MODULES.USERS]: [],
    [MODULES.DEPARTMENT]: [],
    [MODULES.REQUESTS]: [
        PERMISSIONS.LIST_OWN],
    [MODULES.COMPANY_SETTINGS]: [],
    [MODULES.PROFILE]: [
        PERMISSIONS.LIST],
    [MODULES.MAINTENANCE]: [
        PERMISSIONS.LIST_OWN,
        PERMISSIONS.GET_BY_ID,
        PERMISSIONS.CREATE,
        PERMISSIONS.UPDATE],
    [MODULES.DOCUMENTS]: [
        PERMISSIONS.LIST_OWN,
        PERMISSIONS.GET_BY_ID,
        PERMISSIONS.CREATE,
        PERMISSIONS.UPDATE],
}

// Function to check if a role has a specific permission
const checkPermission = (role, module, permission) => {
    let rolePermissions;

    switch (role.toLowerCase()) {
        case 'admin':
            rolePermissions = ADMIN_PERMISSIONS;
            break;
        case 'it_manager':
            rolePermissions = IT_MANAGER_PERMISSIONS;
            break;
        case 'employee':
            rolePermissions = EMPLOYEE_PERMISSIONS;
            break;
        default:
            return false;
    }

    const modulePermissions = rolePermissions[module];
    if (!modulePermissions) {
        return false;
    }

    return modulePermissions.includes(permission);
};

module.exports = {
    ADMIN_PERMISSIONS,
    IT_MANAGER_PERMISSIONS,
    EMPLOYEE_PERMISSIONS,
    checkPermission,
    MODULES,
    PERMISSIONS
}
