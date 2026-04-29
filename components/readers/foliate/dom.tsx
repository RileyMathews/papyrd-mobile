"use dom";

import "@/vendor/foliate-js/view.js";

import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildFoliateInjectedCss,
  handleFoliateContentTransformEvent,
} from "@/components/readers/foliate/styles";
import { XCFI } from "@/components/readers/foliate/xcfi";

type TocEntry = {
  depth: number;
  href: string;
  id: string;
  label: string;
};

type FoliateReaderDomProps = {
  bookTitle: string;
  fontScale: number;
  initialCfi?: string | null;
  remoteXPointer?: string | null;
  loadBook: () => Promise<string | Uint8Array | ArrayBuffer>;
  onFontScaleChange: (fontScale: number) => void;
  onProgressChanged?: (progress: FoliateReaderProgress) => Promise<void>;
  reportDiagnostic: (message: string) => Promise<void>;
  dom?: import("expo/dom").DOMProps;
  testBridge?: {
    onDispose?: () => void;
    onReady?: (api: FoliateReaderDomTestApi) => void;
  };
};

type ActiveReaderImage = {
  alt: string;
  height: number | null;
  src: string;
  width: number | null;
};

type ImageViewerTransform = {
  scale: number;
  translateX: number;
  translateY: number;
};

type GesturePoint = {
  x: number;
  y: number;
};

type ImageViewerGesture = {
  initialDistance: number;
  initialMidpoint: GesturePoint;
  initialScale: number;
  initialTranslateX: number;
  initialTranslateY: number;
  panStartX: number;
  panStartY: number;
  panTranslateX: number;
  panTranslateY: number;
};

export type FoliateReaderProgress = {
  cfi: string;
  xpointer?: string;
  fraction: number;
  percentage: number;
};

export type FoliateReaderDomTestState = {
  currentChapterLabel: string | null;
  currentHref: string | null;
  errorMessage: string | null;
  isReady: boolean;
  progressFraction: number | null;
  status: string;
  tocEntries: TocEntry[];
};

export type FoliateReaderDomTestApi = {
  getState(): FoliateReaderDomTestState;
  getVisibleText(): { characters: number; snippets: string[] };
  getViewportSnapshot(): {
    containerHeight: number;
    containerWidth: number;
    contentCount: number;
    visibleCharacters: number;
    viewHeight: number;
    viewWidth: number;
  };
  goNext(): Promise<void>;
  goPrev(): Promise<void>;
  jumpToChapter(index: number): Promise<void>;
};

type FoliateLocationDetail = {
  cfi?: string | null;
  fraction?: number;
  range?: Range | null;
  section?: {
    current?: number;
    total?: number;
  } | null;
  tocItem?: {
    href?: string;
    label?: string;
  } | null;
};

type FoliateBook = {
  metadata?: {
    title?: string | Record<string, string>;
  };
  transformTarget?: EventTarget;
  sections?: {
    createDocument?: () => Promise<Document>;
    id?: string;
  }[];
  toc?: {
    href?: string;
    label?: string | Record<string, string>;
    subitems?: FoliateBook["toc"];
  }[];
};

type FoliateViewElement = HTMLElement & {
  book?: FoliateBook;
  goLeft?: () => Promise<void> | void;
  goRight?: () => Promise<void> | void;
  init?: (options: { lastLocation?: string; showTextStart?: boolean }) => Promise<void>;
  next?: () => Promise<void> | void;
  prev?: () => Promise<void> | void;
  goTo: (target: string) => Promise<void>;
  open: (book: File | Blob | string) => Promise<void>;
  renderer?: HTMLElement & {
    getContents?: () => {
      doc?: Document | null;
      index?: number;
    }[];
    primaryIndex?: number;
    next?: () => Promise<void>;
    prev?: () => Promise<void>;
    setAttribute: (name: string, value: string) => void;
    setStyles?: (css: string) => void;
  };
};

const EMPTY_STATE: FoliateReaderDomTestState = {
  currentChapterLabel: null,
  currentHref: null,
  errorMessage: null,
  isReady: false,
  progressFraction: null,
  status: "Opening book...",
  tocEntries: [],
};

const FONT_SCALE_STEP = 0.1;
const MIN_FONT_SCALE = 0.8;
const MAX_FONT_SCALE = 1.8;

