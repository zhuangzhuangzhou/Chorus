# 大家都在嫌弃 MCP 的时候我发现有点离不开它

MCP 这个协议刚出来的时候我感觉它到处透露着过度设计的味道，难用又难写，工作需要又不得不用，几乎就是捏着鼻子写。看到社区现在几乎一边倒地嫌弃它，要用 api 和 cli 替代掉它的时候我还有点幸灾乐祸。

但我在开发自己的 Harness 项目 [Chorus](https://github.com/Chorus-AIDLC/Chorus) 的时候又发现一些场景下没办法替换掉 MCP，主要的原因是**通过MCP 可以更好地感知 Agent 的意图**。有点抽象，让我给大伙把我碰到的问题展开唠唠。

首先说说我想达到什么效果吧，Chorus 是一个用来让 Claude Code 这样的 Coding Agent 能自主推进从需求到设计最后到交付流程的 Harness，前端看起来大概是这样，能跟踪 Agent 的工作到底到哪了

![chorus](https://chorus-ai.dev/images/idea-tracker-overview.png)

在这个流程里的关键节点，比如 Proposal 或者 Task 提交审批，就需要在 claude code 里启动一个独立的 Agent 去替人类审，揪出问题，用对抗的方式让 Agent 自己迭代出没有太大问题的结果

![reviewer](https://i.v2ex.co/J0S1B832.png)

那么问题来了：**我应该如何让 Claude Code 在这几个关键节点稳定地启动 Reviewer Agent 呢？**

## 方法1: 用 Skill 或者 Prompt
这是最简单的方式，直接在 Skill 里写清楚，“你必须在 XXX 节点调用 XXX Agent， 根据反馈然后去做 XXX” 非常简单但不靠谱，现在的 Agent 大家调过 PE 也知道，在 Skill 里写的真的会一致遵从吗？尤其是一个小迭代它自己跑上半小时，一开始的 PE 都忘得差不多了，这个方案只是锦上添花但是不解决问题

## 方法2：在调用返回中注入 Prompt
既然放在 Skill 里不靠谱，能不能在要启动 Reviewer 的时间点直接给 CC 注入 Prompt呢？最简单的做法就是上一步动作，比如`提交审批`这个调用的返回结果里提醒 CC 你该启动一个 Agent 去 review 结果了。其实这个手法是有效的，但存在几个问题：

1. **耦合性**：不一定每个 Agent 框架都支持你去启动一个自定义 Agent，遇到不支持的框架你还这么返回就会让 Agent 陷入困惑，执行一些迷惑操作。另外如果你想支持这个 Review Agent 的启用与否，还需要和你的服务耦合，你需要在自己的服务侧去定义这个配置，而不是让用户在自己的 Claude Code 等环境里做用户侧配置
2. **语义不清晰**：如果是 MCP 这么返回还好，如果你用 API 或者 CLI 还这么返回，会让你的接口一直混着一些专门给 Agent 准备的内容，那你这些接口是只给 Agent 用还是其他的集成也能用呢？当然这不是一个致命问题，加一个设计复杂度比如额外传参，路径分离等也能解决，但是加上这些设计不就变成自己设计了一套类 MCP 的形式吗？

## 方法3：在 Hook 处捕获事件
大多数成熟的 Coding Agent 都支持 Hooks，这也是这类 Agent 的插件系统里最有用的机制，其实就是利用 AOP 的思想去在某一个关键节点上做一些操作。比如我现在的需求，只需要在`提交审批`这个动作之后去读取本地 Claude Code 配置，如果启用了 Reviewer Agent，启动它就好。下一个问题是：我如何才能知道 Claude Code 触发了`提交审批`这个动作，并且提取参数（Proposal ID 等）来让 Reviewer Agent 知道自己到底要去看哪个资源？

拿 Claude Code 举例子，它的 Hook 机制大多数是围绕自己的生命周期流程的，比如`SubagentStart`, `SessionStart`等。如何才能知道它在 Chorus 上调用了`提交审批`这个动作呢？很明显用`PostToolUse`这个钩子。

如果我的服务用 CLI 或者 API 去暴露接口，那么对应的tool use其实是`bash`或者`fetch`等等通用的命令/网络操作调用，你想在其中解析出意图不是不可能，但非常不可靠。Claude Code 今天心情好给你直接调用，明天心情不好也许写了一个py脚本调用，你怎么去抓呢，参数匹配能出的幺蛾子就更多了。

对比之下用 MCP 去匹配意图简直是手拿把掐，因为 CC 暂时不支持配置本地工具，MCP 就是唯一能把调用固定成一个确定工具名的手法。大家有兴趣可以看下[源码](https://github.com/Chorus-AIDLC/Chorus/blob/main/public/chorus-plugin/hooks/hooks.json#L26)我是如何定义这个 Hook 的，简单地说用通配就行
```json
"PostToolUse": [
  {
    "matcher": ".*chorus_pm_submit_proposal",
    "hooks": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/bin/on-post-submit-proposal.sh"
      }
    ]
  },
```
这样我不仅能完全感知到 Claude Code 的意图，还能很好地提取参数去注入到一个 Reviewer Agent 的上下文中，省得 Agent 不靠谱地去帮我用生成 Token 的方式传递了。

当然我不是 MCP 的拥趸，这个协议设计得实在太难用了。但回头看，MCP 真正不可替代的地方在于它把 Agent 的每一次调用都变成了带语义的、确定性的意图信号，前面聊的接口污染和意图捕获问题本质上都是因为这一点。更关键的是 MCP 是跨 Agent 的，不管哪个框架，不管支不支持本地工具定义，只要接了 MCP，你就有了一个稳定的锚点去感知意图、围绕意图构建 Harness。所以与其说我离不开 MCP，不如说我离不开一个能让我稳定感知 Agent 意图的协议，只是目前只有 MCP 能做到。如果大家有更好的方法，务必评论给我。