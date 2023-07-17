const mysql = require('mysql2');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const pool = mysql.createPool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB,
    multipleStatements: true
});

// Create tables if they don't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    forename VARCHAR(255) NOT NULL,
    surname VARCHAR(255) NOT NULL,
    street VARCHAR(255) NOT NULL,
    zip INT NOT NULL,
    city VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    invoice VARCHAR(255) NOT NULL,
    paid BOOLEAN NOT NULL,
    uuid VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_articles (
    order_id INT,
    article_id INT,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (article_id) REFERENCES articles(id)
  );
  
  CREATE TABLE IF NOT EXISTS master (
    role VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
  );
`, (error, results) => {
    if (error) {
        console.error('Error creating tables:', error);
        return;
    }
    console.log('Tables created successfully');
});


/* ROLE MASTER */
function createMaster(master, callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to database:', err);
            callback(err, null);
            return;
        }

        const { role, password } = master;

        // Generate a salt
        bcrypt.genSalt(10, (saltError, salt) => {
            if (saltError) {
                console.error('Error generating salt:', saltError);
                callback(saltError, null);
                return;
            }

            // Hash the password with the generated salt
            bcrypt.hash(password, salt, (hashError, hashedPassword) => {
                if (hashError) {
                    console.error('Error hashing password:', hashError);
                    callback(hashError, null);
                    return;
                }

                const query = `INSERT INTO master (role, password) VALUES (?, ?)`;
                const values = [role, hashedPassword];

                connection.query(query, values, (error, results) => {
                    connection.release(); // Release the connection back to the pool

                    if (error) {
                        console.error('Error executing query:', error);
                        callback(error, null);
                        return;
                    }

                    callback(null, results);
                });
            });
        });
    });
}

function getMaster(role, password, callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to database:', err);
            callback(err, null);
            return;
        }

        const query = 'SELECT * FROM master WHERE role = ?';
        const values = [role];

        connection.query(query, values, (error, results) => {
            connection.release(); // Release the connection back to the pool

            if (error) {
                console.error('Error executing query:', error);
                callback(error, null);
                return;
            }

            if (results.length === 0) {
                // No master record found with the given id
                callback(null, null);
                return;
            }

            const master = results[0];
            bcrypt.compare(password, master.password, (err, isMatch) => {
                if (err) {
                    console.error('Error comparing passwords:', err);
                    callback(err, null);
                    return;
                }

                if (!isMatch) {
                    // Password does not match
                    callback(null, null);
                    return;
                }

                callback(null, master);
            });
        });
    });
}




/* USER */


function createUser(user, callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to database:', err);
            callback(err, null);
            return;
        }

        const { email, forename, surname, street, zip, city, country } = user;
        const query = `INSERT INTO users (email, forename, surname, street, zip, city, country) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const values = [email, forename, surname, street, zip, city, country];

        connection.query(query, values, (error, results) => {
            connection.release(); // Release the connection back to the pool

            if (error) {
                console.error('Error executing query:', error);
                callback(error, null);
                return;
            }

            callback(null, results.insertId);
        });
    });
}

function getUser(userId, callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to database:', err);
            callback(err, null);
            return;
        }

        const query = `SELECT * FROM users WHERE id = ?`;
        const values = [userId];

        connection.query(query, values, (error, results) => {
            connection.release(); // Release the connection back to the pool

            if (error) {
                console.error('Error executing query:', error);
                callback(error, null);
                return;
            }

            if (results.length === 0) {
                callback(null, null); // User not found
                return;
            }

            const user = results[0];
            callback(null, user);
        });
    });
}

function updateUser(userId, updatedUser, callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to database:', err);
            callback(err, null);
            return;
        }

        const { email, forename, surname, street, zip, city, country } = updatedUser;
        const query = `UPDATE users SET email = ?, forename = ?, surname = ?, street = ?, zip = ?, city = ?, country = ? WHERE id = ?`;
        const values = [email, forename, surname, street, zip, city, country, userId];

        connection.query(query, values, (error, results) => {
            connection.release(); // Release the connection back to the pool

            if (error) {
                console.error('Error executing query:', error);
                callback(error, null);
                return;
            }

            callback(null, results.affectedRows);
        });
    });
}


function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.error('Error connecting to database:', err);
                reject(err);
                return;
            }

            const query = `SELECT * FROM users WHERE email = ?`;
            const values = [email];

            connection.query(query, values, (error, results) => {
                connection.release(); // Release the connection back to the pool

                if (error) {
                    console.error('Error executing query:', error);
                    reject(error);
                    return;
                }

                if (results.length === 0) {
                    resolve(null); // User not found
                    return;
                }

                const user = results[0];
                resolve(user);
            });
        });
    });
}


