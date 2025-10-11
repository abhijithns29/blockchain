const { jsPDF } = require('jspdf');

class PDFGenerator {
  static async generateLandCertificate(land, qrCodeDataURL) {
    try {
      console.log("Creating professional land certificate...");
      
      // Validate input data
      if (!land) {
        throw new Error("Land data is required to generate certificate");
      }
      
      // Log data for debugging
      console.log("Land data received:", {
        assetId: land.assetId,
        landId: land.landId,
        surveyNumber: land.surveyNumber,
        currentOwner: land.currentOwner ? land.currentOwner.fullName : 'NIL'
      });
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // ===============================
      // PAGE 1: MAIN CERTIFICATE
      // ===============================

      this.addHeaderSection(doc, pageWidth);
      this.addCertificateDetails(doc, pageWidth, land);
      this.addOwnerDeclaration(doc, pageWidth, land);
      this.addLandDetails(doc, pageWidth, land);
      this.addAreaDetails(doc, pageWidth, land);
      this.addQRCode(doc, pageWidth, pageHeight, qrCodeDataURL);
      this.addFooter(doc, pageWidth, pageHeight);

      // ===============================
      // PAGE 2: OWNERSHIP & HISTORY
      // ===============================

      doc.addPage();
      this.addHeaderSection(doc, pageWidth);
      this.addOwnershipHistory(doc, pageWidth, pageHeight, land);

      console.log("Professional land certificate generated successfully");
      const pdfBytes = doc.output("arraybuffer");
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error('Error generating land certificate:', error);
      throw error;
    }
  }

