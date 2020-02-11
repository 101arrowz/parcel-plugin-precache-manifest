const { readFileSync, writeFileSync, existsSync } = require('fs');
const { resolve, relative, sep, basename } = require('path');
const logger = require('@parcel/logger');
module.exports = bundler => {
  const { publicURL, outDir, target } = bundler.options;
  if (target !== 'browser' || process.env.DISABLE_PRECACHE_MANIFEST) return;
  if (!publicURL.endsWith('/'))
    publicURL += '/';
  const getPkg = (entryAsset) => (typeof entryAsset.getPackage === 'function' ? entryAsset.getPackage() : Promise.resolve(entryAsset.package));
  const recurseBundle = (bundle, cb) => {
    cb(bundle);
    for (const childBundle of (bundle.childBundles || [])) recurseBundle(childBundle, cb);
  };
  const err = msg => {
    logger.clear();
    logger.error('Precache manifest creation failed! ' + msg);
  }
  bundler.on('bundled', async bundle => {
    const pkg = await getPkg(bundle.entryAsset || bundle.childBundles.values().next().value.entryAsset);
    const opts = pkg.precacheManifest || pkg['precache-manifest'] || {};
    let inject = opts.injectInto || opts['inject-into'] || opts.inject || opts.sw;
    if (typeof inject !== 'undefined') {
      if (typeof inject === 'string') {
        if (!['auto', 'none'].includes(inject)) {
          inject = resolve(outDir, inject);
          if (!existsSync(inject))
            return err('Path to service worker doesn\'t exist. Make sure you\'re providing the path to the bundled service worker, relative to the directory with the build, and not the path to the source file.')
        }
      }
      else if (typeof inject === 'boolean')
        inject = inject ? 'auto' : 'none';
      else
        return err('The path to the service worker to inject the manifest into must be a string, \'auto\' or true for auto-detection, or \'none\' for no injection.');
    } else inject = 'none';
    const asJSON = opts.asJSON || opts['as-json'] || opts.JSON || opts.json || false;
    if (typeof asJSON !== 'boolean')
      return err('The JSON parameter should be a boolean value of whether or not to export the manifest to a JSON file.')
    if (asJSON && inject !== 'none')
      return err('The JSON parameter and service worker injection parameter are mutually exclusive.')
    let filter = opts.filter;
    if (typeof filter === 'string') {
      try {
        filter = new RegExp(filter)
      } catch(e) {
        return err('Provided filter is invalid RegEx.');
      }
    } else if (typeof filter !== 'undefined')
      return err('The filter must be a string RegEx of files to exclude from the manifest.')
    else filter = /(.*)(.map|sw.js|serviceWorker.js|service-worker.js)$/;
    let filename = opts.filename || opts.fileName || opts['file-name'] || opts.fn || '';
    if (typeof filename !== 'string')
      return err('The filename parameter must a string representing the filename to give the saved manifest.')
    if (filename && inject !== 'none')
      return err('The filename parameter and service worker injection parameter are mutually exclusive.');
    if (!filename) filename = `precache-manifest.js${asJSON ? 'on' : ''}`;
    let variableName = opts.variableName || opts['variable-name'] || opts.variable || opts.vn || '';
    if (typeof variableName !== 'string')
      return err('The variable name parameter must be a string representing the variable to place the manifest under.');
    if (variableName && asJSON)
      return err('The filename parameter and JSON parameter are mutually exclusive.');
    if (!variableName) variableName = '__precacheManifest';
    variableName = variableName.replace(/"/g, '\\"');
    const manifest = {
      files: [],
      ver: bundle.getHash()
    };
    recurseBundle(bundle, b => {
      const base = basename(b.name)
      if (inject === 'auto' && ['sw.js', 'serviceWorker.js', 'service-worker.js'].includes(base))
        inject = resolve(outDir, b.name);
      if (!filter.test(b.name))
        manifest.files.push(publicURL+(base === 'index.html' ? '' : relative(outDir, b.name).split(sep).join('/')));
    })
    const stringManifest = JSON.stringify(manifest);
    const data = asJSON ? stringManifest : `self["${variableName}"]=${stringManifest};`;
    if (inject === 'auto')
      return err('Auto-detection of service worker for injection failed: could not find a service worker with name sw.js, serviceWorker.js, or service-worker.js.');
    else if (inject !== 'none') writeFileSync(inject, data+'\n'+(readFileSync(inject).toString().replace(new RegExp(`self\\["${variableName}"\\]=(.*?);\n`, "g"), '')));
    else writeFileSync(resolve(outDir, filename), data);
  })
}