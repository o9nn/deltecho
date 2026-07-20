// Ambient module declaration so plain (non-module) CSS side-effect imports
// typecheck. esbuild bundles these styles into html-dist/bundle.css which
// main.html already loads.
declare module '*.css'
