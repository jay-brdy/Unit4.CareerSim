const pg = require('pg');
const client = new pg.Client(process.env.DATABASE_URL || 'postgres://localhost/acme_online_store_db');
const uuid = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT = process.env.JWT || 'shhh';

//completed table
const createTables = async () => {
    const SQL = `
        DROP TABLE IF EXISTS cart_products;
        DROP TABLE IF EXISTS carts;
        DROP TABLE IF EXISTS users;
        DROP TABLE IF EXISTS products;

        CREATE TABLE users(
            id UUID PRIMARY KEY,
            username VARCHAR(20) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
        );
        CREATE TABLE carts(
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES users(id) NOT NULL
        );
        CREATE TABLE products(
            id UUID PRIMARY KEY,
            name VARCHAR(50)
        );
        CREATE TABLE cart_products(
            id UUID PRIMARY KEY,
            cart_id UUID REFERENCES carts(id) NOT NULL,
            product_id UUID REFERENCES products(id) NOT NULL,
            CONSTRAINT unique_cart_id_and_product_id UNIQUE (cart_id, product_id)
        );
    `;
    await client.query(SQL);
};

const createUser = async ({ username, password }) => {
    const SQL = `
    INSERT INTO users(id, username, password) VALUES($1, $2, $3) RETURNING *
  `;
    const response = await client.query(SQL, [uuid.v4(), username, await bcrypt.hash(password, 5)]);
    return response.rows[0];
};

const createProduct = async ({ name }) => {
    const SQL = `
    INSERT INTO products(id, name) VALUES($1, $2) RETURNING *
  `;
    const response = await client.query(SQL, [uuid.v4(), name]);
    return response.rows[0];
};

const createCartProduct = async ({ cart_id, product_id }) => {
    const cartExistsQuery = 'SELECT id FROM carts WHERE id = $1';
    const cartExistsResult = await client.query(cartExistsQuery, [cart_id]);

    if (cartExistsResult.rows.length === 0) {
        throw new Error('Cart does not exist');
    }

    const SQL = `
    INSERT INTO cart_products(id, cart_id, product_id) VALUES($1, $2, $3) RETURNING *
  `;
    const response = await client.query(SQL, [uuid.v4(), cart_id, product_id]);
    return response.rows[0];
};

const destroyCartProduct = async ({ cart_id, id }) => {
    const SQL = `
    DELETE FROM cart_products WHERE cart_id=$1 AND id=$2
  `;
    await client.query(SQL, [cart_id, id]);
};

const authenticate = async ({ username, password }) => {
    const SQL = `
    SELECT id, password, username 
    FROM users 
    WHERE username=$1;
  `;
    const response = await client.query(SQL, [username]);
    if (!response.rows.length || (await bcrypt.compare(password, response.rows[0].password)) === false) {
        const error = Error('not authorized');
        error.status = 401;
        throw error;
    }
    const token = await jwt.sign({ id: response.rows[0].id }, JWT);
    return { token };
};

const findUserWithToken = async (token) => {
    let id;
    try {
        const payload = await jwt.verify(token, JWT);
        id = payload.id
    } catch (ex) {
        const error = Error('not authorized');
        error.status = 401;
        throw error;
    }

    const SQL = `
    SELECT id, username 
    FROM users 
    WHERE id=$1;
  `;
    const response = await client.query(SQL, [id]);
    if (!response.rows.length) {
        const error = Error('not authorized');
        error.status = 401;
        throw error;
    }
    return response.rows[0];
};

const fetchUsers = async () => {
    const SQL = `
    SELECT id, username FROM users;
  `;
    const response = await client.query(SQL);
    return response.rows;
};

const fetchProducts = async () => {
    const SQL = `
    SELECT * FROM products;
  `;
    const response = await client.query(SQL);
    return response.rows;
};

const fetchCartProducts = async (cart_id) => {
    const SQL = `
    SELECT * FROM cart_products where cart_id = $1
  `;
    const response = await client.query(SQL, [cart_id]);
    return response.rows;
};

module.exports = {
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
    findUserWithToken
};
