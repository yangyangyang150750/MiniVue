import { isObject } from "@vue/shared";
import { activeEffect } from "./effect";
import { track, trigger } from "./reactiveEffect";
import { reactive } from "./reactive";
import { ReactiveFlags } from "./constants";


// 代理逻辑
export const mutableHandlers:ProxyHandler<any>= {
    // 读取对象属性时的回调方法
    get(target,key,receiver){    //receiver 指向代理后的对象
        if (key ===ReactiveFlags.IS_REACTIVE ) {
            return true
        }

        // 依赖收集
        track(target,key)
          
        // Reflect作用 => 用于修改this指向
        // 若target[key] 是一个getter函数
        // 可以让其中的this 指向receiver
        let res = Reflect.get(target,key,receiver)

        // 实现递归代理
        if (isObject(res)) {
            res=reactive(res)
        }
        return res
    },
    // 设置对象属性时的回调方法
    set(target,key,value,receiver){     //receiver 指向代理后的对象

        // 1、获取旧值
        let oldValue = target[key]

        // Reflect作用 => 用于修改this指向
        // 若target[key] 是一个setter函数
        // 可以让其中的this 指向receiver
        let result=Reflect.set(target,key,value,receiver)

        // 2、判断是否发生修改 即新旧值是否相同
        if (oldValue !== value) {
            // 若发生修改
            // 触发依赖更新
            trigger(target,key,value,oldValue)
        }
        
        
        return result
    }
}