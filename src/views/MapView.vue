<template>
  <div class="page">
    <h1>场布示意图</h1>

    <!-- ① 顶部统计：设施数量概览 -->
    <div class="stats">
      <div class="stat-card"><div class="v">{{ points.length }}</div><div class="l">设施点位</div></div>
      <div class="stat-card crane"><div class="v">{{ craneCount }}</div><div class="l">塔吊</div></div>
      <div class="stat-card warn"><div class="v">{{ warnCount }}</div><div class="l">预警点位</div></div>
      <div class="stat-card env"><div class="v">{{ latestPm25 }}</div><div class="l">PM2.5(μg/m³)</div></div>
    </div>

    <div class="layout">
      <!-- ② 左侧：场布平面图（ECharts graph 画点位） -->
      <PanelBox title="施工现场平面布置">
        <div class="map-wrap">
          <EChart :option="mapOption" :empty="!ready" empty-text="正在加载场布数据…" />
        </div>
      </PanelBox>

      <!-- ③ 右侧：点位图例 + 塔吊实时状态 -->
      <aside class="side">
        <PanelBox title="塔吊实时状态">
          <ul class="crane-list">
            <li v-for="c in cranes" :key="c.id" :class="c.status">
              <span class="dot"></span>
              <span class="nm">{{ c.name }}</span>
              <span class="ld">{{ c.load }}t</span>
              <span class="st">{{ statusText(c.status) }}</span>
            </li>
          </ul>
        </PanelBox>

        <PanelBox title="设施说明">
          <ul class="legend">
            <li v-for="l in legends" :key="l.name">
              <span class="swatch" :style="{ background: l.color }"></span>
              <span class="nm">{{ l.name }}</span>
              <span class="desc">{{ l.desc }}</span>
            </li>
          </ul>
        </PanelBox>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getCranes, getEnvs } from '../api'
import PanelBox from '../components/PanelBox.vue'
import EChart from '../components/EChart.vue'

const cranes = ref([])        // 塔吊列表（真实数据）
const envs = ref([])          // 环境记录（取最新一条显示 PM2.5）
const ready = ref(false)      // 数据是否已加载完（未加载完时图里显示加载提示）

// ---- 场布点位：坐标用 0~100 的百分比，x 向右、y 向下（模拟俯视图） ----
// 注意：这是按工地常规布局手工设的示意坐标，不是真实地理坐标
const points = [
  // 塔吊（坐标摆在主体区域的四周，避免压在"在建主体"框上）
  { name: '1号塔吊', x: 22, y: 28, type: 'crane', craneIdx: 0 },
  { name: '2号塔吊', x: 72, y: 28, type: 'crane', craneIdx: 1 },
  { name: '3号塔吊', x: 48, y: 62, type: 'crane', craneIdx: 2 },
  // 出入口
  { name: '主出入口', x: 12, y: 80, type: 'gate' },
  { name: '次出入口', x: 88, y: 74, type: 'gate' },
  // 环保设施
  { name: '洗车台', x: 22, y: 90, type: 'wash' },
  { name: '喷淋系统', x: 42, y: 90, type: 'spray' },
  { name: '扬尘监测', x: 62, y: 87, type: 'monitor' },
  // 功能区
  { name: '材料堆场', x: 88, y: 18, type: 'material' },
  { name: '钢筋加工棚', x: 88, y: 50, type: 'material' },
  { name: '办公区', x: 14, y: 14, type: 'office' },
  { name: '配电房', x: 12, y: 50, type: 'power' },
  // 在建主体（矩形区域的锚点，实际由 markArea 画框）
  { name: '主体结构', x: 48, y: 44, type: 'building' },
]

// 每类点位的颜色和说明
const legends = [
  { name: '塔吊', color: '#36e2ff', type: 'crane', desc: '起重设备' },
  { name: '在建主体', color: '#7c8cff', type: 'building', desc: '施工区域' },
  { name: '出入口', color: '#ffd166', type: 'gate', desc: '人员车辆通行' },
  { name: '环保设施', color: '#52c41a', type: 'wash', desc: '洗车/喷淋/监测' },
  { name: '功能区', color: '#9ecbff', type: 'material', desc: '堆场/办公/配电' },
]

const craneCount = computed(() => cranes.value.length)

// 预警点位数：塔吊 status=warning 的数量
const warnCount = computed(() => cranes.value.filter(c => c.status === 'warning').length)

// 最新 PM2.5
const latestPm25 = computed(() => (envs.value.length ? envs.value[envs.value.length - 1].pm25 : 0))

function statusText(s) {
  return { running: '运行', warning: '预警', stopped: '停机' }[s] || s
}

