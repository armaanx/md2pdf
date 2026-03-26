export const browserRuntimeSource = String.raw`
(() => {
  const runtimeWindow = window;
  const markedApi = runtimeWindow.marked;
  const mermaidApi = runtimeWindow.mermaid;

  if (!markedApi || !mermaidApi) {
    runtimeWindow.__PDF_ERROR__ = {
      code: "runtime_missing",
      message: "Renderer runtime libraries failed to load."
    };
    return;
  }

  markedApi.setOptions({
    gfm: true,
    breaks: false
  });

  mermaidApi.initialize({
    startOnLoad: false,
    theme: "base",
    securityLevel: "strict",
    themeVariables: {
      primaryColor: "#d7eef1",
      primaryTextColor: "#0f2d3a",
      primaryBorderColor: "#12677c",
      lineColor: "#35556a",
      secondaryColor: "#eaf6f8",
      tertiaryColor: "#ffffff",
      clusterBkg: "#f7fbfc",
      clusterBorder: "#c8dbe2",
      fontFamily: "Manrope"
    },
    flowchart: {
      curve: "basis",
      htmlLabels: true
    },
    sequence: {
      actorFontFamily: "Manrope",
      messageFontFamily: "Manrope",
      noteFontFamily: "Manrope"
    }
  });

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
    const markdown = runtimeWindow.__MD2PDF_INPUT__?.markdown ?? "";

    if (!content) {
      throw new Error("Renderer content container is missing.");
    }

    content.innerHTML = markedApi.parse(markdown);

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
