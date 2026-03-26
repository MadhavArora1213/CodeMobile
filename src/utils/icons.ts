import { 
  File, Folder, FolderOpen, 
  FileText, Terminal, Image as LucideImage, Braces, Settings, Package, 
  Layout, Shield, Database, Wrench, Link, FolderCode, Atom, Brackets,
  FileVideo, FileAudio, FileArchive, Sheet, FileType, FileCode as FileCodeIcon
} from 'lucide-react-native';

export const getFileIconInfo = (name: string): { Icon?: any; color: string; uri?: string } => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const lc = name.toLowerCase();

  // Official Logo URLs (PNG)
  const logoMap: { [key: string]: string } = {
    'js': 'javascript', 'jsx': 'javascript',
    'ts': 'typescript', 'tsx': 'typescript',
    'py': 'python', 'pyc': 'python', 'pyd': 'python',
    'java': 'java', 'jar': 'java',
    'c': 'c', 'h': 'c',
    'cpp': 'cpp', 'hpp': 'cpp', 'cc': 'cpp',
    'html': 'html', 'htm': 'html',
    'css': 'css', 'scss': 'css',
    'rs': 'rust',
    'go': 'go',
    'php': 'php',
    'rb': 'ruby',
    'kt': 'kotlin',
    'swift': 'swift',
    'dart': 'dart',
    'cs': 'csharp',
    'lua': 'lua',
    'ex': 'elixir',
    'exs': 'elixir',
    'hs': 'haskell',
    'r': 'r',
    'scala': 'scala',
    'jl': 'julia',
    'zig': 'zig',
    'nim': 'nim',
    'clj': 'clojure',
    'pro': 'prolog',
    'groovy': 'groovy',
    'pas': 'pascal',
    'lisp': 'lisp',
    'pl': 'perl',
  };

  if (logoMap[ext]) {
    let logoUri = `https://cdn.jsdelivr.net/npm/programming-languages-logos/src/${logoMap[ext]}/${logoMap[ext]}.png`;
    
    // Elixir specific reliable logo
    if (logoMap[ext] === 'elixir') {
       logoUri = 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Official_Elixir_logo.png';
    }

    return { 
      uri: logoUri,
      color: '#fff' 
    };
  }

  // Exact filename matches for tools
  if (lc === 'package.json' || lc === 'package-lock.json') return { Icon: Package, color: '#CB171E' };
  if (lc === 'tsconfig.json') return { Icon: Settings, color: '#3178C6' };
  if (lc === 'dockerfile') return { Icon: Settings, color: '#2496ED' };
  if (lc === '.gitignore') return { Icon: Shield, color: '#F05032' };
  if (lc.startsWith('readme')) return { Icon: FileText, color: '#42A5F5' };

  // Fallback to Lucide Icons for non-language files
  if (ext === 'md') return { Icon: FileText, color: '#90A4AE' };
  if (['rs', 'rust'].includes(ext)) return { Icon: Settings, color: '#DEA584' };
  if (ext === 'go') return { Icon: Settings, color: '#00ADD8' };
  if (ext === 'php') return { Icon: Braces, color: '#777BB3' };
  if (ext === 'rb') return { Icon: Brackets, color: '#CC342D' };
  if (ext === 'swift') return { Icon: FileCodeIcon, color: '#FA7343' };
  if (ext === 'kt') return { Icon: FileCodeIcon, color: '#A97BFF' };
  if (ext === 'd') return { Icon: Braces, color: '#B03931' };
  if (['f90', 'f', 'fortran'].includes(ext)) return { Icon: FileText, color: '#4D41B1' };
  if (['sh', 'bash'].includes(ext)) return { Icon: Terminal, color: '#4EAA25' };
  if (['tsx', 'jsx'].includes(ext)) return { Icon: Atom, color: '#61dafb' };
  if (ext === 'sql') return { Icon: Database, color: '#FFD700' };
  if (ext === 'cs') return { Icon: FileCodeIcon, color: '#390091' };
  if (ext === 'dart') return { Icon: FileCodeIcon, color: '#00C4B3' };
  if (ext === 'lua') return { Icon: FileCodeIcon, color: '#000080' };
  if (['ex', 'exs'].includes(ext)) return { Icon: FileCodeIcon, color: '#4E2A8E' };
  if (ext === 'hs') return { Icon: FileCodeIcon, color: '#5D4F85' };
  if (ext === 'r') return { Icon: FileCodeIcon, color: '#276DC3' };
  if (ext === 'scala') return { Icon: FileCodeIcon, color: '#DE3423' };
  if (ext === 'jl') return { Icon: FileCodeIcon, color: '#9558B2' };
  if (ext === 'zig') return { Icon: FileCodeIcon, color: '#F7A41D' };
  if (ext === 'nim') return { Icon: FileCodeIcon, color: '#FFE953' };
  if (ext === 'clj') return { Icon: FileCodeIcon, color: '#5881D8' };
  if (ext === 'groovy') return { Icon: FileCodeIcon, color: '#4298B8' };
  if (ext === 'pas') return { Icon: FileCodeIcon, color: '#E61E24' };
  if (ext === 'pl') return { Icon: FileCodeIcon, color: '#004065' };
  if (ext === 'lisp') return { Icon: FileCodeIcon, color: '#3FB984' };
  if (ext === 'json') return { Icon: Braces, color: '#fb923c' };
  if (['yaml', 'yml'].includes(ext)) return { Icon: Braces, color: '#CB171E' };
  if (['sh', 'bash', 'zsh', 'bat'].includes(ext)) return { Icon: Terminal, color: '#4EAA25' };
  if (ext === 'txt') return { Icon: FileText, color: '#CCCCCC' };
  if (ext === 'pdf') return { Icon: FileText, color: '#FF3333' };

  // Media
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp'].includes(ext)) return { Icon: LucideImage, color: '#4EC9B0' };
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return { Icon: FileVideo, color: '#FF5555' };
  if (['mp3', 'wav', 'flac', 'm4a', 'ogg'].includes(ext)) return { Icon: FileAudio, color: '#FF8800' };
  if (['csv', 'xls', 'xlsx'].includes(ext)) return { Icon: Sheet, color: '#21A366' };
  if (['zip', 'gz', 'tar', 'rar', '7z', 'iso'].includes(ext)) return { Icon: FileArchive, color: '#D4D4D4' };

  if (name.startsWith('.env')) return { Icon: Settings, color: '#858585' };
  if (lc === '.gitignore') return { Icon: Shield, color: '#f43f5e' };
  if (lc === 'app.json') return { Icon: Braces, color: '#fb923c' };

  return { Icon: File, color: '#94a3b8' };
};

