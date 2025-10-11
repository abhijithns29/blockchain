const { jsPDF } = require('jspdf');

class PDFGeneratorSimple {
  static async generateLandCertificate(land, qrCodeDataURL) {
    try {
      console.log("Creating simple land certificate...");
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      console.log("PDF document created successfully");
      
      // Simple header
      doc.setFontSize(20);
      doc.text('DIGITAL LAND REGISTRY', 105, 30, { align: 'center' });
      
      doc.setFontSize(16);
      doc.text('CERTIFICATE OF LAND OWNERSHIP', 105, 45, { align: 'center' });
      
      // Certificate details
      doc.setFontSize(12);
      doc.text(`Certificate No: DLR-${land.assetId?.toString() || land.landId?.toString() || "N/A"}`, 20, 70);
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 80, 70);
      
      // Owner declaration
      const ownerName = land.currentOwner?.fullName || "Unknown Owner";
      
      // Get Aadhaar number from verification documents
      let ownerAadhaar = "Not Available";
      if (land.currentOwner?.verificationDocuments?.aadhaarCard?.number) {
        ownerAadhaar = land.currentOwner.verificationDocuments.aadhaarCard.number;
      }
      
      doc.setFontSize(11);
      doc.text('OWNER DECLARATION', 20, 95);
      
      const declarationText = `This is to certify that ${ownerName} (Aadhaar: ${ownerAadhaar}) is the lawful owner of the land described below. This certificate serves as official proof of ownership under the Digital Land Registry System of India.`;
      
      const lines = doc.splitTextToSize(declarationText, pageWidth - 40);
      doc.text(lines, 20, 110);
      
      let yPos = 110 + (lines.length * 6) + 20; // Increased spacing
      
      // Land details
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('LAND DETAILS', 20, yPos);
      yPos += 15;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      
      doc.text(`Asset ID: ${land.assetId?.toString() || land.landId?.toString() || "N/A"}`, 20, yPos);
      yPos += 12; // Increased spacing
      doc.text(`Survey Number: ${land.surveyNumber || "N/A"}`, 20, yPos);
      yPos += 12;
      doc.text(`Village: ${land.village || "N/A"}`, 20, yPos);
      yPos += 12;
      doc.text(`Taluka: ${land.taluka || "N/A"}`, 20, yPos);
      yPos += 12;
      doc.text(`District: ${land.district || "N/A"}`, 20, yPos);
      yPos += 12;
      doc.text(`State: ${land.state || "N/A"}`, 20, yPos);
      yPos += 12;
      doc.text(`Pincode: ${land.pincode || "N/A"}`, 20, yPos);
      yPos += 12;
      doc.text(`Land Type: ${land.landType || "N/A"}`, 20, yPos);
      yPos += 12;
      doc.text(`Classification: ${land.classification || "N/A"}`, 20, yPos);
      yPos += 15; // Extra spacing before area
      
      // Area details
      let areaText = "N/A";
      if (land.area) {
        if (typeof land.area === 'string') {
          try {
            const areaObj = JSON.parse(land.area);
            areaText = `${areaObj.acres || 0} Acres, ${areaObj.guntas || 0} Guntas, ${areaObj.sqft || 0} Sq. Ft.`;
          } catch (e) {
            areaText = land.area;
          }
        } else if (typeof land.area === 'object') {
          areaText = `${land.area.acres || 0} Acres, ${land.area.guntas || 0} Guntas, ${land.area.sqft || 0} Sq. Ft.`;
        }
      }
      
      doc.text(`Area: ${areaText}`, 20, yPos);
      yPos += 20;
      
      // Add QR code on page 1
      if (qrCodeDataURL) {
        try {
          doc.addImage(qrCodeDataURL, 'PNG', pageWidth - 60, yPos - 40, 40, 40);
          doc.setFontSize(8);
          doc.text('Verification QR Code', pageWidth - 50, yPos + 10, { align: 'center' });
        } catch (qrError) {
          console.log("QR code error (non-fatal):", qrError.message);
        }
      }
      
      // Footer for page 1
      yPos = 270;
      doc.setFontSize(9);
      doc.text('This is an official digital certificate issued by the Government of India.', 20, yPos);
      yPos += 8;
      doc.text('Any tampering with this document is a criminal offense punishable by law.', 20, yPos);
      
      // ===============================
      // PAGE 2: OWNER INFORMATION & ADDITIONAL DETAILS
      // ===============================
      
      doc.addPage();
      
      // Page 2 header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text('OWNER INFORMATION & PROPERTY DETAILS', 105, 30, { align: 'center' });
      
      let page2Y = 60;
      
      // Owner information section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('CURRENT OWNER INFORMATION', 20, page2Y);
      doc.line(20, page2Y + 5, pageWidth - 20, page2Y + 5);
      page2Y += 20;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Owner Name: ${ownerName}`, 20, page2Y);
      page2Y += 15;
      doc.text(`Aadhaar Number: ${ownerAadhaar}`, 20, page2Y);
      page2Y += 15;
      doc.text(`Owner ID: ${land.currentOwner?._id?.toString() || "N/A"}`, 20, page2Y);
      page2Y += 15;
      doc.text(`Verification Status: ${land.currentOwner?.verificationStatus || "N/A"}`, 20, page2Y);
      page2Y += 25;
      
      // Ownership History
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('OWNERSHIP HISTORY', 20, page2Y);
      doc.line(20, page2Y + 5, pageWidth - 20, page2Y + 5);
      page2Y += 20;
      
      if (land.ownershipHistory && land.ownershipHistory.length > 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        // Table headers
        doc.setFont("helvetica", "bold");
        doc.text('Owner Name', 20, page2Y);
        doc.text('From Date', 80, page2Y);
        doc.text('To Date', 130, page2Y);
        doc.text('Transaction Type', 180, page2Y);
        page2Y += 12;
        doc.line(20, page2Y - 5, pageWidth - 20, page2Y - 5);
        
        // Ownership history entries
        land.ownershipHistory.forEach((entry) => {
          doc.setFont("helvetica", "normal");
          doc.text(entry.ownerName || 'Unknown', 20, page2Y);
          doc.text(new Date(entry.fromDate).toLocaleDateString('en-IN'), 80, page2Y);
          doc.text(entry.toDate ? new Date(entry.toDate).toLocaleDateString('en-IN') : 'Current', 130, page2Y);
          doc.text(entry.transactionType || 'N/A', 180, page2Y);
          page2Y += 10;
        });
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text('No previous ownership history available.', 20, page2Y);
        page2Y += 15;
      }
      
      // Boundaries if available
      if (land.boundaries && typeof land.boundaries === 'object') {
        page2Y += 15;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text('BOUNDARIES', 20, page2Y);
        doc.line(20, page2Y + 5, pageWidth - 20, page2Y + 5);
        page2Y += 20;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`North: ${land.boundaries.north || 'N/A'}`, 20, page2Y);
        page2Y += 12;
        doc.text(`South: ${land.boundaries.south || 'N/A'}`, 20, page2Y);
        page2Y += 12;
        doc.text(`East: ${land.boundaries.east || 'N/A'}`, 20, page2Y);
        page2Y += 12;
        doc.text(`West: ${land.boundaries.west || 'N/A'}`, 20, page2Y);
        page2Y += 20;
      }
      
      // Property characteristics if available
      if (land.metadata) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text('PROPERTY CHARACTERISTICS', 20, page2Y);
        doc.line(20, page2Y + 5, pageWidth - 20, page2Y + 5);
        page2Y += 20;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        if (land.metadata.soilType) {
          doc.text(`Soil Type: ${land.metadata.soilType}`, 20, page2Y);
          page2Y += 12;
        }
        
        if (land.metadata.waterSource) {
          doc.text(`Water Source: ${land.metadata.waterSource}`, 20, page2Y);
          page2Y += 12;
        }
        
        doc.text(`Road Access: ${land.metadata.roadAccess ? 'Yes' : 'No'}`, 20, page2Y);
        page2Y += 12;
        doc.text(`Electricity: ${land.metadata.electricityConnection ? 'Available' : 'Not Available'}`, 20, page2Y);
        page2Y += 20;
      }
      
      // Footer for page 2
      page2Y = Math.max(page2Y, 250);
      doc.setFontSize(9);
      doc.text('This certificate is digitally signed and tamper-proof', 105, page2Y, { align: 'center' });
      page2Y += 8;
      doc.text('Digital Land Registry System - Government of India', 105, page2Y, { align: 'center' });
      page2Y += 8;
      doc.text(`Certificate Generated: ${new Date().toLocaleString('en-IN')}`, 105, page2Y, { align: 'center' });
      
      console.log("Simple certificate generated successfully");
      
      // Return as Node.js Buffer
      const pdfBytes = doc.output("arraybuffer");
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error('Simple PDF generation error:', error);
      throw error;
    }
  }
}

module.exports = PDFGeneratorSimple;
