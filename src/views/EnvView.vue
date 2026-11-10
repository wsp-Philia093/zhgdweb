<template>
  <div class="page">
    <h1>环境监测</h1>

    <!-- ① 实时指标卡：取最新一条记录 -->
    <div class="stats">
      <div class="stat-card" :class="{ bad: envState.pm25.bad }">
        <div class="v">{{ latest.pm25 }}</div><div class="l">PM2.5 (μg/m³)</div>
      </div>
      <div class="stat-card" :class="{ bad: envState.pm10.bad }">
        <div class="v">{{ latest.pm10 }}</div><div class="l">PM10 (μg/m³)</div>
      </div>
      <div class="stat-card" :class="{ bad: envState.tsp.bad }">
        <div class="v">{{ latest.tsp }}</div><div class="l">扬尘 TSP</div>
      </div>
      <div class="stat-card" :class="{ bad: envState.noise.bad }">
        <div class="v">{{ latest.noise }}</div><div class="l">噪音 (dB)</div>
      </div>
      <div class="stat-card"><div class="v">{{ latest.temperature }}</div><div class="l">温度 (℃)</div></div>
      <div class="stat-card"><div class="v">{{ latest.humidity }}</div><div class="l">湿度 (%)</div></div>
    </div>

    <!-- ② 时间范围切换 -->
    <div class="toolbar">
      <span class="lb">时间范围：</span>
      <button v-for="h in [6, 12, 24]" :key="h"
              :class="{ active: hours === h }"
              @click="switchHours(h)">{{ h }} 小时</button>
      <span class="wind">风向 {{ latest.wind_direction }} · 风速 {{ latest.wind_speed }} m/s</span>
    </div>

    <!-- ③ 颗粒物折线（PM2.5 / PM10 / TSP 三条线对比） -->
    <PanelBox title="颗粒物浓度趋势">
      <div class="chart-wrap">
        <EChart :option="dustOption" :empty="!list.length" empty-text="暂无环境数据（试试切换时间范围）" />
      </div>
    </PanelBox>

    <!-- ④ 温湿度 + 噪音双图 -->
    <div class="charts">
      <PanelBox title="温湿度变化">
        <EChart :option="climateOption" :empty="!list.length" empty-text="暂无环境数据" />
      </PanelBox>
      <PanelBox title="噪音趋势">
        <EChart :option="noiseOption" :empty="!list.length" empty-text="暂无环境数据" />
      </PanelBox>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getEnvs } from '../api'
import PanelBox from '../components/PanelBox.vue'
import EChart from '../components/EChart.vue'

const list = ref([])          // 环境记录列表（按时间升序）
const hours = ref(24)         // 当前查询的小时数

// ---- 阈值：跟前端展示联动，超标就标红 ----
// 注意这些数值和后端 Threshold 表的前端预警值保持一致（pm25 预警 75、噪音 70）
const LIMITS = { pm25: 75, pm10: 150, tsp: 200, noise: 70 }

// 最新一条记录
const latest = computed(() => list.value.length ? list.value[list.value.length - 1] : {})

// 每个指标是否超标（用来给 KPI 卡加红框）
const envState = computed(() => {
  const l = latest.value
  const over = (k) => l[k] !== undefined && l[k] > LIMITS[k]
  return {
    pm25: { bad: over('pm25') },
    pm10: { bad: over('pm10') },
    tsp: { bad: over('tsp') },
    noise: { bad: over('noise') },
  }
})

// x 轴标签：把时间戳格式化成 "HH:00"
function hourLabel(s) {
  const d = new Date(s)
  return `${String(d.getHours()).padStart(2, '0')}:00`
}