export const getFolderIconInfo = (name: string, isExpanded: boolean): { Icon: any; color: string; uri?: string } => {
  const lc = name.toLowerCase();
  let icon = isExpanded ? FolderOpen : Folder;
  let color = '#C09553';
  
  if (lc === 'src') { color = '#3b82f6'; icon = FolderCode; }
  else if (['assets', 'images', 'img'].includes(lc)) { color = '#4aee88'; icon = LucideImage; }
  else if (lc === 'node_modules') { color = '#4aee88'; icon = Folder; }
  else if (lc === '.git') { color = '#f1502f'; icon = Shield; }
  else if (['components', 'ui'].includes(lc)) { color = '#4aee88'; icon = Layout; }
  else if (lc === 'hooks' || lc === 'utils') { color = '#a855f7'; icon = Link; }
  else if (lc === 'constants') { color = '#858585'; icon = Folder; }
  else if (['styles', 'css', 'scss'].includes(lc)) color = '#519aba';
  else if (['scripts', 'js', 'ts', 'bin'].includes(lc)) { color = '#cbcb41'; icon = Terminal; }
  else if (['api', 'server', 'backend'].includes(lc)) { color = '#4EAA25'; icon = Database; }
  else if (['tests', '__tests__', 'spec'].includes(lc)) { color = '#ff8c00'; icon = Shield; }
  else if (['config', 'settings'].includes(lc)) { color = '#858585'; icon = Wrench; }
  
  return { Icon: icon, color };
};
