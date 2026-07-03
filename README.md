# Roomly – Roommate & Room Rental Platform

Roomly is a modern full-stack room rental and roommate matching web application built using **React 19**, **TanStack Start**, **TypeScript**, **Tailwind CSS**, and **Supabase**. The platform allows users to browse rental listings, publish new properties, manage profiles, save favorites, chat with interested users, and manage listings through an intuitive dashboard.

---

## Features

- Secure User Authentication
- Browse Available Room Listings
- Create New Rental Listings
- Wishlist / Save Favorite Listings
- Real-time Chat Between Users
- User Profile Management
- Personal Dashboard
- Admin Panel
- Fully Responsive UI
- Fast Performance with Vite & TanStack Start

---

## Tech Stack

### Frontend
- React 19
- TypeScript
- TanStack Start
- TanStack Router
- TanStack React Query
- Tailwind CSS v4
- Radix UI
- Lucide React

### Backend
- Supabase
  - Authentication
  - Database
  - Real-time Services

### Development Tools
- Vite
- ESLint
- Prettier
- Bun / npm

---

## Project Structure

```
roomly/
│
├── public/
├── src/
│   ├── components/
│   ├── routes/
│   ├── lib/
│   ├── hooks/
│   ├── styles/
│   └── utils/
│
├── package.json
├── bun.lock
├── tsconfig.json
└── README.md
```

---

## Available Pages

| Route | Description |
|--------|-------------|
| `/` | Landing Page |
| `/auth` | Login / Signup |
| `/browse` | Browse Listings |
| `/listings/new` | Add New Listing |
| `/listings/:id` | Listing Details |
| `/dashboard` | User Dashboard |
| `/profile` | User Profile |
| `/wishlist` | Saved Listings |
| `/interests` | Interested Users |
| `/chat/:interestId` | Real-time Chat |
| `/admin` | Admin Panel |

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/yourusername/roomly.git
```

```bash
cd roomly
```

---

### Install Dependencies

Using Bun

```bash
bun install
```

or

Using npm

```bash
npm install
```

---

## Environment Variables

Create a `.env` file in the root directory.

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Run the Project

Using Bun

```bash
bun run dev
```

Using npm

```bash
npm run dev
```

Application will start at

```
http://localhost:5173
```

---

## Build for Production

```bash
npm run build
```

or

```bash
bun run build
```

---

## 🔍 Lint

```bash
npm run lint
```

---

## Format Code

```bash
npm run format
```

---

## Main Dependencies

- React 19
- TanStack Start
- TanStack Router
- TanStack Query
- Tailwind CSS
- Radix UI
- Supabase
- React Hook Form
- Zod
- Date-fns
- Recharts

---

## Authentication

The project uses **Supabase Authentication** for:

- Email Login
- User Registration
- Session Management
- Protected Routes

---

## Real-Time Features

Supabase Realtime enables:

- Instant Messaging
- Live Listing Updates
- Real-time Notifications

---

## Responsive Design

Roomly is optimized for:

- Desktop
- Laptop
- Tablet
- Mobile Devices

---

## Future Improvements

- Google Authentication
- Map Integration
- Payment Gateway
- Property Verification
- Image Upload Optimization
- Push Notifications
- AI-based Roommate Recommendations
- Advanced Search Filters
- Booking System
- Review & Rating System

---

## Development

Start development server

```bash
npm run dev
```

Build

```bash
npm run build
```

Preview production build

```bash
npm run preview
```

---

## Contributing

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature-name
```

3. Commit changes

```bash
git commit -m "Added new feature"
```

4. Push branch

```bash
git push origin feature-name
```

5. Open a Pull Request

---

## Author

**Navaneeth GK**

Built with using React, TanStack Start, Tailwind CSS, and Supabase.
