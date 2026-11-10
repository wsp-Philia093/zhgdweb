<template>
  <div class="page">
    <h1>塔吊监控</h1>

    <!-- ① 顶部统计 -->
    <div class="stats">
      <div class="stat-card"><div class="v">{{ cranes.length }}</div><div class="l">塔吊总数</div></div>
      <div class="stat-card run"><div class="v">{{ runningCount }}</div><div class="l">运行中</div></div>
      <div class="stat-card warn"><div class="v">{{ warningCount }}</div><div class="l">预警</div></div>
      <div class="stat-card stop"><div class="v">{{ stoppedCount }}</div><div class="l">停机</div></div>
      <div class="stat-card"><div class="v">{{ avgLoad }}%</div><div class="l">平均负荷率</div></div>
    </div>

    <!-- ② 塔吊卡片：每台一张，展示多指标 -->
    <PanelBox title="塔吊实时状态">
      <div class="crane-grid">
        <div v-for="c in cranes" :key="c.id" class="crane-card" :class="c.status">
          <!-- 卡片头：名称 + 状态标签 -->
          <div class="card-head">
            <span class="name">{{ c.name }}</span>
            <span class="tag" :class="c.status">{{ statusText(c.status) }}</span>
          </div>

          <!-- 负荷率进度条：load / max_load -->
          <div class="load-row">
            <span class="label">负荷率</span>
            <span class="value">{{ loadPercent(c) }}%</span>
          </div>
          <div class="load-bar">
            <div class="load-in" :class="c.status" :style="{ width: loadPercent(c) + '%' }"></div>
          </div>

          <!-- 指标网格 -->
          <div class="metrics">
            <div class="m"><span class="k">载重</span><span class="val">{{ c.load }}<i>t</i></span></div>
            <div class="m"><span class="k">额定</span><span class="val">{{ c.max_load }}<i>t</i></span></div>
            <div class="m"><span class="k">吊高</span><span class="val">{{ c.height }}<i>m</i></span></div>
            <div class="m"><span class="k">幅度</span><span class="val">{{ c.amplitude }}<i>m</i></span></div>
            <div class="m"><span class="k">回转</span><span class="val">{{ c.rotation_angle }}<i>°</i></span></div>
            <div class="m"><span class="k">风速</span><span class="val">{{ c.wind_speed }}<i>m/s</i></span></div>
          </div>

          <!-- 防碰撞状态 -->
          <div class="foot" :class="c.anti_collision">
            防碰撞系统：{{ c.anti_collision === 'warning' ? '预警' : '正常' }}
          </div>
        </div>
      </div>
    </PanelBox>

    <!-- ③ 两张对比图 -->
    <div class="charts">
      <PanelBox title="各塔吊载重对比">
        <EChart :option="loadOption" :empty="!cranes.length" empty-text="暂无塔吊数据" />
      </PanelBox>
      <PanelBox title="回转角度分布">
        <EChart :option="angleOption" :empty="!cranes.length" empty-text="暂无塔吊数据" />
      </PanelBox>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getCranes } from '../api'
import PanelBox from '../components/PanelBox.vue'
import EChart from '../components/EChart.vue'

const cranes = ref([])          // 塔吊列表
let timer = null                // 定时刷新

// ---- 统计 ----
const runningCount = computed(() => cranes.value.filter(c => c.status === 'running').length)
const warningCount = computed(() => cranes.value.filter(c => c.status === 'warning').length)
const stoppedCount = computed(() => cranes.value.filter(c => c.status === 'stopped').length)

// 平均负荷率 = 各塔吊 (载重/额定载重) 的平均值
const avgLoad = computed(() => {
  if (!cranes.value.length) return 0
  const sum = cranes.value.reduce((acc, c) => acc + (c.max_load ? c.load / c.max_load : 0), 0)
  return ((sum / cranes.value.length) * 100).toFixed(0)
})

// 单台塔吊的负荷率百分比（四舍五入取整）
// 注意 max_load 可能是 0，要防除零
function loadPercent(c) {
  if (!c.max_load) return 0
  return Math.min(Math.round((c.load / c.max_load) * 100), 100)   // 上限 100%，防止超载时超出条宽
}

function statusText(s) {
  return { running: '运行', warning: '预警', stopped: '停机' }[s] || s
}

