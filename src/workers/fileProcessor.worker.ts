// Web Worker for handling heavy file processing (PDF/DOCX generation)

self.onmessage = async (e: MessageEvent) => {
  const { action, payload, id } = e.data;

  try {
    switch (action) {
      case 'PROCESS_PDF':
        // Simulating heavy work for 250+ page PDF
        console.log(`Worker processing PDF with ${payload.rows} rows...`);
        
        // Let's fake a delay to simulate processing
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        self.postMessage({
          id,
          status: 'success',
          data: { message: 'PDF generated successfully', size: '2.4MB' }
        });
        break;

      case 'PROCESS_DOCX':
        // Simulating DOCX processing
        console.log(`Worker processing DOCX...`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        self.postMessage({
          id,
          status: 'success',
          data: { message: 'DOCX generated successfully' }
        });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    self.postMessage({
      id,
      status: 'error',
      error: error.message || 'Worker processing failed',
    });
  }
};
