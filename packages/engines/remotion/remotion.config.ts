// Remotion Studio / CLI configuration.
import { Config } from '@remotion/cli/config';
import { webpackOverride } from './src/remotion/webpack-override.js';

Config.overrideWebpackConfig(webpackOverride);
// Studio previews the photo pair prepared by `make fixtures`.
Config.setPublicDir('../../../fixtures/.studio');
