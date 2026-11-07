# OMD Single-Directory Components

Drupal Single-Directory Components keep metadata, Twig, Sass, and story sources
together under `components/<component-name>/`:

```text
components/
  alert/
    alert.component.yml
    alert.twig
    alert.scss
    alert.stories.twig
```

The component is available to Twig as `omd:alert`. Non-partial `.scss`
entrypoints compile to CSS beside the component; underscore-prefixed Sass files
are treated as partials. The Gulp build loads the project's configured
`sass/_uswds-theme.scss` before compiling each component entrypoint, so each
component only needs the standard USWDS core import:

```scss
@use "uswds-core" as *;
```

Do not repeat project settings with `with (...)` in component Sass. The
configured USWDS settings are shared with the theme. If a component uses USWDS
image or font URLs, verify that the configured paths resolve relative to the
component CSS output.

Import `sass/custom_mixins` when using a project-specific mixin; custom Sass
mixins are separate from `uswds-core`. For example:

```scss
@use "../../sass/custom_mixins" as *;

@include u-object-fit("cover");
```

Keep `.stories.twig` as the editable story source. Generate the adjacent,
ignored `.stories.json` files from the repository root with:

```sh
lando drush storybook:generate-all-stories --uri=https://omd.lndo.site
```

See the theme [README](../README.md) for the WSL Storybook and asset-build
commands. Its Storybook workflow automatically regenerates stories after any
component or template Twig change.
