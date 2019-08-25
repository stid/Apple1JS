module.exports = {
    "parser": "babel-eslint",
    "env": {
        "node": true,
        "es6": true,
        "jest": true
    },
    "plugins": [
        "@typescript-eslint"
    ],
    "extends": ["eslint:recommended"],
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "settings": {
        "import/resolver": {
            "node": true,
            "eslint-import-resolver-typescript": true
          },
    },
    "overrides": [
        {
            "files": ["*.ts"],
            "extends": [
                "eslint:recommended",
                "plugin:@typescript-eslint/eslint-recommended",
                "plugin:@typescript-eslint/recommended"
              ],
              "rules": {
                "@typescript-eslint/explicit-function-return-type": 0
            }
        }
    ],
    "rules": {
        "@typescript-eslint/interface-name-prefix": 0,
        "import/extensions": [0,"never", {"ts": "never"}],
        "process-env": "off",
        "no-console": "off",
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ]
    }
};
