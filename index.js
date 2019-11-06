const { writeFileSync } = require('fs');
const { join, relative, sep } = require('path');
module.exports = bundler => {
  const { publicURL, outDir, target } = bundler.options;
  if (target !== 'browser' || process.env.DISABLE_PRECACHE_MANIFEST) return;
  if (!publicURL.endsWith('/'))
    publicURL += '/';
  const getOptions = (entryAsset) => (typeof entryAsset.getPackage === 'function' ? entryAsset.getPackage() : Promise.resolve(entryAsset.package)).then(pkg => pkg['precacheManifest'] || pkg['precache-manifest'] || {});
  const addBundledFiles = (bundle, arr) => {
    arr.push(publicURL+relative(outDir, bundle.name).split(sep).join('/'));
    for (const childBundle of (bundle.childBundles || [])) addBundledFiles(childBundle, arr);
  }
  bundler.on('bundled', bundle => 
    getOptions(bundle.entryAsset).then(opts => {
      const manifest = {
        files: [],
        ver: bundle.getHash()
      };
      addBundledFiles(bundle, manifest.files);
      const stringManifest = JSON.stringify(manifest);
      writeFileSync(join(outDir, opts.filename || `precache-manifest.js${opts.asJSON ? 'on' : ''}`), opts.asJSON ? stringManifest : `self.${opts.variableName || '__precacheManifest'}=${stringManifest};`);
    })
  )
}