export default function FoliateReaderDom({
  bookTitle,
  fontScale,
  initialCfi,
  loadBook,
  onFontScaleChange,
  onProgressChanged,
  reportDiagnostic,
  remoteXPointer,
  testBridge,
}: FoliateReaderDomProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<FoliateViewElement | null>(null);
  const fontScaleRef = useRef(fontScale);
  const loadBookRef = useRef(loadBook);
  const onProgressChangedRef = useRef(onProgressChanged);
  const reportDiagnosticRef = useRef(reportDiagnostic);
  const remoteXPointerRef = useRef(remoteXPointer);
  const testBridgeRef = useRef(testBridge);
  const stateRef = useRef<FoliateReaderDomTestState>(EMPTY_STATE);
  const [state, setState] = useState<FoliateReaderDomTestState>(EMPTY_STATE);
  const [showToc, setShowToc] = useState(false);
  const [activeImage, setActiveImage] = useState<ActiveReaderImage | null>(null);

  fontScaleRef.current = fontScale;
  loadBookRef.current = loadBook;
  onProgressChangedRef.current = onProgressChanged;
  reportDiagnosticRef.current = reportDiagnostic;
  remoteXPointerRef.current = remoteXPointer;
  testBridgeRef.current = testBridge;
  stateRef.current = state;

  const updateFontScale = useCallback(
    (nextFontScale: number) => {
      const clamped = clampFontScale(nextFontScale);
      onFontScaleChange(clamped);
    },
    [onFontScaleChange],
  );

  const logDiagnostic = useCallback((message: string) => {
    console.log(`[foliate-reader] ${message}`);
    void reportDiagnosticRef.current(message);
  }, []);

  const patchState = useCallback((patch: Partial<FoliateReaderDomTestState>) => {
    setState((current) => ({ ...current, ...patch }));
  }, []);

  const turnPage = useCallback(
    async (direction: "prev" | "next") => {
      const view = viewRef.current;

      if (!view || !stateRef.current.isReady) {
        return;
      }

      patchState({ errorMessage: null });
      logDiagnostic(`turn: ${direction}`);

      try {
        if (direction === "next") {
          await (view.goRight?.() ?? view.next?.());
        } else {
          await (view.goLeft?.() ?? view.prev?.());
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : `Failed to turn ${direction}.`;
        patchState({ errorMessage: message });
        logDiagnostic(`turn: failed (${message})`);
      }
    },
    [logDiagnostic, patchState],
  );

  const jumpToChapter = useCallback(
    async (index: number) => {
      const view = viewRef.current;
      const entry = stateRef.current.tocEntries[index];

      if (!view || !entry) {
        return;
      }

      patchState({ errorMessage: null, status: `Opening ${entry.label}...` });
      logDiagnostic(`toc: navigating to ${entry.href}`);

      try {
        await view.goTo(entry.href);
        setShowToc(false);
        patchState({ status: "" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to open chapter.";
        patchState({ errorMessage: message, status: "" });
        logDiagnostic(`toc: failed (${message})`);
      }
    },
    [logDiagnostic, patchState],
  );

  useEffect(() => {
    let isCancelled = false;
    let teardownResizeObserver: (() => void) | undefined;
    let teardownImageTapListeners: (() => void) | undefined;
    let removeRelocateListener: (() => void) | undefined;

    async function mountReader() {
      patchState({ ...EMPTY_STATE, status: "Opening book..." });
      logDiagnostic("startup: requesting EPUB payload");

      try {
        const payload = await loadBookRef.current();

        if (isCancelled || !containerRef.current) {
          return;
        }

        patchState({ status: "Preparing foliate..." });
        const file = await createBookFile(payload, bookTitle);

        if (isCancelled || !containerRef.current) {
          return;
        }

        const container = containerRef.current;
        const initialViewport = await waitForViewport(container);
        logDiagnostic(`startup: viewport ${initialViewport.width}x${initialViewport.height}`);
        container.replaceChildren();

        const view = document.createElement("foliate-view") as FoliateViewElement;
        viewRef.current = view;
        Object.assign(view.style, {
          display: "block",
          height: "100%",
          width: "100%",
        });
        container.append(view);

        const handleRelocate = (event: Event) => {
          const detail = (event as CustomEvent<FoliateLocationDetail>).detail;
          const cfi = detail.cfi ?? null;
          const xpointer = cfi ? getXPointerFromCfi(view, cfi, logDiagnostic) : undefined;
          const sectionHref = getSectionHref(view, detail.section?.current);
          const href = detail.tocItem?.href ?? sectionHref ?? null;
          const label =
            normalizeLabel(detail.tocItem?.label) ??
            findChapterLabel(stateRef.current.tocEntries, href) ??
            findChapterLabelForSection(stateRef.current.tocEntries, sectionHref);
          patchState({
            currentChapterLabel: label,
            currentHref: href,
            errorMessage: null,
            progressFraction: detail.fraction ?? null,
            status: "",
          });
          logDiagnostic(
            `event: relocated ${href ?? "unknown"} (section ${detail.section?.current ?? "unknown"}, cfi=${cfi ?? "missing"}, xpointer=${xpointer ?? "missing"}, fraction=${detail.fraction ?? "unknown"})`,
          );
          if (cfi) {
            void onProgressChangedRef.current?.({
              cfi,
              xpointer,
              fraction: detail.fraction ?? 0,
              percentage: detail.fraction ?? 0,
            });
          }
        };

        view.addEventListener("relocate", handleRelocate as EventListener);
        removeRelocateListener = () => {
          view.removeEventListener("relocate", handleRelocate as EventListener);
        };

        teardownImageTapListeners = installImageTapListeners(view, (image) => {
          logDiagnostic(
            `image: opening ${image.width ?? "unknown"}x${image.height ?? "unknown"} ${image.src.slice(0, 80)}`,
          );
          setShowToc(false);
          setActiveImage(image);
        });

        logDiagnostic("startup: opening foliate view");
        await view.open(file);

        if (isCancelled) {
          removeRelocateListener?.();
          view.remove();
          viewRef.current = null;
          return;
        }

        view.book?.transformTarget?.addEventListener("data", handleFoliateContentTransformEvent);

        view.renderer?.setAttribute("flow", "paginated");
        view.renderer?.setAttribute("gap", "5%");
        view.renderer?.setAttribute("margin-top", "12px");
        view.renderer?.setAttribute("margin-right", "12px");
        view.renderer?.setAttribute("margin-bottom", "12px");
        view.renderer?.setAttribute("margin-left", "12px");
        view.renderer?.setAttribute("animated", "");
        view.renderer?.setStyles?.(buildFoliateInjectedCss(fontScaleRef.current));
        const tocEntries = flattenToc(view.book?.toc ?? []);
        const title = normalizeLabel(view.book?.metadata?.title) ?? bookTitle;
        const waitForInitialDisplay = waitForFoliateInitialDisplay(view);

        await view.init?.(initialCfi ? { lastLocation: initialCfi } : { showTextStart: true });
        await waitForInitialDisplay;

        if (remoteXPointerRef.current?.startsWith("/body")) {
          try {
            logDiagnostic(`kosync: converting remote XPointer ${remoteXPointerRef.current}`);
            const remoteCfi = await getCfiFromXPointer(view, remoteXPointerRef.current);
            logDiagnostic(`kosync: remote XPointer converted to CFI ${remoteCfi}`);
            await view.goTo(remoteCfi);
            logDiagnostic("startup: applied remote KOSync progress");
          } catch (error) {
            const message = error instanceof Error ? error.message : "unknown error";
            logDiagnostic(`startup: failed to apply remote KOSync progress (${message})`);
          }
        }

        const resizeObserver = new ResizeObserver(() => {
          view.dispatchEvent(new Event("resize"));
        });
        resizeObserver.observe(container);
        teardownResizeObserver = () => resizeObserver.disconnect();

        const viewportSnapshot = await ensureVisibleContent(
          view,
          container,
          tocEntries,
          logDiagnostic,
        );
        if (viewportSnapshot.visibleCharacters <= 0) {
          throw new Error("Foliate did not render visible book content.");
        }
        logDiagnostic(`startup: viewport snapshot ${JSON.stringify(viewportSnapshot)}`);

        patchState({
          currentChapterLabel: stateRef.current.currentChapterLabel ?? tocEntries[0]?.label ?? null,
          currentHref: stateRef.current.currentHref ?? tocEntries[0]?.href ?? null,
          errorMessage: null,
          isReady: true,
          progressFraction: stateRef.current.progressFraction ?? 0,
          status: "",
          tocEntries,
        });
        logDiagnostic(`startup: reader ready (${title}) with ${tocEntries.length} toc entries`);

        testBridgeRef.current?.onReady?.({
          getState: () => stateRef.current,
          getVisibleText: () => getVisibleText(viewRef.current),
          getViewportSnapshot: () => getViewportSnapshot(containerRef.current, viewRef.current),
          goNext: () => turnPage("next"),
          goPrev: () => turnPage("prev"),
          jumpToChapter,
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to open this EPUB.";
        patchState({
          currentChapterLabel: null,
          currentHref: null,
          errorMessage: message,
          isReady: false,
          progressFraction: null,
          status: "Failed to open book",
          tocEntries: [],
        });
        logDiagnostic(`error: ${message}`);
      }
    }

    void mountReader();

    return () => {
      isCancelled = true;
      teardownResizeObserver?.();
      teardownImageTapListeners?.();
      removeRelocateListener?.();
      viewRef.current?.remove();
      viewRef.current = null;
      testBridgeRef.current?.onDispose?.();
      logDiagnostic("shutdown: reader disposed");
    };
  }, [bookTitle, initialCfi, jumpToChapter, logDiagnostic, patchState, turnPage]);

  useEffect(() => {
    viewRef.current?.renderer?.setStyles?.(buildFoliateInjectedCss(fontScale));
  }, [fontScale]);

  const progressPercent =
    typeof state.progressFraction === "number" ? Math.round(state.progressFraction * 100) : null;

  return (
    <div style={styles.screen}>
      <div style={styles.controlBar}>
        <div style={styles.progressText}>
          {progressPercent == null ? "Loading…" : `${progressPercent}% read`}
        </div>
        <button
          type="button"
          onClick={() => setShowToc((current) => !current)}
          style={styles.tocToggle}
        >
          {showToc ? "Hide chapters" : "Chapters"}
        </button>
        <div style={styles.fontControls} aria-label="Reader font scale controls">
          <button
            type="button"
            aria-label="Decrease font size"
            disabled={fontScale <= MIN_FONT_SCALE}
            onClick={() => updateFontScale(fontScale - FONT_SCALE_STEP)}
            style={{
              ...styles.fontButton,
              ...(fontScale <= MIN_FONT_SCALE ? styles.fontButtonDisabled : null),
            }}
          >
            A-
          </button>
          <button
            type="button"
            aria-label="Reset font size"
            onClick={() => updateFontScale(1)}
            style={styles.fontScaleText}
          >
            {Math.round(fontScale * 100)}%
          </button>
          <button
            type="button"
            aria-label="Increase font size"
            disabled={fontScale >= MAX_FONT_SCALE}
            onClick={() => updateFontScale(fontScale + FONT_SCALE_STEP)}
            style={{
              ...styles.fontButton,
              ...(fontScale >= MAX_FONT_SCALE ? styles.fontButtonDisabled : null),
            }}
          >
            A+
          </button>
        </div>
      </div>

      <div data-testid="foliate-reader-viewport" ref={containerRef} style={styles.readerViewport} />

      {showToc ? (
        <>
          <button
            type="button"
            aria-label="Close chapters"
            onClick={() => setShowToc(false)}
            style={styles.backdrop}
          />
          <aside style={styles.tocSheet}>
            <div style={styles.tocSheetHeader}>
              <div style={styles.tocSheetTitle}>Chapters</div>
              <button type="button" onClick={() => setShowToc(false)} style={styles.tocToggle}>
                Close
              </button>
            </div>
            <div style={styles.tocSheetBody}>
              {state.tocEntries.length > 0 ? (
                state.tocEntries.map((entry, index) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => void jumpToChapter(index)}
                    style={{
                      ...styles.tocItem,
                      paddingLeft: `${16 + entry.depth * 14}px`,
                    }}
                  >
                    {entry.label}
                  </button>
                ))
              ) : (
                <div style={styles.emptyToc}>This book does not expose a table of contents.</div>
              )}
            </div>
          </aside>
        </>
      ) : null}

      {activeImage ? <ImageLightbox image={activeImage} onClose={() => setActiveImage(null)} /> : null}
    </div>
  );
}

function ImageLightbox({ image, onClose }: { image: ActiveReaderImage; onClose: () => void }) {
  const pointersRef = useRef(new Map<number, GesturePoint>());
  const gestureRef = useRef<ImageViewerGesture | null>(null);
  const [transform, setTransform] = useState<ImageViewerTransform>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const resetTransform = useCallback(() => {
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      const points = Array.from(pointersRef.current.values());
      if (points.length >= 2) {
        const [first, second] = points;
        gestureRef.current = {
          initialDistance: getDistance(first, second),
          initialMidpoint: getMidpoint(first, second),
          initialScale: transform.scale,
          initialTranslateX: transform.translateX,
          initialTranslateY: transform.translateY,
          panStartX: event.clientX,
          panStartY: event.clientY,
          panTranslateX: transform.translateX,
          panTranslateY: transform.translateY,
        };
        return;
      }

      gestureRef.current = {
        initialDistance: 0,
        initialMidpoint: { x: event.clientX, y: event.clientY },
        initialScale: transform.scale,
        initialTranslateX: transform.translateX,
        initialTranslateY: transform.translateY,
        panStartX: event.clientX,
        panStartY: event.clientY,
        panTranslateX: transform.translateX,
        panTranslateY: transform.translateY,
      };
    },
    [transform],
  );

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }

    event.preventDefault();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const gesture = gestureRef.current;
    const points = Array.from(pointersRef.current.values());
    if (!gesture || points.length === 0) {
      return;
    }

    if (points.length >= 2 && gesture.initialDistance > 0) {
      const [first, second] = points;
      const midpoint = getMidpoint(first, second);
      const nextScale = clampImageScale(
        gesture.initialScale * (getDistance(first, second) / gesture.initialDistance),
      );

      setTransform({
        scale: nextScale,
        translateX: gesture.initialTranslateX + midpoint.x - gesture.initialMidpoint.x,
        translateY: gesture.initialTranslateY + midpoint.y - gesture.initialMidpoint.y,
      });
      return;
    }

    const point = points[0];
    setTransform((current) => {
      if (current.scale <= 1) {
        return current;
      }

      return {
        ...current,
        translateX: gesture.panTranslateX + point.x - gesture.panStartX,
        translateY: gesture.panTranslateY + point.y - gesture.panStartY,
      };
    });
  }, []);

  const handlePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const points = Array.from(pointersRef.current.values());
    setTransform((current) => {
      const nextScale = clampImageScale(current.scale);
      const nextTransform =
        nextScale <= 1
          ? { scale: 1, translateX: 0, translateY: 0 }
          : { ...current, scale: nextScale };

      if (points.length === 1) {
        const [point] = points;
        gestureRef.current = {
          initialDistance: 0,
          initialMidpoint: point,
          initialScale: nextTransform.scale,
          initialTranslateX: nextTransform.translateX,
          initialTranslateY: nextTransform.translateY,
          panStartX: point.x,
          panStartY: point.y,
          panTranslateX: nextTransform.translateX,
          panTranslateY: nextTransform.translateY,
        };
      } else {
        gestureRef.current = null;
      }

      return nextTransform;
    });
  }, []);

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setTransform((current) => {
      const nextScale = clampImageScale(current.scale + (event.deltaY < 0 ? 0.2 : -0.2));
      return nextScale <= 1
        ? { scale: 1, translateX: 0, translateY: 0 }
        : { ...current, scale: nextScale };
    });
  }, []);

  return (
    <div aria-modal="true" role="dialog" style={styles.imageLightbox}>
      <button aria-label="Close image" onClick={onClose} style={styles.imageLightboxBackdrop} />
      <div style={styles.imageLightboxHeader}>
        <button type="button" onClick={onClose} style={styles.imageLightboxButton}>
          Close
        </button>
        <button type="button" onClick={resetTransform} style={styles.imageLightboxButton}>
          Reset
        </button>
      </div>
      <div
        onDoubleClick={resetTransform}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onWheel={handleWheel}
        style={styles.imageLightboxStage}
      >
        <img
          alt={image.alt}
          draggable={false}
          src={image.src}
          style={{
            ...styles.imageLightboxImage,
            transform: `translate3d(${transform.translateX}px, ${transform.translateY}px, 0) scale(${transform.scale})`,
          }}
        />
      </div>
    </div>
  );
}

