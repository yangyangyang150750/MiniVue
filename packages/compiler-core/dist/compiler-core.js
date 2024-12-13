// packages/compiler-core/src/parser.ts
var createParseContent = (content) => {
  return {
    // 原始数据
    originalSource: content,
    // 当前解析的数据 ！！字符串会不停减少(被截取)
    source: content,
    // 创建位置信息
    line: 1,
    column: 1,
    offset: 0
  };
};
var isEnd = (context) => {
  if (context.source.startsWith("</")) {
    return true;
  }
  return !context.source;
};
var advanceBy = (context, endIndex) => {
  context.source = context.source.slice(endIndex);
};
var parseTextData = (context, endIndex) => {
  const content = context.source.slice(0, endIndex);
  advanceBy(context, endIndex);
  return content;
};
var parseText = (context) => {
  const tokens = ["<", "{{"];
  let endIndex = context.source.length;
  for (let i = 0; i < tokens.length; i++) {
    const index = context.source.indexOf(tokens[i], 1);
    if (index !== -1 && index < endIndex) {
      endIndex = index;
    }
  }
  let content = parseTextData(context, endIndex);
  return {
    type: 2 /* TEXT */,
    content
  };
};
var advanceSpaces = (context) => {
  let match = /^[ \t\r\n]+/.exec(context.source);
  if (match) {
    advanceBy(context, match[0].length);
  }
};
function parseAttributeValue(context) {
  let quote = context.source[0];
  let isQuoted = quote === '"' || quote === "'";
  let content;
  if (isQuoted) {
    advanceBy(context, 1);
    const endIndex = context.source.indexOf(quote, 1);
    content = parseTextData(context, endIndex);
    advanceBy(context, 1);
  } else {
    content = context.source.match(/([^ \t\r\n/>])+/)[0];
    advanceBy(context, content.length);
    advanceSpaces(context);
  }
  return content;
}
var parseAttribute = (context) => {
  let start = getCursor(context);
  let name;
  let value;
  let match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
  name = match[0];
  advanceBy(context, match[0].length);
  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    advanceSpaces(context);
    advanceBy(context, 1);
    advanceSpaces(context);
    value = parseAttributeValue(context);
  }
  let loc = getSelection(context, start);
  return {
    type: 6 /* ATTRIBUTE */,
    name,
    value: {
      type: 2 /* TEXT */,
      content: value,
      loc
    },
    loc: getSelection(context, start)
  };
};
var parseAttributes = (context) => {
  const props = [];
  while (context.source.length > 0 && !context.source.startsWith(">")) {
    props.push(parseAttribute(context));
    advanceSpaces(context);
  }
  return props;
};
var parseTag = (context) => {
  let start = getCursor(context);
  const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source);
  let tag = match[1];
  advanceBy(context, match[0].length);
  advanceSpaces(context);
  let props = parseAttributes(context);
  const isSelfClosing = context.source.startsWith("/>");
  advanceBy(context, isSelfClosing ? 2 : 1);
  return {
    type: 1 /* ELEMENT */,
    tag,
    isSelfClosing,
    loc: getSelection(context, start),
    // 开头标签解析的信息
    props
  };
};
var parseElement = (context) => {
  const ele = parseTag(context);
  const children = parseChildren(context);
  if (context.source.startsWith("</")) {
    parseTag(context);
  }
  ele.children = children, ele.loc = getSelection(context, ele.loc.start);
  return ele;
};
var parseChildren = (context) => {
  let nodes = [];
  while (!isEnd(context)) {
    let node;
    const c = context.source;
    if (c.startsWith("{{")) {
      node = "\u8868\u8FBE\u5F0F";
    } else if (c[0] === "<") {
      node = parseElement(context);
    } else {
      node = parseText(context);
    }
    nodes.push(node);
  }
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (node.type === 2 /* TEXT */) {
      if (!/[^\t\r\n\f ]/.test(node.content)) {
        nodes[i] = null;
      } else {
        node.content = node.content.replace(/[\t\r\n\f ]+/g, " ");
      }
    }
  }
  return nodes.filter((item) => Boolean(item));
};
var createRoot = (children) => {
  return {
    type: 0 /* ROOT */,
    children
  };
};
function parse(template) {
  const context = createParseContent(template);
  return createRoot(parseChildren(context));
}
function getCursor(context) {
  let { line, column, offset } = context;
  return { line, column, offset };
}
function getSelection(context, start, e) {
  let end = e || getCursor(context);
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset)
  };
}

// packages/compiler-core/src/runtimeHelper.ts
var TO_DISPLAY_STRING = Symbol("TO_DISPLAY_STRING");
var helperNameMap = {
  [TO_DISPLAY_STRING]: "toDisplayString"
};

// packages/compiler-core/src/index.ts
function transformElement(node, context) {
  if (node.type === 1 /* ELEMENT */) {
    console.log("\u8F6C\u6362\u5143\u7D20\u65B9\u6CD5");
  }
  return function() {
  };
}
function isText(node) {
  return node.type === 2 /* TEXT */ || node.type === 5 /* INTERPOLATION */;
}
function transformText(node, context) {
  if (node.type === 1 /* ELEMENT */ || node.type === 0 /* ROOT */) {
    return function() {
      let children = node.children;
      let container = null;
      let hasText = false;
      for (let i = 0; i < children.length; i++) {
        let child = children[i];
        if (isText(child)) {
          hasText = true;
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j];
            if (isText(next)) {
              if (!container) {
                container = children[i] = {
                  type: 8 /* COMPOUND_EXPRESSION */,
                  children: [child]
                };
              }
              container.children.push("+", next);
              children.splice(j, 1);
              j--;
            } else {
              container = null;
              break;
            }
          }
        }
      }
      if (!hasText || children.length === 1) {
      }
    };
  }
}
function transformExpress(node, context) {
  if (node.type === 5 /* INTERPOLATION */) {
    debugger;
    node.content.content = `_ctx.${node.content.content}`;
  }
}
function createTransformContext(root) {
  const context = {
    // 记录当前节点
    currentNode: root,
    // 记录父节点
    parent: null,
    // 保存转换方法
    transformNode: [transformElement, transformText, transformExpress],
    // 记录方法使用次数 方便提升hoist
    helpers: /* @__PURE__ */ new Map(),
    // 记录方法
    helper(name) {
      let count = context.helpers.get(name);
      context.helpers.set(name, count + 1);
      return name;
    }
  };
  return context;
}
function traverseNode(node, context) {
  context.currentNode = node;
  const transforms = context.transformNode;
  const exits = [];
  for (let i2 = 0; i2 < transforms.length; i2++) {
    let exit = transform[i2](node, context);
    exit && exits.push(exit);
  }
  switch (node.type) {
    case 0 /* ROOT */:
    case 1 /* ELEMENT */:
      for (let i2 = 0; i2 < node.children.length; i2++) {
        context.parent = node;
        traverseNode(node.children[i2], context);
      }
      break;
    case 5 /* INTERPOLATION */:
      context.helper(TO_DISPLAY_STRING);
      break;
  }
  context.currentNode = node;
  let i = exits.length;
  if (i > 0) {
    while (i--) {
      exits[i]();
    }
  }
}
function transform(AST) {
  const context = createTransformContext(AST);
  traverseNode(AST, context);
  AST.helper = [...context.helpers.keys()];
}
function compile(template) {
  const AST = parse(template);
  transform(AST);
}
export {
  compile,
  parse
};
//# sourceMappingURL=compiler-core.js.map
