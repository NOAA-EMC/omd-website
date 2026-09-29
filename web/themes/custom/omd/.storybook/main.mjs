/** @type { import('@storybook/server-webpack5').StorybookConfig } */
const config = {
  stories: ['../templates/**/*.stories.json'],
  addons: [
    '@storybook/addon-webpack5-compiler-swc',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
  ],
  framework: '@storybook/server-webpack5',
};

export default config;