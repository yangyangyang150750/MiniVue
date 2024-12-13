import { ShapeFlags } from "@vue/shared"

// teleport 实例对象
export const Teleport ={
    // 标识是否为teleport组件
    __isTeleport:true ,
    remove(vnode,unmountChildren){
        const {shapeFlag,children}=vnode
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            unmountChildren(children)
        }
    },
    // 组件初始化时 会调用此方法
    process(preVNode,CurVNode,container,anchor,parentComponent,Operators){
        // 解构方法
        const {mountChildren,patchChildren,query,move}=Operators
        // 判断是否为初次挂载
        if (!preVNode) {
            // 若是初次挂载
            // 获取目标挂载节点
            const target=(CurVNode.target=query(CurVNode.props.to))
            if (target) {
                // 渲染孩子节点
                mountChildren(CurVNode.children,target,anchor,parentComponent)
            }
        } else {
            // 若为更新
            patchChildren(preVNode,CurVNode,preVNode.target,parentComponent) //只比较了孩子差异
            // 复用节点
            CurVNode.target=preVNode.target

            // 判断目标挂载节点是否发生变化
            if (CurVNode.props.to !== preVNode.props.to) {
                // 若发生变化
                // 将孩子节点重新移动至 新目标挂载节点
                const newTarget =(CurVNode.target=query(CurVNode.props.to))
                CurVNode.children.forEach(child => move(child,newTarget,anchor));
            }
        }

    }
}

// 判断当前是否为teleport组件
export const isTeleport = (type)=>type.__isTeleport