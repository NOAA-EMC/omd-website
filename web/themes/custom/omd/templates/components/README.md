# Using This Directory with Storybook

Each component can live in its own Twig template with a matching Storybook
definition beside it:

```text
templates/components/
  example.html.twig
  example.stories.twig
```

The Storybook Drupal module reads `*.stories.twig` files under the theme. A
story file uses `{% stories %}` to define the Storybook group and `{% story %}`
for each variant. Include the component template from a story with the theme
namespace, such as `@omd/components/example.html.twig`.

When compiled, Drupal writes an adjacent `*.stories.json` file. Storybook
discovers those JSON files from `templates/`; it uses the metadata to list
stories, then requests each variant from Drupal's render endpoint. Drupal
executes the Twig and returns the rendered HTML. The generated JSON is ignored
by Git.

## Run Locally

Start Lando, then run these commands from `web/themes/custom/omd`:

```sh
npm run storybook
```

The npm prestart script compiles the Twig stories with Drush before starting
Storybook at <http://localhost:6006/>. After editing or adding a story while
Storybook is running, recompile with `npm run storybook:compile`. To create a
static Storybook build, run `npm run build-storybook`; it compiles stories
first as well.

## Development Access

In Lando, `web/sites/default/settings.php` loads
`web/sites/development.services.yml`. It enables the module's development
mode and allows CORS only from `http://localhost:6006`, allowing the browser
UI to request rendered stories from Drupal. Development mode allows the render
endpoint without the `render storybook stories` permission. Keep this
configuration local; do not enable it in production.

If the Storybook URL or port changes, update the CORS origin in
`development.services.yml` and the Drupal render URL in
`.storybook/preview.js`. If the Lando hostname changes, update the Drush
`--uri` value in `package.json`.
