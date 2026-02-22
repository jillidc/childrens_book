/**
 * PDF text extraction service. Uses pdf-parse for buffer → structured text.
 */

const { PDFParse } = require('pdf-parse');

/**
 * Parse PDF buffer and return structured text (per-page and full).
 * @param {Buffer} pdfBuffer - Raw PDF bytes
 * @returns {Promise<{ pages: Array<{ pageNumber: number, text: string }>, fullText: string, numPages: number }>}
 */
async function parsePdf(pdfBuffer) {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    throw new Error('Invalid PDF buffer');
  }

  const parser = new PDFParse({ data: pdfBuffer });
  try {
    const result = await parser.getText();
    await parser.destroy?.();

    const pages = (result.pages || []).map((p) => ({
      pageNumber: p.num ?? p.pageNumber ?? 0,
      text: p.text || ''
    }));

    return {
      pages,
      fullText: result.text || '',
      numPages: result.total ?? pages.length
    };
  } catch (err) {
    if (parser.destroy) {
      await parser.destroy().catch(() => {});
    }
    console.error('PDF parse error:', err);
    throw new Error('Failed to parse PDF: ' + (err.message || 'Unknown error'));
  }
}

module.exports = {
  parsePdf
};
