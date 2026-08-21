// Rules the repo has chosen for itself. They have to be applied inside the
// TypeScript override as well: an override's `extends` is resolved after the
// top-level `rules`, so airbnb's own defaults would otherwise win there (a
// 100-character max-len, for one).
const projectRules = {
  'max-len': [
    'error',
    {
      code: 300,
      ignoreUrls: true,
      ignoreTrailingComments: true,
    },
  ],
  'no-console': 'off',
  'linebreak-style': [
    'error',
    'unix',
  ],

  // A leading underscore marks an internal or test-only name here. TypeScript's
  // `private` covers real privacy on the provider classes, and `__retryCount`
  // is axios's own convention for the counter it hangs off a request config.
  'no-underscore-dangle': [
    'error',
    {
      allow: ['__retryCount'],
      allowAfterThis: true,
      enforceInMethodNames: false,
    },
  ],

  // airbnb bans for..of because transpiling it used to pull in
  // regenerator-runtime. This service runs ES2020 on Node and pays no such
  // cost; the rest of airbnb's restrictions are kept as-is.
  'no-restricted-syntax': [
    'error',
    {
      selector: 'ForInStatement',
      message: 'for..in iterates the prototype chain and needs a hasOwnProperty guard. Use Object.{keys,values,entries} instead.',
    },
    {
      selector: 'LabeledStatement',
      message: 'Labels are a form of GOTO; use a function instead.',
    },
    {
      selector: 'WithStatement',
      message: '`with` is disallowed in strict mode and makes scope ambiguous.',
    },
  ],

  // Worth enforcing when introducing a binding, but rewriting an assignment
  // such as `rates[2] = fetched[2]` as destructuring reads worse than the
  // line it replaces.
  'prefer-destructuring': [
    'error',
    {
      VariableDeclarator: {
        array: true,
        object: true,
      },
      AssignmentExpression: {
        array: false,
        object: false,
      },
    },
  ],

  // This repo allows 300-character lines; airbnb's rule additionally breaks
  // any object literal with four or more properties, which contradicts that
  // and turns compact fixtures into three-line blocks. Keep the consistency
  // checks, drop the property-count trigger.
  'object-curly-newline': [
    'error',
    {
      multiline: true,
      consistent: true,
    },
  ],

  // config/index.ts and lib/axios.ts deliberately export the same value both
  // named and default, which is the entirety of what this rule sees.
  'import/no-named-as-default': 'off',

  // Named exports are the convention here. How many exports a module happens
  // to have today is not a reason to change how callers import it.
  'import/prefer-default-export': 'off',
};

module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
  ],
  rules: projectRules,
  overrides: [
    // TypeScript sources. The parser and the type-aware config live here
    // rather than at the top level so plain JS (this file, config/*.js) is
    // still linted without having to be part of the tsconfig project.
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
      plugins: [
        '@typescript-eslint',
      ],
      extends: [
        'airbnb-base',
        'airbnb-typescript/base',
      ],
      settings: {
        'import/resolver': {
          typescript: {
            project: './tsconfig.json',
          },
        },
      },
      rules: {
        ...projectRules,
        // TypeScript resolves module specifiers without a file extension, and
        // writing one would break `module: commonjs` resolution.
        'import/extensions': [
          'error',
          'ignorePackages',
          {
            ts: 'never',
            js: 'never',
          },
        ],
      },
    },
    // Tests import jest and the other devDependencies by design.
    {
      files: ['tests/**/*.ts'],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: true,
          },
        ],
      },
    },
  ],
};
