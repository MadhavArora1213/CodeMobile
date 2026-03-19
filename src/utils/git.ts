import git from 'isomorphic-git';
import FS from '@isomorphic-git/lightning-fs';
import http from 'isomorphic-git/http/web';
import { getGitHubToken } from './auth';

const fs = new FS('codemobile_fs');

const getAuth = async () => {
  const token = await getGitHubToken();
  if (!token) return undefined;
  return { username: token, password: '' };
};

export const gitClone = async (url: string, dir: string) => {
  try {
    const auth = await getAuth();
    await git.clone({
      fs,
      http,
      dir,
      url,
      singleBranch: true,
      depth: 1,
      onAuth: () => auth,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Git clone error:', error);
    return { success: false, error: error.message };
  }
};

export const gitStatus = async (dir: string) => {
  try {
    const status = await git.statusMatrix({ fs, dir });
    return status; // Returns [ [filepath, head, workdir, stage], ... ]
  } catch (error) {
    console.error('Git status error:', error);
    return [];
  }
};

export const gitAdd = async (dir: string, filepath: string) => {
  try {
    await git.add({ fs, dir, filepath });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const gitCommit = async (
  dir: string, 
  message: string, 
  author: { name: string, email: string }
) => {
  try {
    const sha = await git.commit({
      fs,
      dir,
      message,
      author,
    });
    return { success: true, sha };
  } catch (error: any) {
    console.error('Git commit error:', error);
    return { success: false, error: error.message };
  }
};

export const gitPush = async (dir: string) => {
  try {
    const auth = await getAuth();
    await git.push({
      fs,
      http,
      dir,
      onAuth: () => auth,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const gitPull = async (dir: string) => {
  try {
    const auth = await getAuth();
    await git.pull({
      fs,
      http,
      dir,
      onAuth: () => auth,
      singleBranch: true,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const gitLog = async (dir: string) => {
  try {
    return await git.log({ fs, dir, depth: 20 });
  } catch (error) {
    return [];
  }
};

export const gitListBranches = async (dir: string) => {
  try {
    return await git.listBranches({ fs, dir });
  } catch (error) {
    return [];
  }
};

export const gitCheckout = async (dir: string, ref: string) => {
  try {
    await git.checkout({ fs, dir, ref });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const gitInit = async (dir: string) => {
  try {
    await git.init({ fs, dir });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
