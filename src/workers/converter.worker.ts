// Web Worker for PDF processing
// This runs in a background thread so the UI stays at 60fps

self.onmessage = async (e: MessageEvent) => {
  const { action, payload, id } = e.data;

  try {
    switch (action) {
      case 'CONVERT_PDF_TO_DOCX': {
        const { fileBuffer, totalPages } = payload;

        // Simulate chunked processing (20 pages at a time)
        const CHUNK_SIZE = 20;
        let processedPages = 0;
        const extractedText: string[] = [];

        // Process in chunks
        for (let page = 1; page <= totalPages; page += CHUNK_SIZE) {
          const chunkEnd = Math.min(page + CHUNK_SIZE - 1, totalPages);

          // In a real implementation, use pdfjs-dist here:
          // const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
          // for (let p = page; p <= chunkEnd; p++) {
          //   const pdfPage = await pdf.getPage(p);
          //   const textContent = await pdfPage.getTextContent();
          //   extractedText.push(textContent.items.map(item => item.str).join(' '));
          // }

          // Simulated extraction for each page in chunk
          for (let p = page; p <= chunkEnd; p++) {
            extractedText.push(`[Page ${p} content extracted from PDF]`);
            processedPages++;
          }

          // Report progress back to main thread
          self.postMessage({
            id,
            type: 'PROGRESS',
            data: {
              processedPages,
              totalPages,
              percent: Math.round((processedPages / totalPages) * 100),
              message: `Processing page ${processedPages} of ${totalPages}...`,
            },
          });

          // Yield to avoid blocking worker thread
          await new Promise((r) => setTimeout(r, 50));
        }

        // Build DOCX content (in production: use docx library)
        // const doc = new Document({ sections: [{ children: extractedText.map(t => new Paragraph(t)) }] });
        // const buffer = await Packer.toBuffer(doc);

        self.postMessage({
          id,
          type: 'SUCCESS',
          data: {
            message: 'PDF converted successfully',
            pageCount: totalPages,
            textContent: extractedText,
            // buffer: buffer,  // real DOCX ArrayBuffer
          },
        });
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    self.postMessage({
      id,
      type: 'ERROR',
      error: error.message || 'Worker processing failed',
    });
  }
};
