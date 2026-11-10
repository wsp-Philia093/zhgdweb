
<template>
  <div class="screen-wrap">
    <div class="screen" :style="screenStyle">
      <header class="header">
        <span class="deco-line"></span>
        <h1>智慧工地可视化大屏</h1>
        <span class="deco-line"></span>
        <span class="clock">{{ now }}</span>
        <!-- ★ 右上角工具按钮（刷新 / 全屏） -->
        <div class="header-tools">
          <button @click="fetchData">刷新</button>
          <button @click="toggleFullscreen">全屏</button>
        </div>
      </header>

      <!-- ★ 错误提示横幅：仅在加载失败时出现 -->
      <div v-if="errorMsg" class="error-bar">
        <span class="ico">!</span>{{ errorMsg }}
      </div>

      <!-- ★ KPI 数据卡行 -->
      <!-- 显示规则：出错时全部显示 '--'（表示"没拿到数据"，而不是"真的是 0"）；
           加载中显示 '…'；正常才显示真实数字 -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-val">{{ kpiText(kpi.onsite) }}</div>
          <div class="kpi-label">在场人数</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-val">{{ kpiText(kpi.cranes) }}</div>
          <div class="kpi-label">塔吊总数</div>
        </div>
        <div class="kpi-card warn">
          <div class="kpi-val">{{ kpiText(kpi.alarms) }}</div>
          <div class="kpi-label">待处理报警</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-val">{{ kpiText(kpi.pm25) }}</div>
          <div class="kpi-label">PM2.5(μg/m³)</div>
        </div>
      </div>

      <div class="grid">
        <aside class="col left">
          <!-- 面板1：报警列表（内容不是图表，直接用 PanelBox 的插槽塞列表） -->
          <PanelBox title="实时报警">
            <!-- ★ 筛选工具条（级别绑 store，大屏与报警页共享） -->
            <div class="alarm-tools">
              <select v-model="alarmFilterLevel" @change="fetchData">
                <option value="">全部级别</option>
                <option value="urgent">紧急</option>
                <option value="important">重要</option>
                <option value="normal">一般</option>
              </select>
              <label class="chk">
                <!-- 绑 store 的 filterHandled：勾上 = 'false'(只看未处理)，取消 = ''(全部) -->
                <input type="checkbox" :checked="alarmFilterHandled === 'false'"
                       @change="e => { alarmFilterHandled = e.target.checked ? 'false' : ''; fetchData() }" />
                只看未处理
              </label>
            </div>
            <!-- ★ 报警列表 -->
            <ul class="alarm-list">
              <li v-for="a in alarms" :key="a.id" :class="['alarm-item', a.level]">
                <span class="tag">{{ levelText(a.level) }}</span>
                <span class="msg">{{ a.message }}</span>
                <!-- 未处理显示"处理"按钮，已处理显示文字 -->
                <button v-if="!a.is_handled" class="btn-handle" @click="handleAlarm(a.id)">处理</button>
                <span v-else class="status">已处理</span>
              </li>
              <!-- ★ 空状态：没数据时给个提示，别让用户以为是页面坏了 -->
              <li v-if="!alarms.length" class="alarm-empty">
                {{ errorMsg ? '数据加载失败' : '暂无报警记录' }}
              </li>
            </ul>
          </PanelBox>

          <!-- 面板2：在场人数 + 班组饼图 -->
          <PanelBox title="在场人员">
            <div class="worker-count">
              <!-- ★ 同样走 kpiText：出错显示 '--'，加载中显示 '…'，避免误导成"真的没人" -->
              <span class="num">{{ kpiText(onsiteCount) }}</span><span class="unit">人</span>
            </div>
            <div class="pie-wrap">
              <EChart :option="workerOption" :empty="!workers.length"
                      :empty-text="errorMsg ? '数据加载失败' : '暂无人员数据'" />
            </div>
          </PanelBox>
        </aside>

        <main class="col center">
          <!-- 面板3：塔吊柱状图 -->
          <PanelBox title="塔吊载重">
            <router-link class="more" to="/cranes">查看详情 →</router-link>
            <!-- ★ 加空状态：后端没数据/没启动时，图表区显示提示而不是一片空白 -->
            <EChart :option="craneOption" :empty="!craneList.length"
                    :empty-text="errorMsg ? '数据加载失败' : '暂无塔吊数据'" />
          </PanelBox>
        </main>

        <aside class="col right">
          <!-- 面板4：环境折线图 -->
          <PanelBox title="环境监测 PM2.5">
            <EChart :option="envOption" :empty="!envList.length" empty-text="暂无环境数据" />
          </PanelBox>

          <!-- 面板5：扩展模块入口（占位模块的快捷跳转） -->
          <PanelBox title="扩展模块">
            <div class="ext-links">
              <router-link to="/video" class="ext-item">
                <span class="ico">▣</span><span class="nm">视频监控</span><span class="badge">占位</span>
              </router-link>
              <router-link to="/bim" class="ext-item">
                <span class="ico">◈</span><span class="nm">BIM 模型</span><span class="badge">占位</span>
              </router-link>
              <router-link to="/face" class="ext-item">
                <span class="ico">☺</span><span class="nm">人脸实名制</span><span class="badge">占位</span>
              </router-link>
            </div>
          </PanelBox>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'  // 导入所需 API
