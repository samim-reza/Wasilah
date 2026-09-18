/**
 * Ambient declarations for non-TypeScript imports.
 */

/** Metro + NativeWind turn the Tailwind entry point into a side-effect import. */
declare module '*.css';

/** Font and image assets resolved by Metro's asset registry. */
declare module '*.ttf' {
  const asset: number;
  export default asset;
}
declare module '*.otf' {
  const asset: number;
  export default asset;
}
declare module '*.png' {
  const asset: number;
  export default asset;
}
