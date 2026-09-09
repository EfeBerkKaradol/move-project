// Expo SDK 52'den beri monorepo yapılandırması otomatik; elle watchFolders ya da
// nodeModulesPaths vermek gerekmiyor (docs.expo.dev/guides/monorepos). Dosya yine de
// duruyor ki ileride bir ayar gerektiğinde nereye yazılacağı belli olsun.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
