import axios from 'axios';
import { LANGUAGES, LanguageMeta } from '../constants/languages';

const PISTON_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.10:2000') + '/api/v2/execute';

export interface PistonResponse {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
}

/**
 * M05 - Code Execution Utility (Piston API Wrapper)
 */
export const executeCode = async (
  languageId: string, 
  sourceCode: string, 
  filename: string = 'main'
): Promise<PistonResponse> => {
  try {
    const langMeta: LanguageMeta | undefined = LANGUAGES[languageId];
    
    // Fallback if language info not found
    const pistonId = langMeta?.pistonId || languageId;
    const version = langMeta?.version || '*';
    const extension = langMeta?.extension || 'txt';

    console.log('Executing code at:', PISTON_URL);
    const response = await axios.post(PISTON_URL, {
      language: pistonId,
      version: version,
      files: [
        {
          name: `${filename}.${extension}`,
          content: sourceCode,
        },
      ],
      stdin: "",
      args: [],
      compile_timeout: 10000,
      run_timeout: 3000
    });

    const cleanStderr = (response.data.run.stderr || '')
      .replace(/Cannot open \/sys\/fs\/cgroup\/isolate\/box-\d+\/memory\.events: No such file or directory\n?/g, '')
      .replace(/Control group root \/sys\/fs\/cgroup\/isolate does not exist\n?/g, '');

    return {
      ...response.data,
      run: {
        ...response.data.run,
        stderr: cleanStderr,
        output: response.data.run.stdout + cleanStderr
      }
    };
  } catch (error: any) {
    console.error('Error executing code via Piston:', error);
    return {
      language: languageId,
      version: 'unknown',
      run: {
        stdout: '',
      stderr: (error.response?.data?.message || error.message || 'Unknown error occurred')
        .replace(/Cannot open \/sys\/fs\/cgroup\/isolate\/box-\d+\/memory\.events: No such file or directory\n?/g, '')
        .replace(/Control group root \/sys\/fs\/cgroup\/isolate does not exist\n?/g, ''),
        code: 1,
        signal: null,
        output: error.message,
      },
    };
  }
};