// 通用折线图配置生成器，减少重复代码
// seriesCfg: [{ name, field, color }]，一个指标一条线
function lineOption(unit, seriesCfg) {
  return {
    textStyle: { color: '#9ecbff' },
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: '#9ecbff' }, top: 0 },
    grid: { left: 50, right: 24, top: 44, bottom: 30 },
    xAxis: {
      type: 'category',
      data: list.value.map(e => hourLabel(e.recorded_at)),   // x 轴：时间
      axisLine: { lineStyle: { color: '#2d78c8' } },
      axisLabel: { color: '#9ecbff' },
    },
    yAxis: {
      type: 'value',
      name: unit,                                            // y 轴单位
      nameTextStyle: { color: '#6b8db0' },
      splitLine: { lineStyle: { color: 'rgba(45,120,200,.15)' } },
      axisLabel: { color: '#9ecbff' },
    },
    series: seriesCfg.map(cfg => ({
      name: cfg.name,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      data: list.value.map(e => e[cfg.field]),               // 按字段取值
      itemStyle: { color: cfg.color },
      lineStyle: { width: 2, color: cfg.color },
      // 只有单指标时才画渐变面积，多指标画会太乱
      areaStyle: seriesCfg.length === 1 ? {
        color: cfg.color.replace(')', ', .25)').replace('rgb', 'rgba'),
      } : undefined,
    })),
  }
}

// 颗粒物三条线（PM2.5 / PM10 / TSP）
const dustOption = computed(() => lineOption('μg/m³', [
  { name: 'PM2.5', field: 'pm25', color: '#36e2ff' },
  { name: 'PM10', field: 'pm10', color: '#ffd166' },
  { name: 'TSP', field: 'tsp', color: '#7c8cff' },
]))

// 温湿度双线
const climateOption = computed(() => lineOption('', [
  { name: '温度(℃)', field: 'temperature', color: '#ff7a45' },
  { name: '湿度(%)', field: 'humidity', color: '#36e2ff' },
]))

// 噪音单线（带面积填充，更直观）
const noiseOption = computed(() => lineOption('dB', [
  { name: '噪音', field: 'noise', color: '#ff4d4f' },
]))

// 拉数据
async function fetchData() {
  try {
    list.value = await getEnvs(hours.value)
  } catch (err) {
    // 定时器里必须捕获异常，避免后端异常时反复抛未捕获错误
    console.error('[环境] 加载失败：', err)
  }
}

// 切换时间范围
function switchHours(h) {
  hours.value = h
  fetchData()
}

let timer = null

onMounted(async () => {
  await fetchData()
  timer = setInterval(fetchData, 60000)      // 每 60 秒刷新
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.page { padding: 70px 30px 30px; color: #fff; min-height: 100vh; background: #06121f; }
.page h1 { color: #36e2ff; margin-bottom: 20px; font-size: 26px; }

.stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; margin-bottom: 16px; }
.stat-card {
  padding: 14px 16px; text-align: center;
  background: linear-gradient(180deg, rgba(16,42,74,.92), rgba(8,24,46,.92));
  border: 1px solid rgba(45,120,200,.4); border-radius: 8px;
  transition: border-color .2s, box-shadow .2s;
}
.stat-card .v { font-size: 26px; font-weight: bold; color: #36e2ff; font-variant-numeric: tabular-nums; }
.stat-card .l { font-size: 12px; color: #9ecbff; margin-top: 4px; }
/* 超标：红框 + 红字 + 微光 */
.stat-card.bad { border-color: rgba(255,77,79,.7); box-shadow: 0 0 12px rgba(255,77,79,.2); }
.stat-card.bad .v { color: #ff4d4f; }

.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-size: 13px; }
.toolbar .lb { color: #9ecbff; }
.toolbar button {
  background: rgba(10,30,55,.9); color: #9ecbff;
  border: 1px solid rgba(45,120,200,.5); border-radius: 4px;
  padding: 4px 14px; cursor: pointer; font-size: 13px;
}
.toolbar button.active { background: rgba(54,226,255,.25); color: #fff; border-color: #36e2ff; }
.toolbar button:hover { border-color: #36e2ff; }
.toolbar .wind { margin-left: auto; color: #6b8db0; }

.chart-wrap { height: 300px; }
.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; height: 300px; margin-top: 16px; }
</style>
