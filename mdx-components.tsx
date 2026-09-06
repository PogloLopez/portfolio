import type { MDXComponents } from "mdx/types";

/**
 * Prose inside a case study renders through the `.prose` styles in globals.css,
 * so this map only needs to add what markdown cannot express on its own.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...components };
}
