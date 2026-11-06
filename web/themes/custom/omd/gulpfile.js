/* gulpfile.js */

// eslint-disable-next-line import/no-unresolved
const uswds = require('@uswds/compile');
const { dest, series, src, watch } = require('gulp');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const components = './components';
const sassSources = ['sass/**/*.scss', 'components/**/*.scss'];
const assetSources = ['js/**/*', 'images/**/*'];

uswds.settings.version = 3;
uswds.paths.dist.css = './assets/css';
uswds.paths.dist.theme = './sass';
uswds.settings.compile.sassSourcemaps = true;

function componentDirectories() {
  return fs
    .readdirSync(components, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(components, entry.name, `${entry.name}.component.yml`))
    )
    .map((entry) => path.join(components, entry.name));
}

function sassImportPath(from, to) {
  const importPath = path.relative(from, to).split(path.sep).join('/');
  return importPath.startsWith('.') ? importPath : `./${importPath}`;
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
    const entryPoints = fs
      .readdirSync(directory)
      .filter((file) => file.endsWith('.scss') && !file.startsWith('_'));
    if (entryPoints.length === 0) {
      continue;
    }

    const buildDirectory = fs.mkdtempSync(
      path.join(directory, '.omd-sass-build-')
    );
    try {
      for (const entryPoint of entryPoints) {
        const componentPathWithoutExtension = path.resolve(
          directory,
          path.basename(entryPoint, '.scss')
        );
        const themePath = path.resolve('./sass/uswds-theme');
        const wrapper = [
          `@use "${sassImportPath(buildDirectory, themePath)}";`,
          `@use "${sassImportPath(buildDirectory, componentPathWithoutExtension)}";`,
          '',
        ].join('\n');

        fs.writeFileSync(path.join(buildDirectory, entryPoint), wrapper);
      }

      await compileSassAt(buildDirectory, directory);
    } finally {
      fs.rmSync(buildDirectory, { recursive: true, force: true });
    }
  }
}

function compileThemeSass() {
  return compileSassAt('./sass', './assets/css');
}

function copyAssets() {
  const sources = assetSources.filter((source) =>
    fs.existsSync(path.dirname(source))
  );
  if (sources.length === 0) {
    return Promise.resolve();
  }
  return src(sources, { base: '.', encoding: false }).pipe(
    dest('./assets')
  );
}

function watchFiles() {
  watch(sassSources, series(compileThemeSass, compileComponentSass));
  return watch(assetSources, copyAssets);
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

const build = series(
  uswds.updateUswds,
  copyAssets,
  compileComponentSass
);

exports.build = build;
exports.watch = watchFiles;
exports.generateStories = generateStories;
exports.watchStories = watchStories;
