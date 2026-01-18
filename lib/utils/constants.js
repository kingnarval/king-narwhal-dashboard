// lib/utils/constants.js
// ============================================================================
// TOUTES LES CONSTANTES DU PROJET
// ============================================================================

// VIEWPORT
export const VIEWPORT = {
  BASE_WIDTH: 1920,
  BASE_HEIGHT: 1080,
};

// TTR
export const TTR = {
  CORE_VALUE: 100_000,
  PRELAUNCH_THRESHOLD: 1_100_000,
  DEDENSIFY_CAP: 10_000_000,
};

// HEXAGONES
export const HEX = {
  RADIUS: 30,
  MAX_PER_CLUSTER: 37,
  MAX_TRIES_PER_CLUSTER: 1200,
  CLUSTER_BUFFER: 1,
};

// WINDOW
export const WINDOW = {
  SIZE: 14,
  SIZE_DEDENSED: 10,
};

// CACHE
export const CACHE = {
  LS_TTR_CAP: "woc_v978_ttr_cap",
  SESSION_DATA: "woc_v978_window_data",
  SESSION_TIME: "woc_v978_window_time",
  REFRESH_COOLDOWN_MS: 20_000,
};

// PRELAUNCH
export const PRELAUNCH = {
  TARGET_COUNT: 14,
  MIN_MC: 1_000_000,
  MAX_MC: 10_000_000,
  MINTS: [
    "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk",
    "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82",
    "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    "HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4",
    "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "5z3EqYQo9HiCEs3R84RCDMu2n7anpDMxRhdK8PSWmrRC",
    "8HGyAAB1yoM1ttS7pXjHMa3dukTFGQggnFFH3hJZgzQh",
    "AZsHEMXd36Bj1EMNXhowJajpUXzrKcK57wW4ZGXVa7yR",
    "7iT1GRYYhEop2nV1dyCwK2MGyLmPHq47WhPGSwiqcUg5",
    "DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ",
    "9999FVbjHioTcoJpoBiSjpxHW6xEn3witVuXKqBh2RFQ",
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  ],
};