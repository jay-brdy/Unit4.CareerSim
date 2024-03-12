const {
    client,
    createTables,
    createUser,
    createProduct,
    createFavorite,
    fetchUsers,
    fetchProducts,
    fetchFavorites,
    destroyFavorite,
    authenticate,
    findUserWithToken
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
      res.send(await authenticate(req.body));
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
  
  // retrieves favorites for a specifc user
  app.get('/api/users/:id/favorites', isLoggedIn, async(req, res, next)=> {
    try {
      if(req.params.id !== req.user.id){
        const error = Error('not authorized');
        error.status = 401;
        throw error;
      }
      res.send(await fetchFavorites(req.params.id));
    }
    catch(ex){
      next(ex);
    }
  });
  
  // creates a favorite for a user
  app.post('/api/users/:id/favorites', isLoggedIn, async(req, res, next)=> {
    try {
      if(req.params.id !== req.user.id){
        const error = Error('not authorized');
        error.status = 401;
        throw error;
      }
      res.status(201).send(await createFavorite({ user_id: req.params.id, product_id: req.body.product_id}));
    }
    catch(ex){
      next(ex);
    }
  });
  
  // deletes a favorite of a user
  app.delete('/api/users/:user_id/favorites/:id', isLoggedIn, async(req, res, next)=> {
    try {
      if(req.params.userId !== req.user.id){
        const error = Error('not authorized');
        error.status = 401;
        throw error;
      }
      await destroyFavorite({user_id: req.params.user_id, id: req.params.id });
      res.sendStatus(204);
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
  
  app.use((err, req, res, next)=> {
    console.log(err);
    res.status(err.status || 500).send({ error: err.message ? err.message : err });
  });
  
  // init function 
  const init = async()=> {
    const port = process.env.PORT || 3000;
    await client.connect();
    console.log('connected to database');
  
    await createTables();
    console.log('tables created');
  
    const [moe, lucy, ethyl, curly, foo, bar, bazz, quq, fip] = await Promise.all([
      createUser({ username: 'moe', password: 'm_pw'}),
      createUser({ username: 'lucy', password: 'l_pw'}),
      createUser({ username: 'ethyl', password: 'e_pw'}),
      createUser({ username: 'curly', password: 'c_pw'}),
      createProduct({ name: 'foo' }),
      createProduct({ name: 'bar' }),
      createProduct({ name: 'bazz' }),
      createProduct({ name: 'quq' }),
      createProduct({ name: 'fip' })
    ]);
  
    console.log(await fetchUsers());
    console.log(await fetchProducts());
  
    console.log(await fetchFavorites(moe.id));
    const favorite = await createFavorite({ user_id: moe.id, product_id: foo.id });
    app.listen(port, ()=> console.log(`listening on port ${port}`));
  };
  
  // invoke init function
  init();
  
  