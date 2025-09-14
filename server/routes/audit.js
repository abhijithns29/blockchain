const express = require('express');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Land = require('../models/Land');
const LandTransaction = require('../models/LandTransaction');
const { auditorAuth } = require('../middleware/auth');
const PDFGenerator = require('../utils/pdfGenerator');

const router = express.Router();

// Get audit logs
router.get('/logs', auditorAuth, async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      action, 
      performedBy, 
      targetResource,
      page = 1,
      limit = 50 
    } = req.query;

    const query = {};
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }
    
    if (action) query.action = action;
    if (performedBy) query.performedBy = performedBy;
    if (targetResource) query.targetResource = targetResource;

    const logs = await AuditLog.find(query)
      .populate('performedBy', 'fullName email role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      logs,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
});

// Get system statistics
router.get('/statistics', auditorAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    const [
      totalUsers,
      verifiedUsers,
      totalLands,
      digitalizedLands,
      totalTransactions,
      completedTransactions,
      transactionValue
    ] = await Promise.all([
      User.countDocuments({ role: 'USER', ...dateFilter }),
      User.countDocuments({ role: 'USER', verificationStatus: 'VERIFIED', ...dateFilter }),
      Land.countDocuments(dateFilter),
      Land.countDocuments({ 'digitalDocument.isDigitalized': true, ...dateFilter }),
      LandTransaction.countDocuments(dateFilter),
      LandTransaction.countDocuments({ status: 'COMPLETED', ...dateFilter }),
      LandTransaction.aggregate([
        { $match: { status: 'COMPLETED', ...dateFilter } },
        { $group: { _id: null, total: { $sum: '$agreedPrice' } } }
      ])
    ]);

    const statistics = {
      totalUsers,
      verifiedUsers,
      verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(1) : 0,
      totalLands,
      digitalizedLands,
      digitalizationRate: totalLands > 0 ? ((digitalizedLands / totalLands) * 100).toFixed(1) : 0,
      totalTransactions,
      completedTransactions,
      completionRate: totalTransactions > 0 ? ((completedTransactions / totalTransactions) * 100).toFixed(1) : 0,
      totalTransactionValue: transactionValue[0]?.total || 0
    };

    res.json({
      success: true,
      statistics
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// Export audit report
router.get('/export', auditorAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    const logs = await AuditLog.find(query)
      .populate('performedBy', 'fullName email role')
      .sort({ createdAt: -1 });

    const reportPDF = await PDFGenerator.generateAuditReport(logs, { startDate, endDate });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=audit-report-${startDate}-${endDate}.pdf`);
    res.send(Buffer.from(reportPDF));
  } catch (error) {
    console.error('Export audit report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export audit report'
    });
  }
});

// Get recent activity
router.get('/activity', auditorAuth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const recentActivity = await AuditLog.getRecentActivity(parseInt(limit));

    res.json({
      success: true,
      activity: recentActivity
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity'
    });
  }
});

module.exports = router;