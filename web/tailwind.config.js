var merge = require("lodash/merge");
var path = require("path");
var fs = require("fs");
var { createRequire } = require("module");

// Use relative paths for imports
const baseThemes = require("./tailwind-themes/tailwind.config.js");

let customThemes = null;

// Determine which theme to load: custom theme if specified, otherwise default
const themeName = process.env.NEXT_PUBLIC_THEME || "default";
const customThemePath = path.join(
  __dirname,
  "tailwind-themes/custom",
  themeName,
  "tailwind.config.js"
);

if (fs.existsSync(customThemePath)) {
  // Use createRequire to avoid bundler static analysis without using eval
  const dynamicRequire = createRequire(__filename);
  customThemes = dynamicRequire(customThemePath);
}

// CJK font fallback overlay. Appends CJK fonts after the existing English
// fonts so Chinese characters render with proper glyphs across macOS /
// Windows / Linux without changing English rendering.
const cjkFontOverlay = {
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Hanken Grotesk",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "Noto Sans SC",
          "Noto Sans CJK SC",
          "sans-serif",
        ],
      },
    },
  },
};

/** @type {import('tailwindcss').Config} */
module.exports = merge(
  {},
  baseThemes,
  customThemes || {},
  cjkFontOverlay
);
