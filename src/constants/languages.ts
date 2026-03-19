export interface LanguageMeta {
  id: string;
  name: string;
  pistonId: string;
  version: string;
  extension: string;
}

export const LANGUAGES: Record<string, LanguageMeta> = {
  javascript: { id: 'javascript', name: 'JavaScript', pistonId: 'javascript', version: '*', extension: 'js' },
  typescript: { id: 'typescript', name: 'TypeScript', pistonId: 'typescript', version: '*', extension: 'ts' },
  python: { id: 'python', name: 'Python', pistonId: 'python', version: '*', extension: 'py' },
  java: { id: 'java', name: 'Java', pistonId: 'java', version: '*', extension: 'java' },
  cpp: { id: 'cpp', name: 'C++', pistonId: 'cpp', version: '*', extension: 'cpp' },
  c: { id: 'c', name: 'C', pistonId: 'c', version: '*', extension: 'c' },
  rust: { id: 'rust', name: 'Rust', pistonId: 'rust', version: '*', extension: 'rs' },
  go: { id: 'go', name: 'Go', pistonId: 'go', version: '*', extension: 'go' },
  php: { id: 'php', name: 'PHP', pistonId: 'php', version: '*', extension: 'php' },
  ruby: { id: 'ruby', name: 'Ruby', pistonId: 'ruby', version: '*', extension: 'rb' },
  kotlin: { id: 'kotlin', name: 'Kotlin', pistonId: 'kotlin', version: '*', extension: 'kt' },
  swift: { id: 'swift', name: 'Swift', pistonId: 'swift', version: '*', extension: 'swift' },
  bash: { id: 'bash', name: 'Bash', pistonId: 'bash', version: '*', extension: 'sh' },
  d: { id: 'd', name: 'D', pistonId: 'd', version: '*', extension: 'd' },
  fortran: { id: 'fortran', name: 'Fortran', pistonId: 'fortran', version: '*', extension: 'f90' },
};

export const getLanguageByExtension = (filename: string): LanguageMeta | undefined => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return Object.values(LANGUAGES).find(lang => lang.extension === ext);
};
