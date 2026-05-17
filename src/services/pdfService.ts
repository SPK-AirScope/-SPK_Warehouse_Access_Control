import html2pdf from 'html2pdf.js';
import { EntryApplication } from './applicationService';

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

  // Keep this for backward compatibility or as a fallback, but mark it as deprecated if it's broken
  async generateApprovedPdf(app: EntryApplication, type: 'entry' | 'tools' = 'entry') {
     console.warn('generateApprovedPdf is deprecated. Use downloadElementAsPdf instead for better font support.');
     // For now, let's just trigger a click on a hidden element if App.tsx sets it up
     return ''; 
  }
};

