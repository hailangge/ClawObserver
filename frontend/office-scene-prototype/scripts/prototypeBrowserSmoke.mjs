import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { inflateSync } from "node:zlib";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const defaultFixturePath = path.resolve(repoRoot, "tmp/realtime-mixed-fixture.json");
const defaultPrototypeScreenshotPath = path.resolve(repoRoot, "tmp/prototype-browser-smoke.png");
const defaultRealtimeScreenshotPath = path.resolve(repoRoot, "tmp/realtime-browser-smoke.png");
const MIN_BRIGHT_PIXELS = 2500;
const MIN_DARK_PIXELS = 2500;
const MIN_MID_VARIANCE_PIXELS = 22000;
const MIN_UNIQUE_BUCKETS = 150;
const MAX_DOMINANT_BUCKET_RATIO = 0.72;
const MIN_LUMA_SPREAD = 90;
const MIN_SCENE_CANVAS_WIDTH = 980;
const MIN_SCENE_CANVAS_HEIGHT = 640;
const MIN_SUMMARY_WIDTH_RATIO = 0.72;
const MIN_SCENE_FIT_MARGIN = 0.018;
const MIN_LABEL_FIT_MARGIN = 0.03;
const REQUIRED_DESK_COUNT = 12;
const MAX_IDLE_ANIMATION_FRAMES = 8;
const REQUIRED_LABEL_LAYER_MODE = "elevated-forward-billboard";
const REQUIRED_LABEL_PLATE_MODE = "opaque-high-contrast";
const REQUIRED_DESK_STRUCTURE_VISUAL_MODE = "opaque";
const REQUIRED_OVERHEAD_SIGHTLINE_MODE = "clear-back-row";
const REQUIRED_OFFICE_ASSET_REQUESTS = [
  "/assets/prototype/office-assets/kenney/models/desk.obj",
  "/assets/prototype/office-assets/kenney/models/chairDesk.obj",
  "/assets/prototype/office-assets/kenney/models/computerScreen.obj",
  "/assets/prototype/office-assets/kenney/models/computerKeyboard.obj",
  "/assets/prototype/office-assets/kenney/models/computerMouse.obj",
  "/assets/prototype/office-assets/kenney/models/pottedPlant.obj",
  "/assets/prototype/office-assets/kenney/models/tableCoffee.obj",
  "/assets/prototype/office-assets/kenney/models/bookcaseOpen.obj",
  "/assets/prototype/office-assets/kenney/models/books.obj",
];

function resolveBrowserExecutable() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? undefined;
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }

  throw new Error(`Timed out waiting for ${url}: ${String(lastError)}`);
}

