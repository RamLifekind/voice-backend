/**
 * Roles and Permissions Configuration
 * In-memory role definitions to avoid DB hits for every validation
 *
 * Future: Will have 12 roles with specific permissions
 * - Chiropractor can only add chiropractic care unit actions
 * - Nurse can add nursing-related actions
 * - etc.
 */

// Care Unit Action Categories (for future discipline-specific permissions)
const CARE_ACTION_CATEGORIES = {
  CHIROPRACTIC: ['98940', '98941', '97140', '97012', '97032'],
  PHYSICAL_THERAPY: ['97110', '97112', '97140', '97150'],
  BEHAVIORAL_HEALTH: ['90791', '90832', '90834', '90853', '90785'],
  MEDICAL: ['99204', '99213', '99214', '96372', '96130', '96136'],
  NUTRITION: ['97802', '97803', '97804'],
  ACUPUNCTURE: ['97810', '97811'],
  MASSAGE: ['97124'],
  CARE_MANAGEMENT: ['99490', '99487', '99489', '99439', '99426', '99427'],
  SCREENING: ['80305', '96127'],
  DME: ['L0648', 'L1851'],
  INJECTION: ['J1885', '96372'],
  OTHER: ['97139', '97026', 'S9451']
};

// Permission Actions
const ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  READ: 'read'
};

// Resources
const RESOURCES = {
  CARE_PLAN: 'care_plan',
  GHS: 'ghs',
  PATIENT: 'patient',
  IMAGING: 'imaging',
  MEETING: 'meeting'
};

