// @ts-check
// Admin architecture rules, imported by the root eslint.config.js.
// Layers (each may only use the ones before it):  lib -> api -> queries -> stores -> composables -> components -> views
// See docs/frontend.md.
import { readdirSync } from 'node:fs';
import path from 'node:path';

const SRC = 'apps/admin/src';

/** Shared with the root config: the admin is core code and stays engine-agnostic. */
const ENGINE_SPECIFIC = ['remotion', '@remotion/*', 'react', 'react-dom', 'react/*', '@vgen/engine-*'];

const IMPORT_GROUPS = {
  api: ['@/api/*'],
  queries: ['@/queries/*'],
  stores: ['@/stores/*'],
  composables: ['@/composables/*', '@/features/*/composables/*'],
  components: ['@/components/*', '@/features/*/components/*'],
  views: ['@/features/*/views/*'],
  app: ['@/app/*'],
  engines: ['@/engines/*'],
  catalog: ['@vgen/catalog', '@vgen/catalog/*'],
  http: ['axios'],
  serverState: ['@tanstack/vue-query'],
  state: ['pinia'],
  router: ['vue-router'],
};

/** What each layer must not import, and why. */
const LAYER_RULES = {
  lib: {
    forbidden: [
      'api',
      'queries',
      'stores',
      'composables',
      'components',
      'views',
      'app',
      'engines',
      'catalog',
      'http',
      'serverState',
      'state',
      'router',
    ],
    message: 'lib/ holds framework-free helpers and types only.',
    extra: ['vue'],
  },
  api: {
    forbidden: [
      'queries',
      'stores',
      'composables',
      'components',
      'views',
      'app',
      'engines',
      'catalog',
      'serverState',
      'state',
      'router',
    ],
    message: 'api/ talks HTTP only; it knows nothing about Vue state or UI.',
    extra: ['vue'],
  },
  engines: {
    forbidden: [
      'api',
      'queries',
      'stores',
      'composables',
      'components',
      'views',
      'app',
      'http',
      'serverState',
      'state',
      'router',
    ],
    message: 'engines/ is the only gateway to @vgen/catalog (template definitions, player loaders).',
    extra: ['vue'],
  },
  queries: {
    forbidden: [
      'stores',
      'composables',
      'components',
      'views',
      'app',
      'engines',
      'catalog',
      'http',
      'state',
      'router',
    ],
    message: 'queries/ wraps api/ in Vue Query; HTTP goes through api/, local state lives in stores/.',
  },
  stores: {
    forbidden: [
      'api',
      'queries',
      'composables',
      'components',
      'views',
      'app',
      'engines',
      'catalog',
      'http',
      'serverState',
    ],
    message:
      'stores/ hold local UI state only: they never import api/ or queries/ (server data lives in Vue Query).',
  },
  composables: {
    forbidden: ['api', 'components', 'views', 'app', 'catalog', 'http'],
    message: 'Composables use queries/, stores/ and engines/, never api/ or components.',
  },
  components: {
    forbidden: [
      'api',
      'queries',
      'stores',
      'composables',
      'views',
      'app',
      'engines',
      'catalog',
      'http',
      'serverState',
      'state',
      'router',
    ],
    message: 'Components are presentational: data in via props, events out via emits/defineModel.',
  },
  views: {
    forbidden: ['api', 'queries', 'stores', 'app', 'engines', 'catalog', 'http', 'serverState', 'state'],
    message: 'Views only compose composables and components.',
  },
  app: {
    forbidden: ['api', 'queries', 'stores', 'engines', 'catalog', 'http'],
    message: 'The app shell wires composables into layout components.',
  },
};

const features = (() => {
  try {
    return readdirSync(path.join(import.meta.dirname, 'src/features'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
})();

/**
 * One config per file group: flat config does not merge `no-restricted-imports` options,
 * so every combination (layer, feature) gets the complete list in a single rule.
 */
const restrict = (files, layer, otherFeatures = []) => {
  const rule = LAYER_RULES[layer];
  const groups = [...rule.forbidden.flatMap((name) => IMPORT_GROUPS[name]), ...(rule.extra ?? [])];
  return {
    files,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ENGINE_SPECIFIC,
              message: 'The admin stays engine-agnostic; use the player adapter registry.',
            },
            { group: groups, message: rule.message },
            ...(otherFeatures.length > 0
              ? [
                  {
                    group: otherFeatures.map((feature) => `@/features/${feature}/*`),
                    message:
                      'Features do not import each other; move shared code to components/, composables/ or lib/.',
                  },
                ]
              : []),
            { regex: '^\\.\\./', message: 'Use the @/ alias instead of ../ imports.' },
          ],
        },
      ],
    },
  };
};

const featureConfigs = features.flatMap((feature) => {
  const others = features.filter((name) => name !== feature);
  const base = `${SRC}/features/${feature}`;
  return [
    restrict([`${base}/*.ts`], 'components', others),
    restrict([`${base}/composables/**`], 'composables', others),
    restrict([`${base}/components/**`], 'components', others),
    restrict([`${base}/views/**`], 'views', others),
  ];
});

export const adminLayerConfigs = [
  restrict([`${SRC}/lib/**`], 'lib'),
  restrict([`${SRC}/api/**`], 'api'),
  restrict([`${SRC}/engines/**`], 'engines'),
  restrict([`${SRC}/queries/**`], 'queries'),
  restrict([`${SRC}/stores/**`], 'stores'),
  restrict([`${SRC}/composables/**`], 'composables'),
  restrict([`${SRC}/components/**`], 'components'),
  restrict([`${SRC}/app/**`], 'app'),
  ...featureConfigs,
];

/** Vue conventions (see docs/frontend.md). */
export const adminVueConfig = {
  files: [`${SRC}/**/*.vue`],
  rules: {
    'vue/block-lang': ['error', { script: { lang: 'ts' } }],
    'vue/component-api-style': ['error', ['script-setup']],
    'vue/define-props-declaration': ['error', 'type-based'],
    'vue/define-emits-declaration': ['error', 'type-literal'],
    'vue/define-macros-order': [
      'error',
      { order: ['defineProps', 'defineEmits', 'defineModel', 'defineSlots'] },
    ],
    'vue/require-explicit-slots': 'error',
    'vue/component-name-in-template-casing': ['error', 'PascalCase', { registeredComponentsOnly: false }],
    'vue/custom-event-name-casing': ['error', 'camelCase'],
    'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
    'vue/no-unused-properties': ['error', { groups: ['props'] }],
    'vue/no-unused-refs': 'error',
    'vue/no-useless-v-bind': 'error',
    'vue/no-ref-object-reactivity-loss': 'error',
    'vue/no-required-prop-with-default': 'error',
    'vue/prefer-true-attribute-shorthand': 'error',
    'vue/require-typed-ref': 'error',
    'vue/max-template-depth': ['error', { maxDepth: 8 }],
    // Big components must be split.
    'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
  },
};
