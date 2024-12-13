// 求最长递增子序列

export function getSequence(arr) {
    // 获取总长度
    let length = arr.length
    // 最长递增子序列索引值
    let result = [0]    //从第一个元素开始 索引值为0
    // 保存结果数组的最后一个索引元素
    let resultLastIndex
    // 用于标识索引
    let p = arr.slice(0)
    // 遍历数组
    for (let i = 0; i < arr.length; i++) {
        // 获取当前元素
        let arrI = arr[i]   

        // 用于二分查找 
        // => 找比当前元素大的第一个元素
        let star;
        let end;
        let middle;


        // 判断当前元素是否为0
        // 如果为0 则为新增元素 不用处理
        // 否则 为复用元素 需要处理
        if (arrI!=0) {
            // 若不为0
            // 获取结果数组中最后一个索引元素
            resultLastIndex=result[result.length-1]
            // 判断结果数组中最后一个索引元素对应的值 与 当前元素的大小关系
            if (arrI>arr[resultLastIndex]) {
                // 若当前元素值大于结果数组中最后一个索引元素对应的值
                // 则将当前元素索引加入结果数组中
                result.push(i) 
                // 让当前元素记住其前一元素的索引
                p[i]= resultLastIndex
            }else{
                // 若当前元素值小于结果数组中最后一个索引元素对应的值
                // 此时需要二分查找结果数组中 索引元素对应的值 大于 当前元素值的第一个索引
                
                // 初始化star end
                star = 0
                end = result.length-1

                // 循环判断
                while(star<end){
                    // 更新middle
                    middle = (star+end)/2|0 //|0 可实现向下取整
                    // 判断middle位置的索引对应的元素值 与 当前元素大小关系
                    if (arr[result[middle]]>arrI) {
                        // 若大于
                        // end 更新为 middle
                        end = middle
                    }else{
                        // 若小于
                        star=middle+1
                    }                    
                }

                // 当star == end时 退出循环
                // 此时 star|end 索引对应的值 是 第一个大于当前元素值的值
                // 更新结果数组
                if (arrI<arr[result[star]]) {
                    p[i]=result[star-1]     //记住替换的元素的前一项
                    result[star]=i
                }
            }
        }


    }

    // 回溯
    // 因为构建结果数组时 存在替换操作 => 原有顺序被打乱
    // 此时 需要利用p中保存的前驱节点信息 从后往前回溯

    // 获取数组长度
    let i = result.length
    // 获取结果数组最后一个索引元素
    let lastIndex = result[i-1]
    while(i-->0){
        result[i] = lastIndex   
        lastIndex = p[lastIndex]    //利用p中保存的前驱节点索引回溯
    }

    // 返回结果数组
    return result
}

getSequence([2,5,8,4,6,7,9,3])

// 求最长递增子序列的个数？？ 
// 1、先求结果数组最后一个元素和当前元素值大小关系
// <1> 若大于 则将当前元素加入结果数组中
// <2> 若小于 则去结果数组中 找比当前元素大的第一个元素 替换即可

// [2 5 8 4 6 7 9 3]
// >[2]     //从第一个元素开始
// >[2 5]   //5 > 2 加入结果数组
// >[2 5 8]     //8 > 5 加入结果数组
// >[2 4 8]     //4 < 8 在结果数组中找第一个大于4的元素 并替换
// >[2 4 6]     //6 < 8 在结果数组中找第一个大于6的元素 并替换
// >[2 4 6 7]   //7 > 6 加入结果数组
// >[2 4 6 7 9] //9 > 7 加入结果数组
// >[3 4 6 7 9] //3 < 9 在结果数组中找第一个大于3的元素 并替换