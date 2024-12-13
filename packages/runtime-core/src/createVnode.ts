import { isFunction, isObject, isString, ShapeFlags } from "@vue/shared"
import { isTeleport } from "./component/Teleport"

// 创建文本类型
export const Text=Symbol('Text')
// 创建碎片类型
export const Fragment = Symbol('Fragment')
// 创建虚拟节点方法
export function createVNode(type,props,children?,patchFlag?) {
    // 若类型为字符串 说明当前虚拟节点为普通元素
    // 若类型为对象   说明当前虚拟节点为组件
    let shapeFlag = isString(type)?ShapeFlags.ELEMENT:
    isTeleport(type)?ShapeFlags.TELEPORT:
    isObject(type)?ShapeFlags.STATEFUL_COMPONENT:
    isFunction(type)?ShapeFlags.FUNCTIONAL_COMPONENT:0
    // 创建虚拟节点对象
    const vnode = {
        // 虚拟节点标识
        __v_isVnode:true,
        type,
        props,
        children,
        key:props?.key, // 用于后续实现diff算法
        shapeFlag,
        ref:props?.ref,
        patchFlag,
    }

    // 收集动态节点
    if (currentBlock && patchFlag>0) {
        currentBlock.push(vnode)
    }

    // 判断孩子类型
    if (children) {
        if (Array.isArray(children)) {
            // 若是数组
            // 更新shapeFlag
            vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
        }else if (isObject(children)) {
            // 若是对象
            // 则为插槽slot
            vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
        }else {
            // 此处逻辑 后续实现
            // 先将孩子 变为字符串
            children=String(children)
            vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
        }
    }

    return vnode
}

// 判断是否为虚拟节点方法
export function isVnode(value) {
    return !!(value && value.__v_isVnode)
}

// 判断两个虚拟节点是否相同的方法
export function isSameVnode(vnode1,vnode2) {
    // 只有两个虚拟节点 类型、key 都相同
    // 才能说明 两个虚拟节点相同
    return vnode1.type === vnode2.type && vnode1.key === vnode2.key
}


// 标识当前块
let currentBlock = null

// 收集动态节点方法
export function openBlock() {
    // 创建数组 
    // 收集动态节点
    currentBlock=[]
}

// 停止收集动态节点方法
export function closeBlock() {
    currentBlock=null
}

// 创建block方法
export function setupBlock(vnode) {
    // ElementBlock会收集动态子节点 通过当前block收集
    vnode.dynamicChildren = currentBlock  
    // 收集完后 当前block清空
    closeBlock()
    return vnode  
}

// 创建元素block方法
// block 具有收集虚拟节点的功能
export function createElementBlock(type,props,children,patchFlag?) {

    // 创建虚拟节点
    // 内部还是调用createVNode创建虚拟节点
    const vnode =createVNode(type,props,children,patchFlag)
    
    // // 处理不稳定情况
    // // 存在v-if v-else
    // if (currentBlock) {
    //     // 实现block嵌套
    //     currentBlock.push(vnode)
    // }

    // 创建block
    return setupBlock(vnode)
}

export {createVNode as createElementVNode}

export function isDisplayString(value) {
    return isString(value)?value:value===null?'':isObject(value)?JSON.stringify(value):String(value)
}