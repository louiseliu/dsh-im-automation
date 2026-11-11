window.__ModuleLoader__.load({id:"dsh-im-automation",factory:(require)=>{
var module={exports:{}};var exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_react4 = __toESM(require("react"), 1);

// src/client/Settings.jsx
var import_react3 = __toESM(require("react"), 1);

// src/client/TaskFeedback.jsx
var import_react = __toESM(require("react"), 1);

// src/client/presentation.mjs
var channels = { feishu: "\u98DE\u4E66", weixin: "\u5FAE\u4FE1", wecom: "\u4F01\u4E1A\u5FAE\u4FE1", "wecom-app": "\u4F01\u4E1A\u5FAE\u4FE1", dingtalk: "\u9489\u9489", telegram: "Telegram", slack: "Slack", qq: "QQ" };
var botLabel = (bot) => bot.name ? `${bot.name}\uFF08${channels[bot.channel] ?? bot.channel ?? "\u804A\u5929"}\uFF09` : `\u672A\u547D\u540D\u7684${channels[bot.channel] ?? bot.channel ?? "\u804A\u5929"}\u673A\u5668\u4EBA \xB7 ${bot.botId.slice(-4)}`;
var workspaceLabel = (workspace) => workspace.title || workspace.path.split("/").filter(Boolean).at(-1) || "\u5DE5\u4F5C\u533A";
function timingLabel({ kind, minutes, time, weekdays }, timeZone) {
  if (kind === "after") return `${minutes} \u5206\u949F\u540E\u6267\u884C\u4E00\u6B21`;
  if (kind === "every") return `\u6BCF\u9694 ${minutes} \u5206\u949F`;
  const days = ["\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u65E5"];
  return `${kind === "daily" ? "\u6BCF\u5929" : `\u6BCF\u5468${[...weekdays].sort().map((day) => days[day - 1]).join("\u3001")}`} ${time}${timeZone ? `\uFF08${timeZone}\uFF09` : ""}`;
}
function dateLabel(value) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "\u65F6\u95F4\u5F85\u786E\u8BA4";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}
function taskProgress(task, latest) {
  if (task.running || latest?.state === "pending") return { label: "AI \u6B63\u5728\u6267\u884C", hint: "\u6B63\u5728\u5904\u7406\u4EFB\u52A1\uFF0C\u5B8C\u6210\u540E\u4F1A\u66F4\u65B0\u7ED3\u679C\u4E0E\u53D1\u9001\u72B6\u6001\u3002" };
  if (latest?.state === "sending") return { label: "\u6B63\u5728\u53D1\u9001\u7ED3\u679C", hint: "AI \u5DF2\u5B8C\u6210\uFF0C\u6B63\u5728\u63D0\u4EA4\u5230\u804A\u5929\u8F6F\u4EF6\u3002" };
  if (latest?.textState === "sent" && latest.state === "failed") return { label: "\u6587\u5B57\u5DF2\u53D1\u9001\uFF0C\u6587\u4EF6\u672A\u5168\u90E8\u53D1\u9001", hint: "\u8BF7\u67E5\u770B\u6587\u4EF6\u72B6\u6001\uFF0C\u5DF2\u53D1\u9001\u7684\u5185\u5BB9\u4E0D\u4F1A\u91CD\u590D\u53D1\u9001\u3002" };
  if (latest?.textState === "sent" && latest.state === "unknown") return { label: "\u6587\u5B57\u5DF2\u53D1\u9001\uFF0C\u6587\u4EF6\u5F85\u6838\u67E5", hint: "\u8BF7\u5230 IM \u786E\u8BA4\u6587\u4EF6\uFF0C\u4E0D\u4F1A\u81EA\u52A8\u91CD\u53D1\u3002" };
  if (latest?.state === "sent" && latest.files?.length) return { label: "\u7ED3\u8BBA\u548C\u6587\u4EF6\u5DF2\u53D1\u9001", hint: `\u5DF2\u53D1\u9001 ${latest.files.length} \u4E2A\u6587\u4EF6\u3002` };
  if (latest?.state === "sent") return { label: "\u5DF2\u5B8C\u6210\uFF0C\u7ED3\u679C\u5DF2\u53D1\u9001", hint: `\u53D1\u9001\u65F6\u95F4\uFF1A${dateLabel(latest.updatedAt)}` };
  if (latest?.state === "unknown") return { label: "\u53D1\u9001\u7ED3\u679C\u5F85\u6838\u67E5", hint: "\u8BF7\u5230\u804A\u5929\u8F6F\u4EF6\u786E\u8BA4\uFF0C\u7CFB\u7EDF\u4E0D\u4F1A\u81EA\u52A8\u91CD\u590D\u53D1\u9001\u3002" };
  if (latest?.state === "failed") return { label: "\u7ED3\u679C\u53D1\u9001\u5931\u8D25", hint: "\u8BF7\u68C0\u67E5\u63A5\u6536\u4F4D\u7F6E\u6216\u673A\u5668\u4EBA\u8FDE\u63A5\u3002" };
  if (latest?.state === "skipped") return { label: "\u672C\u6B21\u7ED3\u679C\u672A\u53D1\u9001", hint: "\u8BF7\u67E5\u770B\u4E0B\u9762\u7684\u5177\u4F53\u539F\u56E0\u3002" };
  if (latest?.state === "delegated") return { label: "\u65E7\u7248\u804A\u5929\u4EFB\u52A1\u5DF2\u89E6\u53D1", hint: "\u5B9E\u9645\u53D1\u9001\u8DDF\u968F\u539F\u804A\u5929\u8BBE\u7F6E\u3002" };
  if (task.hasExecution) return { label: "\u5DF2\u6709\u6267\u884C\u8BB0\u5F55", hint: "\u53EF\u67E5\u770B\u4EFB\u52A1\u8FC7\u7A0B\uFF0C\u53D1\u9001\u72B6\u6001\u8BF7\u5237\u65B0\u6838\u5BF9\u3002" };
  if (task.status === "inactive") return { label: "\u4EFB\u52A1\u5DF2\u7ED3\u675F", hint: "\u8FD9\u9879\u4EFB\u52A1\u6CA1\u6709\u53EF\u67E5\u770B\u7684\u6267\u884C\u8BB0\u5F55\u3002" };
  return { label: "\u7B49\u5F85\u9996\u6B21\u6267\u884C", hint: "\u4EFB\u52A1\u5DF2\u4FDD\u5B58\uFF0C\u65E0\u9700\u518D\u6B21\u521B\u5EFA\u3002\u9996\u6B21\u6267\u884C\u540E\u53EF\u4EE5\u67E5\u770B\u8FC7\u7A0B\u548C\u7ED3\u679C\u3002" };
}
var activityTime = (task, deliveries) => deliveries.find((row) => row.taskId === task.id)?.updatedAt ?? (Date.parse(task.lastRunAt) || 0);

// src/client/TaskFeedback.jsx
function TaskFeedback({ task, config, latest }) {
  const progress = taskProgress(task, latest);
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "dia-feedback", role: "status" }, /* @__PURE__ */ import_react.default.createElement("h3", null, progress.label), /* @__PURE__ */ import_react.default.createElement("p", null, progress.hint), task.status !== "inactive" && task.scheduledAt && /* @__PURE__ */ import_react.default.createElement("p", null, /* @__PURE__ */ import_react.default.createElement("strong", null, "\u4E0B\u6B21\u6267\u884C\uFF1A", dateLabel(task.scheduledAt))), task.botName && /* @__PURE__ */ import_react.default.createElement("p", null, "\u901A\u8FC7 ", task.botName, " \u53D1\u9001\u7ED9 ", task.recipientName ?? "\u5C1A\u672A\u786E\u8BA4\u7684\u63A5\u6536\u4F4D\u7F6E"), task.workspaceTitle && /* @__PURE__ */ import_react.default.createElement("p", { className: "dia-muted" }, "\u8D44\u6599\u4E0E\u72EC\u7ACB\u6267\u884C\u8BB0\u5F55\uFF1A", task.workspaceTitle), config?.enabled === false && /* @__PURE__ */ import_react.default.createElement("p", { className: "dia-warning" }, "\u7ED3\u679C\u53D1\u9001\u5DF2\u5173\u95ED\u3002\u4EFB\u52A1\u4ECD\u4F1A\u6309\u8BA1\u5212\u6267\u884C\uFF0C\u4F46\u4E0D\u4F1A\u63A8\u9001\u5230 IM\u3002"), !task.hasExecution && !latest && task.status !== "inactive" && /* @__PURE__ */ import_react.default.createElement("p", { className: "dia-muted" }, "\u6267\u884C\u8BB0\u5F55\u4F1A\u5728\u4EFB\u52A1\u9996\u6B21\u6267\u884C\u540E\u81EA\u52A8\u751F\u6210\u3002"), task.status === "inactive" && /* @__PURE__ */ import_react.default.createElement("p", { className: "dia-muted" }, "\u8FD9\u9879\u4EFB\u52A1\u5DF2\u7ED3\u675F\uFF0C\u4E0D\u4F1A\u518D\u6B21\u8FD0\u884C\u3002"));
}

