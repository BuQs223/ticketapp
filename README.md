# Ticket App

A simple ticket management application built with Next.js and Supabase authentication.

## Features

- 🔐 Email/Password authentication with Supabase
- 🎨 Modern, responsive UI with TailwindCSS
- 📱 Mobile-friendly design
- 🚀 Built with Next.js 15 and React 19

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Setup

1. **Clone and install dependencies:**
   ```bash
   cd ticketapp
   npm install
   ```

2. **Set up Supabase:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Settings > API to get your project URL and anon key
   - Copy `.env.local.example` to `.env.local`:
     ```bash
     cp .env.local.example .env.local
     ```
   - Fill in your Supabase credentials in `.env.local`:
     ```
     SUPABASE_URL=your_supabase_url_here
     SUPABASE_ANON_KEY=your_supabase_anon_key_here
     ```

3. **Enable Email Authentication in Supabase:**
   - Go to Authentication > Settings in your Supabase dashboard
   - Make sure "Enable email confirmations" is configured as needed
   - Configure your site URL (for development: `http://localhost:3000`)

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Visit [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/
│   ├── auth/          # Authentication page
│   ├── dashboard/     # Dashboard page (after login)
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Home page (redirects to auth or dashboard)
└── lib/
    └── supabase.ts    # Supabase client configuration
```

## Usage

1. **Sign Up:** Create a new account with email and password
2. **Sign In:** Log in with your credentials
3. **Dashboard:** View your ticket management dashboard
4. **Sign Out:** Log out securely

## Tech Stack

- **Framework:** Next.js 15
- **Authentication:** Supabase Auth
- **Styling:** TailwindCSS
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)

## Next Steps

This is a basic authentication setup. You can extend it by:

- Adding ticket creation and management features
- Implementing role-based access control
- Adding real-time updates with Supabase Realtime
- Creating ticket categories and priorities
- Adding file attachments to tickets
- Implementing email notifications

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Remember to add your environment variables to your Vercel deployment settings.
