<template>
  <div class="page">
    <h1>视频监控</h1>

    <!-- ① 统计 -->
    <div class="stats">
      <div class="stat-card"><div class="v">{{ cameras.length }}</div><div class="l">摄像头总数</div></div>
      <div class="stat-card on"><div class="v">{{ onlineCount }}</div><div class="l">在线</div></div>
      <div class="stat-card off"><div class="v">{{ offlineCount }}</div><div class="l">离线</div></div>
      <div class="stat-card"><div class="v">{{ onlineRate }}%</div><div class="l">在线率</div></div>
    </div>

    <!-- ② 占位提示条：说明这是预留模块 -->
    <div class="notice">
      <span class="ico">i</span>
      当前为<strong>占位模块</strong>：真实项目需接入 RTSP / GB28181 视频流。接口 <code>/api/cameras/</code> 已预留。
    </div>

    <!-- ③ 监控画面网格（4 格主画面 + 列表） -->
    <div class="layout">
      <!-- 左侧：2x2 大画面 -->
      <div class="wall">
        <!-- 只取前 4 个在线设备上墙 -->
        <div v-for="c in wallCameras" :key="c.id" class="screen" :class="{ offline: !c.online }">
          <!-- 画面内容：用 CSS 模拟监控画面的视觉 -->
          <div class="filler">
            <div class="scanline"></div>
            <div class="cam-icon">◉</div>
            <div class="filler-text">视频信号占位</div>
            <div class="res">1920 × 1080 · 25fps</div>
          </div>

          <!-- 左上角：名称 + 区域 -->
          <div class="osd-top">
            <span class="nm">{{ c.name }}</span>
            <span class="ar">{{ c.area }}</span>
          </div>

          <!-- 右上角：在线/离线角标 -->
          <div class="osd-badge" :class="c.online ? 'on' : 'off'">
            <span class="dot"></span>{{ c.online ? '在线' : '离线' }}
          </div>

          <!-- 右下角：时间戳 -->
          <div class="osd-time">{{ clock }}</div>
        </div>
      </div>

      <!-- 右侧：设备列表 -->
      <aside class="side">
        <PanelBox title="设备清单">
          <ul class="cam-list">
            <li v-for="c in cameras" :key="c.id" :class="{ off: !c.online }">
              <span class="dot"></span>
              <span class="nm">{{ c.name }}</span>
              <span class="ar">{{ c.area }}</span>
              <span class="st">{{ c.online ? '在线' : '离线' }}</span>
            </li>
          </ul>
          <p class="api-hint">接口：GET /api/cameras/</p>
        </PanelBox>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getCameras } from '../api'
import PanelBox from '../components/PanelBox.vue'

const cameras = ref([])        // 摄像头列表
const clock = ref('')          // 画面上的时间戳

const onlineCount = computed(() => cameras.value.filter(c => c.online).length)
const offlineCount = computed(() => cameras.value.filter(c => !c.online).length)

// 在线率（防除零）
const onlineRate = computed(() => {
  if (!cameras.value.length) return 0
  return ((onlineCount.value / cameras.value.length) * 100).toFixed(0)
})

// 上墙画面：取前 4 个（真实项目里通常是选定的几个关键点位）
const wallCameras = computed(() => cameras.value.slice(0, 4))

// 时钟：每秒更新，模拟监控画面的时间戳
function tick() {
  clock.value = new Date().toLocaleString('zh-CN', { hour12: false })
}

let timer = null

onMounted(async () => {
  cameras.value = await getCameras()
  tick()
  timer = setInterval(tick, 1000)
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
.stat-card.on .v { color: #52c41a; }
.stat-card.off .v { color: #ff4d4f; }

/* 占位提示条 */
.notice {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; margin-bottom: 16px; font-size: 13px;
  background: rgba(54,226,255,.08);
  border: 1px solid rgba(54,226,255,.3);
  border-left: 3px solid #36e2ff;
  border-radius: 4px; color: #9ecbff;
}
.notice strong { color: #36e2ff; }
.notice code {
  background: rgba(0,0,0,.35); padding: 1px 6px;
  border-radius: 3px; color: #ffd166; font-size: 12px;
}
.notice .ico {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 50%;
  background: #36e2ff; color: #06121f; font-size: 11px;
  font-weight: bold; font-style: italic; flex-shrink: 0;
}

.layout { display: grid; grid-template-columns: 2.2fr 1fr; gap: 16px; }

/* 2x2 画面墙 */
.wall { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.screen {
  position: relative; height: 230px; border-radius: 6px; overflow: hidden;
  background: linear-gradient(135deg, #0d2137 0%, #061426 100%);
  border: 1px solid rgba(54,226,255,.35);
}
.screen.offline { border-color: rgba(107,141,176,.35); }

/* 模拟监控画面：居中的图标+文字 */
.filler {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px;
}
.cam-icon { font-size: 34px; color: rgba(54,226,255,.35); }
.filler-text { font-size: 13px; color: rgba(158,203,255,.55); }
.res { font-size: 11px; color: rgba(107,141,176,.6); font-variant-numeric: tabular-nums; }

/* 扫描线动画：让画面有"在直播"的感觉 */
.scanline {
  position: absolute; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(54,226,255,.5), transparent);
  animation: scan 4s linear infinite;
}
@keyframes scan {
  0%   { top: 0; }
  100% { top: 100%; }
}
/* 离线设备停止动画并整体变暗 */
.screen.offline .scanline { animation: none; opacity: 0; }
.screen.offline .cam-icon { color: rgba(107,141,176,.35); }

/* 画面上的 OSD 文字（模拟监控的时间/名称叠加层） */
.osd-top {
  position: absolute; left: 10px; top: 8px;
  display: flex; align-items: center; gap: 6px; font-size: 12px;
}
.osd-top .nm { color: #cfe8ff; }
.osd-top .ar { color: #6b8db0; }

.osd-badge {
  position: absolute; right: 10px; top: 8px;
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; padding: 1px 7px; border-radius: 3px;
}
.osd-badge.on { background: rgba(82,196,26,.2); color: #52c41a; }
.osd-badge.off { background: rgba(255,77,79,.2); color: #ff4d4f; }
.osd-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.osd-time {
  position: absolute; right: 10px; bottom: 8px;
  font-size: 11px; color: rgba(158,203,255,.7);
  font-variant-numeric: tabular-nums;
}

/* 设备清单 */
.cam-list { list-style: none; margin: 0; padding: 0; }
.cam-list li {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 4px; font-size: 13px;
  border-bottom: 1px solid rgba(45,120,200,.18);
}
.cam-list li.off { opacity: .55; }
.cam-list .dot { width: 7px; height: 7px; border-radius: 50%; background: #52c41a; flex-shrink: 0; }
.cam-list li.off .dot { background: #ff4d4f; }
.cam-list .nm { flex: 1; color: #cfe8ff; }
.cam-list .ar { color: #6b8db0; font-size: 12px; }
.cam-list .st { width: 30px; text-align: right; font-size: 12px; color: #52c41a; }
.cam-list li.off .st { color: #ff4d4f; }

.api-hint { margin: 12px 0 0; font-size: 12px; color: #6b8db0; font-family: monospace; }
</style>
