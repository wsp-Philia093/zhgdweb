<template>
  <div class="page">
    <h1>进度管理</h1>

    <!-- ① KPI 卡 -->
    <div class="stats">
      <div class="stat-card"><div class="v">{{ list.length }}</div><div class="l">工序总数</div></div>
      <div class="stat-card done"><div class="v">{{ doneCount }}</div><div class="l">已完成</div></div>
      <div class="stat-card doing"><div class="v">{{ doingCount }}</div><div class="l">进行中</div></div>
      <div class="stat-card pending"><div class="v">{{ pendingCount }}</div><div class="l">未开始</div></div>
      <div class="stat-card avg"><div class="v">{{ avgPercent }}%</div><div class="l">平均完成度</div></div>
    </div>

    <!-- ② 甘特图（占满宽度，给足高度） -->
    <PanelBox title="施工进度甘特图">
      <div class="gantt-wrap">
        <EChart :option="ganttOption" :empty="!list.length" empty-text="暂无进度数据" />
      </div>
    </PanelBox>

    <!-- ③ 工序明细表 -->
    <PanelBox title="工序明细">
      <table class="tbl">
        <thead>
          <tr>
            <th>分部</th><th>工序</th><th>计划工期</th><th>实际工期</th>
            <th>完成度</th><th>状态</th><th>负责人</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in list" :key="p.id">
            <td>{{ p.stage }}</td>
            <td>{{ p.name }}</td>
            <td class="time">{{ p.plan_start }} ~ {{ p.plan_end }}</td>
            <td class="time">{{ p.actual_start ? `${p.actual_start} ~ ${p.actual_end || '进行中'}` : '—' }}</td>
            <td>
              <!-- 进度条：外层灰底、内层彩色按百分比撑开 -->
              <div class="bar">
                <div class="bar-in" :style="{ width: p.percent + '%' }" :class="p.status"></div>
              </div>
              <span class="pct">{{ p.percent }}%</span>
            </td>
            <td><span class="tag" :class="p.status">{{ statusText(p.status) }}</span></td>
            <td>{{ p.owner }}</td>
          </tr>
        </tbody>
      </table>
    </PanelBox>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getProgress } from '../api'
import PanelBox from '../components/PanelBox.vue'
import EChart from '../components/EChart.vue'

const list = ref([])                                  // 工序列表

// ---- KPI 统计 ----
const doneCount = computed(() => list.value.filter(p => p.status === 'done').length)
const doingCount = computed(() => list.value.filter(p => p.status === 'doing').length)
const pendingCount = computed(() => list.value.filter(p => p.status === 'pending').length)

// 平均完成度：所有工序 percent 求平均
// 同样要防除零，空数组时 reduce 不传初值会报错，所以传了 0 作初值
const avgPercent = computed(() => {
  if (!list.value.length) return 0
  const sum = list.value.reduce((acc, p) => acc + p.percent, 0)
  return (sum / list.value.length).toFixed(0)
})

// 状态英文转中文
function statusText(s) {
  return { pending: '未开始', doing: '进行中', done: '已完成' }[s] || s
}