// src/client/messages.mjs
var messages = {
  "files-failed": "\u6587\u5B57\u7ED3\u8BBA\u5DF2\u53D1\u9001\uFF0C\u90E8\u5206\u6587\u4EF6\u672A\u53D1\u9001\u3002\u8BF7\u67E5\u770B\u4E0B\u65B9\u6587\u4EF6\u72B6\u6001\u3002",
  "file-send-unsupported": "\u5F53\u524D dsh-im \u6216\u6B64 IM \u6682\u4E0D\u652F\u6301\u81EA\u52A8\u5316\u9644\u4EF6\u3002\u98DE\u4E66\u9700\u5B89\u88C5\u914D\u5957\u6587\u4EF6\u6295\u9012\u7248 dsh-im\u3002",
  "file-unavailable": "\u6587\u4EF6\u4E0D\u5B58\u5728\u3001\u4E0D\u53EF\u8BFB\u53D6\u6216\u4E0D\u662F\u666E\u901A\u6587\u4EF6\uFF0C\u672A\u53D1\u9001\u3002",
  "file-too-large": "\u6587\u4EF6\u6216\u672C\u6B21\u9644\u4EF6\u603B\u5927\u5C0F\u8D85\u8FC7 20 MB\uFF0C\u672A\u53D1\u9001\u3002",
  "file-changed": "\u6587\u4EF6\u5728\u8BFB\u53D6\u65F6\u53D1\u751F\u53D8\u5316\uFF0C\u672A\u53D1\u9001\u3002",
  "file-result-unknown": "\u6587\u5B57\u5DF2\u53D1\u9001\uFF0C\u6587\u4EF6\u53D1\u9001\u7ED3\u679C\u5F85\u6838\u67E5\u3002\u8BF7\u5230 IM \u786E\u8BA4\uFF0C\u4E0D\u4F1A\u81EA\u52A8\u91CD\u53D1\u3002",
  "text-not-confirmed": "\u6587\u5B57\u53D1\u9001\u672A\u786E\u8BA4\uFF0C\u672C\u6B21\u6587\u4EF6\u672A\u5C1D\u8BD5\u53D1\u9001\u3002",
  "artifact-permission-required": "\u98DE\u4E66\u673A\u5668\u4EBA\u7F3A\u5C11\u6587\u4EF6\u4E0A\u4F20\u6743\u9650\uFF08im:resource\uFF09\uFF0C\u8BF7\u5728\u98DE\u4E66\u5F00\u653E\u5E73\u53F0\u5F00\u542F\u3002",
  "artifact-too-large": "\u6587\u4EF6\u8D85\u8FC7 IM \u5E73\u53F0\u5927\u5C0F\u9650\u5236\u3002",
  "artifact-empty": "IM \u5E73\u53F0\u4E0D\u63A5\u6536\u7A7A\u6587\u4EF6\u3002",
  "artifact-provider-rejected": "IM \u5E73\u53F0\u62D2\u7EDD\u63A5\u6536\u6B64\u6587\u4EF6\u3002",
  "artifact-rate-limited": "IM \u5E73\u53F0\u9650\u5236\u4E86\u6587\u4EF6\u53D1\u9001\u9891\u7387\uFF0C\u672C\u6B21\u672A\u53D1\u9001\u3002",
  "session-not-bound": "\u65E7\u4EFB\u52A1\u7684\u804A\u5929\u5DF2\u4E0D\u518D\u8FDE\u63A5\u673A\u5668\u4EBA\u3002\u8BF7\u68C0\u67E5\u201CIM\u673A\u5668\u4EBA\u201D\u8BBE\u7F6E\uFF0C\u6216\u91CD\u65B0\u521B\u5EFA\u4E00\u4E2A\u72EC\u7ACB\u4EFB\u52A1\u3002",
  "session-not-found": "\u6267\u884C\u5BF9\u8BDD\u4E0D\u5B58\u5728\u6216\u5C5E\u4E8E\u5B50\u667A\u80FD\u4F53\uFF0C\u65E0\u6CD5\u4F7F\u7528\u3002",
  "session-archived": "\u6267\u884C\u5BF9\u8BDD\u5DF2\u5F52\u6863\uFF0C\u8BF7\u5148\u5728 Harness \u6062\u590D\u5B83\u3002",
  "native-sync-global": "\u8FD9\u9879\u4EFB\u52A1\u8DDF\u968F\u804A\u5929\u7684\u53D1\u9001\u8BBE\u7F6E\u3002\u8981\u505C\u6B62\u4EFB\u52A1\uFF0C\u8BF7\u5230\u201C\u81EA\u52A8\u5316\u4EFB\u52A1\u201D\u505C\u7528\u3002",
  "managed-by-dsh-im": "\u7531 dsh-im \u4F1A\u8BDD\u540C\u6B65\u5904\u7406\uFF1B\u6B64\u8BB0\u5F55\u4E0D\u4EE3\u8868\u5E73\u53F0\u53D1\u9001\u6210\u529F\uFF0C\u63D2\u4EF6\u6CA1\u6709\u91CD\u590D\u53D1\u9001\u3002",
  "invalid-mode": "\u6267\u884C\u6A21\u5F0F\u4E0E\u4F1A\u8BDD\u914D\u7F6E\u4E0D\u5339\u914D\u3002",
  "invalid-creation": "\u8BF7\u68C0\u67E5\u540D\u79F0\u3001\u6307\u4EE4\u53CA\u6267\u884C\u65F6\u95F4\u3002",
  "invalid-time-zone": "\u8BF7\u8F93\u5165\u6709\u6548\u7684 IANA \u65F6\u533A\uFF0C\u4F8B\u5982 Asia/Shanghai\u3002",
  "creation-unavailable": "Host \u6682\u4E0D\u63D0\u4F9B\u539F\u751F\u4EFB\u52A1\u521B\u5EFA\u6240\u9700\u7684\u4F1A\u8BDD\u670D\u52A1\u3002",
  "invalid-workspace": "\u8BF7\u9009\u62E9\u4E00\u4E2A\u5DF2\u6CE8\u518C\u7684 Harness \u5DE5\u4F5C\u533A\u3002",
  "workspace-mismatch": "\u521B\u5EFA\u51FA\u7684\u4F1A\u8BDD\u76EE\u5F55\u4E0E\u6240\u9009\u5DE5\u4F5C\u533A\u4E0D\u4E00\u81F4\uFF0C\u672A\u521B\u5EFA\u4EFB\u52A1\u3002",
  "creation-request-conflict": "\u521B\u5EFA\u8BF7\u6C42\u5185\u5BB9\u5DF2\u53D8\u5316\uFF0C\u8BF7\u5148\u6838\u5BF9\u539F\u751F\u4EFB\u52A1\u5217\u8868\u3002",
  "creation-result-unknown": "\u521B\u5EFA\u7ED3\u679C\u672A\u786E\u8BA4\u3002\u8BF7\u5148\u68C0\u67E5\u539F\u751F\u4EFB\u52A1\u5217\u8868\u4E0E\u6700\u8FD1\u521B\u5EFA\u8BB0\u5F55\uFF0C\u4E0D\u8981\u91CD\u590D\u521B\u5EFA\u3002",
  "shared-session": "\u8FD9\u6BB5\u8BB0\u5F55\u88AB\u591A\u4E2A\u4EFB\u52A1\u5171\u7528\uFF0C\u65E0\u6CD5\u5B89\u5168\u533A\u5206\u7ED3\u679C\u3002\u8BF7\u521B\u5EFA\u65B0\u4EFB\u52A1\uFF0C\u9009\u62E9\u201C\u5355\u72EC\u4FDD\u5B58\u4EFB\u52A1\u8BB0\u5F55\u201D\u3002",
  "unsupported-task-target": "\u6B64\u4EFB\u52A1\u7684\u4F1A\u8BDD\u7C7B\u578B\u6682\u4E0D\u652F\u6301\uFF0C\u8BF7\u4F7F\u7528\u72EC\u7ACB\u7684\u56FA\u5B9A\u4F1A\u8BDD\u3002",
  "session-sync-conflict": "\u8FD9\u9879\u4EFB\u52A1\u4E0E IM \u804A\u5929\u5171\u7528\u8BB0\u5F55\uFF0C\u4E0D\u80FD\u5F00\u542F\u72EC\u7ACB\u53D1\u9001\u3002\u8BF7\u91CD\u65B0\u521B\u5EFA\u4EFB\u52A1\uFF1B\u65B0\u4EFB\u52A1\u4F1A\u81EA\u52A8\u5355\u72EC\u4FDD\u5B58\u8BB0\u5F55\u3002",
  "sync-check-failed": "\u65E0\u6CD5\u6838\u5B9E\u5DF2\u6709 IM \u540C\u6B65\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5\u3002",
  "unsupported-harness": "\u5F53\u524D Harness \u63A5\u53E3\u4E0D\u517C\u5BB9\u3002\u5DF2\u9A8C\u8BC1\u5B98\u65B9 0.2.1-rc.5\u3002",
  "dsh-im-unavailable": "\u804A\u5929\u673A\u5668\u4EBA\u5C1A\u4E0D\u53EF\u7528\u3002\u8BF7\u5148\u5728\u201C\u63D2\u4EF6\u201D\u4E2D\u5B89\u88C5\u5E76\u542F\u7528 dsh-im\uFF0C\u518D\u5230\u201CIM\u673A\u5668\u4EBA\u201D\u5B8C\u6210\u8FDE\u63A5\u3002",
  "unknown-bot": "\u673A\u5668\u4EBA\u5DF2\u79FB\u9664\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u3002",
  "unknown-target": "\u63A5\u6536\u4F4D\u7F6E\u5DF2\u79FB\u9664\u3002\u8BF7\u5728\u201CIM\u673A\u5668\u4EBA\u201D\u4E2D\u91CD\u65B0\u6DFB\u52A0\uFF0C\u518D\u56DE\u6765\u9009\u62E9\u3002",
  "bot-not-connected": "\u673A\u5668\u4EBA\u79BB\u7EBF\uFF0C\u8BF7\u6062\u590D\u8FDE\u63A5\u540E\u518D\u6D4B\u8BD5\u3002",
  "task-not-found": "\u539F\u751F\u4EFB\u52A1\u5DF2\u5220\u9664\uFF0C\u8BF7\u5237\u65B0\u4EFB\u52A1\u5217\u8868\u3002",
  "config-conflict": "\u914D\u7F6E\u5DF2\u88AB\u5176\u4ED6\u9875\u9762\u4FEE\u6539\uFF0C\u8BF7\u91CD\u65B0\u8F7D\u5165\u914D\u7F6E\u540E\u4FDD\u5B58\u3002",
  "waiting-for-answer": "\u7B49\u5F85 AI \u6267\u884C\u5B8C\u6210",
  "platform-accepted": "\u5E73\u53F0\u5DF2\u63A5\u53D7\u53D1\u9001",
  "input-discarded": "\u672C\u6B21\u4EFB\u52A1\u8F93\u5165\u5DF2\u88AB\u53D6\u6D88\uFF0C\u672A\u53D1\u9001",
  "ambiguous-input": "\u672C\u6B21\u6267\u884C\u6DF7\u5165\u5176\u4ED6\u8F93\u5165\uFF0C\u672A\u53D1\u9001",
  "empty-answer": "AI \u6CA1\u6709\u751F\u6210\u53EF\u53D1\u9001\u7684\u6700\u7EC8\u6587\u5B57",
  "config-disabled": "\u6295\u9012\u5DF2\u5173\u95ED\uFF0C\u672C\u6B21\u7ED3\u679C\u672A\u53D1\u9001",
  "task-deleted": "\u539F\u751F\u4EFB\u52A1\u5DF2\u5220\u9664\uFF0C\u672C\u6B21\u7ED3\u679C\u672A\u53D1\u9001",
  "config-changed": "\u672C\u6B21\u6267\u884C\u7684\u6295\u9012\u914D\u7F6E\u5DF2\u53D8\u66F4\uFF0C\u672A\u53D1\u9001",
  "session-changed": "\u4EFB\u52A1\u4F1A\u8BDD\u5DF2\u53D8\u66F4\uFF0C\u672A\u53D1\u9001",
  "task-changed": "\u4EFB\u52A1\u5DF2\u53D8\u66F4\u6216\u5220\u9664\uFF0C\u672A\u53D1\u9001",
  "send-result-unknown": "\u53D1\u9001\u7ED3\u679C\u4E0D\u660E\u786E\uFF0C\u8BF7\u5230 IM \u6838\u5BF9\uFF1B\u4E0D\u4F1A\u81EA\u52A8\u91CD\u8BD5",
  "previous-attempt-unconfirmed": "\u4E0A\u6B21\u53D1\u9001\u672A\u5F97\u5230\u6301\u4E45\u786E\u8BA4\uFF0C\u8BF7\u5230 IM \u6838\u5BF9\uFF1B\u4E0D\u4F1A\u81EA\u52A8\u91CD\u8BD5",
  "test-result-unknown": "\u6D4B\u8BD5\u53D1\u9001\u7ED3\u679C\u4E0D\u660E\u786E\uFF0C\u8BF7\u5230 IM \u6838\u5BF9\u540E\u518D\u51B3\u5B9A\u662F\u5426\u91CD\u8BD5",
  "attempt-started": "\u53D1\u9001\u4E2D",
  "turn-aborted": "AI \u6267\u884C\u5DF2\u53D6\u6D88",
  "turn-error": "AI \u6267\u884C\u5931\u8D25",
  "turn-blocked": "AI \u6267\u884C\u88AB\u963B\u6B62",
  "turn-interrupted": "AI \u6267\u884C\u88AB\u4E2D\u65AD",
  "turn-max-tokens": "AI \u8F93\u51FA\u4E0D\u5B8C\u6574\uFF0C\u672A\u53D1\u9001",
  "turn-forked": "\u6267\u884C\u56DE\u5408\u5C5E\u4E8E\u4F1A\u8BDD\u5206\u53C9\uFF0C\u672A\u53D1\u9001",
  "history-unavailable": "\u65E0\u6CD5\u8BFB\u53D6\u4EFB\u52A1\u6295\u9012\u8BB0\u5F55",
  "reconcile-failed": "\u7ED3\u679C\u53D1\u9001\u68C0\u67E5\u6682\u65F6\u5931\u8D25\uFF0C\u8BF7\u5237\u65B0\u67E5\u770B\u3002",
  "session-flush-unconfirmed": "\u6267\u884C\u7ED3\u679C\u5C1A\u672A\u786E\u8BA4\u4FDD\u5B58\uFF0C\u6682\u672A\u53D1\u9001"
};
var messageFor = (code) => messages[code] ?? "\u6682\u65F6\u6CA1\u80FD\u5B8C\u6210\u64CD\u4F5C\uFF0C\u8BF7\u5237\u65B0\u67E5\u770B\u72B6\u6001\u3002\u5982\u679C\u521A\u63D0\u4EA4\u4E86\u4EFB\u52A1\uFF0C\u8BF7\u5148\u68C0\u67E5\u4EFB\u52A1\u5217\u8868\uFF0C\u907F\u514D\u91CD\u590D\u521B\u5EFA\u3002";
var stateLabel = {
  pending: "\u7B49\u5F85\u6267\u884C",
  sending: "\u53D1\u9001\u4E2D",
  sent: "\u53D1\u9001\u6210\u529F",
  unknown: "\u5F85\u6838\u67E5",
  delegated: "\u7531 dsh-im \u540C\u6B65",
  skipped: "\u672A\u53D1\u9001",
  failed: "\u53D1\u9001\u5931\u8D25"
};