// ---- 场布图配置：用 scatter 散点图画点位 ----
// 为什么用 scatter 而不是 graph？
// graph 是"关系图"，主要用来画节点+连线（力导向布局），用直角坐标系时定位写法比较绕。
// 而 scatter 天生就在直角坐标系里按 value:[x,y] 定位，最省事，也方便加 markArea/markLine。
const mapOption = computed(() => {
  // 把点位按类型分组，每组一个 series（方便图例区分颜色）
  const groupBy = (type) => points.filter(p => p.type === type)

  // 通用 series 模板
  const mkSeries = (name, data, color, symbolSize = 22) => ({
    name,
    type: 'scatter',
    data,
    symbolSize,
    itemStyle: { color },
    label: {
      show: true,
      position: 'bottom',
      color: '#cfe8ff',
      fontSize: 11,
      formatter: (p) => p.name,
    },
  })

  // 塔吊单独处理：颜色跟真实状态走，标签显示载重
  const craneSeries = {
    name: '塔吊',
    type: 'scatter',
    // 载重信息挂在 value 第 3 位，供 label/tooltip 用
    data: groupBy('crane').map(p => {
      const c = cranes.value[p.craneIdx]
      return {
        name: p.name,
        value: [p.x, p.y],
        load: c ? c.load : 0,                  // 自定义字段，formatter 里能拿到
        symbolSize: 36,                        // 塔吊最重要，画最大
        itemStyle: {
          color: !c ? '#36e2ff'
            : c.status === 'warning' ? '#ff4d4f'
            : c.status === 'stopped' ? '#6b8db0'
            : '#36e2ff',
        },
        // 塔吊带涟漪光晕，突出警示感
        effect: { show: false },
      }
    }),
    symbolSize: (val, params) => params.data.symbolSize || 36,
    label: {
      show: true,
      position: 'bottom',
      color: '#cfe8ff',
      fontSize: 11,
      formatter: (p) => `${p.name}\n${p.data.load}t`,   // 名字 + 换行 + 载重
    },
    // 给塔吊加个外圈光晕（用 markPoint 不方便，改用 emphasis 放大）
    emphasis: { scale: 1.3 },
  }

  return {
    textStyle: { color: '#9ecbff' },

    tooltip: {
      formatter: (p) => {
        const typeName = {
          crane: '塔吊', building: '在建主体', gate: '出入口',
          wash: '洗车台', spray: '喷淋系统', monitor: '扬尘监测',
          material: '材料堆场', office: '办公区', power: '配电房',
        }[p.data.type] || ''
        if (p.data.type === 'crane') {
          const c = cranes.value[p.data.craneIdx]
          return `<b>${p.name}</b>（塔吊）<br/>载重：${c ? c.load : 0} 吨<br/>状态：${c ? statusText(c.status) : '—'}`
        }
        return `<b>${p.name}</b>${typeName ? '（' + typeName + '）' : ''}`
      },
    },

    // 隐藏坐标轴，只当定位网格用
    xAxis: { type: 'value', min: 0, max: 100, show: false },
    yAxis: { type: 'value', min: 0, max: 100, show: false, inverse: true },  // y 向下为正（俯视图）

    grid: { left: 30, right: 30, top: 30, bottom: 30 },

    // 图例放底部
    legend: {
      bottom: 0,
      textStyle: { color: '#9ecbff', fontSize: 12 },
      itemWidth: 12,
      itemHeight: 12,
    },

    series: [
      // ① 底图：在建主体用 markArea 画一块半透明区域，示意建筑轮廓
      {
        name: '在建主体',
        type: 'scatter',
        data: [],
        // z 设小一点，保证区域框画在点位下面
        z: 1,
        markArea: {
          silent: true,
          itemStyle: { color: 'rgba(124,140,255,.10)', borderColor: 'rgba(124,140,255,.45)', borderWidth: 1 },
          label: { show: true, color: '#7c8cff', fontSize: 13, position: 'insideTop' },
          // 区域范围：x 33~63、y 32~56（对应主体结构所在位置）
          data: [[{ name: '在建主体\n(±0.000 以上)', coord: [33, 32] }, { coord: [63, 56] }]],
        },
      },
      // ② 各类型点位
      craneSeries,
      mkSeries('出入口', groupBy('gate').map(p => ({ ...p, value: [p.x, p.y] })), '#ffd166'),
      mkSeries('环保设施', [...groupBy('wash'), ...groupBy('spray'), ...groupBy('monitor')]
        .map(p => ({ ...p, value: [p.x, p.y] })), '#52c41a'),
      mkSeries('功能区', [...groupBy('material'), ...groupBy('office'), ...groupBy('power')]
        .map(p => ({ ...p, value: [p.x, p.y] })), '#9ecbff'),
    ],
  }
})

onMounted(async () => {
  const [c, e] = await Promise.all([getCranes(), getEnvs()])
  cranes.value = c
  envs.value = e
  ready.value = true               // 标记加载完成，空状态遮罩消失
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
.stat-card.crane .v { color: #36e2ff; }
.stat-card.warn .v { color: #ff4d4f; }
.stat-card.env .v { color: #52c41a; }

/* 左图右栏布局 */
.layout { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; height: 560px; }
.map-wrap { height: 100%; min-height: 480px; }
.side { display: flex; flex-direction: column; gap: 16px; }

/* 塔吊状态列表 */
.crane-list { list-style: none; margin: 0; padding: 0; }
.crane-list li {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 4px; font-size: 14px;
  border-bottom: 1px solid rgba(45,120,200,.18);
}
.crane-list .dot { width: 8px; height: 8px; border-radius: 50%; background: #36e2ff; flex-shrink: 0; }
.crane-list li.warning .dot { background: #ff4d4f; }
.crane-list li.stopped .dot { background: #6b8db0; }
.crane-list .nm { flex: 1; }
.crane-list .ld { color: #36e2ff; font-variant-numeric: tabular-nums; }
.crane-list .st { color: #9ecbff; font-size: 12px; width: 32px; text-align: right; }
.crane-list li.warning .st { color: #ff4d4f; }

/* 图例 */
.legend { list-style: none; margin: 0; padding: 0; }
.legend li {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 4px; font-size: 13px;
  border-bottom: 1px solid rgba(45,120,200,.18);
}
.legend .swatch { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
.legend .nm { color: #cfe8ff; width: 66px; }
.legend .desc { color: #6b8db0; font-size: 12px; }
</style>