function installImageTapListeners(
  view: FoliateViewElement,
  onOpenImage: (image: ActiveReaderImage) => void,
) {
  const teardownByDocument = new Map<Document, () => void>();

  const attachDocument = (doc: Document | null | undefined) => {
    if (!doc || teardownByDocument.has(doc)) {
      return;
    }

    let pointerStart: GesturePoint | null = null;
    let lastOpenAt = 0;

    const openFromEvent = (event: Event) => {
      const image = getImageElementFromEventTarget(event.target);

      if (!image) {
        return;
      }

      const src = image.currentSrc || image.src;
      if (!src) {
        return;
      }

      const now = Date.now();
      if (now - lastOpenAt < 350) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      lastOpenAt = now;
      event.preventDefault();
      event.stopPropagation();
      onOpenImage({
        alt: image.alt || "Book image",
        height: image.naturalHeight || null,
        src,
        width: image.naturalWidth || null,
      });
    };

    const handleClick = (event: MouseEvent) => {
      openFromEvent(event);
    };

    const handlePointerDown = (event: PointerEvent) => {
      pointerStart = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (
        pointerStart &&
        Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 12
      ) {
        return;
      }

      openFromEvent(event);
    };

    doc.addEventListener("click", handleClick, true);
    doc.addEventListener("pointerdown", handlePointerDown, true);
    doc.addEventListener("pointerup", handlePointerUp, true);
    teardownByDocument.set(doc, () => {
      doc.removeEventListener("click", handleClick, true);
      doc.removeEventListener("pointerdown", handlePointerDown, true);
      doc.removeEventListener("pointerup", handlePointerUp, true);
    });
  };

  const attachLoadedDocuments = () => {
    for (const content of view.renderer?.getContents?.() ?? []) {
      attachDocument(content.doc);
    }
  };

  const handleLoad = (event: Event) => {
    const detail = (event as CustomEvent<{ doc?: Document | null }>).detail;
    attachDocument(detail?.doc);
    attachLoadedDocuments();
  };

  view.addEventListener("load", handleLoad as EventListener);
  attachLoadedDocuments();

  return () => {
    view.removeEventListener("load", handleLoad as EventListener);
    for (const teardown of teardownByDocument.values()) {
      teardown();
    }
    teardownByDocument.clear();
  };
}

