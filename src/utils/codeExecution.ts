import axios from 'axios';
import { LANGUAGES, LanguageMeta } from '../constants/languages';

const PISTON_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.9:3000') + '/api/execute';

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

    return response.data;
  } catch (error: any) {
    console.error('Error executing code via Piston:', error);
    return {
      language: languageId,
      version: 'unknown',
      run: {
        stdout: '',
        stderr: error.response?.data?.message || error.message || 'Unknown error occurred',
        code: 1,
        signal: null,
        output: error.message,
      },
    };
  }
};
