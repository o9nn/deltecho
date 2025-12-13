// src/session-store.ts
import { Store } from "express-session";
const FileStore = class extends Store {
  constructor(localstorage) {
    super();
    this.localstorage = localstorage;
  }
  get(sid, callback) {
    try {
      const rawSession = this.localstorage.getItem(`session_${sid}`);
      callback(null, rawSession ? JSON.parse(rawSession) : null);
    } catch (error) {
      callback(error);
    }
  }
  set(sid, session2, callback) {
    try {
      this.localstorage.setItem(`session_${sid}`, JSON.stringify(session2));
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }
  destroy(sid, callback) {
    try {
      this.localstorage.removeItem(`session_${sid}`);
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }
};

// src/middlewares.ts
function CORSMiddleWare(_req, res, next) {
  res.header("Access-Control-Allow-Origin", "localhost");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
}
function authMiddleWare(req, res, next) {
  if (!req.session.isAuthenticated) {
    res.status(401);
    return res.send("Not Authenticated");
  } else {
    next();
  }
}

// ../shared/state.ts
function getDefaultState() {
  return {
    bounds: {},
    HTMLEmailWindowBounds: void 0,
    enterKeySends: false,
    notifications: true,
    showNotificationContent: true,
    locale: null,
    // if this is null, the system chooses the system language that electron reports
    credentials: void 0,
    lastAccount: void 0,
    enableAVCalls: false,
    enableBroadcastLists: false,
    enableChatAuditLog: false,
    enableOnDemandLocationStreaming: false,
    chatViewBgImg: void 0,
    lastChats: {},
    zoomFactor: 1,
    activeTheme: "system",
    minimizeToTray: true,
    syncAllAccounts: true,
    lastSaveDialogLocation: void 0,
    experimentalEnableMarkdownInMessages: false,
    enableWebxdcDevTools: false,
    HTMLEmailAskForRemoteLoadingConfirmation: true,
    HTMLEmailAlwaysLoadRemoteContent: false,
    enableRelatedChats: false,
    galleryImageKeepAspectRatio: false,
    useSystemUIFont: false,
    contentProtectionEnabled: false,
    isMentionsEnabled: true,
    autostart: true
  };
}

// ../shared/logger.ts
import errorStackParser from "error-stack-parser";
const startTime = Date.now();
const colorize = (light, code) => (str) => "\x1B[" + light + ";" + code + "m" + str + "\x1B[0m";
const blue = colorize(1, 34);
const red = colorize(1, 31);
const yellow = colorize(1, 33);
const grey = colorize(0, 37);
const green = colorize(1, 37);
const cyan = colorize(1, 36);
const emojiFontCss = 'font-family: Roboto, "Apple Color Emoji", NotoEmoji, "Helvetica Neue", Arial, Helvetica, NotoMono, sans-serif !important;';
var LogLevelString = /* @__PURE__ */ ((LogLevelString2) => {
  LogLevelString2["DEBUG"] = "DEBUG";
  LogLevelString2["WARNING"] = "WARNING";
  LogLevelString2["INFO"] = "INFO";
  LogLevelString2["ERROR"] = "ERROR";
  LogLevelString2["CRITICAL"] = "CRITICAL";
  return LogLevelString2;
})(LogLevelString || {});
const LoggerVariants = [
  {
    log: console.debug,
    level: "DEBUG" /* DEBUG */,
    emoji: "\u{1F578}\uFE0F",
    symbol: "[D]"
  },
  {
    log: console.info,
    level: "INFO" /* INFO */,
    emoji: "\u2139\uFE0F",
    symbol: blue("[i]")
  },
  {
    log: console.warn,
    level: "WARNING" /* WARNING */,
    emoji: "\u26A0\uFE0F",
    symbol: yellow("[w]")
  },
  {
    log: console.error,
    level: "ERROR" /* ERROR */,
    emoji: "\u{1F6A8}",
    symbol: red("[E]")
  },
  {
    log: console.error,
    level: "CRITICAL" /* CRITICAL */,
    emoji: "\u{1F6A8}\u{1F6A8}",
    symbol: red("[C]")
  }
];
function printProcessLogLevelInfo() {
  console.info(
    `%cLogging Levels:
${LoggerVariants.map((v) => `${v.emoji} ${v.level}`).join(
      "\n"
    )}`,
    emojiFontCss
  );
  console.info(
    `# Tips and Tricks for using the search filter in the browser console:

\u2022 Use space to separate search terms
\u2022 Exclude search terms using -
\u2022 If the search term contains spaces you should escape it with ""

Examples:

\u{1F578}\uFE0F          only show debug messages
-\u{1F578}\uFE0F         don't show debug messages
\u2139\uFE0F          only show info messages
-\u2139\uFE0F         don't show info messages
\u{1F47B}          only show events from background accounts (not selected accounts)
-\u{1F47B}         don't show events from background accounts (not selected accounts)
\u{1F4E1}          only show events
-\u{1F4E1}         don't show any events
[JSONRPC]   only show jsonrpc messages
-[JSONRPC]  don't show jsonrpc messages

Start deltachat with --devmode (or --log-debug and --log-to-console) argument to show full log output.
If the log seems quiet, make sure the 'All levels' drop down has 'Verbose' checked.
  `
  );
}
let handler;
let rc = {};
function setLogHandler(LogHandler, rcObject) {
  handler = LogHandler;
  rc = rcObject;
}
function log({ channel, isMainProcess }, level, stacktrace, args) {
  const variant = LoggerVariants[level];
  if (!handler) {
    console.log("Failed to log message - Handler not initialized yet");
    console.log(`Log Message: ${channel} ${level} ${args.join(" ")}`);
    throw Error("Failed to log message - Handler not initialized yet");
  }
  handler(channel, variant.level, stacktrace, ...args);
  if (rc["log-to-console"]) {
    if (isMainProcess) {
      const beginning = `${Math.round((Date.now() - startTime) / 100) / 10}s ${LoggerVariants[level].symbol}${grey(channel)}:`;
      if (!stacktrace) {
        variant.log(beginning, ...args);
      } else {
        variant.log(
          beginning,
          ...args,
          red(
            Array.isArray(stacktrace) ? stacktrace.map((s) => `
${s.toString()}`).join() : stacktrace
          )
        );
      }
    } else {
      const prefix = `%c${variant.emoji}%c${channel}`;
      const prefixStyle = [emojiFontCss, "color:blueviolet;"];
      if (stacktrace) {
        variant.log(prefix, ...prefixStyle, stacktrace, ...args);
      } else {
        variant.log(prefix, ...prefixStyle, ...args);
      }
    }
  }
}
function getStackTrace() {
  const rawStack = errorStackParser.parse(
    new Error("Get Stacktrace")
  );
  const stack = rawStack.slice(2, rawStack.length);
  return rc["machine-readable-stacktrace"] ? stack : stack.map((s) => `
${s.toString()}`).join();
}
const Logger = class {
  constructor(channel) {
    this.channel = channel;
    //@ts-ignore
    this.isMainProcess = typeof window === "undefined";
    if (channel === "core/event") {
      this.getStackTrace = () => "";
    }
  }
  getStackTrace() {
    const rawStack = errorStackParser.parse(
      new Error("Get Stacktrace")
    );
    const stack = rawStack.slice(2, rawStack.length);
    return rc["machine-readable-stacktrace"] ? stack : stack.map((s) => `
${s.toString()}`).join();
  }
  debug(...args) {
    if (!rc["log-debug"]) return;
    log(this, 0, "", args);
  }
  info(...args) {
    log(this, 1, "", args);
  }
  warn(...args) {
    log(this, 2, this.getStackTrace(), args);
  }
  error(...args) {
    log(this, 3, this.getStackTrace(), args);
  }
  /** use this when you know that the stacktrace is not relevant */
  errorWithoutStackTrace(...args) {
    log(this, 3, [], args);
  }
  critical(...args) {
    log(this, 4, this.getStackTrace(), args);
  }
};
function getLogger(channel) {
  return new Logger(channel);
}
if (!("toJSON" in Error.prototype))
  Object.defineProperty(Error.prototype, "toJSON", {
    value: function() {
      const alt = {};
      Object.getOwnPropertyNames(this).forEach(function(key) {
        alt[key] = this[key];
      }, this);
      return alt;
    },
    configurable: true,
    writable: true
  });

// src/config.ts
import { LocalStorage as LocalStorage2 } from "node-localstorage";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "path";
import { config } from "dotenv";
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../") + ".env" });
const DIST_DIR = join(__dirname);
const DATA_DIR = join(__dirname, "../data");
const LOGS_DIR = join(DATA_DIR, "logs");
const PRIVATE_CERTIFICATE_KEY = join(
  DATA_DIR,
  "certificate/cert.key.pem"
);
const PRIVATE_CERTIFICATE_CERT = join(DATA_DIR, "certificate/cert.pem");
let DC_ACCOUNTS_DIR = join(DATA_DIR, "accounts");
const LOCALES_DIR = join(__dirname, "../../../_locales");
const ENV_WEB_PASSWORD = process.env["WEB_PASSWORD"];
const ENV_WEB_PORT = process.env["WEB_PORT"] || 3e3;
const ENV_WEB_TRUST_FIRST_PROXY = Boolean(
  process.env["WEB_TRUST_FIRST_PROXY"]
);
if (process.env["DC_ACCOUNTS_DIR"]) {
  DC_ACCOUNTS_DIR = join(__dirname, process.env["DC_ACCOUNTS_DIR"]);
}
const NODE_ENV = (process.env["NODE_ENV"] ?? "production").toLowerCase();
if (!existsSync(DATA_DIR)) {
  console.log(
    "\n[ERROR]: Data dir does not exist, make sure you follow the steps in the Readme file\n"
  );
  process.exit(1);
}
mkdirSync(LOGS_DIR, { recursive: true });
if (!existsSync(PRIVATE_CERTIFICATE_KEY) && !process.env["PRIVATE_CERTIFICATE_KEY"]) {
  console.log(
    `
[ERROR]: Certificate at "${PRIVATE_CERTIFICATE_KEY}" not exist, make sure you follow the steps in the Readme file
`
  );
  process.exit(1);
}
if (!ENV_WEB_PASSWORD && NODE_ENV !== "test") {
  console.log(
    `
[ERROR]: Environment Variable WEB_PASSWORD is not set. You need to set it.
`
  );
  process.exit(1);
}
const localStorage = new LocalStorage2(
  join(DATA_DIR, "browser-runtime-data")
);

// src/get-build-info.ts
const BuildInfo = JSON.parse('{"VERSION":"1.58.2","BUILD_TIMESTAMP":1748601108848,"GIT_REF":"v1.48.0-670-g896ac3964"}');

// src/rc-config.ts
const RCConfig = {
  "log-debug": true,
  // should become real
  "log-to-console": true,
  // should become real
  "machine-readable-stacktrace": false,
  // should become real
  devmode: true,
  // should become real
  theme: void 0,
  // maybe real
  "theme-watch": false,
  // maybe real
  "translation-watch": false,
  // maybe real
  "allow-unsafe-core-replacement": false,
  //maybe real when we implement it
  // those do not apply to browser
  minimized: false,
  version: false,
  v: false,
  help: false,
  h: false
};

// src/backendApi.ts
import express2, { json as BodyParserJson, Router } from "express";
import { mkdtemp, writeFile, unlink, rm, mkdir, copyFile } from "fs/promises";
import { basename, extname, join as join2 } from "path";
import { tmpdir } from "os";
const log2 = getLogger("main/BackendApiRoute");
const BackendApiRoute = Router();
BackendApiRoute.use(authMiddleWare);
BackendApiRoute.get("/rc_config", (_req, res) => {
  res.status(200).json(RCConfig);
});
BackendApiRoute.get("/runtime_info", (_req, res) => {
  const runtimeInfo = {
    buildInfo: BuildInfo,
    isAppx: false,
    isMac: false,
    // this has an alternative frameless design that we don't want in browser
    target: "browser",
    versions: [],
    isContentProtectionSupported: false
  };
  res.status(200).json(runtimeInfo);
});
const Config = {
  ...getDefaultState(),
  minimizeToTray: false,
  // does not exist in browser
  ...JSON.parse(localStorage.getItem("config") || "{}")
};
const allowedKeys = Object.keys(getDefaultState());
BackendApiRoute.get("/config", (_req, res) => {
  res.json(Config);
});
BackendApiRoute.post("/config/:key", BodyParserJson(), (req, res) => {
  const key = req.params.key;
  const value = req.body.new_value;
  if (allowedKeys.includes(key)) {
    ;
    Config[key] = value;
    localStorage.setItem("config", JSON.stringify(Config));
    res.status(201).send();
  } else {
    res.status(404).send({ message: `config key ${key} is not known` });
  }
});
BackendApiRoute.post(
  "/uploadTempFile/:filename",
  express2.raw({
    type: () => {
      return true;
    },
    limit: "500mb"
  }),
  async (req, res) => {
    try {
      const tmpFile = req.body;
      const filename = basename(req.params.filename);
      const tmppath = await mkdtemp(join2(tmpdir(), "tmp-"));
      const filepath = join2(tmppath, filename);
      await writeFile(filepath, tmpFile, "binary");
      res.status(200).send({ path: filepath });
    } catch (error) {
      log2.debug("uploadTempFile: error", {
        error,
        filename: req.params.filename
      });
      res.status(500).json({ message: "Failed to create Tempfile" });
    }
  }
);
BackendApiRoute.post(
  "/uploadTempFileB64/:filename",
  express2.raw({
    type: () => {
      return true;
    },
    limit: "500mb"
  }),
  async (req, res) => {
    try {
      const tmpFilebin = Buffer.from(req.body.toString(), "base64");
      const filename = basename(req.params.filename);
      const tmppath = await mkdtemp(join2(tmpdir(), "tmp-"));
      const filepath = join2(tmppath, filename);
      await writeFile(filepath, tmpFilebin, "binary");
      res.status(200).send({ path: filepath });
    } catch (error) {
      res.status(500).json({ message: "Failed to create Tempfile" });
    }
  }
);
BackendApiRoute.post(
  "/removeTempFile",
  express2.raw({
    type: () => {
      return true;
    }
  }),
  async (req, res) => {
    try {
      const filepath = req.body.toString("utf8");
      if (filepath.includes("tmp") && !filepath.includes("..")) {
        await unlink(filepath);
      }
      res.status(200).json({ status: "ok" });
    } catch (e) {
      log2.error(e);
      res.status(500).json({ status: "error" });
    }
  }
);
BackendApiRoute.post(
  "/saveBackgroundImage",
  express2.json(),
  async (req, res) => {
    const {
      file,
      isDefaultPicture
    } = req.body;
    const originalFilePath = !isDefaultPicture ? file : join2(DIST_DIR, "images/backgrounds/", file);
    const bgDir = join2(DATA_DIR, "background");
    await rm(bgDir, { recursive: true, force: true });
    await mkdir(bgDir, { recursive: true });
    const fileName = `background_${Date.now()}` + extname(originalFilePath);
    const newPath = join2(DATA_DIR, "background", fileName);
    try {
      await copyFile(originalFilePath, newPath);
    } catch (error) {
      log2.error("BG-IMG Copy Failed", error);
      throw error;
    }
    res.json({ result: `img: ${fileName.replace(/\\/g, "/")}` });
  }
);

// src/deltachat-rpc.ts
import { spawn } from "child_process";
import { getRPCServerPath } from "@deltachat/stdio-rpc-server";
import { BaseDeltaChat, yerpc } from "@deltachat/jsonrpc-client";
import { WebSocketServer } from "ws";
import { join as join3 } from "path";
const log3 = getLogger("main/dc_wss");
const logCoreEvent = getLogger("core");
const StdioServer = class {
  constructor(on_data) {
    this.on_data = on_data;
    this.serverProcess = null;
  }
  serverProcess;
  async start() {
    const serverPath = await getRPCServerPath();
    log3.info("using deltachat-rpc-server at", { serverPath });
    this.serverProcess = spawn(serverPath, {
      env: {
        DC_ACCOUNTS_PATH: DC_ACCOUNTS_DIR,
        RUST_LOG: process.env.RUST_LOG
      }
    });
    let buffer = "";
    this.serverProcess.stdout.on("data", (data) => {
      buffer += data.toString();
      while (buffer.includes("\n")) {
        const n = buffer.indexOf("\n");
        const message = buffer.substring(0, n);
        this.on_data(message);
        buffer = buffer.substring(n + 1);
      }
    });
    let errorLog = "";
    const ERROR_LOG_LENGTH = 800;
    this.serverProcess.stderr.on("data", (data) => {
      log3.error(`stderr: ${data}`.trimEnd());
      errorLog = (errorLog + data).slice(-ERROR_LOG_LENGTH);
    });
    this.serverProcess.on("close", (code, signal) => {
      if (code !== null) {
        log3.debug(`child process close all stdio with code ${code}`);
      } else {
        log3.debug(`child process close all stdio with signal ${signal}`);
      }
    });
    this.serverProcess.on("exit", (code, signal) => {
      if (code !== null) {
        log3.debug(`child process exited with code ${code}`);
        if (code !== 0) {
          log3.critical("Fatal: The Delta Chat Core exited unexpectedly", code);
          process.exit(1);
        }
      } else {
        log3.debug(`child process exited with signal ${signal}`);
      }
    });
  }
  send(message) {
    this.serverProcess?.stdin.write(message + "\n");
  }
};
const MainTransport = class extends yerpc.BaseTransport {
  constructor(sender) {
    super();
    this.sender = sender;
  }
  onMessage(message) {
    this._onmessage(message);
  }
  _send(message) {
    this.sender(message);
  }
};
const JRPCDeltaChat = class extends BaseDeltaChat {
};
async function startDeltaChat() {
  let active_connection;
  const DCInstance = new StdioServer((response) => {
    try {
      if (response.indexOf('"id":"main-') !== -1) {
        const message = JSON.parse(response);
        if (message.id.startsWith("main-")) {
          message.id = Number(message.id.replace("main-", ""));
          mainProcessTransport.onMessage(message);
          return;
        }
      }
    } catch (error) {
      log3.error("jsonrpc-decode", error);
    }
    active_connection?.send(response);
    if (response.indexOf("event") !== -1)
      try {
        const { result } = JSON.parse(response);
        const { contextId, event } = result;
        if (contextId !== void 0 && typeof event === "object" && event.kind) {
          if (event.kind === "WebxdcRealtimeData") {
            return;
          }
          if (event.kind === "Warning") {
            logCoreEvent.warn(contextId, event.msg);
          } else if (event.kind === "Info") {
            logCoreEvent.info(contextId, event.msg);
          } else if (event.kind.startsWith("Error")) {
            logCoreEvent.error(contextId, event.msg);
          } else if (RCConfig["log-debug"]) {
            const event_clone = Object.assign({}, event);
            delete event_clone.kind;
            logCoreEvent.debug(contextId, event.kind, event);
          }
        }
      } catch (error) {
        return;
      }
  });
  await DCInstance.start();
  const mainProcessTransport = new MainTransport((message) => {
    message.id = `main-${message.id}`;
    DCInstance.send(JSON.stringify(message));
  });
  const mainProcessDC = new JRPCDeltaChat(mainProcessTransport, false);
  const StolenConnectionPacket = JSON.stringify({
    jsonrpc: "2.0",
    method: "error_other_client_stole_dc_connection"
  });
  const wssDC2 = new WebSocketServer({ noServer: true, perMessageDeflate: true });
  wssDC2.on("connection", function connection2(ws) {
    ws.on("error", console.error);
    if (active_connection) {
      active_connection?.send(StolenConnectionPacket);
    }
    active_connection = ws;
    ws.on("message", (raw_data) => {
      if (active_connection === ws) {
        const stringData = raw_data.toString("utf-8");
        if (stringData.indexOf("export") !== -1) {
          const request = JSON.parse(stringData);
          if ((request.method === "export_backup" || request.method === "export_self_keys") && request.params[1] === "<BROWSER>") {
            request.params[1] = join3(DC_ACCOUNTS_DIR, "backups");
            return DCInstance.send(JSON.stringify(request));
          }
        }
        DCInstance.send(stringData);
      } else {
        log3.debug(
          "ignored dc jsonrpc request because client is not the active one anymore"
        );
        ws.send(StolenConnectionPacket);
      }
    });
    log3.debug("connected dc socket");
  });
  return [
    mainProcessDC,
    wssDC2,
    () => {
      DCInstance.serverProcess?.kill(2);
    }
  ];
}

// src/help.ts
import express3, { Router as Router2 } from "express";
import { join as join4 } from "path";
import resolvePath from "resolve-path";
import { stat } from "fs/promises";
const helpRoute = Router2();
const helpDir = join4(DIST_DIR, "/help");
helpRoute.get("/help", express3.static(helpDir));
helpRoute.get("/help_exists/:lang", async (req, res) => {
  const filePath = resolvePath(helpDir, `${req.params.lang}/help.html`);
  try {
    await stat(filePath);
    return res.status(200).json({ msg: "File Found" });
  } catch (error) {
    return res.status(404).json({ msg: "404 Not Found" });
  }
});

// src/log-handler.ts
import { createWriteStream } from "fs";
import { join as join5 } from "path";
import { stdout, stderr } from "process";
stdout.on("error", () => {
});
stderr.on("error", () => {
});
function logName() {
  const d = /* @__PURE__ */ new Date();
  function pad(number) {
    return number < 10 ? "0" + number : number;
  }
  const fileName = [
    `${d.getFullYear()}-`,
    `${pad(d.getMonth() + 1)}-`,
    `${pad(d.getDate())}-`,
    `${pad(d.getHours())}-`,
    `${pad(d.getMinutes())}-`,
    `${pad(d.getSeconds())}`,
    ".log"
  ].join("");
  return join5(LOGS_DIR, fileName);
}
function createLogHandler() {
  const fileName = logName();
  const stream = createWriteStream(fileName, { flags: "w" });
  console.log(`Logfile: ${fileName}`);
  return {
    /**
     * Internal log handler. Do not call directly!
     * @param channel The part/module where the message was logged from, e.g. 'main/deltachat'
     * @param level DEBUG, INFO, WARNING, ERROR or CRITICAL
     * @param stacktrace Stack trace if WARNING, ERROR or CRITICAL
     * @param ...args Variadic parameters. Stringified before logged to file
     */
    log: (channel, level, stacktrace, ...args) => {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      let line = [timestamp, fillString(channel, 22), level];
      line = line.concat(
        [stacktrace, ...args].map((value) => JSON.stringify(value))
      );
      if (stream.writable) {
        stream.write(`${line.join("	")}
`);
      } else {
        console.warn("tried to log something after logger shut down", {
          channel,
          level,
          args,
          stacktrace
        });
      }
    },
    end: () => stream.end(),
    logFilePath: () => fileName
  };
}
import { readdir, lstat, unlink as unlink2 } from "fs/promises";
async function cleanupLogFolder() {
  const log6 = getLogger("logger/log-cleanup");
  const logDir = LOGS_DIR;
  const logDirContent = await readdir(logDir);
  const filesWithDates = await Promise.all(
    logDirContent.map(async (logFileName) => ({
      filename: logFileName,
      mtime: (await lstat(join5(logDir, logFileName))).mtime.getTime()
    }))
  );
  const sortedFiles = filesWithDates.sort((a, b) => a.mtime - b.mtime);
  if (sortedFiles.length > 10) {
    sortedFiles.splice(sortedFiles.length - 11);
    const fileCount = await Promise.all(
      sortedFiles.map(({ filename }) => unlink2(join5(logDir, filename)))
    );
    log6.info(`Successfuly deleted ${fileCount.length} old logfiles`);
  } else {
    log6.debug("Nothing to do (not more than 10 logfiles to delete)");
  }
}
function fillString(string, n) {
  if (string.length < n) {
    return string + " ".repeat(n - string.length);
  }
  return string;
}

// ../shared/themes.ts
function parseThemeMetaData(rawTheme) {
  const meta_data_block = /.theme-meta ?{([^]*)}/gm.exec(rawTheme)?.[1].trim() || "";
  const regex = /--(\w*): ?['"]([^]*?)['"];?/gi;
  const meta = {};
  let last_result = true;
  while (last_result) {
    last_result = regex.exec(meta_data_block);
    if (last_result) {
      meta[last_result[1]] = last_result[2];
    }
  }
  if (!meta.name || !meta.description) {
    throw new Error(
      "The meta variables meta.name and meta.description must be defined"
    );
  }
  return meta;
}
const HIDDEN_THEME_PREFIX = "dev_";

// src/themes.ts
import { basename as basename2, join as join6 } from "path";
import { readdir as readdir2, readFile } from "fs/promises";
const log4 = getLogger("main/themes");
const dc_theme_dir = join6(DIST_DIR, "themes");
async function readThemeDir(path = dc_theme_dir, prefix = "dc") {
  const files = await readdir2(path);
  return Promise.all(
    files.filter((f) => f.endsWith(".css") && f.charAt(0) !== "_").map(async (f) => {
      const address = prefix + ":" + basename2(f, ".css");
      const file_content = await readFile(join6(path, f), "utf-8");
      try {
        const theme_meta = parseThemeMetaData(file_content);
        return {
          name: theme_meta.name,
          description: theme_meta.description,
          address,
          is_prototype: f.startsWith(HIDDEN_THEME_PREFIX)
        };
      } catch (error) {
        log4.error("Error while parsing theme ${address}: ", error);
        return {
          name: address + " [Invalid Meta]",
          description: "[missing description]",
          address: prefix + ":" + basename2(f, ".css"),
          is_prototype: f.startsWith(HIDDEN_THEME_PREFIX)
        };
      }
    })
  );
}

// src/index.ts
import { basename as basename3, dirname as dirname2, join as join7 } from "path";
import express4 from "express";
import https from "https";
import { readFile as readFile2, stat as stat2, unlink as unlink3 } from "fs/promises";
import session from "express-session";
import resolvePath2 from "resolve-path";
import { WebSocketServer as WebSocketServer2 } from "ws";
const logHandler = createLogHandler();
setLogHandler(logHandler.log, RCConfig);
cleanupLogFolder();
const log5 = getLogger("main");
const app = express4();
if (ENV_WEB_TRUST_FIRST_PROXY) {
  app.set("trust proxy", 1);
}
const getCookieSecret = () => {
  const savedSecret = localStorage.getItem("cookieSecret");
  if (savedSecret) {
    return savedSecret;
  } else {
    const newSecret = crypto.randomUUID();
    localStorage.setItem("cookieSecret", newSecret);
    return newSecret;
  }
};
const sessionParser = session({
  store: new FileStore(localStorage),
  secret: getCookieSecret(),
  resave: false,
  saveUninitialized: true,
  cookie: {
    sameSite: "strict",
    priority: "high",
    secure: true,
    // This makes it only work in https
    httpOnly: true
  }
});
app.use(sessionParser);
app.use(CORSMiddleWare);
app.get("/", (req, res) => {
  let startPage = "main.html";
  if (NODE_ENV === "test") {
    req.session.isAuthenticated = true;
    startPage = "test.html";
  }
  if (req.session.isAuthenticated) {
    res.sendFile(join7(DIST_DIR, startPage));
  } else {
    res.status(401);
    return res.sendFile(join7(DIST_DIR, "login.html"));
  }
});
app.use(express4.static(DIST_DIR));
app.use("/locales", express4.static(LOCALES_DIR));
app.get(
  "/favicon.ico",
  (_req, res) => res.sendFile(join7(DIST_DIR, "images/deltachat.ico"))
);
app.post(
  "/authenticate",
  express4.urlencoded({ extended: true }),
  (req, res) => {
    if (req.body?.password === ENV_WEB_PASSWORD) {
      req.session.isAuthenticated = true;
      res.redirect("/");
    } else {
      res.status(401);
      return res.send(`<html>
    <head></head>
    <body>
        Password wrong, <a href="/">go back to login</a>
    </body>
    </html>`);
    }
  }
);
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
  });
  res.redirect("/");
});
const [dc, wssDC, shutdownDC] = await startDeltaChat();
log5.info(await dc.rpc.getSystemInfo());
app.get("/blobs/:accountId/:filename", authMiddleWare, async (req, res) => {
  const { filename } = req.params;
  let { accountId } = req.params;
  if (isNaN(Number(accountId))) {
    for (const id of await dc.rpc.getAllAccountIds()) {
      const blobdir = await dc.rpc.getBlobDir(id) || "";
      if (basename3(dirname2(blobdir)) === accountId) {
        accountId = String(id);
        break;
      }
    }
    if (isNaN(Number(accountId))) {
      return res.status(400).send("Bad Request: account id is not a number");
    }
  }
  const blobDir = await dc.rpc.getBlobDir(Number(accountId));
  if (!blobDir) {
    throw new Error("no blobdir");
  }
  const filePath = resolvePath2(blobDir, filename);
  try {
    await stat2(filePath);
  } catch (error) {
    return res.status(404).send("404 Not Found");
  }
  if (req.query.download_with_filename) {
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${req.query.download_with_filename}"`
    );
  }
  res.sendFile(filePath);
});
app.get("/download-backup/:filename", authMiddleWare, async (req, res) => {
  const filePath = resolvePath2(
    join7(DC_ACCOUNTS_DIR, "backups"),
    req.params.filename
  );
  res.download(filePath);
  res.on("finish", () => {
    setTimeout(() => {
      unlink3(filePath).then(() => {
        log5.info("deleted backup file 10s after download");
      });
    }, 1e4);
  });
});
app.get("/stickers/:account/:?pack/:filename", authMiddleWare, (req, res) => {
  res.send("req.params" + JSON.stringify(req.params));
});
app.use("/background", express4.static(join7(DATA_DIR, "background")));
app.use("/backend-api", BackendApiRoute);
app.use(helpRoute);
app.get("/themes.json", async (req, res) => {
  res.json(await readThemeDir());
});
let certificate = "";
if (process.env.PRIVATE_CERTIFICATE_CERT) {
  certificate = process.env.PRIVATE_CERTIFICATE_CERT;
} else {
  certificate = await readFile2(PRIVATE_CERTIFICATE_CERT, "utf8");
}
let certificateKey = "";
if (process.env.PRIVATE_CERTIFICATE_KEY) {
  certificateKey = process.env.PRIVATE_CERTIFICATE_KEY;
} else {
  certificateKey = await readFile2(PRIVATE_CERTIFICATE_KEY, "utf8");
}
const sslserver = https.createServer(
  {
    key: certificateKey,
    cert: certificate
  },
  app
);
const wssBackend = new WebSocketServer2({
  noServer: true,
  perMessageDeflate: true
});
wssBackend.on("connection", function connection(ws) {
  ws.on("error", log5.error);
  ws.on("message", (raw_data) => {
    try {
      const utf8String = raw_data.toString("utf8");
      const msg = JSON.parse(utf8String);
      if (msg.type == "log") {
        const [channel, level, stackTrace, ...data] = msg.data;
        logHandler.log(channel, level, stackTrace, ...data);
      } else {
        log5.debug("[recv on backend ws]", msg);
      }
    } catch (e) {
      log5.error("failed to read message as json string", e);
    }
  });
  log5.debug("connected backend socket");
});
sslserver.on("upgrade", (request, socket, head) => {
  socket.on("error", console.error);
  sessionParser(request, {}, () => {
    if (!request.session.isAuthenticated) {
      log5.debug("unauthorized websocket session");
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    const { pathname } = new URL(request.url || "", "wss://base.url");
    if (pathname === "/ws/dc") {
      wssDC.handleUpgrade(request, socket, head, function(ws) {
        wssDC.emit("connection", ws, request);
      });
    } else if (pathname === "/ws/backend") {
      wssBackend.handleUpgrade(request, socket, head, function(ws) {
        wssBackend.emit("connection", ws, request);
      });
    }
  });
});
sslserver.listen(ENV_WEB_PORT, () => {
  log5.info(`HTTPS app listening on port ${ENV_WEB_PORT}`);
});
process.on("exit", () => {
  sslserver.closeAllConnections();
  sslserver.close();
  shutdownDC();
  logHandler.end;
});
//# sourceMappingURL=server.js.map