function getImageElementFromEventTarget(target: EventTarget | null) {
  if (!target || !("nodeType" in target)) {
    return null;
  }

  const node = target as Node;
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const image = element?.closest?.("img");

  if (!image || image.tagName.toLowerCase() !== "img") {
    return null;
  }

  return image as HTMLImageElement;
}

function clampImageScale(scale: number) {
  if (!Number.isFinite(scale)) {
    return 1;
  }

  return Math.min(Math.max(scale, 1), 5);
}

function getDistance(first: GesturePoint, second: GesturePoint) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function getMidpoint(first: GesturePoint, second: GesturePoint) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function clampFontScale(fontScale: number) {
  if (!Number.isFinite(fontScale)) {
    return 1;
  }

  return Math.round(Math.min(Math.max(fontScale, MIN_FONT_SCALE), MAX_FONT_SCALE) * 100) / 100;
}

async function createBookFile(payload: string | Uint8Array | ArrayBuffer, bookTitle: string) {
  const bytes =
    typeof payload === "string"
      ? decodeBase64(payload)
      : payload instanceof Uint8Array
        ? payload
        : new Uint8Array(payload);
  const fileBytes = new Uint8Array(bytes.byteLength);
  fileBytes.set(bytes);

  return new File([fileBytes], `${sanitizeFilename(bookTitle || "book")}.epub`, {
    type: "application/epub+zip",
  });
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function sanitizeFilename(value: string) {
  return (
    value
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "book"
  );
}

function normalizeLabel(value: string | Record<string, string> | undefined | null) {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  const firstKey = Object.keys(value)[0];
  return firstKey ? (value[firstKey] ?? null) : null;
}

function getXPointerFromCfi(
  view: FoliateViewElement,
  cfi: string,
  logDiagnostic: (message: string) => void,
) {
  try {
    const spineIndex = XCFI.extractSpineIndex(cfi);
    const content = view.renderer
      ?.getContents?.()
      .find((item) => item.index === spineIndex && item.doc);

    if (!content?.doc) {
      logDiagnostic(`kosync: missing loaded section document for CFI spine ${spineIndex}`);
      return undefined;
    }

    const xpointer = new XCFI(content.doc, spineIndex).cfiToXPointer(cfi).xpointer;
    logDiagnostic(`kosync: converted CFI to XPointer ${xpointer}`);
    return xpointer;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    logDiagnostic(`kosync: failed to convert CFI to XPointer (${message})`);
    return undefined;
  }
}

async function getCfiFromXPointer(view: FoliateViewElement, xpointer: string) {
  const spineIndex = XCFI.extractSpineIndex(xpointer);
  const loadedContent = view.renderer
    ?.getContents?.()
    .find((item) => item.index === spineIndex && item.doc);
  const doc = loadedContent?.doc ?? (await view.book?.sections?.[spineIndex]?.createDocument?.());

  if (!doc) {
    throw new Error("Could not load section document for remote progress.");
  }

  return new XCFI(doc, spineIndex).xPointerToCFI(xpointer);
}

function flattenToc(items: FoliateBook["toc"] = [], depth = 0): TocEntry[] {
  return items.flatMap((item, index) => {
    const label = normalizeLabel(item.label) ?? "Untitled chapter";
    const href = item.href ?? "";
    const id = `${depth}-${index}-${href || label}`;
    return [{ depth, href, id, label }, ...flattenToc(item.subitems ?? [], depth + 1)];
  });
}

function findChapterLabel(entries: TocEntry[], href: string | null) {
  if (!href) {
    return null;
  }
  return entries.find((entry) => entry.href === href)?.label ?? null;
}

function findChapterLabelForSection(entries: TocEntry[], href: string | null) {
  if (!href) {
    return null;
  }
  return entries.find((entry) => entry.href.split("#")[0] === href)?.label ?? null;
}

function getSectionHref(view: FoliateViewElement | null, index: number | undefined) {
  if (index == null) {
    return null;
  }
  const sections = view?.book?.sections;
  return sections?.[index]?.id ?? null;
}

function getViewportSnapshot(container: HTMLDivElement | null, view: FoliateViewElement | null) {
  const containerRect = container?.getBoundingClientRect();
  const viewRect = view?.getBoundingClientRect();
  const visibleText = getVisibleText(view);
  const contentCount = view?.renderer?.getContents?.().length ?? 0;

  return {
    containerHeight: Math.floor(containerRect?.height ?? 0),
    containerWidth: Math.floor(containerRect?.width ?? 0),
    contentCount,
    viewHeight: Math.floor(viewRect?.height ?? 0),
    viewWidth: Math.floor(viewRect?.width ?? 0),
    visibleCharacters: visibleText.characters,
  };
}

function waitForFoliateInitialDisplay(view: FoliateViewElement, timeoutMs = 2500) {
  return new Promise<void>((resolve, reject) => {
    let isSettled = false;

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for foliate to render the initial section."));
    }, timeoutMs);

    const settle = () => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      cleanup();
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    };

    const handleLoad = () => settle();
    const handleRelocate = () => settle();

    const cleanup = () => {
      window.clearTimeout(timeout);
      view.removeEventListener("load", handleLoad as EventListener);
      view.removeEventListener("relocate", handleRelocate as EventListener);
    };

    view.addEventListener("load", handleLoad as EventListener);
    view.addEventListener("relocate", handleRelocate as EventListener);
  });
}

