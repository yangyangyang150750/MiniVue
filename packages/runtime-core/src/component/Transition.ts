import { h } from "../h"


const nextFrame=(fn)=>{
    requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
            fn
        })
    })
}
// 处理属性方法
export function resolveTransitionProps(props) {
    // 解构属性
    const {
        name='v',
        enterFromClass =`${name}-enter-from`,
        enterActiveClass =`${name}-enter-active`,
        enterToClass =`${name}-enter-to`,
        leaveFromClass=`${name}-leave-from`,
        leaveActiveClass=`${name}-leave-active`,
        leaveToClass=`${name}-leave-to`,
        onBeforeEnter,
        onEnter,
        onLeave,
    }=props

    return {
        onBeforeEnter(el){
            // 执行内置方法
            onBeforeEnter&& onBeforeEnter()
            // 添加类
            el.classList.add(enterFromClass)
            el.classList.add(enterActiveClass)
        },
        onEnter(el,done){
            const resolve = ()=>{
                // 移除类名
                // 移除类
                el.classList.remove(enterFromClass)
                el.classList.remove(enterActiveClass)
                // 调用done方法
                done && done()
            }
            // 执行内置方法
            onEnter&& onEnter(el,resolve)

            // 去除类
            // 保证其不在同一帧执行
            nextFrame(()=>{ // 保证动画的产生
                // 移除类
                el.classList.remove(enterFromClass)
                // 添加类
                el.classList.add(enterToClass)

                // 若用户未提供onEnter方法
                // 或未提供done参数
                if (!onEnter || onEnter.length<=1) {
                    // 添加过渡结束事件
                    el.addEventListener('transitionEnd',resolve)
                }
            })
        },
        onLeave(el,done){
            const resolve = ()=>{
                // 移除类名
                // 移除类
                el.classList.remove(enterFromClass)
                el.classList.remove(enterActiveClass)
                // 调用done方法
                done && done()
            }
            // 执行内置方法
            onEnter&& onEnter(el,resolve)
            // 添加类
            el.classList.add(leaveFromClass)
            // 让页面重绘
            document.body.offsetHeight
            el.classList.add(leaveActiveClass)

            nextFrame(()=>{
                el.classList.remove(leaveFromClass)
                el.classList.add(leaveToClass)

                // 若用户未提供onEnter方法
                // 或未提供done参数
                if (!onEnter || onEnter.length<=1) {
                    // 添加过渡结束事件
                    el.addEventListener('transitionEnd',resolve)
                }
            })
        }
    }
}
export function Transition(props,{slots}) {
        return h(BaseTransitionImpl,resolveTransitionProps(props),slots)
}

// 真正的组件
// 此时只需要渲染时 调用对应钩子即可
const BaseTransitionImpl ={
    props:{
        onBeforeEnter:Function,
        onEnter:Function,
        onLeave:Function,
    },
    setup(props,{slots}){
        return ()=>{
            const vnode =slots.default && slots.default()
            if (!vnode) {
                return
            }
            vnode.transition = {
                beforeEnter:props.onBeforeEnter,
                onEnter:props.onEnter,
                leave:props.onLeave
            }
            return vnode
        }
    }
}