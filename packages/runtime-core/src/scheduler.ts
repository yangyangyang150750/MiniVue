
// 定义任务队列
const queue=[]
// 定义当前任务是否正在执行
let isFlushing = false
// 定义一个成功的promise
let resolvePromise = Promise.resolve()
export const queueJob=(job)=>{
    // 实现去重
    if (!queue.includes(job)) {
        queue.push(job) //任务入队
    }

    // 处理任务队列
    if (!isFlushing) { //若当前任务未执行 则进入逻辑
        // 修改执行状态
        isFlushing=true
        // 执行任务
        resolvePromise.then(()=>{
            // 修改执行状态
            isFlushing=false
            // 拷贝当前任务
            let copy = queue.slice(0)
            // 任务队列置空
            queue.length=0
            // 执行任务
            copy.forEach((job)=>job())
            // 副本置空
            copy.length=0
        })
    }
}