/* gulpfile.js */

// eslint-disable-next-line import/no-unresolved
const uswds = require('@uswds/compile');
const { dest, parallel, series, src, watch } = require('gulp');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const componentPath = './components';
const sassPaths = ['sass/**/*.scss', 'components/**/*.scss'];
const customAssetPaths = ['js/**/*', 'images/**/*'];

/**
 * USWDS version
 */

uswds.settings.version = 3;

/**
 * Path settings
 * Set as many as you need
 */

uswds.paths.dist.css = './assets/css';
uswds.paths.dist.theme = './sass';
uswds.settings.compile.sassSourcemaps = true;
uswds.paths.src.projectIcons = './images';

function componentDirectories() {
  return fs
    .readdirSync(componentPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(componentPath, entry.name));
}

function compileSassAt(themePath, cssPath) {
  const originalThemePath = uswds.paths.dist.theme;
  const originalCssPath = uswds.paths.dist.css;

  return new Promise((resolve, reject) => {
    uswds.paths.dist.theme = themePath;
    uswds.paths.dist.css = cssPath;
    uswds.compileSass((error) => {
      uswds.paths.dist.theme = originalThemePath;
      uswds.paths.dist.css = originalCssPath;
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function compileComponentSass() {
  for (const directory of componentDirectories()) {
    const hasEntryPoint = fs
      .readdirSync(directory)
      .some((file) => file.endsWith('.scss') && !file.startsWith('_'));
    if (hasEntryPoint) {
      await compileSassAt(directory, directory);
    }
  }
}

function copyCustomJavaScript() {
  return src('./js/**/*', { allowEmpty: true, encoding: false }).pipe(
    dest('./assets/js')
  );
}

function copyCustomImages() {
  return src('./images/**/*', { allowEmpty: true, encoding: false }).pipe(
    dest('./assets/images')
  );
}

const copyCustomAssets = series(copyCustomJavaScript, copyCustomImages);

function compileThemeSass() {
  return compileSassAt('./sass', './assets/css');
}

function watchCss() {
  return watch(sassPaths, series(compileThemeSass, compileComponentSass));
}

function watchCustomAssets() {
  return watch(customAssetPaths, copyCustomAssets);
}

function watchAll() {
  return parallel(watchCss, watchCustomAssets)();
}

function storyDrupalUrl() {
  return process.env.DRUPAL_URL || 'https://omd.lndo.site';
}

function generateStories(done) {
  const drush = spawn(
    'lando',
    [
      'drush',
      'storybook:generate-all-stories',
      '--force',
      `--uri=${storyDrupalUrl()}`,
    ],
    { stdio: 'inherit' }
  );
  let finished = false;
  const finish = (error) => {
    if (!finished) {
      finished = true;
      done(error);
    }
  };

  drush.on('error', finish);
  drush.on('close', (code) => {
    finish(code === 0 ? undefined : new Error(`Lando Drush exited with code ${code}`));
  });
}

function watchStories() {
  return watch(
    ['components/**/*.stories.twig', 'templates/**/*.stories.twig'],
    { ignoreInitial: true },
    generateStories
  );
}

/**
 * Exports
 * Add as many as you need
 */

exports.init = uswds.init;
exports.compile = uswds.compile;
exports.compileSass = uswds.compileSass;
exports.compileComponentSass = compileComponentSass;
exports.prodBuild = series(
  uswds.updateUswds,
  copyCustomAssets,
  compileComponentSass
);
exports.watchCss = watchCss;
exports.watchAll = watchAll;
exports.generateStories = generateStories;
exports.watchStories = watchStories;
