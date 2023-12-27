const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const db = new sqlite3.Database(path.resolve(__dirname, './../database.db'))

const csv = require('csv-parser')
const fs = require('fs')
const results = []


db.serialize(() => {
    // Create a puzzle table
    db.run(`
      CREATE TABLE IF NOT EXISTS puzzle (
        id TEXT PRIMARY KEY,
        fen TEXT NOT NULL,
        moves TEXT NOT NULL,
        rating INT NOT NULL,
        themes TEXT
      )
    `)
})

db.all('SELECT * FROM puzzle', [], (err, puzzles) => {
    if (puzzles.length == 0) {
        fs.createReadStream(path.resolve(__dirname, './../puzzles.csv'))
            .pipe(csv())
            .on('data', (data) => {
                results.push(data)
            })
            .on('end', () => {
                for (let i = 0; i < results.length; i++) {
                    let id = results[i].PuzzleId
                    let fen = results[i].FEN
                    let moves = results[i].Moves
                    let rating = results[i].Rating
                    let themes = results[i].Themes
                    const stmt = db.prepare('INSERT INTO puzzle (id, fen, moves, rating, themes) VALUES (?, ?, ?, ?, ?)');
                    stmt.run(id, fen, moves, rating, themes);
                    stmt.finalize();
                }
            })
    }
})


const router = express.Router()

router.use((req, res, next) => {
    console.log('Time: ', Date.now())
    next()
})

router.post('/puzzles', (req, res) => {
    let email = req.body.email

    if (email) {
        db.get('SELECT rating FROM users WHERE email = ?', [email], (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Internal server error' })
            }
            db.all('SELECT * FROM puzzle WHERE rating BETWEEN ? AND ? ORDER BY RANDOM() LIMIT 20', [user.rating - 200, user.rating + 200], (error, puzzles) => {
                if (error) {
                    return res.status(500).json({ error: 'Internal server error' })
                } else {
                    return res.status(200).json(puzzles)    
                }
            })
        })
    } else {
        db.all('SELECT * FROM puzzle ORDER BY RANDOM() LIMIT 20', [], (err, puzzles) => {
            if (err) {
                return res.status(500).json({ error: 'Internal server error' })
            } else {
                return res.status(200).json(puzzles)
            }
        })
    }
})

router.post('/save-puzzle', (req, res) => {
    let email = req.body.email
    let puzzle = req.body.puzzle

    if (email && puzzle) {
        const stmt = db.prepare('INSERT INTO puzzle (id, fen, moves, rating, themes) VALUES (?, ?, ?, ?, ?)')
        stmt.run(puzzle.id, puzzle.fen, puzzle.moves, puzzle.rating, puzzle.themes)
        stmt.finalize()
        return res.status(201).json({ message: 'Puzzle created successfully' })
    } else {
        return res.status(402).json({ error: 'Invalid data' })
    }
})

module.exports = router
