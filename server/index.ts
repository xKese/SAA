import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Add compression middleware for better performance
app.use(compression({
  filter: (req: any, res: any) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses > 1KB
}) as any);

// Rate limiting with optimized settings for portfolio analysis
const isDevelopment = process.env.NODE_ENV === "development";

// Skip rate limiting for development and cloud environments
const skipRateLimit = (req: any, res: any) => {
  // Always skip in development
  if (isDevelopment) return true;
  
  // Skip for localhost/internal IPs
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
  const isLocalhost = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'].includes(ip);
  
  // Skip for Replit internal network (common cloud platform IPs)
  const isReplit = ip && (
    ip.startsWith('10.') ||           // Private network
    ip.startsWith('172.') ||          // Private network  
    ip.startsWith('192.168.') ||      // Private network
    ip.includes('replit') ||          // Replit-specific
    ip.includes('internal') ||        // Internal network
    ip.includes('127.0.0') ||         // Any localhost variation
    !ip || ip === 'undefined'         // Missing IP (internal requests)
  );
  
  return isLocalhost || isReplit;
};

// Preview limiter - very permissive for file preview (no Claude API calls)
const previewLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isDevelopment ? 1000 : 100, // High limits for preview - just file parsing
  message: {
    error: 'Zu viele Datei-Vorschauen',
    message: 'Bitte warten Sie einen Moment vor der nächsten Datei-Vorschau.',
    retryAfter: '5 Minuten'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit
});

// Upload limiter - moderate for actual portfolio processing
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: isDevelopment ? 100 : 30, // Moderate limits for upload processing
  message: {
    error: 'Zu viele Portfolio-Uploads',
    message: 'Portfolio-Analysen benötigen Zeit. Bitte warten Sie vor dem nächsten Upload.',
    retryAfter: '15 Minuten',
    tip: 'Jede Analyse benötigt mehrere KI-Aufrufe - bitte haben Sie Geduld'
  },
  skip: skipRateLimit
});

// Validation limiter - separate limit for validation endpoints  
const validationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: isDevelopment ? 200 : 50, // Allow frequent validations
  message: {
    error: 'Zu viele Validierungsanfragen',
    message: 'Validierungsdienst vorübergehend überlastet. Bitte versuchen Sie es in wenigen Minuten erneut.',
    retryAfter: '10 Minuten'
  },
  skip: skipRateLimit
});

// Health check limiter - very permissive
const healthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isDevelopment ? 500 : 100, // Frequent health checks allowed  
  message: {
    error: 'Zu viele Gesundheitsprüfungen',
    message: 'Bitte reduzieren Sie die Häufigkeit der System-Abfragen.',
    retryAfter: '5 Minuten'
  },
  skip: skipRateLimit
});

// General API rate limiter - for remaining endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 300, // High limits for general API usage
  message: {
    error: 'Zu viele API-Anfragen',  
    message: 'Bitte warten Sie einen Moment und versuchen Sie es erneut.',
    retryAfter: '15 Minuten'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit
});

// Apply limiters in specific to general order (Express matches first)
app.use('/api/portfolios/preview', previewLimiter);
app.use('/api/portfolios/upload', uploadLimiter);  
app.use(['/api/portfolios/*/validation', '/api/portfolios/*/revalidate', '/api/portfolios/validation/summary'], validationLimiter);
app.use(['/api/system/health', '/api/system/errors'], healthLimiter);
app.use('/api/', generalLimiter);

// Log rate limiter configuration on startup
console.log('🛡️  Rate Limiter Configuration:');
console.log(`   Development Mode: ${isDevelopment}`);
console.log(`   Preview Limit: ${isDevelopment ? '1000' : '100'}/5min`);
console.log(`   Upload Limit: ${isDevelopment ? '100' : '30'}/15min`);  
console.log(`   Validation Limit: ${isDevelopment ? '200' : '50'}/10min`);
console.log(`   Health Limit: ${isDevelopment ? '500' : '100'}/5min`);
console.log(`   General API Limit: ${isDevelopment ? '1000' : '300'}/15min`);

// Debug middleware for rate limiting (development only)
if (isDevelopment) {
  app.use('/api/', (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
    const shouldSkip = skipRateLimit(req, res);
    console.log(`🔍 API Request: ${req.method} ${req.path} from ${ip} (Skip: ${shouldSkip})`);
    next();
  });
}

// Security and performance headers
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Cache control for assets
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  } else if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
  
  next();
});

app.use(express.json({ limit: '10mb' })); // Set reasonable limit
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const server = app.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
    await setupVite(app, server);
  } else {
    serveStatic(app);
    app.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
  }
})();
