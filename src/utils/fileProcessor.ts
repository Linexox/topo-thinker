// @ts-ignore
import mammoth from "mammoth/mammoth.browser";
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker source globally
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function processFile(file: File): Promise<string> {
  if (file.type.startsWith("image/")) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(`\n\n![${file.name}](${reader.result})`);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } else if (file.name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return `\n\n\`\`\`file-attachment:${file.name}\n${result.value}\n\`\`\``;
    } catch (e) {
      console.error("Mammoth error", e);
      return `\n\n\`\`\`file-attachment:${file.name}\n(Error parsing docx)\n\`\`\``;
    }
  } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // @ts-ignore
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += `\n\n--- Page ${i} ---\n${pageText}`;
      }
      return `\n\n\`\`\`file-attachment:${file.name}\n${fullText}\n\`\`\``;
    } catch (e) {
      console.error("PDF error", e);
      return `\n\n\`\`\`file-attachment:${file.name}\n(Error parsing PDF)\n\`\`\``;
    }
  } else {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        if (res.includes('\0')) {
          resolve(`\n\n[File: ${file.name} (Binary data not shown)]`);
        } else {
          resolve(`\n\n\`\`\`file-attachment:${file.name}\n${res}\n\`\`\``);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}
