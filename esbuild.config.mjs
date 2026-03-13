import * as esbuild from "esbuild";

const isDev = process.argv.includes("--dev");
const isWatch = process.argv.includes("--watch");

const config = {
  entryPoints: ["SankeyViz.tsx"],
  bundle: true,
  outdir: ".",
  format: "iife",
  sourcemap: isDev,
  minify: !isDev,
  target: "es2015",
  jsx: "automatic",
  legalComments: "linked",
  logLevel: "info",
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(config);
}