// src/client/Wizard.jsx
var import_react2 = __toESM(require("react"), 1);
function Wizard({ api, bots, fileChannels = [], onCreated, onCancel }) {
  const submitted = (0, import_react2.useRef)(false);
  const [options, setOptions] = (0, import_react2.useState)(null);
  const [error, setError] = (0, import_react2.useState)(null);
  const [workspaceId, setWorkspaceId] = (0, import_react2.useState)("");
  const [botId, setBotId] = (0, import_react2.useState)(bots.length === 1 ? bots[0].botId : "");
  const [targetId, setTargetId] = (0, import_react2.useState)("");
  const [targets, setTargets] = (0, import_react2.useState)([]);
  const [targetName, setTargetName] = (0, import_react2.useState)("");
  const [workspaceHint, setWorkspaceHint] = (0, import_react2.useState)(null);
  const [selectedBot, setSelectedBot] = (0, import_react2.useState)(null);
  const [targetsLoading, setTargetsLoading] = (0, import_react2.useState)(false);
  const [title, setTitle] = (0, import_react2.useState)("");
  const [prompt, setPrompt] = (0, import_react2.useState)("");
  const [kind, setKind] = (0, import_react2.useState)("daily");
  const [minutes, setMinutes] = (0, import_react2.useState)(5);
  const [time, setTime] = (0, import_react2.useState)("09:00");
  const [timeZone, setTimeZone] = (0, import_react2.useState)(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [weekdays, setWeekdays] = (0, import_react2.useState)([1, 2, 3, 4, 5]);
  const [busy, setBusy] = (0, import_react2.useState)(false);
  const [attempted, setAttempted] = (0, import_react2.useState)(false);
  const [requestId] = (0, import_react2.useState)(() => globalThis.crypto.randomUUID());
  (0, import_react2.useEffect)(() => {
    const abort = new AbortController();
    api("creation-options", {}, abort.signal).then((value) => {
      if (abort.signal.aborted) return;
      setOptions(value);
    }, (cause) => {
      if (!abort.signal.aborted) setError(messageFor(cause.code));
    });
    return () => abort.abort();
  }, [api]);
  (0, import_react2.useEffect)(() => {
    const abort = new AbortController();
    setTargets([]);
    setTargetId("");
    setTargetName("");
    setWorkspaceHint(null);
    setSelectedBot(null);
    setWorkspaceId("");
    setTargetsLoading(false);
    if (botId) {
      setTargetsLoading(true);
      api("recipient-options", { botId }, abort.signal).then((value) => {
        if (abort.signal.aborted) return;
        setTargets(value.targets);
        setSelectedBot(value.bot);
        if (value.targets.length === 1) {
          setTargetId(value.targets[0].targetId);
          if (value.targets[0].hasNote) setTargetName(value.targets[0].name);
        }
        if (value.workspaceId) {
          setWorkspaceId(value.workspaceId);
          setWorkspaceHint({ id: value.workspaceId, matched: value.workspaceMatched });
        }
      }, (cause) => {
        if (!abort.signal.aborted) setError(messageFor(cause.code));
      }).finally(() => {
        if (!abort.signal.aborted) setTargetsLoading(false);
      });
    }
    return () => abort.abort();
  }, [api, botId]);
  const timing = kind === "after" || kind === "every" ? { kind, minutes } : { kind, time, timeZone, ...kind === "weekly" ? { weekdays } : {} };
  const taskTitle = title.trim() || prompt.trim().split("\n")[0].slice(0, 40);
  const workReady = prompt.trim() && prompt.trim().length <= 1e5 && taskTitle.length <= 120 && (kind === "after" || kind === "every" ? Number.isInteger(minutes) && minutes >= 1 && minutes <= 525600 : time && timeZone && (kind !== "weekly" || weekdays.length > 0));
  const placeReady = options?.available && botId && !targetsLoading && options.workspaces.some((value) => value.id === workspaceId) && targets.some((value) => value.targetId === targetId && (!(value.needsName || value.hasNote) || targetName.trim().length > 0));
  const workspace = options?.workspaces.find((value) => value.id === workspaceId);
  const target = targets.find((value) => value.targetId === targetId);
  const destinationName = target?.needsName || target?.hasNote ? targetName.trim() || target.name : target?.name;
  const automaticWorkspace = workspaceHint?.id === workspaceId;
  const workspaceSelect = /* @__PURE__ */ import_react2.default.createElement("label", null, "\u4F7F\u7528\u54EA\u4E2A\u5DE5\u4F5C\u533A\u7684\u8D44\u6599", /* @__PURE__ */ import_react2.default.createElement("select", { "aria-label": "\u8D44\u6599\u6240\u5728\u5DE5\u4F5C\u533A", value: workspaceId, disabled: targetsLoading, onChange: (event) => setWorkspaceId(event.target.value) }, /* @__PURE__ */ import_react2.default.createElement("option", { value: "" }, "\u8BF7\u9009\u62E9\u5DE5\u4F5C\u533A"), options?.workspaces.map((value) => /* @__PURE__ */ import_react2.default.createElement("option", { key: value.id, value: value.id }, workspaceLabel(value)))));
  const schedule = timingLabel({ kind, minutes, time, weekdays }, kind === "daily" || kind === "weekly" ? timeZone : null);
  const create = async () => {
    if (submitted.current) return;
    setError(null);
    if (!workReady) {
      setError("\u8BF7\u586B\u5199\u8981\u505A\u7684\u4E8B\uFF0C\u5E76\u68C0\u67E5\u6267\u884C\u65F6\u95F4\u3002");
      return;
    }
    try {
      if (kind === "daily" || kind === "weekly") new Intl.DateTimeFormat("zh", { timeZone });
    } catch {
      setError("\u65F6\u533A\u65E0\u6CD5\u8BC6\u522B\uFF0C\u8BF7\u5728\u201C\u66F4\u591A\u8BBE\u7F6E\u201D\u4E2D\u68C0\u67E5\u3002");
      return;
    }
    if ((target?.needsName || target?.hasNote) && !targetName.trim()) {
      setError("\u8BF7\u7ED9\u8FD9\u4E2A\u63A5\u6536\u4F4D\u7F6E\u586B\u5199\u4E00\u4E2A\u5BB9\u6613\u8FA8\u8BA4\u7684\u540D\u5B57\u3002");
      return;
    }
    if (!placeReady) {
      setError("\u8BF7\u9009\u597D\u63A5\u6536\u4F4D\u7F6E\u548C\u8D44\u6599\u5DE5\u4F5C\u533A\u3002");
      return;
    }
    submitted.current = true;
    setAttempted(true);
    setBusy(true);
    setError(null);
    try {
      await onCreated(await api("create", {
        requestId,
        mode: "direct",
        title: taskTitle,
        prompt,
        timing,
        botId,
        workspaceId,
        sessionId: "",
        targetId,
        ...(target?.needsName || target?.hasNote) && targetName.trim() !== target?.name ? { targetName: targetName.trim() } : {}
      }));
    } catch (cause) {
      setError(messageFor(cause.code));
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ import_react2.default.createElement("section", { className: "dia-wizard", "aria-label": "\u521B\u5EFA\u5B9A\u65F6\u4EFB\u52A1" }, /* @__PURE__ */ import_react2.default.createElement("fieldset", { disabled: busy || attempted }, /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement("h3", null, "\u60F3\u8BA9 AI \u5B9A\u65F6\u5E2E\u4F60\u505A\u4EC0\u4E48\uFF1F"), /* @__PURE__ */ import_react2.default.createElement("label", null, "\u8981\u505A\u7684\u4E8B", /* @__PURE__ */ import_react2.default.createElement("textarea", { "aria-label": "\u8981\u505A\u7684\u4E8B", rows: 5, value: prompt, onChange: (event) => setPrompt(event.target.value), placeholder: "\u4F8B\u5982\uFF1A\u67E5\u770B\u4ECA\u5929\u7684\u9500\u552E\u6570\u636E\uFF0C\u603B\u7ED3\u8425\u4E1A\u989D\u3001\u7545\u9500\u83DC\u54C1\u548C\u9700\u8981\u6CE8\u610F\u7684\u95EE\u9898\u3002" })), /* @__PURE__ */ import_react2.default.createElement("p", { className: "dia-muted" }, "\u5B8C\u6210\u540E\u81EA\u52A8\u53D1\u9001\u6587\u5B57\u7ED3\u8BBA\uFF1B\u652F\u6301\u6587\u4EF6\u6295\u9012\u7684\u63A5\u6536\u65B9\u5F0F\u4F1A\u81EA\u52A8\u9644\u4E0A\u7ED3\u679C\u6587\u4EF6\u3002"), /* @__PURE__ */ import_react2.default.createElement("label", null, "\u4EC0\u4E48\u65F6\u5019\u505A", /* @__PURE__ */ import_react2.default.createElement("select", { "aria-label": "\u4EC0\u4E48\u65F6\u5019\u505A", value: kind, onChange: (event) => setKind(event.target.value) }, /* @__PURE__ */ import_react2.default.createElement("option", { value: "daily" }, "\u6BCF\u5929"), /* @__PURE__ */ import_react2.default.createElement("option", { value: "weekly" }, "\u6BCF\u5468"), /* @__PURE__ */ import_react2.default.createElement("option", { value: "after" }, "\u53EA\u505A\u4E00\u6B21"), /* @__PURE__ */ import_react2.default.createElement("option", { value: "every" }, "\u6BCF\u9694\u4E00\u6BB5\u65F6\u95F4"))), kind === "after" || kind === "every" ? /* @__PURE__ */ import_react2.default.createElement("label", null, kind === "after" ? "\u591A\u5C11\u5206\u949F\u540E\u6267\u884C" : "\u6BCF\u9694\u591A\u5C11\u5206\u949F", /* @__PURE__ */ import_react2.default.createElement("input", { "aria-label": "\u95F4\u9694\u5206\u949F", type: "number", min: 1, max: 525600, value: minutes, onChange: (event) => setMinutes(Number(event.target.value)) })) : /* @__PURE__ */ import_react2.default.createElement("label", null, "\u51E0\u70B9\u6267\u884C", /* @__PURE__ */ import_react2.default.createElement("input", { "aria-label": "\u51E0\u70B9\u6267\u884C", type: "time", value: time, onChange: (event) => setTime(event.target.value) })), kind === "weekly" && /* @__PURE__ */ import_react2.default.createElement("div", { className: "dia-days", role: "group", "aria-label": "\u9009\u62E9\u661F\u671F" }, ["\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u65E5"].map((day, index) => /* @__PURE__ */ import_react2.default.createElement("label", { key: day }, /* @__PURE__ */ import_react2.default.createElement("input", { type: "checkbox", checked: weekdays.includes(index + 1), onChange: (event) => {
    const checked = event.target.checked;
    setWeekdays((value) => checked ? [...value, index + 1] : value.filter((item) => item !== index + 1));
  } }), "\u5468", day)))), /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement("h3", null, "\u505A\u597D\u540E\uFF0C\u53D1\u5230\u54EA\u91CC\uFF1F"), /* @__PURE__ */ import_react2.default.createElement("p", { className: "dia-muted" }, "\u4EFB\u52A1\u5355\u72EC\u4FDD\u5B58\u6267\u884C\u8BB0\u5F55\uFF0C\u5B8C\u6210\u540E\u628A\u7ED3\u679C\u53D1\u5230\u4F60\u9009\u62E9\u7684 IM \u63A5\u6536\u4F4D\u7F6E\u3002"), botId && (selectedBot?.channel || bots.find((bot) => bot.botId === botId)?.channel) && /* @__PURE__ */ import_react2.default.createElement("p", { className: "dia-muted" }, fileChannels.includes(selectedBot?.channel ?? bots.find((bot) => bot.botId === botId)?.channel) ? "\u6709\u7ED3\u679C\u6587\u4EF6\u65F6\u81EA\u52A8\u4E00\u5E76\u53D1\u9001\uFF0C\u65E0\u9700\u989D\u5916\u8BBE\u7F6E\u3002" : "\u5F53\u524D\u63A5\u6536\u65B9\u5F0F\u53EA\u652F\u6301\u6587\u5B57\u3002\u98DE\u4E66\u53D1\u9001\u9644\u4EF6\u9700\u914D\u5957\u5347\u7EA7 dsh-im \u6587\u4EF6\u6295\u9012\u7248\u3002"), bots.length === 0 ? /* @__PURE__ */ import_react2.default.createElement("p", { className: "dia-warning" }, "\u8FD8\u6CA1\u6709\u8FDE\u63A5\u804A\u5929\u673A\u5668\u4EBA\u3002\u8BF7\u5148\u5230 Harness \u7684\u300CIM\u673A\u5668\u4EBA\u300D\u4E2D\u8FDE\u63A5\u673A\u5668\u4EBA\uFF0C\u518D\u8FD4\u56DE\u6B64\u9875\u5237\u65B0\u3002") : bots.length === 1 ? /* @__PURE__ */ import_react2.default.createElement("p", { className: "dia-muted" }, "\u53D1\u9001\u673A\u5668\u4EBA\uFF1A", botLabel(selectedBot ?? bots[0])) : /* @__PURE__ */ import_react2.default.createElement("label", null, "\u901A\u8FC7\u54EA\u4E2A\u673A\u5668\u4EBA\u53D1\u9001", /* @__PURE__ */ import_react2.default.createElement("select", { "aria-label": "\u53D1\u9001\u673A\u5668\u4EBA", value: botId, onChange: (event) => {
    setBotId(event.target.value);
    setTargetId("");
    setError(null);
  } }, /* @__PURE__ */ import_react2.default.createElement("option", { value: "" }, "\u8BF7\u9009\u62E9\u673A\u5668\u4EBA"), bots.map((value) => /* @__PURE__ */ import_react2.default.createElement("option", { key: value.botId, value: value.botId }, botLabel(selectedBot?.botId === value.botId ? selectedBot : value))))), /* @__PURE__ */ import_react2.default.createElement("label", null, "\u53D1\u7ED9\u8C01", /* @__PURE__ */ import_react2.default.createElement("select", { "aria-label": "\u53D1\u7ED9\u8C01", value: targetId, disabled: !botId || targetsLoading, onChange: (event) => {
    setTargetId(event.target.value);
    const chosen = targets.find((value) => value.targetId === event.target.value);
    setTargetName(chosen?.hasNote ? chosen.name : "");
  } }, /* @__PURE__ */ import_react2.default.createElement("option", { value: "" }, targetsLoading ? "\u6B63\u5728\u8BFB\u53D6\u63A5\u6536\u4F4D\u7F6E\u2026" : "\u8BF7\u9009\u62E9\u4E00\u4E2A\u4EBA\u6216\u7FA4\u804A"), targets.map((value) => /* @__PURE__ */ import_react2.default.createElement("option", { key: value.targetId, value: value.targetId }, value.name)))), botId && !targetsLoading && !targets.length && /* @__PURE__ */ import_react2.default.createElement("p", { className: "dia-warning" }, "\u8FD9\u4E2A\u673A\u5668\u4EBA\u8FD8\u6CA1\u6709\u4FDD\u5B58\u63A5\u6536\u4F4D\u7F6E\u3002\u8BF7\u5230\u300CIM\u673A\u5668\u4EBA \u2192 \u5BF9\u5E94\u673A\u5668\u4EBA \u2192 \u4E3B\u52A8\u6295\u9012\u300D\u6DFB\u52A0\u5E76\u6D4B\u8BD5\u4E00\u4E2A\u4EBA\u6216\u7FA4\u804A\uFF0C\u7136\u540E\u8FD4\u56DE\u91CD\u65B0\u6253\u5F00\u521B\u5EFA\u9875\u3002"), target?.needsName && /* @__PURE__ */ import_react2.default.createElement("div", { className: "dia-note" }, /* @__PURE__ */ import_react2.default.createElement("label", null, "\u7ED9\u8FD9\u4E2A\u63A5\u6536\u4F4D\u7F6E\u8D77\u4E2A\u540D\u5B57", /* @__PURE__ */ import_react2.default.createElement("input", { "aria-label": "\u63A5\u6536\u4F4D\u7F6E\u5907\u6CE8", value: targetName, maxLength: 80, onChange: (event) => setTargetName(event.target.value), placeholder: "\u4F8B\u5982\uFF1A\u6211\u7684\u98DE\u4E66\u3001\u95E8\u5E97\u8FD0\u8425\u7FA4" })), /* @__PURE__ */ import_react2.default.createElement("p", null, "\u804A\u5929\u8F6F\u4EF6\u6CA1\u6709\u63D0\u4F9B\u53EF\u8FA8\u8BA4\u7684\u540D\u79F0\u3002\u5907\u6CE8\u53EA\u9700\u586B\u4E00\u6B21\uFF0C\u4F1A\u81EA\u52A8\u8BB0\u4F4F\uFF1B\u4E0D\u4F1A\u6539\u53D8\u5B9E\u9645\u63A5\u6536\u4F4D\u7F6E\u3002")), target?.hasNote && /* @__PURE__ */ import_react2.default.createElement("details", null, /* @__PURE__ */ import_react2.default.createElement("summary", null, "\u4FEE\u6539\u63A5\u6536\u4F4D\u7F6E\u5907\u6CE8"), /* @__PURE__ */ import_react2.default.createElement("label", null, "\u63A5\u6536\u4F4D\u7F6E\u5907\u6CE8", /* @__PURE__ */ import_react2.default.createElement("input", { "aria-label": "\u63A5\u6536\u4F4D\u7F6E\u5907\u6CE8", value: targetName, maxLength: 80, onChange: (event) => setTargetName(event.target.value) })), /* @__PURE__ */ import_react2.default.createElement("p", { className: "dia-muted" }, "\u53EA\u66F4\u6539\u663E\u793A\u540D\u79F0\uFF0C\u4E0D\u6539\u53D8\u5B9E\u9645\u63A5\u6536\u4F4D\u7F6E\u3002")), automaticWorkspace ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "dia-note" }, /* @__PURE__ */ import_react2.default.createElement("strong", null, "\u4F7F\u7528\u300C", workspace ? workspaceLabel(workspace) : "", "\u300D\u7684\u8D44\u6599"), /* @__PURE__ */ import_react2.default.createElement("p", null, workspaceHint.matched ? "\u5DF2\u6839\u636E\u8BE5\u673A\u5668\u4EBA\u7684\u73B0\u6709\u5BF9\u8BDD\u81EA\u52A8\u5339\u914D\u3002" : "\u5DF2\u9009\u7528\u552F\u4E00\u53EF\u7528\u7684\u5DE5\u4F5C\u533A\u3002", "\u4EFB\u52A1\u8BB0\u5F55\u4E5F\u4F1A\u5355\u72EC\u4FDD\u5B58\u5728\u8FD9\u91CC\u3002"), /* @__PURE__ */ import_react2.default.createElement("details", null, /* @__PURE__ */ import_react2.default.createElement("summary", null, "\u66F4\u6362\u5DE5\u4F5C\u533A"), workspaceSelect)) : /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, workspaceSelect, /* @__PURE__ */ import_react2.default.createElement("p", { className: "dia-muted" }, "\u6682\u65F6\u65E0\u6CD5\u786E\u5B9A\u673A\u5668\u4EBA\u7684\u8D44\u6599\u76EE\u5F55\uFF0C\u8BF7\u9009\u62E9\u672C\u6B21\u4EFB\u52A1\u8981\u4F7F\u7528\u7684\u5DE5\u4F5C\u533A\u3002")), options && !options.workspaces.length && /* @__PURE__ */ import_react2.default.createElement("p", { className: "dia-warning" }, "\u8FD8\u6CA1\u6709\u5DE5\u4F5C\u533A\u3002\u8BF7\u5148\u5728 Harness \u4FA7\u8FB9\u680F\u70B9\u51FB\u201C\u6DFB\u52A0\u5DE5\u4F5C\u533A\u201D\uFF0C\u9009\u62E9\u8D44\u6599\u6587\u4EF6\u5939\u3002"), !options && /* @__PURE__ */ import_react2.default.createElement("p", null, "\u6B63\u5728\u8BFB\u53D6\u53EF\u7528\u7684\u5DE5\u4F5C\u533A\u2026"), options && !options.available && /* @__PURE__ */ import_react2.default.createElement("p", { className: "dia-warning" }, "\u5F53\u524D Harness \u6682\u4E0D\u652F\u6301\u521B\u5EFA\u4EFB\u52A1\uFF0C\u8BF7\u68C0\u67E5\u7248\u672C\u662F\u5426\u53D7\u652F\u6301\u3002")), /* @__PURE__ */ import_react2.default.createElement("details", null, /* @__PURE__ */ import_react2.default.createElement("summary", null, "\u66F4\u591A\u8BBE\u7F6E"), /* @__PURE__ */ import_react2.default.createElement("label", null, "\u4EFB\u52A1\u540D\u79F0\uFF08\u53EF\u9009\uFF09", /* @__PURE__ */ import_react2.default.createElement("input", { "aria-label": "\u4EFB\u52A1\u540D\u79F0", value: title, maxLength: 120, onChange: (event) => setTitle(event.target.value), placeholder: "\u81EA\u52A8\u6839\u636E\u5DE5\u4F5C\u5185\u5BB9\u547D\u540D" })), (kind === "daily" || kind === "weekly") && /* @__PURE__ */ import_react2.default.createElement("label", null, "\u65F6\u533A", /* @__PURE__ */ import_react2.default.createElement("input", { "aria-label": "\u65F6\u533A", value: timeZone, onChange: (event) => setTimeZone(event.target.value) }))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dia-note", "aria-label": "\u5B89\u6392\u9884\u89C8" }, /* @__PURE__ */ import_react2.default.createElement("p", null, schedule, destinationName ? ` \xB7 \u53D1\u7ED9 ${destinationName}` : " \xB7 \u8BF7\u9009\u62E9\u63A5\u6536\u4F4D\u7F6E"), /* @__PURE__ */ import_react2.default.createElement("p", { className: "dia-muted" }, "\u76F4\u63A5\u4FDD\u5B58\u5230 DSH\u300C\u81EA\u52A8\u5316\u4EFB\u52A1\u300D\uFF0C\u53EF\u968F\u65F6\u4FEE\u6539\u6216\u505C\u6B62\u3002"))), error && /* @__PURE__ */ import_react2.default.createElement("p", { className: "dia-warning", role: "alert" }, error), attempted && !busy && error && /* @__PURE__ */ import_react2.default.createElement("p", null, "\u8BF7\u5148\u8FD4\u56DE\u4EFB\u52A1\u5217\u8868\u786E\u8BA4\u662F\u5426\u5DF2\u521B\u5EFA\uFF0C\u907F\u514D\u91CD\u590D\u5B89\u6392\u3002"), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dia-actions" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", disabled: busy, onClick: onCancel }, "\u53D6\u6D88"), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "dia-primary", disabled: !options?.available || targetsLoading || busy || attempted, onClick: create }, busy ? "\u6B63\u5728\u5B89\u6392\u2026" : "\u521B\u5EFA\u4EFB\u52A1")));
}

// src/client/Settings.jsx
function TaskEditor({ api, task, config, deliveries, onSaved }) {
  const [draft, setDraft] = (0, import_react3.useState)(() => ({
    enabled: config?.enabled ?? false,
    mode: config?.mode ?? "direct",
    botId: config?.botId ?? "",
    targetId: config?.targetId ?? "",
    expectedRevision: config?.revision ?? 0
  }));
  const [targets, setTargets] = (0, import_react3.useState)([]);
  const [targetsLoading, setTargetsLoading] = (0, import_react3.useState)(false);
  const [busy, setBusy] = (0, import_react3.useState)(false);
  const [notice, setNotice] = (0, import_react3.useState)(null);
  const [targetError, setTargetError] = (0, import_react3.useState)(null);
  const [reload, setReload] = (0, import_react3.useState)(0);
  (0, import_react3.useEffect)(() => {
    const abort = new AbortController();
    setTargets([]);
    setTargetError(null);
    setTargetsLoading(Boolean(draft.botId));
    if (!draft.botId || draft.mode === "sync") {
      setTargetsLoading(false);
      return () => abort.abort();
    }
    api("targets", { botId: draft.botId }, abort.signal).then((value) => {
      if (!abort.signal.aborted) setTargets(value);
    }, (error) => {
      if (!abort.signal.aborted) setTargetError(messageFor(error.code));
    }).finally(() => {
      if (!abort.signal.aborted) setTargetsLoading(false);
    });
    return () => abort.abort();
  }, [api, draft.botId, draft.mode, reload]);
  const validTarget = targets.some((value) => value.targetId === draft.targetId);
  const canSend = draft.botId && validTarget && !targetsLoading;
  const bots = task.bots ?? [];
  const ineligible = draft.mode === "sync" ? task.syncIneligible : task.ineligible;
  const update = (patch) => {
    setDraft((value) => ({ ...value, ...patch }));
    setNotice(null);
  };
  const action = async (kind) => {
    setBusy(true);
    setNotice(null);
    try {
      if (kind === "save") {
        const value = await api("save", { taskId: task.id, ...draft });
        setDraft({ mode: value.mode ?? "direct", enabled: value.enabled, botId: value.botId, targetId: value.targetId, expectedRevision: value.revision });
        setNotice("\u5DF2\u4FDD\u5B58\uFF0C\u4ECE\u4E0B\u6B21\u4EFB\u52A1\u5F00\u59CB\u751F\u6548\u3002");
        await onSaved();
      } else {
        await api("test", { botId: draft.botId, targetId: draft.targetId });
        setNotice("\u6D4B\u8BD5\u6D88\u606F\u5DF2\u63D0\u4EA4\uFF0C\u8BF7\u5230\u804A\u5929\u8F6F\u4EF6\u67E5\u770B\u3002");
      }
    } catch (error) {
      setNotice(messageFor(error.code));
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ import_react3.default.createElement("section", { className: "dia-editor", "aria-label": "\u4EFB\u52A1\u6295\u9012\u914D\u7F6E" }, /* @__PURE__ */ import_react3.default.createElement("h3", null, task.title), /* @__PURE__ */ import_react3.default.createElement(TaskFeedback, { task, config, latest: deliveries[0] }), /* @__PURE__ */ import_react3.default.createElement("details", { className: "dia-edit-settings" }, /* @__PURE__ */ import_react3.default.createElement("summary", null, "\u4FEE\u6539\u63A5\u6536\u8BBE\u7F6E"), /* @__PURE__ */ import_react3.default.createElement("p", { className: "dia-muted" }, "AI \u505A\u597D\u540E\u53D1\u9001\u6587\u5B57\u7ED3\u8BBA\uFF1B\u6709\u7ED3\u679C\u6587\u4EF6\u65F6\u4E00\u5E76\u53D1\u9001\uFF0C\u65E0\u9700\u989D\u5916\u8BBE\u7F6E\u3002"), ineligible && /* @__PURE__ */ import_react3.default.createElement("p", { className: "dia-warning", role: "status" }, messageFor(ineligible)), /* @__PURE__ */ import_react3.default.createElement("fieldset", { disabled: busy }, draft.mode === "sync" ? /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement("p", { className: "dia-note" }, "\u8FD9\u662F\u65E7\u7248\u521B\u5EFA\u7684\u804A\u5929\u4EFB\u52A1\uFF0C\u6267\u884C\u8BB0\u5F55\u4ECD\u7559\u5728\u539F\u804A\u5929\u4E2D\u3002\u65B0\u4EFB\u52A1\u5DF2\u7EDF\u4E00\u5355\u72EC\u4FDD\u5B58\u8BB0\u5F55\uFF1B\u5982\u9700\u4F7F\u7528\u65B0\u65B9\u5F0F\uFF0C\u8BF7\u521B\u5EFA\u65B0\u4EFB\u52A1\uFF0C\u5E76\u5728\u201C\u81EA\u52A8\u5316\u4EFB\u52A1\u201D\u4E2D\u505C\u7528\u65E7\u4EFB\u52A1\u3002"), /* @__PURE__ */ import_react3.default.createElement("p", null, "\u7ED1\u5B9A\u673A\u5668\u4EBA\uFF1A", bots.find((bot) => bot.botId === task.binding?.botId) ? botLabel(bots.find((bot) => bot.botId === task.binding?.botId)) : "\u5F53\u524D\u804A\u5929\u673A\u5668\u4EBA")) : /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement("label", { className: "dia-switch" }, /* @__PURE__ */ import_react3.default.createElement(
    "input",
    {
      type: "checkbox",
      checked: draft.enabled,
      disabled: Boolean(task.ineligible) && !draft.enabled,
      onChange: (event) => update({ enabled: event.target.checked })
    }
  ), " \u505A\u597D\u540E\u53D1\u9001\u7ED3\u679C"), /* @__PURE__ */ import_react3.default.createElement("label", null, "\u53D1\u9001\u673A\u5668\u4EBA", /* @__PURE__ */ import_react3.default.createElement("select", { value: draft.botId, onChange: (event) => update({ botId: event.target.value, targetId: "" }) }, /* @__PURE__ */ import_react3.default.createElement("option", { value: "" }, "\u8BF7\u9009\u62E9\u673A\u5668\u4EBA"), draft.botId && !bots.some((bot) => bot.botId === draft.botId) && /* @__PURE__ */ import_react3.default.createElement("option", { value: draft.botId }, "\u539F\u673A\u5668\u4EBA\u5DF2\u79FB\u9664"), bots.map((bot) => /* @__PURE__ */ import_react3.default.createElement("option", { key: bot.botId, value: bot.botId }, botLabel(bot))))), /* @__PURE__ */ import_react3.default.createElement("label", null, "\u53D1\u7ED9\u8C01", /* @__PURE__ */ import_react3.default.createElement(
    "select",
    {
      value: draft.targetId,
      disabled: !draft.botId || targetsLoading,
      onChange: (event) => update({ targetId: event.target.value })
    },
    /* @__PURE__ */ import_react3.default.createElement("option", { value: "" }, targetsLoading ? "\u6B63\u5728\u8BFB\u53D6\u76EE\u6807\u2026" : "\u8BF7\u9009\u62E9\u4E00\u4E2A\u4EBA\u6216\u7FA4\u804A"),
    draft.targetId && !validTarget && /* @__PURE__ */ import_react3.default.createElement("option", { value: draft.targetId }, "\u539F\u63A5\u6536\u4F4D\u7F6E\u5DF2\u79FB\u9664"),
    targets.map((target) => /* @__PURE__ */ import_react3.default.createElement("option", { key: target.targetId, value: target.targetId }, target.name))
  )), targetError && /* @__PURE__ */ import_react3.default.createElement("p", { role: "alert" }, targetError), draft.botId && !targetsLoading && targets.length === 0 && !targetError && /* @__PURE__ */ import_react3.default.createElement("p", { className: "dia-muted" }, "\u8BF7\u5230\u300CIM\u673A\u5668\u4EBA\u300D\u4E2D\u4E3A\u8FD9\u4E2A\u673A\u5668\u4EBA\u6DFB\u52A0\u63A5\u6536\u4F4D\u7F6E\uFF0C\u518D\u70B9\u51FB\u201C\u5237\u65B0\u63A5\u6536\u4F4D\u7F6E\u201D\u3002"), /* @__PURE__ */ import_react3.default.createElement("div", { className: "dia-actions" }, /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", disabled: !draft.botId || targetsLoading, onClick: () => setReload((value) => value + 1) }, "\u5237\u65B0\u63A5\u6536\u4F4D\u7F6E"), /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", disabled: !canSend, onClick: () => action("test") }, "\u53D1\u4E00\u6761\u6D4B\u8BD5\u6D88\u606F"), /* @__PURE__ */ import_react3.default.createElement(
    "button",
    {
      type: "button",
      className: "dia-primary",
      disabled: draft.enabled ? !canSend || Boolean(task.ineligible) : !draft.botId || !draft.targetId,
      onClick: () => action("save")
    },
    "\u4FDD\u5B58\u66F4\u6539"
  )), /* @__PURE__ */ import_react3.default.createElement("details", null, /* @__PURE__ */ import_react3.default.createElement("summary", null, "\u66F4\u591A\u4FE1\u606F"), /* @__PURE__ */ import_react3.default.createElement("p", { className: "dia-muted" }, "\u8D44\u6599\u76EE\u5F55\uFF1A", task.cwd ?? "\u672A\u8BBE\u7F6E", /* @__PURE__ */ import_react3.default.createElement("br", null), "\u5BF9\u8BDD\u7F16\u53F7\uFF1A", task.sessionId), /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", className: "dia-link", onClick: () => {
    setDraft({
      enabled: config?.enabled ?? false,
      mode: config?.mode ?? "direct",
      botId: config?.botId ?? "",
      targetId: config?.targetId ?? "",
      expectedRevision: config?.revision ?? 0
    });
    setNotice(null);
  } }, "\u653E\u5F03\u672A\u4FDD\u5B58\u7684\u66F4\u6539")))), notice && /* @__PURE__ */ import_react3.default.createElement("p", { role: "status" }, notice)), /* @__PURE__ */ import_react3.default.createElement("h3", null, "\u6700\u8FD1\u7684\u7ED3\u679C"), deliveries.length === 0 ? /* @__PURE__ */ import_react3.default.createElement("p", { className: "dia-muted" }, "\u8FD8\u6CA1\u6709\u53D1\u9001\u8BB0\u5F55\u3002\u4EFB\u52A1\u7B2C\u4E00\u6B21\u505A\u597D\u540E\uFF0C\u4F1A\u5728\u8FD9\u91CC\u663E\u793A\u7ED3\u679C\u72B6\u6001\u3002") : /* @__PURE__ */ import_react3.default.createElement("ul", { className: "dia-history" }, deliveries.map((row) => /* @__PURE__ */ import_react3.default.createElement("li", { key: row.messageId }, /* @__PURE__ */ import_react3.default.createElement("div", null, /* @__PURE__ */ import_react3.default.createElement("strong", null, stateLabel[row.state]), /* @__PURE__ */ import_react3.default.createElement("time", null, dateLabel(row.updatedAt))), /* @__PURE__ */ import_react3.default.createElement("p", null, messageFor(row.reason)), row.files?.length > 0 && /* @__PURE__ */ import_react3.default.createElement("ul", null, row.files.map((file, index) => /* @__PURE__ */ import_react3.default.createElement("li", { key: index }, /* @__PURE__ */ import_react3.default.createElement("strong", null, file.fileName), " \xB7 ", stateLabel[file.state], /* @__PURE__ */ import_react3.default.createElement("p", null, messageFor(file.reason)))))))));
}
function Settings({ api, openSession, openAutomation, close }) {
  const [creating, setCreating] = (0, import_react3.useState)(false);
  const [notice, setNotice] = (0, import_react3.useState)(null);
  const [view, setView] = (0, import_react3.useState)(null);
  const [error, setError] = (0, import_react3.useState)(null);
  const [selected, setSelected] = (0, import_react3.useState)("");
  const [loading, setLoading] = (0, import_react3.useState)(false);
  const [reload, setReload] = (0, import_react3.useState)(0);
  (0, import_react3.useEffect)(() => {
    const abort = new AbortController();
    let inflight = false;
    const load = async () => {
      if (inflight) return;
      inflight = true;
      setLoading(true);
      try {
        const value = await api("view", {}, abort.signal);
        if (!abort.signal.aborted) {
          setView(value);
          setError(null);
        }
      } catch (cause) {
        if (!abort.signal.aborted) setError(messageFor(cause.code));
      } finally {
        inflight = false;
        if (!abort.signal.aborted) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(load, 5e3);
    return () => {
      abort.abort();
      clearInterval(timer);
    };
  }, [api, reload]);
  const task = view?.tasks.find((value) => value.id === selected);
  const allTasks = view?.tasks ?? [];
  const inProgress = (value) => value.running || ["pending", "sending"].includes(view.deliveries.find((row) => row.taskId === value.id)?.state);
  const activeTasks = allTasks.filter((value) => value.status !== "inactive" || inProgress(value)).sort((a, b) => (Date.parse(a.scheduledAt) || Infinity) - (Date.parse(b.scheduledAt) || Infinity));
  const endedTasks = allTasks.filter((value) => value.status === "inactive" && !inProgress(value)).sort((a, b) => activityTime(b, view.deliveries) - activityTime(a, view.deliveries));
  const cards = (tasks, compact = false) => /* @__PURE__ */ import_react3.default.createElement("ul", { className: compact ? "dia-task-list dia-compact-list" : "dia-task-list" }, tasks.map((value) => {
    const config = view.configs.find((config2) => config2.taskId === value.id);
    const latest = view.deliveries.find((row) => row.taskId === value.id);
    const progress = taskProgress(value, latest);
    if (compact) return /* @__PURE__ */ import_react3.default.createElement("li", { key: value.id }, /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", className: "dia-task-row", onClick: () => setSelected(value.id) }, /* @__PURE__ */ import_react3.default.createElement("span", { className: "dia-row-name" }, /* @__PURE__ */ import_react3.default.createElement("strong", null, value.title), value.recipientName && /* @__PURE__ */ import_react3.default.createElement("span", { className: "dia-muted" }, value.recipientName)), /* @__PURE__ */ import_react3.default.createElement("span", { className: "dia-row-state" }, /* @__PURE__ */ import_react3.default.createElement("span", null, progress.label), /* @__PURE__ */ import_react3.default.createElement("time", null, dateLabel(latest?.updatedAt ?? value.lastRunAt))), /* @__PURE__ */ import_react3.default.createElement("span", { className: "dia-row-arrow", "aria-hidden": "true" }, "\u203A")));
    return /* @__PURE__ */ import_react3.default.createElement("li", { key: value.id }, /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", className: "dia-task-card", onClick: () => setSelected(value.id) }, /* @__PURE__ */ import_react3.default.createElement("span", { className: "dia-card-top" }, /* @__PURE__ */ import_react3.default.createElement("strong", null, value.title), /* @__PURE__ */ import_react3.default.createElement("span", { className: "dia-badge" }, progress.label)), /* @__PURE__ */ import_react3.default.createElement("span", { className: "dia-muted" }, value.status !== "inactive" && value.scheduledAt ? `\u4E0B\u6B21\u6267\u884C\uFF1A${dateLabel(value.scheduledAt)}` : progress.hint), value.recipientName && /* @__PURE__ */ import_react3.default.createElement("span", { className: "dia-muted" }, "\u53D1\u9001\u7ED9\uFF1A", value.recipientName), /* @__PURE__ */ import_react3.default.createElement("span", { className: "dia-card-result" }, config?.mode === "sync" ? "\u65E7\u7248\u804A\u5929\u4EFB\u52A1" : config?.enabled ? "\u72EC\u7ACB\u4FDD\u5B58\u8BB0\u5F55 \xB7 \u5B8C\u6210\u540E\u53D1\u9001\u5230 IM" : config ? "\u7ED3\u679C\u53D1\u9001\u5DF2\u5173\u95ED" : "DSH \u539F\u751F\u4EFB\u52A1 \xB7 \u672A\u914D\u7F6E\u6D88\u606F\u53D1\u9001", /* @__PURE__ */ import_react3.default.createElement("span", { "aria-hidden": "true" }, "\u67E5\u770B\u8FDB\u5EA6\u4E0E\u7ED3\u679C \u2192"))));
  }));
  const onSaved = async () => {
    setReload((value) => value + 1);
  };
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "dia-root" }, /* @__PURE__ */ import_react3.default.createElement("header", null, /* @__PURE__ */ import_react3.default.createElement("div", null, /* @__PURE__ */ import_react3.default.createElement("h2", null, "\u5B9A\u65F6\u4EFB\u52A1\u4E0E\u6D88\u606F"), /* @__PURE__ */ import_react3.default.createElement("p", { className: "dia-muted" }, "\u8BA9 AI \u6309\u65F6\u505A\u4E8B\uFF0C\u628A\u7ED3\u679C\u53D1\u5230\u4F60\u7684\u804A\u5929\u91CC\u3002")), !creating && /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", className: "dia-primary", disabled: !view, onClick: () => {
    setSelected("");
    setCreating(true);
    setNotice(null);
  } }, "\u521B\u5EFA\u5B9A\u65F6\u4EFB\u52A1")), !creating && /* @__PURE__ */ import_react3.default.createElement("div", { className: "dia-note" }, /* @__PURE__ */ import_react3.default.createElement("p", null, "\u8FD9\u91CC\u5217\u51FA\u5F53\u524D Host \u7684\u5168\u90E8 DSH \u539F\u751F\u5B9A\u65F6\u4EFB\u52A1\u3002\u521B\u5EFA\u540E\u76F4\u63A5\u7531 DSH \u8C03\u5EA6\uFF0C\u53EF\u5728\u201C\u81EA\u52A8\u5316\u4EFB\u52A1\u201D\u4E2D\u4FEE\u6539\u65F6\u95F4\u3001\u6307\u4EE4\u6216\u505C\u6B62\u4EFB\u52A1\u3002"), openAutomation && /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", onClick: async () => {
    try {
      await openAutomation();
      close?.();
    } catch {
      setNotice("\u6682\u65F6\u65E0\u6CD5\u6253\u5F00\uFF0C\u8BF7\u4ECE DSH \u5DE6\u4FA7\u8FDB\u5165\u201C\u81EA\u52A8\u5316\u4EFB\u52A1\u201D\u3002");
    }
  } }, "\u6253\u5F00 DSH \u81EA\u52A8\u5316\u4EFB\u52A1")), notice && /* @__PURE__ */ import_react3.default.createElement("p", { role: "status", className: "dia-note" }, notice), error && /* @__PURE__ */ import_react3.default.createElement("p", { className: "dia-warning", role: "alert" }, error), view?.imError && /* @__PURE__ */ import_react3.default.createElement("p", { className: "dia-warning", role: "alert" }, messageFor(view.imError)), view?.health && /* @__PURE__ */ import_react3.default.createElement("p", { className: "dia-warning", role: "alert" }, messageFor(view.health)), !view && !error && /* @__PURE__ */ import_react3.default.createElement("p", null, "\u6B63\u5728\u8BFB\u53D6\u4EFB\u52A1\u2026"), creating && view ? /* @__PURE__ */ import_react3.default.createElement(Wizard, { api, bots: view.bots, fileChannels: view.fileChannels, onCancel: () => setCreating(false), onCreated: async (result) => {
    setCreating(false);
    setSelected(result.taskId);
    setReload((value) => value + 1);
    setNotice(result.configSaved ? "\u4EFB\u52A1\u5DF2\u4FDD\u5B58\uFF0C\u65E0\u9700\u518D\u6B21\u521B\u5EFA\u3002\u4F60\u53EF\u4EE5\u5728\u201C\u81EA\u52A8\u5316\u4EFB\u52A1\u201D\u4E2D\u4FEE\u6539\u65F6\u95F4\u6216\u505C\u6B62\u4EFB\u52A1\u3002" : "\u4EFB\u52A1\u5DF2\u521B\u5EFA\uFF0C\u4F46\u63A5\u6536\u8BBE\u7F6E\u8FD8\u6CA1\u4FDD\u5B58\u597D\u3002\u8BF7\u5728\u4E0B\u9762\u7EE7\u7EED\u8BBE\u7F6E\uFF0C\u4E0D\u8981\u91CD\u590D\u521B\u5EFA\u3002");
  } }) : /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, view?.creations?.filter((value) => value.state !== "created" || !value.configSaved).map((value) => /* @__PURE__ */ import_react3.default.createElement("p", { key: value.requestId, className: "dia-warning" }, "\u201C", value.title, "\u201D\uFF1A", value.state === "created" ? "\u5DF2\u7ECF\u521B\u5EFA\uFF0C\u8BF7\u7EE7\u7EED\u8BBE\u7F6E\u63A5\u6536\u4F4D\u7F6E\u3002" : "\u521B\u5EFA\u7ED3\u679C\u6682\u65F6\u65E0\u6CD5\u786E\u8BA4\u3002\u8BF7\u5148\u5728\u201C\u81EA\u52A8\u5316\u4EFB\u52A1\u201D\u4E2D\u68C0\u67E5\uFF0C\u907F\u514D\u91CD\u590D\u521B\u5EFA\u3002")), selected && !task && /* @__PURE__ */ import_react3.default.createElement("p", { role: "status" }, "\u4EFB\u52A1\u5DF2\u521B\u5EFA\uFF0C\u6B63\u5728\u8BFB\u53D6\u6267\u884C\u65F6\u95F4\u548C\u63A5\u6536\u8BBE\u7F6E\u2026"), task ? /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement("div", { className: "dia-actions" }, /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", onClick: () => setSelected("") }, "\u8FD4\u56DE\u4EFB\u52A1\u5217\u8868"), /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", disabled: loading, onClick: () => setReload((value) => value + 1) }, "\u5237\u65B0\u72B6\u6001"), openSession && /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", disabled: !task.hasExecution && !view.deliveries.some((row) => row.taskId === task.id), onClick: async () => {
    try {
      await openSession(task.sessionId);
      close?.();
    } catch {
      setNotice("\u6682\u65F6\u65E0\u6CD5\u6253\u5F00\u8BB0\u5F55\uFF0C\u8BF7\u5728\u5BF9\u5E94\u5DE5\u4F5C\u533A\u67E5\u770B\u3002");
    }
  } }, task.hasExecution || view.deliveries.some((row) => row.taskId === task.id) ? "\u67E5\u770B\u6267\u884C\u8BB0\u5F55" : "\u9996\u6B21\u6267\u884C\u540E\u53EF\u67E5\u770B\u8BB0\u5F55")), /* @__PURE__ */ import_react3.default.createElement(
    TaskEditor,
    {
      key: task.id,
      api,
      task: { ...task, bots: view.bots },
      config: view.configs.find((value) => value.taskId === task.id),
      deliveries: view.deliveries.filter((value) => value.taskId === task.id).slice(0, 20),
      onSaved
    }
  )) : view && /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement("div", { className: "dia-list-heading" }, /* @__PURE__ */ import_react3.default.createElement("h3", null, "\u5F53\u524D\u5B9A\u65F6\u4EFB\u52A1\uFF08", activeTasks.length, "\uFF09"), /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", disabled: loading, onClick: () => setReload((value) => value + 1) }, loading ? "\u5237\u65B0\u4E2D\u2026" : "\u5237\u65B0")), activeTasks.length > 0 ? cards(activeTasks) : endedTasks.length === 0 ? /* @__PURE__ */ import_react3.default.createElement("div", { className: "dia-empty" }, /* @__PURE__ */ import_react3.default.createElement("h3", null, "\u628A\u91CD\u590D\u7684\u5DE5\u4F5C\u4EA4\u7ED9 AI"), /* @__PURE__ */ import_react3.default.createElement("p", null, "\u4F8B\u5982\u6BCF\u5929\u65E9\u4E0A\u6574\u7406\u9500\u552E\u60C5\u51B5\uFF0C\u6216\u6BCF\u5468\u6C47\u603B\u9700\u8981\u8DDF\u8FDB\u7684\u4E8B\u60C5\u3002"), /* @__PURE__ */ import_react3.default.createElement("p", { className: "dia-muted" }, "\u70B9\u51FB\u53F3\u4E0A\u89D2\u201C\u521B\u5EFA\u5B9A\u65F6\u4EFB\u52A1\u201D\uFF0C\u586B\u5199\u5DE5\u4F5C\u5185\u5BB9\u548C\u65F6\u95F4\uFF0C\u9009\u597D\u63A5\u6536\u4F4D\u7F6E\u5373\u53EF\u521B\u5EFA\u3002")) : /* @__PURE__ */ import_react3.default.createElement("p", { className: "dia-muted" }, "\u5F53\u524D\u6CA1\u6709\u5F85\u6267\u884C\u4EFB\u52A1\uFF0C\u6700\u8FD1\u5B8C\u6210\u7684\u7ED3\u679C\u4ECD\u4FDD\u7559\u5728\u4E0B\u9762\u3002"), endedTasks.length > 0 && /* @__PURE__ */ import_react3.default.createElement("section", { "aria-label": "\u6700\u8FD1\u5B8C\u6210\u7684\u4EFB\u52A1" }, /* @__PURE__ */ import_react3.default.createElement("h3", null, "\u6700\u8FD1\u5B8C\u6210\u7684\u4EFB\u52A1"), cards(endedTasks.slice(0, 5), true)), endedTasks.length > 5 && /* @__PURE__ */ import_react3.default.createElement("details", null, /* @__PURE__ */ import_react3.default.createElement("summary", null, "\u66F4\u65E9\u7684\u4EFB\u52A1\u8BB0\u5F55\uFF08", endedTasks.length - 5, "\uFF09"), cards(endedTasks.slice(5), true)))));
}

