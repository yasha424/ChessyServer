const express = require('express')
const bodyParser = require('body-parser')
const login = require('./Routers/login-router')
const puzzle = require('./Routers/puzzle-router')

const app = express()
const port = 3000

// app.use(bodyParser.urlencoded({}))
app.use(bodyParser.json())

app.use('/api', login)
app.use('/api', puzzle)

app.get('/', (req, res) => {
    res.send("Hello!");
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})