function checkUserExists(email) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.error('Error connecting to database:', err);
                reject(err);
                return;
            }

            const query = `SELECT * FROM users WHERE email = ?`;
            const values = [email];

            connection.query(query, values, (error, results) => {
                connection.release(); // Release the connection back to the pool

                if (error) {
                    console.error('Error executing query:', error);
                    reject(error);
                    return;
                }

                const userExists = results.length > 0;
                resolve(userExists);
            });
        });
    });
}



/* ARTICLES */


function createArticle(article, callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to database:', err);
            callback(err, null);
            return;
        }

        const { title, price, description } = article;
        const query = `INSERT INTO articles (title, price, description) VALUES (?, ?, ?)`;
        const values = [title, price, description];

        connection.query(query, values, (error, results) => {
            connection.release(); // Release the connection back to the pool

            if (error) {
                console.error('Error executing query:', error);
                callback(error, null);
                return;
            }

            callback(null, results.insertId);
        });
    });
}

function getArticle(articleId, callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to database:', err);
            callback(err, null);
            return;
        }

        const query = `SELECT * FROM articles WHERE id = ?`;
        const values = [articleId];

        connection.query(query, values, (error, results) => {
            connection.release(); // Release the connection back to the pool

            if (error) {
                console.error('Error executing query:', error);
                callback(error, null);
                return;
            }

            if (results.length === 0) {
                callback(null, null); // Article not found
                return;
            }

            const article = results[0];
            callback(null, article);
        });
    });
}

function updateArticle(articleId, updatedArticle, callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to database:', err);
            callback(err, null);
            return;
        }

        const { title, price, description } = updatedArticle;
        const query = `UPDATE articles SET title = ?, price = ?, description = ? WHERE id = ?`;
        const values = [title, price, description, articleId];

        connection.query(query, values, (error, results) => {
            connection.release(); // Release the connection back to the pool

            if (error) {
                console.error('Error executing query:', error);
                callback(error, null);
                return;
            }

            callback(null, results.affectedRows);
        });
    });
}

function getArticles(callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to database:', err);
            callback(err, null);
            return;
        }

        connection.query('SELECT * FROM articles', (error, results) => {
            connection.release(); // Release the connection back to the pool

            if (error) {
                console.error('Error executing query:', error);
                callback(error, null);
                return;
            }

            callback(null, results);
        });
    });
}



/* ORDERS */


function getOrders(callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to database:', err);
            callback(err, null);
            return;
        }

        connection.query('SELECT * FROM orders', (error, results) => {
            connection.release(); // Release the connection back to the pool

            if (error) {
                console.error('Error executing query:', error);
                callback(error, null);
                return;
            }

            callback(null, results);
        });
    });
}

async function createOrder(order, callback) {
    const uuid = generateUUID(); // Generate random UUID code
    const invoiceId = generateInvoiceID();

    try {
        const connection = await getConnection();

        let user = await getUserByEmail(order.email);

        console.log(user);

        // Check if the user exists
        if (!user) {
            // Create a new user
            const createdUserId = await createUser({
                email: order.email,
                forename: '',
                surname: '',
                street: '',
                zip: 0,
                city: '',
                country: '',
            }, async (error, userId) => {
                if (error) {
                    console.error('Error creating user:', error);
                    return;
                }

                user = {
                    id: userId,
                    email: order.email,
                    forename: '',
                    surname: '',
                    street: '',
                    zip: 0,
                    city: '',
                    country: '',
                };

                const createdOrder = await createOrderInDatabase(connection, user, order, invoiceId, uuid);
                callback(null, createdOrder);
            });
        } else {
            const createdOrder = await createOrderInDatabase(connection, user, order, invoiceId, uuid);
            callback(null, createdOrder);
        }
    } catch (error) {
        console.error('Error connecting to database:', error);
        callback(error, null);
    }
}

function addArticlesToOrder(order, callback) {
    pool.getConnection(async (err, connection) => {
        if (err) {
            console.error('Error connecting to database:', err);
            callback(err, null);
            return;
        }

        const addedArticles = await addOrderArticles(connection, order.id, order.articles);

        callback(null, addedArticles);
    });
}


