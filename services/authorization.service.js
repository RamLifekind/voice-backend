/**
 * Authorization Service
 * In-memory permission checks - no DB hits for validation
 * Rejects unauthorized requests immediately
 */

const {
  ROLES,
  ACTIONS,
  RESOURCES,
  CARE_ACTION_CATEGORIES,
  PROVIDER_ROLES,
  DEFAULT_ROLE
} = require('../config/roles.config');

class AuthorizationService {
  constructor() {
    // Cache for quick lookups
    this.roleCache = new Map();
  }

  /**
   * Get role for a provider (from memory or default)
   * @param {number} userNum - Provider's UserNum
   * @returns {object} Role definition
   */
  getProviderRole(userNum) {
    const roleId = PROVIDER_ROLES.get(userNum) || DEFAULT_ROLE;
    return ROLES[roleId];
  }

  /**
   * Check if provider has permission for resource+action
   * @param {number} userNum
   * @param {string} resource - From RESOURCES
   * @param {string} action - From ACTIONS
   * @returns {object} { allowed: boolean, reason: string }
   */
  checkPermission(userNum, resource, action) {
    const role = this.getProviderRole(userNum);

    if (!role) {
      return {
        allowed: false,
        reason: `No role assigned to provider ${userNum}`
      };
    }

    const resourcePermissions = role.permissions[resource];

    if (!resourcePermissions) {
      return {
        allowed: false,
        reason: `Role ${role.name} has no access to ${resource}`
      };
    }

    if (!resourcePermissions.includes(action)) {
      return {
        allowed: false,
        reason: `Role ${role.name} cannot ${action} ${resource}`
      };
    }

    return {
      allowed: true,
      reason: `Authorized: ${role.name} can ${action} ${resource}`
    };
  }

  /**
   * Check if provider can add specific care action by CPT code
   * @param {number} userNum
   * @param {string} serviceCode - CPT code
   * @returns {object} { allowed: boolean, reason: string, category: string }
   */
  checkCareActionPermission(userNum, serviceCode) {
    const role = this.getProviderRole(userNum);

    if (!role) {
      return {
        allowed: false,
        reason: `No role assigned to provider ${userNum}`,
        category: null
      };
    }

    // Find which category this CPT code belongs to
    let foundCategory = null;
    for (const [category, codes] of Object.entries(CARE_ACTION_CATEGORIES)) {
      if (codes.includes(serviceCode)) {
        foundCategory = category;
        break;
      }
    }

    // If code not in any category, allow by default (for now)
    if (!foundCategory) {
      return {
        allowed: true,
        reason: `CPT code ${serviceCode} not categorized, allowing by default`,
        category: 'UNCATEGORIZED'
      };
    }

    // Check if role allows this category
    if (role.allowedCareCategories.includes(foundCategory)) {
      return {
        allowed: true,
        reason: `${role.name} can add ${foundCategory} actions`,
        category: foundCategory
      };
    }

    return {
      allowed: false,
      reason: `${role.name} cannot add ${foundCategory} care actions. Allowed: ${role.allowedCareCategories.join(', ')}`,
      category: foundCategory
    };
  }

  /**
   * Validate function call before execution
   * @param {string} functionName - OpenAI function name
   * @param {object} args - Function arguments
   * @param {number} userNum - Provider's UserNum
   * @returns {object} { allowed: boolean, reason: string }
   */
  validateFunctionCall(functionName, args, userNum) {
    console.log(`🔐 Validating: ${functionName} by provider ${userNum}`);

    switch (functionName) {
      case 'handle_care_unit_action': {
        const operation = args.operation;
        const serviceCode = args.service_code;

        // Map operation to action
        let action;
        switch (operation) {
          case 'add':
            action = ACTIONS.CREATE;
            break;
          case 'update':
            action = ACTIONS.UPDATE;
            break;
          case 'delete':
            action = ACTIONS.DELETE;
            break;
          default:
            action = ACTIONS.CREATE;
        }

        // Check basic permission
        const basicCheck = this.checkPermission(userNum, RESOURCES.CARE_PLAN, action);
        if (!basicCheck.allowed) {
          return basicCheck;
        }

        // Check category-specific permission
        const categoryCheck = this.checkCareActionPermission(userNum, serviceCode);
        if (!categoryCheck.allowed) {
          return categoryCheck;
        }

        return {
          allowed: true,
          reason: `Authorized: ${operation} care action (${categoryCheck.category})`
        };
      }

      case 'update_ghs_score': {
        return this.checkPermission(userNum, RESOURCES.GHS, ACTIONS.UPDATE);
      }

      case 'approve_action': {
        return this.checkPermission(userNum, RESOURCES.CARE_PLAN, ACTIONS.APPROVE);
      }

      case 'open_imaging_results': {
        return this.checkPermission(userNum, RESOURCES.IMAGING, ACTIONS.READ);
      }

      case 'start_scrum': {
        return this.checkPermission(userNum, RESOURCES.MEETING, ACTIONS.CREATE);
      }

      case 'close_ui_element': {
        // Always allow UI interactions
        return { allowed: true, reason: 'UI action allowed' };
      }

      default:
        // Unknown function - deny by default for security
        return {
          allowed: false,
          reason: `Unknown function: ${functionName}`
        };
    }
  }

}

// Singleton instance
const authService = new AuthorizationService();

module.exports = authService;
