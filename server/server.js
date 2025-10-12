const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const http = require("http");
const socketIo = require("socket.io");
const connectDB = require("./config/database");
const blockchainService = require("./config/blockchain");
const ipfsService = require("./config/ipfs");
const { initGridFS } = require("./config/gridfs");

// Load environment variables
dotenv.config();
console.log("DEBUG CONTRACT_ADDRESS:", process.env.CONTRACT_ADDRESS);

// Check for CONTRACT_ADDRESS
if (!process.env.CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS === "") {
  console.error(
    "⚠️  CONTRACT_ADDRESS not found. Please deploy the contract first."
  );
  console.error("Run: npm run blockchain:deploy:ganache");
  console.error(
    "DEBUG: process.env.CONTRACT_ADDRESS value:",
    process.env.CONTRACT_ADDRESS
  );
  console.error(
    "DEBUG: typeof process.env.CONTRACT_ADDRESS:",
    typeof process.env.CONTRACT_ADDRESS
  );
  console.error(
    "DEBUG: .env file loaded from:",
    require("path").resolve(process.cwd(), ".env")
  );
  // Print .env file contents for debugging
  const fs = require("fs");
  const envPath = require("path").resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    console.error(
      "DEBUG: .env file contents:\n",
      fs.readFileSync(envPath, "utf8")
    );
  } else {
    console.error("DEBUG: .env file not found at", envPath);
  }
  // Print stack trace to pinpoint where the error is triggered
  console.error("DEBUG: Stack trace:\n", new Error().stack);
  process.exit(1); // Stop server if contract address is missing
} else {
  console.log("✅ CONTRACT_ADDRESS loaded:", process.env.CONTRACT_ADDRESS);
}