async function addOrderArticles(connection, orderId, articles) {
    try {
        // Check if the articles array is not empty
        if (articles && articles.length > 0) {
            // Prepare the SQL statement to insert order articles
            const sql = 'INSERT INTO order_articles (order_id, article_id) VALUES (?, ?)';

            // Iterate over the articles and execute the SQL statement for each article
            for (const articleId of articles) {
                await connection.execute(sql, [orderId, articleId]);
            }
        }
    } catch (error) {
        throw error;
    }
}


function getConnection() {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(connection);
        });
    });
}

function createOrderInDatabase(connection, user, order, invoiceId, uuid) {
    const { id: userId } = user;
    const { title, paid } = order;

    const query = `INSERT INTO orders (user_id, title, invoice, paid, uuid) VALUES (?, ?, ?, ?, ?)`;
    const values = [userId, title, invoiceId, 0, uuid];

    return new Promise((resolve, reject) => {
        connection.query(query, values, (error, results) => {
            connection.release(); // Release the connection back to the pool

            if (error) {
                console.error('Error executing query:', error);
                reject(error);
                return;
            }

            const createdOrder = {
                id: results.insertId,
                user_id: userId,
                title: title,
                invoice: invoiceId,
                paid: 0,
                uuid: uuid,
            };

            resolve(createdOrder);
        });
    });
}




function generateUUID() {
    const uuidLength = 64; // UUID length is 32 characters
    const maxLength = 255; // Maximum allowed length for the 'uuid' column

    // Generate a UUID
    let uuid = crypto.randomBytes(uuidLength / 2).toString('hex');

    // Trim or truncate the UUID to the maximum allowed length
    if (uuid.length > maxLength) {
        uuid = uuid.substr(0, maxLength);
    }

    return uuid;
}


function generateInvoiceID() {
    const minDigits = 1000; // Minimum number with 4 digits
    const maxDigits = 999999; // Maximum number with 6 digits
    const randomNumber = Math.floor(Math.random() * (maxDigits - minDigits + 1) + minDigits);
    const currentYear = new Date().getFullYear().toString();
    return randomNumber.toString() + currentYear.toString();
}


function updateOrder(orderUUID, updatedOrder, callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to database:', err);
            callback(err, null);
            return;
        }

        const { user_id, paid } = updatedOrder;
        const query = `UPDATE orders SET user_id = ?, paid = ? WHERE uuid = ?`;
        const values = [user_id, paid, orderUUID];

        connection.query(query, values, (error, results) => {
            connection.release(); // Release the connection back to the pool

            if (error) {
                console.error('Error executing query:', error);
                callback(error, null);
                return;
            }

            callback(null, results.affectedRows);
        });
    });
}


function getOrder(orderId, callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to database:', err);
            callback(err, null);
            return;
        }

        const query = `
      SELECT orders.*, users.id AS user_id, users.email, users.forename, users.surname, users.street, users.zip, users.city, users.country, articles.id AS article_id, articles.title AS article_title, articles.price AS article_price, articles.description AS article_description
      FROM orders
      LEFT JOIN order_articles ON orders.id = order_articles.order_id
      LEFT JOIN articles ON order_articles.article_id = articles.id
      LEFT JOIN users ON orders.user_id = users.id
      WHERE orders.id = ? OR orders.uuid = ?
    `;
        const values = [orderId, orderId];

        connection.query(query, values, (error, results) => {
            connection.release(); // Release the connection back to the pool

            if (error) {
                console.error('Error executing query:', error);
                callback(error, null);
                return;
            }

            if (results.length === 0) {
                callback(null, null); // Order not found
                return;
            }

            const order = {
                // id: results[0].id,
                title: results[0].title,
                invoice: results[0].invoice,
                user: {
                    id: results[0].user_id,
                    email: results[0].email,
                    forename: results[0].forename,
                    surname: results[0].surname,
                    street: results[0].street,
                    zip: results[0].zip,
                    city: results[0].city,
                    country: results[0].country
                },
                paid: results[0].paid,
                uuid: results[0].uuid,
                articles: []
            };

            results.forEach(row => {
                if (row.article_id) {

                    const article = {
                        // id: row.article_id,
                        title: row.article_title,
                        price: parseFloat(row.article_price),
                        description: row.article_description
                    };
                    order.articles.push(article);
                }
            });

            callback(null, order);
        });
    });
}

/* EXPORTS */

module.exports = {
    // ORDERS
    getOrders,
    getOrder,
    createOrder,
    updateOrder,
    addArticlesToOrder,

    // ARTICLE
    getArticle,
    createArticle,
    updateArticle,
    getArticles,

    // USER
    getUser,
    createUser,
    checkUserExists,
    getUserByEmail,
    updateUser,

    // MASTER
    createMaster,
    getMaster,
};
