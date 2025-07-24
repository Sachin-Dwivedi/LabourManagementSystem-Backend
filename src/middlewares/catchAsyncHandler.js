// const catchAsyncHandler = (func)=> async(req,res,next)=>{
//     try {
//         await func(req,res,next)
//     } catch (error) {
//         next(error)
//     }
// }

const catchAsyncHandler = (func)=> (req,res,next)=>{
    Promise.resolve(func(req,res,next)).catch((error)=>next(error))
}
export default catchAsyncHandler;