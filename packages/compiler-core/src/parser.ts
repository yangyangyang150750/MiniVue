import { NodeTypes } from "./ast"


// 根据模板 生成上下文
const createParseContent=(content)=>{
    return {
        // 原始数据
        originalSource:content,    
        // 当前解析的数据 ！！字符串会不停减少(被截取)
        source:content,   
        // 创建位置信息
        line:1,
        column:1,
        offset:0,
    }
}

const isEnd=(context)=>{
    // 若当前是闭合标签 返回true
    // => 停止循环
    if (context.source.startsWith('</')) {
        return true
    }
    return !context.source
}

// 更新当前字符串
const advanceBy=(context,endIndex)=>{
    context.source = context.source.slice(endIndex)
}

// 处理文本数据方法
const parseTextData=(context,endIndex)=>{
    // 获取文本内容
    // => 截取0-endIndex的数据
    const content = context.source.slice(0,endIndex)
    // 更新当前字符串
    advanceBy(context,endIndex)

    return content
}

//处理文本函数
const parseText=(context)=>{
    // 需要找离当前文本最近的 '<' or '{{'
    // 例如： 'abc   <div>{{ a }}</div>'

    // 定义token
    const tokens =['<','{{']
    // 先假设找不到
    let endIndex = context.source.length

    // 遍历tokens
    // 查找最近token的索引位置
    for (let i = 0; i < tokens.length; i++) {
        // 找当前token在当前字符串中的索引
        const index = context.source.indexOf(tokens[i],1)   // 从索引1开始找
        // 判断与endIndex的大小
        if (index!==-1&& index<endIndex) {
            // 更新endIndex
            endIndex=index
        }
    }

    // 此时 0-endIndex-1 就是文本数据
    // 调用处理文本数据方法
    let content = parseTextData(context,endIndex)

    return {
        type:NodeTypes.TEXT,
        content,
    }
}

// 删除空格
const advanceSpaces=(context)=>{
    // 利用正则找到空格 
    let match = /^[ \t\r\n]+/.exec(context.source)

    // 删除空格
    if(match){
        advanceBy(context,match[0].length)
    }
}

// 解析单个属性值方法
// '1' b='2'><div>
function parseAttributeValue(context){
    // 获取当前字符串第一个字符
    let quote = context.source[0]

    // 判断是否为引号
    let isQuoted = quote==='"'|| quote==="'"

    let content
    if (isQuoted) {
        // 如果是引号
        // 1、更新字符串 删除当前引号
        advanceBy(context,1)
        // 2、获取另一个引号的索引
        const endIndex = context.source.indexOf(quote,1)
        // 3、两个引号之间的内容便是属性值
        content = parseTextData(context,endIndex)
        // 4、删除末尾的引号
        advanceBy(context,1)
    }else{
        content = context.source.match(/([^ \t\r\n/>])+/)[0]; // 取出内容，删除空格
        advanceBy(context, content.length);
        advanceSpaces(context);
    }

    return content
}

// 解析单个属性方法
// a='1' b='2'><div>
const parseAttribute=(context)=>{
    // 获取游标
    let start = getCursor(context)

    // 定义属性名 属性值
    let name
    let value

    // 利用正则 匹配属性名
    let match =(/^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source) as any)
    name = match[0]
    // 更新字符串 删除属性名
    advanceBy(context,match[0].length)

    // 利用正则 判断是否存在空格与=
    if (/^[\t\r\n\f ]*=/.test(context.source)) {
        // 先清除空格
        advanceSpaces(context)
        // 再清除=
        advanceBy(context,1)
        // 最后清除空格
        advanceSpaces(context)

        // 调用解析属性值方法
        value = parseAttributeValue(context)
    }

    let loc = getSelection(context, start)
    return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: {
      type: NodeTypes.TEXT,
      content: value,
      loc,
    },
    loc: getSelection(context, start),
  };
}

