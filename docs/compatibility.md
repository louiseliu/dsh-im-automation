# 官方发布版兼容性验证

验证日期：2026-11-03。

## 发布包与主分支不同

官方 npm `latest` 为 `0.2.1-rc.5`，`alpha` 为 `0.2.2-alpha.2`。
主分支提交 `ce7073d51254c26cd63b22a60835b8f948deb447` 含 `target.kind: new`，
但实际发布的 `@deepseek-ai/dsh-schedule@0.2.2-alpha.2` 不含此能力。
不能以主分支的 package.json 版本号推定已发布包具有同样接口。

用户已选择调整为：**每个投递任务一个独立原生会话，保持官方安装版，不另做调度器。**
本项目不实现“每次执行创建新会话”，也不修改任务的会话绑定。

## 关联链路

在原生 `schedule.catalog()` 读取任务及其 Session，通过 `schedule.history()` 读取投递回执。
回执的 `messageId` 与 `agent/inbox/claimed.message.id` 相同，领取事件提供 `turn`。
插件运行和恢复时直接折叠原生持久事件：

- `agent/inbox/spliced` 重建消息领取，覆盖 pre-step 失败且尚未写入 `user/message` 的情况。
- `turn/start` 和 `user/message` 定位任务所属回合。
- `tool/call` 清空此前的寒暄或中间文字。
- `assistant/message` 读取正式助手输出。
- `turn/end.reason.kind === completed` 才允许发送。

实测顺序可以是：创建通知 → 回合开始 → 领取 → 输入 → 回答 → 回合结束 → 回执提交通知。
因此同时监听 `turn/end` 和 `schedule/changed`，并定期补查持久状态。定期补查不创建或执行自动化任务。

## 已验证环境

1. npm 发布的 `0.2.2-alpha.2` 组件。
2. 本机官方 `0.2.1-rc.5` 桌面应用 runtime 的临时副本，补入其原本随包分发的原生模块；未修改上游源码或用户安装。
3. dsh-im `5.9.1` 未修改 checkout 的真实 DeliveryService，使用本地平台适配器替身。

包含：两个任务分别投递、多次工具调用只发送最终回答、普通聊天不投递、取消不发送、JSONL 冷恢复、状态持久化、重启去重、构建产物加载、RPC 配置及插件卸载/重载。
单元测试另覆盖共享会话、已有 IM 绑定、失效目标、离线、网络未知结果、持久化写入失败和原生发生项重投递。

最低**已验证**版本为 `0.2.1-rc.5`，不推断更早版本可用。安装清单只允许两个已验证版本。
官方 CLI 已在隔离 profile 中成功安装 tarball 并追加 bundle。桌面版 0.2.1-rc.5 的 CLI 明确拒绝 desktop profile，桌面安装应走应用内插件管理。真实平台接收、浏览器视觉验收以及用户自己的 Host 安装需单独验证。

## 安装版本支持依据

