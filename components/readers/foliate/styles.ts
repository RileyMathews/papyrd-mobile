const FOLIATE_READER_THEME_CSS = `
  @namespace epub "http://www.idpf.org/2007/ops";
  html {
    --theme-bg-color: #020617;
    --theme-fg-color: #e2e8f0;
    --theme-primary-color: #7dd3fc;
    color-scheme: dark;
  }
  body {
    color: var(--theme-fg-color);
    background: var(--theme-bg-color);
  }
  p, li, blockquote, dd {
    line-height: 1.55;
  }
  a:any-link {
    color: var(--theme-primary-color);
  }
  font[color="#000000"], font[color="#000"], font[color="black"],
  font[color="rgb(0,0,0)"], font[color="rgb(0, 0, 0)"],
  *[style*="color: rgb(0,0,0)"], *[style*="color: rgb(0, 0, 0)"],
  *[style*="color: #000"], *[style*="color: #000000"], *[style*="color: black"],
  *[style*="color:rgb(0,0,0)"], *[style*="color:rgb(0, 0, 0)"],
  *[style*="color:#000"], *[style*="color:#000000"], *[style*="color:black"] {
    color: var(--theme-fg-color) !important;
  }
  img, svg {
    max-inline-size: 100%;
    block-size: auto;
  }
  img {
    cursor: zoom-in;
  }
  aside[epub|type~="endnote"],
  aside[epub|type~="footnote"],
  aside[epub|type~="note"],
  aside[epub|type~="rearnote"] {
    display: none;
  }
`;

const BASE_READER_FONT_SIZE = 16;

const FOLIATE_CONTENT_QUIRK_OVERRIDES_CSS = `
  #pg-header * {
    color: inherit !important;
  }
  .x-ebookmaker, .x-ebookmaker-cover, .x-ebookmaker-coverpage {
    background-color: unset !important;
  }
`;

export function buildFoliateReaderThemeCss() {
  return FOLIATE_READER_THEME_CSS;
}

export function buildFoliateContentQuirkOverridesCss() {
  return FOLIATE_CONTENT_QUIRK_OVERRIDES_CSS;
}

export function buildFoliateFontCss(fontScale: number) {
  const fontSize = Math.round(BASE_READER_FONT_SIZE * fontScale * 100) / 100;

  return `
    html {
      --reader-font-size: ${fontSize}px;
      --reader-min-font-size: 8px;
    }
    html, body {
      font-size: var(--reader-font-size) !important;
      -webkit-text-size-adjust: none;
      text-size-adjust: none;
    }
    [style*="font-size: 16px"], [style*="font-size:16px"],
    [style*="font-size: 12pt"], [style*="font-size:12pt"] {
      font-size: 1rem !important;
    }
  `;
}

export function buildFoliateInjectedCss(fontScale: number) {
  return `${buildFoliateReaderThemeCss()}\n${buildFoliateFontCss(fontScale)}\n${buildFoliateContentQuirkOverridesCss()}`;
}

export function transformFoliateAuthoredStylesheet(css: string) {
  return css
    .replace(/font-size\s*:\s*xx-small/gi, "font-size: max(0.6rem, var(--reader-min-font-size))")
    .replace(/font-size\s*:\s*x-small/gi, "font-size: max(0.75rem, var(--reader-min-font-size))")
    .replace(/font-size\s*:\s*small/gi, "font-size: max(0.875rem, var(--reader-min-font-size))")
    .replace(/font-size\s*:\s*medium/gi, "font-size: max(1rem, var(--reader-min-font-size))")
    .replace(/font-size\s*:\s*large/gi, "font-size: max(1.2rem, var(--reader-min-font-size))")
    .replace(/font-size\s*:\s*x-large/gi, "font-size: max(1.5rem, var(--reader-min-font-size))")
    .replace(/font-size\s*:\s*xx-large/gi, "font-size: max(2rem, var(--reader-min-font-size))")
    .replace(/font-size\s*:\s*xxx-large/gi, "font-size: max(3rem, var(--reader-min-font-size))")
    .replace(/font-size\s*:\s*(\d+(?:\.\d+)?)px/gi, (_, px: string) => {
      const rem = Number.parseFloat(px) / BASE_READER_FONT_SIZE;
      return `font-size: max(${rem}rem, var(--reader-min-font-size))`;
    })
    .replace(/font-size\s*:\s*(\d+(?:\.\d+)?)pt/gi, (_, pt: string) => {
      const rem = Number.parseFloat(pt) / 12;
      return `font-size: max(${rem}rem, var(--reader-min-font-size))`;
    })
    .replace(/(^|[\s;{])color\s*:\s*black\b/gi, "$1color: var(--theme-fg-color)")
    .replace(/(^|[\s;{])color\s*:\s*#000000\b/gi, "$1color: var(--theme-fg-color)")
    .replace(/(^|[\s;{])color\s*:\s*#000\b/gi, "$1color: var(--theme-fg-color)")
    .replace(/(^|[\s;{])color\s*:\s*rgb\(0,\s*0,\s*0\)/gi, "$1color: var(--theme-fg-color)");
}

export function transformFoliateEmbeddedStyleBlocks(markup: string) {
  return markup.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (fullMatch, styleContent: string) => {
    return fullMatch.replace(styleContent, transformFoliateAuthoredStylesheet(styleContent));
  });
}

type FoliateContentTransformDetail = {
  data: Promise<string> | string;
  name?: string;
  type?: string;
};

export function handleFoliateContentTransformEvent(event: Event) {
  const { detail } = event as CustomEvent<FoliateContentTransformDetail>;
  detail.data = Promise.resolve(detail.data)
    .then((data) => {
      if (detail.type === "text/css") {
        return transformFoliateAuthoredStylesheet(data);
      }

      const isHtml = detail.type === "application/xhtml+xml" || detail.type === "text/html";
      if (isHtml) {
        return transformFoliateEmbeddedStyleBlocks(data);
      }

      return data;
    })
    .catch((error) => {
      console.error(new Error(`Failed to load ${detail.name ?? "section"}`, { cause: error }));
      return "";
    });
}
