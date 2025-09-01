import globals from "globals";

export default [{
    files: ["**/*.js"],
    languageOptions: {
        globals: {
            ...globals.commonjs,
            ...globals.mocha,
            ...globals.node,
            document: "readonly", 
            window: "readonly",
            vscode: "readonly", 
            $: "readonly", // This line tells ESLint that '$' is a global variable
        },
        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        "no-this-before-super": "warn",
        "constructor-super": "warn",
        "no-const-assign": "warn",
        "no-unreachable": "warn",
        "no-unused-vars": "warn",
        "valid-typeof": "warn",
        "no-undef": "warn",
    },
}];