async function waitForViewport(element: HTMLDivElement, timeoutMs = 2500) {
  const rect = element.getBoundingClientRect();

  if (rect.width > 0 && rect.height > 0) {
    return {
      height: Math.floor(rect.height),
      width: Math.floor(rect.width),
    };
  }

  return await new Promise<{ height: number; width: number }>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error("Foliate reader viewport never received a usable size."));
    }, timeoutMs);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const nextRect = entry?.contentRect;

      if (!nextRect || nextRect.width <= 0 || nextRect.height <= 0) {
        return;
      }

      window.clearTimeout(timeout);
      observer.disconnect();
      resolve({
        height: Math.floor(nextRect.height),
        width: Math.floor(nextRect.width),
      });
    });

    observer.observe(element);
  });
}

async function ensureVisibleContent(
  view: FoliateViewElement,
  container: HTMLDivElement,
  tocEntries: TocEntry[],
  logDiagnostic: (message: string) => void,
) {
  let snapshot = getViewportSnapshot(container, view);
  if (snapshot.visibleCharacters > 0) {
    return snapshot;
  }

  const candidateHrefs = Array.from(
    new Set(tocEntries.map((entry) => entry.href).filter(Boolean)),
  ).slice(0, 6);

  for (const href of candidateHrefs) {
    logDiagnostic(`startup: fallback navigation to ${href}`);
    const waitForDisplay = waitForFoliateInitialDisplay(view);
    await view.goTo(href);
    await waitForDisplay;
    snapshot = getViewportSnapshot(container, view);
    if (snapshot.visibleCharacters > 0) {
      return snapshot;
    }
  }

  return snapshot;
}