// Role Definitions
// Future: Add 12 roles with specific category restrictions
const ROLES = {
  // LVN - Can add/update all care unit actions
  LVN: {
    id: 'LVN',
    name: 'Licensed Vocational Nurse',
    permissions: {
      [RESOURCES.CARE_PLAN]: [ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.READ],
      [RESOURCES.GHS]: [ACTIONS.UPDATE, ACTIONS.READ],
      [RESOURCES.PATIENT]: [ACTIONS.READ],
      [RESOURCES.IMAGING]: [ACTIONS.READ],
      [RESOURCES.MEETING]: [ACTIONS.READ]
    },
    // LVN can add ALL care action categories
    allowedCareCategories: Object.keys(CARE_ACTION_CATEGORIES)
  },

  // Physician - Full access including approval
  PHYSICIAN: {
    id: 'PHYSICIAN',
    name: 'Physician',
    permissions: {
      [RESOURCES.CARE_PLAN]: [ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.APPROVE, ACTIONS.READ],
      [RESOURCES.GHS]: [ACTIONS.UPDATE, ACTIONS.READ],
      [RESOURCES.PATIENT]: [ACTIONS.READ, ACTIONS.UPDATE],
      [RESOURCES.IMAGING]: [ACTIONS.READ],
      [RESOURCES.MEETING]: [ACTIONS.CREATE, ACTIONS.READ]
    },
    allowedCareCategories: Object.keys(CARE_ACTION_CATEGORIES)
  },

  // Chiropractor - Only chiropractic actions (future expansion)
  CHIROPRACTOR: {
    id: 'CHIROPRACTOR',
    name: 'Chiropractor',
    permissions: {
      [RESOURCES.CARE_PLAN]: [ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.READ],
      [RESOURCES.GHS]: [ACTIONS.UPDATE, ACTIONS.READ],
      [RESOURCES.PATIENT]: [ACTIONS.READ],
      [RESOURCES.IMAGING]: [ACTIONS.READ],
      [RESOURCES.MEETING]: [ACTIONS.READ]
    },
    // Chiropractor can only add chiropractic and physical therapy
    allowedCareCategories: ['CHIROPRACTIC', 'PHYSICAL_THERAPY']
  },

  // Behavioral Health Specialist
  BEHAVIORAL_HEALTH: {
    id: 'BEHAVIORAL_HEALTH',
    name: 'Behavioral Health Specialist',
    permissions: {
      [RESOURCES.CARE_PLAN]: [ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.READ],
      [RESOURCES.GHS]: [ACTIONS.UPDATE, ACTIONS.READ],
      [RESOURCES.PATIENT]: [ACTIONS.READ],
      [RESOURCES.IMAGING]: [ACTIONS.READ],
      [RESOURCES.MEETING]: [ACTIONS.READ]
    },
    allowedCareCategories: ['BEHAVIORAL_HEALTH', 'SCREENING']
  },

  // Nutritionist
  NUTRITIONIST: {
    id: 'NUTRITIONIST',
    name: 'Nutritionist',
    permissions: {
      [RESOURCES.CARE_PLAN]: [ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.READ],
      [RESOURCES.GHS]: [ACTIONS.READ],
      [RESOURCES.PATIENT]: [ACTIONS.READ],
      [RESOURCES.IMAGING]: [ACTIONS.READ],
      [RESOURCES.MEETING]: [ACTIONS.READ]
    },
    allowedCareCategories: ['NUTRITION']
  },

  // Care Manager - Can manage but not approve
  CARE_MANAGER: {
    id: 'CARE_MANAGER',
    name: 'Care Manager',
    permissions: {
      [RESOURCES.CARE_PLAN]: [ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.READ],
      [RESOURCES.GHS]: [ACTIONS.UPDATE, ACTIONS.READ],
      [RESOURCES.PATIENT]: [ACTIONS.READ],
      [RESOURCES.IMAGING]: [ACTIONS.READ],
      [RESOURCES.MEETING]: [ACTIONS.CREATE, ACTIONS.READ]
    },
    allowedCareCategories: ['CARE_MANAGEMENT', 'SCREENING']
  },

  // Acupuncturist
  ACUPUNCTURIST: {
    id: 'ACUPUNCTURIST',
    name: 'Acupuncturist',
    permissions: {
      [RESOURCES.CARE_PLAN]: [ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.READ],
      [RESOURCES.GHS]: [ACTIONS.READ],
      [RESOURCES.PATIENT]: [ACTIONS.READ],
      [RESOURCES.IMAGING]: [ACTIONS.READ],
      [RESOURCES.MEETING]: [ACTIONS.READ]
    },
    allowedCareCategories: ['ACUPUNCTURE']
  },

  // Massage Therapist
  MASSAGE_THERAPIST: {
    id: 'MASSAGE_THERAPIST',
    name: 'Massage Therapist',
    permissions: {
      [RESOURCES.CARE_PLAN]: [ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.READ],
      [RESOURCES.GHS]: [ACTIONS.READ],
      [RESOURCES.PATIENT]: [ACTIONS.READ],
      [RESOURCES.IMAGING]: [ACTIONS.READ],
      [RESOURCES.MEETING]: [ACTIONS.READ]
    },
    allowedCareCategories: ['MASSAGE']
  },

  // Physical Therapist
  PHYSICAL_THERAPIST: {
    id: 'PHYSICAL_THERAPIST',
    name: 'Physical Therapist',
    permissions: {
      [RESOURCES.CARE_PLAN]: [ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.READ],
      [RESOURCES.GHS]: [ACTIONS.UPDATE, ACTIONS.READ],
      [RESOURCES.PATIENT]: [ACTIONS.READ],
      [RESOURCES.IMAGING]: [ACTIONS.READ],
      [RESOURCES.MEETING]: [ACTIONS.READ]
    },
    allowedCareCategories: ['PHYSICAL_THERAPY']
  },

  // Admin - Full access to everything
  ADMIN: {
    id: 'ADMIN',
    name: 'Administrator',
    permissions: {
      [RESOURCES.CARE_PLAN]: [ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.APPROVE, ACTIONS.READ],
      [RESOURCES.GHS]: [ACTIONS.UPDATE, ACTIONS.READ],
      [RESOURCES.PATIENT]: [ACTIONS.READ, ACTIONS.UPDATE],
      [RESOURCES.IMAGING]: [ACTIONS.READ],
      [RESOURCES.MEETING]: [ACTIONS.CREATE, ACTIONS.READ]
    },
    allowedCareCategories: Object.keys(CARE_ACTION_CATEGORIES)
  },

  // Viewer - Read only
  VIEWER: {
    id: 'VIEWER',
    name: 'Read-Only Viewer',
    permissions: {
      [RESOURCES.CARE_PLAN]: [ACTIONS.READ],
      [RESOURCES.GHS]: [ACTIONS.READ],
      [RESOURCES.PATIENT]: [ACTIONS.READ],
      [RESOURCES.IMAGING]: [ACTIONS.READ],
      [RESOURCES.MEETING]: [ACTIONS.READ]
    },
    allowedCareCategories: []
  }
};

// Provider role mapping (in-memory, will come from DB later)
// UserNum -> Role ID
const PROVIDER_ROLES = new Map([
  // Example mappings - update with real provider UserNums
  [3055, 'LVN'],
  [3056, 'PHYSICIAN'],
  [3057, 'CHIROPRACTOR'],
  [3103, 'LVN'],
  [2179, 'LVN']
]);

// Default role for unknown providers
const DEFAULT_ROLE = 'LVN';

module.exports = {
  ROLES,
  ACTIONS,
  RESOURCES,
  CARE_ACTION_CATEGORIES,
  PROVIDER_ROLES,
  DEFAULT_ROLE
};
