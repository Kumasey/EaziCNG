const express = require('express');
const nightmare = require('nightmare')()
const passport = require('passport');
const router = express.Router();
const Phone = require("./models/phones");
const Compare = require("./models/compare");
const Cart = require('./models/carts');
const Recent = require('./models/recent');

const User = require('./models/user');
const Order = require('./models/order');


function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  }

  function randomNumber(array){
       return Math.floor(Math.random()*array.length*0.75)
  }


router.use(function (req, res, next) {
    res.locals.login = req.isAuthenticated()
    res.locals.session = req.session;
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash('error');
    res.locals.info = req.flash('info');
    next();
});

router.get('/', (req, res, next)=>{
    User.find()
        .sort({
            createdAt: 'descending'
        })
        .exec(function (err, users) {
            if (err) {
                return next(err);
            }
            
            if(!req.session.recent){
                Phone.find()
                    .then((topdeals)=>{
                    shuffle(topdeals)
                    let newArray = topdeals.slice(0,5)
        
                  
                    shuffle(topdeals)  
                    res.render('index', {users: users, recents: null, deals: topdeals,goldrush:newArray});})
                    
                    .catch((err)=>{
                    console.log(err)})

            } else{
                let recent = new Recent(req.session.recent)
                let allArray = recent.generateArray()
                shuffle(allArray)
                let recentIndexArray = allArray.slice(0,5) 

                    Phone.find()
                    .then((topdeals)=>{
                    shuffle(topdeals)
                    let newArray = topdeals.slice(0,5)
        
                  
                    shuffle(topdeals)  
                    res.render('index', {users: users, recents: recentIndexArray, deals: topdeals,goldrush:newArray});})
                    
                    .catch((err)=>{
                    console.log(err)})
            }
            
               
           

        });
});



router.get('/signup', function (req, res) {
    res.render('registeruser');
})

router.post('/signup', function (req, res, next) {
    var username = req.body.user;
    var email = req.body.email;
    var password = req.body.password;

    User.findOne({
        username: username
    }, function (err, user) {
        if (err) {
            return next(err);
        }
        if (user) {
            req.flash('error', 'User already exists');
            return res.redirect('/login');
        }

        var newUser = new User({
            username: username,
            password: password,
            email :email
        });
        newUser.save((err, result)=>{
           res.redirect('/login')
        });

    });
}, passport.authenticate("login", {
    successRedirect: "/login",
    failureRedirect: "/signup",
    failureFlash: true
}));


router.get('/products', (req, res)=>{
    Phone.find()
    .then((result)=>{

        let recent = new Recent(req.session.recent)
        let fiveArray = recent.generateArray()
        let recentArray = fiveArray.slice(0,5)
        shuffle(recentArray)

      shuffle(result)
      let newArray = result.slice(0,5)
      shuffle(result)

        res.render('productstemplate',{phones: result, counts: result.length, topPicks:newArray, recentViews: recentArray, category: "All Products", title: "All Products"})
    })
    .catch((err)=>{
        console.log(err)
    })
    
})


router.get('/phones/:id',(req,res)=>{
    const id = req.params.id;
   const urll = req.protocol + '://' + req.get('host') + req.originalUrl; 
    const url = req.protocol + '://' + req.hostname + req.originalUrl; 
    const hhh = req.get('host')
    
    const protocol = req.protocol
    //console.log(req.hostname)
   console.log(req.originalUrl)
    //console.log(protocol)
  //  console.log(hhh)
    //console.log(urll)
    //console.log(url)
    Phone.findById(id)
    .then((result)=>{

        let recent = new Recent(req.session.recent ? req.session.recent : {})
        recent.add(result, result.id)
        req.session.recent  = recent;

      //  console.log(result.id)
        let filter = result.name.substring(0,10)
        Phone.find({$text : {$search: filter}})
        .then((filterResult)=>{
            let recent = new Recent(req.session.recent)
            let fiveArray = recent.generateArray()
            let recentArray = fiveArray.slice(0,5)
        shuffle(recentArray)

            shuffle(filterResult)
            res.render("details", {phone: result, other: filterResult[0],recentViews:recentArray})
        })
        
    })
    .catch((err)=>{
        console.log(err)
    })
    
})


router.post('/phones/:id',(req,res)=>{
    const id = req.params.id;
   // console.log(req.body.email)
   // console.log(req.user.username)
   // console.log(req.body.pricedrop)
   // console.log(req.body.price)
   const urll = req.protocol + '://' + req.get('host') + req.originalUrl; 

   console.log(urll)
   checkPrice()

   async function checkPrice(){
      const priceString =  nightmare.goto(urll)
                                    .wait("#main-price")
                                    .evaluate(()=> document.getElementById('main-price').innerText)
                                    .end()
      const priceNumber = Number(priceString.replace(/[^0-9.-]+/g,""))
      if(priceNumber < 200){
          console.log("it's cheap" )
      } else {
          console.log('it is expensive')
      }
    
   }
   
   
    
})