// 解析属性方法
const parseAttributes=(context)=>{
    // 存储属性
    const props = [] as any

    // 循环
    while (context.source.length>0 && !context.source.startsWith('>')) {
        // 调用解析属性方法 获取属性
        // 同时加入数组中
        props.push(parseAttribute(context))
        // 删除空格
        advanceSpaces(context)
    }

    return props
}

// 解析标签方法
const parseTag = (context)=>{

    // 获取游标
    let start = getCursor(context)

    // 利用正则 找到第一个结束标签
    // <div  >  </div> => [<div,div]
    const match =(/^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source))as any
    let tag = match[1] // div  
    // 更新当前字符串
    advanceBy(context,match[0].length) // <div  ></div> => >  </div>

    // 删除空格
    advanceSpaces(context)      //    ></div> = ></div>
    
    // 处理属性
    // 删除空格后 可能有属性
    // <div  a='1' b='2'><div>
    // =>a='1' b='2'><div>
    let props = parseAttributes(context)

    // 判断是否为自闭合
    const isSelfClosing = context.source.startsWith('/>')

    // 更新当前字符串 
    // 若是自闭合 => '/>' 此时需要删除两个字符
    // 否则 => '>' 此时需要删除一个字符
    advanceBy(context,isSelfClosing?2:1) // >  </div> =>   </div>

    return {
        type:NodeTypes.ELEMENT,
        tag,
        isSelfClosing,
        loc:getSelection(context,start),    // 开头标签解析的信息
        props,
    }
}

//处理元素函数
const parseElement=(context)=>{

    // 1、处理标签
    // 调用解析标签方法
    // <div>
    const ele = parseTag(context)

    // 2、处理孩子
    // 递归解析儿子节点,但是解析的时候如果是结尾标签需要跳过
    const children = parseChildren(context); 

    // 2、处理剩余标签
    // </div>
    if (context.source.startsWith('</')) {  
        // parseTag阶段可能还会剩余 </div>标签
        //   <div></div>
        //=> </div>

        // 删除结束标签
        parseTag(context)
    }

    // 3、添加属性 
    (ele as any).children=children,
    (ele as any).loc=getSelection(context,ele.loc.start)

    return  ele
}

//  递归解析模板孩子
const parseChildren=(context)=>{
    let nodes =[] as any
    while(!isEnd(context)){
        let node
        // 获取当前解析的字符串
        const c = (context.source as any)        

        // 判断
        if (c.startsWith('{{')) {    // {{}}
            // {{}}
            node='表达式'
        }else if(c[0]==='<'){
            // <div>
            // 调用处理元素函数
            node=parseElement(context)
        }else{
            // 文本
            // abc  {{}} <div>
            // 调用处理文本函数
            node = parseText(context)
        }
        // 状态机
        nodes.push(node)
    }

    
    // 清除空节点
    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i]
       if (node.type===NodeTypes.TEXT) {
            // 若是空白字符 => 清空
            if (!/[^\t\r\n\f ]/.test(node.content)) {
                nodes[i]=null
            }else{
                // 否则：
                // aa          bb        cc 
                // 去除多余空格
                node.content=node.content.replace(/[\t\r\n\f ]+/g,' ')
            }
       }
    }

    return nodes.filter((item)=>Boolean(item))
}

// 创建根方法
const createRoot=(children)=>{
    return{
        type:NodeTypes.ROOT,
        children:children,
    }
}

// 解析模板方法
export function parse(template) {
    // 根据template 生成一棵树      line column offset
    
    // 生成模板上下文
    const context = createParseContent(template)

    // 递归解析模板上下文
    // <p>
    //     <div></div>
    //     <div></div>
    // </p>
    // ====>
    // {type:1,tag:'p',children:[...]}
    // 先解析孩子 再创建根节点
    return createRoot(parseChildren(context))
}



/// 获取游标方法
function getCursor(context) {
  let { line, column, offset } = context;
  return { line, column, offset };
}

// 获取位置信息
function getSelection(context, start, e?) {
  let end = e || getCursor(context);
  // eslint 可以根据 start，end找到要报错的位置
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset),
  };
}