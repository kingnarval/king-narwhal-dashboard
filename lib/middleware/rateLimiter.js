// lib/middleware/rateLimiter.js
// ============================================================================
// RATE LIMITER COMPLET - Protection des APIs
// Support: Vercel KV (production) + Fallback mémoire (dev)
// ============================================================================

// Configuration des limites par type d'endpoint
const RATE_LIMITS = {
  // Endpoint normal: 60 requêtes par minute
  default: {
    limit: 60,
    windowSec: 60,
  },
  // Endpoint force refresh: 5 requêtes par minute (plus strict)
  force: {
    limit: 5,
    windowSec: 60,
  },
  // Endpoint stats: 30 requêtes par minute
  stats: {
    limit: 30,
    windowSec: 60,
  },
};

// Cache en mémoire (fallback si Vercel KV indisponible)
const memoryCache = new Map();

/**
 * Récupère l'IP du client (fonctionne avec Vercel)
 * @param {Object} req - Request object
 * @returns {string} IP address
 */
function getClientIP(req) {
  // Vercel met l'IP dans x-forwarded-for
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // Prend la première IP de la liste (client réel)
    return forwarded.split(',')[0].trim();
  }
  
  // Fallback pour autres environnements
  return (
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Vérifie si le secret admin est correct (bypass le rate limit)
 * @param {string} secret - Secret fourni par le client
 * @returns {boolean}
 */
function isValidAdminSecret(secret) {
  if (!secret) return false;
  
  const ADMIN_SECRET = process.env.ADMIN_REFRESH_SECRET || 'kingnarwhal_secret_2025';
  return secret === ADMIN_SECRET;
}

/**
 * Nettoie les entrées expirées du cache mémoire
 * (appelé périodiquement pour éviter les fuites mémoire)
 */
function cleanupMemoryCache() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of memoryCache.entries()) {
    if (now - entry.resetAt > 0) {
      memoryCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[RateLimit] Cleaned ${cleaned} expired entries from memory cache`);
  }
}

// Nettoyer le cache toutes les 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMemoryCache, 5 * 60 * 1000);
}

/**
 * Rate limiter avec support Vercel KV
 * @param {Object} req - Request object
 * @param {Object} options - { type: 'default' | 'force' | 'stats' }
 * @returns {Promise<Object>} { allowed, remaining, resetIn, bypassed }
 */
export async function checkRateLimit(req, options = {}) {
  const { type = 'default' } = options;
  const config = RATE_LIMITS[type] || RATE_LIMITS.default;
  
  // ============================================================================
  // BYPASS ADMIN (si secret valide)
  // ============================================================================
  if (type === 'force') {
    const adminSecret = req.query?.secret || req.headers['x-admin-secret'];
    
    if (isValidAdminSecret(adminSecret)) {
      console.log('[RateLimit] Admin bypass granted');
      return {
        allowed: true,
        remaining: 999,
        resetIn: 0,
        bypassed: true,
      };
    }
  }
  
  const ip = getClientIP(req);
  const key = `ratelimit:${type}:${ip}`;
  
  // ============================================================================
  // VERCEL KV (si disponible)
  // ============================================================================
  try {
    // Essayer d'importer Vercel KV (disponible uniquement en production)
    const { kv } = await import('@vercel/kv').catch(() => ({ kv: null }));
    
    if (kv) {
      // Récupérer le compteur actuel
      const current = await kv.get(key);
      const count = current ? parseInt(current, 10) : 0;
      
      // Vérifier si limite dépassée
      if (count >= config.limit) {
        const ttl = await kv.ttl(key);
        console.log(`[RateLimit] Blocked IP ${ip} (${count}/${config.limit})`);
        
        return {
          allowed: false,
          remaining: 0,
          resetIn: ttl > 0 ? ttl : config.windowSec,
          type: 'vercel-kv',
        };
      }
      
      // Incrémenter le compteur
      if (count === 0) {
        // Première requête: set avec expiration
        await kv.set(key, 1, { ex: config.windowSec });
      } else {
        // Requêtes suivantes: incrémenter
        await kv.incr(key);
      }
      
      const ttl = await kv.ttl(key);
      
      return {
        allowed: true,
        remaining: config.limit - count - 1,
        resetIn: ttl > 0 ? ttl : config.windowSec,
        type: 'vercel-kv',
      };
    }
  } catch (e) {
    // Vercel KV indisponible, fallback sur mémoire
    console.warn('[RateLimit] Vercel KV unavailable, using memory fallback:', e.message);
  }
  
  // ============================================================================
  // FALLBACK: CACHE MÉMOIRE (dev ou si KV indisponible)
  // ============================================================================
  const now = Date.now();
  const entry = memoryCache.get(key);
  
  // Nettoyer l'entrée si expirée
  if (entry && now >= entry.resetAt) {
    memoryCache.delete(key);
  }
  
  const current = memoryCache.get(key);
  
  // Première requête pour cette IP
  if (!current) {
    memoryCache.set(key, {
      count: 1,
      resetAt: now + config.windowSec * 1000,
    });
    
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetIn: config.windowSec,
      type: 'memory',
    };
  }
  
  // Vérifier si limite dépassée
  if (current.count >= config.limit) {
    const resetIn = Math.ceil((current.resetAt - now) / 1000);
    console.log(`[RateLimit] Blocked IP ${ip} (${current.count}/${config.limit}) - memory`);
    
    return {
      allowed: false,
      remaining: 0,
      resetIn: resetIn > 0 ? resetIn : 0,
      type: 'memory',
    };
  }
  
  // Incrémenter le compteur
  current.count += 1;
  memoryCache.set(key, current);
  
  const resetIn = Math.ceil((current.resetAt - now) / 1000);
  
  return {
    allowed: true,
    remaining: config.limit - current.count,
    resetIn: resetIn > 0 ? resetIn : config.windowSec,
    type: 'memory',
  };
}

/**
 * Middleware HOC pour protéger une API route
 * 
 * Usage:
 * ```javascript
 * import { withRateLimit } from '@/lib/middleware/rateLimiter';
 * 
 * async function handler(req, res) {
 *   // Votre code API
 *   res.status(200).json({ data: 'ok' });
 * }
 * 
 * export default withRateLimit(handler, { type: 'force' });
 * ```
 * 
 * @param {Function} handler - Handler de l'API route
 * @param {Object} options - { type: 'default' | 'force' | 'stats' }
 * @returns {Function} Handler wrappé avec rate limiting
 */
export function withRateLimit(handler, options = {}) {
  return async (req, res) => {
    const result = await checkRateLimit(req, options);
    const config = RATE_LIMITS[options.type || 'default'];
    
    // Ajouter les headers de rate limit (standard HTTP)
    res.setHeader('X-RateLimit-Limit', config.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetIn);
    res.setHeader('X-RateLimit-Type', result.type || 'unknown');
    
    if (result.bypassed) {
      res.setHeader('X-RateLimit-Bypassed', 'true');
    }
    
    // Si limite dépassée, renvoyer 429 Too Many Requests
    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. You can make ${config.limit} requests per ${config.windowSec} seconds.`,
        retryAfter: result.resetIn,
        limit: config.limit,
        remaining: 0,
        resetIn: result.resetIn,
      });
    }
    
    // Limite OK, exécuter le handler
    return handler(req, res);
  };
}

