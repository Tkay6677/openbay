# Login Page Documentation

## Overview

A dual authentication system that allows users to sign in with **Google OAuth** (via Supabase) OR **Web3 Wallet** (MetaMask/WalletConnect), with seamless account linking.

---

## Login Page Design

### Visual Layout

```
┌─────────────────────────────────────────────┐
│                                             │
│              [Your Logo]                    │
│                                             │
│        Welcome to NFT Marketplace           │
│     Trade digital collectibles instantly     │
│                                             │
│   ┌───────────────────────────────────┐   │
│   │                                   │   │
│   │   [🔗 Connect Wallet]            │   │
│   │   Sign in with MetaMask           │   │
│   │                                   │   │
│   └───────────────────────────────────┘   │
│                                             │
│   ┌───────────────────────────────────┐   │
│   │                                   │   │
│   │   [G] Continue with Google        │   │
│   │                                   │   │
│   └───────────────────────────────────┘   │
│                                             │
│              ─── OR ───                     │
│                                             │
│   ┌───────────────────────────────────┐   │
│   │  📧 Email: ________________       │   │
│   │  🔒 Password: _____________       │   │
│   │                                   │   │
│   │        [Sign In]                  │   │
│   │                                   │   │
│   │  Forgot password? | Sign Up       │   │
│   └───────────────────────────────────┘   │
│                                             │
│  By continuing, you agree to our            │
│  Terms of Service and Privacy Policy        │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Authentication Flow

### Option 1: Wallet Login (Primary Method)

```
User Journey:
1. Click "Connect Wallet" button
2. Choose wallet provider (MetaMask/WalletConnect)
3. Approve connection in wallet
4. Sign message to verify ownership
5. System checks if wallet exists in DB
   - If exists: Login successful
   - If new: Create account with wallet
6. Redirect to dashboard
```

### Option 2: Google OAuth (Secondary Method)

```
User Journey:
1. Click "Continue with Google"
2. Google OAuth popup opens
3. User selects Google account
4. Supabase handles authentication
5. System checks if email exists in DB
   - If exists: Login successful
   - If new: Prompt to link wallet (optional)
6. Redirect to dashboard
```

### Option 3: Email/Password (Traditional)

```
User Journey:
1. Enter email and password
2. Click "Sign In"
3. Supabase verifies credentials
4. Login successful
5. Prompt to link wallet (optional)
6. Redirect to dashboard
```

---

## Implementation Code

### Frontend - Login Page ComponentLet me fix that - React artifacts shouldn't use HTML form elements:Now let me document the complete backend authentication system:

---

## Backend API Implementation

### 1. Wallet Authentication Endpoint

```javascript
// /api/auth/wallet-login
import { verifyMessage } from 'ethers';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';

export async function POST(request) {
  try {
    const { walletAddress, message, signature } = await request.json();

    // 1. Verify the signature
    const recoveredAddress = verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return Response.json({ 
        success: false, 
        message: 'Invalid signature' 
      }, { status: 401 });
    }

    // 2. Connect to MongoDB
    const db = await connectDB();
    
    // 3. Check if user exists
    let user = await db.collection('users').findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });

    // 4. Create new user if doesn't exist
    if (!user) {
      const newUser = {
        walletAddress: walletAddress.toLowerCase(),
        authMethod: 'wallet',
        virtualBalance: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        totalEarned: 0,
        totalSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      };

      const result = await db.collection('users').insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    } else {
      // Update last login
      await db.collection('users').updateOne(
        { walletAddress: walletAddress.toLowerCase() },
        { $set: { lastLoginAt: new Date() } }
      );
    }

    // 5. Generate JWT token
    const token = jwt.sign(
      { 
        walletAddress: user.walletAddress,
        userId: user._id.toString()
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 6. Return success with token
    return Response.json({
      success: true,
      token,
      user: {
        walletAddress: user.walletAddress,
        virtualBalance: user.virtualBalance,
        isNewUser: !user.username // Flag if profile incomplete
      }
    });

  } catch (error) {
    console.error('Wallet login error:', error);
    return Response.json({ 
      success: false, 
      message: 'Authentication failed' 
    }, { status: 500 });
  }
}
```

### 2. Google OAuth Callback

```javascript
// /api/auth/callback
import { createClient } from '@/lib/supabase';
import { connectDB } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    // 1. Exchange code for session
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) throw error;

    const { user: supabaseUser } = data;

    // 2. Connect to MongoDB
    const db = await connectDB();

    // 3. Check if user exists in MongoDB
    let user = await db.collection('users').findOne({ 
      supabaseId: supabaseUser.id 
    });

    // 4. Create new user if doesn't exist
    if (!user) {
      const newUser = {
        supabaseId: supabaseUser.id,
        email: supabaseUser.email,
        authMethod: 'google',
        username: supabaseUser.user_metadata.full_name || supabaseUser.email.split('@')[0],
        profileImage: supabaseUser.user_metadata.avatar_url,
        virtualBalance: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        totalEarned: 0,
        totalSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      };

      const result = await db.collection('users').insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    } else {
      // Update last login
      await db.collection('users').updateOne(
        { supabaseId: supabaseUser.id },
        { $set: { lastLoginAt: new Date() } }
      );
    }

    // 5. Generate JWT token
    const token = jwt.sign(
      { 
        supabaseId: user.supabaseId,
        userId: user._id.toString(),
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 6. Redirect to dashboard with token
    return Response.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?token=${token}`
    );

  } catch (error) {
    console.error('OAuth callback error:', error);
    return Response.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=auth_failed`
    );
  }
}
```

### 3. Link Wallet to Google Account

```javascript
// /api/auth/link-wallet
import { verifyMessage } from 'ethers';
import { connectDB } from '@/lib/mongodb';
import { verifyJWT } from '@/lib/auth';

