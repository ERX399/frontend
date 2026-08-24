export interface Ratio {
  label: string;
  w: number;
  h: number;
  checked: boolean;
}

export interface ShadowConfig {
  x: number;
  y: number;
  blur: number;
  color: string;
  alpha: number;
}

export interface ExportConfig {
  format: 'png' | 'svg';
  scales: number[];
  filename: string;
  transparentBg: boolean;
  exportRatios: string[];
}