// Initialize services
const initializeServices = async () => {
  console.log("🚀 Initializing Land Registry System...");

  try {
    await connectDB();
    await blockchainService.initialize();
    await ipfsService.initialize();

    // Initialize GridFS
    initGridFS();
    console.log("✅ GridFS service initialized");

    console.log("✅ All services initialized successfully");
  } catch (error) {
    console.error("❌ Service initialization failed:", error);
    throw error;
  }
};

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve uploaded files (for development)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Custom route to serve documents with proper headers for inline viewing
app.get("/uploads/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "uploads", filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }
  
  // Get file extension to determine content type
  const ext = path.extname(filename).toLowerCase();
  let contentType = 'application/octet-stream'; // default
  
  switch (ext) {
    case '.pdf':
      contentType = 'application/pdf';
      break;
    case '.jpg':
    case '.jpeg':
      contentType = 'image/jpeg';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.gif':
      contentType = 'image/gif';
      break;
    case '.webp':
      contentType = 'image/webp';
      break;
  }
  
  // Set headers to display inline instead of downloading
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"');
  
  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

// Serve GridFS images
app.get("/api/images/:filename", (req, res) => {
  const { getFileStream } = require("./config/gridfs");
  const filename = req.params.filename;

  try {
    const readstream = getFileStream(filename);
    if (!readstream) {
      return res.status(404).json({ error: "Image not found" });
    }

    readstream.on("error", (error) => {
      console.error("GridFS stream error:", error);
      res.status(404).json({ error: "Image not found" });
    });

    readstream.pipe(res);
  } catch (error) {
    console.error("Error serving image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/lands", require("./routes/lands"));
app.use("/api/land-transactions", require("./routes/landTransactions"));
app.use("/api/chats", require("./routes/chat"));
app.use("/api/audit", require("./routes/audit"));
app.use("/api/2fa", require("./routes/twoFactorRoutes"));
app.use("/api/buy-requests", require("./routes/buyRequests"));
app.use("/api/admin/transactions", require("./routes/adminTransactions"));

// Serve PDF documents
app.get("/api/documents/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "uploads", filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Document not found" });
  }
  
  // Set headers for PDF download/viewing
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  
  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  
  fileStream.on('error', (error) => {
    console.error('Error streaming document:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error serving document' });
    }
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    message: "Blockchain Land Registry API is running",
    timestamp: new Date(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// API documentation endpoint
app.get("/api", (req, res) => {
  res.json({
    name: "Blockchain Land Registry API",
    version: "1.0.0",
    description:
      "Complete blockchain-based land registration and transfer system",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      digitizedLands: "/api/digitized-lands",
      landTransactions: "/api/land-transactions",
      chats: "/api/chats",
      health: "/api/health",
    },
    documentation: "See README.md for complete API documentation",
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server Error:", error);

  // Handle specific error types
  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation Error",
      errors: Object.values(error.errors).map((err) => err.message),
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      message: "Invalid ID format",
    });
  }

  if (error.code === 11000) {
    return res.status(400).json({
      message: "Duplicate entry found",
    });
  }

  res.status(500).json({
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    message: "Route not found",
    availableRoutes: [
      "/api/auth",
      "/api/users",
      "/api/lands",
      "/api/digitized-lands",
      "/api/land-transactions",
      "/api/chats",
      "/api/buy-requests",
      "/api/admin/transactions",
      "/api/2fa",
      "/api/audit",
      "/api/health",
    ],
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join chat room
  socket.on('join-chat', async (data) => {
    try {
      const { chatId, userId } = data;
      
      // Verify user authentication (you might want to add JWT verification here)
      if (!userId) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Join the chat room
      socket.join(`chat-${chatId}`);
      console.log(`User ${userId} joined chat ${chatId}`);
      
      // Notify others in the room
      socket.to(`chat-${chatId}`).emit('user-joined', { userId });
    } catch (error) {
      console.error('Join chat error:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  // Handle new messages
  socket.on('send-message', async (data) => {
    try {
      const { chatId, userId, message, messageType = 'TEXT' } = data;
      
      console.log('Received send-message:', { chatId, userId, message, messageType });
      
      if (!chatId || !userId || !message) {
        console.log('Missing required fields:', { chatId, userId, message });
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      // Save message to database
      const Chat = require('./models/Chat');
      console.log('Looking for chat with ID:', chatId);
      const chat = await Chat.findById(chatId);
      
      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      // Verify user is participant
      if (!chat.isParticipant(userId)) {
        socket.emit('error', { message: 'Not authorized to send messages' });
        return;
      }

      // Add message
      const newMessage = chat.addMessage(userId, message, messageType);
      await chat.save();

      // Emit to all users in the chat room
      io.to(`chat-${chatId}`).emit('new-message', {
        chatId,
        message: newMessage,
        timestamp: new Date()
      });

      console.log(`Message sent in chat ${chatId} by user ${userId}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    const { chatId, userId } = data;
    socket.to(`chat-${chatId}`).emit('user-typing', { userId, isTyping: true });
  });

  socket.on('typing-stop', (data) => {
    const { chatId, userId } = data;
    socket.to(`chat-${chatId}`).emit('user-typing', { userId, isTyping: false });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    await initializeServices();

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Land Registry Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🌐 API URL: http://localhost:${PORT}/api`);
      console.log(`📋 Health Check: http://localhost:${PORT}/api/health`);
      console.log("");
      console.log("🏗️  System Components:");
      console.log("   ✅ Express Server");
      console.log("   ✅ MongoDB Database");
      console.log("   ✅ Blockchain Service (Ganache)");
      console.log("   ✅ IPFS Storage");
      console.log("   ✅ JWT Authentication");
      console.log("");
      console.log("📚 Available Collections:");
      console.log("   - Users (Authentication & Verification)");
      console.log("   - DigitizedLand (Digitized Land Database)");
      console.log("   - LandTransaction (Transaction Records)");
      console.log("   - Chat (Buyer-Seller Communication)");
      console.log("");
      console.log("🔐 Admin Accounts:");
      console.log("   - admin@landregistry.gov / admin123");
      console.log("   - officer@landregistry.gov / admin123");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});

startServer();