- [官方插件打包与安装](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)
- [官方发布记录](https://github.com/deepseek-ai/deepseek-harness/releases)
- [dsh-im 主动投递契约](https://github.com/xmanrui/dsh-im/blob/main/PROACTIVE_DELIVERY.md)

## 本机真实端到端验收

2026-11-03 已在官方桌面版 `0.2.1-rc.5` 中，通过应用内插件管理安装并启用 `0.1.1`。

- 设置页能够读取原生任务、指定飞书机器人及已保存的接收目标。
- 通过 AI 的内置 `schedule_create` 在独立会话中创建一次性原生任务，任务显示在官方自动化列表。
- 任务于 09:28 执行，AI 调用计算过程后给出 `137 × 29 = 3973` 和执行时间 `09:28:06 CST`。
- 插件于 `09:28:11` 保存唯一一条 `sent / platform-accepted` 记录。
- 已在本机飞书客户端观察到对应机器人会话中的实际结果消息，而非仅检查发送接口回执。
- 两条联调测试任务均已处于原生 `inactive` 状态，没有后续调度；保留记录便于复核。
- 已安装的 Host bundle 与源码目录的构建产物哈希一致。

联调中修正了 `ctx.dshIm.listTargets(botId)` 的公开契约：返回目标数组，而内部 DeliveryService 返回 `{targets, ...}`。
集成测试现使用与 Host 实际注入相同的 facade，避免把内部服务响应误当作公开接口。

## 0.2.2 原生任务向导与两种模式

新增入口调用官方 `sessionController.create({sessionId,workspaceId})` 创建独立对话，再调用 `schedule.create(sessionId,request)`。会话同步方式直接使用 dsh-im `describeConversation` 确认的现有绑定对话，不新建对话，也不调用插件发送接口。查询工作区使用 `workspaceRegistry`，查询候选会话使用持久化元数据，不读取聊天正文。

已在 alpha.2 与官方 rc.5 runtime 验证原生任务进入 catalog、AI 定时执行、日志保存在指定 Session、重载创建请求去重、原存储格式和已成功发送记录兼容。测试中的 Session 创建入口与工作区注册使用边界替身，AgentLoop、任务调度和持久化使用官方原件；官方 controller 的 workspaceId 及 attachSession 行为另外核对发布代码。不能把替身测试等同于桌面创建向导的完整实机验收。

使用未修改的 dsh-im 5.9.1 SessionSyncCoordinator 接收真实原生任务事件：全局投递关闭时只保留对话，开启时恰好产生一次同步输出；插件没有重复调用 send。平台端仍为替身，此项不等同于真实飞书接收。

rc.5 的 JSON 后端不支持新版 compatibleVersions 跨版本声明。因此保留 domain 版本 1，新增可选默认模式字段及 creations 表；在两个官方 runtime 中验证旧格式加载，成功发送记录保持不变。

实机发现已安装的 npm `@xmanrui/dsh-im@5.9.1` 不含仓库当前源码的全局同步 RPC；该发布包使用目标级 sessionSync 配置。插件对缺失全局接口显示状态未知及旧版配置提示，不擅自修改 dsh-im，也不声称已开启同步。读取工作区与查找绑定对话分开，后者仅在选择会话同步方式时执行，避免阻塞独立任务向导。

桌面实机追加验证：向导使用官方 controller 创建独立会话，任务确实显示在原生列表，对话归入 所选工作区，并可从插件设置打开。沿用 IM 模式列出了指定机器人的实际绑定对话。

首次真实任务暴露了工作区上下文差异：agent-instructions/instructions、skill-catalog/catalog、time-context/snapshot 是官方注入信息，不应判为人类插话。0.2.2 对这些精确组合放行，回归继续拒绝 user 类型消息（即使伪装相同 form）。原来已跳过的发生项保留跳过状态，不补发；修正后用新的原生一次性任务验收。

0.2.2 修正后实机验收成功：原生任务 `schedule-36c0017c-daa1-4fd6-a643-3abd9827e0d5` 在会话 `session-280d316c-5e8b-4521-852e-0eec189259f0` 完成，桌面可见回答“向导验收：137×29=3973”。插件保存唯一一条 `sent / platform-accepted`，目标为用户授权目标，两个本轮一次性任务均为 inactive。本轮验证了真实平台接受回执，未再次打开飞书客户端确认最终可见消息；此前 0.1.1 的飞书可见接收验收仍单独保留。已安装 Host 和客户端代码与本次构建一致。

## 0.5.0 原生交付文件与配套 IM 通道

自动化插件读取本次成功完成回合内的 `deliverables/presented`，只处理原生明确声明的绝对文件路径，不从 Markdown 或工具输出中猜测附件。已启用的独立任务通过 scoped systemPrompt context 获得 `present` 使用指引，原调度指令及时间不改写。

原版 dsh-im 5.9.1 的公开 send 接口仅支持文本。因此提供本地派生包 `5.9.1-automation-files.1`，增加 Host-only `fileChannels` / `sendFile`，通过原接收目标、原 adapter/controller、飞书 runtime 和原 VerifiedFeishuChannel 上传并发送文件。个人目标使用 open_id，群聊使用 chat_id；文件上传复用原错误映射和平台 UUID，自动化通道关闭不确定结果的内置再次尝试。没有增加外部上传路由，不修改用户安装或 DSH 源码。配套包由 `compat/dsh-im-files.mjs` 对临时源副本制作，保留上游许可证和客户端产物。

0.5.0 检查：79 项单元/界面测试、16 项集成测试全部通过；另外在官方桌面 rc.5 runtime 通过 4 项文件集成测试。覆盖原生任务完成、原生文件声明持久化、文字及文件分别投递、个人/群聊目标、文件权限拒绝、结果不明、重启去重与确认写入失败。真实 IM 服务、adapter、runtime、文件上传逻辑均使用实际源码，平台 SDK 调用端为替身。配套构建产物已验证可加载并暴露文件发送入口。未向真实飞书发送文件，本轮不声称实机收件验收。
