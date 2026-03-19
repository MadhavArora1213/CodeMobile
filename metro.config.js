const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// EXCLUSION: Ignore the Piston folders to avoid permission errors
// and indexing thousands of binary/library files.
config.resolver.blacklistRE = /piston.*/; 
config.resolver.exclusionList = [
  /piston.*/, 
  /piston-cli-repo\/.*/,
  /backend\/node_modules\/.*/
];

module.exports = config;
