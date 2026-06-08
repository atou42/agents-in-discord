# get the 10 原型

这是 get the 10 第一版静态网页原型。

当前 Cohub 部署地址是 `https://s-6b9e799d-3711-4143-8a03-0b082a46c261-3000.cohub.run/`。

本地和 Cohub 端口服务：

```bash
cd /Users/atou/agents-in-discord
PORT=3000 node docs/prototypes/get-the-10/server.mjs
```

服务会托管静态页面，并提供 `/api/runs` 给第一轮调用真实 image2 生成链路。反馈版默认先生成 1 张九宫格，切成 9 张真实候选，保证用户能先跑通第一步；如果要回到 3 张九宫格，可以用 `LIVE_GRID_COUNT=3 PORT=3000 node docs/prototypes/get-the-10/server.mjs`。

通过端口服务打开页面后，可以从一个短意图开始，进入三轮流程。第一轮会调用真实生成链路，先生成 1 张九宫格并切成 9 张候选，期间页面显示 9 个加载卡和进度。第二轮基于主方向收敛到一张首帧。第三轮生成十张候选，最终最多保留十张并导出压缩包。

当前版本已经放入一批真实 image2 生成素材：`assets/real-anger-mixed/`。输入「生气」或「愤怒」会默认读取这批真实切片，也可以通过 `?manifest=assets/real-anger-mixed/slices/manifest.json` 明确指定。`assets/demo-mystery/` 只是演示素材，用于验证工具链，不代表真实模型输出。

真实素材准备脚本在 `tools/nine_grid_tool.py`，说明在 `tools/README.md`。