// ★★★ 甘特图核心 ★★★
// ECharts 没有原生甘特图，必须用 custom 系列 + renderItem 手工画矩形
const ganttOption = computed(() => {
  // 把 "2026-08-01" 转成毫秒时间戳。DateField 返回的是纯日期字符串，
  // new Date("2026-08-01") 会按 UTC 零点解析，没有时区歧义，可以直接用
  const toTs = s => new Date(s).getTime()

  // ★ 关键：先反转整个列表，后面 data 和 names 都基于这个反序列表生成。
  // 为什么必须一起反转？因为 ECharts 的分类轴按"数据下标"分配行位置：
  //   data[0] 画在 names[0] 那一行。
  // 如果 data 用正序、names 用反序，两者就会错位——工序名和它的条对不上号。
  //
  // ECharts 分类轴从下往上排：数组第 0 项在最底部。
  // 反序后"外墙保温"（最后一道）在下标 0 → 画在最底部，
  // "土方开挖"（第一道）落到最后 → 画在最顶部，从上往下读就是施工顺序。
  const sorted = [...list.value].reverse()

  // 数据格式：[计划开始, 计划结束, 实际开始, 实际结束, 完成率, 状态]
  // 之所以用"数组"而不是"对象"，是因为 renderItem 里要用 api.value(下标) 取值，
  // 下标取值最方便，不用记字段名
  const data = sorted.map(p => [
    toTs(p.plan_start),
    toTs(p.plan_end),
    p.actual_start ? toTs(p.actual_start) : null,
    p.actual_end ? toTs(p.actual_end) : null,
    p.percent,
    p.status,
  ])

  // y 轴分类：与 data 同顺序（同样来自 sorted）
  const names = sorted.map(p => p.name)

  return {
    textStyle: { color: '#9ecbff' },

    // tooltip 用 formatter 自定义：显示工序名 + 计划/实际日期 + 完成度
    tooltip: {
      formatter: (params) => {
        // params.dataIndex 就是 sorted 里的下标，直接取即可（data 与 names 已同序）
        const p = sorted[params.dataIndex]
        if (!p) return ''
        return `
          <b>${p.name}</b>（${p.stage}）<br/>
          计划：${p.plan_start} ~ ${p.plan_end}<br/>
          实际：${p.actual_start ? p.actual_start + ' ~ ' + (p.actual_end || '进行中') : '未开工'}<br/>
          完成度：${p.percent}%
        `
      },
    },

    grid: { left: 110, right: 40, top: 30, bottom: 40 },

    // ★ x 轴用 time 类型：按真实日期比例排布，而不是等距分类
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#2d78c8' } },
      splitLine: { lineStyle: { color: 'rgba(45,120,200,.15)' } },
      // ★ splitNumber 限制刻度数量，避免标签太密挤在一起重叠
      splitNumber: 8,
      axisLabel: {
        color: '#9ecbff',
        formatter: '{MM}-{dd}',       // 只显示 月-日
        hideOverlap: true,            // 万一还是挤，自动隐藏重叠的标签（双保险）
      },
    },

    // ★ y 轴是分类轴，数据用上面反转过的 names
    yAxis: {
      type: 'category',
      data: names,
      axisLine: { lineStyle: { color: '#2d78c8' } },
      axisLabel: { color: '#cfe8ff', fontSize: 12 },
    },

    series: [{
      type: 'custom',                       // ★ 关键：custom 系列，自己控制怎么画
      // ★★ renderItem 是整个甘特图的灵魂 ★★
      // ECharts 会给每个数据点调用一次这个函数，你返回一个"图形描述"，它就照着画
      renderItem: (params, api) => {
        const yIndex = params.dataIndex     // 当前是第几行（第几道工序）
        const status = api.value(5)         // 取第 6 个值（状态）

        // api.coord([x值, y值]) 把"数据坐标"换算成"屏幕像素坐标"
        // 例如 api.coord([计划开始时间戳, 第3行]) → [x像素, y像素]
        const catCenter = api.coord([0, yIndex])[1]   // y 轴的像素中心位置

        // 每根条的高度（y 轴一格的宽度 * 0.5，留出间距）
        const barH = api.size([0, 1])[1] * 0.5

        // 用来收集要画的矩形
        const children = []

        // ---- 第一层：计划条（灰色细底条，永远画） ----
        const pStart = api.coord([api.value(0), yIndex])[0]
        const pEnd = api.coord([api.value(1), yIndex])[0]
        children.push({
          type: 'rect',
          shape: {
            x: pStart,
            y: catCenter - barH / 2,
            width: pEnd - pStart,
            height: barH,
          },
          style: {
            fill: 'rgba(45,120,200,.35)',      // 半透明蓝灰
            stroke: 'rgba(45,120,200,.6)',
          },
        })

        // ---- 第二层：实际进度条（彩色，有实际开始时间才画） ----
        const aStart = api.value(2)
        if (aStart) {
          const percent = api.value(4)          // 完成率（0~100）
          const realStart = api.coord([aStart, yIndex])[0]   // 实际开始 → 像素 x
          const todayX = api.coord([Date.now(), yIndex])[0]  // 今天的像素位置（当前时间）

          // 颜色按状态区分：已完成绿、进行中青
          const colorMap = { done: '#52c41a', doing: '#36e2ff', pending: '#ffd166' }

          // 实际条画多长？逻辑：
          // - 已完成：画到"实际结束"那天（或计划结束，兜底）
          // - 进行中：画到"今天"（未完工不可能画到未来）
          // - 未开工：不画（aStart 为空，进不来这里）
          const endX = api.value(3)
            ? api.coord([api.value(3), yIndex])[0]     // 有实际结束 → 用实际结束
            : todayX                                    // 没有 → 用今天
          const fullWidth = Math.max(endX - realStart, 2)  // 至少 2px，避免看不见

          // 再按完成率截取：进度条的"实心部分" = 全长 × 完成率
          // 这样条形的右端会随进度推进而生长，视觉上像进度条
          const drawWidth = Math.max(fullWidth * (percent / 100), 2)

          children.push({
            type: 'rect',
            shape: {
              x: realStart,
              y: catCenter - barH / 2,
              width: drawWidth,
              height: barH,
            },
            style: { fill: colorMap[status] || '#36e2ff' },
          })
        }

        return { type: 'group', children }      // 把两个矩形打包返回
      },

      // data 的每一项就是上面那个 6 元组
      data,
      // encode 告诉 ECharts 哪几个维度是 x/y，影响 tooltip 和坐标换算
      encode: { x: [0, 1], y: 0 },
    },
    {
      // ★ 第二个系列：只为了画一条"今日参考线"。
      // custom 系列不支持 markLine，所以借一个空的 line 系列 + markLine 来实现。
      type: 'line',
      data: [],                       // 不画任何数据点
      silent: true,                   // 不响应鼠标事件，不干扰 tooltip
      markLine: {
        symbol: 'none',               // 不要箭头
        silent: true,
        lineStyle: { color: '#ff4d4f', type: 'dashed', width: 1.5 },   // 红色虚线
        label: {
          formatter: '今日',           // 线上标"今日"
          color: '#ff4d4f',
          fontSize: 11,
          position: 'insideEndTop',
        },
        data: [{ xAxis: Date.now() }],  // 线的位置 = 当前时间戳
      },
    },
  ],

    // 图例：custom 系列没有 name，标准 legend 出不来颜色块，
    // 所以这里用 graphic 在右上角手工画 3 组"色块 + 文字"当图例
    graphic: [
      { type: 'rect', right: 210, top: 8, shape: { width: 14, height: 10 }, style: { fill: '#52c41a' } },
      { type: 'text', right: 178, top: 4, style: { text: '已完成', fill: '#9ecbff', fontSize: 12 } },
      { type: 'rect', right: 122, top: 8, shape: { width: 14, height: 10 }, style: { fill: '#36e2ff' } },
      { type: 'text', right: 90, top: 4, style: { text: '进行中', fill: '#9ecbff', fontSize: 12 } },
      { type: 'rect', right: 44, top: 8, shape: { width: 14, height: 10 }, style: { fill: 'rgba(45,120,200,.35)', stroke: 'rgba(45,120,200,.6)' } },
      { type: 'text', right: 4, top: 4, style: { text: '计划', fill: '#9ecbff', fontSize: 12 } },
    ],
  }
})