function getVisibleText(view: FoliateViewElement | null) {
  const contents = view?.renderer?.getContents?.() ?? [];
  let characters = 0;
  const snippets: string[] = [];

  for (const entry of contents) {
    const body = entry.doc?.body;

    if (!body) {
      continue;
    }

    const text = body.textContent?.replace(/\s+/g, " ").trim() ?? "";

    if (!text) {
      continue;
    }

    characters += text.length;

    if (snippets.length < 3) {
      snippets.push(text.slice(0, 80));
    }
  }

  return { characters, snippets };
}

const styles: Record<string, CSSProperties> = {
  screen: {
    background: "#020617",
    color: "#e2e8f0",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  controlBar: {
    alignItems: "center",
    background: "#020617",
    display: "flex",
    flexShrink: 0,
    gap: "10px",
    justifyContent: "space-between",
    minHeight: "52px",
    padding: "8px 16px",
    zIndex: 2,
  },
  tocToggle: {
    background: "rgba(15, 23, 42, 0.88)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "999px",
    color: "#e2e8f0",
    cursor: "pointer",
    padding: "10px 14px",
    pointerEvents: "auto",
  },
  fontControls: {
    alignItems: "center",
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "999px",
    display: "flex",
    overflow: "hidden",
    pointerEvents: "auto",
  },
  fontButton: {
    background: "transparent",
    border: 0,
    color: "#e2e8f0",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 800,
    minWidth: "42px",
    padding: "10px 8px",
  },
  fontButtonDisabled: {
    color: "#475569",
    cursor: "default",
  },
  fontScaleText: {
    background: "rgba(2, 6, 23, 0.32)",
    border: 0,
    borderLeft: "1px solid rgba(148, 163, 184, 0.14)",
    borderRight: "1px solid rgba(148, 163, 184, 0.14)",
    color: "#bae6fd",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 800,
    minWidth: "52px",
    padding: "10px 8px",
  },
  progressText: {
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: 600,
    pointerEvents: "auto",
    whiteSpace: "nowrap",
  },
  tocSheet: {
    background: "rgba(2, 6, 23, 0.96)",
    borderTop: "1px solid rgba(148, 163, 184, 0.18)",
    bottom: 0,
    boxShadow: "0 -18px 40px rgba(2, 6, 23, 0.48)",
    display: "flex",
    flexDirection: "column",
    left: 0,
    maxHeight: "72vh",
    position: "absolute",
    right: 0,
    zIndex: 3,
  },
  tocSheetHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    padding: "14px 16px 12px",
  },
  tocSheetTitle: {
    color: "#f8fafc",
    fontSize: "16px",
    fontWeight: 700,
  },
  tocSheetBody: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    overflow: "auto",
    padding: "0 10px 14px",
  },
  tocItem: {
    background: "transparent",
    border: 0,
    borderRadius: "12px",
    color: "#e2e8f0",
    cursor: "pointer",
    padding: "10px 12px",
    textAlign: "left",
  },
  emptyToc: {
    color: "#94a3b8",
    padding: "12px",
  },
  backdrop: {
    background: "rgba(2, 6, 23, 0.18)",
    border: 0,
    inset: 0,
    position: "absolute",
    zIndex: 1,
  },
  imageLightbox: {
    background: "rgba(2, 6, 23, 0.94)",
    inset: 0,
    overflow: "hidden",
    position: "absolute",
    zIndex: 5,
  },
  imageLightboxBackdrop: {
    background: "transparent",
    border: 0,
    inset: 0,
    padding: 0,
    position: "absolute",
    zIndex: 0,
  },
  imageLightboxButton: {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: "999px",
    color: "#e2e8f0",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 800,
    padding: "10px 14px",
  },
  imageLightboxHeader: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    left: 0,
    padding: "14px 16px",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
  imageLightboxImage: {
    maxHeight: "86vh",
    maxWidth: "92vw",
    objectFit: "contain",
    touchAction: "none",
    transformOrigin: "center center",
    transition: "transform 80ms linear",
    userSelect: "none",
    willChange: "transform",
  },
  imageLightboxStage: {
    alignItems: "center",
    cursor: "grab",
    display: "flex",
    height: "100%",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    touchAction: "none",
    width: "100%",
    zIndex: 1,
  },
  readerViewport: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
};
