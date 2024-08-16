const RPC = require('@hyperswarm/rpc')

const auctions = new Map()
const rpcClients = []  // Stores connected peers

async function startServer() {
    const rpcServer = new RPC()
    const server = rpcServer.createServer()

    await server.listen()

    const serverPublicKey = server.publicKey.toString('hex')
    console.log('Server is listening at', serverPublicKey)

    // Handle new peer connections
    server.on('peer', (peer) => {
        console.log('New peer connected:', peer.publicKey.toString('hex'))

        // Store the connected peer
        rpcClients.push(peer)

        // Optional: Send a welcome message or initialization data to the peer
        peer.send(Buffer.from('Welcome to the auction server'))
    })

    // Handle incoming messages from peers
    server.on('message', (message) => {
        console.log('Received message:', message.toString())
        // Handle messages as needed
    })

    // Handle incoming requests
    server.respond('open_auction', async (req) => {
        const { auctionId, picture, initialPrice } = JSON.parse(req.toString())
        const auction = { picture, initialPrice, bids: [], open: true }
        auctions.set(auctionId, auction)
        console.log(`Auction ${auctionId} opened: ${picture} for ${initialPrice} USDt`)
        broadcast('new_auction', { auctionId, picture, initialPrice })
        setTimeout(() => closeAuction(auctionId), 1000 * 60)
        return Buffer.from('Auction opened')
    })

    server.respond('place_bid', async (req) => {
        const { auctionId, bidder, bidAmount } = JSON.parse(req.toString())
        const auction = auctions.get(auctionId)
        if (auction && auction.open) {
            auction.bids.push({ bidder, bidAmount })
            console.log(`Bid placed on ${auctionId}: ${bidAmount} USDt by ${bidder}`)
            broadcast('new_bid', { auctionId, bidder, bidAmount })
            return Buffer.from('Bid placed')
        } else {
            return Buffer.from('Auction not found or closed')
        }
    })

    // Broadcast a message to all connected peers
    function broadcast(method, message) {
        rpcClients.forEach(peer => {
            peer.send(Buffer.from(JSON.stringify({ method, message })))
                .catch(err => console.error(`Error broadcasting to peer ${peer.publicKey.toString('hex')}:`, err))
        })
    }

    // Close an auction and notify clients
    function closeAuction(auctionId) {
        const auction = auctions.get(auctionId)
        if (auction && auction.open) {
            auction.open = false
            const winningBid = auction.bids.reduce(
                (max, bid) => bid.bidAmount > max.bidAmount ? bid : max,
                auction.bids[0] || { bidder: null, bidAmount: 0 }
            )
            console.log(`Auction ${auctionId} closed. Winner: ${winningBid.bidder} with ${winningBid.bidAmount} USDt`)
            broadcast('auction_closed', {
                auctionId,
                winner: winningBid.bidder,
                finalPrice: winningBid.bidAmount
            })
        } else {
            console.log(`Auction ${auctionId} already closed or does not exist.`)
        }
    }
}

startServer().catch(error => {
    console.error('Error starting server:', error)
})
