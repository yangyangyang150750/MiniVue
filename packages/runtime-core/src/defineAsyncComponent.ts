import { ref } from "@vue/reactivity"
import { h } from "./h"
import { isFunction } from "@vue/shared"

export const defineAsyncComponent =(options)=>{

    // 判断是函数式还是对象式
    if (isFunction(options)) {
        // 若为函数式
        // 将其改造为对象式
        options = {loader:options}
    }

    return {
        
        setup(){
            // 解构
            const {loader,timeout,errorComponent,delay,loadingComponent,onError}=options
            // 标记当前是否加载完成
            const loaded = ref(false)
            // 标记是否出现错误
            const error = ref(false)
            // 标记loading
            const loading = ref(false)
            // 获取loaded函数返回结果
            // 结果为真正渲染的组件
            let Comp =null
            // 保存loading的定时器
            let loadingTimer=null

            // 创建定时器
            if (timeout) {
                setTimeout(() => {
                    error.value=true
                    throw new Error('组件加载失败！！')
                }, timeout);
            }

            if (delay) {
                loadingTimer=setTimeout(() => {
                    loading.value=true
                }, delay);
            }

            // 保存请求次数
            let attempts = 0
            function loadFunc() {
                return loader().catch((err)=>{
                    // 若执行失败
                    // 判断是否有onError
                    if (onError) {
                        // 若有
                        return new Promise((resolve,reject)=>{
                            // 创建retry 和 fail 方法
                            const retry = ()=>resolve(loadFunc()) //递归
                            const fail =()=>reject(err)
                            onError(err,retry,fail,++attempts)
                        })
                    }else{
                        // 若没有
                        throw err // 将错误传递
                    }   
                })
            }

            loadFunc()
            .then((comp)=>{
                // 赋值
                Comp = comp
                // 更新加载标记
                loaded.value=true
            })
            .catch((err)=>{
                error.value=err
            }).finally(()=>{
                loading.value=false
                clearTimeout(loadingTimer)
            })

            

            let placeholder = h('div')

            return ()=>{
                if(loaded.value) {
                    // 若加载成功
                    return h(Comp)
                }else if(error.value&&errorComponent){
                    // 若加载失败
                    return h(errorComponent)
                }else if(loading.value && loadingComponent){
                    // 若正在加载中
                    return h(loadingComponent)
                }else {
                    return placeholder
                }
            }
        }
    }
}