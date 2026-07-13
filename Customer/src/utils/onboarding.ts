import type {Customer} from '../types/auth';

function isPlaceholderName(name?: string) {
  return /^Customer\s+\d+$/i.test(name || '');
}

export function needsProfileSetup(customer: Customer | null | undefined) {
  if (!customer) return false;
  if (customer.profileSetupCompleted === false) return true;
  if (customer.profileSetupCompleted === true) return false;
  // Legacy auto-created accounts without the new flag
  return isPlaceholderName(customer.name);
}

export function needsMembershipOnboarding(customer: Customer | null | undefined) {
  if (!customer) return false;
  if (customer.onboardingCompleted === true) return false;
  if (needsProfileSetup(customer)) return false;
  return customer.onboardingCompleted === false;
}

export function needsOnboarding(customer: Customer | null | undefined) {
  return needsProfileSetup(customer) || needsMembershipOnboarding(customer);
}

/** Where authenticated users should land based on onboarding state */
export function getPostAuthPath(customer: Customer | null | undefined) {
  if (needsProfileSetup(customer)) return '/onboarding/create-account';
  if (needsMembershipOnboarding(customer)) return '/onboarding/membership';
  return '/home';
}
