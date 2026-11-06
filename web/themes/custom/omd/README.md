# OMD Theme Assets and Storybook

The OMD theme extends Drupal USWDS Base. Storybook uses the Drupal Storybook
module to render Twig stories through Drupal; the Storybook Server/Webpack app
is only the local or hosted preview frontend.

## First-Time Setup

1. From the repository root, start Lando and install Composer dependencies,
   including the development-only Drupal Storybook module:

   ```sh
   lando start
   lando composer install
   lando drush en storybook -y
   lando drush cr
   lando drush status
   ```

   Drupal must be installed and available before story generation. Lando loads
   `web/sites/development.services.yml` automatically while `LANDO=ON`; it
   enables Storybook development rendering and permits requests from
   `http://localhost:6006`. The webroot Apache rules allow that same local
   origin to load static Drupal CSS, JavaScript, fonts, and images; the Drupal
   CORS middleware handles the Storybook render endpoint.

2. In WSL, use the Node version in `.nvmrc` and install the locked theme
   dependencies:

   ```sh
   cd web/themes/custom/omd
   nvm use
   npm ci
   npm run build
   ```

   Run npm, Gulp, and Storybook in WSL. Run Drupal and Drush through Lando; the
   current Lando configuration intentionally has no Node service.

3. The shared Lando Drupal URL is `https://omd.lndo.site`. For a different
   local URL, set `DRUPAL_URL` in WSL before starting Storybook:

   ```sh
   DRUPAL_URL=https://your-project.lndo.site npm run storybook
   ```

   For Drupal outside Lando, copy
   `web/sites/example.settings.local.php` to
   `web/sites/default/settings.local.php` and uncomment the existing
   `settings.local.php` include near the bottom of `web/sites/default/settings.php`.
   Keep the local file ignored and merge these development settings with any
   existing local overrides rather than replacing them.

## Daily Commands

Run these commands from `web/themes/custom/omd` in WSL:

| Command                           | Purpose                                                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm run build`                   | Compile theme and component Sass, refresh USWDS, and copy custom JavaScript and images.                         |
| `npm run watch`                   | Watch Sass, custom JavaScript, and custom images. Run `build` first.                                            |
| `npm run storybook`               | Build assets and stories, then start Storybook with asset and Twig story watchers. Drupal/Lando must be running. |

To generate stories directly through Lando Drush, run this from the repository
root:

```sh
lando drush storybook:generate-all-stories --uri=https://omd.lndo.site
```

The npm story-generation command uses `DRUPAL_URL` when set, otherwise it uses
the shared Lando URL. Keep `.stories.twig` files as the editable source. Drush
generates adjacent `.stories.json` files for Storybook discovery; those files
are local generated output and are ignored by Git.

## Source and Generated Files

Edit Sass under `sass/`, custom JavaScript under `js/`, custom images under
`images/`, component Sass and Twig under `components/<name>/`, and Storybook
configuration under `.storybook/`. Component Sass entrypoints are non-partial
`.scss` files in their component directory; underscore-prefixed files are
partials. The build emits component CSS beside its Sass source. Use the same
USWDS v3 compiler settings as the theme and set image/font paths relative to
that component CSS when the Sass uses USWDS asset URLs. See
[`components/README.md`](components/README.md).

Custom JavaScript is copied to `assets/js/`. Register each script Drupal needs
in `omd.libraries.yml`, and add its preview reference in
`.storybook/preview-head.html` when the server-rendered story needs it.

The build generates `assets/css/styles.css` and its source map, component CSS
and maps, copied USWDS assets under `assets/uswds/`, and copied custom assets
under `assets/js/` and `assets/images/`. Component CSS remains beside its SDC
because Drupal discovers and attaches it with that component. These are runtime
theme assets. They remain part of the deployed theme because this repository has no checked-in
deployment build that regenerates them. Do not remove them from version control
until a deployment build is implemented and verified.

Dependencies, generated story JSON, and Storybook build output are ignored.
Do not run USWDS `init` to update the installed design system: it can overwrite
customized Sass. The production build copies assets from the locked USWDS
package and retains the project Sass sources.

## Deployment and Hosted Storybook

Build the theme assets before packaging a deployment, or deploy the generated
runtime assets with the theme. Drupal production installs should use Composer
without development dependencies so the Drupal Storybook module stays out of
production. Do not export development-only Storybook module configuration or
permissions into production configuration.

A hosted Storybook build still calls Drupal's `/storybook/stories/render`
endpoint. Set `DRUPAL_URL` when building so generated stories and Storybook
target a Drupal backend reachable by the hosted frontend. The local development
CORS rule only allows `http://localhost:6006`; hosted deployments need an
appropriate backend CORS policy and network access, not a local-only URL.
