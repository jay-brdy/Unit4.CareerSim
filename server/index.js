const {
    client,
    createTables,
    createUser,
    createCart,
    createProduct,
    createCartProduct,
    fetchUsers,
    fetchCart,
    fetchProducts,
    fetchCartProducts,
    destroyCartProduct,
    authenticate,
    findUserWithToken,
    updateCartProductQuantity,
    checkoutCart
  } = require('./db');
  const express = require('express');
  const app = express();
  app.use(express.json());
  
  //for deployment only
  const path = require('path');
  app.get('/', (req, res)=> res.sendFile(path.join(__dirname, '../client/dist/index.html')));
  app.use('/assets', express.static(path.join(__dirname, '../client/dist/assets'))); 
  
  // check if user is logged in
  const isLoggedIn = async(req, res, next)=> {
    try {
      req.user = await findUserWithToken(req.headers.authorization);
      next();
    }
    catch(ex){
      next(ex);
    }
  };
  
  // user auth
  app.post('/api/auth/login', async(req, res, next)=> {
    try {
      const { token } = await authenticate(req.body);
      const user = await findUserWithToken(token);
      const cart = await fetchCart(user.id);
      res.send({ token, user, cart });
    }
    catch(ex){
      next(ex);
    }
  });
  
  // retrieves user information
  app.get('/api/auth/me', isLoggedIn, async(req, res, next)=> {
    try {
      res.send(req.user);
      //res.send(await findUserWithToken(req.headers.authorization));
    }
    catch(ex){
      next(ex);
    }
  });
  
  // retrieves all users
  app.get('/api/users', async(req, res, next)=> {
    try {
      res.send(await fetchUsers());
    }
    catch(ex){
      next(ex);
    }
  });
  
  // retrieves entire cart with products for a specifc user
  app.get('/api/carts/:id/cart_products', isLoggedIn, async(req, res, next)=> {
    try {
      if(req.params.id !== req.user.id){
        const error = Error('not authorized');
        error.status = 401;
        throw error;
      }
      res.send(await fetchCartProducts(req.params.id));
    }
    catch(ex){
      next(ex);
    }
  });

   // retrieves all products
   app.get('/api/products', async(req, res, next)=> {
    try {
      res.send(await fetchProducts());
    }
    catch(ex){
      next(ex);
    }
  });
  
  // creates a product inside cart for a user
  app.post('/api/carts/:id/cart_products', isLoggedIn, async(req, res, next)=> {
    try {
      if(req.params.id !== req.user.id){
        const error = Error('not authorized');
        error.status = 401;
        throw error;
      }
      res.status(201).send(await createCartProduct({ cart_id: req.params.id, product_id: req.body.product_id}));
    }
    catch(ex){
      next(ex);
    }
  });

  // edit cart - change quantity or remove product 0
  app.put('/api/carts/:cart_id/cart_products/:id', isLoggedIn, async(req, res, next)=> {
    try {
      if(req.params.cart_id !== req.user.id){
        const error = Error('not authorized');
        error.status = 401;
        throw error;
      }
      const { quantity } = req.body;
      await updateCartProductQuantity({ cart_id: req.params.cart_id, product_id: req.params.id, quantity });
      res.sendStatus(204);
    } catch (ex) {
      next(ex);
    }
  });

  // proceeds to checkout
  app.post('/api/carts/:cart_id/checkout', isLoggedIn, async(req, res, next)=> {
    try {
        if (req.params.cart_id !== req.user.id) {
            const error = Error('not authorized');
            error.status = 401;
            throw error;
        }
        await checkoutCart(req.params.cart_id);
        res.send({ message: 'Checkout successful!' });
    } catch(ex) {
        next(ex);
    }
});
  
  // deletes a product from a cart of a user
  app.delete('/api/carts/:cart_id/cart_products/:id', isLoggedIn, async(req, res, next)=> {
    try {
      if(req.params.cart_id !== req.user.id){
        const error = Error('not authorized');
        error.status = 401;
        throw error;
      }
      await destroyCartProduct({cart_id: req.params.cart_id, id: req.params.id });
      res.sendStatus(204);
    }
    catch(ex){
      next(ex);
    }
  });
  
  app.use((err, req, res, next)=> {
    console.log(err);
    res.status(err.status || 500).send({ error: err.message ? err.message : err });
  });

  // ADMIN abilities

  // admin see all users

  // admin add product

  // admin update/edit product

  // admin delete product from inventory


  
  // init function 
  const init = async()=> {
    const port = process.env.PORT || 3000;
    await client.connect();
    console.log('connected to database');
  
    await createTables();
    console.log('tables created');
  
    const [moe, lucy, ethyl, jay, tshirt, jacket, hat, socks, sticker] = await Promise.all([
      createUser({ username: 'moe', password: 'm_pw'}),
      createUser({ username: 'lucy', password: 'l_pw'}),
      createUser({ username: 'ethyl', password: 'e_pw'}),
      createUser({ username: 'jay', password: 'j_pw', is_admin: true}),
      createProduct({
         name: 'tshirt',
         description: 'a very cool tshirt',
         price: 25.00,
         inventory: 100
      }),
      createProduct({ 
         name: 'jacket',
         description: 'a very comfy jacket',
         price: 50.00,
         inventory: 100
      }),
      createProduct({ 
         name: 'hat',
         description: 'an accessory to block the sun',
         price: 15.00,
         inventory: 100
      }),
      createProduct({ 
         name: 'socks',
         description: 'a garment to keep your toes protected',
         price: 10.00,
         inventory: 100
      }),
      createProduct({
         name: 'sticker',
         description: 'show your support by representing us',
         price: 3.00,
         inventory: 100 
      })
    ]);
  
    console.log(await fetchUsers());
    console.log(await fetchProducts());
  
    console.log(await fetchCartProducts(moe.id));
    const cart_product = await createCartProduct({ cart_id: moe.id, product_id: tshirt.id });
    app.listen(port, ()=> console.log(`listening on port ${port}`));
  };
  
  // invoke init function
  init();
  
  