# OpenBay - NFT Marketplace

A fully functional NFT marketplace built with Next.js and thirdweb, implementing all features from the marketplace implementation blueprint.

## Features

### Phase 1 - Core (MVP) ✅
- ✅ Wallet connection (MetaMask, Coinbase, WalletConnect)
- ✅ Mint NFT with image upload to IPFS
- ✅ Create direct listings (fixed price)
- ✅ Buy NFTs from listings
- ✅ View all active listings
- ✅ View user's owned NFTs

### Phase 2 - Enhanced ✅
- ✅ Cancel/Update listings
- ✅ Make offers on NFTs
- ✅ Filter/Search functionality
- ✅ User profile with stats

### Phase 3 - Advanced ✅
- ✅ Auction listings
- ✅ Place bids on auctions
- ✅ Batch operations support
- ✅ Transaction history tracking

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# thirdweb Configuration (OPTIONAL but recommended to avoid 401 errors)
# Get your client ID from https://thirdweb.com/dashboard
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id_here

# Contract Addresses (REQUIRED for full functionality)
NEXT_PUBLIC_NFT_COLLECTION_ADDRESS=your_nft_collection_address
NEXT_PUBLIC_MARKETPLACE_ADDRESS=your_marketplace_address

# Network (Goerli, Polygon, Ethereum, Mumbai)
# Note: thirdweb v4.x uses Goerli instead of Sepolia
NEXT_PUBLIC_CHAIN=Goerli
```

**Important Notes:**
- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` is optional but recommended. Without it, you may see 401 errors in the console (these are harmless but can be annoying).
- Contract addresses are required for marketplace functionality to work.
- The app will work without a client ID, but thirdweb analytics/telemetry will fail (hence the 401 errors).

### 3. Get thirdweb Client ID

