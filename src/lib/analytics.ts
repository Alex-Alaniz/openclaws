import posthog from 'posthog-js';

// Thin wrapper for PostHog event tracking.
// All event names and properties are defined here for consistency.

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window !== 'undefined') {
    posthog.capture(event, properties);
  }
}

// Landing / Marketing
export const trackSignupClicked = (source: string) => track('signup_clicked', { source });

// Auth
export const trackLoginStarted = (provider: string) => track('login_started', { provider });

// Billing
export const trackCheckoutStarted = () => track('checkout_started');
export const trackCheckoutCompleted = () => track('checkout_completed');

// Instance lifecycle
export const trackProvisionStarted = () => track('provision_started');
export const trackProvisionSucceeded = (region?: string) => track('provision_succeeded', { region });
export const trackInstanceDestroyed = () => track('instance_destroyed');

// Toolkits
export const trackToolkitConnectStarted = (toolkit: string) => track('toolkit_connect_started', { toolkit });
export const trackToolkitConnectCompleted = (toolkit: string) => track('toolkit_connect_completed', { toolkit });

// Chat
export const trackMessageSent = () => track('message_sent');

// Settings
export const trackModelChanged = (model: string) => track('model_changed', { model });
export const trackApiKeyAdded = (provider: string) => track('api_key_added', { provider });
export const trackApiKeyDeleted = (provider: string) => track('api_key_deleted', { provider });
