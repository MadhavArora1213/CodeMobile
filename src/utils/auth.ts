import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const GITHUB_TOKEN_KEY = 'github_token';

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
}

export const saveGitHubToken = async (token: string): Promise<boolean> => {
  try {
    // Validate token first
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 200) {
      await SecureStore.setItemAsync(GITHUB_TOKEN_KEY, token);
      return true;
    }
    return false;
  } catch (error) {
    console.error('GitHub Token Validation Error:', error);
    return false;
  }
};

export const getGitHubToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(GITHUB_TOKEN_KEY);
  } catch (error) {
    return null;
  }
};

export const clearGitHubToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(GITHUB_TOKEN_KEY);
  } catch (error) {}
};

export const getGitHubUser = async (): Promise<GitHubUser | null> => {
  const token = await getGitHubToken();
  if (!token) return null;

  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    return null;
  }
};
