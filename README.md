# Smart Krishi Ecosystem

A farm-to-consumer marketplace with separate React and Express applications, farmer harvest and listing tools, and a community advisory feed.

## Requirements

- Node.js 20 or newer
- A MongoDB Atlas cluster (or a local MongoDB instance)

## Run locally

1. Install backend dependencies and configure its environment. Copy `.env.example` to `.env` in `backend`, then set `MONGO_URI` and a long random `JWT_SECRET`:

   ```powershell
   cd backend
   Copy-Item .env.example .env
   npm install
   ```

2. From the project root, start the backend:

   ```powershell
   cd ..
   npm run dev
   ```

   `npm run dev:backend` is an equivalent explicit command.

3. In a second terminal, install and start the Vite application:

   ```powershell
   cd frontend
   Copy-Item .env.example .env
   npm install
   ```

   Start it from the project root with `npm run dev:frontend` (or run `npm run dev` from `frontend`). Open the local URL printed by Vite (normally `http://localhost:5173`). The API health endpoint is `http://localhost:5000/api/health`.

## API overview

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Create a buyer or farmer account |
| POST | `/api/auth/login` | Public | Login using email or phone |
| POST | `/api/auth/forgot-password` | Public | Email a one-time password reset link to a registered email |
| POST | `/api/auth/reset-password` | Public | Set a new password using a valid reset token |
| GET | `/api/auth/me` | Bearer token | Restore the current session |
| GET | `/api/products` | Public | List available produce; accepts `search`, `category`, and `location` |
| POST | `/api/products` | Farmer | Create a listing |
| PUT | `/api/products/:id` | Owning farmer | Update a listing |
| DELETE | `/api/products/:id` | Owning farmer | Delete a listing |
| POST | `/api/orders` | Buyer | Place a demo checkout order and reserve available stock |
| GET | `/api/orders/mine` | Buyer | View the buyer's order history |
| GET/POST | `/api/harvests` | Farmer | View crop plans or create a harvest plan |
| PUT/DELETE | `/api/harvests/:id` | Owning farmer | Update lifecycle/sale data or remove a crop plan |
| POST | `/api/harvests/:id/expenses` | Owning farmer | Add a categorized expense-ledger entry |
| GET | `/api/posts` | Public | Browse advisory posts; accepts `crop`, `category`, and `status` |
| POST | `/api/posts` | Signed-in user | Create a crop-health advisory with an optional photo |
| POST | `/api/posts/:id/comments` | Signed-in user | Add a solution; expert/admin responses are verified server-side |
| PATCH | `/api/posts/:id/status` | Post author or expert/admin | Resolve or reopen an advisory |

Product mutations accept JSON with `name`, `category`, `pricePerKg`, `quantityKg`, `image`, `location`, and (for updates) `availableStatus`. Passwords are hashed before storage. Registration intentionally does not allow public creation of administrator accounts.

Harvest plans track crop variety, planting and expected harvest dates, growth-stage history, expected/actual yield, categorized expenses, and sale revenue. The farmer dashboard calculates yield and profit/loss analytics from these records.

Community advisory posts capture affected crop, symptoms, disease category, severity, open/resolved status, and solution responses. Expert verification is set by the API based on the responder's role; assign the `expert` role to trusted expert accounts directly in the database. Public registration intentionally cannot create expert or administrator accounts.

Farmer product photos and advisory photos can be selected from the device as JPEG, PNG, WebP, or GIF files up to 5 MB. The API verifies image content. Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to store images in Cloudinary (optionally set `CLOUDINARY_FOLDER`). Without those values, uploads use `backend/uploads`; keep that directory on a persistent disk in deployment because ephemeral hosts can remove local files on restart or redeploy.

Password resets require SMTP configuration in `backend/.env`: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. Set `FRONTEND_URL` to the frontend's public origin so emailed reset links return to the correct site. Reset tokens are single-use, expire after 15 minutes, and are stored hashed. Accounts without a registered email cannot use this flow.

Buyer checkout currently runs in demo mode: it creates an order and reserves stock, but does not collect or process payment. Prices are displayed in NPR. Connect a supported payment provider before accepting real payments.

## Deployment

- **Render API:** create a Node web service rooted at `backend`, use `npm install` and `npm start`, and configure `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`/`FRONTEND_URL` (your Vercel URL), SMTP settings, Cloudinary credentials for durable image storage, and optionally `JWT_EXPIRES_IN`.
- **Vercel frontend:** set the project root to `frontend`, use the standard Vite build (`npm run build`, output `dist`), and define `VITE_API_URL` as the deployed API URL. The frontend appends `/api` if it is missing, so either the API origin or its `/api` URL works.
- `frontend/vercel.json` includes a rewrite to serve the SPA entry point on client-side routes.
- Configure MongoDB Atlas network access for the backend deployment and keep credentials only in the hosting provider's environment settings.
