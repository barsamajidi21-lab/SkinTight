/**
 * Feature Flags & Brand Configuration
 *
 * Consumer-facing and pricing routes remain preserved behind these flags
 * so stored user accounts, data, and components can be restored at any time
 * without deleting code or records.
 */
export const FEATURE_FLAGS = {
  ENABLE_PRICING_PAGE: false,
  ENABLE_CONSUMER_HOME: false,
  ENABLE_CONSUMER_PROFILE: false,
  ENABLE_DERMATOLOGIST_FINDER: false,
  ENABLE_SKIN_ACADEMY: false,
  ENABLE_CONSUMER_AUTH: false,
  ENABLE_TIMELINE_AND_ROUTINE: false,
  ENABLE_PSEO_PAGES: false,
} as const;

export const CONTACT_EMAIL = 'barsa@skintightai.com';
export const BRAND_NAME = 'SkinTight AI';
