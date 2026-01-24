import { useEffect } from 'react';
import { getAllFonts, loadFontToDocument } from '@/utils/fontManager';

export default function CustomFontLoader() {
  useEffect(() => {
    // Load all fonts from IndexedDB on startup
    const loadFonts = async () => {
      try {
        const fonts = await getAllFonts();
        for (const font of fonts) {
           // Basic check to avoid re-loading if possible, though loadFontToDocument handles errors
           // Note: document.fonts.check() checks if a specific font style is loaded, 
           // but here we just iterate DB.
           await loadFontToDocument(font);
        }
      } catch (error) {
        console.error("Failed to load custom fonts", error);
      }
    };
    loadFonts();
  }, []);

  return null;
}
