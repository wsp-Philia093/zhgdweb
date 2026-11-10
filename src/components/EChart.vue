<template>
  <!-- 外层容器：负责铺满父级，并在"空状态"时盖住画布 -->
  <div class="chart-shell">
    <!-- echarts 的画布：占满容器 -->
    <div ref="chartEl" class="chart" :class="{ hidden: empty }"></div>

    <!-- 空状态遮罩：没有数据时显示，避免出现"空白图表"让人误以为是 bug -->
    <div v-if="empty" class="empty">
      <div class="empty-ico">◌</div>
      <div class="empty-text">{{ emptyText }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  option: { type: Object, required: true },
  // 是否为空数据状态：父组件传 true 就显示"暂无数据"遮罩
  empty: { type: Boolean, default: false },
  // 空状态提示文案，可以按页面定制
  emptyText: { type: String, default: '暂无数据' },
})

const chartEl = ref(null)
let chart = null

function initChart() {
  if (!chartEl.value) return
  chart = echarts.init(chartEl.value)
  chart.setOption(props.option)
}

function resize() {
  chart && chart.resize()
}

onMounted(async () => {
  await nextTick()                        // 等 DOM 挂载完，否则 ref 是 null
  initChart()
  // ResizeObserver 监听容器尺寸，比 window.resize 更精准
  ro = new ResizeObserver(resize)
  ro.observe(chartEl.value)
})

watch(
  () => props.option,
  (newOpt) => {
    if (!chart) { initChart(); return }
    chart.setOption(newOpt, true)         // true = 整体替换，避免脏数据残留
  },
  { deep: true }
)

// ★ 从"空"变"有数据"时，画布还是 display:none 状态，尺寸算不对，
// 必须等 DOM 更新后手动 resize 一次，否则图表会画成 0 宽
watch(
  () => props.empty,
  async (isEmpty) => {
    if (!isEmpty) {
      await nextTick()
      resize()
    }
  }
)

let ro = null

onUnmounted(() => {
  ro && ro.disconnect()
  chart && chart.dispose()
  chart = null
})
</script>

<style scoped>
.chart-shell { position: relative; width: 100%; height: 100%; }

.chart {
  width: 100%;
  height: 100%;
  min-height: 160px;
}
/* 空状态下把画布藏起来（不是删掉，保留实例，有数据时能立刻复用） */
.chart.hidden { visibility: hidden; }

/* 空状态 */
.empty {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 8px;
  color: #4a6b8f;
  background: rgba(6,18,31,.35);
  border-radius: 4px;
}
.empty-ico { font-size: 30px; opacity: .6; }
.empty-text { font-size: 13px; }
</style>
