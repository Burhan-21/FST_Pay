# Deploy FST Pay on Oracle Cloud Free Tier

## Prerequisites
- Oracle Cloud account (CC required for identity verification — not charged)
- Cloudflare account (free)
- A domain name (optional — works with Cloudflare Pages subdomain too)

---

## Step 1: Create Oracle Cloud VM

1. Go to https://cloud.oracle.com and sign in
2. Menu → Compute → Instances → Create Instance
3. Configure:
   - **Name**: `fstpay-vm`
   - **Image**: Canonical Ubuntu 24.04 (Minimal)
   - **Shape**: Change shape → **VM.Standard.A1.Flex** (ARM, Ampere)
     - Select **Always Free-eligible**
     - Set **OCPU count**: 4
     - Set **Memory (GB)**: 24
   - **Add SSH keys**: Generate a key pair or paste your public key
   - **Boot volume**: 200 GB (Always Free-eligible)
4. Under **Advanced** → **Management** → paste the contents of `cloud-init.yml` into "User data"
5. Click **Create**

Wait 2-3 minutes for the VM to provision.

## Step 2: SSH into the VM

```bash
ssh -i /path/to/your/key ubuntu@<VM_PUBLIC_IP>
```

## Step 3: Set up Environment Variables

Edit the .env file with your production secrets:

```bash
nano /home/ubuntu/FST_Pay/.env
```

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | Strong random password for database |
| `JWT_SECRET` | Base64 256-bit secret (`openssl rand -base64 32`) |
| `CORS_ALLOWED_ORIGINS` | Your frontend domain(s), comma-separated |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin password (min 8 chars) |
| `MAIL_USERNAME` | Gmail address for sending OTP emails |
| `MAIL_PASSWORD` | Gmail app password |
| `GEMINI_API_KEY` | Google AI API key for AI coach |
| `CLOUDFLARE_TUNNEL_TOKEN` | From Cloudflare Zero Trust (Step 4) |

## Step 4: Set up Cloudflare Tunnel

1. Go to **Cloudflare Dashboard** → **Zero Trust** → **Access** → **Tunnels**
2. Click **Create a tunnel** → **cloudflared**
3. Name it: `fstpay-tunnel`
4. Under **Connectors**, copy the tunnel token
5. Paste it as `CLOUDFLARE_TUNNEL_TOKEN` in your `.env` file
6. Under **Public Hostnames**, add:
   - **Subdomain**: `api` → **Domain**: your domain → **Type**: `HTTP` → **URL**: `http://fstpay-backend:8080`

## Step 5: Deploy the Backend

```bash
cd /home/ubuntu/FST_Pay
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

Verify it's running:
```bash
docker compose -f deploy/docker-compose.prod.yml ps
docker compose -f deploy/docker-compose.prod.yml logs fstpay-backend
```

## Step 6: Deploy the Frontend to Cloudflare Pages

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **Pages**
2. Click **Connect to Git** → select your `FST_Pay` repo
3. Configure:
   - **Project name**: `fst-pay`
   - **Framework preset**: Vite
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
4. Add environment variable:
   - `VITE_API_URL`: `https://api.yourdomain.com/api/v1`
5. Click **Save and Deploy**

## Step 7: Verify

- Frontend: `https://fst-pay.pages.dev` (or your custom domain)
- Backend health: `https://api.yourdomain.com/actuator/health`
- API: `https://api.yourdomain.com/api/v1/auth/stats`

---

## Useful Commands

```bash
# View logs
docker compose -f deploy/docker-compose.prod.yml logs -f

# Restart backend
docker compose -f deploy/docker-compose.prod.yml restart fstpay-backend

# Rebuild and restart
docker compose -f deploy/docker-compose.prod.yml up -d --build fstpay-backend

# SSH tunnel (if you want to test locally)
ssh -L 8080:localhost:8080 ubuntu@<VM_IP>
```