onMounted(async () => {
  list.value = await getProgress()
})
</script>

<style scoped>
.page { padding: 70px 30px 30px; color: #fff; min-height: 100vh; background: #06121f; }
.page h1 { color: #36e2ff; margin-bottom: 20px; font-size: 26px; }

.stats { display: flex; gap: 16px; margin-bottom: 16px; }
.stat-card {
  flex: 1; padding: 16px 20px; text-align: center;
  background: linear-gradient(180deg, rgba(16,42,74,.92), rgba(8,24,46,.92));
  border: 1px solid rgba(45,120,200,.4); border-radius: 8px;
}
.stat-card .v { font-size: 30px; font-weight: bold; color: #36e2ff; }
.stat-card .l { font-size: 13px; color: #9ecbff; margin-top: 4px; }
.stat-card.done .v { color: #52c41a; }      /* 已完成绿 */
.stat-card.doing .v { color: #36e2ff; }     /* 进行中青 */
.stat-card.pending .v { color: #ffd166; }   /* 未开始黄 */
.stat-card.avg .v { color: #7c8cff; }       /* 平均紫 */

.gantt-wrap { height: 460px; }              /* 甘特图给足高度，10 道工序才排得开 */

.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th, .tbl td { padding: 9px 12px; text-align: left; border-bottom: 1px solid rgba(45,120,200,.18); }
.tbl th { color: #9ecbff; font-weight: normal; background: rgba(16,42,74,.6); }
.tbl tbody tr:hover { background: rgba(54,226,255,.05); }
.time { color: #6b8db0; font-variant-numeric: tabular-nums; }

/* 表格里的迷你进度条 */
.bar { display: inline-block; width: 80px; height: 8px; background: rgba(45,120,200,.25); border-radius: 4px; overflow: hidden; vertical-align: middle; }
.bar-in { height: 100%; border-radius: 4px; transition: width .4s; }
.bar-in.done { background: #52c41a; }
.bar-in.doing { background: #36e2ff; }
.bar-in.pending { background: #ffd166; }
.pct { margin-left: 8px; color: #9ecbff; font-variant-numeric: tabular-nums; }

/* 状态标签 */
.tag { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.tag.done { background: rgba(82,196,26,.2); color: #52c41a; }
.tag.doing { background: rgba(54,226,255,.2); color: #36e2ff; }
.tag.pending { background: rgba(255,209,102,.2); color: #ffd166; }
</style>
