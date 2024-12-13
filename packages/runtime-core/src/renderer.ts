
import  {hasOwn, ShapeFlags}  from "@vue/shared";
import { createVNode, Fragment, isSameVnode, Text } from "./createVnode";
import { getSequence } from "./seq";
import { isRef, reactive, ReactiveEffect } from "@vue/reactivity";
import { queueJob } from "./scheduler";
import { createComponentInstance, setupComponent } from "./component";
import { invokeArr } from "./apiLifeCycle";
import { isKeepAlive } from "./KeepAlive";
import { PatchFlags } from "packages/shared/src/patchFlags";

export function createRenderer(renderOptions) {
    // core中 不关心如何渲染
    // debugger
    // 对象解构 方法重命名
    const {
        insert: hostInsert,
        remove: hostRemove,
        patchProp: hostPatchProp,
        createElement: hostCreateElement,
        createText: hostCreateText,
        createComment: hostCreateComment,
        setText: hostSetText,
        setElementText: hostSetElementText,
        parentNode: hostParentNode,
        nextSibling: hostNextSibling,
        querySelector:hostQuerySelector
    } = renderOptions;

    const normalize =(children)=>{
        // 若是数组
        if (Array.isArray(children)) {
            // 遍历孩子数组
            for (let i = 0; i < children.length; i++) {
                // childrenArr[i] 可能是纯文本or数组
                if (typeof children[i] ==='string'|| typeof children[i] ==='number' ) {
                    // 创造出虚拟节点
                    children[i]=createVNode(Text,null,String(children[i]))
                }
            }
        }
        return children
    }
    // 挂载孩子数组方法
    const mountChildren=(childrenArr,container,anchor,parentComponent)=>{
            normalize(childrenArr)
            for (let i = 0; i < childrenArr.length; i++) {
                // 调用渲染方法 渲染至container上
                patch(null,childrenArr[i],container,anchor,parentComponent)
            }
            
    }

    // 挂载元素方法
    // => 根据当前虚拟节点生成真实元素 挂载至对应容器上
    const mountElement=(vnode,container,anchor,parentComponent)=>{
        
        // 1、根据当前虚拟节点 生成对应 真实节点
        
        // 1-1 解构当前虚拟节点 取出type props children ShapeFlag transition属性
        const {type,props,children,shapeFlag,transition}=vnode
        
        // 1-2 根据type 生成对应真实节点
        // 此处 需要将当前虚拟节点对应的真实节点缓存起来
        // => 便于后续实现diff算法 实现真实节点的复用
        const el =(vnode.el=hostCreateElement(type))
        // 1-3 根据props 给生成的真实节点绑定属性
        if (props) {
            // 遍历props
            for (const key in props) {
                // 调用配置属性方法
                hostPatchProp(el,key,null,props[key])
            }
        }

        // 1-4 根据children类型 给生成的真实节点绑定children
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 若儿子是文本元素
            hostSetElementText(el,children)
        }else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 若儿子是数组元素
            // 调用挂载数组孩子方法
            mountChildren(children,el,anchor,parentComponent)
        }

        // 渲染之前  调用beforeEnter方法
        if (transition) {
            transition.beforeEnter(el)
        }


        // 2、将真实节点挂载至对应容器上
        hostInsert(el,container,anchor)

        // 渲染之后  调用enter方法
        if (transition) {
            transition.enter(el)
        }
    }

    // 处理新旧虚拟节点方法
    const processElement=(preVNode,curVNode,container,anchor,parentComponent)=>{ 
        if (preVNode===null) {
            // 若旧虚拟节点为空
            // => 说明是首次渲染
            // 调用挂载元素方法
            mountElement(curVNode,container,anchor,parentComponent)
        }else{
            // 若旧虚拟节点不为空
            // => 当前新旧虚拟节点 类型、key值都相同
            // => 需要对比新旧虚拟节点 实现复用
            patchElement(preVNode,curVNode,container,anchor,parentComponent)
        }
    }

    // 给真实节点渲染属性 方法
    const patchProps = (preVNode,curVNode,el)=>{
        // 1、获取新旧虚拟节点属性
        let oldProps = (preVNode.props || {})
        let newProps = (curVNode.props || {})

        // 2、将新虚拟节点的全部属性
        // => 添加至真实节点身上
        for (const key in newProps) {
            hostPatchProp(el,key,oldProps[key],newProps[key])
        }

        // 3、将旧虚拟节点的多余属性
        // => 从真实节点身上移除
        for (const key in oldProps) {
            if (!(key in newProps)) {
                hostPatchProp(el,key,oldProps[key],null)
            }
        }
    }

    // 清除虚拟节点孩子数组
    const unmountChildren=(ChildrenArr,parentComponent)=>{
        for (let i = 0; i < ChildrenArr.length; i++) {
            unmount(ChildrenArr[i],parentComponent)
        }
    }

    // 全量diff
    const patchKeyedChildren=(preChildren,curChildren,el,parentComponent)=>{
        // debugger
        // 1、确定更新范围
        let i = 0
        let preEndIndex = preChildren.length-1
        let curEndIndex = curChildren.length-1

        // 从前往后遍历
        while (i<=preEndIndex&&i<=curEndIndex) {
            if (isSameVnode(preChildren[i],curChildren[i])) {
                // 若是相同节点
                // 则更新其属性及孩子
                patch(preChildren[i],curChildren[i],el)
            } else {
                // 若不是
                // 中止循环
                break
            }
            i++
        }

        // 从后往前遍历
        while (i<=preEndIndex&&i<=curEndIndex) {
            if (isSameVnode(preChildren[preEndIndex],curChildren[curEndIndex])) {
                // 若是相同节点
                // 则更新其属性及孩子
                patch(preChildren[preEndIndex],curChildren[curEndIndex],el)
            } else {
                // 若不是
                // 中止循环
                break
            }
            preEndIndex--
            curEndIndex--
        }
        // debugger
        //[a,b]
        //[a,b,c]
        // => i=2 preEndIndex=1 curEndIndex=2
        //[a,b]
        //[c,a,b]
        // => i=0 preEndIndex=-1 curEndIndex=0
        // 如果新的多 老的少
        // [a,d]
        // [a,b,c,d]
        if (i > preEndIndex) {
            if (i <= curEndIndex) {
                // 此时需要将新的元素插入

                // 获取锚点对应的真实元素
                let nextIndex = curEndIndex+1
                let anchor = curChildren[nextIndex]?.el
                
                // 将新元素插入
                while (i<=curEndIndex) {
                    patch(null,curChildren[i],el,anchor)
                    i++
                }
            }
        }else if (i>curEndIndex){
            // 如果新的少 老的多
            // [a,b,c,d,e]
            // [a,b,c]
            // => i=3 preEndIndex=4 curEndIndex=2
            // [d,e,a,b,c]
            // [a,b,c]
            // => i=0 preEndIndex=1 curEndIndex=-1
            if (i<=preEndIndex) {
                // 删除旧的多余节点
                while (i<=preEndIndex) {
                    unmount(preChildren[i],parentComponent)
                    i++
                }
            }
        }

        // [a,b,c,d,e,f]
        // [a,b,e,d,c,g,f]
        let preStarIndex = i
        let curStarIndex = i

        // 对于新元素的范围 建立索引
        const keyToNewIndexMap=new Map()
        // 需要倒序插入的个数
        let toBePatched = curEndIndex-curStarIndex+1
        // 保存新元素范围内元素在旧孩子内的索引
        // => 用于求最长递增子序列 
        // => 
        let newIndxToOldMapIndex=new Array(toBePatched).fill(0) //[0,0,0,0]


        // 遍历新元素的范围
        for (let i = curStarIndex; i <=curEndIndex; i++) {
            // 建立映射
            // 建立新元素 key 与 索引下标 的映射
            keyToNewIndexMap.set(curChildren[i].key,i)
        }

        // 遍历 旧元素范围
        for (let i = preStarIndex; i <= preEndIndex; i++) {
            // 查看当前旧元素是否在新元素内出现
            // 根据旧元素的key值 查找
            // => 返回值为当前旧元素在新孩子数组中的索引下标
            let newIndex = keyToNewIndexMap.get(preChildren[i].key)
            
            // 判断索引下标是否存在
            // => 及当前旧元素是否在新元素内出现
            if (newIndex===undefined) {
                // 若未出现 
                // => 删除此旧元素
                unmount(preChildren[i],parentComponent)
            } else {
                // 若出现
                // 1、保存新元素对应旧元素在旧孩子内的下标
                newIndxToOldMapIndex[newIndex - curStarIndex] = i+1 //+1 用于避免i为0时候的歧义
                // 2、更新属性及儿子 
                // => 递归访问子节点
                patch(preChildren[i],curChildren[newIndex],el)
            }
        } 
        console.log(newIndxToOldMapIndex);
        

        
        // 倒序插入
        
        // 获取最长递增子序列
        let increasingSeq = getSequence(newIndxToOldMapIndex)
        let j = increasingSeq.length-1
        
        for (let i = toBePatched-1; i >=0; i--) {
            let newIndex = curStarIndex+i
            let anchor=curChildren[newIndex+1]?.el

            if (!curChildren[newIndex].el) {
                // 若当前元素 是新增节点 还未创建对应真实节点
                // 则调用patch方法 创建真实节点
                patch(null,curChildren[newIndex],el,anchor)
            }else{
                // diff算法优化
                if (i === increasingSeq[j]) {
                    j-- 
                } else {
                    // 否则 直接插入
                    hostInsert(curChildren[newIndex].el,el,anchor)
                }
            }
        }
    }
    // 给真实节点渲染孩子 方法
    const patchChildren=(preVNode,curVNode,el,anchor,parentComponent)=>{
        // 节点孩子有三种情况 空 | 数组 | 文本
        // 所以对比新旧节点的孩子 要考虑9种情况

        // 获取孩子
        let  preChildren = normalize(preVNode.children)
        let  curChildren = normalize(curVNode.children)

        // 获取虚拟节点标记
        let preShapeflag = preVNode.shapeFlag
        let curShapeflag = curVNode.shapeFlag

        // 新旧虚拟节点孩子的类型 存在如下情况：
        // 1、新：文本  旧：数组    
        // => 移除旧数组 
        // 2、新：文本  旧：文本|空    
        // => 用新文本覆盖
        // 3、旧：数组  新：数组   
        // => 全量diff
        // 4、旧：数组  新：空
        // => 移除旧数组
        // 5、旧：文本  新：空|数组
         // => 移除旧文本 添加新数组

        if (curShapeflag & ShapeFlags.TEXT_CHILDREN) {
            if (preShapeflag & ShapeFlags.ARRAY_CHILDREN) {
                // 1、新：文本  旧：数组   
                // => 移除旧数组 
                debugger;
                unmountChildren(preChildren,parentComponent)
            }
            if (preChildren!==curChildren) {
                // 2、新：文本  旧：文本|空    
                // => 用新文本覆盖
                hostSetElementText(el,curChildren)
            }
        }else{
            if (preShapeflag& ShapeFlags.ARRAY_CHILDREN) {
                if (curShapeflag&ShapeFlags.ARRAY_CHILDREN) {
                    // 3、旧：数组  新：数组   
                    // => 全量diff
                    patchKeyedChildren(preChildren,curChildren,el,parentComponent)
                }else{
                    // 4、旧：数组  新：空
                    // => 移除旧数组
                    unmountChildren(preChildren,parentComponent)
                }
            }else{
                // 5、旧：文本  新：空|数组
                // => 移除旧文本 添加新数组
                if (preShapeflag&ShapeFlags.TEXT_CHILDREN) {
                    hostSetElementText(el,'')
                }

                if (curShapeflag & ShapeFlags.ARRAY_CHILDREN) {
                    mountChildren(curChildren,el,anchor,parentComponent )
                }
            }
        }
    }

    // 线性对比算法
    const patchBlockChildren=(preVNode,curVNode,el,anchor,parentComponent)=>{
        // 只需要渲染动态子节点
        for (let i = 0; i < curVNode.dynamicChildren.length; i++) {
            patch(preVNode.dynamicChildren[i],curVNode.dynamicChildren[i],el,anchor,parentComponent)
        }
    }
    

    // 新旧虚拟节点对比方法
    const patchElement=(preVNode,curVNode,container,anchor,parentComponent)=>{
        // 1、实现真实节点的复用
        // 因为当前新旧虚拟节点 类型和key 都相同
        // => 所以可以复用dom
        let el = (curVNode.el=preVNode.el)

        // 2、给复用的真实节点渲染属性
        // => 靶向对比 or 全量对比
        // 解构出patchFlag dynamicChildren
        const {patchFlag,dynamicChildren} = curVNode
        // 判断是否有动态标识
        if (patchFlag) {
            // => 靶向对比
            // 只需要对比特定的属性
            
            if (patchFlag&PatchFlags.CLASS) {
                // .........
            }
            if (patchFlag&PatchFlags.STYLE) {
                // .........
            }
        } else {
            // 全量对比
            patchProps(preVNode,curVNode,el)
        }

        // 对比文本
        if (patchFlag&PatchFlags.TEXT) {
                // 若文本为动态类型
                if (preVNode.children!==curVNode.children) {
                    // 只要不一致
                    return hostSetElementText(el,curVNode.children)
                }
        }

        // 3、给复用的真实节点渲染孩子
        // => 线性比对 or 全量diff
        if (dynamicChildren) {
            // 线性比对
            patchBlockChildren(preVNode,curVNode,el,anchor,parentComponent)
        } else {
            // 全量diff
            patchChildren(preVNode,curVNode,el,anchor,parentComponent)
        }
    }

    // 处理文本类型
    const processText=(preVNode,curVNode,container)=>{
        // 1、判断判断是初始化还是更新
        // => 即判断旧虚拟节点是否存在
        if (preVNode==null) {
            // 初始化
            // 1、根据当前虚拟节点的孩子(即文本内容) 创建出文本节点
            // 2、将文本节点与当前虚拟节点相关联(方便后续实现更新)
            // 3、插入至容器中
            hostInsert((curVNode.el=hostCreateText(curVNode.children)),container)
        } else {
            // 更新操作
            // 1、复用旧虚拟节点的dom
            curVNode.el = preVNode.el
            // 2、更新孩子
            hostSetText(curVNode.el,curVNode.children)
        }
    }

    // 处理碎片类型
    const processFragment= (preVNode,curVNode,container,anchor,parentComponent)=>{
        // 判断初次渲染还是更新
        if (preVNode==null) {
            // 初次渲染
            // => 将当前虚拟节点的孩子挂载至容器上
            mountChildren(curVNode.children,container,anchor,parentComponent)
        } else {
            // 更新
            // => 渲染孩子节点
            patchChildren(preVNode,curVNode,container,anchor,parentComponent)
        }
    }

    // 更新组件预渲染方法
    const updateComponentPreRender=(instance,curVNode)=>{
        // 清除实例next属性
        instance.next=null
        // 更新实例对应虚拟节点
        instance.vnode=curVNode

        // 调用更新属性方法
        updateProps(instance,instance.props,curVNode.props||{})

        // 更新插槽
        Object.assign(instance.slots,curVNode.children)
    }

    // -> 创建组件更新函数
    const setupReactiveEffect =(instance,container,anchor,parentComponent)=>{
        const componentUpdateFn=()=>{
            // 解构出render方法
            const {render,m,bm,u,bu} = instance
            // 需要判断是初次渲染还是更新
            if (!instance.isMounted) {
                // 初次渲染
                // > 获取subTree
                // 因为render的返回值才是我们真正需要渲染的虚拟节点 所有我们需要执行render函数
                // 第一个参数为绑定this指向
                // 第二个参数为proxy
                const subTree = render.call(instance.proxy,instance.proxy)
                
                // 调用bm
                if (bm) {
                    // 执行bm内的方法
                    invokeArr(bm)
                }
                // > 渲染subTree
                patch(null,subTree,container,anchor,instance)
                // > 更新组件属性
                instance.subTree = subTree
                instance.isMounted=true

                // 调用m
                if (m) {
                    // 执行m内的方法
                    invokeArr(m)
                }
            }else{
                // 组件更新

                // 数据&插槽更新逻辑
                // 判断当前实例身上是否有next属性
                if (instance.next) {
                    // 解构出next
                    const {next} = instance
                    // 调用更新组件预渲染方法
                    updateComponentPreRender(instance,next)
                }

                // 调用m
                if (bu) {
                    // 执行m内的方法
                    invokeArr(bu)
                }
                // > 获取新子树
                const subTree = render.call(instance.proxy,instance.proxy)
                // > 调用patch方法 渲染新子树
                patch(instance.subTree,subTree,container,anchor,instance)
                // > 更新组件属性
                instance.subTree=subTree

                // 调用u
                if (u) {
                    // 执行m内的方法
                    invokeArr(u)
                }
            }
    }
        // -> 创建响应式effect
        const effect=new ReactiveEffect(componentUpdateFn,()=>queueJob(update))
        // -> 创建effect回调方法
        const update=(instance.update=()=>effect.run())
        // -> 默认执行一次
        update()
}
    
    // 挂载组件方法
    const mountComponent=(curVNode,container,anchor,parentComponent)=>{
        // 组件有自己的状态(数据) 数据发生变化 组件需要更新
        // => 组件 类似 effect
        // 1、创建组件
        // 当前组件虚拟节点保存其对应的组件实例对象
        const instance = (curVNode.component=createComponentInstance(curVNode,parentComponent))
        
        // 判断当前虚拟节点是否为keepalive
        if (isKeepAlive(curVNode)) {
            // 若是虚拟节点
            // 添加方法
            instance.ctx.renderer ={
                // 1、内部需要有创建元素方法 用于创建缓存dom的容器
                createElement:hostCreateElement,
                // 2、需要将要缓存的dom移动至容器内
                move(vnode,container,anchor){
                    hostInsert(vnode.component.subTree.el,container,anchor)
                },
                // 3、组件切换时需要将容器内的dom元素移除
                unmount
            }
        }

        // 2、初始化组件
        setupComponent(instance)

        // 3、创建响应式effect
        setupReactiveEffect(instance,container,anchor,parentComponent)
    }

    // 判断新旧属性是否相同
    const hasPropsChanged=(preProps,curProps)=>{
        const nKeys = Object.keys(preProps)
        // 若属性个数不同 必然不同
        if (nKeys.length !== Object.keys(curProps).length) {
            return true
        }

        // 遍历旧属性
        for (let i = 0; i < nKeys.length; i++) {
            let key = nKeys[i]
            if (preProps[key]!== curProps[key]) {
                return true
            }
        }

        return false
    }

    // 更新props方法
    const updateProps=(instance,preProps,curProps)=>{
        // 判断当前新旧属性是否相同
        if(hasPropsChanged(preProps,curProps||{})){
            // 若不相同

            // 添加or替换新属性
            const curKeys = Object.keys(curProps)
            for (let i = 0; i < curKeys.length; i++) {
                let key = curKeys[i]
                instance.props[key]=curProps[key] 
            }

            // 去除旧的多余属性
            for (const key in instance.props) {
                if (!(key in curProps)) {
                    delete instance.props[key]
                }
            }
        }
    }

    // 判断是否需要更新
    const shouldComponentUpdate=(preVNode,curVNode)=>{
        // 解构当前新旧虚拟节点
        const {props:preProps,children:preChildren}=preVNode
        const {props:curProps,children:curChildren}=curVNode

        // 判断是否有插槽(children)
        if (preChildren || curChildren) {
            // 若有 则必须要重新渲染
            return true
        }

        // 判断新旧props是否相同
        if (preProps===curProps) {
            return false
        }
        
        return hasPropsChanged(preProps,curProps||{})
    }
    // 更新组件
    const updateComponent=(preVNode,curVNode)=>{
        // 1、组件复用
        const instance = (curVNode.component=preVNode.component)

        // // 2、更新props
        // // 获取新旧props
        // const {props:preProps} = preVNode
        // const {props:curProps} = curVNode
        // updateProps(instance,preProps,curProps)

        // 判断当前组件是否需要更新
        if (shouldComponentUpdate(preVNode,curVNode)) {
            // 若需要更新

            // 记录当前新虚拟节点
            instance.next =curVNode

            // 调用更新方法
            // => 使得更新逻辑统一
            instance.update()
        }
    }
    // 处理组件方法
    const processComponent=(preVNode,curVNode,container,anchor,parentComponent)=>{
        
        // 判断初次渲染还是更新
        if (preVNode==null) {
            // 初次渲染
            
            // 判断当前虚拟节点是否为keepalive类型
            if (curVNode.shapeFlag&ShapeFlags.COMPONENT_KEPT_ALIVE) {
                // 若是
                // 调用keepalive的激活方法
                // => 从而避免重新挂载
                parentComponent.ctx.activate(curVNode,container,anchor)
            } else {
                // 若不是
                // 调用挂载组件方法
                mountComponent(curVNode,container,anchor,parentComponent)
            }
        } else {
            // 更新组件
            updateComponent(preVNode,curVNode)
        }
    }

    // 渲染方法
    const patch=(preVNode,curVNode,container,anchor=null,parentComponent=null)=>{
        
        // 若新旧虚拟节点相同
        // 则 无需重新挂载
        if (preVNode===curVNode) {
            // 无需任何操作 直接返回
            return 
        }

        // 若旧虚拟节点存在 且新旧虚拟节点不相同
        if (preVNode && !isSameVnode(preVNode,curVNode)) {
            // 清除旧虚拟节点对应的真实节点
            unmount(preVNode,parentComponent)
            // 将 旧虚拟节点 置空
            // => 使得新虚拟节点可以走初始化逻辑
            preVNode=null
        }

        // 根据当前节点类型,ShapeFlag 分情况处理
        let {type,shapeFlag,ref} = curVNode
        
        switch (type) {
            case Text:
                // 对文本类型进行处理
                processText(preVNode,curVNode,container)
                break;
            case Fragment:
                // 对碎片类型进行处理
                processFragment(preVNode,curVNode,container,anchor,parentComponent)
                break;
            default:
                if (shapeFlag&ShapeFlags.COMPONENT) {
                    // 对组件类型进行处理
                    processComponent(preVNode,curVNode,container,anchor,parentComponent)
                } else if (shapeFlag&ShapeFlags.TELEPORT) {
                    // 调用其自身的process方法
                    // 同时传递参数以及方法对象
                    type.process(preVNode,curVNode,container,anchor,parentComponent,
                        {
                        // 传递方法
                        mountChildren,
                        patchChildren,
                        query:hostQuerySelector,
                        move(vnode,container,anchor){
                            hostInsert(vnode.component?vnode.component.subTree.el:vnode.el,
                                container,anchor
                            )
                        }
                        }
                    )
                } if(shapeFlag&ShapeFlags.ELEMENT) {
                    // 对元素进行处理
                    processElement(preVNode,curVNode,container,anchor,parentComponent)
                    break;
                }
        }

        // 渲染完成后
        // 更新虚拟节点的ref属性
        if (ref !==null) {
            // 调用设置ref方法
            setRef(ref,curVNode)
        }
    }
    // 设置ref方法
    const setRef=(rawRef,curVNode)=>{
        // 解构虚拟节点
        const {shapeFlag} = curVNode

        // 根据虚拟节点确定ref的值
        let value = shapeFlag &  ShapeFlags.STATEFUL_COMPONENT?curVNode.component.exposed || curVNode.component.proxy:curVNode.el
        
        // 赋值
        if (isRef(rawRef)) {
            rawRef.value = value
        }
    }

    // 卸载虚拟节点对应真实节点方法
    const unmount=(vnode,parentComponent)=>{
        const{shapeFlag}=vnode
        // 调用移除方法
        // 移除当前虚拟节点对应的真实节点
        if (vnode.shapeFlag&ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
            // 若是keepalive 调用deactivate方法
            parentComponent.ctx.deactivate(vnode)
        }else if (vnode.type==='Fragment') {
            unmountChildren(vnode.children,parentComponent)
        }else if(shapeFlag&ShapeFlags.COMPONENT){
            // 若是组件
            // 卸载子树
            unmount(vnode.component.subTree,parentComponent)
        }else if(shapeFlag&ShapeFlags.TELEPORT){
            // 若是TELEPORT
            vnode.type.remove(vnode,unmountChildren)
        }else{
            hostRemove(vnode.el)
        }
    }
    // render方法
    const render=(vnode,container)=>{

        // 判断vnode是否为空
        if (vnode === null) {
            // 若为空
            // render(null,app)
            // 判断当前container是否已经挂载过节点
            if (container.vnode) {
                // 若挂载过
                // 此时需要将此虚拟节点对应的真实节点 移除
                unmount(container.vnode,null)
            }
        }else{
            // 调用渲染方法
            // 参数为：
            // 当前container的旧虚拟节点、当前要挂载的新虚拟节点、容器
            // 初次渲染时 旧虚拟节点为空
            patch(container.vnode||null,vnode,container)
            
            // 缓存当前挂载的虚拟节点
            container.vnode = vnode
        }
    }
    return {
        render,
    }
}