/**
 * Helper pour vérifier manuellement le rate limit
 * (utile si tu veux gérer la réponse toi-même)
 * 
 * Usage:
 * ```javascript
 * const result = await enforceRateLimit(req, res, { type: 'force' });
 * if (!result.allowed) {
 *   // Gérer l'erreur custom
 *   return res.status(429).json({ error: 'Custom error' });
 * }
 * ```
 */
export async function enforceRateLimit(req, res, options = {}) {
  const result = await checkRateLimit(req, options);
  const config = RATE_LIMITS[options.type || 'default'];
  
  // Ajouter les headers
  res.setHeader('X-RateLimit-Limit', config.limit);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetIn);
  res.setHeader('X-RateLimit-Type', result.type || 'unknown');
  
  if (result.bypassed) {
    res.setHeader('X-RateLimit-Bypassed', 'true');
  }
  
  return result;
}

/**
 * Helper pour obtenir les stats actuelles du rate limit
 * (utile pour monitoring)
 */
export async function getRateLimitStats(req, type = 'default') {
  const ip = getClientIP(req);
  const key = `ratelimit:${type}:${ip}`;
  const config = RATE_LIMITS[type] || RATE_LIMITS.default;
  
  try {
    const { kv } = await import('@vercel/kv').catch(() => ({ kv: null }));
    
    if (kv) {
      const count = parseInt((await kv.get(key)) || '0', 10);
      const ttl = await kv.ttl(key);
      
      return {
        ip,
        type,
        limit: config.limit,
        current: count,
        remaining: Math.max(0, config.limit - count),
        resetIn: ttl > 0 ? ttl : 0,
        storage: 'vercel-kv',
      };
    }
  } catch (e) {
    // Fallback mémoire
  }
  
  const entry = memoryCache.get(key);
  if (!entry) {
    return {
      ip,
      type,
      limit: config.limit,
      current: 0,
      remaining: config.limit,
      resetIn: config.windowSec,
      storage: 'memory',
    };
  }
  
  const resetIn = Math.ceil((entry.resetAt - Date.now()) / 1000);
  
  return {
    ip,
    type,
    limit: config.limit,
    current: entry.count,
    remaining: Math.max(0, config.limit - entry.count),
    resetIn: resetIn > 0 ? resetIn : 0,
    storage: 'memory',
  };
}
