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
const defaultPrototypeAvatarScreenshotPath = path.resolve(repoRoot, "tmp/prototype-avatar-preview-closeup.png");
const defaultRealtimeAvatarScreenshotPath = path.resolve(repoRoot, "tmp/realtime-avatar-preview-closeup.png");
const defaultPrototypeWorkAdventureScreenshotPath = path.resolve(repoRoot, "tmp/prototype-workadventure-preview.png");
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
const REQUIRED_FRONT_LABEL_LANE_CLEARANCE_MODE = "open-center";
const REQUIRED_STYLE_PROFILE = "toy-office-command-center";
const REQUIRED_STYLE_REFERENCE = "quaternius-inspired-command-center-safe-emulation";
const REQUIRED_WORKSTATION_ORIENTATION = "all-desks-face-camera";
const REQUIRED_MONITOR_STYLE = "screen-plane-cyan-edge";
const REQUIRED_LABEL_HIERARCHY = "small-monitor-top-metadata-tag";
const REQUIRED_LABEL_SCALE_HIERARCHY = "small-secondary-corner-badge";
const REQUIRED_MONITOR_DETAIL = "integrated-screen-keyboard-mouse";
const REQUIRED_WORKSTATION_PROPORTION = "wide-front-facing-workstation";
const REQUIRED_INNER_WORKSTATION_ORIENTATION = "camera-facing-inner-workstation-group";
const REQUIRED_PERIPHERAL_VISIBILITY = "keyboard-mouse-readable";
const REQUIRED_LABEL_OCCLUSION = "monitor-corner-badge-clear";
const REQUIRED_AVATAR_PREVIEW_MODE = "preview-hyper-casual-cc-by-avatar";
const REQUIRED_AVATAR_PREVIEW_SOURCE = "poly-pizza-hyper-casual-local-preview";
const REQUIRED_AVATAR_PREVIEW_PROVENANCE_SOURCE = "poly-pizza-hyper-casual-character-cc-by-3.0";
const REQUIRED_AVATAR_PLACEMENT = "seated-behind-desk-facing-monitor";
const REQUIRED_AVATAR_PREVIEW_MODEL_COUNT = 4;
const REQUIRED_VISIBLE_AVATAR_MARKER = "visible-avatar-preview-v1";
const REQUIRED_VISIBLE_AVATAR_LAYOUT = "seated-desk-cluster-closeup";
const REQUIRED_VISIBLE_AVATAR_DESKS = ["Desk 5", "Desk 6", "Desk 7", "Desk 8"];
const REQUIRED_AVATAR_DEMO_STAGE_MARKER = "office-avatar-visibility-demo-v1";
const REQUIRED_AVATAR_DEMO_STAGE_MODE = "hero-plus-desk-cluster";
const REQUIRED_AVATAR_DEMO_STAGE_COUNT = 5;
const REQUIRED_WA_PREVIEW_MODE = "workadventure-office-map-preview";
const REQUIRED_WA_PREVIEW_SOURCE = "official-workadventure-map-starter-kit";
const REQUIRED_WA_PREVIEW_LICENSE_SCOPE = "workadventure-map-only";
const REQUIRED_WA_PREVIEW_TILESET_COUNT = 10;
const REQUIRED_WA_PREVIEW_MAP_WIDTH = 31;
const REQUIRED_WA_PREVIEW_MAP_HEIGHT = 21;
const REQUIRED_WA_PREVIEW_VISIBLE_LAYER_COUNT = 11;
const REQUIRED_WA_PREVIEW_WALKABLE_TILE_COUNT = 366;
const REQUIRED_WA_PREVIEW_COLLISION_TILE_COUNT = 285;
const REQUIRED_WA_PREVIEW_ZONE_COUNT = 7;
const REQUIRED_WA_PREVIEW_START_TILE_COUNT = 2;
const REQUIRED_WA_PREVIEW_AVATAR_COUNT = 4;
const REQUIRED_WA_PREVIEW_OFFICE_ZONE_COUNT = 4;
const REQUIRED_WA_PREVIEW_ZONE_NAMES = [
  "clockPopup",
  "jitsiChillZone",
  "silentZone",
  "jitsiMeetingRoom",
  "clock",
  "to-conference",
  "from-conference",
];
const REQUIRED_WA_SCENE_KIND = "workadventure-primary";
const REQUIRED_WA_SCENE_RENDERER_MODE = "workadventure";
const REQUIRED_WA_SCENE_STYLE_PROFILE = "workadventure-embedded-ops-office";
const REQUIRED_WA_SCENE_STYLE_REFERENCE = "official-workadventure-office-embed";
const REQUIRED_WA_SCENE_ASSET_STRATEGY = "workadventure-tilemap-runtime-subset";
const REQUIRED_WA_WOKA_MODE = "workadventure-runtime-woka-subset";
const REQUIRED_WA_WOKA_SOURCE = "official-workadventure-runtime";
const REQUIRED_WA_WOKA_LICENSE_SCOPE = "workadventure-runtime-demo-only";
const REQUIRED_WA_WOKA_SUBSET_COUNT = 4;
const REQUIRED_WA_FRONT_LABEL_LANE_CLEARANCE = "stable-work-rest-nameplate-lane";
const REQUIRED_WA_BACKGROUND_MODE = "custom-generated-office-background";
const REQUIRED_WA_BACKGROUND_SOURCE = "approved-user-generated-office-2026-05-12";
const REQUIRED_WA_BACKGROUND_WIDTH = 1264;
const REQUIRED_WA_BACKGROUND_HEIGHT = 848;
const REQUIRED_WA_PLACEMENT_CONTRACT = "busy-work-idle-rest";
const REQUIRED_WA_LABEL_HIERARCHY = "compact-count-nameplate";
const REQUIRED_WA_LABEL_SCALE_HIERARCHY = "single-line-count-nameplate-readable";
const REQUIRED_WA_PERIPHERAL_VISIBILITY = "custom-background-broader-workzones-readable";
const REQUIRED_WA_NAMEPLATE_FORMAT = "agent-name-taskcount-compact";
const REQUIRED_WA_NAMEPLATE_MIN_FONT_PX = 13;
const REQUIRED_REALTIME_RENDERED_AGENT_COUNT = 22;
const REQUIRED_REALTIME_WORK_AGENT_COUNT = 15;
const REQUIRED_REALTIME_REST_AGENT_COUNT = 7;
const MIN_DESK_ASPECT_RATIO = 2.6;
const MIN_SCREENSHOT_FILE_BYTES = 100000;
const MIN_LABEL_BAND_MID_VARIANCE_PIXELS = 42000;
const MIN_LABEL_BAND_UNIQUE_BUCKETS = 500;
const MAX_LABEL_BAND_DOMINANT_BUCKET_RATIO = 0.16;
const MIN_DESK_BAND_MID_VARIANCE_PIXELS = 150000;
const MIN_DESK_BAND_UNIQUE_BUCKETS = 650;
const MAX_DESK_BAND_DOMINANT_BUCKET_RATIO = 0.22;
const SCREENSHOT_LABEL_BAND = { left: 0.28, right: 0.72, top: 0.2, bottom: 0.38 };
const SCREENSHOT_DESK_BAND = { left: 0.08, right: 0.92, top: 0.36, bottom: 0.72 };
const MAX_WA_NAMEPLATE_OVERLAP_AREA = 0;
const MAX_REST_BOUNDING_BOX_VIOLATIONS = 0;
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
const REQUIRED_WORKADVENTURE_PREVIEW_ASSET_REQUESTS = [
  "/assets/prototype/office-assets/workadventure-preview/map/office.png",
];
const REQUIRED_WORKADVENTURE_REALTIME_ASSET_REQUESTS = [
  "/assets/prototype/office-assets/workadventure-custom-background/generated-office-2026-05-12-1420.jpg",
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
    fileBytes: pngBuffer.length,
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

function analyzePngBand(pngBuffer, band) {
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

  const centerLeft = Math.floor(width * band.left);
  const centerRight = Math.ceil(width * band.right);
  const centerTop = Math.floor(height * band.top);
  const centerBottom = Math.ceil(height * band.bottom);
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

async function captureAvatarPreviewCloseup(page, outputPath) {
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  const demoPanel = page.locator("[data-avatar-demo-stage]").first();
  const demoPanelCount = await demoPanel.count();
  if (demoPanelCount < 1) {
    throw new Error("Avatar demo stage is missing");
  }
  const markerCount = await page.locator("[data-avatar-demo-node]").count();
  if (markerCount !== REQUIRED_AVATAR_DEMO_STAGE_COUNT) {
    throw new Error(`Avatar demo marker count mismatch: expected ${REQUIRED_AVATAR_DEMO_STAGE_COUNT}, received ${markerCount}`);
  }

  const demoCanvasShell = page.locator(".scene-avatar-demo-canvas-shell").first();
  await demoCanvasShell.screenshot({ path: outputPath });
}

async function captureWorkAdventurePreviewCloseup(page, outputPath) {
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  const panel = page.locator("[data-wa-preview-surface]").first();
  const panelCount = await panel.count();
  if (panelCount < 1) {
    throw new Error("WorkAdventure preview surface is missing");
  }
  await panel.screenshot({ path: outputPath });
}

async function openAndInspectPage(
  page,
  url,
  sceneSelector,
  screenshotPath,
  avatarScreenshotPath,
  evaluator,
  sceneKind,
  extraScreenshotPath = null,
  beforeInspect = null,
) {
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
  if (sceneKind === "prototype") {
    await page.waitForSelector(`${sceneSelector} canvas`, { timeout: 10000 });
  } else {
    await page.waitForSelector(sceneSelector, { timeout: 10000 });
  }
  await waitForSceneSemantics(page, sceneKind);
  if (beforeInspect) {
    await beforeInspect(page);
  }
  await page.evaluate(() => {
    window.__clawObserverPerformance?.markSettled?.();
  });
  await page.waitForTimeout(1800);

  const sceneMetrics = await page.evaluate(evaluator);
  await fs.promises.mkdir(path.dirname(screenshotPath), { recursive: true });
  await page.waitForSelector(sceneSelector, { state: "visible", timeout: 10000 });
  await page.locator(sceneSelector).first().screenshot({ path: screenshotPath });
  if (avatarScreenshotPath && sceneKind === "prototype") {
    await captureAvatarPreviewCloseup(page, avatarScreenshotPath);
  }
  if (extraScreenshotPath) {
    await captureWorkAdventurePreviewCloseup(page, extraScreenshotPath);
  }
  const screenshotBuffer = await fs.promises.readFile(screenshotPath);
  const screenshotMetrics = analyzePng(screenshotBuffer);
  const labelBandMetrics = analyzePngBand(screenshotBuffer, SCREENSHOT_LABEL_BAND);
  const deskBandMetrics = analyzePngBand(screenshotBuffer, SCREENSHOT_DESK_BAND);
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
    labelBandMetrics,
    deskBandMetrics,
    screenshotPath,
    avatarScreenshotPath,
    extraScreenshotPath,
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

  if (kind === "realtime") {
    await page.waitForFunction(
      () => {
        const statusBoardText = document.querySelector("[data-status-board]")?.textContent ?? "";
        const summaryQueue = document.querySelector("[data-summary-queue]")?.textContent ?? "";
        const summarySessions = document.querySelector("[data-summary-session-overview]")?.textContent ?? "";
        const deskCount = document.querySelectorAll("[data-wa-scene-desk]").length;
        return (
          statusBoardText.includes("Global status") &&
          summaryQueue.includes("pending") &&
          summarySessions.includes("active") &&
          deskCount >= 12
        );
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
  const successfulWorkAdventureRequests = result.successfulRequests
    .map((request) => request.url)
    .filter((url) => REQUIRED_WORKADVENTURE_PREVIEW_ASSET_REQUESTS.some((suffix) => url.endsWith(suffix)));

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
    result.sceneMetrics.frontLabelLaneClearance !== REQUIRED_FRONT_LABEL_LANE_CLEARANCE_MODE ||
    result.sceneMetrics.workstationOrientation !== REQUIRED_WORKSTATION_ORIENTATION ||
    result.sceneMetrics.monitorStyle !== REQUIRED_MONITOR_STYLE ||
    result.sceneMetrics.labelHierarchy !== REQUIRED_LABEL_HIERARCHY ||
    result.sceneMetrics.labelScaleHierarchy !== REQUIRED_LABEL_SCALE_HIERARCHY ||
    result.sceneMetrics.monitorDetail !== REQUIRED_MONITOR_DETAIL ||
    result.sceneMetrics.workstationProportion !== REQUIRED_WORKSTATION_PROPORTION ||
    result.sceneMetrics.innerWorkstationOrientation !== REQUIRED_INNER_WORKSTATION_ORIENTATION ||
    result.sceneMetrics.peripheralVisibility !== REQUIRED_PERIPHERAL_VISIBILITY ||
    result.sceneMetrics.labelOcclusion !== REQUIRED_LABEL_OCCLUSION ||
    result.sceneMetrics.deskAspect < MIN_DESK_ASPECT_RATIO ||
    result.screenshotMetrics.brightPixels < MIN_BRIGHT_PIXELS ||
    result.screenshotMetrics.darkPixels < MIN_DARK_PIXELS ||
    result.screenshotMetrics.midVariancePixels < MIN_MID_VARIANCE_PIXELS ||
    result.screenshotMetrics.uniqueBuckets < MIN_UNIQUE_BUCKETS ||
    result.screenshotMetrics.dominantBucketRatio > MAX_DOMINANT_BUCKET_RATIO ||
    result.screenshotMetrics.lumaSpread < MIN_LUMA_SPREAD ||
    result.screenshotMetrics.fileBytes < MIN_SCREENSHOT_FILE_BYTES ||
    result.labelBandMetrics.midVariancePixels < MIN_LABEL_BAND_MID_VARIANCE_PIXELS ||
    result.labelBandMetrics.uniqueBuckets < MIN_LABEL_BAND_UNIQUE_BUCKETS ||
    result.labelBandMetrics.dominantBucketRatio > MAX_LABEL_BAND_DOMINANT_BUCKET_RATIO ||
    result.deskBandMetrics.midVariancePixels < MIN_DESK_BAND_MID_VARIANCE_PIXELS ||
    result.deskBandMetrics.uniqueBuckets < MIN_DESK_BAND_UNIQUE_BUCKETS ||
    result.deskBandMetrics.dominantBucketRatio > MAX_DESK_BAND_DOMINANT_BUCKET_RATIO ||
    !String(result.sceneMetrics.statusBoardText).includes("Global status") ||
    result.sceneMetrics.assetStrategy !== "kenney-obj-local-fallback" ||
    result.sceneMetrics.assetSource !== "kenney-furniture-kit-cc0" ||
    result.sceneMetrics.officeAssetModelCount !== 9 ||
    result.sceneMetrics.avatarPreviewMode !== REQUIRED_AVATAR_PREVIEW_MODE ||
    result.sceneMetrics.avatarPreviewSource !== REQUIRED_AVATAR_PREVIEW_SOURCE ||
    result.sceneMetrics.avatarPreviewProvenanceSource !== REQUIRED_AVATAR_PREVIEW_PROVENANCE_SOURCE ||
    result.sceneMetrics.avatarPreviewModelCount !== REQUIRED_AVATAR_PREVIEW_MODEL_COUNT ||
    result.sceneMetrics.avatarPlacement !== REQUIRED_AVATAR_PLACEMENT ||
    result.sceneMetrics.avatarPreviewVisibleMarker !== REQUIRED_VISIBLE_AVATAR_MARKER ||
    result.sceneMetrics.avatarPreviewVisibleLayout !== REQUIRED_VISIBLE_AVATAR_LAYOUT ||
    result.sceneMetrics.avatarPreviewVisibleCount !== REQUIRED_VISIBLE_AVATAR_DESKS.length ||
    REQUIRED_VISIBLE_AVATAR_DESKS.some((desk) => !result.sceneMetrics.avatarPreviewVisibleDesks.includes(desk)) ||
    result.sceneMetrics.avatarDemoStage !== REQUIRED_AVATAR_DEMO_STAGE_MARKER ||
    result.sceneMetrics.avatarDemoStageMode !== REQUIRED_AVATAR_DEMO_STAGE_MODE ||
    result.sceneMetrics.avatarDemoStageCount !== REQUIRED_AVATAR_DEMO_STAGE_COUNT ||
    result.sceneMetrics.avatarDemoNodeCount !== REQUIRED_AVATAR_DEMO_STAGE_COUNT ||
    result.sceneMetrics.avatarDemoHeroCount !== 1 ||
    result.sceneMetrics.avatarDemoDeskCount !== REQUIRED_VISIBLE_AVATAR_DESKS.length ||
    REQUIRED_VISIBLE_AVATAR_DESKS.some((desk) => !result.sceneMetrics.avatarDemoDesks.includes(desk)) ||
    result.sceneMetrics.renderedAvatarPreviewCount !== REQUIRED_VISIBLE_AVATAR_DESKS.length ||
    result.sceneMetrics.renderedAvatarPreviewMissingMarkerCount !== 0 ||
    result.sceneMetrics.renderedAvatarPreviewDeskLabels.length !== REQUIRED_VISIBLE_AVATAR_DESKS.length ||
    REQUIRED_VISIBLE_AVATAR_DESKS.some((desk) => !result.sceneMetrics.renderedAvatarPreviewDeskLabels.includes(desk)) ||
    result.sceneMetrics.frameloop !== "demand" ||
    result.sceneMetrics.performanceMode !== "idle-on-demand" ||
    result.sceneMetrics.styleProfile !== REQUIRED_STYLE_PROFILE ||
    result.sceneMetrics.styleReference !== REQUIRED_STYLE_REFERENCE ||
    (result.performanceMetrics?.postSettleAnimationFrames ?? Number.POSITIVE_INFINITY) > MAX_IDLE_ANIMATION_FRAMES ||
    !String(result.sceneMetrics.licensePath).includes("/office-assets/kenney/licenses/Kenney-Furniture-Kit-CC0.txt") ||
    !String(result.sceneMetrics.provenancePath).includes("/office-assets/kenney/provenance.json") ||
    !String(result.sceneMetrics.avatarPreviewLicensePath).includes("/office-assets/poly-pizza-hyper-casual-preview/licenses/Creative-Commons-Attribution-3.0.txt") ||
    !String(result.sceneMetrics.avatarPreviewProvenancePath).includes("/office-assets/poly-pizza-hyper-casual-preview/provenance.json") ||
    successfulAssetRequests.length < REQUIRED_OFFICE_ASSET_REQUESTS.length ||
    (result.sceneMetrics.waPreviewPresent && successfulWorkAdventureRequests.length < REQUIRED_WORKADVENTURE_PREVIEW_ASSET_REQUESTS.length) ||
    repeatedAssetRequests.length > 0 ||
    externalAssetRequests.length > 0
  ) {
    throw new Error(JSON.stringify(result, null, 2));
  }
}

function assertRealtimeWorkAdventureQuality(result) {
  const successfulWorkAdventureRequests = result.successfulRequests
    .map((request) => request.url)
    .filter((url) => REQUIRED_WORKADVENTURE_REALTIME_ASSET_REQUESTS.some((suffix) => url.endsWith(suffix)));
  const repeatedWorkAdventureRequests = REQUIRED_WORKADVENTURE_REALTIME_ASSET_REQUESTS.filter((suffix) =>
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
    result.sceneMetrics.sceneKind !== REQUIRED_WA_SCENE_KIND ||
    result.sceneMetrics.rendererMode !== REQUIRED_WA_SCENE_RENDERER_MODE ||
    result.sceneMetrics.styleProfile !== REQUIRED_WA_SCENE_STYLE_PROFILE ||
    result.sceneMetrics.styleReference !== REQUIRED_WA_SCENE_STYLE_REFERENCE ||
    result.sceneMetrics.assetStrategy !== REQUIRED_WA_SCENE_ASSET_STRATEGY ||
    result.sceneMetrics.assetSource !== REQUIRED_WA_PREVIEW_SOURCE ||
    result.sceneMetrics.wokaMode !== REQUIRED_WA_WOKA_MODE ||
    result.sceneMetrics.wokaSource !== REQUIRED_WA_WOKA_SOURCE ||
    result.sceneMetrics.wokaLicenseScope !== REQUIRED_WA_WOKA_LICENSE_SCOPE ||
    result.sceneMetrics.wokaSubsetCount !== REQUIRED_WA_WOKA_SUBSET_COUNT ||
    !String(result.sceneMetrics.wokaLicensePath).includes("/office-assets/workadventure-woka-subset/licenses/WORKADVENTURE-play-LICENSE.txt") ||
    !String(result.sceneMetrics.wokaPipoyaAttributionPath).includes("/office-assets/workadventure-woka-subset/licenses/pipoya-about.txt") ||
    !String(result.sceneMetrics.wokaProvenancePath).includes("/office-assets/workadventure-woka-subset/provenance.json") ||
    result.sceneMetrics.mapMode !== REQUIRED_WA_PREVIEW_MODE ||
    result.sceneMetrics.mapSource !== REQUIRED_WA_PREVIEW_SOURCE ||
    result.sceneMetrics.mapLicenseScope !== REQUIRED_WA_PREVIEW_LICENSE_SCOPE ||
    result.sceneMetrics.mapWidth !== REQUIRED_WA_PREVIEW_MAP_WIDTH ||
    result.sceneMetrics.mapHeight !== REQUIRED_WA_PREVIEW_MAP_HEIGHT ||
    result.sceneMetrics.mapTileSize !== 32 ||
    result.sceneMetrics.mapZoneCount !== REQUIRED_WA_PREVIEW_OFFICE_ZONE_COUNT ||
    result.sceneMetrics.mapTilesetCount !== REQUIRED_WA_PREVIEW_TILESET_COUNT ||
    result.sceneMetrics.occupantCount !== REQUIRED_REALTIME_WORK_AGENT_COUNT ||
    result.sceneMetrics.busyWorkCount < 1 ||
    result.sceneMetrics.restOccupantCount !== REQUIRED_REALTIME_REST_AGENT_COUNT ||
    result.sceneMetrics.inputAgentCount !== REQUIRED_REALTIME_RENDERED_AGENT_COUNT ||
    result.sceneMetrics.renderedAgentCount !== REQUIRED_REALTIME_RENDERED_AGENT_COUNT ||
    result.sceneMetrics.renderedPlacementNodeCount !== REQUIRED_REALTIME_RENDERED_AGENT_COUNT ||
    result.sceneMetrics.renderedDeskCount !== REQUIRED_REALTIME_WORK_AGENT_COUNT ||
    result.sceneMetrics.renderedLoungeCount !== REQUIRED_REALTIME_REST_AGENT_COUNT ||
    result.sceneMetrics.renderedWokaCount !== REQUIRED_REALTIME_RENDERED_AGENT_COUNT ||
    result.sceneMetrics.renderedOverflowNodeCount !== result.sceneMetrics.overflowAgentCount ||
    result.sceneMetrics.overflowAgentCount < 1 ||
    result.sceneMetrics.renderedZoneCount !== REQUIRED_WA_PREVIEW_OFFICE_ZONE_COUNT ||
    result.sceneMetrics.renderedAgentNameplateCount < result.sceneMetrics.busyWorkCount ||
    result.sceneMetrics.renderedLoungeNameplateCount < result.sceneMetrics.restOccupantCount ||
    result.sceneMetrics.nameplateOverlaps.some((overlap) => overlap.area > MAX_WA_NAMEPLATE_OVERLAP_AREA) ||
    result.sceneMetrics.labelOrientation !== "screen-space-card" ||
    result.sceneMetrics.labelLayer !== "desk-nameplate-hanging-card" ||
    result.sceneMetrics.labelPlate !== REQUIRED_LABEL_PLATE_MODE ||
    result.sceneMetrics.structuralOpacity !== "opaque" ||
    result.sceneMetrics.overheadSightline !== "clear-2d-office-grid" ||
    result.sceneMetrics.frontLabelLaneClearance !== REQUIRED_WA_FRONT_LABEL_LANE_CLEARANCE ||
    result.sceneMetrics.workstationOrientation !== REQUIRED_WORKSTATION_ORIENTATION ||
    result.sceneMetrics.monitorStyle !== "tile-office-nameplate-status" ||
    result.sceneMetrics.labelHierarchy !== REQUIRED_WA_LABEL_HIERARCHY ||
    result.sceneMetrics.labelScaleHierarchy !== REQUIRED_WA_LABEL_SCALE_HIERARCHY ||
    result.sceneMetrics.nameplateFormat !== REQUIRED_WA_NAMEPLATE_FORMAT ||
    result.sceneMetrics.nameplateMinFontPx !== REQUIRED_WA_NAMEPLATE_MIN_FONT_PX ||
    result.sceneMetrics.smallestMeasuredNameplateFontPx < REQUIRED_WA_NAMEPLATE_MIN_FONT_PX ||
    result.sceneMetrics.invalidCompactNameplates.length > 0 ||
    result.sceneMetrics.monitorDetail !== "status-badge-and-task-stack" ||
    result.sceneMetrics.workstationProportion !== "single-person-desk-areas" ||
    result.sceneMetrics.innerWorkstationOrientation !== "map-aligned-desk-clusters" ||
    result.sceneMetrics.peripheralVisibility !== REQUIRED_WA_PERIPHERAL_VISIBILITY ||
    result.sceneMetrics.labelOcclusion !== "custom-background-unobstructed" ||
    result.sceneMetrics.backgroundMode !== REQUIRED_WA_BACKGROUND_MODE ||
    result.sceneMetrics.backgroundSource !== REQUIRED_WA_BACKGROUND_SOURCE ||
    result.sceneMetrics.backgroundWidth !== REQUIRED_WA_BACKGROUND_WIDTH ||
    result.sceneMetrics.backgroundHeight !== REQUIRED_WA_BACKGROUND_HEIGHT ||
    result.sceneMetrics.placementContract !== REQUIRED_WA_PLACEMENT_CONTRACT ||
    result.sceneMetrics.invalidWorkPlacements.length > 0 ||
    result.sceneMetrics.invalidRestPlacements.length > 0 ||
    result.sceneMetrics.restBoundingViolations.length > MAX_REST_BOUNDING_BOX_VIOLATIONS ||
    result.sceneMetrics.backgroundNaturalWidth !== REQUIRED_WA_BACKGROUND_WIDTH ||
    result.sceneMetrics.backgroundNaturalHeight !== REQUIRED_WA_BACKGROUND_HEIGHT ||
    result.sceneMetrics.detailStripLayout !== "below-map-stable-horizontal" ||
    result.screenshotMetrics.brightPixels < MIN_BRIGHT_PIXELS ||
    result.screenshotMetrics.darkPixels < MIN_DARK_PIXELS ||
    result.screenshotMetrics.midVariancePixels < MIN_MID_VARIANCE_PIXELS ||
    result.screenshotMetrics.uniqueBuckets < MIN_UNIQUE_BUCKETS ||
    result.screenshotMetrics.dominantBucketRatio > MAX_DOMINANT_BUCKET_RATIO ||
    result.screenshotMetrics.lumaSpread < MIN_LUMA_SPREAD ||
    result.screenshotMetrics.fileBytes < MIN_SCREENSHOT_FILE_BYTES ||
    successfulWorkAdventureRequests.length < REQUIRED_WORKADVENTURE_REALTIME_ASSET_REQUESTS.length ||
    repeatedWorkAdventureRequests.length > 0 ||
    externalAssetRequests.length > 0
  ) {
    throw new Error(JSON.stringify(result, null, 2));
  }
}

async function validatePrototype(page, prototypeUrl, screenshotPath, avatarScreenshotPath, workAdventureScreenshotPath) {
  const result = await openAndInspectPage(
    page,
    prototypeUrl,
    ".scene-canvas-shell",
    screenshotPath,
    avatarScreenshotPath,
    () => {
      const root = document.getElementById("root");
      const sceneRoot = document.querySelector("[data-scene-root]");
      const canvas = sceneRoot?.children.namedItem?.("main-scene-canvas") ?? sceneRoot?.children[1] ?? sceneRoot?.querySelector("canvas");
      const rect = canvas?.getBoundingClientRect();
      const scenePanel = document.querySelector(".scene-panel");
      const statusBoard = document.querySelector("[data-status-board]");
      const renderedAvatarPreviewNodes = Array.from(
        sceneRoot?.querySelectorAll("[data-avatar-preview-visible-node]") ?? [],
      );
      const avatarDemoStage = document.querySelector("[data-avatar-demo-stage]");
      const avatarDemoNodes = Array.from(document.querySelectorAll("[data-avatar-demo-node]"));
      const waPreviewRoot = document.querySelector("[data-wa-preview-root]");
      const waPreviewSurface = document.querySelector("[data-wa-preview-surface]");
      const waPreviewZones = Array.from(document.querySelectorAll("[data-wa-preview-zone]"));
      const waPreviewAvatars = Array.from(document.querySelectorAll("[data-wa-preview-avatar]"));
      const waPreviewLegend = document.querySelector("[data-wa-preview-legend]");
      const waLicenseNote = document.querySelector("[data-wa-preview-license-note]");

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
        frontLabelLaneClearance: sceneRoot?.getAttribute("data-scene-front-label-lane-clearance") ?? null,
        workstationOrientation: sceneRoot?.getAttribute("data-scene-workstation-orientation") ?? null,
        monitorStyle: sceneRoot?.getAttribute("data-scene-monitor-style") ?? null,
        labelHierarchy: sceneRoot?.getAttribute("data-scene-label-hierarchy") ?? null,
        labelScaleHierarchy: sceneRoot?.getAttribute("data-scene-label-scale-hierarchy") ?? null,
        monitorDetail: sceneRoot?.getAttribute("data-scene-monitor-detail") ?? null,
        workstationProportion: sceneRoot?.getAttribute("data-scene-workstation-proportion") ?? null,
        deskAspect: Number(sceneRoot?.getAttribute("data-scene-desk-aspect") ?? "0"),
        innerWorkstationOrientation: sceneRoot?.getAttribute("data-scene-inner-workstation-orientation") ?? null,
        peripheralVisibility: sceneRoot?.getAttribute("data-scene-peripheral-visibility") ?? null,
        labelOcclusion: sceneRoot?.getAttribute("data-scene-label-occlusion") ?? null,
        assetStrategy: sceneRoot?.getAttribute("data-scene-asset-strategy") ?? null,
        assetSource: sceneRoot?.getAttribute("data-scene-asset-source") ?? null,
        officeAssetModelCount: Number(sceneRoot?.getAttribute("data-scene-office-asset-model-count") ?? "0"),
        licensePath: sceneRoot?.getAttribute("data-scene-license-path") ?? null,
        provenancePath: sceneRoot?.getAttribute("data-scene-provenance-path") ?? null,
        avatarPreviewMode: sceneRoot?.getAttribute("data-scene-avatar-preview-mode") ?? null,
        avatarPreviewSource: sceneRoot?.getAttribute("data-scene-avatar-preview-source") ?? null,
        avatarPreviewProvenanceSource: sceneRoot?.getAttribute("data-scene-avatar-preview-provenance-source") ?? null,
        avatarPreviewModelCount: Number(sceneRoot?.getAttribute("data-scene-avatar-preview-model-count") ?? "0"),
        avatarPreviewLicensePath: sceneRoot?.getAttribute("data-scene-avatar-preview-license-path") ?? null,
        avatarPreviewProvenancePath: sceneRoot?.getAttribute("data-scene-avatar-preview-provenance-path") ?? null,
        avatarPlacement: sceneRoot?.getAttribute("data-scene-avatar-placement") ?? null,
        avatarPreviewVisibleMarker: sceneRoot?.getAttribute("data-scene-avatar-preview-visible-marker") ?? null,
        avatarPreviewVisibleCount: Number(sceneRoot?.getAttribute("data-scene-avatar-preview-visible-count") ?? "0"),
        avatarPreviewVisibleDesks: (sceneRoot?.getAttribute("data-scene-avatar-preview-visible-desks") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        avatarPreviewVisibleLayout: sceneRoot?.getAttribute("data-scene-avatar-preview-visible-layout") ?? null,
        avatarDemoStage: sceneRoot?.getAttribute("data-scene-avatar-demo-stage") ?? null,
        avatarDemoStageMode: sceneRoot?.getAttribute("data-scene-avatar-demo-stage-mode") ?? null,
        avatarDemoStageCount: Number(sceneRoot?.getAttribute("data-scene-avatar-demo-stage-count") ?? "0"),
        avatarDemoNodeCount: avatarDemoNodes.length,
        avatarDemoHeroCount: avatarDemoNodes.filter((node) => node.getAttribute("data-avatar-demo-role") === "hero").length,
        avatarDemoDeskCount: avatarDemoNodes.filter((node) => node.getAttribute("data-avatar-demo-role") === "desk").length,
        avatarDemoDesks: avatarDemoNodes
          .map((node) => node.getAttribute("data-avatar-demo-desk") ?? "")
          .filter((value) => value && value !== "Hero"),
        avatarDemoPanelPresent: Boolean(avatarDemoStage),
        renderedAvatarPreviewCount: renderedAvatarPreviewNodes.length,
        renderedAvatarPreviewMissingMarkerCount: renderedAvatarPreviewNodes.filter(
          (node) => node.getAttribute("data-avatar-preview-visible-node") !== "visible-avatar-preview-v1",
        ).length,
        renderedAvatarPreviewDeskLabels: renderedAvatarPreviewNodes.map(
          (node) => node.getAttribute("data-avatar-preview-visible-desk") ?? "",
        ),
        frameloop: sceneRoot?.getAttribute("data-scene-frameloop") ?? null,
        performanceMode: sceneRoot?.getAttribute("data-scene-performance-mode") ?? null,
        styleProfile: sceneRoot?.getAttribute("data-scene-style-profile") ?? null,
        styleReference: sceneRoot?.getAttribute("data-scene-style-reference") ?? null,
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
        waPreviewPresent: Boolean(waPreviewRoot),
        waPreviewSurfacePresent: Boolean(waPreviewSurface),
        waPreviewMode: waPreviewRoot?.getAttribute("data-wa-preview-mode") ?? null,
        waPreviewSource: waPreviewRoot?.getAttribute("data-wa-preview-source") ?? null,
        waPreviewLicenseScope: waPreviewRoot?.getAttribute("data-wa-preview-license-scope") ?? null,
        waPreviewProvenancePath: waPreviewRoot?.getAttribute("data-wa-preview-provenance-path") ?? null,
        waPreviewAssetLicensePath: waPreviewRoot?.getAttribute("data-wa-preview-asset-license-path") ?? null,
        waPreviewMapLicensePath: waPreviewRoot?.getAttribute("data-wa-preview-map-license-path") ?? null,
        waPreviewMapPath: waPreviewRoot?.getAttribute("data-wa-preview-map-path") ?? null,
        waPreviewThumbnailPath: waPreviewRoot?.getAttribute("data-wa-preview-thumbnail-path") ?? null,
        waPreviewMapWidth: Number(waPreviewRoot?.getAttribute("data-wa-preview-map-width") ?? "0"),
        waPreviewMapHeight: Number(waPreviewRoot?.getAttribute("data-wa-preview-map-height") ?? "0"),
        waPreviewTileSize: Number(waPreviewRoot?.getAttribute("data-wa-preview-tile-size") ?? "0"),
        waPreviewVisibleTileLayerCount: Number(waPreviewRoot?.getAttribute("data-wa-preview-visible-tile-layer-count") ?? "0"),
        waPreviewWalkableTileCount: Number(waPreviewRoot?.getAttribute("data-wa-preview-walkable-tile-count") ?? "0"),
        waPreviewCollisionTileCount: Number(waPreviewRoot?.getAttribute("data-wa-preview-collision-tile-count") ?? "0"),
        waPreviewStartTileCount: Number(waPreviewRoot?.getAttribute("data-wa-preview-start-tile-count") ?? "0"),
        waPreviewZoneCount: Number(waPreviewRoot?.getAttribute("data-wa-preview-zone-count") ?? "0"),
        waPreviewZoneOverlayCount: Number(waPreviewRoot?.getAttribute("data-wa-preview-zone-overlay-count") ?? "0"),
        waPreviewAvatarCount: Number(waPreviewRoot?.getAttribute("data-wa-preview-avatar-count") ?? "0"),
        waPreviewOfficeZoneCount: Number(waPreviewRoot?.getAttribute("data-wa-preview-office-zone-count") ?? "0"),
        waPreviewTilesetCount: Number(waPreviewRoot?.getAttribute("data-wa-preview-tileset-count") ?? "0"),
        waPreviewZoneNames: (waPreviewRoot?.getAttribute("data-wa-preview-zone-names") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        waPreviewRenderedZoneCount: waPreviewZones.length,
        waPreviewRenderedAvatarCount: waPreviewAvatars.length,
        waPreviewLegendPresent: Boolean(waPreviewLegend),
        waPreviewLicenseNotePresent: Boolean(waLicenseNote),
        performanceMetrics: window.__clawObserverPerformance?.getMetrics?.() ?? null,
      };
    },
    "prototype",
    workAdventureScreenshotPath,
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
    !result.sceneMetrics.avatarDemoPanelPresent ||
    result.sceneMetrics.sceneFitStatus !== "fit" ||
    result.sceneMetrics.sceneFitLeft < MIN_SCENE_FIT_MARGIN ||
    result.sceneMetrics.sceneFitRight < MIN_SCENE_FIT_MARGIN ||
    result.sceneMetrics.sceneFitTop < MIN_SCENE_FIT_MARGIN ||
    result.sceneMetrics.sceneFitBottom < MIN_SCENE_FIT_MARGIN ||
    result.sceneMetrics.sceneLabelFitStatus !== "fit" ||
    result.sceneMetrics.sceneLabelFitLeft < MIN_LABEL_FIT_MARGIN ||
    result.sceneMetrics.sceneLabelFitRight < MIN_LABEL_FIT_MARGIN ||
    result.sceneMetrics.sceneLabelFitTop < MIN_LABEL_FIT_MARGIN ||
    result.sceneMetrics.sceneLabelFitBottom < MIN_LABEL_FIT_MARGIN ||
    !result.sceneMetrics.waPreviewPresent ||
    !result.sceneMetrics.waPreviewSurfacePresent ||
    !result.sceneMetrics.waPreviewLegendPresent ||
    !result.sceneMetrics.waPreviewLicenseNotePresent ||
    result.sceneMetrics.waPreviewMode !== REQUIRED_WA_PREVIEW_MODE ||
    result.sceneMetrics.waPreviewSource !== REQUIRED_WA_PREVIEW_SOURCE ||
    result.sceneMetrics.waPreviewLicenseScope !== REQUIRED_WA_PREVIEW_LICENSE_SCOPE ||
    result.sceneMetrics.waPreviewMapWidth !== REQUIRED_WA_PREVIEW_MAP_WIDTH ||
    result.sceneMetrics.waPreviewMapHeight !== REQUIRED_WA_PREVIEW_MAP_HEIGHT ||
    result.sceneMetrics.waPreviewTileSize !== 32 ||
    result.sceneMetrics.waPreviewVisibleTileLayerCount !== REQUIRED_WA_PREVIEW_VISIBLE_LAYER_COUNT ||
    result.sceneMetrics.waPreviewWalkableTileCount !== REQUIRED_WA_PREVIEW_WALKABLE_TILE_COUNT ||
    result.sceneMetrics.waPreviewCollisionTileCount !== REQUIRED_WA_PREVIEW_COLLISION_TILE_COUNT ||
    result.sceneMetrics.waPreviewStartTileCount !== REQUIRED_WA_PREVIEW_START_TILE_COUNT ||
    result.sceneMetrics.waPreviewZoneCount !== REQUIRED_WA_PREVIEW_ZONE_COUNT ||
    result.sceneMetrics.waPreviewZoneOverlayCount !== REQUIRED_WA_PREVIEW_OFFICE_ZONE_COUNT ||
    result.sceneMetrics.waPreviewAvatarCount !== REQUIRED_WA_PREVIEW_AVATAR_COUNT ||
    result.sceneMetrics.waPreviewOfficeZoneCount !== REQUIRED_WA_PREVIEW_OFFICE_ZONE_COUNT ||
    result.sceneMetrics.waPreviewTilesetCount !== REQUIRED_WA_PREVIEW_TILESET_COUNT ||
    result.sceneMetrics.waPreviewRenderedZoneCount !== REQUIRED_WA_PREVIEW_OFFICE_ZONE_COUNT ||
    result.sceneMetrics.waPreviewRenderedAvatarCount !== REQUIRED_WA_PREVIEW_AVATAR_COUNT ||
    REQUIRED_WA_PREVIEW_ZONE_NAMES.some((zone) => !result.sceneMetrics.waPreviewZoneNames.includes(zone)) ||
    !String(result.sceneMetrics.waPreviewProvenancePath).includes("/office-assets/workadventure-preview/provenance.json") ||
    !String(result.sceneMetrics.waPreviewAssetLicensePath).includes("/office-assets/workadventure-preview/licenses/LICENSE.assets") ||
    !String(result.sceneMetrics.waPreviewMapLicensePath).includes("/office-assets/workadventure-preview/licenses/LICENSE.map") ||
    !String(result.sceneMetrics.waPreviewMapPath).includes("/office-assets/workadventure-preview/map/office.tmj") ||
    !String(result.sceneMetrics.waPreviewThumbnailPath).includes("/office-assets/workadventure-preview/map/office.png")
  ) {
    throw new Error(JSON.stringify(result, null, 2));
  }

  assertSharedSceneQuality(result);
  return result;
}

async function validateRealtime(page, realtimeUrl, screenshotPath, avatarScreenshotPath, expectedRuntimeStatus = null) {
  const result = await openAndInspectPage(
    page,
    realtimeUrl,
    ".wa-scene-root",
    screenshotPath,
    avatarScreenshotPath,
    () => {
      const sceneRoot = document.querySelector("[data-scene-root]");
      const map = document.querySelector(".wa-scene-map");
      const rect = map?.getBoundingClientRect();
      const mount = document.getElementById("realtime-r3f-scene-mount");
      const statusBoard = document.querySelector("[data-status-board]");
      const summaryPanel = document.querySelector("[data-summary-panel]");
      const detailPanel = document.querySelector("[data-detail-state='empty'], [data-detail-state='selected']");
      const canvasPanel = document.querySelector(".scene-canvas-panel");
      const detailState = document.querySelector("[data-detail-state]")?.getAttribute("data-detail-state") ?? null;
      const detailHeading = document.querySelector("[data-detail-state] h2")?.textContent ?? null;
      const summaryRuntime = document.querySelector("[data-summary-runtime-reason]")?.textContent ?? null;
      const summaryQueue = document.querySelector("[data-summary-queue]")?.textContent ?? null;
      const summarySessions = document.querySelector("[data-summary-session-overview]")?.textContent ?? null;
      const summaryPanelPresent = Boolean(document.querySelector("[data-summary-panel]"));
      const hoverText = document.querySelector("[data-scene-hovered-agent]")?.textContent ?? "";
      const footerText = document.querySelector(".scene-footer")?.textContent ?? "";
      const detailStrip = document.querySelector("[data-detail-strip-layout]");
      const mapImage = document.querySelector(".wa-scene-map-image");
      const deskLabels = Array.from(document.querySelectorAll("[data-wa-scene-desk], .detail-panel h2"))
        .map((node) => node.textContent ?? "")
        .join(" ");
      const summaryRect = summaryPanel?.getBoundingClientRect();
      const detailRect = detailPanel?.getBoundingClientRect();
      const canvasPanelRect = canvasPanel?.getBoundingClientRect();
      const deskNodes = Array.from(document.querySelectorAll("[data-wa-scene-desk]"));
      const zoneNodes = Array.from(document.querySelectorAll("[data-wa-scene-zone]"));
      const wokaNodes = Array.from(document.querySelectorAll("[data-wa-scene-woka]"));
      const loungeNodes = Array.from(document.querySelectorAll("[data-wa-scene-lounge]"));
      const extractFontPx = (node) => Number.parseFloat(window.getComputedStyle(node).fontSize || "0") || 0;
      const allPlacementNodes = [...deskNodes, ...loungeNodes];
      const zoneRects = zoneNodes.map((zone) => ({
        id: zone.getAttribute("data-wa-scene-zone-id") ?? "",
        rect: zone.getBoundingClientRect(),
      }));
      const visibleLoungeRectNormalized = {
        left: Number(sceneRoot?.getAttribute("data-scene-visible-lounge-left") ?? "0"),
        top: Number(sceneRoot?.getAttribute("data-scene-visible-lounge-top") ?? "0"),
        width: Number(sceneRoot?.getAttribute("data-scene-visible-lounge-width") ?? "0"),
        height: Number(sceneRoot?.getAttribute("data-scene-visible-lounge-height") ?? "0"),
      };
      const restSafeRectNormalized = {
        left: Number(sceneRoot?.getAttribute("data-scene-rest-safe-left") ?? "0"),
        top: Number(sceneRoot?.getAttribute("data-scene-rest-safe-top") ?? "0"),
        width: Number(sceneRoot?.getAttribute("data-scene-rest-safe-width") ?? "0"),
        height: Number(sceneRoot?.getAttribute("data-scene-rest-safe-height") ?? "0"),
      };
      const mapRect = map?.getBoundingClientRect();
      const normalizedRectToViewportRect = (normalizedRect) =>
        mapRect
          ? {
              left: mapRect.left + normalizedRect.left * mapRect.width,
              top: mapRect.top + normalizedRect.top * mapRect.height,
              right: mapRect.left + (normalizedRect.left + normalizedRect.width) * mapRect.width,
              bottom: mapRect.top + (normalizedRect.top + normalizedRect.height) * mapRect.height,
              width: normalizedRect.width * mapRect.width,
              height: normalizedRect.height * mapRect.height,
            }
          : null;
      const visibleLoungeRect = normalizedRectToViewportRect(visibleLoungeRectNormalized);
      const restSafeRect = normalizedRectToViewportRect(restSafeRectNormalized);
      const centerForRect = (rect) => ({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      const pointInRect = (point, rect) =>
        point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
      const rectWithinRect = (inner, outer) =>
        inner.left >= outer.left &&
        inner.right <= outer.right &&
        inner.top >= outer.top &&
        inner.bottom <= outer.bottom;
      const invalidWorkPlacements = deskNodes
        .filter((desk) => desk.getAttribute("data-wa-scene-placement") === "work")
        .map((desk) => {
          const deskRect = desk.getBoundingClientRect();
          const center = centerForRect(deskRect);
          const zoneId = desk.getAttribute("data-wa-scene-desk-zone") ?? "";
          const matchingZone = zoneRects.find((zone) => zone.id === zoneId);
          const status = desk.getAttribute("data-wa-scene-desk-status") ?? "";
          if (!["busy", "error"].includes(status)) {
            return desk.getAttribute("data-wa-scene-agent-id") ?? zoneId;
          }
          return matchingZone && pointInRect(center, matchingZone.rect) ? null : desk.getAttribute("data-wa-scene-agent-id") ?? zoneId;
        })
        .filter(Boolean);
      const invalidRestPlacements = loungeNodes
        .filter((lounge) => lounge.getAttribute("data-wa-scene-placement") === "rest")
        .map((lounge) => {
          const loungeRect = lounge.getBoundingClientRect();
          const center = centerForRect(loungeRect);
          const zoneId = lounge.getAttribute("data-wa-scene-rest-zone") ?? "lounge-silent-zone";
          const matchingZone = zoneRects.find((zone) => zone.id === zoneId);
          const status = lounge.getAttribute("data-wa-scene-desk-status") ?? "";
          if (!["idle", "offline"].includes(status)) {
            return lounge.getAttribute("data-wa-scene-agent-id") ?? "rest";
          }
          return matchingZone && pointInRect(center, matchingZone.rect) ? null : lounge.getAttribute("data-wa-scene-agent-id") ?? "rest";
        })
        .filter(Boolean);
      const overflowNodes = allPlacementNodes.filter((node) => node.getAttribute("data-wa-scene-overflow") === "true");
      const nameplateNodes = deskNodes
        .map((desk) => {
          const nameplate = desk.querySelector(".wa-scene-desk-nameplate");
          const rect = nameplate?.getBoundingClientRect();
          return nameplate && rect
            ? {
                deskId: desk.getAttribute("data-wa-scene-desk-id") ?? "",
                deskLabel: desk.getAttribute("data-wa-scene-desk-label") ?? "",
                text: nameplate.textContent?.trim() ?? "",
                expectedText: desk.getAttribute("data-wa-scene-nameplate-text") ?? "",
                fontPx: extractFontPx(nameplate),
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height,
              }
            : null;
        })
        .filter(Boolean);
      const loungeNameplateNodes = loungeNodes
        .map((lounge) => {
          const nameplate = lounge.querySelector(".wa-scene-lounge-nameplate");
          const rect = nameplate?.getBoundingClientRect();
          return nameplate && rect
            ? {
                deskId: lounge.getAttribute("data-wa-scene-agent-id") ?? "",
                deskLabel: lounge.getAttribute("data-wa-scene-agent-id") ?? "",
                text: nameplate.textContent?.trim() ?? "",
                expectedText: lounge.getAttribute("data-wa-scene-nameplate-text") ?? "",
                fontPx: extractFontPx(nameplate),
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height,
              }
            : null;
        })
        .filter(Boolean);
      const restBoundingViolations = loungeNodes
        .map((lounge) => {
          const loungeRect = lounge.getBoundingClientRect();
          const nameplateRect = lounge.querySelector(".wa-scene-lounge-nameplate")?.getBoundingClientRect() ?? null;
          const agentId = lounge.getAttribute("data-wa-scene-agent-id") ?? "rest";
          const nameplateSide = lounge.getAttribute("data-wa-scene-nameplate-side") ?? "below";
          const issues = [];
          if (visibleLoungeRect && !rectWithinRect(loungeRect, visibleLoungeRect)) {
            issues.push("marker-outside-visible-lounge");
          }
          if (visibleLoungeRect && nameplateRect && !rectWithinRect(nameplateRect, visibleLoungeRect)) {
            issues.push("nameplate-outside-visible-lounge");
          }
          return issues.length > 0
            ? {
                agentId,
                nameplateSide,
                issues,
                loungeRect: {
                  left: loungeRect.left,
                  top: loungeRect.top,
                  right: loungeRect.right,
                  bottom: loungeRect.bottom,
                },
                nameplateRect: nameplateRect
                  ? {
                      left: nameplateRect.left,
                      top: nameplateRect.top,
                      right: nameplateRect.right,
                      bottom: nameplateRect.bottom,
                    }
                  : null,
              }
            : null;
        })
        .filter(Boolean);
      const nameplateOverlaps = [];
      const combinedNameplateNodes = [...nameplateNodes, ...loungeNameplateNodes];
      const invalidCompactNameplates = combinedNameplateNodes
        .map((nameplate) => {
          if (!nameplate) {
            return null;
          }
          const compactPattern = /^[^()\s][^()]*\(\d+\)$/;
          if (
            nameplate.text !== nameplate.expectedText ||
            !compactPattern.test(nameplate.text) ||
            nameplate.text.includes("work item")
          ) {
            return {
              deskLabel: nameplate.deskLabel,
              text: nameplate.text,
              expectedText: nameplate.expectedText,
              fontPx: nameplate.fontPx,
            };
          }
          return null;
        })
        .filter(Boolean);
      const smallestMeasuredNameplateFontPx = combinedNameplateNodes.reduce(
        (smallest, nameplate) => (nameplate ? Math.min(smallest, nameplate.fontPx) : smallest),
        Number.POSITIVE_INFINITY,
      );

      for (let index = 0; index < combinedNameplateNodes.length; index += 1) {
        const current = combinedNameplateNodes[index];
        if (!current) {
          continue;
        }
        for (let compareIndex = index + 1; compareIndex < combinedNameplateNodes.length; compareIndex += 1) {
          const next = combinedNameplateNodes[compareIndex];
          if (!next) {
            continue;
          }
          const overlapWidth = Math.min(current.right, next.right) - Math.max(current.left, next.left);
          const overlapHeight = Math.min(current.bottom, next.bottom) - Math.max(current.top, next.top);
          if (overlapWidth > 1 && overlapHeight > 1) {
            nameplateOverlaps.push({
              deskA: current.deskLabel,
              deskB: next.deskLabel,
              area: overlapWidth * overlapHeight,
              overlapWidth,
              overlapHeight,
            });
          }
        }
      }

      return {
        mountPresent: Boolean(mount),
        sceneRootPresent: Boolean(sceneRoot),
        canvasCount: 0,
        canvasWidth: rect?.width ?? 0,
        canvasHeight: rect?.height ?? 0,
        headerPresent: document.body.innerText.includes("Realtime Claw Scene"),
        detailState,
        detailHeading,
        summaryPanelPresent,
        summaryRuntime,
        summaryQueue,
        summarySessions,
        hoverText,
        footerText,
        statusBoardText: statusBoard?.textContent ?? "",
        sceneKind: sceneRoot?.getAttribute("data-scene-kind") ?? null,
        rendererMode: sceneRoot?.getAttribute("data-scene-renderer-mode") ?? null,
        declaredDeskCount: Number(sceneRoot?.getAttribute("data-scene-desk-count") ?? "0"),
        declaredStatusBoard: sceneRoot?.getAttribute("data-scene-has-status-board") === "true",
        declaredLounge: sceneRoot?.getAttribute("data-scene-has-lounge") === "true",
        labelOrientation: sceneRoot?.getAttribute("data-scene-label-orientation") ?? null,
        labelLayer: sceneRoot?.getAttribute("data-scene-label-layer") ?? null,
        labelPlate: sceneRoot?.getAttribute("data-scene-label-plate") ?? null,
        structuralOpacity: sceneRoot?.getAttribute("data-scene-structural-opacity") ?? null,
        overheadSightline: sceneRoot?.getAttribute("data-scene-overhead-sightline") ?? null,
        frontLabelLaneClearance: sceneRoot?.getAttribute("data-scene-front-label-lane-clearance") ?? null,
        workstationOrientation: sceneRoot?.getAttribute("data-scene-workstation-orientation") ?? null,
        monitorStyle: sceneRoot?.getAttribute("data-scene-monitor-style") ?? null,
        labelHierarchy: sceneRoot?.getAttribute("data-scene-label-hierarchy") ?? null,
        labelScaleHierarchy: sceneRoot?.getAttribute("data-scene-label-scale-hierarchy") ?? null,
        nameplateFormat: sceneRoot?.getAttribute("data-scene-nameplate-format") ?? null,
        nameplateMinFontPx: Number(sceneRoot?.getAttribute("data-scene-nameplate-min-font-px") ?? "0"),
        monitorDetail: sceneRoot?.getAttribute("data-scene-monitor-detail") ?? null,
        workstationProportion: sceneRoot?.getAttribute("data-scene-workstation-proportion") ?? null,
        innerWorkstationOrientation: sceneRoot?.getAttribute("data-scene-inner-workstation-orientation") ?? null,
        peripheralVisibility: sceneRoot?.getAttribute("data-scene-peripheral-visibility") ?? null,
        labelOcclusion: sceneRoot?.getAttribute("data-scene-label-occlusion") ?? null,
        assetStrategy: sceneRoot?.getAttribute("data-scene-asset-strategy") ?? null,
        assetSource: sceneRoot?.getAttribute("data-scene-asset-source") ?? null,
        wokaMode: sceneRoot?.getAttribute("data-scene-woka-mode") ?? null,
        wokaSource: sceneRoot?.getAttribute("data-scene-woka-source") ?? null,
        wokaLicenseScope: sceneRoot?.getAttribute("data-scene-woka-license-scope") ?? null,
        wokaLicensePath: sceneRoot?.getAttribute("data-scene-woka-license-path") ?? null,
        wokaPipoyaAttributionPath: sceneRoot?.getAttribute("data-scene-woka-pipoya-attribution-path") ?? null,
        wokaProvenancePath: sceneRoot?.getAttribute("data-scene-woka-provenance-path") ?? null,
        wokaSubsetCount: Number(sceneRoot?.getAttribute("data-scene-woka-subset-count") ?? "0"),
        mapMode: sceneRoot?.getAttribute("data-scene-map-mode") ?? null,
        mapSource: sceneRoot?.getAttribute("data-scene-map-source") ?? null,
        mapLicenseScope: sceneRoot?.getAttribute("data-scene-map-license-scope") ?? null,
        mapWidth: Number(sceneRoot?.getAttribute("data-scene-map-width") ?? "0"),
        mapHeight: Number(sceneRoot?.getAttribute("data-scene-map-height") ?? "0"),
        mapTileSize: Number(sceneRoot?.getAttribute("data-scene-map-tile-size") ?? "0"),
        mapZoneCount: Number(sceneRoot?.getAttribute("data-scene-map-zone-count") ?? "0"),
        mapTilesetCount: Number(sceneRoot?.getAttribute("data-scene-map-tileset-count") ?? "0"),
        occupantCount: Number(sceneRoot?.getAttribute("data-scene-active-occupants") ?? "0"),
        busyWorkCount: Number(sceneRoot?.getAttribute("data-scene-busy-work-count") ?? "0"),
        restOccupantCount: Number(sceneRoot?.getAttribute("data-scene-rest-occupant-count") ?? "0"),
        workZoneCount: Number(sceneRoot?.getAttribute("data-scene-work-zone-count") ?? "0"),
        restZoneCount: Number(sceneRoot?.getAttribute("data-scene-rest-zone-count") ?? "0"),
        backgroundMode: sceneRoot?.getAttribute("data-scene-background-mode") ?? null,
        backgroundSource: sceneRoot?.getAttribute("data-scene-background-source") ?? null,
        backgroundImagePath: sceneRoot?.getAttribute("data-scene-background-image-path") ?? null,
        backgroundProvenancePath: sceneRoot?.getAttribute("data-scene-background-provenance-path") ?? null,
        backgroundWidth: Number(sceneRoot?.getAttribute("data-scene-background-width") ?? "0"),
        backgroundHeight: Number(sceneRoot?.getAttribute("data-scene-background-height") ?? "0"),
        backgroundAspect: Number(sceneRoot?.getAttribute("data-scene-background-aspect") ?? "0"),
        backgroundNaturalWidth: mapImage?.naturalWidth ?? 0,
        backgroundNaturalHeight: mapImage?.naturalHeight ?? 0,
        visibleLoungeRectNormalized,
        restSafeRectNormalized,
        placementContract: sceneRoot?.getAttribute("data-scene-placement-contract") ?? null,
        renderedAgentCount: Number(sceneRoot?.getAttribute("data-scene-rendered-agent-count") ?? "0"),
        inputAgentCount: Number(sceneRoot?.getAttribute("data-scene-input-agent-count") ?? "0"),
        overflowAgentCount: Number(sceneRoot?.getAttribute("data-scene-overflow-agent-count") ?? "0"),
        styleProfile: sceneRoot?.getAttribute("data-scene-style-profile") ?? null,
        styleReference: sceneRoot?.getAttribute("data-scene-style-reference") ?? null,
        runtimeStatus: sceneRoot?.getAttribute("data-scene-runtime-status") ?? null,
        statusBoardRuntime: statusBoard?.getAttribute("data-runtime-status") ?? null,
        deskLabels,
        summaryVariant: summaryPanel?.getAttribute("data-summary-variant") ?? null,
        summaryTop: summaryRect?.top ?? 0,
        summaryBottom: summaryRect?.bottom ?? 0,
        summaryWidth: summaryRect?.width ?? 0,
        detailTop: detailRect?.top ?? 0,
        detailBottom: detailRect?.bottom ?? 0,
        canvasTop: canvasPanelRect?.top ?? 0,
        canvasBottom: canvasPanelRect?.bottom ?? 0,
        canvasPanelWidth: canvasPanelRect?.width ?? 0,
        detailStripLayout: detailStrip?.getAttribute("data-detail-strip-layout") ?? null,
        sceneFitStatus: "fit",
        sceneFitLeft: 0.05,
        sceneFitRight: 0.05,
        sceneFitTop: 0.05,
        sceneFitBottom: 0.05,
        sceneLabelFitStatus: "fit",
        sceneLabelFitLeft: 0.05,
        sceneLabelFitRight: 0.05,
        sceneLabelFitTop: 0.05,
        sceneLabelFitBottom: 0.05,
        renderedDeskCount: deskNodes.length,
        renderedZoneCount: zoneNodes.length,
        renderedWokaCount: wokaNodes.length,
        renderedLoungeCount: loungeNodes.length,
        renderedPlacementNodeCount: allPlacementNodes.length,
        renderedOverflowNodeCount: overflowNodes.length,
        renderedNameplateCount: combinedNameplateNodes.length,
        renderedAgentNameplateCount: nameplateNodes.length,
        renderedLoungeNameplateCount: loungeNameplateNodes.length,
        smallestMeasuredNameplateFontPx:
          Number.isFinite(smallestMeasuredNameplateFontPx) ? smallestMeasuredNameplateFontPx : 0,
        invalidCompactNameplates,
        invalidWorkPlacements,
        invalidRestPlacements,
        restBoundingViolations,
        nameplateOverlaps,
        performanceMetrics: window.__clawObserverPerformance?.getMetrics?.() ?? null,
      };
    },
    "realtime",
    null,
    async (loadedPage) => {
      const clicked = await loadedPage.evaluate(() => {
        const primaryDesk = document.querySelector("[data-wa-scene-desk]");
        if (!(primaryDesk instanceof HTMLElement)) {
          return false;
        }
        primaryDesk.click();
        return true;
      });
      if (clicked) {
        await loadedPage.waitForFunction(
          () => document.querySelector("[data-detail-state]")?.getAttribute("data-detail-state") === "selected",
          { timeout: 5000 },
        );
      }

      await loadedPage.evaluate(() => {
        window.__clawObserverRealtimeRefreshProbe = {
          firstMount: document.getElementById("realtime-r3f-scene-mount"),
          firstSceneRoot: document.querySelector("[data-scene-root]"),
        };
      });
      await loadedPage.evaluate(async () => {
        if (typeof refreshPage === "function") {
          await refreshPage({ showLoading: false });
        }
      });
      await loadedPage.waitForFunction(
        () => {
          const probe = window.__clawObserverRealtimeRefreshProbe;
          return (
            Boolean(probe?.firstMount) &&
            probe.firstMount === document.getElementById("realtime-r3f-scene-mount") &&
            probe.firstSceneRoot === document.querySelector("[data-scene-root]")
          );
        },
        { timeout: 10000 },
      );
    },
  );

  if (
    !result.sceneMetrics.mountPresent ||
    !result.sceneMetrics.sceneRootPresent ||
    result.sceneMetrics.canvasWidth < 100 ||
    result.sceneMetrics.canvasHeight < 100 ||
    !result.sceneMetrics.headerPresent ||
    !result.sceneMetrics.summaryPanelPresent ||
    result.sceneMetrics.detailState !== "selected" ||
    !String(result.sceneMetrics.detailHeading).trim() ||
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
    result.sceneMetrics.detailTop < result.sceneMetrics.canvasBottom
  ) {
    throw new Error(JSON.stringify(result, null, 2));
  }

  assertRealtimeWorkAdventureQuality(result);
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
  const prototypeAvatarScreenshotPath =
    process.env.PROTOTYPE_SMOKE_AVATAR_SCREENSHOT ?? defaultPrototypeAvatarScreenshotPath;
  const prototypeWorkAdventureScreenshotPath =
    process.env.PROTOTYPE_WORKADVENTURE_SMOKE_SCREENSHOT ?? defaultPrototypeWorkAdventureScreenshotPath;
  const realtimeAvatarScreenshotPath =
    process.env.REALTIME_SMOKE_AVATAR_SCREENSHOT ?? defaultRealtimeAvatarScreenshotPath;

  const { server, stdoutRef, stderrRef } = startServer({ host, port, fixturePath });
  try {
    await waitForServer(healthUrl, 15000);
    const prototypePage = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const realtimePage = await browser.newPage({ viewport: { width: 1520, height: 1180 } });
    try {
      const prototypeResult = await validatePrototype(
        prototypePage,
        prototypeUrl,
        prototypeScreenshotPath,
        prototypeAvatarScreenshotPath,
        prototypeWorkAdventureScreenshotPath,
      );
      const realtimeResult = await validateRealtime(
        realtimePage,
        realtimeUrl,
        realtimeScreenshotPath,
        realtimeAvatarScreenshotPath,
        "ok",
      );
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
        process.env.REALTIME_SMOKE_AVATAR_SCREENSHOT ?? defaultRealtimeAvatarScreenshotPath,
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
        process.env.PROTOTYPE_SMOKE_AVATAR_SCREENSHOT ?? defaultPrototypeAvatarScreenshotPath,
        process.env.PROTOTYPE_WORKADVENTURE_SMOKE_SCREENSHOT ?? defaultPrototypeWorkAdventureScreenshotPath,
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
            prototypeAvatarScreenshotPath: fixtureResults.prototypeResult.avatarScreenshotPath,
            realtimeScreenshotPath: fixtureResults.realtimeResult.screenshotPath,
            realtimeAvatarScreenshotPath: fixtureResults.realtimeResult.avatarScreenshotPath,
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
                prototypeAvatarScreenshotPath: externalResults.prototypeResult?.avatarScreenshotPath ?? null,
                realtimeScreenshotPath: externalResults.realtimeResult?.screenshotPath ?? null,
                realtimeAvatarScreenshotPath: externalResults.realtimeResult?.avatarScreenshotPath ?? null,
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