import * as echarts from 'echarts'                 // 画图（含 graphic 渐变工具）
import PanelBox from '../components/PanelBox.vue'
import EChart from '../components/EChart.vue'
import { getCranes, getEnvs, getWorkers } from '../api'
import { useAlarmStore } from '../stores/alarm'
import { storeToRefs } from 'pinia'

const alarmStore = useAlarmStore()
const {
  list: alarms,                          // 报警列表（store 的，只读用）
  filterLevel: alarmFilterLevel,         // 级别筛选（与报警页共享同一个）
  filterHandled: alarmFilterHandled,     // 处理状态筛选（与报警页共享同一个）
} = storeToRefs(alarmStore)

const craneList = ref([])                          // 塔吊列表（响应式）
const envList = ref([])                            // 环境记录列表
const workers = ref([])                            // 人员列表

const onsiteCount = computed(() =>                 // 计算属性：在场人数
  workers.value.filter(w => w.is_onsite).length    // 过滤出在场的再数个数
)

const scale = ref(1)                              // 缩放比例
function setScale() {                             // 计算缩放
  scale.value = Math.min(window.innerWidth / 1920, window.innerHeight / 1080)
}
const screenStyle = computed(() => ({ transform: `scale(${scale.value})` }))  // 绑定缩放样式

const now = ref('')                               // 实时时钟文字
const errorMsg = ref('')                          // 数据加载错误提示（后端没启动时显示）
const loading = ref(true)                         // 首次加载中标记（首屏不要闪 0，先显示 '…'）
function tick() {                                 // 每秒刷新一次时间
  now.value = new Date().toLocaleString('zh-CN', { hour12: false })  // 中文格式、24 小时制
}

// ★ KPI 数字的显示包装：
// 首屏 loading 先显示 '…'，出错显示 '--'，正常才显示真实值。
// 这样用户一眼能分清"数字是 0"和"数据没拿到"——两种情况的视觉表现完全不同。
function kpiText(val) {
  if (errorMsg.value) return '--'      // 出错 → 长破折号
  if (loading.value) return '…'        // 首次加载中 → 省略号
  return val                           // 正常 → 真实数字
}

function levelText(level) {                       // 级别英文转中文
  return { urgent: '紧急', important: '重要', normal: '一般' }[level] || level
}

let timer = null                                  // 数据刷新定时器
let clockTimer = null                             // 时钟定时器

