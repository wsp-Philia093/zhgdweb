// ============================================================
// 统一请求层：整个项目所有对后端的请求，都从这里出发
// 好处：① 后端地址只写一处，换环境改这里就行
//       ② 请求/响应能统一加处理（比如统一提示错误）
//       ③ 页面里不用再写一长串 URL
// ============================================================
import axios from 'axios'   // 导入 axios 库

// 创建 axios 实例：相当于"定制一条专用通道"，而不是用全局默认的 axios
const request = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',   // 所有请求的公共前缀，后面只写 '/cranes/' 即可
  timeout: 10000,                          // 超时时间 10 秒（毫秒），超了自动报错，避免一直卡着
})

// ---- 请求拦截器：发出去之前，先做点什么 ----
// 以后要加登录 token，就在这里塞进请求头，所有接口自动带上
request.interceptors.request.use(
  (config) => {                       // config 是这次请求的配置对象
    // 这里暂时什么都不做，只把配置原样放行
    // 将来可写：config.headers.Authorization = 'Bearer ' + token
    return config                     // 必须 return，否则请求发不出去
  },
  (error) => Promise.reject(error)    // 出错就把错误继续抛给调用方
)

// ---- 响应拦截器：拿到后端返回后，先做点什么 ----
request.interceptors.response.use(
  (response) => {
    // 默认情况下 response.data 才是后端真正的 JSON，直接返回它更省事
    return response.data
  },
  (error) => {
    // 统一打印错误，方便排错（真实项目里可以换成弹窗提示）
    console.error('[请求出错]', error?.config?.url, error?.message)
    return Promise.reject(error)      // 继续抛出，让调用方自己决定怎么处理
  }
)

export default request   // 导出这个实例，别的文件 import 就能用
