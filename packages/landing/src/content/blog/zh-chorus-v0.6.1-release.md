---
title: "Chorus v0.6.1: 你的时间比 Token 贵，/yolo it！"
description: "还在逐行 review Claude Code 的输出？/yolo 让 Agent 自己审自己，把你从 review 地狱里捞出来。"
date: 2026-04-13
lang: zh
postSlug: chorus-v0.6.1-release
---

# Chorus v0.6.1: 你的时间比 Token 贵，/yolo it！

[Chorus](https://github.com/Chorus-AIDLC/Chorus) v0.6.1 来了！这个版本就做一件事：把你从无尽的 review Claude Code plan 地狱里捞出来。

---

## Review 地狱

用 Claude Code 写过完整功能的人都熟悉这个循环：给一个任务，等它做完，review plan，发现不对，打回去，改完再看，确认没问题，给下一个。再来一遍。再来一遍。

Agent 在写代码，你在全职 review。

Token 烧了一堆，但真正的瓶颈是你。每个 plan 要看，每段输出要审，稍微一走神就可能放过一个有问题的设计。Agent 的并行能力再强，也被卡在你一个人的 review 带宽上。

这不是模型的问题。模型够聪明。这是 harness 的问题：Agent 和你之间缺一道质量关卡，所以只能靠人肉盯着。

今天 Chorus 来补这道关卡了，让你敢于 `/yolo`。

---

## /yolo：一句话，从需求到交付

v0.6.1 给 Chorus 的 Claude Code 插件加了一条新命令：

```
/yolo 给项目加一个暗色模式，支持系统偏好自动切换
```

一句话进去，Agent 自动走完 Idea → Elaboration → Proposal → Review → 拆 Task → 并行开发 → 验证 → 完工。中间不问你一句话。

听起来很莽，但 `/yolo` 不是蒙眼狂奔。它之所以敢全自动，是因为 Chorus 的工作流里有三层机制在兜底。

---

## 第一层：Elaboration，先把需求聊透

Agent 拿到你的一句话之后，不会直接开始写方案。它先进入 Elaboration 阶段，生成一组关键问题：要支持哪些浏览器？数据要不要持久化？性能指标是多少？

正常流程里这些问题由人类回答。`/yolo` 模式下 Agent 自问自答，根据原始 prompt 推理出最合理的答案。

这一步的价值不在于答案有多准确，而在于它把 Agent 的假设摊到了明面上。所有自问自答全部记录在 Chorus 的审计链里。Agent 假设了什么、为什么选 A 不选 B，都能查到。交付的东西不对？回溯到 Elaboration 就能定位偏差出在哪，不用对着最终代码猜 Agent 到底在想什么。

全自动不等于黑箱。

## 第二层：Proposal，先想清楚再动手

Elaboration 之后，Agent 不是直接开始写代码，而是输出一份完整的 Proposal：技术文档、Task 拆分、依赖关系 DAG、每个 Task 的验收标准。

方案不是一段自由文本，而是结构化的：Document 承载技术设计，Task 定义工作单元，Acceptance Criteria 定义验收条件。审批通过后这些数据直接变成可执行的工作项，Agent 不需要再"理解"一遍自己写的计划。

没有人在旁边实时纠偏的时候，方案的质量直接决定后面所有 Task 的质量。Proposal 写歪了，五个 Agent 并行开发只会把错误放大五倍。所以 `/yolo` 在这一步反而是最慎重的：动手之前的功夫做足了，后面才敢放手跑。

## 第三层：Reviewer，让 Agent 审 Agent

Proposal 写完不是直接批准，`proposal-reviewer` 会自动介入。它检查接口定义和上下游对不对得上，Task 拆分粒度合不合理，验收标准是不是可测试的。不行？打回来附上具体的 BLOCKER，Agent 自己改。改完再提交，reviewer 再审。最多三轮，三轮还过不了自动上报人类。

Task 开发完成后也一样。`task-reviewer` 检查代码实现是否满足验收标准，不满足同样打回重做，同样三轮上限。

之前那些你亲自干的 review 工作，现在有个 Agent 替你扛了大头。接口对不对、标准满没满足、依赖画没画反，这些机械性检查不再消耗你的注意力。等内容递到你手上，已经过了一轮对抗性审查，你只需要做最终判断。

不是不 review 了，是 review 的主力换人了。

---

## 行业在收敛到同一个方向

上周 Anthropic 发布了两个东西，放在一起看很有意思。

**[Advisor Tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool)** 让 Sonnet 干活的时候随时请教 Opus。干活的归干活，把关的归把关。本质上就是给 Agent 配了一个段位更高的 reviewer。这跟 Chorus 的 Review Agent 解决的是同一类问题，区别在于 Advisor 是模型级别的（一次 API 调用内部完成），Chorus 的 Reviewer 是工作流级别的（独立进程、独立上下文、审查结果永久存档）。

**[UltraPlan](https://code.claude.com/docs/en/ultraplan)** 让 Claude Code 在云端先生成完整的实施计划，人类逐段评论、反复迭代，满意了再执行。这跟 Chorus 的 Proposal 机制解决同一个问题，区别在于 Chorus 的 Proposal 是结构化的（Document + Task DAG + AC），审批后直接实体化成工作项。

一个是"执行时有人看着"，一个是"动手前先想清楚"。行业对 Agent 工作流的认知正在收敛：**执行要快，但规划要慎重；自动化要深，但审查不能省。**

---

## 所以，/yolo

Elaboration 把假设摊开，Proposal 把方案想透，Reviewer 把质量守住。三层叠在一起，全自动就不再是"莽"，而是"有底气"。

`/yolo` 不是"我们终于做了全自动"，而是"我们终于有底气做全自动了"。你的时间不该花在逐行 review Agent 的输出上。

Ctrl+C 随时中断，所有已创建的实体都在 Chorus 里，用 `/develop` 或 `/review` 手动接管。某个 Task 反复过不了审（三轮上限），流水线不会卡死，标记为需要人工介入然后继续推进其他 Task。

---

## 试试看

```
/yolo 你想要的任何功能描述
```

v0.6.1 已发布到 [GitHub Releases](https://github.com/Chorus-AIDLC/Chorus/releases/tag/v0.6.1)。`/yolo` 作为 [Chorus Plugin](https://github.com/Chorus-AIDLC/Chorus/tree/main/public/chorus-plugin) 技能发布，安装后在 Claude Code 里直接使用。注意插件需要升级到 v0.7.0 版本，API Key 需要同时拥有 `pm_agent`、`admin_agent`、`developer_agent` 三个角色。

有问题或反馈？[GitHub Issues](https://github.com/Chorus-AIDLC/Chorus/issues) 或 [Discussions](https://github.com/Chorus-AIDLC/Chorus/discussions)。

---

**GitHub**: [Chorus-AIDLC/Chorus](https://github.com/Chorus-AIDLC/Chorus) | **Release**: [v0.6.1](https://github.com/Chorus-AIDLC/Chorus/releases/tag/v0.6.1)