1. Go to [thirdweb Dashboard](https://thirdweb.com/dashboard)
2. Create a new project or use an existing one
3. Copy your Client ID to `.env.local`

### 4. Deploy Contracts

#### Deploy NFT Collection Contract:
1. Go to [thirdweb Dashboard](https://thirdweb.com/dashboard)
2. Navigate to Contracts → Deploy
3. Select "NFT Collection"
4. Deploy to your chosen network (Sepolia recommended for testing)
5. Copy the contract address to `.env.local`

#### Deploy Marketplace Contract:
1. In the same dashboard, select "Marketplace V3"
2. Deploy to the same network
3. Copy the contract address to `.env.local`

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Project Structure

```
openbay/
├── app/                    # Next.js App Router pages
│   ├── page.js            # Homepage
│   ├── layout.js          # Root layout with ThirdwebProvider
│   ├── mint/              # Mint NFT page
│   ├── explore/           # Explore/browse page with filters
│   ├── collections/       # Collections listing
│   ├── listings/          # User's listings management
│   ├── auctions/          # Auctions page
│   ├── profile/           # User profile page
│   └── asset/[address]/[tokenId]/  # NFT detail page
├── components/            # React components
│   ├── NavBar.jsx        # Navigation with wallet connection
│   ├── AssetCard.jsx     # NFT card component
│   ├── ListingCard.jsx   # Listing card component
│   └── ...
├── lib/
│   ├── hooks/            # Custom React hooks
│   │   ├── useWallet.js  # Wallet connection hook
│   │   ├── useContracts.js  # Contract initialization hooks
│   │   ├── useNFTs.js    # NFT fetching hooks
│   │   ├── useMarketplace.js  # Marketplace operations hook
│   │   └── useMinting.js  # NFT minting hook
│   └── utils.js          # Utility functions
└── marketplace implementation.md  # Complete function guide
```

## Usage Guide

### Connecting Wallet

1. Click "Connect Wallet" in the navigation bar
2. Select your wallet (MetaMask, Coinbase, etc.)
3. Approve the connection request

### Minting NFTs

1. Navigate to `/mint`
2. Connect your wallet
3. Upload an image (JPG, PNG, GIF, or WebP, max 10MB)
4. Fill in NFT details (name, description, category, rarity)
5. Click "Mint NFT"
6. Approve the transaction in your wallet

### Creating Listings

1. Go to your profile page (`/profile`)
2. View your owned NFTs
3. Click on an NFT to view details
4. Use the marketplace contract to create a listing (requires approval first)

### Buying NFTs

1. Browse listings on the homepage or explore page
2. Click on an NFT to view details
3. Click "Buy now" if it's a direct listing
4. Approve the transaction in your wallet

### Making Offers

1. View any NFT (even if not listed)
2. Click "Make offer"
3. Enter your offer price
4. Submit the offer
5. The owner can accept your offer later

### Auctions

1. Navigate to `/auctions`
2. View active auctions
3. Enter your bid amount
4. Click "Place Bid" or "Buy Now" (if buyout price is set)
5. After auction ends, winner can claim the NFT

## Key Features

### Wallet Integration
- Multi-wallet support (MetaMask, Coinbase, WalletConnect)
- Balance display
- Network switching support

### NFT Operations
- Mint single NFTs
- Batch minting support
- IPFS image upload
- Metadata management

### Marketplace Operations
- Direct listings (fixed price)
- Auction listings
- Offers system
- Buy now functionality
- Listing management (cancel, update price)

### User Experience
- Responsive design (mobile, tablet, desktop)
- Real-time data updates
- Transaction status tracking
- Error handling with user-friendly messages
- Search and filter functionality

## Development

### Available Scripts

- `npm run dev` - Start development server on port 3001
- `npm run build` - Build for production
- `npm run start` - Start production server

### Testing

1. Use Sepolia testnet for development
2. Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
3. Test all features before deploying to mainnet

## Troubleshooting

### Wallet Connection Issues
- Ensure MetaMask or your wallet is installed
- Check that you're on the correct network
- Try refreshing the page

### Contract Errors
- Verify contract addresses in `.env.local`
- Ensure contracts are deployed to the correct network
- Check that you have the correct permissions

### Transaction Failures
- Ensure you have enough ETH/MATIC for gas fees
- Check that you have sufficient balance for purchases
- Verify network connection

## Notes

- All prices are in native currency (ETH/MATIC)
- Token IDs start from 0
- Always check approval before listing
- Use testnet (Sepolia) for development
- Gas fees vary by network (Polygon is cheaper)
- IPFS upload is automatic with thirdweb
- Metadata follows ERC-721 standard

## License

MIT

## Support

For issues or questions, refer to the [marketplace implementation.md](./marketplace%20implementation.md) file for detailed function documentation.

---

# User Profile & Virtual Wallet System

## Overview

This system implements a centralized wallet architecture where all user ETH is stored in one platform-controlled wallet, with individual user balances tracked in the database. Users can deposit, trade instantly (gas-free), and withdraw to their personal wallets at any time.

### Core Concept
- **One Central Wallet**: All ETH is pooled in a single platform wallet
- **Virtual Balances**: User balances are numbers in MongoDB
- **Instant Transfers**: Marketplace transactions update database only (no blockchain interaction)
- **Withdrawal System**: Users can withdraw their balance to MetaMask anytime

### Benefits
- ✅ **Gas-free trading**: Internal transfers cost nothing
- ✅ **Instant transactions**: No waiting for blockchain confirmations
- ✅ **Better UX**: Users trade like on traditional platforms
- ✅ **Lower barrier**: New users don't need ETH for gas fees

## Environment Variables

Add these to your `.env.local`:

```env
# Platform Wallet (REQUIRED)
PLATFORM_WALLET_ADDRESS=0x1234abcd... # Your platform's main wallet address
PLATFORM_WALLET_PRIVATE_KEY=0x... # Private key for withdrawals (KEEP SECURE!)

# RPC URL (REQUIRED for deposits/withdrawals)
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
# or
NEXT_PUBLIC_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Optional Configuration
DAILY_WITHDRAWAL_LIMIT=50 # ETH per day platform-wide
USER_DAILY_WITHDRAWAL_LIMIT=10 # ETH per day per user
MINIMUM_PLATFORM_BALANCE=10 # Alert if below this
ADMIN_EMAIL=admin@yourplatform.com
ADMIN_EMAILS=admin1@example.com,admin2@example.com
WEBHOOK_SECRET=your-secret-key-for-deposit-webhooks
BALANCE_DISCREPANCY_THRESHOLD=0.01 # Alert if discrepancy > this
REQUIRE_ADMIN_FOR_WITHDRAWALS=false # Set to true to require admin auth
```

## API Endpoints

### Wallet Management

#### `GET /api/wallet/balance`
Get user's virtual wallet balance

**Response:**
```json
{
  "walletAddress": "0x742d35cc...",
  "virtualBalance": 2.5,
  "totalDeposited": 5.0,
  "totalWithdrawn": 2.5,
  "totalEarned": 0.8,
  "totalSpent": 3.3,
  "pendingWithdrawals": 0,
  "availableToWithdraw": 2.5
}
```

#### `GET /api/wallet/transactions`
Get user's transaction history

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `type` (optional: "deposit" | "withdrawal" | "purchase" | "sale" | "all")

#### `GET /api/wallet/deposit-address`
Get platform wallet address for deposits

**Response:**
```json
{
  "address": "0x1234abcd...",
  "chainId": 1,
  "minDeposit": 0.01,
  "notice": "Send ETH to this address..."
}
```

#### `POST /api/wallet/withdraw`
Request withdrawal to MetaMask

**Body:**
```json
{
  "amount": 2.5,
  "destinationAddress": "0x742d35cc..." // Optional, defaults to user's wallet
}
```

#### `GET /api/wallet/withdrawal/:id`
Check withdrawal status

### User Profile

#### `GET /api/user/profile`
Get own profile (includes balance)

#### `GET /api/user/profile?walletAddress=0x...`
Get another user's profile (public, no balance)

#### `PATCH /api/user/profile`
Update own profile

**Body:**
```json
{
  "username": "new_username",
  "bio": "Updated bio",
  "profileImage": "https://..."
}
```

## Deposit Flow

1. User gets deposit address via `GET /api/wallet/deposit-address`
2. User sends ETH to platform wallet via MetaMask
3. System detects deposit (via webhook or polling)
4. `POST /api/webhook/deposit` processes the deposit
5. User's `virtualBalance` is updated

## Withdrawal Flow

1. User requests withdrawal via `POST /api/wallet/withdraw`
2. System validates request (balance, limits, etc.)
3. Withdrawal request is queued
4. Admin endpoint or cron job processes withdrawals: `GET /api/admin/process-withdrawals`
5. ETH is sent from platform wallet to user's address
6. User's balance is deducted

## Withdrawal Processing

Withdrawals can be processed in two ways:

### Option 1: Manual API Call
Call `GET /api/admin/process-withdrawals` periodically (e.g., every 2-5 minutes)

### Option 2: Automated Cron Job
Set up a cron job or scheduled task to call the endpoint:

```javascript
// Example: Using node-cron
import cron from 'node-cron';
import { processPendingWithdrawals } from './lib/withdrawal-processor';

// Run every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  await processPendingWithdrawals({ limit: 10, minWaitMs: 60000 });
});
```

## Database Collections

### Users Collection
- `virtualBalance`: User's ETH balance in platform wallet
- `totalDeposited`: Lifetime deposits
- `totalWithdrawn`: Lifetime withdrawals
- `totalEarned`: Earnings from sales
- `totalSpent`: Spending on purchases

### walletTransactions Collection
Tracks all wallet transactions (deposits, withdrawals, purchases, sales)

### withdrawalRequests Collection
Tracks withdrawal requests and their status

### platformWallet Collection
Single document tracking platform wallet state

## Security Considerations

1. **Platform Wallet Private Key**: Store securely, never commit to git
2. **Webhook Secret**: Use `WEBHOOK_SECRET` to secure deposit webhook
3. **Rate Limiting**: Implement rate limiting on withdrawal endpoints
4. **Balance Reconciliation**: Run daily to detect discrepancies
5. **Manual Review**: Large withdrawals (>10 ETH) should be flagged for review

## Monitoring

### Daily Tasks
- Reset daily withdrawal limits (midnight)
- Reconcile balances
- Check for discrepancies

### Balance Reconciliation
```javascript
import { reconcileBalances } from './lib/wallet-security';

// Run daily
const result = await reconcileBalances();
if (result.alert) {
  // Send alert email
}
```

## Integration with Marketplace

When a user purchases an NFT:

1. Check buyer has sufficient `virtualBalance`
2. Deduct from buyer's balance
3. Add to seller's balance (minus fees)
4. Add platform fee to `platformRevenue`
5. Create transaction records for both parties

All operations use MongoDB transactions for atomicity.

## Example: Purchase Flow

```javascript
// In your marketplace purchase endpoint
import { updateUserBalances, createWalletTransaction, updatePlatformWalletBalance } from './lib/db';

const session = await db.client.startSession();
await session.withTransaction(async () => {
  // Deduct from buyer
  await updateUserBalances([
    { userId: buyerAddress, virtualBalance: -price, totalSpent: price }
  ], session);
  
  // Add to seller (minus fees)
  const sellerReceives = price - platformFee - royaltyFee;
  await updateUserBalances([
    { userId: sellerAddress, virtualBalance: sellerReceives, totalEarned: sellerReceives }
  ], session);
  
  // Update platform revenue
  await updatePlatformWalletBalance({ platformRevenue: platformFee }, session);
  
  // Create transaction records...
});
```

## Troubleshooting

### Withdrawals Not Processing
- Check `RPC_URL` is set correctly
- Verify `PLATFORM_WALLET_PRIVATE_KEY` is correct
- Ensure platform wallet has sufficient ETH for gas
- Check withdrawal processing endpoint is being called

### Deposits Not Detected
- Verify webhook endpoint is accessible
- Check `WEBHOOK_SECRET` matches
- Ensure transaction has 12+ confirmations
- Verify transaction recipient is platform wallet

### Balance Discrepancies
- Run balance reconciliation
- Check for unprocessed deposits/withdrawals
- Verify all transactions are recorded
- Check for duplicate transaction processing

