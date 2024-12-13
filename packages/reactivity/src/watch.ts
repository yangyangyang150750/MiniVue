import { isFunction, isObject,isReactive } from "@vue/shared"
import { ReactiveEffect } from "./effect"
import { isRef } from "./ref"

// watch方法
export function watch(source,callBack,options={} as any) {
    // source => 被监控对象
    // callBack => 被监控对象改变时的回调
    // options => 配置对象 默认为空对象

    // watch方法本质上也是一个effect
    // 将source维护成一个取值器getter 内部值变化时，触发callBack回调
    // 类似于 new ReactiveEffect(getter,scheduler)

    // 返回一个封装的doWatch方法
    // 便于后续实现watchEffect(也是基于doWatch实现)
    return doWatch(source,callBack,options)

}

// watchEffect方法
export function watchEffect(source,options={} as any) {
    // source => 被监控对象
    // options => 配置对象 默认为空对象

    // watchEffect方法本质上也是一个effect
    // 类似于 new ReactiveEffect(getter,getter)

    // 返回一个封装的doWatch方法
    return doWatch(source,null,options) //watchEffect方法没有回调参数
}

// 遍历方法
function traverse(source,depth,currentDepth=0,seen=new Set()){
    // 判断是否为对象
    if (!isObject(source)) {
        // 如果不是对象 无需遍历
        return source
    }

    // 判断是否为深度监视
    if (depth) {
        // 若不是深度监视
        if (currentDepth>=depth) {
            // 当前遍历深度达到指定深度时 不再遍历
            return source
        }
        currentDepth++
    }

    // 判断是否遍历过此对象
    // 用于避免循环遍历
    if (seen.has(source)) {
        // 若遍历过
        // 直接返回
        return source
    }

    // 递归遍历
    for (const key in source) {
        traverse(source[key],depth,currentDepth,seen)
    }
}

// doWatch方法
function doWatch(source,callBack,{deep,immediate}) {
    // 因为watch方法本质上也是effect 所以我们也需要创建ReactiveEffect
    // 为此我们需要创建 getter和scheduler

    // 1、创建getter
    // 为了实现将source内的属性与所在effect绑定
    // => getter方法需要遍历当前source

    const reactiveGetter = (source)=>traverse(source,deep===false?1:undefined)
    // 产生一个可以给ReactiveEffect使用的getter
    // 能够读取source内的属性 从而与所在effect绑定
    let getter 
    // 判断当前对象类型
    if (isReactive(source)) {
        // 若是响应式对象 
        getter = ()=>reactiveGetter(source) //递归遍历此对象
    }else if (isRef(source)) {
        // 若是ref对象
        getter = ()=>source.value   // 访问.value
    }else if (isFunction(source)) {
        // 若是函数
        getter = source     //当前source就是setter
    }

    // 将用户传入的函数包裹
    let clean ;
    // 创建onCleanup方法
    function onCleanup(fn) {
        // fn为用户传入的函数
        clean = ()=>{
            // 1、执行fn
            fn()
            // 2、清除自身
            clean=undefined
        }
    }
    // 2、创建scheduler
    let oldValue
    let scheduler = ()=>{
        // 判断是否有回调
        // 用于方便是watch 还是 watchEffect
        if (callBack) {
            // 执行effect => 执行getter方法 获取新值
            const newValue = effect.run()
            // 判断是否存在清理函数
            if (clean) {
                // 若存在
                // 调用清理函数
                clean() // 执行回调前 执行上一次的清理操作
            }
            // 调用用户传入的回调方法
            callBack(oldValue,newValue,onCleanup)
            // 更新旧值
            oldValue=newValue
        }else{
            // watchEffect的逻辑
            // 执行effect => 执行getter方法
            effect.run()
        }
    }

    // 创建effect
    let effect =new ReactiveEffect(getter,scheduler)

    
    // 判断是否传入callBack
    // 即 判断是watch 还是 watchEffect
    if (callBack) {
        // 若有callBack
        // 则为watch

        // 判断是否传入immediate属性
        if (immediate) {
            // 若有immediate
            // 计算属性effect的回调立即执行一次
            scheduler()
        } else {
            // 若没有immediate
            // 调用getter方法 获取旧值
            oldValue =effect.run()
        }
    }else{
        // watchEffect
        effect.run()
    }

    // 添加stop方法
    const unwatch = ()=>{
        effect.stop()
    }

    return unwatch
}