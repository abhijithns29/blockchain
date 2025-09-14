const { PDFDocument, rgb, degrees } = require('pdf-lib');
const sharp = require('sharp');

class DocumentWatermark {
  static async addWatermarkToPDF(pdfBuffer, watermarkText) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      
      pages.forEach(page => {
        const { width, height } = page.getSize();
        
        // Add diagonal watermark
        page.drawText(watermarkText, {
          x: width / 4,
          y: height / 2,
          size: 50,
          color: rgb(0.8, 0.8, 0.8),
          opacity: 0.3,
          rotate: degrees(-45)
        });
        
        // Add timestamp
        page.drawText(`Generated: ${new Date().toLocaleString()}`, {
          x: 50,
          y: 50,
          size: 8,
          color: rgb(0.5, 0.5, 0.5)
        });
      });
      
      return await pdfDoc.save();
    } catch (error) {
      console.error('PDF watermark error:', error);
      throw error;
    }
  }
  
  static async addWatermarkToImage(imageBuffer, watermarkText) {
    try {
      const image = sharp(imageBuffer);
      const { width, height } = await image.metadata();
      
      // Create watermark SVG
      const watermarkSvg = `
        <svg width="${width}" height="${height}">
          <text x="50%" y="50%" 
                font-family="Arial" 
                font-size="24" 
                fill="rgba(255,255,255,0.5)" 
                text-anchor="middle" 
                transform="rotate(-45 ${width/2} ${height/2})">
            ${watermarkText}
          </text>
        </svg>
      `;
      
      const watermarkBuffer = Buffer.from(watermarkSvg);
      
      return await image
        .composite([{ input: watermarkBuffer, gravity: 'center' }])
        .toBuffer();
    } catch (error) {
      console.error('Image watermark error:', error);
      throw error;
    }
  }
  
  static generateWatermarkText(assetId, ownerName) {
    return `LAND REGISTRY - ${assetId} - ${ownerName} - ${new Date().getFullYear()}`;
  }
}

module.exports = DocumentWatermark;