async function closeServer(server) {
  if (!server || server.exitCode !== null) {
    return;
  }

  server.kill("SIGTERM");
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 2000);
    server.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function analyzePng(pngBuffer) {
  const signature = pngBuffer.subarray(0, 8);
  const expectedSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!signature.equals(expectedSignature)) {
    throw new Error("Smoke screenshot is not a PNG");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < pngBuffer.length) {
    const length = pngBuffer.readUInt32BE(offset);
    const type = pngBuffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = pngBuffer.subarray(dataStart, dataEnd);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth} colorType=${colorType}`);
  }

  const compressed = Buffer.concat(idatChunks);
  const inflated = inflateSync(compressed);
  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const bytesPerScanline = stride + 1;
  const reconstructed = Buffer.alloc(width * height * bytesPerPixel);
  const prior = Buffer.alloc(stride);
  const current = Buffer.alloc(stride);

  const paethPredictor = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) {
      return a;
    }
    if (pb <= pc) {
      return b;
    }
    return c;
  };

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * bytesPerScanline;
    const filterType = inflated[rowStart];
    const filtered = inflated.subarray(rowStart + 1, rowStart + 1 + stride);

    for (let i = 0; i < stride; i += 1) {
      const left = i >= 4 ? current[i - 4] : 0;
      const up = prior[i];
      const upLeft = i >= 4 ? prior[i - 4] : 0;
      let value = filtered[i];

      if (filterType === 1) {
        value = (value + left) & 0xff;
      } else if (filterType === 2) {
        value = (value + up) & 0xff;
      } else if (filterType === 3) {
        value = (value + Math.floor((left + up) / 2)) & 0xff;
      } else if (filterType === 4) {
        value = (value + paethPredictor(left, up, upLeft)) & 0xff;
      } else if (filterType !== 0) {
        throw new Error(`Unsupported PNG filter type: ${filterType}`);
      }

      current[i] = value;
    }

    current.copy(reconstructed, y * stride);
    current.copy(prior);
  }

  const centerLeft = Math.floor(width * 0.12);
  const centerRight = Math.ceil(width * 0.88);
  const centerTop = Math.floor(height * 0.12);
  const centerBottom = Math.ceil(height * 0.72);
  let brightPixels = 0;
  let darkPixels = 0;
  let midVariancePixels = 0;
  let minLuma = Number.POSITIVE_INFINITY;
  let maxLuma = Number.NEGATIVE_INFINITY;
  const buckets = new Map();

  for (let y = centerTop; y < centerBottom; y += 1) {
    for (let x = centerLeft; x < centerRight; x += 1) {
      const idx = (y * width + x) * bytesPerPixel;
      const r = reconstructed[idx];
      const g = reconstructed[idx + 1];
      const b = reconstructed[idx + 2];
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const channelSpread = Math.max(r, g, b) - Math.min(r, g, b);
      const bucketKey = `${r >> 4}-${g >> 4}-${b >> 4}`;

      buckets.set(bucketKey, (buckets.get(bucketKey) ?? 0) + 1);
      minLuma = Math.min(minLuma, luma);
      maxLuma = Math.max(maxLuma, luma);

      if (luma >= 148 || channelSpread >= 82) {
        brightPixels += 1;
      }
      if (luma <= 44) {
        darkPixels += 1;
      }
      if (luma >= 56 && luma <= 210 && channelSpread >= 20) {
        midVariancePixels += 1;
      }
    }
  }

  const bucketCounts = [...buckets.values()];
  const dominantBucketRatio =
    bucketCounts.length > 0
      ? Math.max(...bucketCounts) / bucketCounts.reduce((sum, count) => sum + count, 0)
      : 1;

  return {
    width,
    height,
    brightPixels,
    darkPixels,
    midVariancePixels,
    uniqueBuckets: buckets.size,
    dominantBucketRatio,
    lumaSpread:
      Number.isFinite(minLuma) && Number.isFinite(maxLuma)
        ? maxLuma - minLuma
        : 0,
  };
}

function startServer({ host, port, fixturePath }) {
  const server = spawn("python", ["-m", "clawobserver", "serve"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      CLAWOBSERVER_HOST: host,
      CLAWOBSERVER_PORT: String(port),
      CLAWOBSERVER_RUNTIME_JSON: fixturePath,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  server.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  return { server, stdoutRef: () => stdout, stderrRef: () => stderr };
}

function collectConsoleProblems(consoleMessages) {
  return {
    consoleErrors: consoleMessages.filter((message) => message.type === "error"),
    unexpectedWarnings: consoleMessages.filter(
      (message) =>
        message.type === "warning" &&
        !message.text.includes("GPU stall due to ReadPixels"),
    ),
    unexpectedDebugLogs: consoleMessages.filter(
      (message) =>
        message.type === "debug" &&
        !message.text.startsWith("unsupported GPOS table LookupType") &&
        !message.text.startsWith("unsupported GSUB table LookupType"),
    ),
  };
}

async function openAndInspectPage(page, url, sceneSelector, screenshotPath, evaluator, sceneKind) {
  const consoleMessages = [];
  const pageErrors = [];
  const failedRequests = [];
  const successfulRequests = [];
  const requestCounts = new Map();

  await page.addInitScript(() => {
    const originalRequestAnimationFrame = window.requestAnimationFrame.bind(window);
    const originalCancelAnimationFrame = window.cancelAnimationFrame.bind(window);
    let totalAnimationFrames = 0;
    let settledAnimationFrames = 0;
    let settleTimestampMs = 0;

    window.__clawObserverPerformance = {
      markSettled() {
        settleTimestampMs = performance.now();
        settledAnimationFrames = totalAnimationFrames;
      },
      getMetrics() {
        return {
          totalAnimationFrames,
          settledAnimationFrames,
          postSettleAnimationFrames: Math.max(totalAnimationFrames - settledAnimationFrames, 0),
          settleTimestampMs,
        };
      },
    };

    window.requestAnimationFrame = (callback) =>
      originalRequestAnimationFrame((timestamp) => {
        totalAnimationFrames += 1;
        callback(timestamp);
      });
    window.cancelAnimationFrame = (handle) => originalCancelAnimationFrame(handle);
  });

  page.on("console", (message) => {
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
    });
  });
  page.on("pageerror", (error) => {
    pageErrors.push(String(error));
  });
  page.on("response", (response) => {
    const responseUrl = response.url();
    requestCounts.set(responseUrl, (requestCounts.get(responseUrl) ?? 0) + 1);
    if (response.status() >= 400) {
      failedRequests.push({
        url: responseUrl,
        status: response.status(),
      });
      return;
    }
    successfulRequests.push({
      url: responseUrl,
      status: response.status(),
    });
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForSelector(`${sceneSelector} canvas`, { timeout: 10000 });
  await waitForSceneSemantics(page, sceneKind);
  await page.evaluate(() => {
    window.__clawObserverPerformance?.markSettled?.();
  });
  await page.waitForTimeout(1800);

  const sceneMetrics = await page.evaluate(evaluator);
  await fs.promises.mkdir(path.dirname(screenshotPath), { recursive: true });
  await page.waitForSelector(sceneSelector, { state: "visible", timeout: 10000 });
  await page.locator(sceneSelector).first().screenshot({ path: screenshotPath });
  const screenshotBuffer = await fs.promises.readFile(screenshotPath);
  const screenshotMetrics = analyzePng(screenshotBuffer);
  const { consoleErrors, unexpectedWarnings, unexpectedDebugLogs } = collectConsoleProblems(consoleMessages);

  return {
    url,
    consoleErrors,
    pageErrors,
    failedRequests,
    successfulRequests,
    unexpectedWarnings,
    unexpectedDebugLogs,
    sceneMetrics,
    performanceMetrics: sceneMetrics.performanceMetrics ?? null,
    requestCounts: Object.fromEntries(requestCounts.entries()),
    screenshotMetrics,
    screenshotPath,
  };
}

async function waitForSceneSemantics(page, kind) {
  if (kind === "prototype") {
    await page.waitForFunction(
      () => {
        const statusBoardText = document.querySelector("[data-status-board]")?.textContent ?? "";
        const detailPanel = document.querySelector("[data-detail-state]");
        return statusBoardText.includes("Global status") && Boolean(detailPanel);
      },
      { timeout: 10000 },
    );
    return;
  }

  await page.waitForFunction(
    () => {
      const statusBoardText = document.querySelector("[data-status-board]")?.textContent ?? "";
      const summaryQueue = document.querySelector("[data-summary-queue]")?.textContent ?? "";
      const summarySessions = document.querySelector("[data-summary-session-overview]")?.textContent ?? "";
      return (
        statusBoardText.includes("Global status") &&
        summaryQueue.includes("pending") &&
        summarySessions.includes("active")
      );
    },
    { timeout: 10000 },
  );
}

function assertSharedSceneQuality(result) {
  const successfulAssetRequests = result.successfulRequests
    .map((request) => request.url)
    .filter((url) => REQUIRED_OFFICE_ASSET_REQUESTS.some((suffix) => url.endsWith(suffix)));
  const repeatedAssetRequests = REQUIRED_OFFICE_ASSET_REQUESTS.filter((suffix) =>
    Object.entries(result.requestCounts ?? {}).some(
      ([url, requestCount]) => url.endsWith(suffix) && Number(requestCount) > 1,
    ),
  );

  const externalAssetRequests = result.successfulRequests
    .map((request) => request.url)
    .filter((url) => url.includes("kenney.nl") || url.includes("google") || url.includes("poly.pizza"));

  if (
    result.consoleErrors.length > 0 ||
    result.pageErrors.length > 0 ||
    result.failedRequests.length > 0 ||
    result.unexpectedWarnings.length > 0 ||
    result.unexpectedDebugLogs.length > 0 ||
    result.sceneMetrics.declaredDeskCount !== REQUIRED_DESK_COUNT ||
    !result.sceneMetrics.declaredStatusBoard ||
    !result.sceneMetrics.declaredLounge ||
    result.sceneMetrics.labelOrientation !== "camera-facing-yaw" ||
    result.sceneMetrics.labelLayer !== REQUIRED_LABEL_LAYER_MODE ||
    result.sceneMetrics.labelPlate !== REQUIRED_LABEL_PLATE_MODE ||
    result.sceneMetrics.deskStructureVisual !== REQUIRED_DESK_STRUCTURE_VISUAL_MODE ||
    result.sceneMetrics.structuralOpacity !== "opaque" ||
    result.sceneMetrics.overheadSightline !== REQUIRED_OVERHEAD_SIGHTLINE_MODE ||
    result.screenshotMetrics.brightPixels < MIN_BRIGHT_PIXELS ||
    result.screenshotMetrics.darkPixels < MIN_DARK_PIXELS ||
    result.screenshotMetrics.midVariancePixels < MIN_MID_VARIANCE_PIXELS ||
    result.screenshotMetrics.uniqueBuckets < MIN_UNIQUE_BUCKETS ||
    result.screenshotMetrics.dominantBucketRatio > MAX_DOMINANT_BUCKET_RATIO ||
    result.screenshotMetrics.lumaSpread < MIN_LUMA_SPREAD ||
    !String(result.sceneMetrics.statusBoardText).includes("Global status") ||
    result.sceneMetrics.assetStrategy !== "kenney-obj-local-fallback" ||
    result.sceneMetrics.assetSource !== "kenney-furniture-kit-cc0" ||
    result.sceneMetrics.officeAssetModelCount !== 9 ||
    result.sceneMetrics.frameloop !== "demand" ||
    result.sceneMetrics.performanceMode !== "idle-on-demand" ||
    (result.performanceMetrics?.postSettleAnimationFrames ?? Number.POSITIVE_INFINITY) > MAX_IDLE_ANIMATION_FRAMES ||
    !String(result.sceneMetrics.licensePath).includes("/office-assets/kenney/licenses/Kenney-Furniture-Kit-CC0.txt") ||
    !String(result.sceneMetrics.provenancePath).includes("/office-assets/kenney/provenance.json") ||
    successfulAssetRequests.length < REQUIRED_OFFICE_ASSET_REQUESTS.length ||
    repeatedAssetRequests.length > 0 ||
    externalAssetRequests.length > 0
  ) {
    throw new Error(JSON.stringify(result, null, 2));
  }
}

async function validatePrototype(page, prototypeUrl, screenshotPath) {
  const result = await openAndInspectPage(
    page,
    prototypeUrl,
    ".scene-canvas-shell",
    screenshotPath,
    () => {
      const root = document.getElementById("root");
      const sceneRoot = document.querySelector("[data-scene-root]");
      const canvas = sceneRoot?.querySelector("canvas");
      const rect = canvas?.getBoundingClientRect();
      const scenePanel = document.querySelector(".scene-panel");
      const statusBoard = document.querySelector("[data-status-board]");

      return {
        rootChildren: root?.children.length ?? 0,
        canvasCount: sceneRoot?.querySelectorAll("canvas").length ?? 0,
        sceneRootPresent: Boolean(sceneRoot),
        detailPanelPresent: Boolean(document.querySelector("[data-detail-state]")),
        headerPresent: document.body.innerText.includes("Agent Office Scene"),
        footerPresent: document.body.innerText.includes("Fixed desks: 12"),
        canvasWidth: rect?.width ?? 0,
        canvasHeight: rect?.height ?? 0,
        scenePanelHeight: scenePanel?.getBoundingClientRect().height ?? 0,
        loadSource: document.querySelector("[data-load-source]")?.getAttribute("data-load-source") ?? null,
        declaredDeskCount: Number(sceneRoot?.getAttribute("data-scene-desk-count") ?? "0"),
        declaredStatusBoard: sceneRoot?.getAttribute("data-scene-has-status-board") === "true",
        declaredLounge: sceneRoot?.getAttribute("data-scene-has-lounge") === "true",
        labelOrientation: sceneRoot?.getAttribute("data-scene-label-orientation") ?? null,
        labelLayer: sceneRoot?.getAttribute("data-scene-label-layer") ?? null,
        labelPlate: sceneRoot?.getAttribute("data-scene-label-plate") ?? null,
        deskStructureVisual: sceneRoot?.getAttribute("data-scene-desk-structure-visual") ?? null,
        structuralOpacity: sceneRoot?.getAttribute("data-scene-structural-opacity") ?? null,
        overheadSightline: sceneRoot?.getAttribute("data-scene-overhead-sightline") ?? null,
        assetStrategy: sceneRoot?.getAttribute("data-scene-asset-strategy") ?? null,
        assetSource: sceneRoot?.getAttribute("data-scene-asset-source") ?? null,
        officeAssetModelCount: Number(sceneRoot?.getAttribute("data-scene-office-asset-model-count") ?? "0"),
        licensePath: sceneRoot?.getAttribute("data-scene-license-path") ?? null,
        provenancePath: sceneRoot?.getAttribute("data-scene-provenance-path") ?? null,
        frameloop: sceneRoot?.getAttribute("data-scene-frameloop") ?? null,
        performanceMode: sceneRoot?.getAttribute("data-scene-performance-mode") ?? null,
        statusBoardText: statusBoard?.textContent ?? "",
        sceneFitStatus: sceneRoot?.getAttribute("data-scene-fit-status") ?? null,
        sceneFitLeft: Number(sceneRoot?.getAttribute("data-scene-fit-left") ?? "0"),
        sceneFitRight: Number(sceneRoot?.getAttribute("data-scene-fit-right") ?? "0"),
        sceneFitTop: Number(sceneRoot?.getAttribute("data-scene-fit-top") ?? "0"),
        sceneFitBottom: Number(sceneRoot?.getAttribute("data-scene-fit-bottom") ?? "0"),
        sceneLabelFitStatus: sceneRoot?.getAttribute("data-scene-label-fit-status") ?? null,
        sceneLabelFitLeft: Number(sceneRoot?.getAttribute("data-scene-label-fit-left") ?? "0"),
        sceneLabelFitRight: Number(sceneRoot?.getAttribute("data-scene-label-fit-right") ?? "0"),
        sceneLabelFitTop: Number(sceneRoot?.getAttribute("data-scene-label-fit-top") ?? "0"),
        sceneLabelFitBottom: Number(sceneRoot?.getAttribute("data-scene-label-fit-bottom") ?? "0"),
        performanceMetrics: window.__clawObserverPerformance?.getMetrics?.() ?? null,
      };
    },
    "prototype",
  );

  if (
    !result.sceneMetrics.sceneRootPresent ||
    result.sceneMetrics.canvasCount < 1 ||
    result.sceneMetrics.rootChildren < 1 ||
    !result.sceneMetrics.detailPanelPresent ||
    !result.sceneMetrics.headerPresent ||
    !result.sceneMetrics.footerPresent ||
    result.sceneMetrics.canvasWidth < 100 ||
    result.sceneMetrics.canvasHeight < 100 ||
    result.sceneMetrics.scenePanelHeight < 100 ||
    result.sceneMetrics.sceneFitStatus !== "fit" ||
    result.sceneMetrics.sceneFitLeft < MIN_SCENE_FIT_MARGIN ||
    result.sceneMetrics.sceneFitRight < MIN_SCENE_FIT_MARGIN ||
    result.sceneMetrics.sceneFitTop < MIN_SCENE_FIT_MARGIN ||
    result.sceneMetrics.sceneFitBottom < MIN_SCENE_FIT_MARGIN ||
    result.sceneMetrics.sceneLabelFitStatus !== "fit" ||
    result.sceneMetrics.sceneLabelFitLeft < MIN_LABEL_FIT_MARGIN ||
    result.sceneMetrics.sceneLabelFitRight < MIN_LABEL_FIT_MARGIN ||
    result.sceneMetrics.sceneLabelFitTop < MIN_LABEL_FIT_MARGIN ||
    result.sceneMetrics.sceneLabelFitBottom < MIN_LABEL_FIT_MARGIN
  ) {
    throw new Error(JSON.stringify(result, null, 2));
  }

  assertSharedSceneQuality(result);
  return result;
}

async function validateRealtime(page, realtimeUrl, screenshotPath, expectedRuntimeStatus = null) {
  const result = await openAndInspectPage(
    page,
    realtimeUrl,
    ".scene-canvas-shell",
    screenshotPath,
    () => {
      const sceneRoot = document.querySelector("[data-scene-root]");
      const canvas = sceneRoot?.querySelector("canvas");
      const rect = canvas?.getBoundingClientRect();
      const mount = document.getElementById("realtime-r3f-scene-mount");
      const statusBoard = document.querySelector("[data-status-board]");
      const summaryPanel = document.querySelector("[data-summary-panel]");
      const detailPanel = document.querySelector("[data-detail-state='empty'], [data-detail-state='selected']");
      const canvasPanel = document.querySelector(".scene-canvas-panel");
      const detailState = document.querySelector("[data-detail-state]")?.getAttribute("data-detail-state") ?? null;
      const summaryRuntime = document.querySelector("[data-summary-runtime-reason]")?.textContent ?? null;
      const summaryQueue = document.querySelector("[data-summary-queue]")?.textContent ?? null;
      const summarySessions = document.querySelector("[data-summary-session-overview]")?.textContent ?? null;
      const summaryPanelPresent = Boolean(document.querySelector("[data-summary-panel]"));
      const hoverText = document.querySelector("[data-scene-hovered-agent]")?.textContent ?? "";
      const footerText = document.querySelector(".scene-footer")?.textContent ?? "";

      const hoveredCard = document.querySelector("[data-hover-card]");
      const deskLabels = Array.from(document.querySelectorAll("[data-hover-card], .detail-panel h2"))
        .map((node) => node.textContent ?? "")
        .join(" ");
      const summaryRect = summaryPanel?.getBoundingClientRect();
      const detailRect = detailPanel?.getBoundingClientRect();
      const canvasPanelRect = canvasPanel?.getBoundingClientRect();

      return {
        mountPresent: Boolean(mount),
        sceneRootPresent: Boolean(sceneRoot),
        canvasCount: sceneRoot?.querySelectorAll("canvas").length ?? 0,
        canvasWidth: rect?.width ?? 0,
        canvasHeight: rect?.height ?? 0,
        headerPresent: document.body.innerText.includes("Realtime Claw Scene"),
        detailState,
        summaryPanelPresent,
        summaryRuntime,
        summaryQueue,
        summarySessions,
        hoverText,
        footerText,
        statusBoardText: statusBoard?.textContent ?? "",
        declaredDeskCount: Number(sceneRoot?.getAttribute("data-scene-desk-count") ?? "0"),
        declaredStatusBoard: sceneRoot?.getAttribute("data-scene-has-status-board") === "true",
        declaredLounge: sceneRoot?.getAttribute("data-scene-has-lounge") === "true",
        labelOrientation: sceneRoot?.getAttribute("data-scene-label-orientation") ?? null,
        labelLayer: sceneRoot?.getAttribute("data-scene-label-layer") ?? null,
        labelPlate: sceneRoot?.getAttribute("data-scene-label-plate") ?? null,
        deskStructureVisual: sceneRoot?.getAttribute("data-scene-desk-structure-visual") ?? null,
        structuralOpacity: sceneRoot?.getAttribute("data-scene-structural-opacity") ?? null,
        overheadSightline: sceneRoot?.getAttribute("data-scene-overhead-sightline") ?? null,
        assetStrategy: sceneRoot?.getAttribute("data-scene-asset-strategy") ?? null,
        assetSource: sceneRoot?.getAttribute("data-scene-asset-source") ?? null,
        officeAssetModelCount: Number(sceneRoot?.getAttribute("data-scene-office-asset-model-count") ?? "0"),
        licensePath: sceneRoot?.getAttribute("data-scene-license-path") ?? null,
        provenancePath: sceneRoot?.getAttribute("data-scene-provenance-path") ?? null,
        frameloop: sceneRoot?.getAttribute("data-scene-frameloop") ?? null,
        performanceMode: sceneRoot?.getAttribute("data-scene-performance-mode") ?? null,
        runtimeStatus: sceneRoot?.getAttribute("data-runtime-status") ?? null,
        statusBoardRuntime: statusBoard?.getAttribute("data-runtime-status") ?? null,
        hoveredCardPresent: Boolean(hoveredCard),
        deskLabels,
        summaryVariant: summaryPanel?.getAttribute("data-summary-variant") ?? null,
        summaryTop: summaryRect?.top ?? 0,
        summaryBottom: summaryRect?.bottom ?? 0,
        summaryWidth: summaryRect?.width ?? 0,
        detailTop: detailRect?.top ?? 0,
        canvasTop: canvasPanelRect?.top ?? 0,
        canvasPanelWidth: canvasPanelRect?.width ?? 0,
        sceneFitStatus: sceneRoot?.getAttribute("data-scene-fit-status") ?? null,
        sceneFitLeft: Number(sceneRoot?.getAttribute("data-scene-fit-left") ?? "0"),
        sceneFitRight: Number(sceneRoot?.getAttribute("data-scene-fit-right") ?? "0"),
        sceneFitTop: Number(sceneRoot?.getAttribute("data-scene-fit-top") ?? "0"),
        sceneFitBottom: Number(sceneRoot?.getAttribute("data-scene-fit-bottom") ?? "0"),
        sceneLabelFitStatus: sceneRoot?.getAttribute("data-scene-label-fit-status") ?? null,
        sceneLabelFitLeft: Number(sceneRoot?.getAttribute("data-scene-label-fit-left") ?? "0"),
        sceneLabelFitRight: Number(sceneRoot?.getAttribute("data-scene-label-fit-right") ?? "0"),
        sceneLabelFitTop: Number(sceneRoot?.getAttribute("data-scene-label-fit-top") ?? "0"),
        sceneLabelFitBottom: Number(sceneRoot?.getAttribute("data-scene-label-fit-bottom") ?? "0"),
        performanceMetrics: window.__clawObserverPerformance?.getMetrics?.() ?? null,
      };
    },
    "realtime",
  );

  if (
    !result.sceneMetrics.mountPresent ||
    !result.sceneMetrics.sceneRootPresent ||
    result.sceneMetrics.canvasCount < 1 ||
    result.sceneMetrics.canvasWidth < 100 ||
    result.sceneMetrics.canvasHeight < 100 ||
    !result.sceneMetrics.headerPresent ||
    !result.sceneMetrics.summaryPanelPresent ||
    (expectedRuntimeStatus !== null && result.sceneMetrics.runtimeStatus !== expectedRuntimeStatus) ||
    !String(result.sceneMetrics.statusBoardText).includes("Global status") ||
    !String(result.sceneMetrics.summaryRuntime).trim() ||
    !String(result.sceneMetrics.summaryQueue).includes("pending") ||
    !String(result.sceneMetrics.summarySessions).includes("active") ||
    !String(result.sceneMetrics.footerText).includes("Fixed desks: 12") ||
    result.sceneMetrics.canvasWidth < MIN_SCENE_CANVAS_WIDTH ||
    result.sceneMetrics.canvasHeight < MIN_SCENE_CANVAS_HEIGHT ||
    result.sceneMetrics.summaryVariant !== "wide" ||
    result.sceneMetrics.summaryBottom > result.sceneMetrics.canvasTop ||
    result.sceneMetrics.summaryWidth < result.sceneMetrics.canvasPanelWidth * MIN_SUMMARY_WIDTH_RATIO ||
    result.sceneMetrics.detailTop > result.sceneMetrics.canvasTop ||
    result.sceneMetrics.sceneFitStatus !== "fit" ||
    result.sceneMetrics.sceneFitLeft < MIN_SCENE_FIT_MARGIN ||
    result.sceneMetrics.sceneFitRight < MIN_SCENE_FIT_MARGIN ||
    result.sceneMetrics.sceneFitTop < MIN_SCENE_FIT_MARGIN ||
    result.sceneMetrics.sceneFitBottom < MIN_SCENE_FIT_MARGIN ||
    result.sceneMetrics.sceneLabelFitStatus !== "fit" ||
    result.sceneMetrics.sceneLabelFitLeft < MIN_LABEL_FIT_MARGIN ||
    result.sceneMetrics.sceneLabelFitRight < MIN_LABEL_FIT_MARGIN ||
    result.sceneMetrics.sceneLabelFitTop < MIN_LABEL_FIT_MARGIN ||
    result.sceneMetrics.sceneLabelFitBottom < MIN_LABEL_FIT_MARGIN
  ) {
    throw new Error(JSON.stringify(result, null, 2));
  }

  assertSharedSceneQuality(result);
  return result;
}

async function runIsolatedFixtureSmoke(browser) {
  const host = "127.0.0.1";
  const port = Number.parseInt(process.env.PROTOTYPE_SMOKE_PORT ?? "8431", 10);
  const fixturePath = process.env.CLAWOBSERVER_SMOKE_FIXTURE ?? defaultFixturePath;
  const prototypeUrl = `http://${host}:${port}/prototype`;
  const realtimeUrl = `http://${host}:${port}/`;
  const healthUrl = `http://${host}:${port}/api/health`;
  const prototypeScreenshotPath = process.env.PROTOTYPE_SMOKE_SCREENSHOT ?? defaultPrototypeScreenshotPath;
  const realtimeScreenshotPath = process.env.REALTIME_SMOKE_SCREENSHOT ?? defaultRealtimeScreenshotPath;

  const { server, stdoutRef, stderrRef } = startServer({ host, port, fixturePath });
  try {
    await waitForServer(healthUrl, 15000);
    const prototypePage = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const realtimePage = await browser.newPage({ viewport: { width: 1520, height: 1180 } });
    try {
      const prototypeResult = await validatePrototype(prototypePage, prototypeUrl, prototypeScreenshotPath);
      const realtimeResult = await validateRealtime(realtimePage, realtimeUrl, realtimeScreenshotPath, "ok");
      return { prototypeResult, realtimeResult };
    } finally {
      await prototypePage.close();
      await realtimePage.close();
    }
  } finally {
    await closeServer(server);
    if (server.exitCode && server.exitCode !== 0) {
      throw new Error(
        JSON.stringify(
          {
            message: "Fixture smoke server exited unexpectedly",
            exitCode: server.exitCode,
            stdout: stdoutRef(),
            stderr: stderrRef(),
          },
          null,
          2,
        ),
      );
    }
  }
}

