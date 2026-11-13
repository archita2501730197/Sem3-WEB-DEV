const jwt = require ("jsonwebtoken")

const auth = ( req,res,next)=>{
    //logic
    const token = req.headers.authorization;

    const decoded = jwt.verify(token, 'pintu');
    if (decoded) {
        next()
    } else {
        res.send ({ msg:" Login first and invalid token"})
    }
}
module.exports={auth}

//server code 15 line