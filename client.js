const RPC = require('@hyperswarm/rpc')
const readline = require('readline')

// Function to start the console interface
async function startServer() {
    const rpc = new RPC()
    const server = rpc.createServer()

    await server.listen()

    console.log('Server is listening at', server.publicKey.toString('hex'))

 
    // Handle opening an auction
    server.respond('new_auction', (req) => {
        const {auctionId, picture, initialPrice } = JSON.parse(req.toString())
        console.log(`Auction ${auctionId} opened: ${picture} for ${initialPrice} USDt`)

    })
    server.respond('place_bid', (req) => {
        const { auctionId, bidder, bidAmount } = JSON.parse(req.toString())
        console.log(`Auction ${auctionId} bidder: ${bidder} for ${bidAmount} USDt`)

    })


    return server.publicKey.toString('hex')
}

function startConsole(client) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    console.log(`
    Welcome to the Auction Client!
    Available commands:
    1. open <auctionId> <picture> <initialPrice> - Open a new auction
    2. bid <auctionId> <yourName> <bidAmount> - Place a bid on an auction
    3. exit - Exit the client
    `)

    rl.on('line', async (input) => {
        const [command, ...args] = input.trim().split(' ')

        switch (command) {
            case 'open':
                if (args.length === 3) {
                    const [auctionId, picture, initialPrice] = args
                    await openAuction(client, auctionId, picture, parseFloat(initialPrice))
                } else {
                    console.log('Usage: open <auctionId> <picture> <initialPrice>')
                }
                break

            case 'bid':
                if (args.length === 3) {
                    const [auctionId, yourName, bidAmount] = args
                    await placeBid(client, auctionId, yourName, parseFloat(bidAmount))
                } else {
                    console.log('Usage: bid <auctionId> <yourName> <bidAmount>')
                }
                break

            case 'exit':
                rl.close()
                client.end() // Close the connection gracefully
                process.exit(0)
                break

            default:
                console.log('Unknown command. Please try again.')
                break
        }
    })
}

// Function to act as an RPC client to interact with the server
async function connectToServer(serverPublicKey) {
    const rpc = new RPC()
    const client = rpc.connect(Buffer.from(serverPublicKey, 'hex'))

    return new Promise((resolve, reject) => {
        client.once('open', () => {
            console.log('Connected to server')
            resolve(client)
        })

        client.once('close', () => {
            console.log('Disconnected from server')
            process.exit(0) // Exit if connection closes unexpectedly
        })

        client.once('error', (error) => {
            console.error('Connection error:', error)
            reject(error)
        })
        client.on('new_bid', (data) => {
            try {
                console.log(data)
                const { method, message } = JSON.parse(data.toString())
                console.log(`Received message: ${method}`, message)
            } catch (error) {
                console.error('Error parsing message:', error)
            }
        })
    })
}

// Open an auction
async function openAuction(client, auctionId, picture, initialPrice) {
    console.log(`Opening auction: ${auctionId} for ${picture} at ${initialPrice} USD`)
    await sendRequest(client, 'open_auction', { auctionId, picture, initialPrice })
}

// Place a bid on an auction
async function placeBid(client, auctionId, bidder, bidAmount) {
    console.log(`Placing bid on auction: ${auctionId} by ${bidder} for ${bidAmount} USD`)
    await sendRequest(client, 'place_bid', { auctionId, bidder, bidAmount })
}

// Function to send a request to the server
async function sendRequest(client, action, payload) {
    try {
        const result = await client.request(action, Buffer.from(JSON.stringify(payload)))
        console.log('Response from server:', result.toString())
    } catch (error) {
        console.error('Error sending request:', error)
    }
}

// Start the console interface and connect to the server
const serverPublicKey = '2b14c72f97970c30a32c96b3783df208ae7c5c4649b2f404b761fd9aaf113bb9' // Replace with actual public key

 startServer().then(mes=>{})
connectToServer(serverPublicKey)
    .then(client => {
        startConsole(client)
    })
    .catch(error => {
        console.error('Failed to connect to the server:', error)
    })