// ---- 载重对比柱状图（额定 vs 实际） ----
const loadOption = computed(() => ({
  textStyle: { color: '#9ecbff' },
  tooltip: { trigger: 'axis' },
  legend: { textStyle: { color: '#9ecbff' }, top: 0 },
  grid: { left: 50, right: 20, top: 40, bottom: 30 },
  xAxis: {
    type: 'category',
    data: cranes.value.map(c => c.name),
    axisLine: { lineStyle: { color: '#2d78c8' } },
  },
  yAxis: { type: 'value', name: '吨', splitLine: { lineStyle: { color: 'rgba(45,120,200,.15)' } } },
  series: [
    {
      name: '当前载重', type: 'bar', barWidth: '30%',
      data: cranes.value.map(c => c.load),
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        // 按状态着色：预警红、停机灰、运行青
        color: (params) => {
          const st = cranes.value[params.dataIndex]?.status
          return st === 'warning' ? '#ff4d4f' : st === 'stopped' ? '#6b8db0' : '#36e2ff'
        },
      },
    },
    {
      name: '额定载重', type: 'bar', barWidth: '30%',
      data: cranes.value.map(c => c.max_load),
      itemStyle: { color: 'rgba(124,140,255,.5)', borderRadius: [4, 4, 0, 0] },
    },
  ],
}))

// ---- 回转角度雷达式的极坐标图（用 pie + roseType 做成角度分布） ----
// 这里用更直观的方式：把回转角度做成条形，用角度值当长度
const angleOption = computed(() => ({
  textStyle: { color: '#9ecbff' },
  tooltip: { trigger: 'axis', formatter: '{b}<br/>回转角度：{c}°' },
  grid: { left: 50, right: 40, top: 20, bottom: 30 },
  xAxis: { type: 'value', max: 360, splitLine: { lineStyle: { color: 'rgba(45,120,200,.15)' } } },
  yAxis: {
    type: 'category',
    data: cranes.value.map(c => c.name),
    axisLine: { lineStyle: { color: '#2d78c8' } },
  },
  series: [{
    type: 'bar',
    data: cranes.value.map(c => c.rotation_angle),
    barWidth: '50%',
    itemStyle: {
      borderRadius: [0, 4, 4, 0],
      // 角度越大越偏暖色，视觉上能看出"转了多少"
      color: '#7c8cff',
    },
    label: { show: true, position: 'right', color: '#9ecbff', formatter: '{c}°' },
  }],
}))

// 拉数据
async function fetchData() {
  try {
    cranes.value = await getCranes()
  } catch (err) {
    // 定时器里必须捕获异常，否则后端没启动时会每 60 秒抛一次未捕获错误
    console.error('[塔吊] 加载失败：', err)
  }
}

onMounted(async () => {
  await fetchData()
  timer = setInterval(fetchData, 60000)      // 每 60 秒刷新一次
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
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
.stat-card.run .v { color: #52c41a; }
.stat-card.warn .v { color: #ff4d4f; }
.stat-card.stop .v { color: #6b8db0; }

/* 塔吊卡片网格：自适应列数 */
.crane-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }

.crane-card {
  padding: 14px; border-radius: 8px;
  background: rgba(10,28,50,.7);
  border: 1px solid rgba(45,120,200,.35);
  transition: border-color .2s;
}
.crane-card.warning { border-color: rgba(255,77,79,.6); box-shadow: 0 0 12px rgba(255,77,79,.15); }
.crane-card.stopped { border-color: rgba(107,141,176,.4); opacity: .8; }

.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.card-head .name { font-size: 16px; color: #cfe8ff; font-weight: 600; }
.tag { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.tag.running { background: rgba(82,196,26,.2); color: #52c41a; }
.tag.warning { background: rgba(255,77,79,.2); color: #ff4d4f; }
.tag.stopped { background: rgba(107,141,176,.25); color: #9ecbff; }

.load-row { display: flex; justify-content: space-between; font-size: 12px; color: #9ecbff; margin-bottom: 4px; }
.load-row .value { color: #36e2ff; font-weight: 600; }
.load-bar { height: 6px; background: rgba(45,120,200,.25); border-radius: 3px; overflow: hidden; margin-bottom: 12px; }
.load-in { height: 100%; border-radius: 3px; transition: width .4s; }
.load-in.running { background: linear-gradient(90deg, #36e2ff, #1f6feb); }
.load-in.warning { background: linear-gradient(90deg, #ff7a45, #ff4d4f); }
.load-in.stopped { background: #6b8db0; }

.metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 12px; }
.m { display: flex; justify-content: space-between; font-size: 13px; }
.m .k { color: #6b8db0; }
.m .val { color: #cfe8ff; font-variant-numeric: tabular-nums; }
.m .val i { font-style: normal; font-size: 11px; color: #6b8db0; margin-left: 2px; }

.foot { margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(45,120,200,.18); font-size: 12px; color: #6b8db0; }
.foot.warning { color: #ff4d4f; }

.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; height: 320px; margin-top: 16px; }
</style>