function normalizeSmokeMode(value) {
  if (!value) {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!["realtime", "prototype", "both"].includes(normalized)) {
    throw new Error(`Unsupported PROTOTYPE_SMOKE_MODE=${value}. Expected realtime, prototype, or both.`);
  }
  return normalized;
}

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") {
    return "/";
  }
  return pathname.replace(/\/+$/, "") || "/";
}

function inferExternalTargetKind(targetUrl) {
  const pathname = normalizePathname(new URL(targetUrl).pathname);
  if (pathname === "/") {
    return "realtime";
  }
  if (pathname === "/prototype") {
    return "prototype";
  }
  return null;
}

function buildSiblingRouteUrl(targetUrl, targetKind) {
  const url = new URL(targetUrl);
  const inferredKind = inferExternalTargetKind(targetUrl);
  if (inferredKind === targetKind) {
    return url.toString();
  }
  if (inferredKind === "realtime" && targetKind === "prototype") {
    url.pathname = "/prototype";
    return url.toString();
  }
  if (inferredKind === "prototype" && targetKind === "realtime") {
    url.pathname = "/";
    return url.toString();
  }
  return null;
}

function resolveExternalTargets() {
  const explicitRealtimeUrl = process.env.REALTIME_SMOKE_URL?.trim() || null;
  const explicitPrototypeUrl = process.env.PROTOTYPE_SMOKE_URL?.trim() || null;
  const mode = normalizeSmokeMode(process.env.PROTOTYPE_SMOKE_MODE);
  const explicitUrls = [explicitRealtimeUrl, explicitPrototypeUrl].filter(Boolean);

  if (explicitUrls.length === 0) {
    return null;
  }

  if (mode === "both") {
    let realtimeUrl = null;
    let prototypeUrl = null;

    for (const targetUrl of explicitUrls) {
      const inferredKind = inferExternalTargetKind(targetUrl);
      if (inferredKind === "realtime") {
        realtimeUrl = targetUrl;
      }
      if (inferredKind === "prototype") {
        prototypeUrl = targetUrl;
      }
    }

    const seedUrl = explicitUrls[0];
    realtimeUrl = realtimeUrl ?? buildSiblingRouteUrl(seedUrl, "realtime");
    prototypeUrl = prototypeUrl ?? buildSiblingRouteUrl(seedUrl, "prototype");
    if (!realtimeUrl || !prototypeUrl) {
      throw new Error(
        `PROTOTYPE_SMOKE_MODE=both requires / and /prototype URLs or a seed URL rooted at one of those paths. Got ${seedUrl}.`,
      );
    }
    return { mode, realtimeUrl, prototypeUrl };
  }

  if (mode === "realtime" || mode === "prototype") {
    const targetUrl =
      mode === "realtime"
        ? explicitRealtimeUrl ?? explicitPrototypeUrl
        : explicitPrototypeUrl ?? explicitRealtimeUrl;
    return {
      mode,
      realtimeUrl: mode === "realtime" ? targetUrl : null,
      prototypeUrl: mode === "prototype" ? targetUrl : null,
    };
  }

  const results = {
    mode: "auto",
    realtimeUrl: null,
    prototypeUrl: null,
  };

  for (const targetUrl of [explicitRealtimeUrl, explicitPrototypeUrl].filter(Boolean)) {
    const inferredKind = inferExternalTargetKind(targetUrl);
    if (!inferredKind) {
      throw new Error(
        `Cannot infer smoke validator for ${targetUrl}. Use / for realtime, /prototype for prototype, or set PROTOTYPE_SMOKE_MODE explicitly.`,
      );
    }
    if (inferredKind === "realtime") {
      results.realtimeUrl = targetUrl;
    }
    if (inferredKind === "prototype") {
      results.prototypeUrl = targetUrl;
    }
  }

  return results;
}