// src/protocol.mjs
var RPC_METHOD = "dsh-im-automation";

// src/client/styles.css
var styles_default = "/* Use the Host theme so settings follow DSH appearance and user fonts. */\n.dia-root {\n  --dia-line: var(--dsw-alias-border-l4, color-mix(in srgb, currentColor 14%, transparent));\n  --dia-muted: var(--dsw-alias-label-tertiary, GrayText);\n  --dia-fill: var(--dsw-alias-bg-module-platform, color-mix(in srgb, currentColor 4%, transparent));\n  --dia-hover: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, currentColor 5%, transparent));\n  --dia-accent: var(--dsw-alias-state-business-primary, #4d6bfe);\n  box-sizing: border-box; max-width: 760px; margin: 0 auto; padding: 24px;\n  color: var(--dsw-alias-label-primary, inherit); font-family: var(--dsw-font-family, inherit); font-size: 14px; line-height: 1.6;\n}\n.dia-root header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }\n.dia-root h2 { margin: 0 0 6px; font-size: 20px; font-weight: 600; line-height: 1.4; letter-spacing: -.3px; }\n.dia-root h3 { margin: 24px 0 12px; font-size: 14px; font-weight: 600; }\n.dia-root p { margin: 8px 0; line-height: 1.6; }\n.dia-root header p, .dia-muted { color: var(--dia-muted); font-size: 12px; }\n.dia-note, .dia-warning { padding: 12px 14px; border-radius: var(--dsw-radius-md, 12px); background: var(--dia-fill); font-size: 12px; }\n.dia-warning { border-inline-start: 2px solid var(--dsw-alias-label-warning, #b58433); }\n.dia-root label { display: block; font-size: 14px; margin: 20px 0; }\n.dia-root select, .dia-root input:not([type=checkbox]), .dia-root textarea {\n  display: block; box-sizing: border-box; width: 100%; min-height: 36px; margin-top: 8px; padding: 7px 12px;\n  border: .5px solid var(--dia-line); border-radius: var(--dsw-radius-md, 12px);\n  color: inherit; background: var(--dsw-alias-bg-layer-1, Canvas); font: inherit; font-size: 14px; line-height: 22px;\n}\n.dia-root input::placeholder, .dia-root textarea::placeholder { color: var(--dsw-alias-label-dimmed, GrayText); }\n.dia-root textarea { resize: vertical; min-height: 112px; }\n.dia-root fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }\n.dia-root input[type=checkbox] { accent-color: var(--dia-accent); }\n.dia-switch { display: flex !important; align-items: center; gap: 8px; }\n.dia-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }\n.dia-root button {\n  box-sizing: border-box; cursor: pointer; min-height: 36px; padding: 6px 14px; color: inherit;\n  background: transparent; border: .5px solid var(--dia-line); border-radius: var(--dsw-radius-md, 12px);\n  font: inherit; font-size: 13px; line-height: 22px; transition: background .15s;\n}\n.dia-root button:hover:not(:disabled) { background: var(--dia-hover); }\n.dia-root button:disabled, .dia-root select:disabled { cursor: default; opacity: .4; }\n.dia-root .dia-primary { background: var(--dsw-alias-button-primary-fill, #292a2d); color: var(--dsw-alias-label-primary-foreground, white); border-color: transparent; }\n.dia-root .dia-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover, #44464a); }\n.dia-root .dia-link { border: 0; color: var(--dia-muted); padding-left: 0; margin-top: 8px; }\n.dia-history { padding: 0; list-style: none; }\n.dia-history li { padding: 14px 0; border-top: .5px solid var(--dia-line); }\n.dia-history li div { display: flex; gap: 12px; justify-content: space-between; }\n.dia-history time, .dia-history small { font-size: 12px; color: var(--dia-muted); overflow-wrap: anywhere; }\n.dia-history p { margin: 6px 0; font-size: 12px; color: var(--dia-muted); }\n.dia-root :focus-visible { outline: 2px solid var(--dia-accent); outline-offset: 2px; }\n.dia-days { display: flex; flex-wrap: wrap; gap: 12px; }\n.dia-steps { display: flex; gap: 24px; list-style: none; padding: 0 0 20px; margin: 0 0 24px; border-bottom: .5px solid var(--dia-line); font-size: 12px; }\n.dia-steps li { display: flex; gap: 8px; align-items: center; color: var(--dia-muted); }\n.dia-steps li[aria-current=step] { color: inherit; font-weight: 600; }\n.dia-steps li span { display: grid; place-items: center; width: 22px; height: 22px; background: var(--dia-fill); border-radius: 50%; font-size: 11px; }\n.dia-steps li[aria-current=step] span { background: var(--dsw-alias-label-primary, #292a2d); color: var(--dsw-alias-bg-layer-3, white); }\n.dia-root details { margin: 18px 0; font-size: 12px; }\n.dia-root summary { cursor: pointer; padding: 8px 0; color: var(--dia-muted); }\n.dia-root summary:hover { color: var(--dsw-alias-label-primary, inherit); }\n.dia-list-heading { display: flex; align-items: center; justify-content: space-between; margin-top: 28px; }\n.dia-list-heading h3 { margin: 0; }\n.dia-task-list { padding: 0; list-style: none; display: grid; gap: 8px; }\n.dia-root .dia-task-card { display: flex; flex-direction: column; gap: 10px; width: 100%; padding: 16px; border-color: var(--dia-line); text-align: left; }\n.dia-card-top, .dia-card-result { display: flex; justify-content: space-between; align-items: center; gap: 16px; }\n.dia-card-top strong { font-size: 14px; font-weight: 500; overflow-wrap: anywhere; }\n.dia-card-result { font-size: 12px; color: var(--dia-muted); }\n.dia-badge { white-space: nowrap; border-radius: var(--dsw-radius-sm, 8px); padding: 2px 8px; background: var(--dia-fill); color: var(--dia-muted); font-size: 11px; line-height: 20px; }\n.dia-empty, .dia-review { padding: 20px; border: .5px solid var(--dia-line); border-radius: var(--dsw-radius-lg, 16px); background: var(--dia-fill); }\n.dia-empty h3, .dia-review h4 { margin-top: 0; }\n.dia-review h4 { font-size: 16px; font-weight: 600; margin-bottom: 12px; }\n.dia-review dl { display: grid; grid-template-columns: 80px 1fr; gap: 16px; font-size: 13px; padding-top: 16px; border-top: .5px solid var(--dia-line); }\n.dia-review dt { color: var(--dia-muted); }\n.dia-review dd { margin: 0; overflow-wrap: anywhere; }\n.dia-prompt { white-space: pre-wrap; overflow-wrap: anywhere; }\n.dia-feedback { padding: 18px 20px; border: .5px solid var(--dia-line); border-radius: var(--dsw-radius-lg, 16px); background: var(--dia-fill); margin: 16px 0 24px; }\n.dia-feedback h3 { margin: 0 0 10px; font-size: 16px; }\n.dia-feedback p { margin: 8px 0; font-size: 13px; }\n.dia-feedback .dia-muted { font-size: 12px; }\n.dia-edit-settings { border-top: .5px solid var(--dia-line); border-bottom: .5px solid var(--dia-line); padding: 6px 0; }\n@media (max-width: 500px) {\n  .dia-root { padding: 16px; }\n  .dia-root header { align-items: flex-start; flex-wrap: wrap; }\n  .dia-history li div, .dia-card-top, .dia-card-result { align-items: flex-start; flex-direction: column; gap: 6px; }\n  .dia-steps { gap: 12px; }\n  .dia-review { padding: 16px; }\n  .dia-review dl { grid-template-columns: 64px 1fr; gap: 12px; }\n}\n\n.dia-compact-list { gap: 0; border-top: .5px solid var(--dia-line); }\n.dia-compact-list > li { border-bottom: .5px solid var(--dia-line); }\n.dia-root .dia-task-row { display: flex; align-items: center; gap: 16px; width: 100%; min-height: 64px; padding: 10px 8px; border: 0; border-radius: var(--dsw-radius-sm, 8px); text-align: left; }\n.dia-row-name { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 2px; }\n.dia-row-name strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; font-weight: 500; }\n.dia-row-state { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 12px; }\n.dia-row-state time, .dia-row-arrow { color: var(--dia-muted); }\n.dia-row-state time { font-size: 11px; }\n.dia-row-arrow { font-size: 20px; }\n@media (max-width: 500px) { .dia-root .dia-task-row { gap: 8px; } .dia-row-state { max-width: 45%; font-size: 11px; } }\n";