export async function POST(request) {
  try {
    // 1. Verify user is authenticated
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const decoded = verifyJWT(token);

    const { walletAddress, message, signature } = await request.json();

    // 2. Verify wallet signature
    const recoveredAddress = verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return Response.json({ 
        success: false, 
        message: 'Invalid signature' 
      }, { status: 401 });
    }

    // 3. Check if wallet is already linked to another account
    const db = await connectDB();
    const existingWallet = await db.collection('users').findOne({
      walletAddress: walletAddress.toLowerCase(),
      _id: { $ne: decoded.userId }
    });

    if (existingWallet) {
      return Response.json({ 
        success: false, 
        message: 'Wallet already linked to another account' 
      }, { status: 400 });
    }

    // 4. Link wallet to user account
    await db.collection('users').updateOne(
      { _id: decoded.userId },
      { 
        $set: { 
          walletAddress: walletAddress.toLowerCase(),
          updatedAt: new Date()
        }
      }
    );

    return Response.json({
      success: true,
      message: 'Wallet linked successfully',
      walletAddress: walletAddress.toLowerCase()
    });

  } catch (error) {
    console.error('Link wallet error:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to link wallet' 
    }, { status: 500 });
  }
}
```

---

## Authentication States & Scenarios

### Scenario 1: New User - Wallet First
```
1. User clicks "Connect Wallet"
2. Signs message in MetaMask
3. System creates new account with wallet
4. Redirects to onboarding/profile setup
5. User can optionally link Google account later
```

### Scenario 2: New User - Google First
```
1. User clicks "Continue with Google"
2. Completes Google OAuth
3. System creates account with email
4. Redirects to dashboard
5. Prompts to link wallet for deposits/withdrawals
6. User connects wallet when ready to trade
```

### Scenario 3: Existing User - Multiple Devices
```
1. User has account (wallet linked)
2. On new device, clicks "Connect Wallet"
3. System recognizes wallet address
4. Logs in immediately
5. Session created
```

### Scenario 4: Existing User - Lost Wallet Access
```
1. User has account (Google + wallet linked)
2. Loses access to wallet
3. Logs in with Google
4. Can still access account
5. Can link new wallet address
6. Old wallet balance remains accessible
```

---

## Security Features

### JWT Token Structure

```javascript
{
  walletAddress: "0x742d35cc...", // If wallet login
  supabaseId: "uuid...", // If Google login
  userId: "mongodb_id",
  email: "user@example.com", // If available
  iat: 1703596800, // Issued at
  exp: 1704201600 // Expires in 7 days
}
```

### Session Management

```javascript
// Middleware to verify authentication
export async function verifyAuth(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('No authentication token');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
```

### Rate Limiting

```javascript
// Login attempt rate limiting
const loginAttempts = new Map();

export function checkRateLimit(identifier) {
  const attempts = loginAttempts.get(identifier) || [];
  const recentAttempts = attempts.filter(
    time => Date.now() - time < 15 * 60 * 1000 // 15 minutes
  );

  if (recentAttempts.length >= 5) {
    throw new Error('Too many login attempts. Please try again later.');
  }

  recentAttempts.push(Date.now());
  loginAttempts.set(identifier, recentAttempts);
}
```

---

This login system provides flexibility (wallet OR email), security (signature verification), and a smooth user experience. The key innovation is allowing users to start with either method and link them later, removing friction while maintaining security.