import { isObject } from "@vue/shared";
import { mutableHandlers,  } from "./baseHandler";
import { ReactiveFlags } from "./constants";



export function reactive(target) {
    // 调用创建响应式对象方法 统一处理
    return createReactiveObject(target)
}

// 缓存 对象 与其 代理对象 的映射
// 用于 避免重复创建代理对象
const reactiveMap =new WeakMap()

// 创建响应式对象方法
function createReactiveObject(target){
    // * * *
    // 判断当前是否为对象
    // 若不是对象 直接返回 不做响应式
    // 例：reactive(123) => 123
    if (!isObject(target)) {
        return target
    }

    // 判断当前对象是否为代理对象
    // 普通对象一定为null 而代理对象则会进入get回调函数内
    // 此时可以在get回调函数内 处理相关逻辑
    if (target[ReactiveFlags.IS_REACTIVE]) {
        // 若当前对象为代理对象
        // 则直接返回  不必再做代理
        return target
    }

    // 判断当前对象 是否已经代理过
    // 即：判断当前对象是否在reactiveMap缓存过
    const exitsProxy = reactiveMap.get(target)
    if (exitsProxy) {
        // 若缓存过
        // 返回其代理对象
        return exitsProxy
    }

    // 若是对象 则对其做代理
    // 普通对象 => 代理对象
    // target：目标对象 mutableHandlers：代理逻辑
    let proxy = new Proxy(target,mutableHandlers)

    // 代理完成后 
    // 将当前对象 及其 代理 缓存
    reactiveMap.set(target,proxy)

    return proxy
}

// 将对象转换成响应式对象的方法
export function toReactive(obj) {
    return isObject(obj)? reactive(obj) : obj
}
