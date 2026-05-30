#!/usr/bin/env bash
# ============================================================
# AIVANA Kids OS — Quick Setup Script
# Run: chmod +x scripts/setup.sh && ./scripts/setup.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "  █████╗ ██╗██╗   ██╗ █████╗ ███╗   ██╗ █████╗"
echo " ██╔══██╗██║██║   ██║██╔══██╗████╗  ██║██╔══██╗"
echo " ███████║██║██║   ██║███████║██╔██╗ ██║███████║"
echo " ██╔══██║██║╚██╗ ██╔╝██╔══██║██║╚██╗██║██╔══██║"
echo " ██║  ██║██║ ╚████╔╝ ██║  ██║██║ ╚████║██║  ██║"
echo " ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "${GREEN}AIVANA Kids OS — Setup Script${NC}"
echo "============================================"

# Check Node.js
echo -e "\n${YELLOW}Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found. Install from https://nodejs.org (v20+)${NC}"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}❌ Node.js v18+ required. Found: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v) found${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm not found${NC}"
  exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v) found${NC}"

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Set up environment
echo -e "\n${YELLOW}Setting up environment...${NC}"
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo -e "${GREEN}✅ Created .env.local from .env.example${NC}"
  echo -e "${YELLOW}⚠️  Please edit .env.local with your API keys before starting!${NC}"
else
  echo -e "${GREEN}✅ .env.local already exists${NC}"
fi

# Generate VAPID keys
echo -e "\n${YELLOW}Generating VAPID keys for push notifications...${NC}"
if command -v npx &> /dev/null; then
  echo ""
  echo "VAPID Keys (add to .env.local):"
  echo "================================"
  npx web-push generate-vapid-keys 2>/dev/null || echo "Run: npx web-push generate-vapid-keys"
  echo ""
fi

# Check Supabase CLI
echo -e "\n${YELLOW}Checking Supabase CLI...${NC}"
if command -v supabase &> /dev/null; then
  echo -e "${GREEN}✅ Supabase CLI found: $(supabase --version)${NC}"
else
  echo -e "${YELLOW}⚠️  Supabase CLI not found. Install: npm i -g supabase${NC}"
fi

# Summary
echo -e "\n${GREEN}============================================"
echo "✅ Setup complete!"
echo "============================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo -e "  1. ${YELLOW}Edit .env.local${NC} with your keys:"
echo "     - NEXT_PUBLIC_SUPABASE_URL"
echo "     - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "     - SUPABASE_SERVICE_ROLE_KEY"
echo "     - ANTHROPIC_API_KEY"
echo "     - RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET"
echo "     - RESEND_API_KEY"
echo "     - UPSTASH_REDIS_REST_URL & TOKEN"
echo "     - VAPID keys (generated above)"
echo ""
echo -e "  2. ${YELLOW}Set up Supabase database:${NC}"
echo "     - Go to supabase.com and create a project"
echo "     - Paste supabase/migrations/001_initial_schema.sql in SQL Editor"
echo "     - Paste supabase/migrations/002_functions_indexes.sql in SQL Editor"
echo "     - Create Storage buckets: avatars, drawings, files"
echo "     - Enable Google OAuth in Auth > Providers"
echo ""
echo -e "  3. ${YELLOW}Start development:${NC}"
echo "     npm run dev"
echo ""
echo -e "  4. ${YELLOW}Open:${NC} http://localhost:3000"
echo ""
echo "See DEPLOYMENT.md for production deployment guide."
echo ""
