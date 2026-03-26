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
  csharp: { id: 'csharp', name: 'C#', pistonId: 'csharp', version: '*', extension: 'cs' },
  rust: { id: 'rust', name: 'Rust', pistonId: 'rust', version: '*', extension: 'rs' },
  go: { id: 'go', name: 'Go', pistonId: 'go', version: '*', extension: 'go' },
  php: { id: 'php', name: 'PHP', pistonId: 'php', version: '*', extension: 'php' },
  ruby: { id: 'ruby', name: 'Ruby', pistonId: 'ruby', version: '*', extension: 'rb' },
  kotlin: { id: 'kotlin', name: 'Kotlin', pistonId: 'kotlin', version: '*', extension: 'kt' },
  swift: { id: 'swift', name: 'Swift', pistonId: 'swift', version: '*', extension: 'swift' },
  dart: { id: 'dart', name: 'Dart', pistonId: 'dart', version: '*', extension: 'dart' },
  bash: { id: 'bash', name: 'Bash', pistonId: 'bash', version: '*', extension: 'sh' },
  sql: { id: 'sql', name: 'SQL (SQLite)', pistonId: 'sqlite3', version: '*', extension: 'sql' },
  lua: { id: 'lua', name: 'Lua', pistonId: 'lua', version: '*', extension: 'lua' },
  elixir: { id: 'elixir', name: 'Elixir', pistonId: 'elixir', version: '*', extension: 'ex' },
  haskell: { id: 'haskell', name: 'Haskell', pistonId: 'haskell', version: '*', extension: 'hs' },
  r: { id: 'r', name: 'R', pistonId: 'r', version: '*', extension: 'r' },
  scala: { id: 'scala', name: 'Scala', pistonId: 'scala', version: '*', extension: 'scala' },
  julia: { id: 'julia', name: 'Julia', pistonId: 'julia', version: '*', extension: 'jl' },
  perl: { id: 'perl', name: 'Perl', pistonId: 'perl', version: '*', extension: 'pl' },
  zig: { id: 'zig', name: 'Zig', pistonId: 'zig', version: '*', extension: 'zig' },
  nim: { id: 'nim', name: 'Nim', pistonId: 'nim', version: '*', extension: 'nim' },
  d: { id: 'd', name: 'D', pistonId: 'd', version: '*', extension: 'd' },
  fortran: { id: 'fortran', name: 'Fortran', pistonId: 'fortran', version: '*', extension: 'f90' },
  clojure: { id: 'clojure', name: 'Clojure', pistonId: 'clojure', version: '*', extension: 'clj' },
  groovy: { id: 'groovy', name: 'Groovy', pistonId: 'groovy', version: '*', extension: 'groovy' },
  pascal: { id: 'pascal', name: 'Pascal', pistonId: 'pascal', version: '*', extension: 'pas' },
  prolog: { id: 'prolog', name: 'Prolog', pistonId: 'prolog', version: '*', extension: 'pl' },
  lisp: { id: 'lisp', name: 'Lisp', pistonId: 'commonlisp', version: '*', extension: 'lisp' },
};

export const getLanguageByExtension = (filename: string): LanguageMeta | undefined => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return Object.values(LANGUAGES).find(lang => lang.extension === ext);
};
