import { isObject, isString, ShapeFlags } from "@vue/shared"
import { createVNode, isVnode } from "./createVnode"

export function h(type,propsOrChildren?,children?) {
    // 获取参数长度
    let l = arguments.length

    // 根据参数长度 确定 调用创建虚拟节点方法时 的参数
    if (l === 2) {
        // 此时有四种情况
        // h('div',{class:'a'})
        // h('div',h('div','son'))
        // h('div',['yyy'])
        // h('div','yyy')

        if (isObject(propsOrChildren) && !Array.isArray(propsOrChildren)) {
            // 若是对象 但不是数组
            // 此时 只有前两种情况 => 属性|虚拟节点
            if (isVnode(propsOrChildren)) {
                // 若是虚拟节点
                return createVNode(type,null,[propsOrChildren])
            }else{
                // 若是属性
                return createVNode(type,propsOrChildren)
            }
        }

        // 若是数组|文本
        // 即后两种情况
        return createVNode(type,null,propsOrChildren)
    }else{
        if (l>3) {
            // h('div',{class:'a'},'a','b')
            // 将第三个及之后的参数转为数组
            children=Array.from(arguments).slice(2)
        }

        if (l ===3 && isVnode(children)) {
            // h('div',{class:'a'},h('div'))
            children=[children]
        }
        return createVNode(type,propsOrChildren,children)
    }
}
