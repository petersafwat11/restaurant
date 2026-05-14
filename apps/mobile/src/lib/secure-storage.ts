import * as SecureStore from 'expo-secure-store';

const REFRESH_KEY = 'refresh_token';
const ACCESS_KEY = 'access_token';

export const secureStorage = {
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(REFRESH_KEY, token);
  },
  async clearRefreshToken(): Promise<void> {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },
  async setAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_KEY, token);
  },
  async clearAccessToken(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
  },
};
