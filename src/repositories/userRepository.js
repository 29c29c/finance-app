async function findByUsername(db, username) {
  return db.get('SELECT * FROM users WHERE username = ?', [username]);
}

async function createUser(db, username, passwordHash) {
  return db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, passwordHash]);
}

module.exports = {
  findByUsername,
  createUser,
};