async function runExternalSmoke(browser) {
  const targets = resolveExternalTargets();
  if (!targets) {
    return null;
  }

  const results = {
    mode: targets.mode,
    realtimeUrl: targets.realtimeUrl,
    prototypeUrl: targets.prototypeUrl,
  };
  if (targets.realtimeUrl) {
    const page = await browser.newPage({ viewport: { width: 1520, height: 1180 } });
    try {
      results.realtimeResult = await validateRealtime(
        page,
        targets.realtimeUrl,
        process.env.REALTIME_SMOKE_SCREENSHOT ?? defaultRealtimeScreenshotPath,
      );
    } finally {
      await page.close();
    }
  }
  if (targets.prototypeUrl) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    try {
      results.prototypeResult = await validatePrototype(
        page,
        targets.prototypeUrl,
        process.env.PROTOTYPE_SMOKE_SCREENSHOT ?? defaultPrototypeScreenshotPath,
      );
    } finally {
      await page.close();
    }
  }
  return results;
}

async function run() {
  const browser = await chromium.launch({
    executablePath: resolveBrowserExecutable(),
    headless: true,
    args: ["--use-gl=swiftshader"],
  });

  try {
    const fixtureResults = await runIsolatedFixtureSmoke(browser);
    const externalResults = await runExternalSmoke(browser);

    console.log(
      JSON.stringify(
        {
          fixture: {
            prototypeUrl: fixtureResults.prototypeResult.url,
            realtimeUrl: fixtureResults.realtimeResult.url,
            prototypeScreenshotPath: fixtureResults.prototypeResult.screenshotPath,
            realtimeScreenshotPath: fixtureResults.realtimeResult.screenshotPath,
            prototypeConsoleErrors: fixtureResults.prototypeResult.consoleErrors.length,
            prototypePageErrors: fixtureResults.prototypeResult.pageErrors.length,
            prototypeFailedRequests: fixtureResults.prototypeResult.failedRequests.length,
            realtimeConsoleErrors: fixtureResults.realtimeResult.consoleErrors.length,
            realtimePageErrors: fixtureResults.realtimeResult.pageErrors.length,
            realtimeFailedRequests: fixtureResults.realtimeResult.failedRequests.length,
            prototypeSceneMetrics: fixtureResults.prototypeResult.sceneMetrics,
            realtimeSceneMetrics: fixtureResults.realtimeResult.sceneMetrics,
            prototypeScreenshotMetrics: fixtureResults.prototypeResult.screenshotMetrics,
            realtimeScreenshotMetrics: fixtureResults.realtimeResult.screenshotMetrics,
          },
          external: externalResults
            ? {
                mode: externalResults.mode,
                prototypeUrl: externalResults.prototypeResult?.url ?? null,
                realtimeUrl: externalResults.realtimeResult?.url ?? null,
                prototypeScreenshotPath: externalResults.prototypeResult?.screenshotPath ?? null,
                realtimeScreenshotPath: externalResults.realtimeResult?.screenshotPath ?? null,
                prototypeConsoleErrors: externalResults.prototypeResult?.consoleErrors.length ?? null,
                prototypePageErrors: externalResults.prototypeResult?.pageErrors.length ?? null,
                prototypeFailedRequests: externalResults.prototypeResult?.failedRequests.length ?? null,
                realtimeConsoleErrors: externalResults.realtimeResult?.consoleErrors.length ?? null,
                realtimePageErrors: externalResults.realtimeResult?.pageErrors.length ?? null,
                realtimeFailedRequests: externalResults.realtimeResult?.failedRequests.length ?? null,
                prototypeSceneMetrics: externalResults.prototypeResult?.sceneMetrics ?? null,
                realtimeSceneMetrics: externalResults.realtimeResult?.sceneMetrics ?? null,
                prototypeScreenshotMetrics: externalResults.prototypeResult?.screenshotMetrics ?? null,
                realtimeScreenshotMetrics: externalResults.realtimeResult?.screenshotMetrics ?? null,
              }
            : null,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}

await run();
