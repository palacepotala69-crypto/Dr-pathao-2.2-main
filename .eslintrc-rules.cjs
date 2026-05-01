module.exports = {
  plugins: ["@firebase/security-rules"],
  parser: "@firebase/security-rules/parser",
  rules: {
    "@firebase/security-rules/no-allow-all": "error"
  }
};
