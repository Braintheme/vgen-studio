// Font files are imported as URLs (webpack asset modules in Remotion, Vite in the admin).
declare module '*.woff2' {
  const url: string;
  export default url;
}
