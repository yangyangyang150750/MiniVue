import { activeEffect, effect, trackEffect, triggerEffects } from "./effect";

// 创建映射表
const targetMap = new WeakMap()
// 映射表的结构
// targetMap:WeakMap{
    // Key:target1 => Value:Map{
        // Key:key1 => Value:Map{
            // effect1,effect2...
        // },
        // Key:key2 => Value:Map{
            // effect1,effect2...
        // }
    // },
    // Key:target2 => Value:Map{
        // Key:key1 => Value:Map{
            // effect1,effect2...
        // },
        // Key:key2 => Value:Map{
            // effect1,effect2...
        // }
    // },
    // ...
// }

// 创建依赖表函数
export const createDep = (cleanup)=>{
    let dep:any =  new Map()
    // 给当前属性对应的依赖表 绑定cleanup属性
    dep.cleanup = cleanup
    return dep
}

// 依赖收集
export function track(target,key) {
    // 先判断是否是在effect中读取此属性
    // 只有在effect中读取此属性 才会进行依赖收集
    if (activeEffect) {
        // 1、查看当前对象是否已经缓存
        let desMap =targetMap.get(target)   
        // 1-1 若未缓存 则添加缓存
        if (!desMap) {
            // 添加缓存
            targetMap.set(target,(desMap=new Map()))
        }

        // 2、查看当前属性是否缓存过
        let dep = desMap.get(key)
        // 2-1 若未缓存 则添加缓存
        if (!dep) {
            desMap.set(key,(dep = createDep(()=>desMap.delete(key)))) //后面用于清除不需要的属性
        }

        // 将当前effect 加入 此属性中
        // 依赖收集
        trackEffect(activeEffect,dep)
    }
}

// 触发依赖
export function trigger(target,key,newValue,oldValue) {
    // 1、判断当前对象是否与effect存在映射
    // 即 判断当前对象是否存于映射表中
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        // 若当前对象不在映射表中 说明不存在映射
        // 没有对应依赖 直接返回
        return
    }

    // 2、判断当前对象的key属性是否与effect存在映射
    // 即 判断当前对象的key属性是否在desMap中
    let dep = depsMap.get(key)
    if (dep) {
        // 若在desMap中
        // 此时dep中 即为当前属性依赖的effect
        // 调用激活依赖方法
        triggerEffects(dep)
    }
}