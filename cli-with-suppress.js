#!/usr/bin/env node

// Check if debug flag is enabled
const debugFlagIndex = process.argv.indexOf('--debug-logs');
const debugMode = debugFlagIndex !== -1 || process.env.DEBUG_LOGS === 'true';

// If debug flag is present, remove it from arguments that will be passed to the main CLI
if (debugFlagIndex !== -1) {
  process.argv.splice(debugFlagIndex, 1);
}

// This needs to happen as early as possible, before any modules are loaded
// Override console functions to suppress Polkadot warnings
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Create a filter function
function shouldSuppress(message) {
  // Don't suppress anything in debug mode
  if (debugMode) return false;
  
  if (typeof message !== 'string') return false;
  
  // Check if this is a Polkadot version warning
  return (
    message.includes('@polkadot') && 
    message.includes('has multiple versions')
  );
}

// Override console.warn
console.warn = function(...args) {
  if (args.length > 0 && shouldSuppress(args[0])) {
    // Suppress this warning
    return;
  }
  return originalConsoleWarn.apply(console, args);
};

// Override console.error (some libraries use error instead of warn)
console.error = function(...args) {
  if (args.length > 0 && shouldSuppress(args[0])) {
    // Suppress this warning
    return;
  }
  return originalConsoleError.apply(console, args);
};

// Set environment variable to tell Polkadot.js to skip version checks (if supported)
process.env.POLKADOT_NO_VERSION_CHECK = 'true';

// Log debug mode status if in debug mode
if (debugMode) {
  console.log('Debug logging enabled - showing all console output');
}

// Now import and run your actual CLI
// Use dynamic import for ESM compatibility
import('./cli.js').catch(err => {
  console.error('Failed to load CLI:', err);
  process.exit(1);
});