router.get('/phones',(req,res)=>{ 
        Phone.find({$text : {$search: "laptop"}})
        .then((filterResult)=>{
           console.log(filterResult.length)
            res.render("phones", {phones: filterResult, counts: filterResult.length, title: "Phones"})
        })
        .catch((err)=>{
        console.log(err)
        })
    
})


router.get('/add-to-cart/:id',ensureAuthenticated, (req, res, next)=>{
    Order.findOneAndDelete({user:req.user})
    .then((result)=>{
        console.log('order deleted')
        
        let productId = req.params.id;
        let cart = new Cart(req.session.cart ? req.session.cart : {})
        Phone.findById(productId, (err, phone)=>{
           
            if(err){
                return res.redirect('/')
            }
            cart.add(phone, phone.id);
            req.session.cart = cart;

            const order = new Order({
             user: req.user,
             order : cart
         })
          order.save((err, result)=>{
              console.log('new one saved')
             res.redirect('/carts')          
          })
        })
    })
    .catch((err)=>{
        console.log(err)
    })
   
})

router.get('/remove-cart/:id', ensureAuthenticated,(req, res, next)=>{
    Order.findOneAndDelete({user:req.user})
    .then((result)=>{
        console.log('order deleted')
        
        let productId = req.params.id;
        let cart = new Cart(req.session.cart ? req.session.cart : {})
        Phone.findById(productId, (err, phone)=>{
           
            if(err){
                return res.redirect('/')
            }
            cart.remove(phone.id);
            req.session.cart = cart;


        const order = new Order({
             user: req.user,
             order : cart
         })
          order.save((err, result)=>{
              console.log('deleted')
             res.redirect('/carts')
            
          })
    
        })

    })
    .catch((err)=>{
        console.log(err)
    })
   

})

router.get('/carts', (req, res, next)=>{
    if(!req.session.cart){
        return res.render('shoppingcart', {phoneCarts: null, total: null})
    } 
    var cart = new Cart(req.session.cart)
    let fff = cart.generateArray()

    res.render('shoppingcart', {phoneCarts: cart.generateArray(), total: fff.length})
})


//to access in the profile if possible
router.get('/shoppings', ensureAuthenticated, (req, res, next)=>{
    Order.find({user: req.user}, (err, orders)=>{
        if(err){
            return res.write('error')
        }
        
        var cart;
        orders.forEach(function(order){
            cart = new Cart(order.order);
            order.items = cart.generateArray();
        })
        let storedDatas =  cart.generateArray()

       res.render('shoppingcart',{phoneCarts: cart.generateArray(), total: storedDatas.length})
        
    })
})



router.get('/add-to-compare/:id',ensureAuthenticated, (req, res,next)=>{
    let phoneId = req.params.id;
    Phone.findById(phoneId)
    .then((result)=>{
        let user = req.user
        let name = result.name;
        let price = result.price;
        let url = result.url;
        let vendor = result.vendor;
        let discount = result.discount;
        let features = result.features;
        let img = result.img;
        let brand = result.brand;
        let old_price = result.old_price;

        let  newResult = {name, url, brand, price,discount,old_price, img, vendor, features, user} 

        const compare = new Compare(newResult)
        compare.save()
        .then((result)=>{
            console.log("")
            res.redirect('/compare')
        })
        .catch((err)=>{
            console.log(err)
        })
    })
    .catch((err)=>{
        console.log(err)
    })
})

router.get('/compare', (req, res, next)=>{
    Compare.find({user: req.user}).sort({createdAt: -1}).limit(2)
    .then((result)=>{
        
        let filter = result[0].brand
        Phone.find({brand:filter})
        .then((phones)=>{
            shuffle(phones)
            res.render('compare',{compares: result, suggestions: phones})

        })
        .catch((err)=>{
            console.log(err) 
        })
    })
    .catch((err)=>{
        console.log(err)
    })

})



router.get("/users/:username", function (req, res, next) {
    User.findOne({
        username: req.params.username
    }, function (err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(404).send('404: File not found!');
        }
        res.render("profile", {
            user: user
        });
    });
});


router.get('/login', function (req, res) {
    res.render('loginuser')
});


router.post('/login', passport.authenticate('login', {
    successRedirect: "/",
    failureRedirect: "/signup",
    failureFlash: true
}));


router.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});


router.use(function (req, res, next) {
    res.locals.login = req.isAuthenticated()
    res.locals.session = req.session;
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});


router.get("/edit", ensureAuthenticated, function (req, res) {
    res.render("edit");
});


router.post("/edit", ensureAuthenticated, function (req, res, next) {
    req.user.displayName = req.body.displayname;
    req.user.bio = req.body.bio;
    req.user.save(function (err) {
        if (err) {
            next(err);
            return;
        }
        req.flash("info", "Profile updated!");
        res.redirect("/edit");
    });
});



function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        req.flash("info", "You must be logged in to see this page.");
        res.redirect("/login");
    }
}


module.exports = router;