// ---- 唯一的数据拉取函数：塔吊/环境/人员自己拉，报警交给 store ----
async function fetchData() {
  try {
    const [cranes, envs, workerData] = await Promise.all([
      getCranes(),
      getEnvs(),
      getWorkers(),
    ])
    craneList.value = cranes
    envList.value = envs
    workers.value = workerData
    await alarmStore.fetchAlarms()      // 报警交给 store 管（store 内部会带上当前筛选条件）
    errorMsg.value = ''                 // 成功就清掉错误提示
  } catch (err) {
    // ★ 关键：必须 try/catch！
    // 否则后端没启动时 Promise 会抛未捕获异常，定时器每 60 秒刷一次报错，页面还会白屏
    errorMsg.value = '数据加载失败，请确认后端服务已启动（127.0.0.1:8000）'
    console.error('[大屏] 数据加载失败：', err)
  } finally {
    loading.value = false               // 不管成功失败，首次加载都算结束了
  }
}

// ---- 塔吊柱状图的配置：数据一变，这里自动重算 ----
const craneOption = computed(() => ({
  textStyle: { color: '#9ecbff' },
  tooltip: {},
  grid: { left: 40, right: 20, top: 30, bottom: 30 },
  xAxis: {
    type: 'category',
    data: craneList.value.map(c => c.name),              // 从 ref 里取名字
    axisLine: { lineStyle: { color: '#2d78c8' } },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    splitLine: { lineStyle: { color: 'rgba(45,120,200,.15)' } },
  },
  series: [{
    type: 'bar',
    data: craneList.value.map(c => c.load),
    barWidth: '45%',
    itemStyle: {
      borderRadius: [4, 4, 0, 0],
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#36e2ff' },
        { offset: 1, color: '#1f6feb' },
      ]),
    },
  }],
}))

// ---- 环境折线图的配置 ----
const envOption = computed(() => ({
  textStyle: { color: '#9ecbff' },
  tooltip: { trigger: 'axis' },
  grid: { left: 40, right: 20, top: 30, bottom: 30 },
  xAxis: {
    type: 'category',
    // ★ 原来用的是 e.id（数据库主键），x 轴会显示成 49/52/55 这种无意义数字。
    // 改成记录时间后取"时:分"，才是真实项目里该有的样子。
    data: envList.value.map(e => (e.recorded_at || '').slice(11, 16)),
    axisLine: { lineStyle: { color: '#2d78c8' } },
    // 标签太多会挤成一团，交给 ECharts 自动隐藏重叠的
    axisLabel: { hideOverlap: true },
  },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(45,120,200,.15)' } } },
  series: [{
    type: 'line',
    data: envList.value.map(e => e.pm25),
    smooth: true, symbol: 'circle', symbolSize: 6,
    itemStyle: { color: '#36e2ff' },
    lineStyle: { width: 2, color: '#36e2ff' },
    areaStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: 'rgba(54,226,255,.45)' },
        { offset: 1, color: 'rgba(54,226,255,0)' },
      ]),
    },
  }],
}))

// ---- 人员班组饼图的配置 ----
const workerOption = computed(() => {
  const teamCounts = {}                                 // 临时统计各班组人数
  workers.value.forEach(w => { teamCounts[w.team] = (teamCounts[w.team] || 0) + 1 })
  return {
    textStyle: { color: '#9ecbff' },
    tooltip: {},
    legend: { textStyle: { color: '#9ecbff' }, bottom: 0 },
    color: ['#36e2ff', '#4dd0e1', '#7c8cff', '#ffd166'],
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '45%'],
      label: { color: '#cfe8ff' },
      data: Object.keys(teamCounts).map(t => ({ name: t, value: teamCounts[t] })),
    }],
  }
})


// ---- KPI 数据：从已有数据算出来，不用额外请求 ----
const kpi = computed(() => ({
  onsite: onsiteCount.value,                                    // 在场人数
  cranes: craneList.value.length,                               // 塔吊总数
  alarms: alarmStore.unhandledCount,                            // 待处理报警数（从 store 拿）
  pm25: envList.value.length ? envList.value[envList.value.length - 1].pm25 : 0,  // 最新 PM2.5
}))

