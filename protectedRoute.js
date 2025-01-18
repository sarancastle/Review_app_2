var jwt = require('jsonwebtoken');

function productRoute(req,res,next){
    console.log(req.headers)
    const data = req.headers["authorization"]
    console.log(data && data.split(' ')[1])
    const token = (data && data.split(' ')[1])

if(!token){
    res.json({
        message:"Token Not Found"
    })
}else{
    jwt.verify(token, 'ikeyqr', function(err) {
       if(err){
        res.json({
            message:"Token Invalid"
        })
       }else{
        next()
       }
      });
}  
}

module.exports = productRoute