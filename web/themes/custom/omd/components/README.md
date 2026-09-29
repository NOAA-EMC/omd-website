# Alert Single-Directory Component

Drupal Single-Directory Components keep a component's metadata, Twig template,
and related files together under `components/<component-name>/`:

```text
components/
  alert/
    alert.component.yml
    alert.twig
    alert.stories.twig
```

The component is available to Twig as `omd:alert`. Storybook definitions live
beside the SDC files; the Storybook Drupal module compiles each
`*.stories.twig` file into an adjacent, ignored `*.stories.json` file.

Run `npm run storybook` from this theme to compile the Twig stories and start
Storybook. Use `npm run storybook:compile` to recompile stories while Storybook
is running.
