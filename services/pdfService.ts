
import { ConvertedPage, PDFMetadata } from "../types";

// Dynamic import for pdfjs since we use it as an ESM module in the HTML
const getPdfJS = async () => {
  // @ts-ignore
  const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
  return pdfjsLib;
};

export const loadPDF = async (file: File): Promise<{ pdf: any; metadata: PDFMetadata }> => {
  const pdfjsLib = await getPdfJS();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const metadata: PDFMetadata = {
    name: file.name,
    size: file.size,
    totalPages: pdf.numPages
  };

  return { pdf, metadata };
};

/**
 * Converts a PDF page to an image.
 * Scale of 4.166... provides ~300 DPI (300 / 72).
 */
export const convertPageToImage = async (
  pdf: any, 
  pageNumber: number, 
  scale: number = 4.16,
  format: 'png' | 'jpeg' = 'png'
): Promise<ConvertedPage> => {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: format === 'png' });
  
  if (!context) throw new Error("Could not get canvas context");
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  // Set white background for JPEG since transparency is not supported
  if (format === 'jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
    intent: 'print' // Use print intent for better text rendering
  };

  await page.render(renderContext).promise;
  
  const dataUrl = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? 0.95 : 1.0);
  
  return {
    pageNumber,
    dataUrl,
    width: viewport.width,
    height: viewport.height
  };
};
