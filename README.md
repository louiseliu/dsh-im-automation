# dsh-im-automation

把 DeepSeek Harness 原生定时任务的 AI 最终回答，通过 dsh-im 发到指定的个人或群聊。适合定时发送日报、巡检结论和报表。任务由 Harness 调度，每个任务使用独立会话保存执行记录。

## 安装

- 已验证 Harness `0.2.1-rc.5` 和 `0.2.2-alpha.2`。
- 请在同一个 Harness Host 安装本插件和 dsh-im，并在 dsh-im 中配置机器人与接收目标。文字投递已验证 dsh-im `5.9.1`。
- 从本仓库克隆或下载源码后，使用 Node.js `22.19` 或更高版本构建安装包。

```sh
npm ci
npm pack
```

- **桌面版**在「插件 → 添加插件」中输入生成的 `dsh-im-automation-0.5.0.tgz` 的绝对路径。
- **Web 版**使用以下命令，将示例路径替换为实际路径。

```sh
dsh plugin --profile web add /absolute/path/dsh-im-automation-0.5.0.tgz
```

安装后重新打开对应的 Harness Host。

## 创建任务

1. 打开「设置 → 定时任务与消息 → 创建定时任务」。
2. 填写任务指令和执行时间，选择机器人、接收位置和资料工作区。
3. 核对页面底部的安排，点击「创建任务」。

每个任务可配置一个接收位置。任务触发后，可以从插件设置打开执行记录，查看文字和文件的投递状态。「发送测试消息」用于检查文字通道。修改任务指令、调整时间、停用或删除任务，可从「打开 DSH 自动化任务」进入原生管理页。已有原生任务也可在插件设置中配置接收位置。

## 发送飞书附件

本插件 `0.5.0` 搭配 dsh-im `5.9.1-automation-files.1`，可向飞书个人或群聊发送附件。任务完成后先发送 Markdown 结论，再发送本次执行通过 Harness 原生 `present` 声明的结果文件。每个文件和单次附件总量上限均为 20 MB，机器人需要 `im:resource` 上传权限。

配套版本基于 dsh-im `5.9.1` 源码构建。准备原版源码及构建依赖后，从本仓库运行以下命令，再将生成的配套安装包安装到同一个 Host。

```sh
node scripts/package-im-files.mjs /absolute/path/dsh-im-5.9.1 /absolute/path/build-dependencies
```

使用原版 dsh-im 或其他平台时，支持投递文字。发送状态显示「待核查」时，请先到接收位置确认。插件会记录投递状态，避免在结果不明时自动重发。

## 开发

```sh
npm ci
npm run check
```

`npm run check` 会构建插件并运行单元、界面和集成测试。测试使用平台替身，无需真实机器人凭据。更多环境和验证记录见[兼容性报告](docs/compatibility.md)。

## 许可证

[MIT](LICENSE)。依赖的许可见[第三方声明](THIRD_PARTY_NOTICES.md)。
