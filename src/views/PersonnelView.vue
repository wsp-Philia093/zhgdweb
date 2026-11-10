<template>
  <div class="page">
    <h1>人员进出</h1>

    <!-- ① KPI 卡 -->
    <div class="stats">
      <div class="stat-card"><div class="v">{{ onsite }}</div><div class="l">在场人数</div></div>
      <div class="stat-card"><div class="v">{{ workers.length }}</div><div class="l">总人数</div></div>
      <div class="stat-card in"><div class="v">{{ inCount }}</div><div class="l">进场记录</div></div>
      <div class="stat-card out"><div class="v">{{ outCount }}</div><div class="l">离场记录</div></div>
    </div>

    <!-- ② 两张图 -->
    <div class="charts">
      <PanelBox title="进出趋势">
        <!-- empty 判断：没有进出记录时显示"暂无数据"，避免空白图表 -->
        <EChart :option="trendOption" :empty="!logs.length" empty-text="暂无进出记录" />
      </PanelBox>
      <PanelBox title="班组分布">
        <EChart :option="teamOption" :empty="!workers.length" empty-text="暂无人员数据" />
      </PanelBox>
    </div>

    <!-- ③ 人员名单 -->
    <PanelBox title="人员名单">
      <table class="tbl">
        <thead>
          <tr><th>姓名</th><th>班组</th><th>状态</th><th>进场时间</th></tr>
        </thead>
        <tbody>
          <tr v-for="w in workers" :key="w.id">
            <td>{{ w.name }}</td>
            <td>{{ w.team }}</td>
            <td>
              <span v-if="w.is_onsite" class="on">在场</span>
              <span v-else class="off">离场</span>
            </td>
            <td class="time">{{ fmtTime(w.entry_at) }}</td>
          </tr>
        </tbody>
      </table>
    </PanelBox>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getWorkers, getEntryLogs } from '../api'          // 复用封装
import PanelBox from '../components/PanelBox.vue'
import EChart from '../components/EChart.vue'

const workers = ref([])        // 人员列表
const logs = ref([])           // 进出记录

// ---- KPI ----
const onsite = computed(() => workers.value.filter(w => w.is_onsite).length)
const inCount = computed(() => logs.value.filter(l => l.direction === 'in').length)
const outCount = computed(() => logs.value.filter(l => l.direction === 'out').length)

// ---- 进出趋势：按"小时"聚合，统计每小时的进场/离场数 ----
const trendOption = computed(() => {
  const hours = []           // x 轴：小时标签
  const ins = []             // 每小时进场数
  const outs = []            // 每小时离场数

  const now = new Date()
  for (let i = 7; i >= 0; i--) {          // 从 7 小时前到当前，共 8 个点
    const h = new Date(now.getTime() - i * 3600 * 1000)   // 第 i 小时前的时间
    const label = `${String(h.getHours()).padStart(2, '0')}:00`   // "09:00"
    hours.push(label)
    // 统计这一小时内的记录
    const sameHour = logs.value.filter(l => {
      const t = new Date(l.create_at)                     // 记录时间
      return t.getHours() === h.getHours()                // 同一个小时
    })
    ins.push(sameHour.filter(l => l.direction === 'in').length)
    outs.push(sameHour.filter(l => l.direction === 'out').length)
  }

  return {
    textStyle: { color: '#9ecbff' },
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: '#9ecbff' }, top: 0 },    // 图例：进场/离场
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: hours, axisLine: { lineStyle: { color: '#2d78c8' } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(45,120,200,.15)' } } },
    series: [
      { name: '进场', type: 'line', data: ins, smooth: true, itemStyle: { color: '#52c41a' } },   // 绿=进
      { name: '离场', type: 'line', data: outs, smooth: true, itemStyle: { color: '#ff4d4f' } },  // 红=出
    ],
  }
})

// ---- 班组分布饼图 ----
const teamOption = computed(() => {
  const counts = {}                                       // 临时统计
  workers.value.forEach(w => { counts[w.team] = (counts[w.team] || 0) + 1 })
  return {
    textStyle: { color: '#9ecbff' },
    tooltip: {},
    legend: { textStyle: { color: '#9ecbff' }, bottom: 0 },
    color: ['#36e2ff', '#4dd0e1', '#7c8cff', '#ffd166'],
    series: [{
      type: 'pie', radius: ['40%', '65%'], center: ['50%', '45%'],
      label: { color: '#cfe8ff' },
      data: Object.keys(counts).map(t => ({ name: t, value: counts[t] })),
    }],
  }
})

// 时间格式化
function fmtTime(s) {
  const d = new Date(s)
  const p = n => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

onMounted(async () => {
  // 两个接口并行拉
  const [w, l] = await Promise.all([getWorkers(), getEntryLogs()])
  workers.value = w
  logs.value = l
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
.stat-card.in .v { color: #52c41a; }      /* 进场绿 */
.stat-card.out .v { color: #ff4d4f; }     /* 离场红 */

/* 两张图并排 */
.charts { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; height: 320px; margin-bottom: 16px; }

.tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
.tbl th, .tbl td { padding: 9px 12px; text-align: left; border-bottom: 1px solid rgba(45,120,200,.18); }
.tbl th { color: #9ecbff; font-weight: normal; background: rgba(16,42,74,.6); }
.tbl tbody tr:hover { background: rgba(54,226,255,.05); }
.on { color: #52c41a; }       /* 在场 */
.off { color: #6b8db0; }      /* 离场 */
.time { color: #6b8db0; font-variant-numeric: tabular-nums; }
</style>