// ---- 处理报警：交给 store（store 处理完会重新拉取，两处数据同步） ----
async function handleAlarm(id) {
  await alarmStore.handleOne(id)
}

// ---- 全屏切换 ----
function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()                 // 已在全屏 → 退出
  } else {
    document.documentElement.requestFullscreen()  // 否则 → 请求全屏
  }
}

onMounted(async () => {
  setScale()
  window.addEventListener('resize', setScale)
  tick()                                       // 时钟先显示一次
  clockTimer = setInterval(tick, 1000)        // 时钟每秒走
  await fetchData()
  timer = setInterval(fetchData, 60000)       // 数据每 60 秒（1 分钟）刷新
})

onUnmounted(() => {
  window.removeEventListener('resize', setScale)
  if (timer) clearInterval(timer)
  if (clockTimer) clearInterval(clockTimer)
})


</script>

<style scoped>
/* ===== 背景：深空蓝 + 顶部高光渐变 + 细网格 ===== */
.screen-wrap {
  width: 100vw; height: 100vh; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  /* 径向高光（顶部中间亮）+ 底色；再加一层 repeating 细网格增加科技感 */
  background:
    radial-gradient(circle at 50% -10%, #0a2a4d 0%, #04101f 60%),
    repeating-linear-gradient(0deg, rgba(45,120,200,.05) 0 1px, transparent 1px 40px),
    repeating-linear-gradient(90deg, rgba(45,120,200,.05) 0 1px, transparent 1px 40px);
  background-color: #04101f;
}
.screen {
  width: 1920px; height: 1080px; transform-origin: center center;
  display: flex; flex-direction: column;
}

/* ===== 标题栏 ===== */
.header {
  display: flex; align-items: center; justify-content: center;
  gap: 20px; padding: 18px 0 10px; position: relative;
}
.header h1 {
  margin: 0; font-size: 34px; letter-spacing: 4px; font-weight: 700;
  /* 标题文字青蓝渐变 */
  background: linear-gradient(90deg, #36e2ff, #7c8cff);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  text-shadow: 0 0 18px rgba(54,226,255,.35);  /* 发光 */
}
.deco-line {                          /* 标题两侧的短装饰线 */
  width: 120px; height: 2px;
  background: linear-gradient(90deg, transparent, #36e2ff);
}
.deco-line:last-child { transform: scaleX(-1); }  /* 右边那条镜像 */
.clock {                              /* 右上角时钟 */
  position: absolute; right: 160px; top: 22px;   /* right 让开右侧工具按钮的位置 */
  color: #9ecbff; font-size: 16px; font-variant-numeric: tabular-nums;
}

/* ===== 三栏网格 ===== */
.grid { flex: 1; display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 16px; padding: 16px; }
.col { display: flex; flex-direction: column; gap: 16px; }



/* ===== 报警列表 ===== */
/* ★ 加 display:flex + flex-direction:column，是为了让空状态那条能垂直居中；
   有数据时子项默认不伸缩（flex:0 0 auto 由 li 的内容撑开），不影响原来的列表效果 */
.alarm-list {
  list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1;
  display: flex; flex-direction: column;
}
.alarm-item { display: flex; align-items: center; gap: 8px; padding: 7px 4px; border-bottom: 1px solid rgba(45,120,200,.18); font-size: 14px; }
.alarm-item .tag { padding: 2px 7px; border-radius: 4px; font-size: 12px; }
.alarm-item.urgent .tag { background: #ff4d4f; color: #fff; }
.alarm-item.important .tag { background: #faad14; color: #000; }
.alarm-item.normal .tag { background: #52c41a; color: #000; }
.alarm-item .msg { flex: 1; }
.alarm-item .status { color: #6b8db0; }
/* 报警列表空状态：撑满剩余空间并垂直居中 */
.alarm-empty {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: #4a6b8f; font-size: 13px; border: none;
}

/* ===== 在场人数 ===== */
.worker-count { text-align: center; margin: 6px 0 2px; }
.worker-count .num { font-size: 52px; font-weight: bold; color: #36e2ff; text-shadow: 0 0 16px rgba(54,226,255,.6); }
.worker-count .unit { font-size: 18px; margin-left: 4px; color: #9ecbff; }

/* 饼图外层：给个固定高度，EChart 的 100% 高度才有参照 */
.pie-wrap { height: 180px; }

/* ===== KPI 卡片行 ===== */
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 0 16px; }
.kpi-card {
  background: linear-gradient(180deg, rgba(16,42,74,.92), rgba(8,24,46,.92));
  border: 1px solid rgba(45,120,200,.4);
  border-radius: 8px; padding: 12px 18px; text-align: center;
}
.kpi-val { font-size: 32px; font-weight: bold; color: #36e2ff; text-shadow: 0 0 14px rgba(54,226,255,.5); }
.kpi-label { font-size: 13px; color: #9ecbff; margin-top: 4px; }
.kpi-card.warn .kpi-val { color: #faad14; text-shadow: 0 0 14px rgba(250,173,20,.5); }  /* 待处理报警用橙色警示 */

/* ===== 报警筛选工具条 ===== */
.alarm-tools { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; font-size: 13px; }
.alarm-tools select {
  background: rgba(10,30,55,.9); color: #cfe8ff;
  border: 1px solid rgba(45,120,200,.5); border-radius: 4px; padding: 3px 8px; outline: none;
}
.chk { display: flex; align-items: center; gap: 4px; color: #9ecbff; cursor: pointer; }

/* ===== 报警"处理"按钮 ===== */
.btn-handle {
  background: rgba(54,226,255,.15); color: #36e2ff;
  border: 1px solid rgba(54,226,255,.5); border-radius: 4px;
  padding: 2px 10px; font-size: 12px; cursor: pointer;
}
.btn-handle:hover { background: rgba(54,226,255,.3); }   /* 悬停变亮 */

/* ===== 右上角工具按钮 ===== */
.header-tools { position: absolute; right: 24px; top: 22px; display: flex; gap: 8px; }
.header-tools button {
  background: rgba(54,226,255,.12); color: #9ecbff;
  border: 1px solid rgba(54,226,255,.4); border-radius: 4px;
  padding: 3px 12px; font-size: 13px; cursor: pointer;
}
.header-tools button:hover { background: rgba(54,226,255,.28); color: #fff; }

/* ===== 扩展模块入口 ===== */
.ext-links { display: flex; flex-direction: column; gap: 8px; }
.ext-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 6px;
  background: rgba(10,30,55,.7);
  border: 1px solid rgba(45,120,200,.35);
  text-decoration: none; font-size: 14px; color: #cfe8ff;
  transition: all .2s;
}
.ext-item:hover { background: rgba(54,226,255,.12); border-color: #36e2ff; color: #fff; }
.ext-item .ico { font-size: 16px; color: #36e2ff; }
.ext-item .nm { flex: 1; }
.ext-item .badge {
  font-size: 11px; padding: 1px 6px; border-radius: 3px;
  background: rgba(255,209,102,.2); color: #ffd166;
}

/* ===== 错误提示横幅 ===== */
.error-bar {
  display: flex; align-items: center; gap: 8px;
  margin: 0 16px 8px; padding: 8px 16px;
  font-size: 13px; color: #ff9c9e;
  background: rgba(255,77,79,.12);
  border: 1px solid rgba(255,77,79,.45);
  border-left: 3px solid #ff4d4f;
  border-radius: 4px;
}
.error-bar .ico {
  display: inline-flex; align-items: center; justify-content: center;
  width: 15px; height: 15px; border-radius: 50%;
  background: #ff4d4f; color: #fff; font-size: 11px;
  font-weight: bold; flex-shrink: 0;
}

.more { position: absolute; right: 16px; top: 14px; font-size: 13px; color: #36e2ff; text-decoration: none; }
.more:hover { text-decoration: underline; }
</style>


