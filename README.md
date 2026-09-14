# SGLang 交互学习指南

13 章中文教程 · 浏览器概念实验 · 源码导读 · 即时反馈习题

## 使用方法

双击 `打开学习指南.html`，即可离线学习，无需安装依赖。也可打开 `index.html`（需与 style.css、content.js、app.js 保持同一目录）。

学习进度存在当前浏览器；不同浏览器、文件路径和 HTTP 地址之间不一定共享。浏览器限制本地存储时，进度仅在本次页面会话中有效。

## 学习路线

- 00–02：建立全局认识。
- 03–06：调度、KV Cache、RadixAttention、Chunked Prefill。
- 07–10：采样、并行、CUDA Graph、投机解码、PD 与分层缓存。
- 11–12：真实环境启动与 benchmark 设计。

## 范围与资料

所有页面实验均为教学模拟，不执行模型推理，不代表硬件 benchmark。真实模型命令需在符合官方要求的环境执行；本交付未进行 GPU 推理验证。

资料核对日期：2026-09-14。源码路径固定到上游 commit `5200508b0fd25733752c2c5e3af5539508023c27`；官方文档随版本更新。

- SGLang 官方文档：https://docs.sglang.io/
- 上游源码：https://github.com/sgl-project/sglang
- 参考项目：https://github.com/lora-sys/nano-vllm-interactive-guide

本项目借鉴参考项目“中文章节 + 无 GPU 实验 + 源码入口 + 练习”的教学结构，文字、界面及模拟器为独立编写，未复制其代码或图片。非 SGLang 官方教程。

## 文件

- 打开学习指南.html：独立单文件版，推荐入口。
- index.html / style.css / content.js / app.js：可编辑网页源文件。
- 学习笔记.md：完整文字版。
- examples/client.py：真实服务的客户端例子，需安装 openai。
- examples/benchmark-record.csv：毕业实验记录表（空白数据，不是实测）。

修改源文件后，运行 `python3 build.py` 更新单文件版。
