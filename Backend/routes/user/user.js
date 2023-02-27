const { DataBrew } = require('aws-sdk');
const express = require('express');
const router = express.Router();
const userRole = require('../../isUser');


router.get('/ViewProfile',userRole.isUser,(req,res)=>{
    // console.log(req.session.user.idToken);
    res.render('user/viewprofile',{userData:req.session.user.idToken})
})



module.exports = router;
