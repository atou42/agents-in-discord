# get the 10 原型

这是 get the 10 第一版静态网页原型。

当前 Cohub 部署地址是 `https://s-6b9e799d-3711-4143-8a03-0b082a46c261-3000.cohub.run/`。

打开 `index.html` 后，可以从一个短意图开始，进入三轮流程。第一轮生成二十七张候选并强制选择一个主方向。第二轮基于主方向收敛到一张首帧。第三轮生成十张候选，最终最多保留十张并导出压缩包。

当前版本已经放入一批真实 image2 生成素材：`assets/real-anger-mixed/`。输入「生气」或「愤怒」会默认读取这批真实切片，也可以通过 `?manifest=assets/real-anger-mixed/slices/manifest.json` 明确指定。`assets/demo-mystery/` 只是演示素材，用于验证工具链，不代表真实模型输出。

真实素材准备脚本在 `tools/nine_grid_tool.py`，说明在 `tools/README.md`。
