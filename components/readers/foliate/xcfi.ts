import {
  collapse,
  fake,
  fromRange,
  parse,
  toElement,
  toRange,
} from "@/vendor/foliate-js/epubcfi.js";

export type XPointerResult = {
  xpointer: string;
};

export class XCFI {
  private readonly document: Document;
  private readonly spineItemIndex: number;

  constructor(document: Document, spineItemIndex: number) {
    this.document = document;
    this.spineItemIndex = spineItemIndex;
  }

  static extractSpineIndex(cfiOrXPointer: string) {
    if (cfiOrXPointer.startsWith("epubcfi(")) {
      const collapsed = collapse(parse(cfiOrXPointer));
      const spineStep = collapsed[0]?.[1]?.index;

      if (typeof spineStep !== "number") {
        throw new Error("Cannot extract CFI spine index.");
      }

      return Math.floor((spineStep - 2) / 2);
    }

    const match = cfiOrXPointer.match(/^\/body\/DocFragment\[(\d+)\]/);

    if (!match) {
      throw new Error("Cannot extract XPointer spine index.");
    }

    return Number.parseInt(match[1], 10) - 1;
  }

  cfiToXPointer(cfi: string): XPointerResult {
    const parts = parse(cfi);

    if (parts.parent) {
      const index = fake.toIndex(parts.parent.shift());
      this.assertSpineIndex(index);

      const range = toRange(this.document, parts);
      return { xpointer: this.rangePointToXPointer(range.startContainer, range.startOffset) };
    }

    const collapsed = collapse(parts);
    const index = fake.toIndex(parts.shift());
    this.assertSpineIndex(index);

    const element = toElement(this.document, parts[0]) as Element | null;

    if (!element) {
      throw new Error("Cannot resolve CFI element.");
    }

    const lastPart = collapsed[collapsed.length - 1]?.[collapsed[collapsed.length - 1].length - 1];
    const textOffset = lastPart?.offset;

    return {
      xpointer:
        typeof textOffset === "number"
          ? this.handleTextOffset(element, textOffset)
          : this.buildXPointerPath(element),
    };
  }

  xPointerToCFI(xpointer: string) {
    const { element, textOffset } = this.parseXPointer(xpointer);
    const range = this.document.createRange();

    if (typeof textOffset === "number") {
      const textNode = this.findTextNodeAtOffset(element, textOffset);
      if (textNode) {
        range.setStart(textNode.node, textNode.offset);
        range.setEnd(textNode.node, textNode.offset);
      } else {
        range.setStart(element, 0);
        range.setEnd(element, 0);
      }
    } else {
      range.setStart(element, 0);
      range.setEnd(element, 0);
    }

    return this.adjustSpineIndex(fromRange(range));
  }

  private assertSpineIndex(index: number) {
    if (index !== this.spineItemIndex) {
      throw new Error(`CFI spine index ${index} does not match ${this.spineItemIndex}.`);
    }
  }

  private parseXPointer(xpointer: string) {
    const indexedTextMatch = xpointer.match(/\/text\(\)\[(\d+)\]\.(\d+)$/);

    if (indexedTextMatch) {
      const elementPath = xpointer.replace(/\/text\(\)\[\d+\]\.\d+$/, "");
      const element = this.resolveXPointerPath(elementPath);

      if (!element) {
        throw new Error(`Cannot resolve XPointer path: ${elementPath}`);
      }

      return {
        element,
        textOffset: this.resolveIndexedTextNode(
          element,
          Number.parseInt(indexedTextMatch[1], 10),
          Number.parseInt(indexedTextMatch[2], 10),
        ),
      };
    }

    const textOffsetMatch = xpointer.match(/\/text\(\)\.(\d+)$/);
    const elementPath = textOffsetMatch ? xpointer.replace(/\/text\(\)\.\d+$/, "") : xpointer;
    const element = this.resolveXPointerPath(elementPath);

    if (!element) {
      throw new Error(`Cannot resolve XPointer path: ${elementPath}`);
    }

    return {
      element,
      textOffset: textOffsetMatch ? Number.parseInt(textOffsetMatch[1], 10) : undefined,
    };
  }

  private resolveXPointerPath(path: string) {
    const pathMatch = path.match(/^\/body\/DocFragment\[\d+\]\/body(.*)$/);

    if (!pathMatch) {
      throw new Error(`Invalid XPointer: ${path}`);
    }

    const segments = pathMatch[1].split("/").filter(Boolean);
    let current: Element = this.document.body;

    for (const segment of segments) {
      const match = segment.match(/^(\w+)(?:\[(\d+)\])?$/);

      if (!match) {
        throw new Error(`Invalid XPointer segment: ${segment}`);
      }

      const tagName = match[1].toLowerCase();
      const index = match[2] ? Number.parseInt(match[2], 10) - 1 : 0;
      const children = Array.from(current.children).filter(
        (child) => !isCfiInert(child) && child.tagName.toLowerCase() === tagName,
      );
      const child = children[index];

      if (!child) {
        throw new Error(`XPointer segment not found: ${segment}`);
      }

      current = child;
    }

    return current;
  }

