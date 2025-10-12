const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_REGISTER',
      'USER_VERIFY',
      'LAND_ADD',
      'LAND_DIGITALIZE',
      'LAND_CLAIM',
      'LAND_LIST_SALE',
      'LAND_UPDATE_LISTING',
      'TRANSACTION_INITIATE',
      'TRANSACTION_APPROVE',
      'TRANSACTION_REJECT',
      'DOCUMENT_UPLOAD',
      'DOCUMENT_DOWNLOAD',
      'CHAT_START',
      'OFFER_MAKE',
      'OFFER_ACCEPT',
      'ADMIN_ACTION'
    ]
  },
  
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  targetResource: {
    type: String,
    enum: ['USER', 'LAND', 'TRANSACTION', 'CHAT', 'DOCUMENT', 'SYSTEM'],
    required: true
  },
  
  targetId: {
    type: String,
    required: true
  },
  
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  ipAddress: {
    type: String,
    required: true
  },
  
  userAgent: String,
  
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  
  success: {
    type: Boolean,
    default: true
  },
  
  errorMessage: String
}, {
  timestamps: true
});

// Indexes
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ targetResource: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ severity: 1 });

// Static methods
auditLogSchema.statics.logAction = async function(action, performedBy, targetResource, targetId, details, req) {
  try {
    const auditEntry = new this({
      action,
      performedBy,
      targetResource,
      targetId,
      details,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });
    
    await auditEntry.save();
    return auditEntry;
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

auditLogSchema.statics.getRecentActivity = function(limit = 50) {
  return this.find()
    .populate('performedBy', 'fullName email role')
    .sort({ createdAt: -1 })
    .limit(limit);
};

auditLogSchema.statics.getUserActivity = function(userId, limit = 20) {
  return this.find({ performedBy: userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);