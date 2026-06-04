# 九宫格素材工具

这个目录给 Cohub agent 准备真实素材用。

第一步用 ImageTool 生成三张九宫格。每张图必须是 3x3 网格，九个格子要明显不同。九宫格可以是横版、竖版或方版，切割时会按原图宽高三等分，不会强行裁成正方形。建议每张九宫格对应一个大的探索方向，三张之间差异更大，单张内部差异也要拉开。

第二步把三张九宫格放进一个目录，例如 `assets/grids/real-run-001/`。

第三步切割：

```bash
python3 tools/nine_grid_tool.py batch-cut \
  --input-dir assets/grids/real-run-001 \
  --output-dir assets/slices/real-run-001 \
  --web-root .
```

输出会包含 27 张切片和 `manifest.json`。manifest 会记录每张图的相对路径和宽高。原型或后续 agent 可以读取这个 manifest，把真实切片放进第一轮候选。

如果暂时没有真实 ImageTool 图，可以先生成演示九宫格：

```bash
python3 tools/nine_grid_tool.py demo \
  --intent "神秘" \
  --output-dir assets/demo-mystery \
  --web-root .
```

演示模式会生成三张九宫格、二十七张切片和 manifest。它只用于验证流程，不代表真实生成质量。
