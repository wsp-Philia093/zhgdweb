import { defineStore } from 'pinia'      // Pinia 的核心：定义仓库的函数
import { ref, computed } from 'vue'       // 组合式 API
import { getAlarms, markAlarmHandled } from '../api'   // 复用第 1 节封装的接口

// defineStore 第一个参数是"仓库的唯一名字"（全局不能重名），第二个是 setup 函数
export const useAlarmStore = defineStore('alarm', () => {

  // ---------- state：仓库里存的数据 ----------
  const list = ref([])        // 报警列表（所有页面共享这一份）
  const loading = ref(false)  // 是否正在加载（用来显示 loading 状态）

  // 筛选条件放在 store 里，这样切页面回来筛选状态还在
  const filterLevel = ref('')       // 级别：'' = 全部
  const filterType = ref('')        // 类型：'' = 全部
  const filterHandled = ref('')     // 处理状态：'' / 'false'（只看未处理）

  // ---------- getters：从 state 算出来的派生数据 ----------
  // computed 在这里等价于 Pinia 的 getter，用起来和普通 ref 一样
  const total = computed(() => list.value.length)                                  // 总数
  const urgentCount = computed(() => list.value.filter(a => a.level === 'urgent').length)      // 紧急数
  const unhandledCount = computed(() => list.value.filter(a => !a.is_handled).length)          // 待处理数

  // ---------- actions：能改 state 的方法 ----------

  // 拉取数据（自动带上当前筛选条件）
  async function fetchAlarms() {
    loading.value = true                       // 开始加载
    const params = {}                          // 组装筛选参数
    if (filterLevel.value) params.level = filterLevel.value        // 有选级别才传
    if (filterType.value) params.type = filterType.value           // 有选类型才传
    if (filterHandled.value) params.is_handled = filterHandled.value  // 'false' 代表只看未处理
    try {
      list.value = await getAlarms(params)     // 响应拦截器已返回 data
    } finally {
      loading.value = false                    // 不管成功失败都结束 loading
    }
  }

  // 处理单条报警
  async function handleOne(id) {
    await markAlarmHandled(id)                 // 调后端写回
    await fetchAlarms()                        // 重新拉取，让列表反映最新状态
  }

  // 批量处理多条报警（前端循环调用，真实项目可改成后端批量接口）
  async function handleMany(ids) {
    for (const id of ids) {                    // 逐条处理
      await markAlarmHandled(id)
    }
    await fetchAlarms()                        // 全部处理完再刷新一次
  }

  // 重置筛选条件
  function resetFilters() {
    filterLevel.value = ''
    filterType.value = ''
    filterHandled.value = ''
  }

  // ---------- 对外暴露 ----------
  // 只有 return 出去的才能在组件里用
  return {
    list, loading,
    filterLevel, filterType, filterHandled,
    total, urgentCount, unhandledCount,
    fetchAlarms, handleOne, handleMany, resetFilters,
  }
})
