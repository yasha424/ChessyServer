const express = require('express')
require('dotenv').config()
const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('../database.db')
const { passwordStrength } = require('check-password-strength')

db.serialize(() => {
    // Create a users table with a password field
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        rating INT DEFAULT 1200 NOT NULL,
        bio TEXT
      )
    `)
})

function validatePassword(password) {
    let errors = [];
    if (password.length < 8) {
        errors.push("Your password must be at least 8 characters"); 
    }
    if (password.search(/[A-Z]/i) < 0) {
        errors.push("Your password must contain at least one uppercase letter.");
    }
    if (password.search(/[0-9]/) < 0) {
        errors.push("Your password must contain at least one digit."); 
    }
    return errors;
}

const router = express.Router()

router.use((req, res, next) => {
    console.log('Time: ', Date.now())
    next()
})

router.post('/login', (req, res) => {
    if (req.body.email && req.body.password) {
        db.get('SELECT * FROM users WHERE email = ?', [req.body.email], (err, user) => {
            if (user) {
                if (user.password == req.body.password) {
                    return res.status(200).json(user)
                } else {
                    return res.status(401).json({ error: "Wrong password" })
                }
            } else {
                return res.status(404).json({ error: 'User not found' })
            }
        })
    } else {
        return res.status(422).json({ error: 'Request body is missing required parameters' })
    }
})

const validateEmail = (email) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,:\s@"]+(\.[^<>()[\]\\.,:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        )
}

router.post('/register', (req, res) => {
    const { username, email, password } = req.body
    if (username && email && password) {
        if (validatePassword(password).length != 0) {
            return res.status(422).json({ error: 'Password is too weak' })
        } else if (username.length < 4) {
            return res.status(422).json({ error: 'Username should be longer than 4 characters' })
        } else if (email.length < 4 || !validateEmail(email)) {
            return res.status(422).json({ error: 'Invalid email' })
        } else {
            db.get(
                'SELECT id, username, email FROM users WHERE email = ? OR username = ?',
                [email, username], (err, user) => {
                    if (user) {
                        return res.status(409).json({ error: 'User already exists' })
                    } else {
                        const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)')
                        stmt.run(username, email, password)
                        stmt.finalize()
                        return res.status(201).json({ message: 'User created successfully' })
                    }
                })
        }
    } else {
        return res.status(422).json({ error: 'Request body is missing required parameters' })
    }
})

router.put('/users/:userEmail/bio', (req, res) => {
    const email = req.params.userEmail
    const bio = req.body.bio

    if (email && bio) {
        db.run('UPDATE users SET bio = ? WHERE email = ?', [bio, email], (err, user) => {
            if (err) {
                console.error(err.message)
                return res.status(500).json({ error: 'Internal server error' })
            }
            return res.status(200).json({ message: 'User bio updated successfully' })
        })    
    } else {
        return res.status(422).json({ error: 'Request body is missing required parameters' })
    }
})

router.put('/users/:userEmail/username', (req, res) => {
    const email = req.params.userEmail
    const username = req.body.username

    if (email && username) {
        db.run('UPDATE users SET username = ? WHERE email = ?', [username, email], (err, user) => {
            if (err) {
                console.error(err.message)
                return res.status(500).json({ error: 'Internal server error' })
            }
            return res.status(200).json({ message: 'Username updated successfully' })
        })    
    } else {
        return res.status(422).json({ error: 'Request body is missing required parameters' })
    }
})


module.exports = router