  private resolveIndexedTextNode(element: Element, textNodeIndex: number, offsetInNode: number) {
    let directTextCount = 0;
    let cumulativeOffset = 0;

    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        directTextCount += 1;
        if (directTextCount === textNodeIndex) {
          return cumulativeOffset + offsetInNode;
        }
        cumulativeOffset += child.textContent?.length ?? 0;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        cumulativeOffset += child.textContent?.length ?? 0;
      }
    }

    throw new Error(`Text node index ${textNodeIndex} out of bounds.`);
  }

  private findTextNodeAtOffset(element: Element, offset: number) {
    const textNodes: Text[] = [];
    collectTextNodes(element, textNodes);
    let currentOffset = 0;

    for (const textNode of textNodes) {
      const nodeLength = textNode.textContent?.length ?? 0;

      if (currentOffset + nodeLength >= offset) {
        return { node: textNode, offset: offset - currentOffset };
      }

      currentOffset += nodeLength;
    }

    const lastNode = textNodes[textNodes.length - 1];
    return lastNode ? { node: lastNode, offset: lastNode.textContent?.length ?? 0 } : null;
  }

  private adjustSpineIndex(cfi: string) {
    const match = cfi.match(/^epubcfi\((.+)\)$/);

    if (!match) {
      throw new Error(`Invalid CFI: ${cfi}`);
    }

    const spineStep = (this.spineItemIndex + 1) * 2;
    const inner = match[1];
    const adjusted = inner.match(/^\/6\/\d+!/)
      ? inner.replace(/^\/6\/\d+!/, `/6/${spineStep}!`)
      : `/6/${spineStep}!${inner}`;

    return `epubcfi(${adjusted})`;
  }

  private rangePointToXPointer(container: Node, offset: number) {
    if (container.nodeType === Node.TEXT_NODE) {
      const element = container.parentElement ?? this.document.documentElement;
      return this.handleTextOffsetInElement(element, container as Text, offset);
    }

    if (container.nodeType === Node.ELEMENT_NODE) {
      const element = container as Element;
      const child = element.childNodes[Math.max(0, offset - 1)];

      if (child?.nodeType === Node.TEXT_NODE) {
        return this.handleTextOffsetInElement(
          element,
          child as Text,
          child.textContent?.length ?? 0,
        );
      }

      if (child?.nodeType === Node.ELEMENT_NODE) {
        return this.buildXPointerPath(child as Element);
      }

      return this.buildXPointerPath(element);
    }

    return this.buildXPointerPath(this.document.body);
  }

  private buildXPointerPath(targetElement: Element) {
    const pathParts: string[] = [];
    let current: Element | null = targetElement;

    while (current && current !== this.document.documentElement) {
      const parent: Element | null = current.parentElement;
      if (!parent) break;

      const tagName = current.tagName.toLowerCase();
      const sameTagSiblings = Array.from(parent.children).filter(
        (sibling) => !isCfiInert(sibling) && sibling.tagName.toLowerCase() === tagName,
      );
      const siblingIndex = sameTagSiblings.indexOf(current);

      pathParts.unshift(sameTagSiblings.length === 1 ? tagName : `${tagName}[${siblingIndex + 1}]`);
      current = parent;
    }

    if (pathParts[0]?.startsWith("body")) {
      pathParts.shift();
    }

    return `/body/DocFragment[${this.spineItemIndex + 1}]/body${pathParts.length > 0 ? `/${pathParts.join("/")}` : ""}`;
  }

  private handleTextOffset(element: Element, cfiOffset: number) {
    const textNodes: Text[] = [];
    collectTextNodes(element, textNodes);
    let totalChars = 0;

    for (const textNode of textNodes) {
      const nodeLength = textNode.textContent?.length ?? 0;

      if (totalChars + nodeLength >= cfiOffset) {
        const textParent = textNode.parentElement ?? element;
        const basePath = this.buildXPointerPath(textParent);
        const directTextNodes = Array.from(textParent.childNodes).filter(
          (child): child is Text =>
            child.nodeType === Node.TEXT_NODE && Boolean(child.textContent?.length),
        );
        const directTextIndex = directTextNodes.indexOf(textNode) + 1;
        const offset = cfiOffset - totalChars;

        return directTextNodes.length <= 1
          ? `${basePath}/text().${offset}`
          : `${basePath}/text()[${directTextIndex || 1}].${offset}`;
      }

      totalChars += nodeLength;
    }

    return this.buildXPointerPath(element);
  }

  private handleTextOffsetInElement(element: Element, textNode: Text, offset: number) {
    const textNodes: Text[] = [];
    collectTextNodes(element, textNodes);
    let cumulativeOffset = 0;

    for (const node of textNodes) {
      if (node === textNode) {
        cumulativeOffset += offset;
        break;
      }
      cumulativeOffset += node.textContent?.length ?? 0;
    }

    return this.handleTextOffset(element, cumulativeOffset);
  }
}

function collectTextNodes(element: Element, textNodes: Text[]) {
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      if (child.textContent?.length) {
        textNodes.push(child as Text);
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      collectTextNodes(child as Element, textNodes);
    }
  }
}

function isCfiInert(element: Element) {
  return element.hasAttribute("cfi-inert");
}