// src/client/index.jsx
var name = "dsh-im-automation-settings";
var inject = ["slots", "connection"];
function apply(ctx) {
  ctx.effect(() => {
    const style = document.createElement("style");
    style.textContent = styles_default;
    document.head.append(style);
    return () => style.remove();
  });
  const api = async (method, payload, signal) => {
    const result = await ctx.connection.rpc.call("/api", RPC_METHOD, { method, payload }, signal);
    if (result?.ok !== true) throw Object.assign(
      new Error(result?.error?.message ?? "operation-failed"),
      { code: result?.error?.code ?? "operation-failed" }
    );
    return result.value;
  };
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "dsh-im-automation",
    order: 22,
    label: () => "\u5B9A\u65F6\u4EFB\u52A1\u4E0E\u6D88\u606F",
    inject: () => ({ api, openAutomation: () => {
      const layout = ctx.get("layout");
      if (typeof layout?.selectPanel !== "function") throw new Error("automation-navigation-unavailable");
      layout.selectPanel("schedules");
    }, openSession: (id) => {
      const workspace = ctx.get("uiWorkspace");
      if (typeof workspace?.openSession !== "function") throw new Error("session-navigation-unavailable");
      workspace.openSession(id);
    } })
  }, (props) => /* @__PURE__ */ import_react4.default.createElement(Settings, { ...props })));
}

return module.exports;
}});
