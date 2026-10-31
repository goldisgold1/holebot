// HoleA.I: expo-secure-store for the web build (/m), which Metro resolves here for the web platform. A browser
// has no keychain, so the values live in this site's localStorage. The phone builds keep the real store.
export type SecureStoreOptions = { keychainAccessible?: number; requireAuthentication?: boolean };

export const AFTER_FIRST_UNLOCK = 0;
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 1;
export const ALWAYS = 2;
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 3;
export const ALWAYS_THIS_DEVICE_ONLY = 4;
export const WHEN_UNLOCKED = 5;
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 6;

const PREFIX = "openbot.secure.";

export function getItem(key: string, _options?: SecureStoreOptions): string | null {
  return localStorage.getItem(PREFIX + key);
}

export function setItem(key: string, value: string, _options?: SecureStoreOptions): void {
  localStorage.setItem(PREFIX + key, value);
}

export async function getItemAsync(key: string, options?: SecureStoreOptions): Promise<string | null> {
  return getItem(key, options);
}

export async function setItemAsync(key: string, value: string, options?: SecureStoreOptions): Promise<void> {
  setItem(key, value, options);
}

export async function deleteItemAsync(key: string, _options?: SecureStoreOptions): Promise<void> {
  localStorage.removeItem(PREFIX + key);
}

export async function isAvailableAsync(): Promise<boolean> {
  return true;
}

export function canUseBiometricAuthentication(): boolean {
  return false;
}
