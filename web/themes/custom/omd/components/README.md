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
are treated as partials. Component CSS should use the same USWDS v3 compiler
configuration as the theme. When generating USWDS image or font URLs, paths are
relative to the component directory, for example:

```scss
@use "uswds-core" with (
  $theme-image-path: "../../assets/uswds/img",
  $theme-font-path: "../../assets/uswds/fonts"
);
```

Keep `.stories.twig` as the editable story source. Generate the adjacent,
ignored `.stories.json` files from the repository root with:

```sh
lando drush storybook:generate-all-stories --uri=https://omd.lndo.site
```

See the theme [README](../README.md) for the WSL Storybook and asset-build
commands, including the optional story watcher.
