// 用于对节点元素的属性进行操作 
// 如 class style event 普通属性

import { patchAttr } from "packages/runtime-dom/src/modules/patchAttr.js";
import { patchClass } from "packages/runtime-dom/src/modules/patchClass.js";
import { patchEvent } from "packages/runtime-dom/src/modules/patchEvent.js";
import { patchStyle } from "packages/runtime-dom/src/modules/patchStyle.js";

export default function patchProp(el,key,preValue,nextValue) {
     // 判断当前处理的类型
     if (key === 'class') {
        // class = 'a' => class = 'b'
        return patchClass(el,nextValue)
     } else if(key === 'style') {
        // {color:'red'} => {background:'white'}
        return patchStyle(el,preValue,nextValue)
     }else if(/^on[^a-z]/.test(key)){
        return patchEvent(el,key,nextValue)
     }else{
         // 若是普通属性
         return patchAttr(el,key,nextValue)
     }
}