  static addHeaderSection(doc, pageWidth) {
    const pageHeight = doc.internal.pageSize.getHeight();

    // Modern gradient background (simulated with rectangles)
    doc.setFillColor(245, 248, 252);
    doc.rect(0, 0, pageWidth, 60, 'F');

    // Accent line
    doc.setDrawColor(25, 103, 210);
    doc.setLineWidth(3);
    doc.line(0, 60, pageWidth, 60);

    // Official seal circle on top right
    doc.setDrawColor(25, 103, 210);
    doc.setLineWidth(2);
    doc.circle(pageWidth - 25, 20, 12, 'S');

    doc.setFontSize(10);
    doc.setTextColor(25, 103, 210);
    doc.setFont("helvetica", "bold");
    doc.text('VERIFIED', pageWidth - 25, 22, { align: 'center' });

    // Government header
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.text('GOVERNMENT OF DEMO', 15, 18);

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 103, 210);
    doc.text('DIGITAL LAND REGISTRY SYSTEM', 15, 28);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text('Ministry of Rural Development', 15, 38);
    doc.text(`Certificate issued: ${new Date().toLocaleDateString('en-IN')}`, 15, 48);
  }

  static addCertificateDetails(doc, pageWidth, land) {
    let yPos = 75;

    // Certificate header box
    doc.setFillColor(240, 245, 252);
    doc.rect(15, yPos - 5, pageWidth - 30, 25, 'F');
    doc.setDrawColor(25, 103, 210);
    doc.setLineWidth(1.5);
    doc.rect(15, yPos - 5, pageWidth - 30, 25);

    // Certificate number and details
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 103, 210);
    doc.text('CERTIFICATE OF OWNERSHIP', 20, yPos + 8);

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    
    // Safe certificate number generation with proper error handling
    let certNo = "NIL";
    try {
      if (land.assetId) {
        certNo = `DLR-${land.assetId.toString()}`;
      } else if (land.landId) {
        certNo = `DLR-${land.landId.toString()}`;
      } else {
        certNo = "DLR-NIL";
        console.log("Warning: No asset ID or land ID found, using NIL");
      }
    } catch (error) {
      console.error("Error generating certificate number:", error);
      certNo = "DLR-NIL";
    }
    
    doc.text(`Certificate No: ${certNo}`, pageWidth - 115, yPos + 8);

    yPos += 30;
  }

  static addOwnerDeclaration(doc, pageWidth, land) {
    let yPos = 110;

    // Section title
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 103, 210);
    doc.text('OWNER DECLARATION', 20, yPos);

    // Underline
    doc.setDrawColor(25, 103, 210);
    doc.setLineWidth(0.5);
    doc.line(20, yPos + 3, 100, yPos + 3);

    yPos += 10;

    // Declaration text
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    // Safe owner data extraction with error handling
    let ownerName = "NIL";
    let ownerAadhaar = "NIL";
    
    try {
      // Debug: Log the currentOwner structure
      console.log("Current owner structure:", JSON.stringify(land.currentOwner, null, 2));
      
      if (land.currentOwner) {
        // Try multiple possible name fields
        try {
          ownerName = (land.currentOwner.fullName || 
                     land.currentOwner.name || 
                     land.currentOwner.firstName || 
                     land.currentOwner.username || 
                     "NIL").toString();
        } catch (error) {
          console.error("Error extracting owner name in declaration:", error);
          ownerName = "NIL";
        }
        
        // Try multiple possible Aadhaar locations
        try {
          if (land.currentOwner.verificationDocuments && 
              land.currentOwner.verificationDocuments.aadhaarCard && 
              land.currentOwner.verificationDocuments.aadhaarCard.number) {
            ownerAadhaar = land.currentOwner.verificationDocuments.aadhaarCard.number.toString();
            console.log("✅ Aadhaar found in verificationDocuments.aadhaarCard.number:", ownerAadhaar);
          } else if (land.currentOwner.aadhaarNumber) {
            ownerAadhaar = land.currentOwner.aadhaarNumber.toString();
            console.log("✅ Aadhaar found in aadhaarNumber:", ownerAadhaar);
          } else if (land.currentOwner.aadhaar) {
            ownerAadhaar = land.currentOwner.aadhaar.toString();
            console.log("✅ Aadhaar found in aadhaar:", ownerAadhaar);
          } else {
            console.log("⚠️ Warning: Owner Aadhaar not found in verification documents, using NIL");
            console.log("Available verification documents:", JSON.stringify(land.currentOwner.verificationDocuments, null, 2));
            ownerAadhaar = "NIL";
          }
        } catch (error) {
          console.error("Error extracting Aadhaar in declaration:", error);
          ownerAadhaar = "NIL";
        }
      } else {
        console.log("Warning: No currentOwner found, using NIL");
      }
    } catch (error) {
      console.error("Error extracting owner data:", error);
      ownerName = "NIL";
      ownerAadhaar = "NIL";
    }

    const declarationText = `This is to certify that ${ownerName} (Aadhaar: ${ownerAadhaar}) is the lawful owner of the land described below. This certificate serves as official proof of ownership under the Digital Land Registry System of India.`;

    const lines = doc.splitTextToSize(declarationText, pageWidth - 40);
    doc.text(lines, 20, yPos);

    yPos += lines.length * 5 + 8;
    return yPos;
  }

  static addLandDetails(doc, pageWidth, land) {
    let yPos = 145;

    // Section title
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 103, 210);
    doc.text('LAND DETAILS', 20, yPos);

    // Underline
    doc.setDrawColor(25, 103, 210);
    doc.setLineWidth(0.5);
    doc.line(20, yPos + 3, 80, yPos + 3);

    yPos += 12;

    // Two-column layout
    const leftCol = 20;
    const rightCol = pageWidth / 2 + 19;
    const lineHeight = 6.5;
    let leftY = yPos;
    let rightY = yPos;

    doc.setFontSize(8.5);

    // Safe data extraction with proper error handling and NIL values
    const getSafeValue = (value, fieldName) => {
      try {
        if (value === null || value === undefined || value === '') {
          console.log(`Warning: ${fieldName} is empty, using NIL`);
          return "NIL";
        }
        return value.toString();
      } catch (error) {
        console.error(`Error processing ${fieldName}:`, error);
        return "NIL";
      }
    };

    const leftData = [
      { label: 'Asset ID', value: getSafeValue(land.assetId || land.landId, 'Asset ID') },
      { label: 'Survey Number', value: getSafeValue(land.surveyNumber, 'Survey Number') },
      { label: 'Sub Division', value: getSafeValue(land.subDivision || land.subdivision, 'Sub Division') },
      { label: 'Village', value: getSafeValue(land.village, 'Village') },
      { label: 'Taluka', value: getSafeValue(land.taluka, 'Taluka') },
    ];

    const rightData = [
      { label: 'District', value: getSafeValue(land.district, 'District') },
      { label: 'State', value: getSafeValue(land.state, 'State') },
      { label: 'Pincode', value: getSafeValue(land.pincode, 'Pincode') },
      { label: 'Land Type', value: getSafeValue(land.landType, 'Land Type') },
      { label: 'Classification', value: getSafeValue(land.classification, 'Classification') },
    ];

    // Left column
    leftData.forEach(item => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text(item.label + ':', leftCol, leftY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(item.value, leftCol + 38, leftY);

      leftY += lineHeight;
    });

    // Right column
    rightData.forEach(item => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text(item.label + ':', rightCol, rightY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(item.value, rightCol + 38, rightY);

      rightY += lineHeight;
    });

    return Math.max(leftY, rightY) + 5;
  }

  static addAreaDetails(doc, pageWidth, land) {
    let yPos = 190;

    // Section title
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 103, 210);
    doc.text('AREA & BOUNDARIES', 20, yPos);

    // Underline
    doc.setDrawColor(25, 103, 210);
    doc.setLineWidth(0.5);
    doc.line(20, yPos + 3, 100, yPos + 3);

    yPos += 10;

    doc.setFontSize(8.5);

    // Safe area information extraction with error handling
    let areaText = "NIL";
    try {
      if (land.area) {
        if (typeof land.area === 'string') {
          try {
            const areaObj = JSON.parse(land.area);
            const acres = areaObj.acres || 0;
            const guntas = areaObj.guntas || 0;
            const sqft = areaObj.sqft || 0;
            areaText = `${acres} Acres, ${guntas} Guntas, ${sqft} Sq. Ft.`;
          } catch (e) {
            console.log("Warning: Failed to parse area string, using as-is");
            areaText = land.area || "NIL";
          }
        } else if (typeof land.area === 'object') {
          const acres = land.area.acres || 0;
          const guntas = land.area.guntas || 0;
          const sqft = land.area.sqft || 0;
          areaText = `${acres} Acres, ${guntas} Guntas, ${sqft} Sq. Ft.`;
        }
      } else {
        console.log("Warning: No area data found, using NIL");
      }
    } catch (error) {
      console.error("Error processing area data:", error);
      areaText = "NIL";
    }

    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text('Total Area:', 20, yPos);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(areaText, 60, yPos);

    yPos += 7;

    // Safe boundaries extraction with error handling
    yPos += 7;
    try {
      if (land.boundaries && typeof land.boundaries === 'object') {
        const getSafeBoundary = (boundary) => {
          if (!boundary || boundary === '' || boundary === null || boundary === undefined) {
            return "NIL";
          }
          return boundary.toString();
        };

        const boundaries = [
          { dir: 'North', val: getSafeBoundary(land.boundaries.north) },
          { dir: 'South', val: getSafeBoundary(land.boundaries.south) },
          { dir: 'East', val: getSafeBoundary(land.boundaries.east) },
          { dir: 'West', val: getSafeBoundary(land.boundaries.west) },
        ];

        const colWidth = (pageWidth - 40) / 2;
        let boundY = yPos;
        boundaries.forEach((b, i) => {
          if (i === 2) boundY = yPos; // Reset for second column

          const xPos = i < 2 ? 20 : 20 + colWidth;
          if (i === 2) boundY = yPos;

          doc.setFont("helvetica", "bold");
          doc.setTextColor(60, 60, 60);
          doc.text(b.dir + ':', xPos, boundY);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(b.val, xPos + 25, boundY);

          boundY += 7;
        });
      } else {
        console.log("Warning: No boundaries data found, showing NIL for all directions");
        const boundaries = [
          { dir: 'North', val: "NIL" },
          { dir: 'South', val: "NIL" },
          { dir: 'East', val: "NIL" },
          { dir: 'West', val: "NIL" },
        ];

        const colWidth = (pageWidth - 40) / 2;
        let boundY = yPos;
        boundaries.forEach((b, i) => {
          if (i === 2) boundY = yPos;
          const xPos = i < 2 ? 20 : 20 + colWidth;
          if (i === 2) boundY = yPos;

          doc.setFont("helvetica", "bold");
          doc.setTextColor(60, 60, 60);
          doc.text(b.dir + ':', xPos, boundY);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(b.val, xPos + 25, boundY);

          boundY += 7;
        });
      }
    } catch (error) {
      console.error("Error processing boundaries:", error);
      // Show NIL for all boundaries on error
      const boundaries = [
        { dir: 'North', val: "NIL" },
        { dir: 'South', val: "NIL" },
        { dir: 'East', val: "NIL" },
        { dir: 'West', val: "NIL" },
      ];

      const colWidth = (pageWidth - 40) / 2;
      let boundY = yPos;
      boundaries.forEach((b, i) => {
        if (i === 2) boundY = yPos;
        const xPos = i < 2 ? 20 : 20 + colWidth;
        if (i === 2) boundY = yPos;

        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text(b.dir + ':', xPos, boundY);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(b.val, xPos + 25, boundY);

        boundY += 7;
      });
    }

    return yPos + 20;
  }

  static addQRCode(doc, pageWidth, pageHeight, qrCodeDataURL) {
    if (!qrCodeDataURL) return;

    try {
      const qrSize = 35;
      const qrX = pageWidth - qrSize - 15;
      const qrY = pageHeight - qrSize - 45;

      // QR container
      doc.setFillColor(248, 248, 248);
      doc.rect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 'F');

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6);

      // QR code
      doc.addImage(qrCodeDataURL, 'PNG', qrX, qrY, qrSize, qrSize);

      // Label
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text('SCAN TO VERIFY', qrX + qrSize / 2, qrY + qrSize + 6, { align: 'center' });
    } catch (e) {
      console.log("QR code error:", e.message);
    }
  }

  static addFooter(doc, pageWidth, pageHeight) {
    const footerY = pageHeight - 15;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);

    // Divider line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(15, footerY - 8, pageWidth - 15, footerY - 8);

    doc.text('This is an official digital certificate issued by the Government of Demo.', pageWidth / 2, footerY - 4, { align: 'center' });
    doc.text('Tamper-proof | Blockchain verified | Valid across all jurisdictions', pageWidth / 2, footerY + 2, { align: 'center' });
  }

  static addOwnershipHistory(doc, pageWidth, pageHeight, land) {
    let yPos = 75;

    // Current Owner Section
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 103, 210);
    doc.text('CURRENT OWNER INFORMATION', 20, yPos);

    doc.setDrawColor(25, 103, 210);
    doc.setLineWidth(0.5);
    doc.line(20, yPos + 3, 140, yPos + 3);

    yPos += 12;

    if (land.currentOwner) {
      doc.setFontSize(9);
      
      // Safe owner details extraction with error handling
      const getSafeOwnerValue = (value, fieldName) => {
        try {
          if (value === null || value === undefined || value === '') {
            console.log(`Warning: ${fieldName} is empty, using NIL`);
            return "NIL";
          }
          return value.toString();
        } catch (error) {
          console.error(`Error processing ${fieldName}:`, error);
          return "NIL";
        }
      };

      // Get owner name with multiple fallbacks
      const getOwnerName = () => {
        try {
          return (land.currentOwner.fullName || 
                 land.currentOwner.name || 
                 land.currentOwner.firstName || 
                 land.currentOwner.username || 
                 "NIL").toString();
        } catch (error) {
          console.error("Error extracting owner name:", error);
          return "NIL";
        }
      };

      // Get Aadhaar with multiple fallbacks
      const getOwnerAadhaar = () => {
        try {
          if (land.currentOwner.verificationDocuments && 
              land.currentOwner.verificationDocuments.aadhaarCard && 
              land.currentOwner.verificationDocuments.aadhaarCard.number) {
            const aadhaar = land.currentOwner.verificationDocuments.aadhaarCard.number.toString();
            console.log("✅ Aadhaar found in ownership section:", aadhaar);
            return aadhaar;
          } else if (land.currentOwner.aadhaarNumber) {
            const aadhaar = land.currentOwner.aadhaarNumber.toString();
            console.log("✅ Aadhaar found in aadhaarNumber:", aadhaar);
            return aadhaar;
          } else if (land.currentOwner.aadhaar) {
            const aadhaar = land.currentOwner.aadhaar.toString();
            console.log("✅ Aadhaar found in aadhaar:", aadhaar);
            return aadhaar;
          } else {
            console.log("⚠️ Warning: No Aadhaar found in ownership section");
            console.log("Verification documents:", JSON.stringify(land.currentOwner.verificationDocuments, null, 2));
          }
        } catch (error) {
          console.error("Error extracting Aadhaar:", error);
        }
        return "NIL";
      };

      // Get verification status with multiple fallbacks
      const getVerificationStatus = () => {
        if (land.currentOwner.verificationStatus) {
          return land.currentOwner.verificationStatus;
        } else if (land.currentOwner.status) {
          return land.currentOwner.status;
        } else if (land.currentOwner.isVerified) {
          return "VERIFIED";
        } else {
          return "NIL";
        }
      };

      const ownerDetails = [
        { label: 'Full Name', value: getOwnerName() },
        { label: 'Aadhaar Number', value: getOwnerAadhaar() },
        { label: 'Verification Status', value: getVerificationStatus() },
        { label: 'Owner ID', value: getSafeOwnerValue(land.currentOwner._id?.toString(), 'Owner ID') },
      ];

      ownerDetails.forEach(item => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text(item.label + ':', 20, yPos);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(item.value, 70, yPos);

        yPos += 7;
      });
    }

    yPos += 10;

    // Ownership History
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 103, 210);
    doc.text('OWNERSHIP HISTORY', 20, yPos);

    doc.setDrawColor(25, 103, 210);
    doc.setLineWidth(0.5);
    doc.line(20, yPos + 3, 120, yPos + 3);

    yPos += 12;

    try {
      // Debug: Log ownership history structure
      console.log("Ownership history structure:", JSON.stringify(land.ownershipHistory, null, 2));
      
      if (land.ownershipHistory && land.ownershipHistory.length > 0) {
        // Table header
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);

        // Header background
        doc.setFillColor(25, 103, 210);
        doc.rect(20, yPos - 4, pageWidth - 40, 6, 'F');

        doc.text('Owner Name', 22, yPos + 1);
        doc.text('From Date', 90, yPos + 1);
        doc.text('To Date', 130, yPos + 1);
        doc.text('Type', 160, yPos + 1);

        yPos += 8;

        // Table rows
        doc.setTextColor(60, 60, 60);
        doc.setFont("helvetica", "normal");

        land.ownershipHistory.forEach((entry, index) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            this.addHeaderSection(doc, pageWidth);
            yPos = 75;
          }

          // Alternate row background
          if (index % 2 === 0) {
            doc.setFillColor(245, 248, 252);
            doc.rect(20, yPos - 4, pageWidth - 40, 6, 'F');
          }

          doc.setFontSize(8);
          
          // Safe ownership history data extraction with multiple fallbacks
          const getSafeHistoryValue = (value, defaultValue = "NIL") => {
            try {
              if (value === null || value === undefined || value === '') {
                return defaultValue;
              }
              return value.toString();
            } catch (error) {
              return defaultValue;
            }
          };

          const getSafeDate = (dateValue, defaultValue = "NIL") => {
            try {
              if (!dateValue) return defaultValue;
              return new Date(dateValue).toLocaleDateString('en-IN');
            } catch (error) {
              return defaultValue;
            }
          };

          // Get owner name with multiple fallbacks
          const getHistoryOwnerName = () => {
            return entry.ownerName || 
                   entry.owner?.fullName || 
                   entry.owner?.name || 
                   entry.owner?.firstName || 
                   entry.owner?.username ||
                   entry.fullName ||
                   entry.name ||
                   "NIL";
          };

          // Get transaction type with multiple fallbacks
          const getTransactionType = () => {
            return entry.transactionType || 
                   entry.type || 
                   entry.transaction || 
                   "NIL";
          };

          doc.text(getHistoryOwnerName(), 22, yPos + 1);
          doc.text(getSafeDate(entry.fromDate, "NIL"), 90, yPos + 1);
          doc.text(entry.toDate ? getSafeDate(entry.toDate, "NIL") : 'Current', 130, yPos + 1);
          doc.text(getTransactionType(), 160, yPos + 1);

          yPos += 7;
        });
      } else {
        console.log("Warning: No ownership history found, showing current owner");
        
        // Show current owner as the only entry if no history exists
        if (land.currentOwner) {
          // Table header
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);

          // Header background
          doc.setFillColor(25, 103, 210);
          doc.rect(20, yPos - 4, pageWidth - 40, 6, 'F');

          doc.text('Owner Name', 22, yPos + 1);
          doc.text('From Date', 90, yPos + 1);
          doc.text('To Date', 130, yPos + 1);
          doc.text('Type', 160, yPos + 1);

          yPos += 8;

          // Current owner row
          doc.setTextColor(60, 60, 60);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);

          const currentOwnerName = land.currentOwner.fullName || 
                                  land.currentOwner.name || 
                                  land.currentOwner.firstName || 
                                  land.currentOwner.username || 
                                  "NIL";

          doc.text(currentOwnerName, 22, yPos + 1);
          doc.text(new Date().toLocaleDateString('en-IN'), 90, yPos + 1);
          doc.text('Current', 130, yPos + 1);
          doc.text('INITIAL', 160, yPos + 1);
        } else {
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text('No ownership information available.', 20, yPos);
        }
      }
    } catch (error) {
      console.error("Error processing ownership history:", error);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text('Error loading ownership history - NIL', 20, yPos);
    }

    yPos += 15;

    // Property Characteristics with error handling
    try {
      if (land.metadata) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(25, 103, 210);
        doc.text('PROPERTY CHARACTERISTICS', 20, yPos);

        doc.setDrawColor(25, 103, 210);
        doc.setLineWidth(0.5);
        doc.line(20, yPos + 3, 140, yPos + 3);

        yPos += 12;

        doc.setFontSize(8.5);

        // Safe metadata extraction with error handling
        const getSafeMetadataValue = (value, fieldName) => {
          try {
            if (value === null || value === undefined || value === '') {
              console.log(`Warning: ${fieldName} is empty, using NIL`);
              return "NIL";
            }
            return value.toString();
          } catch (error) {
            console.error(`Error processing ${fieldName}:`, error);
            return "NIL";
          }
        };

        const metadata = [
          { label: 'Soil Type', value: getSafeMetadataValue(land.metadata.soilType, 'Soil Type') },
          { label: 'Water Source', value: getSafeMetadataValue(land.metadata.waterSource, 'Water Source') },
          { label: 'Road Access', value: land.metadata.roadAccess ? 'Yes' : 'NIL' },
          { label: 'Electricity', value: land.metadata.electricityConnection ? 'Available' : 'NIL' },
        ];

        metadata.forEach(item => {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(60, 60, 60);
          doc.text(item.label + ':', 20, yPos);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(item.value, 70, yPos);

          yPos += 6.5;
        });
      } else {
        console.log("Warning: No metadata found, showing NIL for all characteristics");
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(25, 103, 210);
        doc.text('PROPERTY CHARACTERISTICS', 20, yPos);

        doc.setDrawColor(25, 103, 210);
        doc.setLineWidth(0.5);
        doc.line(20, yPos + 3, 140, yPos + 3);

        yPos += 12;
        doc.setFontSize(8.5);

        const metadata = [
          { label: 'Soil Type', value: 'NIL' },
          { label: 'Water Source', value: 'NIL' },
          { label: 'Road Access', value: 'NIL' },
          { label: 'Electricity', value: 'NIL' },
        ];

        metadata.forEach(item => {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(60, 60, 60);
          doc.text(item.label + ':', 20, yPos);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(item.value, 70, yPos);

          yPos += 6.5;
        });
      }
    } catch (error) {
      console.error("Error processing metadata:", error);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text('Error loading property characteristics - NIL', 20, yPos);
    }

    this.addFooter(doc, pageWidth, pageHeight);
  }

  static async generateTransactionCertificate(transaction, land, qrCodeDataURL) {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      this.addHeaderSection(doc, pageWidth);

      let yPos = 75;

      // Title
      doc.setFillColor(240, 245, 252);
      doc.rect(15, yPos - 5, pageWidth - 30, 20, 'F');
      doc.setDrawColor(25, 103, 210);
      doc.setLineWidth(1.5);
      doc.rect(15, yPos - 5, pageWidth - 30, 20);

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(25, 103, 210);
      doc.text('TRANSACTION CERTIFICATE', 20, yPos + 8);

      yPos += 30;

      // Transaction Info Grid
      const infoItems = [
        { label: 'Transaction ID', value: transaction.transactionId },
        { label: 'Type', value: transaction.transactionType },
        { label: 'Amount', value: `₹${transaction.agreedPrice?.toLocaleString() || 'N/A'}` },
        { label: 'Date', value: new Date(transaction.createdAt).toLocaleDateString('en-IN') },
      ];

      doc.setFontSize(9);
      infoItems.slice(0, 2).forEach((item, i) => {
        const xPos = i === 0 ? 20 : pageWidth / 2;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text(item.label + ':', xPos, yPos);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(item.value, xPos + 40, yPos);
      });

      yPos += 8;

      infoItems.slice(2, 4).forEach((item, i) => {
        const xPos = i === 0 ? 20 : pageWidth / 2;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text(item.label + ':', xPos, yPos);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(item.value, xPos + 40, yPos);
      });

      yPos += 15;

      // Parties Section
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(25, 103, 210);
      doc.text('TRANSACTION PARTIES', 20, yPos);
      doc.line(20, yPos + 3, 120, yPos + 3);

      yPos += 12;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text('Seller:', 20, yPos);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(transaction.seller?.fullName || 'N/A', 50, yPos);

      yPos += 8;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text('Buyer:', 20, yPos);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(transaction.buyer?.fullName || 'N/A', 50, yPos);

      yPos += 15;

      // Property Details
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(25, 103, 210);
      doc.text('PROPERTY DETAILS', 20, yPos);
      doc.line(20, yPos + 3, 100, yPos + 3);

      yPos += 12;

      doc.setFontSize(9);
      const propDetails = [
        { label: 'Survey Number', value: land.surveyNumber || 'N/A' },
        { label: 'Location', value: `${land.village || 'N/A'}, ${land.district || 'N/A'}` },
        { label: 'Land Type', value: land.landType || 'N/A' },
      ];

      propDetails.forEach(item => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text(item.label + ':', 20, yPos);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(item.value, 60, yPos);

        yPos += 8;
      });

      // QR Code
      this.addQRCode(doc, pageWidth, pageHeight, qrCodeDataURL);
      this.addFooter(doc, pageWidth, pageHeight);

      const pdfBytes = doc.output("arraybuffer");
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error('Error generating transaction certificate:', error);
      throw error;
    }
  }

  static async generateOwnershipCertificate(transaction, land, newOwner, qrCodeDataURL) {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      this.addHeaderSection(doc, pageWidth);

      let yPos = 75;

      // Title
      doc.setFillColor(240, 245, 252);
      doc.rect(15, yPos - 5, pageWidth - 30, 20, 'F');
      doc.setDrawColor(25, 103, 210);
      doc.setLineWidth(1.5);
      doc.rect(15, yPos - 5, pageWidth - 30, 20);

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(25, 103, 210);
      doc.text('CERTIFICATE OF OWNERSHIP', 20, yPos + 8);

      yPos += 30;

      // Registration Details
      doc.setFontSize(9);
      const regDetails = [
        { label: 'Registration Number', value: transaction.completionDetails?.registrationNumber || 'PENDING' },
        { label: 'Transaction ID', value: transaction.transactionId },
      ];

      regDetails.forEach(item => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text(item.label + ':', 20, yPos);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(item.value, 80, yPos);

        yPos += 8;
      });

      yPos += 8;

      // Property Details
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(25, 103, 210);
      doc.text('PROPERTY DETAILS', 20, yPos);
      doc.line(20, yPos + 3, 100, yPos + 3);

      yPos += 12;

      doc.setFontSize(9);

      let areaText = "N/A";
      if (land.area) {
        if (typeof land.area === 'string') {
          try {
            const areaObj = JSON.parse(land.area);
            areaText = `${areaObj.acres || 0} Acres, ${areaObj.guntas || 0} Guntas`;
          } catch (e) {
            areaText = land.area;
          }
        } else if (typeof land.area === 'object') {
          areaText = `${land.area.acres || 0} Acres, ${land.area.guntas || 0} Guntas`;
        }
      }

      const propItems = [
        { label: 'Survey Number', value: land.surveyNumber || 'N/A' },
        { label: 'Location', value: `${land.village || 'N/A'}, ${land.taluka || 'N/A'}, ${land.district || 'N/A'}` },
        { label: 'Area', value: areaText },
        { label: 'Land Type', value: land.landType || 'N/A' },
      ];

      propItems.forEach(item => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text(item.label + ':', 20, yPos);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(item.value, 60, yPos);

        yPos += 8;
      });

      yPos += 8;

      // Ownership Details
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(25, 103, 210);
      doc.text('OWNERSHIP DETAILS', 20, yPos);
      doc.line(20, yPos + 3, 110, yPos + 3);

      yPos += 12;

      doc.setFontSize(9);

      const ownerItems = [
        { label: 'New Owner', value: newOwner.fullName || 'N/A' },
        { label: 'Purchase Price', value: `₹${transaction.agreedPrice?.toLocaleString() || 'N/A'}` },
        { label: 'Transfer Date', value: new Date().toLocaleDateString('en-IN') },
      ];

      ownerItems.forEach(item => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text(item.label + ':', 20, yPos);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(item.value, 60, yPos);

        yPos += 8;
      });

      // QR Code
      this.addQRCode(doc, pageWidth, pageHeight, qrCodeDataURL);
      this.addFooter(doc, pageWidth, pageHeight);

      const pdfBytes = doc.output("arraybuffer");
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error('Error generating ownership certificate:', error);
      throw error;
    }
  }
}

module.exports = PDFGenerator;