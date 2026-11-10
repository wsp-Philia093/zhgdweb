<template>
  <div class="page">
    <h1>车辆管理</h1>

    <!-- ① KPI 卡：4 个统计数字 -->
    <div class="stats">
      <div class="stat-card"><div class="v">{{ vehicles.length }}</div><div class="l">总车次</div></div>
      <div class="stat-card in"><div class="v">{{ inCount }}</div><div class="l">进场</div></div>
      <div class="stat-card out"><div class="v">{{ outCount }}</div><div class="l">离场</div></div>
      <!-- 冲洗率用百分比显示，toFixed(0) 保留 0 位小数 -->
      <div class="stat-card wash"><div class="v">{{ washRate }}%</div><div class="l">冲洗率</div></div>
    </div>

    <!-- ② 两张图并排 -->
    <div class="charts">
      <PanelBox title="近 8 小时进出趋势">
        <EChart :option="trendOption" :empty="!vehicles.length" empty-text="暂无车辆记录" />
      </PanelBox>
      <PanelBox title="车型分布">
        <EChart :option="typeOption" :empty="!vehicles.length" empty-text="暂无车辆记录" />
      </PanelBox>
    </div>

    <!-- ③ 车辆记录表 -->
    <PanelBox title="车辆记录">
      <table class="tbl">
        <thead>
          <tr><th>车牌</th><th>车型</th><th>方向</th><th>冲洗</th><th>时间</th></tr>
        </thead>
        <tbody>
          <tr v-for="v in vehicles" :key="v.id">
            <td>{{ v.plate }}</td>
            <td>{{ typeText(v.vtype) }}</td>
            <td>
              <span :class="v.direction === 'in' ? 'on' : 'off'">
                {{ v.direction === 'in' ? '进场' : '离场' }}
              </span>
            </td>
            <td>
              <!-- 已冲洗=绿色√，未冲洗=红色✗（这两个字符直接打出来即可） -->
              <span v-if="v.washed" class="washed-yes">已冲洗</span>
              <span v-else class="washed-no">未冲洗</span>
            </td>
            <td class="time">{{ fmtTime(v.create_at) }}</td>
          </tr>
        </tbody>
      </table>
    </PanelBox>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getVehicles } from '../api'
import PanelBox from '../components/PanelBox.vue'
import EChart from '../components/EChart.vue'

const vehicles = ref([])          // 车辆记录列表

// ---- KPI 统计 ----
const inCount = computed(() => vehicles.value.filter(v => v.direction === 'in').length)
const outCount = computed(() => vehicles.value.filter(v => v.direction === 'out').length)

// 冲洗率 = 已冲洗车次 / 总车次 * 100
// 注意要防除零：总数为 0 时直接返回 0，否则会得到 NaN
const washRate = computed(() => {
  if (!vehicles.value.length) return 0
  const washed = vehicles.value.filter(v => v.washed).length
  return ((washed / vehicles.value.length) * 100).toFixed(0)
})

// 车型英文转中文
function typeText(t) {
  return { muck: '渣土车', concrete: '混凝土车', other: '其他' }[t] || t
}

// ---- 进出趋势：和 PersonnelView 完全同一套"按小时聚合"思路 ----
const trendOption = computed(() => {
  const hours = []
  const ins = []
  const outs = []
  const now = new Date()

  for (let i = 7; i >= 0; i--) {
    const h = new Date(now.getTime() - i * 3600 * 1000)
    hours.push(`${String(h.getHours()).padStart(2, '0')}:00`)
    const sameHour = vehicles.value.filter(v => new Date(v.create_at).getHours() === h.getHours())
    ins.push(sameHour.filter(v => v.direction === 'in').length)
    outs.push(sameHour.filter(v => v.direction === 'out').length)
  }

  return {
    textStyle: { color: '#9ecbff' },
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: '#9ecbff' }, top: 0 },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: hours, axisLine: { lineStyle: { color: '#2d78c8' } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(45,120,200,.15)' } } },
    series: [
      { name: '进场', type: 'line', data: ins, smooth: true, itemStyle: { color: '#52c41a' } },
      { name: '离场', type: 'line', data: outs, smooth: true, itemStyle: { color: '#ff4d4f' } },
    ],
  }
})

// ---- 车型分布饼图 ----
const typeOption = computed(() => {
  const counts = {}
  vehicles.value.forEach(v => { counts[v.vtype] = (counts[v.vtype] || 0) + 1 })
  return {
    textStyle: { color: '#9ecbff' },
    tooltip: {},
    legend: { textStyle: { color: '#9ecbff' }, bottom: 0 },
    color: ['#36e2ff', '#ffd166', '#7c8cff'],
    series: [{
      type: 'pie', radius: ['40%', '65%'], center: ['50%', '45%'],
      label: { color: '#cfe8ff' },
      // 把英文 vtype 转成中文再当图例名
      data: Object.keys(counts).map(t => ({ name: typeText(t), value: counts[t] })),
    }],
  }
})

// 时间格式化（和 PersonnelView 一样）
function fmtTime(s) {
  const d = new Date(s)
  const p = n => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

onMounted(async () => {
  vehicles.value = await getVehicles()
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
.stat-card.in .v { color: #52c41a; }       /* 进场绿 */
.stat-card.out .v { color: #ff4d4f; }      /* 离场红 */
.stat-card.wash .v { color: #ffd166; }     /* 冲洗率黄 */

.charts { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; height: 320px; margin-bottom: 16px; }

.tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
.tbl th, .tbl td { padding: 9px 12px; text-align: left; border-bottom: 1px solid rgba(45,120,200,.18); }
.tbl th { color: #9ecbff; font-weight: normal; background: rgba(16,42,74,.6); }
.tbl tbody tr:hover { background: rgba(54,226,255,.05); }
.on { color: #52c41a; }            /* 进场 */
.off { color: #ff4d4f; }           /* 离场 */
.washed-yes { color: #52c41a; }
.washed-no { color: #ff4d4f; font-weight: bold; }   /* 未冲洗要醒目，是管理重点 */
.time { color: #6b8db0; font-variant-numeric: tabular-nums; }
</style>
