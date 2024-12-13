

import {nodeOps}  from'packages/runtime-dom/src/nodeOps.js'
import patchProp from'packages/runtime-dom/src/patchProp.js'
import { createRenderer } from '@vue/runtime-core'
// 合并节点操作和属性操作
const renderOptions = Object.assign({patchProp},nodeOps)

// render方法
export const render = (vnode,container)=>{
    // 调用createRenderer的render方法
    createRenderer(renderOptions).render(vnode,container)
}

export {renderOptions}
export * from '@vue/runtime-core'
export * from '@vue/shared'

// runtime-dom => runtime-core => reactivity