// 2、将AST语法树 => codegennode

import { parse } from "./parser";
import { createCallExpression, createObjectExpression, createVnodeCall, NodeTypes } from "./ast";
import { TO_DISPLAY_STRING } from './runtimeHelper'
import { PatchFlags } from "packages/shared/src/patchFlags";

// 转换不同类型dom的方法
// dom遍历方式 后序以及先序
// 转换元素方法
function transformElement(node,context) {
    if (node.type===NodeTypes.ELEMENT) {
        console.log('转换元素方法');
    }

    // 退出函数 
    // 延迟处理 实现后序遍历
    return function () {
      let { tag, props, children } = node;
      let vnodeTag = tag; // createElementVnode(div)
      let properties = [];
      for (let i = 0; i < props.length; i++) {
        properties.push({ key: props[i].name, value: props[i].value.content });
      }

      const propsExpression =
        properties.length > 0 ? createObjectExpression(properties) : null;

      let vnodeChildren = null;
      if (children.length == 1) {
        vnodeChildren = children[0];
      } else if (children.length > 1) {
        vnodeChildren = children;
      }

      node.codegenNode = createVnodeCall(
        context,
        vnodeTag,
        propsExpression,
        vnodeChildren
      );
    };
}

// 判断节点是否为文本
function isText(node){
    return node.type===NodeTypes.TEXT || node.type===NodeTypes.INTERPOLATION
}

// 转换文本方法
function transformText(node,context) {
    if (node.type===NodeTypes.ELEMENT || node.type===NodeTypes.ROOT) {
       
       // 注意处理顺序：
       // 需要等待所有子节点处理完成后 再赋值给父元素
        return function () {
            // 获取孩子
            let children = node.children
            // 定义容器 用于合并节点
            let container = null
            // 文本标记
            let hasText = false

            // 遍历孩子
            for (let i = 0; i < children.length; i++) {
                // 获取孩子节点
                let child = children[i]

                // 判断当前孩子节点是否为文本类型
                if (isText(child)) {
                    // 若是
                    // 更新标记
                    hasText=true
                    // 遍历下一节点
                    for (let j = i+1; j < children.length; j++){
                        // 判断下一节点是否为文本类型
                        // 从而实现合并

                        // 获取下一节点
                        const next =children[j]

                        // 判断下一节点是否为文本类型
                        if (isText(next)) {
                            // 若是
                            // 判断当前容器是否初始化
                            if (!container) {
                                // 初始化容器
                                container=children[i]={
                                    type:NodeTypes.COMPOUND_EXPRESSION,
                                    children:[child]
                                }
                            }

                            // 合并当前节点
                            container.children.push('+',next)           
                            // 更新孩子数组 删除当前节点
                            children.splice(j,1)
                            // 更新指针
                            j--
                        }else{
                            // 清空容器
                            container=null 
                            // 退出循环
                            break
                        }
                    }
                }
            }

            // 若没有文本节点 或者 只有一个孩子
            if (!hasText || children.length===1) {
                return 
            }

            // 遍历孩子
            for (let i = 0; i <children.length; i++) {
                // 获取孩子
                let child=children[i]

                // 判断当前孩子类型
                // 若当前孩子是文本类型 或者 复合表达式
                if (isText(child)||child.type===NodeTypes.COMPOUND_EXPRESSION) {
                    // 创建数组
                    let args=[]
                    // 将当前孩子加入数组
                    args.push(child)

                    // 添加patchFlag标识
                    // 判断当前孩子是否为纯文本
                    if (child.type!== NodeTypes.TEXT) {
                        // 若不是纯文本
                        // 添加标识
                        args.push(PatchFlags.TEXT)
                    }

                    // 更新孩子节点
                    children[i]={
                        // 更新标识 之后通过createTextVnode创建节点
                        type:NodeTypes.TEXT_CALL,
                        // 保存内容
                        content:child,
                        // createTextVnode(内容,args)
                        codegenNode:createCallExpression(context,args)
                    }
                }

                
                
            }
        }
    }
    
}
// 转换表达式方法
function transformExpress(node,context) {
    if (node.type===NodeTypes.INTERPOLATION) {
        debugger
        node.content.content = `_ctx.${node.content.content}`
    }
}

// 创建转换上下文方法
function createTransformContext(root) {
    // 转换上下文
    const context= {
        // 记录当前节点
        currentNode:root,
        // 记录父节点
        parent:null,
        // 保存转换方法
        transformNode:[transformElement,transformText,transformExpress],
        // 保存方法及其使用次数 方便提升hoist
        helpers:new Map(),  // createElement=>1
        // 记录方法
        helper(name){
            // 获取当前方法 执行次数
            let count = context.helpers.get(name)
            // 更新执行次数
            context.helpers.set(name,count+1)
            return name
        }
    }
    return context
}

// 遍历节点方法
function traverseNode(node,context){
    // 1、上下文更新当前节点
    context.currentNode = node
    // 2、解构出遍历方法
    const transforms = context.transformNode

    // 3、遍历转换方法
    // 存储退出函数
    const exits =[] //// 元素函数，文本函数，表达式的函数
    for (let i = 0; i < transforms.length; i++) {
        // 执行转换方法
        let exit=transform[i](node,context)
        // 存储返回函数
        exit && exits.push(exit)
    }

    // 4、递归处理
    // 根据当前节点类型进行判断
    switch (node.type) {
        case NodeTypes.ROOT:
        case NodeTypes.ELEMENT:
            // 递归遍历孩子
            for (let i = 0; i < node.children.length; i++) {
                // 1、上下文更新父节点
                context.parent = node
                // 2、遍历孩子节点
                traverseNode(node.children[i],context)
            }
            break
        // 对表达式的处理
        case NodeTypes.INTERPOLATION:
            // 调用tostring方法
            context.helper(TO_DISPLAY_STRING)
            break

    }

    // 5、执行返回函数
    // 还原当前节点
    context.currentNode = node; // 因为traverseNode 会将node变成子节点
    // 倒序执行
    let i = exits.length;
    if (i > 0) {
      while (i--) {
        exits[i]();
      }
    }
}

// 定义转换方法
function transform(AST) {
    // 1、创建转换时的上下文
    // 根据生成的ast树 创建上下文
    const context = createTransformContext(AST)

    // 2、遍历AST语法树
    traverseNode(AST,context)

    // 
    AST.helper=[...context.helpers.keys()]
}

// 定义编译方法
export function compile(template) {
    // 1、将模板 => AST语法树
    const AST = parse(template)

    // 2、将AST语法树 => codegennode
    transform(AST)
}

export{parse}

