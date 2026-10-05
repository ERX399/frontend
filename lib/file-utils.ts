export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  mtime?: string;
  children?: FileItem[];
  downloadUrl?: string;
}

export function formatSize(bytes?: number): string {
  if (bytes === undefined) return '';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

export function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
    case 'avif':
      return 'lucide:file-image';
    case 'mp4':
    case 'webm':
    case 'mkv':
    case 'mov':
    case 'avi':
      return 'lucide:file-video';
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'ogg':
      return 'lucide:file-audio';
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
    case 'zpaq':
      return 'lucide:folder-archive';
    case 'pdf':
      return 'lucide:file-text';
    case 'doc':
    case 'docx':
      return 'lucide:file-text';
    case 'xls':
    case 'xlsx':
      return 'lucide:file-spreadsheet';
    case 'ppt':
    case 'pptx':
      return 'lucide:file-text';
    case 'js':
    case 'ts':
    case 'html':
    case 'css':
    case 'py':
    case 'go':
    case 'json':
    case 'md':
      return 'lucide:file-code';
    case 'exe':
    case 'msi':
    case 'iso':
      return 'lucide:settings';
    case 'txt':
      return 'lucide:file-text';
    default:
      return 'lucide:file';
  }
}
