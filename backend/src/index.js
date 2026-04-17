require('dotenv').config();
const express = require('express')
const cors = require('cors')
const path = require('path')
const usersRouter = require('./routes/users')
const authRouter = require('./routes/auth')
const adminRouter = require('./routes/admin')
const depositsRouter = require('./routes/deposits')
const categoriesRouter = require('./routes/categories')
const uploadRouter = require('./routes/upload')
const { authRequired } = require('./middlewares/authMiddleware')
const adminOnly = require('./middlewares/adminOnly')
const migrate = require('./migrate')

const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
	.split(',')
	.map(item => item.trim())
	.filter(Boolean)

app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
				callback(null, true)
				return
			}

			callback(new Error('Not allowed by CORS'))
		},
	}),
)
app.use(express.json())

const localUploadRoot = (process.env.LOCAL_UPLOAD_ROOT || '').trim()
	? path.resolve((process.env.LOCAL_UPLOAD_ROOT || '').trim())
	: path.resolve(process.cwd(), 'uploads')

app.use('/api/uploads', express.static(localUploadRoot))

// Debug: log incoming requests and bodies to help trace frontend requests
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} ${req.method} ${req.url} - body:`, req.body)
	next()
})

app.use('/api/users', usersRouter)
app.use('/api/auth', authRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/deposits', depositsRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/admin', authRequired, adminOnly, adminRouter)

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

async function bootstrap() {
	try {
		await migrate()
		await startServer(START_PORT)
	} catch (err) {
		console.error('Failed to bootstrap backend:', err)
		process.exit(1)
	}
}

bootstrap()
