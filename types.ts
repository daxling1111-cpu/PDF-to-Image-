
export interface ConvertedPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

export interface PDFMetadata {
  name: string;
  size: number;
  totalPages: number;
}

export interface AIAnalysis {
  summary: string;
  suggestedTitle: string;
  keyPoints: string[];
}

export enum ConversionStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  CONVERTING = 'CONVERTING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface PDFProject {
  id: string;
  file: File;
  metadata: PDFMetadata;
  status: ConversionStatus;
  pages: ConvertedPage[];
  selectedPages: number[];
  progress: number;
  aiAnalysis: AIAnalysis | null;
  error: string | null;
}

export type ExportFormat = 'png' | 'jpeg';
