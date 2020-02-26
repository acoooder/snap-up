module.exports = {
    "env": {
        "browser": true,
        "node": true,
        "es6": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended"
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint"
    ],
    "rules": {
        "@typescript-eslint/indent": ["error", 2],
        "@typescript-eslint/no-unused-vars": 0,
        "@typescript-eslint/interface-name-prefix": 0,
        "@typescript-eslint/explicit-member-accessibility": 0,
        "@typescript-eslint/no-triple-slash-reference": 0,
        "@typescript-eslint/triple-slash-reference": ["error", { path: "always", types: "never", lib: "never" }],
        "@typescript-eslint/no-var-requires": 0,
        "@typescript-eslint/explicit-function-return-type": 0,
        "@typescript-eslint/no-non-null-assertion": 0,
        "@typescript-eslint/no-explicit-any": 0,
        "@typescript-eslint/ban-ts-ignore": 0,
        "@typescript-eslint/no-empty-interface": 0,
        "@typescript-eslint/camelcase": 0,
        "no-console": ["warn", { allow: ["warn", "error"] }],
        "comma-dangle": ["warn", {
            "arrays": "never",
            "objects": "never",
            "imports": "never",
            "exports": "never",
            "functions": "never"
        }],
        "semi": ["warn", "always"],
        "eqeqeq": ["warn", "always"]
    }
};