import html2pdf from 'html2pdf.js';
import { EntryApplication } from './applicationService';

async function removeWhiteBackground(imageSrc: string): Promise<Uint8Array> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > 200 && g > 200 && b > 200) {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  return await new Promise<Uint8Array>((resolve) => {
    canvas.toBlob((blob) => {
      blob!.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
    }, 'image/png');
  });
}

export const pdfService = {
  async downloadElementAsPdf(elementId: string, filename: string) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('Element not found:', elementId);
      return;
    }
    
    const opt = {
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        letterRendering: true,
        logging: false,
        windowWidth: 1024, // Render at a wider width to prevent narrow/mobile-like layout
        onclone: (clonedDoc: Document) => {
          // Remove all oklch and oklab references in computed styles to prevent html2canvas crashes
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            // Check inline styles and attributes
            if (el.style) {
              const styleStr = el.getAttribute('style') || '';
              if (styleStr.includes('oklch') || styleStr.includes('oklab')) {
                // Clear any problematic styles that might contain these functions
                // html2canvas crashes when it tries to parse these modern color functions
                el.style.color = el.style.color?.includes('ok') ? '#1A1A1A' : el.style.color;
                el.style.backgroundColor = el.style.backgroundColor?.includes('ok') ? '#ffffff' : el.style.backgroundColor;
                el.style.borderColor = el.style.borderColor?.includes('ok') ? '#000000' : el.style.borderColor;
                el.style.fill = el.style.fill?.includes('ok') ? '#000000' : el.style.fill;
                el.style.stroke = el.style.stroke?.includes('ok') ? '#000000' : el.style.stroke;
                el.style.boxShadow = 'none';
                el.style.backgroundImage = 'none';
              }
            }
          }
          
          // Also strip any style tags that might have these functions
          const styles = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styles.length; i++) {
            const s = styles[i];
            if (s.innerHTML.includes('oklch') || s.innerHTML.includes('oklab')) {
              // More aggressive regex to strip any property line containing oklch/oklab
              // This matches properties like: color: oklab(...); or background-color: oklch(...);
              s.innerHTML = s.innerHTML.replace(/[a-z-]+\s*:\s*([^;}]*(?:oklch|oklab)[^;}]*);?/g, '');
            }
          }
        }
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      }
    };
    
    try {
      await html2pdf().from(element).set(opt).save();
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    }
  },

  async stampUploadedPdf(pdfFile: File, stampSrc: string = '/1.JPG'): Promise<void> {
    const { PDFDocument } = await import('pdf-lib');

    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const stampPng = await removeWhiteBackground(stampSrc);
    const stampImage = await pdfDoc.embedPng(stampPng);

    const pages = pdfDoc.getPages();
    const page = pages[pages.length - 1];
    const { width, height } = page.getSize();

    const sz = Math.min(width, height) * 0.13;
    page.drawImage(stampImage, {
      x: width - sz - 24,
      y: 18,
      width: sz,
      height: sz,
      opacity: 0.88,
    });

    const modifiedBytes = await pdfDoc.save();
    const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfFile.name.replace(/\.pdf$/i, '_직인.pdf');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async generateApprovedPdf(app: EntryApplication, type: 'entry' | 'tools' = 'entry') {
     console.warn('generateApprovedPdf is deprecated. Use downloadElementAsPdf instead for better font support.');
     return '';
  }
};

