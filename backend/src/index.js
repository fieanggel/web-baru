require('dotenv').config();
const express = require('express')
const cors = require('cors')
const usersRouter = require('./routes/users')

const app = express()
app.use(cors())
app.use(express.json())

// Debug: log incoming requests and bodies to help trace frontend requests
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} ${req.method} ${req.url} - body:`, req.body)
	next()
})

app.use('/api/users', usersRouter)

const http = require('http')
const START_PORT = process.env.PORT ? Number(process.env.PORT) : 4000

async function startServer(port, attemptsLeft = 10) {
	const server = http.createServer(app)

	server.on('error', (err) => {
		if (err.code === 'EADDRINUSE') {
			if (attemptsLeft > 0) {
				const next = port + 1
				console.warn(`Port ${port} is in use, trying ${next}...`)
				setTimeout(() => startServer(next, attemptsLeft - 1), 100)
				return
			}
			console.error(`All attempted ports are in use. Set a different PORT environment variable or free a port.`)
			process.exit(1)
		}
		console.error(err)
		process.exit(1)
	})

	server.listen(port, () => console.log(`Backend listening on http://localhost:${port}`))
}

startServer(START_PORT)
