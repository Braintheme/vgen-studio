import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /** Header title of the screen. */
    title?: string;
  }
}
