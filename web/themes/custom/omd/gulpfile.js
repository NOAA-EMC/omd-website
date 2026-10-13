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

// Compile against USWDS 3.
uswds.settings.version = 3;

// Emit Drupal theme CSS and source maps under assets/.
uswds.paths.dist.css = './assets/css';
uswds.paths.dist.theme = './sass';
uswds.settings.compile.sassSourcemaps = true;

// Find SDC folders for component Sass compilation.
function componentDirectories() {
  return fs
    .readdirSync(componentPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(componentPath, entry.name));
}

// Compile with temporary USWDS paths, then restore the shared compiler config.
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

// build/watchCss: compile non-partial component Sass beside its SDC.
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

// Copy optional project JS; a missing source folder is a no-op.
function copyCustomJavaScript() {
  if (!fs.existsSync('./js')) {
    return Promise.resolve();
  }
  return src('./js/**/*', { allowEmpty: true, encoding: false }).pipe(
    dest('./assets/js')
  );
}

// Copy optional project images; a missing source folder is a no-op.
function copyCustomImages() {
  if (!fs.existsSync('./images')) {
    return Promise.resolve();
  }
  return src('./images/**/*', { allowEmpty: true, encoding: false }).pipe(
    dest('./assets/images')
  );
}

// build/watchCustomAssets: copy both custom asset types in order.
const copyCustomAssets = series(copyCustomJavaScript, copyCustomImages);

// watchCss rebuilds theme Sass; build uses uswds.updateUswds.
function compileThemeSass() {
  return compileSassAt('./sass', './assets/css');
}

// npm watch-css/watchAll: rebuild theme and component Sass on changes.
function watchCss() {
  return watch(sassPaths, series(compileThemeSass, compileComponentSass));
}

// watchAll: recopy custom JS/images when sources change.
function watchCustomAssets() {
  return watch(customAssetPaths, copyCustomAssets);
}

// npm watch-all: run Sass and custom asset watchers in parallel.
function watchAll() {
  return parallel(watchCss, watchCustomAssets)();
}

// Use DRUPAL_URL for Drush, or the shared Lando URL by default.
function storyDrupalUrl() {
  return process.env.DRUPAL_URL || 'https://omd.lndo.site';
}

// npm storybook:compile/watchStories: generate JSON from Twig through Drush.
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
  // Signal Gulp once whether the child errors or exits.
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

// npm storybook:watch-stories: regenerate JSON after Twig edits.
function watchStories() {
  return watch(
    ['components/**/*.stories.twig', 'templates/**/*.stories.twig'],
    { ignoreInitial: true },
    generateStories
  );
}

// npm build: refresh USWDS assets, copy custom assets, compile components.
exports.build = series(
  uswds.updateUswds,
  copyCustomAssets,
  compileComponentSass
);

// Public tasks called by package.json scripts.
exports.watchCss = watchCss;
exports.watchAll = watchAll;
exports.generateStories = generateStories;
exports.watchStories = watchStories;
