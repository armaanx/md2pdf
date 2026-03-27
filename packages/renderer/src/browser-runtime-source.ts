export const browserRuntimeSource = String.raw`
(() => {
  const runtimeWindow = window;
  const mermaidApi = runtimeWindow.mermaid;

  if (!mermaidApi) {
    runtimeWindow.__PDF_ERROR__ = {
      code: "runtime_missing",
      message: "Renderer runtime libraries failed to load."
    };
    return;
  }

  function readCssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function hexToRgb(hex) {
    const normalized = hex.replace("#", "");
    return {
      r: Number.parseInt(normalized.slice(0, 2), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      b: Number.parseInt(normalized.slice(4, 6), 16)
    };
  }

  function getRelativeLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const channels = [r, g, b].map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function getThemePalette() {
    return {
      sheetBg: readCssVar("--sheet-bg", "#ffffff"),
      pageBg: readCssVar("--page-bg", "#edf2f7"),
      text: readCssVar("--text", "#132238"),
      line: readCssVar("--line", "#d9e2ec"),
      accent: readCssVar("--accent", "#12677c"),
      accentSoft: readCssVar("--accent-soft", "#e3f2f3"),
      blockquoteBg: readCssVar("--blockquote-bg", "#f7fbfc"),
      fontBody: readCssVar("--font-body", "Manrope, sans-serif")
    };
  }

  function initializeMermaid(themePalette) {
    mermaidApi.initialize({
      startOnLoad: false,
      theme: "base",
      securityLevel: "strict",
      darkMode: getRelativeLuminance(themePalette.sheetBg) < 0.45,
      themeVariables: {
        background: themePalette.sheetBg,
        mainBkg: themePalette.accentSoft,
        secondBkg: themePalette.blockquoteBg,
        tertiaryColor: themePalette.sheetBg,
        primaryColor: themePalette.accentSoft,
        primaryTextColor: themePalette.text,
        primaryBorderColor: themePalette.accent,
        secondaryColor: themePalette.blockquoteBg,
        secondaryTextColor: themePalette.text,
        secondaryBorderColor: themePalette.line,
        tertiaryTextColor: themePalette.text,
        tertiaryBorderColor: themePalette.line,
        lineColor: themePalette.accent,
        textColor: themePalette.text,
        nodeTextColor: themePalette.text,
        edgeLabelBackground: themePalette.sheetBg,
        clusterBkg: themePalette.blockquoteBg,
        clusterBorder: themePalette.line,
        defaultLinkColor: themePalette.accent,
        titleColor: themePalette.text,
        actorBorder: themePalette.accent,
        actorBkg: themePalette.accentSoft,
        actorTextColor: themePalette.text,
        actorLineColor: themePalette.accent,
        signalColor: themePalette.text,
        signalTextColor: themePalette.text,
        labelBoxBkgColor: themePalette.sheetBg,
        labelBoxBorderColor: themePalette.line,
        labelTextColor: themePalette.text,
        loopTextColor: themePalette.text,
        noteBkgColor: themePalette.blockquoteBg,
        noteBorderColor: themePalette.line,
        noteTextColor: themePalette.text,
        fontFamily: themePalette.fontBody
      },
      flowchart: {
        curve: "basis",
        htmlLabels: true
      },
      sequence: {
        actorFontFamily: themePalette.fontBody,
        messageFontFamily: themePalette.fontBody,
        noteFontFamily: themePalette.fontBody
      }
    });
  }

  function applyMermaidSvgTheme(svg, themePalette) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent =
      ".label, .label text, .nodeLabel, .edgeLabel text, .cluster-label text, text, tspan {" +
      "fill: " + themePalette.text + " !important;" +
      "color: " + themePalette.text + " !important;" +
      "}" +
      ".node rect, .node circle, .node ellipse, .node polygon, .node path, .actor {" +
      "stroke: " + themePalette.accent + " !important;" +
      "}" +
      ".edgePath path, .flowchart-link, .messageLine0, .messageLine1, .loopLine {" +
      "stroke: " + themePalette.accent + " !important;" +
      "}" +
      ".marker path, .arrowheadPath, marker path {" +
      "fill: " + themePalette.accent + " !important;" +
      "stroke: " + themePalette.accent + " !important;" +
      "}" +
      ".cluster rect, .cluster polygon {" +
      "fill: " + themePalette.blockquoteBg + " !important;" +
      "stroke: " + themePalette.line + " !important;" +
      "}" +
      ".edgeLabel rect, .labelBkg {" +
      "fill: " + themePalette.sheetBg + " !important;" +
      "opacity: 0.96 !important;" +
      "}" +
      ".note {" +
      "fill: " + themePalette.blockquoteBg + " !important;" +
      "stroke: " + themePalette.line + " !important;" +
      "}";
    svg.prepend(style);
  }

  async function waitForImages(root) {
    const images = Array.from(root.querySelectorAll("img"));

    await Promise.all(
      images.map(
        (image) =>
          new Promise((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }

            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          })
      )
    );
  }

  async function render() {
    const content = document.getElementById("content");
    const themePalette = getThemePalette();

    if (!content) {
      throw new Error("Renderer content container is missing.");
    }

    initializeMermaid(themePalette);

    const mermaidBlocks = Array.from(content.querySelectorAll("pre > code.language-mermaid"));

    for (const [index, block] of mermaidBlocks.entries()) {
      const definition = block.textContent ?? "";

      try {
        await mermaidApi.parse(definition, { suppressErrors: false });
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Mermaid diagram is invalid."
        );
      }

      const pre = block.parentElement;

      if (!pre) {
        continue;
      }

      const container = document.createElement("div");
      container.className = "mermaid-card";
      const target = document.createElement("div");
      target.className = "mermaid";
      container.appendChild(target);
      pre.replaceWith(container);

      const renderResult = await mermaidApi.render(
        "mermaid-" + index + "-" + Math.random().toString(36).slice(2),
        definition
      );

      target.innerHTML = renderResult.svg;
      const svg = target.querySelector("svg");

      if (svg instanceof SVGElement) {
        applyMermaidSvgTheme(svg, themePalette);
      }
    }

    await document.fonts.ready;
    await waitForImages(content);
    runtimeWindow.__PDF_READY__ = true;
  }

  render().catch((error) => {
    const content = document.getElementById("content");

    if (content) {
      content.innerHTML =
        '<div class="render-error">' +
        String(error instanceof Error ? error.message : "Rendering failed.") +
        "</div>";
    }

    runtimeWindow.__PDF_ERROR__ = {
      code: "render_failed",
      message: error instanceof Error ? error.message : "Rendering failed."
    };
  });
})();
`;
