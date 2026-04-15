# 写了三个月 Agent Harness，我终于敢让 Claude Code 全自动写代码了

我日常用 Claude Code 做项目开发。之前的工作流大概是这样的：Asana 上有个任务，我把描述复制出来贴给 Claude Code，等它做完，再把总结贴回 Asana。下一个任务，再来一遍。

干了几周我就崩溃了。我本质上变成了一个人肉 adapter，在 Asana 和终端之间来回搬运文本。Agent 明明能自己干活，但它不知道该干什么，干完了也不知道去哪交差。这些上下文全锁在我脑子里，或者锁在 Asana 这种 Agent 根本没法用的工具里。

所以从 2 月开始我做了个开源项目 [Chorus](https://github.com/Chorus-AIDLC/Chorus)，想法很简单：给 Agent 一个它自己能用的任务管理器，让它自己领任务、做任务、交任务。

实际用起来大概是这样：

![Chorus 实际使用效果](https://chorus-ai.dev/images/idea-tracker.gif)

下面按时间线聊聊这三个月我踩了哪些坑，做了哪些决策，怎么一步步走到现在敢加上 `/yolo` 命令让 CC 自己跑全流程的。

## v0.1（2 月底）：先让 Agent 自己看到活

第一版就是把管道跑通：Idea -> Proposal -> Task -> Execute -> Verify。

工作流参考了 AWS 的 [AI-DLC（AI-Driven Development Lifecycle）](https://aws.amazon.com/blogs/devops/ai-driven-development-life-cycle/)，简单说就是不在现有流程上"加个 AI 助手"，而是让 AI 来主导整个开发生命周期。

我在这基础上加了个"反转对话"的设计：人只负责抛一个粗糙的想法，PM Agent 主动提问把需求聊清楚，然后自己出方案、拆任务，审批通过后 Developer Agent 去领活干。

配合 Claude Code 的插件机制，我做了一个自动注入：每次打开 Claude Code，插件会自动把当前项目里还有哪些活要干、哪些任务被分配给了你，直接塞进上下文。Agent 一进来就知道该干嘛，不用我再复制粘贴任务描述了。

但很快我就发现，"能看到活"和"能把活干好"之间的距离，比想象中远得多。

## v0.4（3 月中）：Agent 太容易"自以为做完了"

跑了两周，最大的问题浮出来了：Agent 说"我做完了"这句话，可信度大概五成。

"代码写了但没测"、"主流程通了但边界没覆盖"，这种情况隔三差五就来一次。Agent 不是故意偷懒，但它确实不会主动对着验收标准逐条检查。

所以 v0.4 加了两个机制：

**验收标准 checklist**。给每个 Task 加了独立的 AC（Acceptance Criteria）列表。Agent 做完后必须逐条自检标记 pass/fail，然后人或 Admin Agent 再逐条确认。

**依赖强制执行**。上游任务没验收通过，下游任务压根不会解锁。不是"建议你先做 A 再做 B"，而是 B 的 API 直接不返回给你。

说白了就是不靠 Agent 自觉，靠环境约束。你没法指望 Agent 每次都"记得"检查验收标准，但你可以让它在没检查的情况下根本提交不了。

## v0.6（4 月初）：让 Agent 审 Agent，因为我又成了瓶颈

质量关卡加上了，但谁来执行验收？还是我。

Agent 出了 Proposal 我得看，Task 做完我得验，AC 逐条我得确认。工作量从"复制粘贴"换成了"逐条 review"，但瓶颈还是卡在我一个人身上。

正好这段时间 Claude Code 源代码"开源"了，我仔细研究了一遍它的插件机制，发现 Claude Code 的插件可以定义独立的 agent。这些 agent 有自己的 system prompt、自己的上下文，跟执行开发任务的 agent 完全隔离。这就意味着我可以在插件里定义一个专门干 review 的 agent，它完全没见过开发过程中的上下文，天然就是个旁观者视角来审查。

想明白这一点之后，v0.6 做了这个项目最关键的一个决定：让 Agent 审 Agent。

在 Chorus 插件里定义了两个 reviewer agent：`proposal-reviewer` 审方案（接口设计对不对得上、任务拆分合不合理、AC 能不能测），`task-reviewer` 审代码（实现有没有满足 AC）。它们有各自的 system prompt 和审查规则，审查记录永久存档。审不过就打回，附上具体问题，Agent 自己改完再交。最多三轮，三轮还过不了才上报人类。

这一步是转折点。之前不管自动化做到什么程度，最后总有个环节卡在我身上。现在接口对不对得上、标准满没满足、依赖有没有画反这些检查都有 reviewer 扛着了。等东西递到我手上的时候，已经被挑过一轮刺了，我只要做最终判断。

## v0.6.1（上周）：/yolo，全串起来了

到这一步，拼图终于凑齐了。Elaboration 把需求聊透，Proposal 把方案想清楚，Reviewer 把质量守住，全自动的前提条件都满足了。

```
/yolo 给项目加一个暗色模式，支持系统偏好自动切换
```

一句话进去，Agent 自己走完整条管道，中间不问你一句话。

Ctrl+C 随时能断，所有已创建的任务都持久化了，随时可以手动接管继续做。某个 Task 反复过不了审，流水线不会卡死，标记成需要人工介入然后继续推进其他 Task。

## 实际用下来怎么样

不是每次都完美，复杂 feature 偶尔会在 Proposal 阶段跑偏，reviewer 能抓到一部分但不是全部。

但有两个变化很明显：

一是**调试思路变了**。之前出问题得从最终代码往回猜 Agent 哪步想歪了，现在直接翻 Elaboration 记录和 Proposal 审查历史就能定位到是哪个假设出了偏差。

二是**我的时间释放出来了**。之前大部分时间在逐条 review，现在主要在想下一个 feature 做什么，reviewer 标记"需要人工介入"的时候才去看一眼。

中等复杂度的 feature（3-8 个 task），成功率比我预期的高。Proposal 阶段方向对了，后面基本不出大问题。

用这套机制做的一个项目：[Gleaner](https://github.com/ChenNima/Gleaner)（[Demo](https://gleaner.chorus-ai.dev/)），一个纯前端的 GitHub repo 知识库渲染器，帮你缓存和渲染 GitHub repo 里的 Markdown 内容。起因是想有个地方整理知识，但 Obsidian 太重了，我只想要一个轻量的、用 Git 管理的方案。从需求到交付基本就是 `/yolo` 跑出来的。

## Anthropic 发了差不多的功能

上周 Anthropic 发了两个东西挺有意思。Advisor Tool 让 Sonnet 干活时随时请教 Opus，说白了就是模型级的 reviewer。UltraPlan 让 Claude Code 先在云端出完整计划再执行，说白了就是 Proposal 机制。一个是"执行时有人看着"，一个是"动手前先想清楚"，跟我在 Chorus 里做的事情高度重合。

## 项目信息

开源，AGPL-3.0，Next.js + Prisma + PostgreSQL。项目本身就是用 Chorus + Claude Code 开发的，吃自己狗粮。

- GitHub: https://github.com/Chorus-AIDLC/Chorus
- v0.6.1 Release: https://github.com/Chorus-AIDLC/Chorus/releases/tag/v0.6.1
- v0.6.1 详细博文: https://chorus-ai.dev/zh/blog/chorus-v0.6.1-release/

有问题欢迎 Issues 或 Discussions。
