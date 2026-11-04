module.exports = {
  extends: ["next/core-web-vitals"],
  plugins: ["i18next"],
  rules: {
    "import/no-anonymous-default-export": "off",
  },
  overrides: [
    {
      files: [
        "src/app/(app)/page.jsx",
        "src/app/(app)/employees/**/*.jsx",
        "src/app/(app)/approvals/**/*.jsx",
        "src/app/(app)/attendance/page.jsx",
        "src/app/(app)/leave/page.jsx",
        "src/app/(app)/payroll/**/*.jsx",
        "src/app/(app)/offboarding/**/*.jsx",
        "src/app/(app)/compliance/**/*.jsx",
        "src/app/(app)/reports/**/*.jsx",
        "src/app/(app)/settings/**/*.jsx",
        "src/app/(app)/audit/**/*.jsx",
        "src/app/(app)/me/page.jsx",
        "src/app/(app)/me/payslips/**/*.jsx",
      ],
      rules: {
        "i18next/no-literal-string": [
          "error",
          {
            mode: "jsx-text-only",
          },
        ],
      },
    },
  ],
};
