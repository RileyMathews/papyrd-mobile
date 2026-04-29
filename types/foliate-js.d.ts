declare module "@/vendor/foliate-js/epubcfi.js" {
  export const fake: {
    toIndex(part: unknown): number;
  };
  export function collapse(value: unknown, toEnd?: boolean): any;
  export function fromRange(range: Range): string;
  export function parse(cfi: string): any;
  export function toElement(document: Document, parts: unknown): Element | null;
  export function toRange(document: Document, parts: unknown): Range;
}
