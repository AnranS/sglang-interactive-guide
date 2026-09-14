window.CHAPTERS = [
  {
    "title": "从一个请求开始",
    "tag": "START HERE",
    "desc": "沿着 Prompt → Token 的路径，建立推理服务的第一张地图。",
    "sections": [
      [
        "先分清三件事",
        "模型权重定义“会什么”，推理引擎决定“怎样高效计算”，服务接口负责“怎样接入应用”。SGLang 的运行时 SRT 负责请求调度、缓存和模型执行。它也提供前端语言，用于组织多次生成与分支；学习服务端无需先掌握这套语言。"
      ],
      [
        "一条请求的旅程",
        "应用提交 messages，服务端用聊天模板将消息转换为文本，再进行 tokenization。请求进入调度队列，Prefill 处理输入上下文并建立 KV，随后 Decode 逐步生成。采样选择 token，反分词将 token 还原为文本，流式接口逐段返回。不同模型及版本可能走不同的具体实现。"
      ],
      [
        "选择你的学习路径",
        "概念轨：按章操作所有实验，不需要 GPU。源码轨：先理解数据流，再沿每章文件入口追踪数据结构。运行轨：在符合官方硬件要求的环境启动模型服务，再做第 12 章的对照实验。本地网页仅模拟机制，不会下载模型或发起推理。"
      ]
    ],
    "lab": "flow",
    "question": "谁决定多个请求什么时候进入 GPU？",
    "choices": [
      "聊天模板",
      "Scheduler 调度器",
      "反分词器"
    ],
    "answer": 1,
    "explain": "调度器根据队列、token 预算和内存约束组织执行批次。",
    "task": "单步走完流程，用自己的话说明首个 token 返回前做了哪些工作。",
    "source": "entrypoints/http_server.py",
    "doc": "get-started/quickstart",
    "code": ""
  },
  {
    "title": "架构与源码地图",
    "tag": "ARCHITECTURE",
    "desc": "将接口、调度、执行和缓存连接到真实源码入口。",
    "sections": [
      [
        "从进程边界阅读",
        "不要一上来通读 scheduler.py。先找 HTTP 入口如何把输入交给 TokenizerManager，再看调度进程接收的请求对象。TokenizerManager 处理请求输入输出编排；Scheduler 管理等待与运行状态；模型执行层完成 forward。DetokenizerManager 将输出 token 转为文本。"
      ],
      [
        "沿着数据而不是文件长度走",
        "阅读时只追四类数据：输入 token IDs、请求状态、KV 索引、输出 token IDs。问清每一次传递的所有权：谁能修改状态，谁分配显存，谁知道请求已经结束。ModelRunner、批次对象与缓存对象之间的边界比记住函数名更重要。"
      ],
      [
        "先画一条最短路径",
        "第一次阅读选择单请求、单卡、无投机的路径。随后再增加批处理、缓存命中和重叠调度。源码链接指向上游 main，会随项目演进变化；实验是机制模型，不等价于某个版本的完整执行代码。"
      ]
    ],
    "lab": "architecture",
    "question": "哪一种阅读顺序最有效？",
    "choices": [
      "按文件大小从大到小",
      "跟踪请求与 KV 索引的数据流",
      "先背诵全部启动参数"
    ],
    "answer": 1,
    "explain": "追踪数据流能建立模块之间的因果关系，再逐层展开优化路径。",
    "task": "打开源码入口，找到 TokenizerManager、Scheduler 和 ModelRunner，记录各自的输入与输出。",
    "source": "managers/scheduler.py",
    "doc": "basic_usage/overview",
    "code": ""
  },
  {
    "title": "Prefill 与 Decode",
    "tag": "TWO PHASES",
    "desc": "同一个模型的两种工作负载，决定了延迟与吞吐的权衡。",
    "sections": [
      [
        "Prefill：读入已有上下文",
        "Prefill 对尚未缓存的输入位置执行计算，建立这些位置的 Key/Value。输入位置之间可利用并行计算，但因果注意力仍限制每个位置只能看到合法的历史。长输入通常带来更高的首 token 延迟（TTFT）。缓存命中可能减少需要重新处理的位置。"
      ],
      [
        "Decode：把新 token 接到末尾",
        "普通自回归 Decode 每个请求每轮推进一个位置，查询历史 KV 并写入新 KV。序列越长，访问历史状态的成本往往越大。多个请求可以合批执行；单请求的输出位置仍有依赖关系。投机解码是后续章节中的另一种推进方式。"
      ],
      [
        "两种指标分别回答什么",
        "TTFT 关注发起请求到第一个输出；TPOT 关注后续输出的平均间隔。不要把一次 Prefill 拆为多块就叫 PD 分离：前者是调度粒度，后者是将两类工作放在不同工作进程或设备上。实验只显示 token 数量，不推断真实耗时。"
      ]
    ],
    "lab": "phases",
    "question": "长 Prompt 最直接增加哪部分工作？",
    "choices": [
      "未命中前缀的 Prefill",
      "所有输出 token 的采样温度",
      "HTTP 端口数"
    ],
    "answer": 0,
    "explain": "Prefill 要处理尚未缓存的输入 token，真实 TTFT 还受排队和硬件影响。",
    "task": "把输入从 8 调到 32，保持输出不变，解释为什么不能按 token 数直接推算毫秒。",
    "source": "model_executor/model_runner.py",
    "doc": "advanced_features/hyperparameter_tuning",
    "code": ""
  },
  {
    "title": "连续批处理与调度",
    "tag": "SCHEDULING",
    "desc": "让完成的请求及时离场，让等待的请求补上空位。",
    "sections": [
      [
        "静态批次为什么会空等",
        "若把请求固定分组，一组中短请求生成完后，空槽仍要等最长请求结束才能开始下一组。连续批处理允许在迭代边界调整批次成员，缓解这类空闲，但实际收益取决于输入输出长度、内存和调度策略。"
      ],
      [
        "调度不只是凑够请求数",
        "调度器还要考虑 token 预算、KV 容量、等待公平性和 Prefill/Decode 的协调。请求数相同，长上下文批次的资源消耗也可能高得多。缓存感知策略可以优先安排共享前缀的请求，但吞吐与公平之间存在取舍。"
      ],
      [
        "实验里的简化假设",
        "实验有两个槽位，四个同时到达的请求，只模拟 Decode，每个活动请求每拍生成一个 token。没有 Prefill、显存压力或真实并行成本。因此“节省几拍”是离散调度示例，不能写进真实 GPU 性能报告。"
      ]
    ],
    "lab": "batch",
    "question": "连续批处理的关键是什么？",
    "choices": [
      "每个请求必须等整组完成",
      "在迭代边界更新批次成员",
      "无限增加 batch size"
    ],
    "answer": 1,
    "explain": "允许已完成请求离场并接纳等待请求，减少固定分组的空闲。",
    "task": "分别运行两种模式直到结束，比较空槽；再说明真实服务中还缺少哪两个约束。",
    "source": "managers/scheduler.py",
    "doc": "advanced_features/hyperparameter_tuning",
    "code": ""
  },
  {
    "title": "KV Cache 与显存预算",
    "tag": "MEMORY",
    "desc": "理解缓存存了什么，估算长上下文的代价。",
    "sections": [
      [
        "缓存的是历史 K/V",
        "自回归注意力会重复访问历史位置。保存每层的 K/V 可以避免在每一步重新计算全部历史投影。它不等于模型权重，也不是最终答案缓存。请求仍需执行新位置的模型计算。"
      ],
      [
        "一个有边界的估算式",
        "普通 dense Transformer、未分片未量化时：KV 字节数 ≈ 2 × 层数 × KV heads × head dim × token 数 × 每元素字节数。GQA 的 KV heads 可能小于 query heads；MLA、混合注意力、量化元数据、并行切分和分配粒度都可能改变实际占用。"
      ],
      [
        "容量与生命周期",
        "权重、KV、临时激活和图捕获等共同占用设备内存。请求完成不意味着所有 KV 立即释放：可复用前缀可能仍留在缓存中。压力增加时，缓存淘汰与正在运行的请求保护必须协调；不能回收仍被活动请求使用的状态。"
      ]
    ],
    "lab": "memory",
    "question": "计算 GQA 的 KV 占用应使用哪个 head 数？",
    "choices": [
      "query heads",
      "KV heads",
      "请求数"
    ],
    "answer": 1,
    "explain": "K/V 的形状由 KV heads 决定。实验公式只适用于标注的普通 dense 情形。",
    "task": "记录 4K 和 16K 上下文的估算值，再解释为何这不等于 GPU 总显存需求。",
    "source": "mem_cache/memory_pool.py",
    "doc": "advanced_features/quantized_kv_cache",
    "code": ""
  },
  {
    "title": "RadixAttention 与前缀复用",
    "tag": "RADIX CACHE",
    "desc": "相同的 token 前缀，为什么可以少算一次。",
    "sections": [
      [
        "共享的不是相似意思",
        "相同模型状态和上下文条件下，相同 token 前缀的 KV 可以复用。系统提示词完全一致的多个请求可能共享一段前缀；语义相似、字面不同的内容不构成命中。聊天模板、tokenizer、缓存隔离规则及模型配置也会影响复用。"
      ],
      [
        "Radix tree 如何组织前缀",
        "压缩前缀树把连续 token 片段放在边上，共享路径对应可复用历史。插入新序列时在分叉点拆分节点，查询时沿 token 匹配最长可复用前缀。节点关联 KV 位置；命中后仍要为未缓存的后缀安排计算。"
      ],
      [
        "命中不等于零成本",
        "查找、元数据维护、读取 KV 和后缀生成仍有成本。实现中的页对齐以及产生 logits 的需要，也可能让可跳过位置少于字面最长前缀。实验使用空格分隔的教学 token，只演示树路径与匹配，不调用真实 tokenizer。"
      ]
    ],
    "lab": "radix",
    "question": "两个请求的开头 token 不同，后面的相同句子能直接当作共享前缀吗？",
    "choices": [
      "可以，含义接近即可",
      "不可以，前缀需从起点连续匹配",
      "只要 temperature 相同就可以"
    ],
    "answer": 1,
    "explain": "因果注意力的 KV 依赖之前的上下文，后缀相同并不保证对应 KV 相同。",
    "task": "依次插入两条相同系统前缀、不同末尾的请求，再修改第一个 token，观察命中数。",
    "source": "mem_cache/radix_cache.py",
    "doc": "advanced_features/radix_eviction_policy",
    "code": ""
  },
  {
    "title": "Chunked Prefill 与重叠调度",
    "tag": "KEEP GPU BUSY",
    "desc": "把长输入分段，把 CPU 与 GPU 的工作衔接起来。",
    "sections": [
      [
        "分块的直接作用",
        "长输入一次 Prefill 会占用较大的计算与临时内存预算。Chunked Prefill 将输入按 token 预算分为多次处理，给调度器更多协调机会。块太大可能影响其他请求的响应，块太小会增加调度及执行开销，不能只凭一个参数推断性能。"
      ],
      [
        "Overlap 解决另一类空隙",
        "CPU 构造下一批次、处理元数据需要时间；GPU forward 也需要时间。重叠调度试图在依赖允许时让这两部分并行，减少 GPU 等待 CPU 的间隙。不是把同一个请求的因果依赖删掉，也不保证 CPU 成本被完全隐藏。"
      ],
      [
        "不要混淆三个概念",
        "Chunking 改变 Prefill 粒度；Overlap 协调 CPU/GPU 时间；PD 分离将 Prefill 和 Decode 分给不同工作进程。它们可组合但并不等价。实验把 24 个输入 token 切片，观察分块数和最终短块。"
      ]
    ],
    "lab": "chunk",
    "question": "减小 chunk 大小必然让所有延迟都变小吗？",
    "choices": [
      "必然",
      "不一定，调度开销与排队会变化",
      "只影响模型准确率"
    ],
    "answer": 1,
    "explain": "更细的调度粒度带来更多机会，也可能增加开销，必须结合负载测量。",
    "task": "比较块大小 4、8、10 的分块结果，找出最后一块不足预算的情况。",
    "source": "managers/scheduler.py",
    "doc": "advanced_features/hyperparameter_tuning",
    "code": ""
  },
  {
    "title": "采样与结构化输出",
    "tag": "CONTROL THE OUTPUT",
    "desc": "理解 logits 如何成为 token，以及格式约束在哪生效。",
    "sections": [
      [
        "从分数到概率",
        "模型产生 logits。正温度 T 下，可通过 softmax(logits/T) 得到概率；更低温度通常使分布更集中。top-k 保留指定数量的候选，top-p 根据累计概率截断。具体处理顺序与兼容约束应查阅版本文档。T=0 通常采用 greedy 路径，不能直接代入除法。"
      ],
      [
        "结构化输出如何约束生成",
        "JSON Schema、正则或 grammar 可限制当前状态下允许的后续 token，屏蔽不合法候选，再继续采样。它约束输出结构，不自动保证事实正确或业务规则正确。例如 schema 能要求 age 是整数，但不能验证这个年龄是否真实。"
      ],
      [
        "怎样验证一条生成链",
        "先验证返回值可解析，再用 schema 校验，再做业务语义校验。结构化解码支持的 schema 子集和后端限制以官方文档为准。实验仅用五个 logits 展示温度变化，额外的候选屏蔽是示意，不是完整 grammar 引擎。"
      ]
    ],
    "lab": "sampling",
    "question": "JSON Schema 约束能够保证什么？",
    "choices": [
      "输出事实永远正确",
      "支持范围内的结构约束",
      "请求无需模型执行"
    ],
    "answer": 1,
    "explain": "结构合规和内容正确是两件事；业务层仍需检查语义。",
    "task": "降低温度，再屏蔽最高分候选，解释概率为什么重新归一化。",
    "source": "layers/sampler.py",
    "doc": "advanced_features/structured_outputs",
    "code": ""
  },
  {
    "title": "并行执行与 CUDA Graph",
    "tag": "EXECUTION",
    "desc": "分摊模型计算，减少重复的执行启动开销。",
    "sections": [
      [
        "TP 与 DP 的边界",
        "Tensor Parallel 将一个模型的部分张量与计算分到多张卡，层间可能需要 collective 通信。Data Parallel 用多份模型副本处理不同请求。TP 有助于模型容量和单模型计算，但增加通信；DP 扩展请求容量也需要更多权重副本。MoE 还会涉及 Expert Parallel。"
      ],
      [
        "CUDA Graph 做了什么",
        "图捕获把兼容形状的执行路径记录为可重放图，减少逐个启动 kernel 的 CPU 开销。它不消除 GPU 数学运算，也不让所有动态形状天然兼容。捕获可能占用额外内存；哪些阶段与形状可捕获取决于后端和版本。"
      ],
      [
        "先定位瓶颈再组合",
        "如果瓶颈是通信，增加 TP 未必更快；如果瓶颈是 GPU 计算，减少 launch 开销可能收益有限。实验只均分 32 个教学 head，展示每 rank 的份额；真实模型还受 KV heads、量化和架构约束。"
      ]
    ],
    "lab": "parallel",
    "question": "CUDA Graph 主要减少哪类开销？",
    "choices": [
      "模型参数量",
      "重复的 CPU kernel 启动开销",
      "所有跨卡通信"
    ],
    "answer": 1,
    "explain": "重放图降低启动成本，不能替代模型计算或自动消除通信。",
    "task": "切换 1/2/4/8 个 rank，解释为什么分配更少 head 不代表延迟严格等比例下降。",
    "source": "model_executor/runner/decode_cuda_graph_runner.py",
    "doc": "advanced_features/attention_backend",
    "code": ""
  },
  {
    "title": "投机解码",
    "tag": "SPECULATIVE DECODING",
    "desc": "先提出候选，再由目标模型验证。",
    "sections": [
      [
        "为什么一次可以推进更多位置",
        "普通 Decode 每轮逐个产生新 token。投机解码用草稿机制提出多个候选，让目标模型批量验证；可接受的前缀被保留，不被接受的部分按算法规则修正。收益来自把多个潜在输出位置的工作合并，而不是跳过正确性验证。"
      ],
      [
        "接受率之外还要看成本",
        "草稿产生、目标验证、额外 KV 和调度都要付出成本。接受前缀长不代表端到端一定更快；低接受率可能抵消收益。EAGLE 等方案的模型配套、硬件限制和参数组合请查官方文档，不能给任意模型随意添加 draft 参数。"
      ],
      [
        "实验的含义",
        "实验手动指定三个候选里连续接受几个，显示保留和丢弃部分。真实随机采样的接受判定涉及目标与草稿分布及校正规则，不是简单比较两个模型的 argmax。这里不计算真实接受概率，也不宣称固定加速倍数。"
      ]
    ],
    "lab": "spec",
    "question": "只知道接受率高，能断言端到端更快吗？",
    "choices": [
      "能",
      "不能，还要计算草稿与验证成本",
      "与性能完全无关"
    ],
    "answer": 1,
    "explain": "要测量总成本以及实际输出 token 数，再与相同负载基线比较。",
    "task": "将接受数从 3 调到 0，解释为何丢弃的候选也已经消耗了计算资源。",
    "source": "speculative",
    "doc": "advanced_features/speculative_decoding",
    "code": ""
  },
  {
    "title": "PD 分离与分层缓存",
    "tag": "SCALE OUT",
    "desc": "当服务扩展到多设备时，数据搬运成为一等问题。",
    "sections": [
      [
        "PD：按阶段拆开执行",
        "Prefill worker 建立 KV，Decode worker 接收相应状态并继续生成。两类 worker 可独立配置与扩容，降低不同阶段之间的干扰。路由、KV 传输、元数据一致性和故障处理都成为服务链路的一部分。"
      ],
      [
        "分离不是免费的",
        "传输时间的理想下界约为 KV 字节数除以有效带宽，还需加上排队、协议与同步成本。小负载或慢互联下，传输可能比阶段隔离带来的好处更大。不能把 chunked prefill 当成 KV 已经跨设备搬运。"
      ],
      [
        "HiCache：扩大可复用状态的层次",
        "分层缓存将可复用 KV 扩展到设备之外的层次，例如主机内存或存储后端，通过加载和写回协调访问。容量增加并不等于每次访问都和 GPU 本地一样快。预取、命中率与搬运成本共同决定收益。"
      ]
    ],
    "lab": "transfer",
    "question": "PD 分离额外引入哪项关键成本？",
    "choices": [
      "KV 传输与同步",
      "重新训练模型",
      "必须删除所有前缀缓存"
    ],
    "answer": 0,
    "explain": "Decode 需要与请求一致的 KV，必须考虑传输链路及其开销。",
    "task": "比较同样 1 GiB KV 在不同有效带宽下的理想传输时间，列出公式没包含的成本。",
    "source": "disaggregation",
    "doc": "advanced_features/pd_disaggregation",
    "code": ""
  },
  {
    "title": "启动服务与 API 实战",
    "tag": "RUN IT",
    "desc": "在合适的运行环境，把概念连到一次真实请求。",
    "sections": [
      [
        "将阅读环境与运行环境分开",
        "这个网页可在普通电脑离线学习。真实服务请先按官方 Installation 与 Hardware Platforms 文档准备对应硬件、驱动和软件环境。下面展示常见 Python 服务入口与 OpenAI 客户端；具体版本及硬件的安装包选择以官方文档为准。"
      ],
      [
        "先跑通最小请求",
        "选择官方支持且能装入设备内存的模型，先在 127.0.0.1:30000 上启动服务，看到 ready 后再发送请求。客户端的 model 必须对应服务端模型名。先关闭复杂优化组合，确认输出正确，再逐一增加并发与上下文长度。"
      ],
      [
        "错误要从发生阶段定位",
        "导入或启动失败：核查包、驱动及后端。加载 OOM：核查权重和初始化预算。请求阶段 OOM：核查 KV 容量、输入输出长度及并发。404/连接拒绝：核对地址、端口及服务是否就绪。此页命令只供复制，不会在本机自动安装或启动模型。"
      ]
    ],
    "lab": "command",
    "question": "连接被拒绝时，首先该检查什么？",
    "choices": [
      "提高 temperature",
      "服务进程、监听地址和端口",
      "增加 max_tokens"
    ],
    "answer": 1,
    "explain": "连接拒绝是连接层问题，首先确认服务已成功监听目标端口。",
    "task": "在符合要求的运行环境执行最小请求，记录模型、SGLang 版本、硬件和返回结果。",
    "source": "entrypoints/http_server.py",
    "doc": "get-started/quickstart",
    "code": "# 服务端：先按官方文档完成对应硬件的安装\npython -m sglang.launch_server \\\n  --model-path Qwen/Qwen3-0.6B \\\n  --host 127.0.0.1 --port 30000\n\n# 另一个终端：安装客户端依赖\npython -m pip install openai\n\n# 将以下 Python 保存为 client.py 后运行\nfrom openai import OpenAI\nclient = OpenAI(base_url=\"http://127.0.0.1:30000/v1\", api_key=\"EMPTY\")\nresponse = client.chat.completions.create(\n    model=\"Qwen/Qwen3-0.6B\",\n    messages=[{\"role\": \"user\", \"content\": \"用一句话解释 KV Cache\"}],\n    max_tokens=128,\n    temperature=0.6,\n)\nprint(response.choices[0].message.content)"
  },
  {
    "title": "Benchmark 与毕业实验",
    "tag": "MEASURE & EXPLAIN",
    "desc": "做一次可以复现、可以解释的性能对照。",
    "sections": [
      [
        "先定义你在优化什么",
        "吞吐是单位时间输出或处理的 token 数，要说明是否含输入；TTFT 衡量首 token；TPOT 衡量首个 token 之后的平均输出间隔。均值掩盖慢请求，应同时看 P50/P95/P99 和错误率。提高吞吐不一定改善尾延迟。"
      ],
      [
        "对照实验只改变一个变量",
        "固定硬件、驱动、模型 revision、精度、SGLang 版本、输入输出长度分布、并发或请求到达率。预热后测量，分别记录冷缓存与热缓存。对比缓存开关时使用受控共享前缀的负载，否则无法解释命中率差异。"
      ],
      [
        "毕业任务：从机制到证据",
        "做三组对照：不同前缀共享比例、不同并发、不同 chunk 预算。每组保留原始结果和启动命令，比较 TTFT、TPOT、输出吞吐、错误率及内存。用前面章节解释结果；若没有运行硬件，就提交实验假设和验证方案，不把模拟数据当成实测。"
      ]
    ],
    "lab": "metrics",
    "question": "两组 benchmark 哪种比较才可信？",
    "choices": [
      "只比较最好看的吞吐数字",
      "固定模型、硬件与负载，并记录缓存状态",
      "一组用短输入，一组用长输入"
    ],
    "answer": 1,
    "explain": "控制变量和保留环境信息，才能把指标变化关联到机制。",
    "task": "完成一张实验记录：环境、唯一变量、假设、指标、结果、解释、限制。",
    "source": "../bench_serving.py",
    "doc": "developer_guide/bench_serving",
    "code": "# 查看你安装版本支持的参数，再选择负载配置\npython -m sglang.bench_serving --help\n\n# 建议记录：\n# SGLang commit / 版本，GPU 型号与数量，驱动版本\n# 模型 revision、精度、TP/DP 配置、启动参数\n# 请求到达率或并发，输入/输出长度分布，缓存冷/热\n# TTFT P50/P95/P99，TPOT，输出 tokens/s，错误率"
  }
];
