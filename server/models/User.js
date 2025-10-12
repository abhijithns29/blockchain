const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const speakeasy = require("speakeasy");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    walletAddress: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, "Please enter a valid Ethereum address"],
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN", "AUDITOR"],
      default: "USER",
    },

    // Two-Factor Authentication
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    twoFactorBackupCodes: [
      {
        code: String,
        used: { type: Boolean, default: false },
      },
    ],

    // Verification system
    verificationStatus: {
      type: String,
      enum: ["NOT_SUBMITTED", "PENDING", "VERIFIED", "REJECTED"],
      default: function () {
        return ["ADMIN", "AUDITOR"].includes(this.role)
          ? "VERIFIED"
          : "NOT_SUBMITTED";
      },
    },

    // Verification documents
    verificationDocuments: {
      aadhaarCard: {
        number: {
          type: String,
          trim: true,
          match: [/^\d{12}$/, "Aadhaar number must be 12 digits"],
        },
        documentUrl: String,
        ipfsHash: String,
        verified: { type: Boolean, default: false },
        watermark: String,
      },
      panCard: {
        number: {
          type: String,
          trim: true,
          uppercase: true,
          match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"],
        },
        documentUrl: String,
        ipfsHash: String,
        verified: { type: Boolean, default: false },
        watermark: String,
      },
      drivingLicense: {
        number: {
          type: String,
          trim: true,
          uppercase: true,
        },
        documentUrl: String,
        ipfsHash: String,
        verified: { type: Boolean, default: false },
        watermark: String,
      },
      passport: {
        number: {
          type: String,
          trim: true,
          uppercase: true,
        },
        documentUrl: String,
        ipfsHash: String,
        verified: { type: Boolean, default: false },
        watermark: String,
      },
    },

    // Verification metadata
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verificationDate: Date,
    rejectionReason: String,

    // User profile
    profile: {
      phoneNumber: {
        type: String,
        trim: true,
        match: [/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"],
      },
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: {
          type: String,
          match: [/^\d{6}$/, "Please enter a valid 6-digit PIN code"],
        },
        country: { type: String, default: "India" },
      },
      profileImage: String,
    },

    // Land ownership references
    ownedLands: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Land",
      },
    ],

    // Liked/favorite lands
    likedLands: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Land",
      },
    ],

    // Account security
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,

    // Audit trail
    auditLog: [
      {
        action: String,
        timestamp: { type: Date, default: Date.now },
        ipAddress: String,
        userAgent: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ walletAddress: 1 });
userSchema.index({ verificationStatus: 1 });
userSchema.index({ role: 1 });
userSchema.index({ "verificationDocuments.aadhaarCard.number": 1 });
userSchema.index({ "verificationDocuments.panCard.number": 1 });

// Virtual for account lock status
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware
userSchema.pre("save", async function (next) {
  // Hash password if modified
  if (this.isModified("password")) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }

  // Set admin/auditor defaults
  if (["ADMIN", "AUDITOR"].includes(this.role)) {
    this.verificationStatus = "VERIFIED";
    if (!this.verificationDate) {
      this.verificationDate = new Date();
    }
  }

  next();
});

// Instance methods
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateTwoFactorSecret = function () {
  const secret = speakeasy.generateSecret({
    name: `Land Registry (${this.email})`,
    issuer: "Land Registry System",
  });
  this.twoFactorSecret = secret.base32;
  return secret;
};

userSchema.methods.verifyTwoFactorToken = function (token) {
  console.log('User.verifyTwoFactorToken called:', {
    userId: this._id,
    token,
    hasSecret: !!this.twoFactorSecret,
    secretLength: this.twoFactorSecret ? this.twoFactorSecret.length : 0
  });
  
  const result = speakeasy.totp.verify({
    secret: this.twoFactorSecret,
    encoding: "base32",
    token,
    window: 2,
  });
  
  console.log('speakeasy.totp.verify result:', result);
  return result;
};

userSchema.methods.incrementLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }

  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

userSchema.methods.canClaimLand = function () {
  return this.role === "ADMIN" || this.verificationStatus === "VERIFIED";
};

userSchema.methods.addAuditLog = function (action, ipAddress, userAgent) {
  this.auditLog.push({
    action,
    timestamp: new Date(),
    ipAddress,
    userAgent,
  });

  // Keep only last 100 audit entries
  if (this.auditLog.length > 100) {
    this.auditLog = this.auditLog.slice(-100);
  }
};

userSchema.methods.hasRequiredDocuments = function () {
  return this.documents && this.documents.length > 0;
};

// Generate backup codes (10 codes, 6 chars each, uppercase)
userSchema.methods.generateBackupCodes = function () {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push({
      code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      used: false,
    });
  }
  this.twoFactorBackupCodes = codes;
  return codes.map((c) => c.code);
};

// Use a backup code (mark as used)
userSchema.methods.useBackupCode = function (inputCode) {
  const codeObj = this.twoFactorBackupCodes.find(
    (c) => c.code === inputCode && !c.used
  );
  if (codeObj) {
    codeObj.used = true;
    return true;
  }
  return false;
};

// Static methods
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

userSchema.statics.findVerifiedUsers = function () {
  return this.find({ verificationStatus: "VERIFIED", role: "USER" });
};

userSchema.statics.findPendingVerifications = function () {
  return this.find({ verificationStatus: "PENDING", role: "USER" });
};

// Transform output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.twoFactorSecret;
  delete user.loginAttempts;
  delete user.lockUntil;
  delete user.twoFactorBackupCodes;
  return user;
};

module.exports = mongoose.model("User", userSchema);
