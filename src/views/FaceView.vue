<template>
  <div class="page">
    <h1>人脸实名制</h1>

    <!-- ① 统计 -->
    <div class="stats">
      <div class="stat-card"><div class="v">{{ face.registered || 0 }}</div><div class="l">实名登记人数</div></div>
      <div class="stat-card ok"><div class="v">{{ face.total_passed || 0 }}</div><div class="l">今日识别通过</div></div>
      <div class="stat-card bad"><div class="v">{{ face.total_denied || 0 }}</div><div class="l">今日拦截</div></div>
      <div class="stat-card"><div class="v">{{ gates.length }}</div><div class="l">闸机数量</div></div>
    </div>

    <!-- ② 占位提示 -->
    <div class="notice">
      <span class="ico">i</span>
      当前为<strong>占位模块</strong>：真实项目需接入人脸闸机 SDK 与公安实名制平台。接口 <code>/api/face/</code> 已预留。
    </div>

    <div class="layout">
      <!-- ③ 左侧：识别模拟区（用 CSS 画人脸框） -->
      <PanelBox title="识别画面示意">
        <div class="face-view">
          <!-- 模拟人像轮廓 -->
          <div class="avatar">
            <div class="head"></div>
            <div class="body"></div>
          </div>

          <!-- 人脸识别框：四角 + 扫描线 -->
          <div class="face-box">
            <span class="corner tl"></span>
            <span class="corner tr"></span>
            <span class="corner bl"></span>
            <span class="corner br"></span>
            <div class="scan"></div>
            <div class="match">识别通过 98.6%</div>
          </div>

          <div class="face-tip">人脸识别占位 · 接入闸机 SDK 后显示实时画面</div>
        </div>
      </PanelBox>

      <!-- ④ 右侧：闸机统计 -->
      <aside class="side">
        <PanelBox title="闸机统计">
          <ul class="gate-list">
            <li v-for="g in gates" :key="g.id">
              <div class="gate-head">
                <span class="nm">{{ g.name }}</span>
                <span class="pass-rate">通过率 {{ passRate(g) }}%</span>
              </div>
              <!-- 通过/拦截的堆叠条 -->
              <div class="stack">
                <div class="passed" :style="{ width: barWidth(g) + '%' }"></div>
                <div class="denied" :style="{ width: deniedWidth(g) + '%' }"></div>
              </div>
              <div class="gate-nums">
                <span class="p">通过 {{ g.passed }}</span>
                <span class="d">拦截 {{ g.denied }}</span>
              </div>
            </li>
          </ul>
          <p class="api-hint">接口：GET /api/face/</p>
        </PanelBox>

        <PanelBox title="功能说明">
          <p class="desc">{{ face.note }}</p>
          <ul class="steps">
            <li>① 工人实名登记 + 人脸采集</li>
            <li>② 闸机刷脸比对，通过才放行</li>
            <li>③ 未登记/黑名单自动拦截</li>
            <li>④ 考勤数据回传，与在场人数联动</li>
          </ul>
        </PanelBox>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getFace } from '../api'
import PanelBox from '../components/PanelBox.vue'

const face = ref({})          // 人脸模块统计

const gates = computed(() => face.value.gates || [])

// 通过率百分比（防除零）
function passRate(g) {
  const total = g.passed + g.denied
  if (!total) return 0
  return ((g.passed / total) * 100).toFixed(1)
}

// 堆叠条的宽度：按通过数和拦截数的比例分配
// 用两台闸机里的最大总数当基准，保证两条宽度可比
const maxTotal = computed(() => {
  return Math.max(...gates.value.map(g => g.passed + g.denied), 1)
})
function barWidth(g) {
  return (g.passed / maxTotal.value) * 100
}
function deniedWidth(g) {
  return (g.denied / maxTotal.value) * 100
}

onMounted(async () => {
  face.value = await getFace()
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
.stat-card.ok .v { color: #52c41a; }
.stat-card.bad .v { color: #ff4d4f; }

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

.layout { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; height: 540px; }
.side { display: flex; flex-direction: column; gap: 16px; }

/* 识别画面区 */
.face-view {
  position: relative; height: 100%; min-height: 440px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px; overflow: hidden;
  background: radial-gradient(circle at 50% 45%, #0d2a4a 0%, #061426 72%);
}

/* 模拟人像：用两个圆角块拼出头和身体 */
.avatar { position: relative; display: flex; flex-direction: column; align-items: center; }
.avatar .head {
  width: 74px; height: 88px; border-radius: 50% 50% 45% 45%;
  background: rgba(54,226,255,.12);
  border: 1px solid rgba(54,226,255,.25);
}
.avatar .body {
  width: 140px; height: 90px; margin-top: 6px;
  border-radius: 60px 60px 0 0;
  background: rgba(54,226,255,.10);
  border: 1px solid rgba(54,226,255,.2);
}

/* 人脸识别框 */
.face-box {
  position: absolute; left: 50%; top: 34%;
  transform: translate(-50%, -50%);
  width: 118px; height: 140px;
}
/* 四个角标 */
.corner { position: absolute; width: 18px; height: 18px; border-color: #36e2ff; border-style: solid; border-width: 0; }
.corner.tl { left: 0; top: 0; border-left-width: 2px; border-top-width: 2px; }
.corner.tr { right: 0; top: 0; border-right-width: 2px; border-top-width: 2px; }
.corner.bl { left: 0; bottom: 0; border-left-width: 2px; border-bottom-width: 2px; }
.corner.br { right: 0; bottom: 0; border-right-width: 2px; border-bottom-width: 2px; }

/* 上下扫描的识别线 */
.scan {
  position: absolute; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, #36e2ff, transparent);
  box-shadow: 0 0 8px rgba(54,226,255,.8);
  animation: facescan 2.4s ease-in-out infinite;
}
@keyframes facescan {
  0%, 100% { top: 0; }
  50%      { top: calc(100% - 2px); }
}

/* 识别结果标签 */
.match {
  position: absolute; left: 50%; bottom: -28px; transform: translateX(-50%);
  padding: 3px 10px; border-radius: 3px; white-space: nowrap;
  font-size: 12px; background: rgba(82,196,26,.2); color: #52c41a;
  border: 1px solid rgba(82,196,26,.5);
}

.face-tip {
  position: absolute; left: 0; right: 0; bottom: 12px;
  text-align: center; font-size: 12px; color: #6b8db0;
}

/* 闸机列表 */
.gate-list { list-style: none; margin: 0; padding: 0; }
.gate-list li {
  padding: 12px 4px;
  border-bottom: 1px solid rgba(45,120,200,.18);
}
.gate-head { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
.gate-head .nm { color: #cfe8ff; }
.gate-head .pass-rate { color: #36e2ff; }

/* 通过/拦截堆叠条 */
.stack {
  display: flex; height: 8px; border-radius: 4px; overflow: hidden;
  background: rgba(45,120,200,.2); margin-bottom: 6px;
}
.stack .passed { background: linear-gradient(90deg, #52c41a, #389e0d); }
.stack .denied { background: #ff4d4f; }

.gate-nums { display: flex; gap: 14px; font-size: 12px; }
.gate-nums .p { color: #52c41a; }
.gate-nums .d { color: #ff4d4f; }

.api-hint { margin: 12px 0 0; font-size: 12px; color: #6b8db0; font-family: monospace; }

.desc { margin: 0 0 10px; font-size: 13px; color: #9ecbff; line-height: 1.7; }
.steps { margin: 0; padding-left: 0; list-style: none; }
.steps li { font-size: 12px; color: #6b8db0; line-height: 2; }
</style>
